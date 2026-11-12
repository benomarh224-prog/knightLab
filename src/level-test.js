import { formatLevelTestElo, MIN_ASSESSMENT_MOVES, MIN_LEVEL_TEST_MOVES } from './play-assessment.js';
import { LEVEL_TEST_DIFFICULTY, PLAY_LEVELS } from './play-settings.js';
import { PlaySession } from './play.js';
import { Chess } from 'chess.js';

const STORAGE_KEY = 'roqvyn-level-test-result-v1';
const ATTEMPT_KEY = 'roqvyn-level-test-attempt-v1';

export function restoreLevelTestAttempt(attempt) {
  if (!attempt || !Object.hasOwn(PLAY_LEVELS, attempt.difficulty) || !['w','b'].includes(attempt.color) || !Array.isArray(attempt.moves) || typeof attempt.resigned !== 'boolean') return null;
  const game = new PlaySession(new Chess().fen(), { mode:'engine', color:attempt.color });
  for (const move of attempt.moves) {
    if (typeof move !== 'string' || game.engineMove(move, game.snapshot()).status !== 'played') return null;
  }
  if (attempt.resigned && !game.resign()) return null;
  return game;
}

function readLevelTestAttempt(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(ATTEMPT_KEY) || 'null');
    const game = restoreLevelTestAttempt(saved);
    return game ? { ...saved, finished: Boolean(game.ending) } : null;
  } catch { return null; }
}

export function readLevelTestResult(storage) {
  try {
    const result = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (result && Number.isInteger(result.accuracy) && result.accuracy >= 0 && result.accuracy <= 100 &&
        Number.isInteger(result.moves) && result.moves >= MIN_ASSESSMENT_MOVES &&
        ['Foundations', 'Developing', 'Solid', 'Precise'].includes(result.level) &&
        Object.hasOwn(PLAY_LEVELS, result.recommended) && Object.hasOwn(PLAY_LEVELS, result.difficulty) &&
        ['win','loss','draw'].includes(result.outcome)) {
      const rating = result.rating;
      if (rating != null && (result.difficulty !== LEVEL_TEST_DIFFICULTY || !Number.isInteger(rating.elo) ||
          rating.elo < 1600 || rating.elo > 2700 || rating.elo % 100 || ![null,'above','below'].includes(rating.bound))) {
        return { ...result, rating:null };
      }
      return result;
    }
  } catch {}
  return null;
}

export function createLevelTestUI({ storage, start, doc = document }) {
  const get = id => doc.getElementById(id);
  let last = readLevelTestResult(storage), saved = Boolean(last), attempt;
  get('level-test-minimum').textContent = MIN_LEVEL_TEST_MOVES;
  get('level-test-form').onsubmit = event => {
    event.preventDefault();
    if (attempt) return;
    start({ difficulty: LEVEL_TEST_DIFFICULTY, color: get('level-test-color').value });
  };
  get('level-test-resume').onclick = () => { if (attempt) start(attempt); };
  get('level-test-discard').onclick = () => {
    saveAttempt(null);
    get('level-test-discard-options').open = false;
    get('level-test-start').focus();
  };

  function render() {
    if (attempt === undefined) attempt = readLevelTestAttempt(storage);
    get('level-test-form').hidden = Boolean(attempt);
    get('level-test-resume-panel').hidden = !attempt;
    if (attempt) {
      const moves = Math.floor((attempt.moves.length + (attempt.color === 'w' ? 1 : 0)) / 2);
      get('level-test-resume-title').textContent = attempt.finished ? 'Report pending' : 'Test in progress';
      get('level-test-resume').textContent = attempt.finished ? 'Continue analysis' : 'Resume test';
      const opponent = attempt.difficulty === LEVEL_TEST_DIFFICULTY ? 'Full-strength Stockfish' : 'Earlier test format';
      get('level-test-resume-meta').textContent = `${opponent} · ${attempt.color === 'w' ? 'White' : 'Black'} · ${moves} of your moves`;
    }
    get('level-test-empty').hidden = Boolean(last);
    get('level-test-result').hidden = !last;
    if (!last) return;
    const outcome = { win:'Win', loss:'Loss', draw:'Draw' }[last.outcome];
    const opponent = last.difficulty === LEVEL_TEST_DIFFICULTY ? 'Full-strength Stockfish' : `Earlier test · Stockfish ${PLAY_LEVELS[last.difficulty].label}`;
    get('level-test-result-meta').textContent = `${outcome} · ${opponent} · ${last.moves} of your moves`;
    get('level-test-result-accuracy').textContent = `${last.accuracy}%`;
    get('level-test-result-level').textContent = last.level;
    get('level-test-result-elo').textContent = formatLevelTestElo(last.rating);
    get('level-test-result-next').textContent = last.rating ? 'Approximate performance in this match.' :
      last.rating === undefined || last.difficulty !== LEVEL_TEST_DIFFICULTY ? 'Start a new Level Test for an Elo estimate.' : 'Too few eligible decisions for an Elo estimate.';
    get('level-test-result-storage').textContent = saved ? 'Saved in this browser.' : 'Available for this visit.';
  }

  function saveAttempt(next, { persist = true } = {}) {
    attempt = next;
    if (persist) {
      try {
        if (next) storage?.setItem(ATTEMPT_KEY, JSON.stringify(next));
        else storage?.removeItem(ATTEMPT_KEY);
      } catch {}
    }
    render();
  }

  return {
    render, saveAttempt,
    save(game, report) {
      if (report.level) {
        last = { ...report, difficulty: game.difficulty };
        try { storage?.setItem(STORAGE_KEY, JSON.stringify(last)); saved = Boolean(storage); }
        catch { saved = false; }
      }
      saveAttempt(null, { persist: !report.level || saved });
    },
    focusResult() {
      const target = get(attempt ? 'level-test-resume' : last ? 'level-test-result-title' : 'level-test-start');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest' });
    },
  };
}

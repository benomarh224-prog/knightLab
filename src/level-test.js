import { formatLevelTestElo, MIN_ASSESSMENT_MOVES, MIN_LEVEL_TEST_MOVES, MIN_RATING_DECISIONS } from './play-assessment.js';
import { LEVEL_TEST_DIFFICULTY, PLAY_LEVELS } from './play-settings.js';
import { PlaySession } from './play.js';
import { Chess } from 'chess.js';
import { renderLevelTestMoments } from './level-test-moments-ui.js';
import { levelTestMomentDetails } from './level-test-moments.js';

const STORAGE_KEY = 'roqvyn-level-test-result-v1';
const HISTORY_KEY = 'roqvyn-level-test-history-v1';
const ATTEMPT_KEY = 'roqvyn-level-test-attempt-v1';
const HISTORY_LIMIT = 20;

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

function validResult(result) {
  if (result && Number.isInteger(result.accuracy) && result.accuracy >= 0 && result.accuracy <= 100 &&
        Number.isInteger(result.moves) && result.moves >= MIN_ASSESSMENT_MOVES &&
        ['Foundations', 'Developing', 'Solid', 'Precise'].includes(result.level) &&
        Object.hasOwn(PLAY_LEVELS, result.recommended) && Object.hasOwn(PLAY_LEVELS, result.difficulty) &&
        ['win','loss','draw'].includes(result.outcome)) {
    const rating = result.rating;
    if (rating != null && (result.difficulty !== LEVEL_TEST_DIFFICULTY || !Number.isInteger(rating.elo) ||
        rating.elo < 1600 || rating.elo > 2700 || rating.elo % 100 || ![null,'above','below'].includes(rating.bound) ||
        (rating.provisional !== undefined && typeof rating.provisional !== 'boolean'))) {
      return { ...result, rating:null };
    }
    return result;
  }
  return null;
}

function read(key, storage) {
  try { return JSON.parse(storage?.getItem(key) || 'null'); } catch { return null; }
}

export function readLevelTestHistory(storage) {
  const history = read(HISTORY_KEY, storage);
  const results = Array.isArray(history) ? history.slice(0, HISTORY_LIMIT).map(validResult).filter(Boolean) : [];
  if (results.length) return results;
  const last = validResult(read(STORAGE_KEY, storage));
  return last ? [last] : [];
}

export function readLevelTestResult(storage) {
  return readLevelTestHistory(storage)[0] ?? null;
}

export function createLevelTestHistory(storage, now = Date.now) {
  let results = readLevelTestHistory(storage);
  let saved = Boolean(results.length);
  let pending = false;
  return {
    list:() => results,
    get saved() { return saved; },
    add(game, report) {
      const result = validResult({ ...report, difficulty:game.difficulty, savedAt:now() });
      if (!result) return false;
      results = [result, ...(pending ? results : readLevelTestHistory(storage))].slice(0, HISTORY_LIMIT);
      try { storage?.setItem(HISTORY_KEY, JSON.stringify(results)); saved = Boolean(storage); }
      catch { saved = false; }
      pending = !saved;
      return true;
    },
  };
}

export function levelTestPracticeExercises(results) {
  const exercises = new Map();
  for (const result of results) {
    if (!Array.isArray(result.moments)) continue;
    for (const moment of result.moments.slice(0, 2)) {
      const entry = levelTestMomentDetails(moment);
      if (!entry) continue;
      const { exercise, title } = entry;
      const key = `${exercise.fen}|${exercise.solution}`;
      if (!exercises.has(key)) exercises.set(key, { ...exercise, source:'level-test', title:`Find an alternative to ${title}` });
    }
  }
  return [...exercises.values()];
}

const dateLabel = (result, fallback = 'Earlier test') => {
  const date = new Date(result.savedAt);
  return Number.isFinite(result.savedAt) && Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' }) : fallback;
};
const outcomeLabel = result => ({ win:'Win', loss:'Loss', draw:'Draw' })[result.outcome];

export function createLevelTestUI({ storage, history = createLevelTestHistory(storage), start, startPractice, doc = document }) {
  const get = id => doc.getElementById(id);
  let attempt, displayedResult;
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

  function renderHistory(results) {
    const list = get('level-test-history-list');
    const rows = results.map(result => {
      const fragment = get('level-test-history-template').content.cloneNode(true);
      const disclosure = fragment.querySelector('details');
      fragment.querySelector('.level-history-date').textContent = dateLabel(result);
      fragment.querySelector('.level-history-accuracy').textContent = `${result.accuracy}% accuracy`;
      fragment.querySelector('.level-history-elo').textContent = result.rating ? formatLevelTestElo(result.rating) : 'Elo unavailable';
      fragment.querySelector('.level-history-qualifier').hidden = !result.rating?.provisional;
      fragment.querySelector('.level-history-meta').textContent = `${outcomeLabel(result)} · ${result.moves} of your moves · ${result.level}`;
      const moments = fragment.querySelector('.level-moments');
      function loadMoments() {
        if (!disclosure.open) return;
        renderLevelTestMoments(moments, result.moments, startPractice, { showEmpty:true });
        disclosure.removeEventListener('toggle', loadMoments);
      }
      disclosure.addEventListener('toggle', loadMoments);
      return fragment;
    });
    list.replaceChildren(...rows);
    get('level-test-history-empty').hidden = Boolean(rows.length);
    list.hidden = !rows.length;
  }

  function render() {
    const [last, ...previous] = history.list();
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
    get('level-test-history').hidden = !last;
    if (!last) return;
    const opponent = last.difficulty === LEVEL_TEST_DIFFICULTY ? 'Full-strength Stockfish' : `Earlier test · Stockfish ${PLAY_LEVELS[last.difficulty].label}`;
    get('level-test-result-meta').textContent = [dateLabel(last, ''), outcomeLabel(last), opponent, `${last.moves} of your moves`].filter(Boolean).join(' · ');
    get('level-test-result-accuracy').textContent = `${last.accuracy}%`;
    get('level-test-result-level').textContent = last.level;
    get('level-test-result-elo-label').textContent = last.rating?.provisional ? 'Provisional Elo' : 'Estimated Elo';
    get('level-test-result-elo').textContent = last.rating ? formatLevelTestElo(last.rating) : 'More evidence needed';
    const decisions = Number.isInteger(last.decisions) && last.decisions >= 0 && last.decisions <= last.moves ? last.decisions : null;
    const sample = Number.isInteger(last.sampleDecisions) && last.sampleDecisions >= 0 && last.sampleDecisions <= last.moves ? last.sampleDecisions : null;
    get('level-test-result-next').textContent = last.rating ? last.rating.provisional ? 'Approximate performance from a limited sample.' : 'Approximate performance in this match.' :
      sample != null ? `${sample} decisions outside known theory.` :
        decisions != null ? `${decisions} of ${MIN_RATING_DECISIONS} eligible moves.` :
        last.rating === undefined || last.difficulty !== LEVEL_TEST_DIFFICULTY ? 'Start a new Level Test for an Elo estimate.' : 'Too few eligible decisions for an Elo estimate.';
    get('level-test-result-storage').textContent = history.saved ? 'Saved in this browser.' : 'Available for this visit.';
    if (displayedResult !== last) {
      renderLevelTestMoments(get('level-test-saved-moments'), last.moments, startPractice);
      renderHistory(previous);
      displayedResult = last;
    }
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
      const added = history.add(game, report);
      saveAttempt(null, { persist: !added || history.saved });
    },
    focusResult() {
      const target = get(attempt ? 'level-test-resume' : history.list().length ? 'level-test-result-title' : 'level-test-start');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest' });
    },
  };
}

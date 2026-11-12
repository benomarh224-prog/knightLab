import { MIN_ASSESSMENT_MOVES } from './play-assessment.js';
import { PLAY_LEVELS } from './play-settings.js';

const STORAGE_KEY = 'roqvyn-level-test-result-v1';

export function readLevelTestResult(storage) {
  try {
    const result = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (result && Number.isInteger(result.accuracy) && result.accuracy >= 0 && result.accuracy <= 100 &&
        Number.isInteger(result.moves) && result.moves >= MIN_ASSESSMENT_MOVES &&
        ['Foundations', 'Developing', 'Solid', 'Precise'].includes(result.level) &&
        Object.hasOwn(PLAY_LEVELS, result.recommended) && Object.hasOwn(PLAY_LEVELS, result.difficulty) &&
        ['win','loss','draw'].includes(result.outcome)) return result;
  } catch {}
  return null;
}

export function createLevelTestUI({ storage, start, doc = document }) {
  const get = id => doc.getElementById(id);
  const difficulty = get('level-test-difficulty');
  let last = readLevelTestResult(storage), saved = Boolean(last);
  for (const [value, level] of Object.entries(PLAY_LEVELS)) {
    const option = doc.createElement('option');
    option.value = value;
    option.textContent = level.label;
    difficulty.append(option);
  }
  difficulty.value = last?.recommended || 'casual';
  get('level-test-minimum').textContent = MIN_ASSESSMENT_MOVES;
  get('level-test-form').onsubmit = event => {
    event.preventDefault();
    start({ difficulty: difficulty.value, color: get('level-test-color').value });
  };

  function render() {
    get('level-test-empty').hidden = Boolean(last);
    get('level-test-result').hidden = !last;
    if (!last) return;
    const outcome = { win:'Win', loss:'Loss', draw:'Draw' }[last.outcome];
    get('level-test-result-meta').textContent = `${outcome} · Stockfish ${PLAY_LEVELS[last.difficulty].label} · ${last.moves} of your moves`;
    get('level-test-result-accuracy').textContent = `${last.accuracy}%`;
    get('level-test-result-level').textContent = last.level;
    get('level-test-result-next').textContent = `Recommended opponent: Stockfish ${PLAY_LEVELS[last.recommended].label}.`;
    get('level-test-result-storage').textContent = saved ? 'Saved in this browser.' : 'Available for this visit.';
  }

  return {
    render,
    save(game, report) {
      if (!report.level) return;
      last = { ...report, difficulty: game.difficulty };
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(last)); saved = Boolean(storage); }
      catch { saved = false; }
      difficulty.value = last.recommended;
      render();
    },
    focusResult() {
      const target = get(last ? 'level-test-result-title' : 'level-test-start');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest' });
    },
  };
}

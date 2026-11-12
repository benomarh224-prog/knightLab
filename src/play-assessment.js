import { gameAccuracy } from './accuracy.js';
import { PLAY_LEVELS } from './play-settings.js';
import { evaluationReady } from './review-quality.js';

export const MIN_ASSESSMENT_MOVES = 10;

export function assessPlayGame(game, scores) {
  const { color, result, difficulty, assisted } = game;
  const side = gameAccuracy(game, scores, 'quick').sides.find(side => side.color === color);
  const accuracy = side.accuracy == null ? null : Math.round(side.accuracy);
  const outcome = result === '1/2-1/2' ? 'draw' : result === (color === 'w' ? '1-0' : '0-1') ? 'win' : 'loss';
  const report = { accuracy, outcome, moves: side.total, level: null, recommended: null };
  if (accuracy == null || assisted || side.total < MIN_ASSESSMENT_MOVES) return report;

  const level = accuracy >= 90 ? 'Precise' : accuracy >= 78 ? 'Solid' : accuracy >= 63 ? 'Developing' : 'Foundations';
  const levels = Object.keys(PLAY_LEVELS);
  const change = outcome === 'win' && accuracy >= 82 ? 1 : outcome === 'loss' && accuracy < 68 ? -1 : 0;
  const index = Math.max(0, Math.min(levels.length - 1, levels.indexOf(difficulty) + change));
  return { ...report, level, recommended: levels[index] };
}

// Evaluate every position with the same full-strength search, independently of the opponent level.
export async function reviewPlayGame(game, scores, engine, { active, progress }) {
  const moves = game.moves.map(move => move.from + move.to + (move.promotion || ''));
  for (let index = 0; index < game.fens.length && active(); index++) {
    if (scores[index]) continue;
    const score = await engine.evaluate(game.fens[index], { depth: 14, milliseconds: 380, multiPV: 1 },
      { startFen: game.fens[0], moves: moves.slice(0, index) });
    if (!active()) return;
    if (!evaluationReady(score, 'quick')) throw new Error('Incomplete engine evaluation.');
    scores[index] = score;
    progress();
  }
}

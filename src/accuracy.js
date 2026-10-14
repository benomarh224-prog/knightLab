import { evaluationReady, PRECISION_DEPTH } from './review-quality.js';

// Independent implementation of Lichess's documented accuracy model.
// https://lichess.org/page/accuracy
// Uses the actual analyzed starting position, including custom PGNs.
const valid = score => Boolean(score && Number.isFinite(score.cp));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const winPercent = cp => 100 / (1 + Math.exp(-0.00368208 * clamp(cp, -1000, 1000)));

export function moveAccuracy(move, before, after) {
  if (!valid(before) || !valid(after)) return null;
  const loss = (winPercent(before.cp) - winPercent(after.cp)) * (move.color === 'w' ? 1 : -1);
  if (loss <= 0) return 100;
  // The published model includes one point for analysis uncertainty.
  // No automatic 100 for a shallow engine's first choice.
  return clamp(103.1668100711649 * Math.exp(-0.04354415386753951 * loss) - 3.166924740191411 + 1, 0, 100);
}

function volatility(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return clamp(Math.sqrt(variance), 0.5, 12);
}

export function gameAccuracy(parsed, evaluations, mode = 'precise') {
  const players = { w: { total: 0, reviewed: 0, qualified: 0, minDepth: null, score: null }, b: { total: 0, reviewed: 0, qualified: 0, minDepth: null, score: null } };
  parsed.moves.forEach((move, index) => {
    const player = players[move.color], pair = [evaluations[index], evaluations[index + 1]];
    player.total++;
    if (!pair.every(valid)) return;
    player.reviewed++;
    if (pair.every(score => evaluationReady(score, mode))) player.qualified++;
    for (const score of pair.filter(score => !score.terminal)) {
      player.minDepth = Math.min(player.minDepth ?? Infinity, score.depth || 0);
    }
  });
  for (const player of Object.values(players)) player.complete = player.reviewed === player.total;
  // Volatility depends on the whole game. Do not invent a final score
  // from a prefix, missing positions, or searches below the depth target.
  if (!parsed.fens.every((_, index) => evaluationReady(evaluations[index], mode))) return players;
  const values = parsed.fens.map((_, index) => winPercent(evaluations[index].cp));
  const size = clamp(Math.floor(parsed.moves.length / 10), 2, 8);
  const firstWindow = values.slice(0, size);
  const rows = { w: [], b: [] };
  parsed.moves.forEach((move, index) => {
    const window = index < size - 2 ? firstWindow : values.slice(index - size + 2, index + 2);
    rows[move.color].push({ accuracy: moveAccuracy(move, evaluations[index], evaluations[index + 1]), weight: volatility(window) });
  });
  for (const color of ['w', 'b']) {
    const moves = rows[color];
    if (!moves.length) continue;
    const weighted = moves.reduce((sum, move) => sum + move.accuracy * move.weight, 0) / moves.reduce((sum, move) => sum + move.weight, 0);
    const harmonic = moves.some(move => move.accuracy === 0) ? 0 : moves.length / moves.reduce((sum, move) => sum + 1 / move.accuracy, 0);
    players[color].score = clamp((weighted + harmonic) / 2, 0, 100);
  }
  return players;
}

export function accuracyPresentation(game, parsed, evaluations, mode = 'precise') {
  const players = gameAccuracy(parsed, evaluations, mode);
  const complete = parsed.fens.every((_, index) => evaluationReady(evaluations[index], mode));
  const reviewed = parsed.fens.every((_, index) => valid(evaluations[index]));
  const official = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
  return {
    source: 'knightlab', title: 'Knightlab accuracy', players,
    status: !complete ? reviewed ? `Needs depth ${PRECISION_DEPTH}` : 'Review in progress' : mode === 'precise' ? `Depth ${PRECISION_DEPTH} verified` : mode === 'deep' ? 'Deep estimate' : 'Quick estimate',
    note: mode === 'precise' ? `Lichess-based independent accuracy. Scores appear after every position reaches depth ${PRECISION_DEPTH} or a terminal result. Deeper searches may still change them.` : 'Exploratory estimate. Choose Precise review to verify every position at depth 18. This independent metric can differ from Chess.com.',
    reference: { w: official(game?.accuracies?.white), b: official(game?.accuracies?.black) },
  };
}

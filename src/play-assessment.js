import { Chess } from 'chess.js';
import { gameAccuracy } from './accuracy.js';
import { LEVEL_TEST_DIFFICULTY, PLAY_LEVELS } from './play-settings.js';
import { evaluationReady } from './review-quality.js';

export const MIN_ASSESSMENT_MOVES = 10;
const OPENING_MOVES = 8;
export const MIN_RATING_DECISIONS = 10;
export const MIN_PROVISIONAL_DECISIONS = 6;
export const MIN_LEVEL_TEST_MOVES = OPENING_MOVES + MIN_RATING_DECISIONS;

// Observed scaled average differences from the 2006–2009 benchmark in Regan & Haworth.
// https://cse.buffalo.edu/~regan/papers/pdf/ReHa11c.pdf (sections 3.1 and 7).
// Their tournament sample used a different engine and longer games; this is a rough comparison.
const ELO_BENCHMARKS = [[.056, 2700], [.074, 2400], [.092, 2200], [.115, 2000], [.137, 1600]];

function scaledEvaluation(score, limit = 4) {
  const pawns = score.mate == null ? Math.max(-limit, Math.min(limit, score.cp / 100)) : limit * Math.sign(score.cp || score.mate);
  return Math.sign(pawns) * Math.log1p(Math.abs(pawns));
}

export function assessLevelTestElo(game, scores, bookPly = 0) {
  if (game.assisted || game.difficulty !== LEVEL_TEST_DIFFICULTY ||
      !game.fens.every((_, index) => evaluationReady(scores[index], 'quick'))) return { decisions:null, rating:null };

  const seen = new Set();
  const side = game.color === 'w' ? 1 : -1;
  let ownMoves = 0, decisions = 0, totalLoss = 0;
  let sampleDecisions = 0, competitive = 0, competitiveLoss = 0, weightedLoss = 0, totalWeight = 0;
  for (const [index, move] of game.moves.entries()) {
    const fen = game.fens[index];
    const position = fen.split(' ', 4).join(' ');
    const repeated = seen.has(position);
    seen.add(position);
    if (move.color !== game.color) continue;
    ownMoves++;
    const before = scores[index];
    if (index < bookPly || (bookPly == null && ownMoves <= OPENING_MOVES) || repeated || before.mate != null || new Chess(fen).moves().length < 2) continue;
    const after = scores[index + 1];
    const isCompetitive = Math.abs(before.cp) <= 300;
    const loss = Math.max(0, side * (scaledEvaluation(before) - scaledEvaluation(after)));
    if (isCompetitive) {
      competitive++;
      competitiveLoss += loss;
      if (ownMoves > OPENING_MOVES) { decisions++; totalLoss += loss; }
    }
    // A move in a decided position adds weaker evidence. A wider scale still
    // catches mistakes in those positions instead of flattening every score.
    const weight = isCompetitive ? 1 : 0.25;
    const sampleLoss = isCompetitive ? loss : Math.max(0, side * (scaledEvaluation(before, 8) - scaledEvaluation(after, 8)));
    sampleDecisions++;
    weightedLoss += weight * sampleLoss;
    totalWeight += weight;
  }
  if (decisions >= MIN_RATING_DECISIONS) return { decisions, rating:eloFromLoss(totalLoss / decisions) };
  if (ownMoves >= MIN_ASSESSMENT_MOVES && sampleDecisions >= MIN_PROVISIONAL_DECISIONS && competitive) {
    // Accurate moves after a decisive mistake cannot lift the early estimate.
    const loss = Math.max(competitiveLoss / competitive, weightedLoss / totalWeight);
    const rating = eloFromLoss(loss);
    if (competitive >= 3 || rating.bound === 'below') {
      return { decisions, sampleDecisions, rating:{ ...rating, provisional:true } };
    }
  }
  return { decisions, sampleDecisions, rating:null };
}

function eloFromLoss(loss) {
  const [lowLoss, highElo] = ELO_BENCHMARKS[0];
  const [highLoss, lowElo] = ELO_BENCHMARKS.at(-1);
  if (loss < lowLoss) return { elo: highElo, bound:'above' };
  if (loss > highLoss) return { elo: lowElo, bound:'below' };
  const index = ELO_BENCHMARKS.findIndex(([average], i) => i > 0 && loss <= average);
  const [startLoss, startElo] = ELO_BENCHMARKS[index - 1];
  const [endLoss, endElo] = ELO_BENCHMARKS[index];
  const estimate = startElo + (endElo - startElo) * (loss - startLoss) / (endLoss - startLoss);
  return { elo:Math.round(estimate / 100) * 100, bound:null };
}

export function formatLevelTestElo(rating) {
  if (!rating) return '—';
  const prefix = rating.bound === 'above' ? 'Above ' : rating.bound === 'below' ? 'Below ' : '≈ ';
  return `${prefix}${rating.elo} Elo`;
}

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

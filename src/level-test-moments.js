import { Chess } from 'chess.js';
import { whiteWinPercent } from './accuracy.js';
import { legalLine, moveIdea } from './coach.js';
import { moveLabel, pieceNames } from './training.js';

const MIN_SWING = 10;
const MIN_DEPTH = 12;
const uci = move => move.from + move.to + (move.promotion || '');

export function levelTestMoments(game, scores) {
  const candidates = [];
  for (const [index, move] of game.moves.entries()) {
    if (move.color !== game.color) continue;
    const before = scores[index], after = scores[index + 1];
    if (!before || !after || before.rootFen !== move.before ||
        (!after.terminal && (after.rootFen !== move.after || after.depth < MIN_DEPTH || Math.abs(before.depth - after.depth) > 2)) ||
        before.depth < MIN_DEPTH || before.best === uci(move)) continue;
    const start = whiteWinPercent(before), end = whiteWinPercent(after);
    if (start == null || end == null) continue;
    const side = move.color === 'w' ? 1 : -1;
    const swing = Math.round((start - end) * side);
    if (swing < MIN_SWING) continue;
    const mateChange = after.mate != null && after.cp * side < 0 ? 'allows' : before.mate != null && before.cp * side > 0 ? 'misses' : null;
    const moment = { fen:move.before, ply:index + 1, played:uci(move), solution:before.best, reply:after.best || null, swing, mateChange,
      bestReply:before.pv?.[0] === before.best ? before.pv[1] ?? null : null };
    if (levelTestMomentDetails(moment)) candidates.push(moment);
  }
  return candidates.sort((a, b) => b.swing - a.swing || a.ply - b.ply).slice(0, 2);
}

export function levelTestMomentDetails(moment) {
  if (!moment || typeof moment.fen !== 'string' || !Number.isInteger(moment.ply) || moment.ply < 1 ||
      !Number.isInteger(moment.swing) || moment.swing < MIN_SWING || moment.swing > 100 ||
      ![null, 'allows', 'misses'].includes(moment.mateChange) || moment.played === moment.solution) return null;
  const [played] = legalLine(moment.fen, [moment.played]);
  const [best] = legalLine(moment.fen, [moment.solution]);
  if (!played || !best || new Chess(moment.fen).moves().length < 2) return null;
  const [reply] = legalLine(played.after, [moment.reply]);
  const evaluation = moment.mateChange === 'allows' ? 'Stockfish found a forced mate for your opponent after this move.' :
    moment.mateChange === 'misses' ? 'Stockfish no longer found your forced mate after this move.' :
      `Estimated winning chances fell by ${moment.swing} percentage points.`;
  let response = '';
  if (reply?.san.endsWith('#')) response = `${reply.san} is immediate checkmate.`;
  else if (reply?.captured) {
    const square = reply.flags.includes('e') ? reply.to[0] + reply.from[1] : reply.to;
    response = `Stockfish replies ${reply.san}, capturing the ${pieceNames[reply.captured]} on ${square}.`;
  } else if (reply?.san.endsWith('+')) response = `Stockfish replies with check: ${reply.san}.`;
  const explanation = [evaluation, response].filter(Boolean).join(' ');
  const [bestReply] = legalLine(best.after, [moment.bestReply]);
  const alternative = [moveIdea(best).trim(), bestReply && `In this line, the opponent replies ${bestReply.san}.`].filter(Boolean).join(' ');
  return {
    played, title:moveLabel(played), explanation, alternative,
    exercise:{ fen:moment.fen, solution:moment.solution, bestSAN:best.san, played:played.san, color:played.color,
      moveNumber:played.before.split(' ')[5], reviewNote:alternative },
  };
}

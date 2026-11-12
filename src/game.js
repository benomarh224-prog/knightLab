import { Chess } from 'chess.js';
import { brilliantEvidence } from './brilliant.js';

export const DEMO_PGN = `[Event "The Opera Game"]
[Site "Paris, France"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke & Count"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5
6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5
11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6
15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

export function parseGame(pgn) {
  if (typeof pgn !== 'string' || pgn.length > 250000) throw new Error('Please import one PGN game under 250 KB.');
  const game = new Chess();
  try { game.loadPgn(pgn); } catch { throw new Error('This PGN could not be read. Please use a valid standard chess game.'); }
  const headers = game.getHeaders();
  const moves = game.history({ verbose: true });
  if (!moves.length) throw new Error('This game does not contain any moves to review.');
  const fens = [moves[0].before, ...moves.map(move => move.after)];
  return { headers, moves, fens, pgn };
}

export function scoreFromInfo(line, turn) {
  const match = line.match(/\bscore (cp|mate) (-?\d+)/);
  if (!match || /\b(?:lowerbound|upperbound)\b/.test(line)) return null;
  const value = Number(match[2]);
  const sign = turn === 'w' ? 1 : -1;
  return { cp: (match[1] === 'mate' ? (value >= 0 ? 10000 : -10000) : value) * sign,
    mate: match[1] === 'mate' ? value * sign : null,
    depth: Number(line.match(/\bdepth (\d+)/)?.[1] || 0),
    multipv: Number(line.match(/\bmultipv (\d+)/)?.[1] || 1),
    pv: line.match(/\bpv (.+)$/)?.[1]?.split(' ') || [] };
}

export function terminalEvaluation(fen, history) {
  const game = new Chess(history?.startFen || fen);
  if (history) {
    for (const uci of history.moves) {
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error('Invalid analysis move history.');
      game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    }
    if (game.fen() !== fen) throw new Error('Analysis history does not match the position.');
  }
  if (game.isCheckmate()) return { cp: game.turn() === 'w' ? -10000 : 10000, mate: game.turn() === 'w' ? -0 : 0, terminal: true, depth: 0, best: null, pv: [] };
  if (game.isStalemate() || game.isInsufficientMaterial() || game.isDrawByFiftyMoves() || game.isThreefoldRepetition()) return { cp: 0, mate: null, terminal: true, depth: 0, best: null, pv: [] };
  return null;
}

const notationCache=new Map(),ratingCache=new WeakMap();
export function uciToSan(fen, uci) {
  if (!uci || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return '—';
  const key=fen+'|'+uci;if(notationCache.has(key))return notationCache.get(key);
  try { const san=new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
    notationCache.set(key,san);if(notationCache.size>1024)notationCache.delete(notationCache.keys().next().value);return san; }
  catch { return '—'; }
}

export function classifyMove(move, before, after) {
  if (!Number.isFinite(before?.cp) || !Number.isFinite(after?.cp)) return null;
  if (before.rootFen && before.rootFen!==move.before || after.rootFen && after.rootFen!==move.after) return null;
  const alternative = before.alternative;
  const signature=JSON.stringify([move.before,move.after,move.from,move.to,move.promotion,move.color,move.piece,move.captured,move.flags,move.san,before.cp,after.cp,before.best,before.depth,before.mate,before.legacy,before.terminal,before.pv,after.depth,after.best,after.mate,after.legacy,after.terminal,after.pv,alternative?.cp,alternative?.depth,alternative?.mate,alternative?.pv?.[0]]);
  const cached=ratingCache.get(move);if(cached?.signature===signature)return cached.result;
  const played = move.from + move.to + (move.promotion || '');
  const best = before.best === played;
  const sign = move.color === 'w' ? 1 : -1;
  // A played MultiPV candidate has a directly comparable evaluation at the same root.
  const sameSearch = !before.legacy && before.depth >= 14 && alternative?.depth === before.depth &&
    alternative?.pv?.[0] === played && Number.isFinite(alternative.cp) && before.mate == null && after.mate == null && alternative.mate == null;
  const comparable = before.depth >= 14 && (after.terminal || after.depth >= 14 && Math.abs(before.depth-after.depth) <= 3) && !before.legacy && (!after.legacy || after.terminal);
  const mateTransition = before.mate != null || after.mate != null;
  // A mate score encodes the outcome, not a hundred-pawn material swing.
  const bound = cp => mateTransition ? Math.max(-500,Math.min(500,cp)) : cp;
  const loss = Math.max(0, (bound(before.cp) - bound(sameSearch ? alternative.cp : after.cp)) * sign);
  const bestSan = uciToSan(move.before, before.best);
  if (!best && loss >= 50 && (bestSan === '—' || !sameSearch && !comparable)) {
    ratingCache.set(move,{signature,result:null});
    return null;
  }
  const advantage = alternative ? (before.cp - alternative.cp) * sign : 0;
  const great = best && loss <= 30 && before.depth >= 8 && alternative?.depth === before.depth && advantage >= 100;
  const sacrifice=best?brilliantEvidence(move,before,after):null;
  const label = sacrifice ? 'Brilliant' : great ? 'Great' : best ? 'Best' : loss >= 200 ? 'Blunder' : loss >= 100 ? 'Mistake' : loss >= 50 ? 'Inaccuracy' : 'Good';
  const result={ label, loss, best: bestSan,...(sacrifice?{sacrifice}:{}) };ratingCache.set(move,{signature,result});return result;
}

export function formatEvaluation(value) {
  if (!value) return '—';
  if (value.mate !== null) return value.terminal ? (value.cp > 0 ? '1–0' : '0–1') : `${value.cp > 0 ? '+' : '−'}M${Math.abs(value.mate)}`;
  const score = value.cp / 100;
  return `${score >= 0 ? '+' : ''}${score.toFixed(2)}`;
}

export function summarize(parsed, evaluations, color) {
  const counts = { Brilliant: 0, Best: 0, Great: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 };
  let totalLoss = 0, count = 0;
  const items = parsed.moves.map((move, i) => classifyMove(move, evaluations[i], evaluations[i + 1]));
  items.forEach((item, i) => {
    if (!item || (color && parsed.moves[i].color !== color)) return;
    counts[item.label]++; totalLoss += item.loss; count++;
  });
  return { counts, averageLoss: count ? totalLoss / count : null, count, items };
}

export function resultFor(game, username) {
  const player = game.white.username.toLowerCase() === username.toLowerCase() ? game.white : game.black;
  return player.result === 'win' ? 'win' : ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(player.result) ? 'draw' : 'loss';
}

export function timeControl(control) {
  const [seconds, increment] = String(control || '').split('+').map(Number);
  if (!Number.isFinite(seconds)) return 'Daily';
  if (seconds >= 86400) return `${Math.round(seconds / 86400)} day`;
  return `${Number((seconds / 60).toFixed(1))}${increment ? ` | ${increment}` : ' min'}`;
}

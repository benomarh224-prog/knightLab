import { Chess } from 'chess.js';
import { classifyMove, formatEvaluation } from './game.js';
import { pieceNames, moveLabel } from './training.js';

const name = color => color === 'w' ? 'White' : 'Black';
const opposite = color => color === 'w' ? 'b' : 'w';
const badLabels = new Set(['Inaccuracy', 'Mistake', 'Blunder']);

export function legalLine(fen, pv = [], limit = 6) {
  let chess;
  try { chess = new Chess(fen); } catch { return []; }
  const line = [];
  for (const uci of pv.slice(0, limit)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci || '')) break;
    try { line.push(chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]})); }
    catch { break; }
    if (chess.isGameOver()) break;
  }
  return line;
}

function lineText(line) {
  return line.map((move, index) => `${move.color === 'w' ? move.before.split(' ')[5] + '.' : index === 0 ? move.before.split(' ')[5] + '…' : ''} ${move.san}`).join(' ').trim();
}

function preferredLine(fen, score) {
  if (!score?.best) return [];
  return legalLine(fen, score.pv?.[0] === score.best ? score.pv : [score.best]);
}

function moveIdea(move) {
  if (!move) return '';
  if (move.san.endsWith('#')) return `${move.san} delivers checkmate.`;
  if (move.flags.includes('k') || move.flags.includes('q')) return `${move.san} castles the king to ${move.to} and brings the rook toward the center.`;
  if (move.captured) {
    const square = move.flags.includes('e') ? move.to[0] + move.from[1] : move.to;
    return `${move.san} captures the ${pieceNames[move.captured]} on ${square}${move.san.includes('+') ? ' with check' : ''}${move.promotion ? ` and promotes to a ${pieceNames[move.promotion]}` : ''}.`;
  }
  if (move.promotion) return `${move.san} promotes the pawn to a ${pieceNames[move.promotion]}.`;
  const chess = new Chess(move.after), enemy = opposite(move.color);
  const targets = chess.board().flat().filter(piece => piece && piece.color === enemy && ['k','q','r'].includes(piece.type) && chess.attackers(piece.square, move.color).includes(move.to));
  if (targets.length >= 2) return `${move.san} puts the ${pieceNames[move.piece]} on ${move.to}, attacking ${targets.map(piece => `the ${pieceNames[piece.type]} on ${piece.square}`).join(' and ')}.`;
  if (move.san.includes('+')) return `${move.san} checks the king, so the opponent must answer the check.`;
  if (['n','b'].includes(move.piece) && move.from[1] === (move.color === 'w' ? '1' : '8') && move.to[1] !== move.from[1]) {
    const center = ['d4','e4','d5','e5'].filter(square => chess.attackers(square, move.color).includes(move.to));
    return `${move.san} develops the ${pieceNames[move.piece]} from ${move.from} to ${move.to}${center.length ? ` and adds control of ${center.join(' and ')}` : ''}.`;
  }
  if (move.piece === 'p' && ['d4','e4','d5','e5'].includes(move.to)) return `${move.san} places a pawn in the center on ${move.to}.`;
  return `${move.san} moves the ${pieceNames[move.piece]} from ${move.from} to ${move.to}. Stockfish prefers the resulting position.`;
}

export function coachMove(move, before, after) {
  if (!move) return { status:'start', title:'Your move coach', summary:'Select a move to see what changed, the engine’s alternative, and a useful lesson.', why:'', better:'', lesson:'', bestLine:'', replyLine:'', bestMove:null };
  if (!before || !after || !Number.isFinite(before.cp) || !Number.isFinite(after.cp)) return { status:'pending', title:moveLabel(move), summary:'The coach is waiting for the positions before and after this move to be reviewed.', why:'', better:'', lesson:'', bestLine:'', replyLine:'', bestMove:null };
  const rating = classifyMove(move, before, after), bad = badLabels.has(rating.label);
  const best = preferredLine(move.before, before), replies = preferredLine(move.after, after);
  const reply = replies[0], firstCapture = replies.find(candidate => candidate.color !== move.color && candidate.captured);
  const sign = move.color === 'w' ? 1 : -1;
  const losingMate = after.mate != null && after.cp * sign < 0;
  const alreadyLosingMate = before.mate != null && before.cp * sign < 0;
  let why = '';
  if (move.san.endsWith('#')) why = 'This move checkmates the opponent. The king has no legal escape.';
  else if (losingMate) why = `Stockfish ${alreadyLosingMate ? 'still finds' : 'now finds'} a forced mate for ${name(opposite(move.color))}.${reply?.san.endsWith('#') ? ` ${reply.san} delivers mate immediately.` : ' The continuation below shows the beginning of its line.'}`;
  else if (firstCapture) {
    const square = firstCapture.flags.includes('e') ? firstCapture.to[0] + firstCapture.from[1] : firstCapture.to;
    const movedPiece = firstCapture === reply && square === move.to && !move.flags.includes('e');
    const forcing = firstCapture.san.endsWith('#') ? ', delivering checkmate' : firstCapture.san.includes('+') ? ' with check' : '';
    why = `In Stockfish’s continuation, ${name(firstCapture.color)} plays ${firstCapture.san} and captures ${movedPiece ? `the ${pieceNames[move.promotion || move.piece]} you just moved` : `a ${pieceNames[firstCapture.captured]}`} on ${square}${forcing}.${!bad ? ' A capture alone does not make your move wrong; the engine also considers compensation.' : ''}`;
  } else if (reply?.san.includes('+')) why = `${name(reply.color)} can answer with ${reply.san}, giving check and making king safety the immediate priority.`;
  else if (before.mate != null && before.cp * sign > 0 && !(after.mate != null && after.cp * sign > 0)) why = 'The engine reported a forced mate before this move, but no longer reports one afterward.';
  else if (bad) why = `The search rates the resulting position worse for ${name(move.color)}.${reply ? ` Its first response is ${reply.san}.` : ''} This short line does not establish one clear tactical cause; compare the positions and confirm with Deep review.`;
  else why = `${moveIdea(move)}${reply ? ` The engine expects ${reply.san} next.` : ''}`;
  const summary = bad ? `${move.san} is rated ${rating.label.toLowerCase()}. ${before.mate != null || after.mate != null ? 'The forced-mate assessment changes or remains decisive.' : `It loses about ${(rating.loss / 100).toFixed(2)} pawns in evaluation.`}` : `${move.san} ${rating.label === 'Great' ? 'is a standout engine choice' : rating.label === 'Best' ? 'matches Stockfish’s first choice' : 'stays close to the engine’s preferred evaluation'}.`;
  const lesson = losingMate || reply?.san.includes('+') ? 'Before playing, check the opponent’s forcing moves: checks, captures, and immediate threats.' : firstCapture ? 'Before committing, ask what the opponent can capture and whether you have enough compensation.' : best[0]?.captured ? 'Look at forcing captures before choosing a quiet move.' : best[0]?.flags.includes('k') || best[0]?.flags.includes('q') ? 'Compare king safety and rook activity when castling is available.' : ['n','b'].includes(best[0]?.piece) && best[0].from[1] === (move.color === 'w' ? '1' : '8') ? 'Compare developing a minor piece with spending another tempo on an already active piece.' : 'Compare your move with the engine’s alternative and calculate the opponent’s strongest reply.';
  return { status:'ready', title:`${moveLabel(move)} · ${rating.label}`, summary, why, better:best[0] ? `${bad ? 'Consider the alternative. ' : 'Engine’s first choice. '}${moveIdea(best[0])}` : 'No legal engine alternative is available for this position.', lesson, bestLine:lineText(best), replyLine:lineText(replies), bestMove:best[0] ? before.best : null, comparison:`${formatEvaluation(before)} → ${formatEvaluation(after)} · White’s view`, rating:rating.label };
}

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
  return `${move.san} moves the ${pieceNames[move.piece]} from ${move.from} to ${move.to}. `;
}

export function continuationEvidence(line) {
  if(!line.length)return {text:'',exchange:false};
  const first=line[0],captures=line.filter(move=>move.captured),queens=captures.filter(move=>move.captured==='q');
  const exchange=new Set(queens.map(move=>move.color)).size===2;
  const late=line.findIndex((move,index)=>index>0&&move.captured);
  let text=`${name(first.color)}’s immediate reply in this line is ${first.san}. ${moveIdea(first)}`;
  if(exchange){
    const end=Math.max(...queens.map(move=>line.indexOf(move)));
    text=`The continuation proceeds in this order: ${line.slice(0,end+1).map(move=>`${name(move.color)} ${moveLabel(move)}`).join(' → ')}. `;
    text+='This is a queen exchange: each side gives up a queen. ';
    const taken=color=>captures.filter(move=>move.color===color).map(move=>pieceNames[move.captured]).join(', ')||'nothing';
    text+=`Material captured across the shown line: White captures ${taken('w')}; Black captures ${taken('b')}.`;
  }else if(late>=0){
    const move=line[late];
    text+=` Later, after ${lineText(line.slice(0,late))}, ${name(move.color)} plays ${move.san}, capturing the ${pieceNames[move.captured]} on ${move.to}. This capture belongs to the later continuation.`;
  }
  return {text,exchange};
}

export function coachMove(move,before,after){
  const empty={why:'',better:'',lesson:'',bestLine:'',replyLine:'',bestMove:null,continuations:[],hasImprovement:false};
  if(!move)return {...empty,status:'start',title:'Your move coach',summary:'Select a move to see its purpose and the engine continuation.'};
  if(!before||!after||!Number.isFinite(before.cp)||!Number.isFinite(after.cp))return {...empty,status:'pending',title:moveLabel(move),summary:'The coach is waiting for the positions before and after this move to be reviewed.'};
  const rating=classifyMove(move,before,after),bad=badLabels.has(rating.label);
  const best=preferredLine(move.before,before),replies=preferredLine(move.after,after),reply=replies[0];
  const played=move.from+move.to+(move.promotion||''),sameBest=best.length>0&&before.best===played;
  const hasImprovement=Boolean(bad&&best.length&&!sameBest),sign=move.color==='w'?1:-1;
  const losingMate=after.mate!=null&&after.cp*sign<0,alreadyLosingMate=before.mate!=null&&before.cp*sign<0;
  const immediateCapture=reply?.captured?reply:null,evidence=continuationEvidence(replies);
  let why=moveIdea(move),brief=why.split(/(?<=[.!?])\s+/)[0];
  if(move.san.endsWith('#'))why='This move checkmates the opponent. The king has no legal escape.';
  else if(losingMate){
    why=`Stockfish ${alreadyLosingMate?'still finds':'now finds'} a forced mate for ${name(opposite(move.color))}.${reply?.san.endsWith('#')?` ${reply.san} delivers mate immediately.`:' The continuation below shows the beginning of its line.'}`;
    brief=reply?.san.endsWith('#')?`${name(reply.color)} has ${reply.san}: checkmate.`:`${name(opposite(move.color))} has a forced mate in the engine line.`;
  }else if(bad&&before.mate!=null&&before.cp*sign>0&&!(after.mate!=null&&after.cp*sign>0)){
    why='The engine reported a forced mate before this move, but no longer reports one afterward.';brief='The engine no longer finds your forced mate. Compare the mating line before this move.';
  }else if(bad){
    if(immediateCapture){
      const square=immediateCapture.flags.includes('e')?immediateCapture.to[0]+immediateCapture.from[1]:immediateCapture.to;
      const moved=square===move.to;
      why=`${name(reply.color)} plays ${reply.san} immediately in the shown line and captures ${moved?`the ${pieceNames[move.promotion||move.piece]} you just moved`:`a ${pieceNames[reply.captured]}`} on ${square}${reply.san.includes('+')?' with check':''}.`;
      brief=`${name(reply.color)} can play ${reply.san}, taking your ${pieceNames[reply.captured]} on ${square}${reply.san.includes('+')?' with check':''}.`;
    }else if(reply?.san.includes('+')){why=`${name(reply.color)} can answer with ${reply.san}, giving check.`;brief=why;}
    else {why=`The search rates the resulting position worse for ${name(move.color)}. This short line does not establish one clear tactical cause; compare the positions and confirm with Deep review.`;brief=`This lowers your position’s evaluation by about ${(rating.loss/100).toFixed(1)} pawns. The engine line does not show a clear tactical reason.`;}
    if(evidence.exchange)why+=' '+evidence.text;
  }else if(reply?.captured){why+=' '+evidence.text+' A capture alone does not make your move wrong; the engine also considers compensation.';}
  else if(evidence.exchange)why+=' '+evidence.text;
  else if(reply)why+=` The opponent’s immediate reply in the engine line is ${reply.san}.`;
  const summary=bad?`${move.san} is rated ${rating.label.toLowerCase()}. ${before.mate!=null||after.mate!=null?'The forced-mate assessment changes or remains decisive.':`It loses about ${(rating.loss/100).toFixed(2)} pawns in evaluation.`}`:`${move.san} ${sameBest?'matches Stockfish’s first choice':'stays close to the engine’s preferred evaluation'}.`;
  const lesson=losingMate||reply?.san.includes('+')?'Before playing, check the opponent’s forcing moves: checks, captures, and immediate threats.':immediateCapture?'Before committing, check the full exchange and the resulting material balance.':['n','b'].includes(best[0]?.piece)&&best[0].from[1]===(move.color==='w'?'1':'8')?'Compare developing a minor piece with spending another tempo on an already active piece.':'Calculate the opponent’s reply and compare the resulting position.';
  const continuations=[];
  if(best.length)continuations.push({kind:'best',label:sameBest?'Your move · engine’s first choice':'Engine candidate · before your move',fen:move.before,moves:best});
  if(replies.length)continuations.push({kind:'reply',label:'After your move · opponent replies first',fen:move.after,moves:replies});
  return {status:'ready',title:`${moveLabel(move)} · ${rating.label}`,summary,brief,why,whyLabel:sameBest?'Why this works':bad?'Why this move is weaker':'What this move does',
    better:best[0]?`${hasImprovement?'Consider the alternative. ':'Engine’s first choice. '}${moveIdea(best[0])}`:'No legal engine alternative is available for this position.',
    hasImprovement,sameBest,lesson,bestLine:lineText(best),replyLine:lineText(replies),bestMove:best.length?before.best:null,
    continuations,replyEvidence:evidence.text,comparison:`${formatEvaluation(before)} → ${formatEvaluation(after)} · White’s view`,rating:rating.label};
}

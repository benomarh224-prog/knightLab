import { Chess } from 'chess.js';
import { classifyMove, formatEvaluation } from './game.js';
import { pieceNames, moveLabel } from './training.js';
import{tacticalFact}from'./tactical-facts.js';

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

export function moveIdea(move) {
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
  const previous=new Chess(move.before),points={q:9,r:5,b:3,n:3,p:1};
  const protectedPieces=chess.board().flat().filter(piece=>piece&&piece.color===move.color&&piece.type!=='k'&&piece.square!==move.to&&chess.attackers(piece.square,move.color).includes(move.to)&&!previous.attackers(piece.square,move.color).includes(move.from)).sort((a,b)=>points[b.type]-points[a.type]);
  for(const piece of protectedPieces){
    // Verify an actual legal recapture, rather than treating a pinned geometric
    // defender as protection against the opponent's current capture.
    const captures=chess.moves({verbose:true}).filter(capture=>capture.captured&&capture.to===piece.square);
    if(captures.some(capture=>{const next=new Chess(move.after);next.move({from:capture.from,to:capture.to,promotion:capture.promotion});return next.moves({square:move.to,verbose:true}).some(reply=>reply.captured&&reply.to===piece.square);}))return `${move.san} adds protection to the ${pieceNames[piece.type]} on ${piece.square}; the ${pieceNames[move.piece]} can recapture there.`;
  }
  if(['r','q'].includes(move.piece)){
    const pawns=chess.board().flat().filter(piece=>piece?.type==='p'&&piece.square[0]===move.to[0]);
    if(!pawns.length)return `${move.san} places the ${pieceNames[move.piece]} on the open ${move.to[0]}-file, with no pawns blocking that file.`;
    if(!pawns.some(piece=>piece.color===move.color))return `${move.san} places the ${pieceNames[move.piece]} on the half-open ${move.to[0]}-file, which has no friendly pawn.`;
  }
  if(move.piece==='p'){
    const rank=Number(move.to[1]),file=move.to.charCodeAt(0),direction=move.color==='w'?1:-1;
    const blockers=chess.board().flat().filter(piece=>piece?.color===enemy&&piece.type==='p'&&Math.abs(piece.square.charCodeAt(0)-file)<=1&&(Number(piece.square[1])-rank)*direction>0);
    if(!blockers.length)return `${move.san} advances a passed pawn: no enemy pawn ahead on its file or either neighboring file can stop it.`;
  }
  if(move.piece==='k'&&!chess.board().flat().some(piece=>piece&&['q','r','b','n'].includes(piece.type))){
    const distance=square=>Math.max(Math.abs(square.charCodeAt(0)-100.5),Math.abs(Number(square[1])-4.5));
    if(distance(move.to)<distance(move.from))return `${move.san} brings the king closer to the center in this pawn ending.`;
  }
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
    text+=`Material captured across the shown line: White captures ${taken('w')}; Black captures ${taken('b')}. `;
    const points={p:1,n:3,b:3,r:5,q:9},balance=color=>line.filter(move=>move.color===color).reduce((sum,move)=>sum+(points[move.captured]||0)+(move.promotion?points[move.promotion]-1:0),0);
    const gain=balance('w')-balance('b');
    text+=gain===0?'The shown exchange is even in material.':`${gain>0?'White':'Black'} gains ${Math.abs(gain)} more material point${Math.abs(gain)===1?'':'s'} across these moves (not an engine evaluation).`;
  }else if(late>=0){
    const move=line[late];
    text+=` Later, after ${lineText(line.slice(0,late))}, ${name(move.color)} plays ${move.san}, capturing the ${pieceNames[move.captured]} on ${move.to}. This capture belongs to the later continuation.`;
  }
  return {text,exchange};
}

const reports=new WeakMap();
export function coachMove(move,before,after){
  if(!move||!before||!after)return computeCoachMove(move,before,after);
  const key=JSON.stringify([move.before,move.after,move.san,before,after]);
  let cached=reports.get(move);if(cached?.has(key))return cached.get(key);
  const report=computeCoachMove(move,before,after);
  if(!cached){cached=new Map();reports.set(move,cached);}cached.set(key,report);
  if(cached.size>4)cached.delete(cached.keys().next().value);return report;
}
function computeCoachMove(move,before,after){
  const empty={why:'',better:'',lesson:'',bestLine:'',replyLine:'',bestMove:null,continuations:[],hasImprovement:false,teaching:null};
  if(!move)return {...empty,status:'start',title:'Your move coach',summary:'Select a move to see its purpose and the engine continuation.'};
  if(!before||!after||!Number.isFinite(before.cp)||!Number.isFinite(after.cp))return {...empty,status:'pending',title:moveLabel(move),summary:'The coach is waiting for the positions before and after this move to be reviewed.'};
  const rating=classifyMove(move,before,after);
  if(!rating)return {...empty,status:'pending',title:moveLabel(move),summary:'Stockfish needs comparable evaluations before rating this move. Let the review deepen or select Deep review.'};
  const bad=badLabels.has(rating.label);
  const best=preferredLine(move.before,before),replies=preferredLine(move.after,after),reply=replies[0];
  const played=move.from+move.to+(move.promotion||''),sameBest=best.length>0&&before.best===played;
  const hasImprovement=Boolean(bad&&best.length&&!sameBest),sign=move.color==='w'?1:-1;
  const losingMate=after.mate!=null&&after.cp*sign<0,alreadyLosingMate=before.mate!=null&&before.cp*sign<0;
  const immediateCapture=reply?.captured?reply:null,evidence=continuationEvidence(replies);
  let why=moveIdea(move),brief=why.split(/(?<=[.!?])\s+/)[0];
  const fact=tacticalFact(move);if(!bad&&fact&&!['mate','check'].includes(fact.kind)){why=fact.text+' '+why;brief=fact.text;}
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
  let summary=bad?`${move.san} is rated ${rating.label.toLowerCase()}. ${before.mate!=null||after.mate!=null?'The forced-mate assessment changes or remains decisive.':`It loses about ${(rating.loss/100).toFixed(2)} pawns in evaluation.`}`:`${move.san} ${sameBest?'matches Stockfish’s first choice':'stays close to the engine’s preferred evaluation'}.`;
  if(rating.sacrifice){
    const sacrifice=rating.sacrifice;
    brief=`${move.san} offers your ${pieceNames[sacrifice.piece]} on ${sacrifice.square}. The engine supports the sacrifice.`;
    summary=`${move.san} offers your ${pieceNames[sacrifice.piece]} on ${sacrifice.square}; Stockfish rates it as the best move.`;
    why=`${sacrifice.captureSan} is a legal way to capture the ${pieceNames[sacrifice.piece]} on ${sacrifice.square}. After local legal recaptures, you would still give up material; this is more than an equal trade. `+
      (after.best===sacrifice.capture?new Chess(move.after).moves().length===1?`The opponent’s only legal reply is ${sacrifice.captureSan}, accepting the sacrifice. `:`The engine’s immediate reply accepts the sacrifice with ${sacrifice.captureSan}. `:reply?`The engine’s immediate reply is ${reply.san}; it does not accept this capture in its main line. `:'')+
      `${move.san} matches Stockfish’s first choice. At the checked depth, the resulting position is evaluated ${formatEvaluation(after)} from White’s perspective. Follow the legal engine continuation below to see the compensation.`;
  }
  const lesson=losingMate||reply?.san.includes('+')?'Before playing, check the opponent’s forcing moves: checks, captures, and immediate threats.':immediateCapture?'Before committing, check the full exchange and the resulting material balance.':['n','b'].includes(best[0]?.piece)&&best[0].from[1]===(move.color==='w'?'1':'8')?'Compare developing a minor piece with spending another tempo on an already active piece.':'Calculate the opponent’s reply and compare the resulting position.';
  const continuations=[];
  if(best.length)continuations.push({kind:'best',label:sameBest?'Your move · engine’s first choice':'Engine candidate · before your move',fen:move.before,moves:best});
  if(replies.length)continuations.push({kind:'reply',label:'After your move · opponent replies first',fen:move.after,moves:replies});
  continuations.push({kind:'played',label:'Your move and its continuation',fen:move.before,moves:[move,...replies].slice(0,6)});
  // A short teaching layer uses only observable move effects and the legally
  // replayed PV. A capture in a later ply is never described as immediate.
  let reason=moveIdea(move);
  if(move.san.endsWith('#'))reason='The king is in check and has no legal reply. This is checkmate.';
  else if(losingMate||bad&&before.mate!=null&&before.cp*sign>0)reason=why;
  else if(rating.sacrifice)reason=`${move.san} offers your ${pieceNames[rating.sacrifice.piece]} on ${rating.sacrifice.square}. Stockfish prefers this sacrifice at the checked depth; follow its continuation to examine the idea.`;
  else if(bad&&immediateCapture){
    const square=immediateCapture.flags.includes('e')?immediateCapture.to[0]+immediateCapture.from[1]:immediateCapture.to;
    reason=evidence.exchange?'The engine rates the resulting position lower after a queen exchange. Compare the remaining material after the trade.':`${move.san} leaves ${square===move.to?`the ${pieceNames[move.promotion||move.piece]} you just moved`:`your ${pieceNames[immediateCapture.captured]}`} on ${square} available to a legal capture.`;
  }
  else if(bad){
    const later=replies.findIndex((candidate,index)=>index>0&&candidate.captured&&candidate.color!==move.color),capture=replies[later];
    reason=later>0?`In the shown continuation, after ${lineText(replies.slice(0,later))}, ${name(capture.color)} plays ${capture.san} and captures the ${pieceNames[capture.captured]} on ${capture.flags.includes('e')?capture.to[0]+capture.from[1]:capture.to}. This happens later in the line.`:reply?`Stockfish prefers a different position. ${reply.san.includes('+')?'The opponent can force a response with check.':'The short line does not establish a single tactical cause; compare the continuation before drawing a conclusion.'}`:'The available evidence is too short to identify a specific tactical cause. Deepen the review to investigate.';
  }
  let opponent='No validated reply is available yet.';
  if(reply){
    opponent=`${name(reply.color)}’s immediate reply in this line is ${reply.san}`;
    if(reply.san.endsWith('#'))opponent+=': checkmate.';
    else if(reply.captured)opponent+=`, capturing the ${pieceNames[reply.captured]} on ${reply.flags.includes('e')?reply.to[0]+reply.from[1]:reply.to}${reply.san.includes('+')?' with check':''}.`;
    else if(reply.san.includes('+'))opponent+=', giving check.';
    else {opponent+='.';const purpose=moveIdea(reply);if(/adds protection|develops|passed pawn|open .*file|closer to the center|castles/.test(purpose))opponent+=' It '+purpose.slice(reply.san.length+1);}
    if(evidence.exchange)opponent+=' The continuation exchanges both queens later in the line.';
  }
  const teaching={reason,reply:opponent,alternative:hasImprovement?moveIdea(best[0]):'',demonstration:bad&&replies.length?'reply':sameBest&&best.length?'best':'played'};
  return {status:'ready',title:`${moveLabel(move)} · ${rating.label}`,summary,brief,why,whyLabel:sameBest?'Why this works':bad?'Why this move is weaker':'What this move does',
    better:best[0]?`${hasImprovement?'Consider the alternative. ':'Engine’s first choice. '}${moveIdea(best[0])}`:'No legal engine alternative is available for this position.',
    hasImprovement,sameBest,lesson,bestLine:lineText(best),replyLine:lineText(replies),bestMove:best.length?before.best:null,
    continuations,replyEvidence:evidence.text,comparison:`${formatEvaluation(before)} → ${formatEvaluation(after)} · White’s view`,rating:rating.label,teaching};
}

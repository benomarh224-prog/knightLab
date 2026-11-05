import {Chess} from 'chess.js';

// ROQVYN's independent, conservative rule. It adds a sacrifice verdict without
// changing evaluation, accuracy or the existing loss-classification thresholds.
export const BRILLIANT_DEPTH=16;
const value={p:100,n:320,b:330,r:500,q:900,k:0};
const uci=move=>move.from+move.to+(move.promotion||'');
const consistentMate=score=>score.mate==null||Number.isInteger(score.mate)&&score.mate!==0&&Math.abs(score.cp)===10000&&Math.sign(score.mate)===Math.sign(score.cp);

function validLine(fen,score){
  if(!Array.isArray(score.pv)||score.pv[0]!==score.best)return false;
  const chess=new Chess(fen);let count=0;
  for(const text of score.pv.slice(0,12)){
    if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(text))return false;
    try{chess.move({from:text.slice(0,2),to:text.slice(2,4),promotion:text[4]});}catch{return false;}
    count++;
    if(chess.isCheckmate()||chess.isStalemate())return true;
  }
  return count>=3;
}

// Legal recaptures on one square, with the option to stop. Pinned attackers and
// unsafe king captures are excluded by chess.js. An exhausted budget is unknown,
// never positive evidence of a sacrifice. This is material evidence, not a PV.
function bestExchange(chess,square,budget,ply=0){
  if(--budget.nodes<0)return null;
  const captures=chess.moves({verbose:true}).filter(m=>m.to===square&&m.captured);
  if(ply>=10&&captures.length)return null;
  let best=0;
  for(const capture of captures){
    chess.move({from:capture.from,to:capture.to,promotion:capture.promotion});
    const reply=bestExchange(chess,square,budget,ply+1);chess.undo();
    if(reply===null)return null;
    best=Math.max(best,value[capture.captured]+(capture.promotion?value[capture.promotion]-value.p:0)-reply);
  }
  return best;
}

export function brilliantEvidence(move,before,after){
  const sign=move?.color==='w'?1:-1,played=move&&uci(move),alternative=before?.alternative;
  if(!move||!['n','b','r','q'].includes(move.piece)||move.promotion||move.flags?.includes('k')||move.flags?.includes('q')||move.san?.endsWith('#'))return null;
  if(!Number.isFinite(before?.cp)||!Number.isFinite(after?.cp)||before.best!==played||before.terminal||after.terminal||
     before.depth<BRILLIANT_DEPTH||after.depth<BRILLIANT_DEPTH||!Number.isFinite(before.depth)||!Number.isFinite(after.depth)||
     !Number.isFinite(alternative?.cp)||alternative.depth!==before.depth)return null;
  if(!consistentMate(before)||!consistentMate(after))return null;
  if(Math.max(0,(before.cp-after.cp)*sign)>30||after.cp*sign< -50||alternative.cp*sign>=300||
     (before.cp-alternative.cp)*sign<50||before.mate!=null&&before.cp*sign<0||after.mate!=null&&after.cp*sign<0)return null;
  try{
    const chess=new Chess(move.before);
    if(chess.turn()!==move.color||chess.moves().length<2)return null;
    const actual=chess.move({from:move.from,to:move.to,promotion:move.promotion});
    if(actual.after!==move.after||actual.piece!==move.piece||actual.captured!==move.captured)return null;
    if(!validLine(move.before,before)||!validLine(move.after,after))return null;
    const offered=chess.moves({verbose:true}).filter(m=>m.to===move.to&&m.captured===move.piece);
    let evidence=null;const budget={nodes:256};
    for(const capture of offered){
      chess.move({from:capture.from,to:capture.to,promotion:capture.promotion});
      const recapture=bestExchange(chess,move.to,budget);chess.undo();
      if(recapture===null)return null;
      const concession=value[capture.captured]+(capture.promotion?value[capture.promotion]-value.p:0)-recapture-(value[actual.captured]||0);
      if(concession>=100&&(!evidence||concession>evidence.materialCp))evidence={piece:actual.piece,square:actual.to,capture:uci(capture),captureSan:capture.san,materialCp:concession,depth:Math.min(before.depth,after.depth)};
    }
    return evidence;
  }catch{return null;}
}

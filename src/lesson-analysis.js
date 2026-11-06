import {Engine} from './engine.js';
import {Chess} from 'chess.js';
import {legalLine,moveIdea} from './coach.js';
import {formatEvaluation,terminalEvaluation} from './game.js';

export function alternativeExplanation(move,before,after){
  // Revalidate both evidence roots and the immediate reply. Never describe a
  // later PV capture as the reply, and never convert mate scores to pawn loss.
  let check;try{check=new Chess(move.before).move({from:move.from,to:move.to,promotion:move.promotion});}catch{return null;}
  if(check.after!==move.after||before?.rootFen!==move.before||after?.rootFen!==move.after)return null;
  if(after.terminal){const terminal=terminalEvaluation(move.after);if(!terminal||terminal.cp!==after.cp||terminal.mate!==after.mate)return null;}
  const best=legalLine(move.before,before.pv,1)[0],reply=legalLine(move.after,after.pv,1)[0];
  if(!best||before.pv[0]!==before.best||!Number.isFinite(before.cp)||!Number.isFinite(after.cp)||before.depth<14||!after.terminal&&(after.depth<14||!reply||after.pv[0]!==after.best))return null;
  const depth=after.terminal?before.depth:Math.min(before.depth,after.depth);
  const same=best.from===move.from&&best.to===move.to&&best.promotion===move.promotion;
  const evaluation=after.terminal?(new Chess(move.after).isCheckmate()?'The move gives checkmate.':'The resulting position is drawn.'):`Position after ${move.san}: ${formatEvaluation(after)} from White’s view.`;
  return `Stockfish · depth ${depth}. ${same?'The engine prefers your move at this depth. The lesson follows a different study line.':`The engine’s first choice is ${best.san} at this depth.`} ${evaluation}${reply?` The opponent’s immediate reply in this line is ${reply.san}. ${moveIdea(reply)}`:''}`;
}
export function createLessonAnalysis({makeEngine=()=>new Engine()}={}){
  let engine=null,generation=0;const cache=new Map();
  function cancel(){generation++;engine?.destroy();engine=null;}
  async function explain(move,onResult){
    cancel();const request=generation,key=move.before+'|'+move.from+move.to+(move.promotion||'');
    if(cache.has(key)){onResult(cache.get(key));return;}
    const current=engine=makeEngine();
    try{
      const before=await current.evaluate(move.before,{depth:16,milliseconds:2200});
      if(request!==generation)return;
      const after=await current.evaluate(move.after,{depth:16,milliseconds:2200});
      if(request!==generation)return;
      // Terminal outcomes are verified by chess.js, not an invented engine PV.
      const text=alternativeExplanation(move,before,{...after,rootFen:after.terminal?move.after:after.rootFen});
      const result=text||'The engine did not reach a verified depth for this comparison. The move’s legal status and the exercise objective are shown above; no quality rating is assigned.';
      cache.set(key,result);if(cache.size>24)cache.delete(cache.keys().next().value);onResult(result);
    }catch{if(request===generation)onResult('Engine comparison is unavailable. The move is legal, and no quality rating has been assigned. You can explore the position.');}
  }
  return {explain,cancel};
}

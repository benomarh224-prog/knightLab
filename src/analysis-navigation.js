import {Chess} from 'chess.js';
const prefixes=new WeakMap();
// A variation shares all preceding moves with its source. Show that history in
// the ordinary playback row instead of replacing it with a separate workspace.
export function analysisNavigation(parsed,evaluations,ply,line=null){
  if(!line)return {moves:parsed.moves,scores:evaluations,cursor:ply,base:0,end:parsed.moves.length};
  let prefix=prefixes.get(line);
  if(!prefix){const chess=new Chess(line.origin.startFen);prefix=line.origin.moves.map(uci=>chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]}));prefixes.set(line,prefix);}
  const base=prefix.length,moves=[...prefix,...line.entries];
  const scores=prefix.map((move,i)=>parsed.fens[i]===move.before?evaluations[i]:null).concat(line.scores);
  return {moves,scores,cursor:base+line.cursor,base,end:line.entries.length?moves.length:parsed.moves.length};
}

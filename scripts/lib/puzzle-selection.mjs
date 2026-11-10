import{Chess}from'chess.js';
export function positionIdentity(fen){
 const board=new Chess(fen),pieces=board.board().flat().filter(Boolean),variants=[];
 for(const mirror of[false,true])for(const rotate of[false,true]){
  const entries=pieces.map(p=>{let f=p.square.charCodeAt(0)-97,r=+p.square[1]-1;if(rotate){f=7-f;r=7-r;}if(mirror)f=7-f;return `${rotate?(p.color==='w'?'b':'w'):p.color}${p.type}${f}${r}`;}).sort();
  variants.push((rotate?(board.turn()==='w'?'b':'w'):board.turn())+':'+entries.join(','));
 }
 return variants.sort()[0];
}
export function gameIdentity(url){return url.match(/lichess\.org\/(?:game\/)?(\w{8})/)?.[1]||null;}
export const solverValue=(score,side)=>score.mate?(Math.sign(score.mate)*(side==='w'?1:-1)*10000):score.cp*(side==='w'?1:-1);

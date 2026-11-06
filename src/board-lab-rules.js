import {Chess} from 'chess.js';
import {squareGrid} from './square-practice.js';

export const squareName=value=>typeof value==='string'&&/^[a-h][1-8]$/.test(value);
const offsets=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
export function knightSquares(square){
  if(!squareName(square))return [];
  const file=square.charCodeAt(0)-97,rank=Number(square[1])-1;
  return offsets.map(([f,r])=>[file+f,rank+r]).filter(([f,r])=>f>=0&&f<8&&r>=0&&r<8).map(([f,r])=>String.fromCharCode(97+f)+(r+1));
}
export function routePosition(puzzle,square=puzzle.from){
  const chess=new Chess(puzzle.fen);chess.remove(puzzle.from);
  if(!chess.put({type:'n',color:'w'},square))throw Error('Invalid knight position');
  return chess;
}
// A route drill, not an alternating game: only the knight moves, other pieces
// stay fixed. Occupied and attacked landing squares are outside the route.
export function routeDestination(puzzle,square){
  if(!squareName(square))return {allowed:false,reason:'invalid',attackers:[]};
  const base=new Chess(puzzle.fen),occupant=base.get(square);
  if(occupant&&square!==puzzle.from)return {allowed:false,reason:'occupied',attackers:[]};
  const chess=routePosition(puzzle,square),attackers=chess.attackers(square,'b');
  return {allowed:!attackers.length,reason:attackers.length?'attacked':null,attackers};
}
const graphs=new WeakMap();
function routeGraph(puzzle){
  if(!graphs.has(puzzle)){
    const safe=new Set(squareGrid().filter(square=>routeDestination(puzzle,square).allowed));
    graphs.set(puzzle,new Map([...safe].map(square=>[square,knightSquares(square).filter(next=>safe.has(next))])));
  }
  return graphs.get(puzzle);
}
export function shortestKnightPath(puzzle,from=puzzle.from,to=puzzle.to){
  const graph=routeGraph(puzzle);if(!graph.has(from)||!graph.has(to))return null;
  const queue=[[from]],seen=new Set([from]);
  for(let i=0;i<queue.length;i++){
    const path=queue[i],square=path.at(-1);if(square===to)return path;
    for(const next of graph.get(square))if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}
  }
  return null;
}
export function knightStep(puzzle,from,to){
  if(!knightSquares(from).includes(to))return {allowed:false,reason:'shape',attackers:[]};
  return routeDestination(puzzle,to);
}

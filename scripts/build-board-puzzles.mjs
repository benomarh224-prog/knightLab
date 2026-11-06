import {Chess} from 'chess.js';
import{writeFile}from'node:fs/promises';
import{routeDestination,shortestKnightPath}from'../src/board-lab-rules.js';
import{squareGrid}from'../src/square-practice.js';
const levels=['beginner','intermediate','advanced'];
function position(pieces){const chess=new Chess();chess.clear();for(const [color,type,square]of pieces)if(!chess.put({type,color},square))throw Error('Invalid piece');return chess;}
function quiet(chess){const kings=chess.board().flat().filter(piece=>piece?.type==='k');return kings.length===2&&kings.every(king=>!chess.isAttacked(king.square,king.color==='w'?'b':'w'));}
const targets=[['n','f3'],['b','c4'],['r','a1'],['q','d3'],['p','e4'],['n','c3'],['b','g2'],['r','b3'],['q','e2'],['p','d5'],['n','e5'],['b','b5'],['r','e1'],['q','c2'],['p','g4'],['n','d2']];
const extras=[['b','p','a6'],['w','p','h3'],['w','b','c1'],['b','r','b8'],['w','n','b1'],['b','b','f8'],['w','q','d1'],['b','n','f6']];
const data={version:1,memory:{},route:{}};
for(const [levelIndex,level]of levels.entries()){
  data.memory[level]=[];data.route[level]=[];
  for(let variant=0;variant<2;variant++)for(const [index,[type,square]]of targets.entries()){
    const color=variant?'b':'w',chess=position([['w','k','g1'],['b','k','h8'],[color,type,square]]);
    if(!quiet(chess))continue;
    const needed=3+levelIndex*2;
    for(let n=0;n<extras.length&&chess.board().flat().filter(Boolean).length<needed;n++){
      const [c,t,s]=extras[(n+index)%extras.length];if(chess.get(s)||c===color&&t===type)continue;
      chess.put({color:c,type:t},s);if(!quiet(chess))chess.remove(s);
    }
    if(chess.board().flat().filter(Boolean).length!==needed)continue;
    data.memory[level].push({id:`memory-${level}-${variant}-${index}`,fen:chess.fen(),target:square,orientation:index%2?'b':'w'});
  }
  const obstacles=levelIndex===0?[]:levelIndex===1?[['b','r','d7'],['b','p','f5']]:[['b','r','d7'],['b','b','b5'],['b','p','f5'],['b','p','g6']];
  for(const [index,from]of ['b1','g1','d4','a3','e2','f6','h4','c2','f1','a5'].entries()){
    const chess=position([['w','k','h1'],['b','k','h8'],...obstacles,['w','n',from]]);
    if(!quiet(chess))continue;
    const base={fen:chess.fen(),from};if(!routeDestination(base,from).allowed)continue;
    const min=levelIndex+2,max=levelIndex===2?6:levelIndex+3;
    const goals=squareGrid().filter(to=>{const path=shortestKnightPath(base,from,to);return path&&path.length-1>=min&&path.length-1<=max;});
    for(let i=0;i<Math.min(3,goals.length);i++){
      const to=goals[(index*7+i*Math.max(1,Math.floor(goals.length/3)))%goals.length],path=shortestKnightPath(base,from,to);
      data.route[level].push({id:`route-${level}-${index}-${i}`,fen:chess.fen(),from,to,distance:path.length-1,orientation:'w'});
    }
  }
  if(data.memory[level].length<5||data.route[level].length<5)throw Error('Insufficient original puzzles: '+level);
}
await writeFile('src/board-lab-puzzles.json',JSON.stringify(data,null,2)+'\n');
console.log(Object.fromEntries(levels.map(level=>[level,{memory:data.memory[level].length,route:data.route[level].length}])));

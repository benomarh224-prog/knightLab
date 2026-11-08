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

// Expert puzzles are additive: existing IDs/FENs remain stable for saved rounds.
let seed=8112026;
const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);};
const squares=squareGrid();
data.memory.expert=[];data.route.expert=[];
for(let attempt=0;attempt<1000&&data.memory.expert.length<24;attempt++){
 const identities=[['w','n'],['b','b'],['w','r']],chess=position([['w','k','g1'],['b','k','h8']]),targets=[];
 for(const[color,type]of identities){const square=squares[random(64)];if(chess.get(square))break;chess.put({color,type},square);targets.push(square);}
 if(targets.length!==3||!quiet(chess))continue;
 for(let n=0;n<100&&chess.board().flat().filter(Boolean).length<12;n++){
  const color=random(2)?'w':'b',type=['p','n','b','r','q'][random(5)],square=squares[random(64)];
  if(chess.get(square)||type==='p'&&/[18]/.test(square)||identities.some(([c,t])=>c===color&&t===type))continue;
  chess.put({color,type},square);if(!quiet(chess))chess.remove(square);
 }
 if(chess.board().flat().filter(Boolean).length!==12)continue;
 const fen=chess.fen();if(data.memory.expert.some(p=>p.fen===fen))continue;
 data.memory.expert.push({id:'memory-expert-'+data.memory.expert.length,fen,target:targets[0],targets,orientation:attempt%2?'b':'w'});
}
for(let attempt=0;attempt<450&&data.route.expert.length<24;attempt++){
 const chess=position([['w','k','h1'],['b','k','h8']]);
 for(let n=0;n<7;n++){
  const square=squares[random(64)],color=n<5?'b':'w',type=color==='w'?'p':['r','b','n','p'][random(4)];
  if(chess.get(square)||type==='p'&&/[18]/.test(square))continue;
  chess.put({color,type},square);if(!quiet(chess))chess.remove(square);
 }
 if(chess.board().flat().filter(Boolean).length<7)continue;
 const from=squares[random(64)];if(chess.get(from))continue;chess.put({color:'w',type:'n'},from);if(!quiet(chess))continue;
 const base={fen:chess.fen(),from};if(!routeDestination(base,from).allowed)continue;
 const goals=squares.map(to=>({to,path:shortestKnightPath(base,from,to)})).filter(g=>g.path&&g.path.length>=9&&g.path.length<=13);
 if(!goals.length)continue;
 const {to,path}=goals[random(goals.length)];data.route.expert.push({id:'route-expert-'+data.route.expert.length,...base,to,distance:path.length-1,orientation:attempt%2?'b':'w',hideTargets:true});
}
if(data.memory.expert.length<12||data.route.expert.length<12)throw Error('Insufficient Expert puzzles: '+data.memory.expert.length+' memory, '+data.route.expert.length+' routes');
await writeFile('src/board-lab-puzzles.json',JSON.stringify(data,null,2)+'\n');
console.log(Object.fromEntries([...levels,'expert'].map(level=>[level,{memory:data.memory[level].length,route:data.route[level].length}])));

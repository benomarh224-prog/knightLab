import{readFileSync,writeFileSync,existsSync}from'node:fs';import{Worker}from'node:worker_threads';import{Chess}from'chess.js';import{Engine}from'../src/engine.js';import{positionIdentity,gameIdentity,solverValue}from'./lib/puzzle-selection.mjs';
class NodeWorker{constructor(){this.thread=new Worker(new URL('./stockfish-worker.cjs',import.meta.url));this.thread.on('message',line=>this.onmessage?.({data:line.trim()}));this.thread.on('error',error=>this.onerror?.(error));}postMessage(c){this.thread.postMessage(c);}terminate(){this.thread.terminate();}}
globalThis.Worker=NodeWorker;
const candidates=JSON.parse(readFileSync('.sites-local/calculation-candidates.json')),cachePath='.sites-local/calculation-checks-v1.json',cache=existsSync(cachePath)?JSON.parse(readFileSync(cachePath)):{};
const levels=['challenging','advanced','expert'],groups=['deflection','defenders','quiet','forks','pins','sacrifice','mate','promotion','endgame','defense'];
const cells=levels.flatMap(level=>groups.flatMap(group=>['w','b'].map(side=>({level,group,side})))),selected=[],identities=new Set(),games=new Set(),failures=[];let next=0;
const compact=s=>({depth:s.depth,cp:s.cp,...(s.mate?{mate:s.mate}:{}),best:s.best,pv:s.pv?.slice(0,12),rootFen:s.rootFen});
async function verify(p,engine){
 if(cache[p.id])return cache[p.id];let result;
 try{
  const side=p.fen.split(' ')[1],root=await engine.evaluate(p.fen,{depth:19,milliseconds:4000,clearHash:true});
  if(root.depth<16||root.best!==p.uci[0]||solverValue(root,side)<(p.group==='defense'?-100:150))throw Error('Root evidence does not support selected first move');
  const alternative=root.alternative;if(alternative&&solverValue(root,side)<9000&&solverValue(root,side)-solverValue(alternative,side)<60)throw Error('First-move distinction is too small');
  const board=new Chess(p.fen);for(const u of p.uci)board.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
  const finish=board.isGameOver()?{depth:0,cp:board.isCheckmate()?(side==='w'?10000:-10000):0,...(board.isCheckmate()?{mate:side==='w'?1:-1}:{}),rootFen:board.fen(),terminal:true}:await engine.evaluate(board.fen(),{depth:18,milliseconds:1500,clearHash:true});
  if(!finish.terminal&&finish.depth<14||solverValue(finish,side)<(p.group==='defense'?-100:180))throw Error('Final position does not retain the objective');
  result={ok:true,root:{...compact(root),alternative:alternative?compact({...alternative,rootFen:p.fen}):null},finish:{...compact(finish),...(finish.terminal?{terminal:true}:{})}};
 }catch(error){result={ok:false,reason:error.message};}
 cache[p.id]=result;writeFileSync(cachePath,JSON.stringify(cache,null,2));return result;
}
async function work(){const engine=new Engine();try{while(next<cells.length){const cell=cells[next++],pool=candidates.filter(p=>p.level===cell.level&&p.group===cell.group&&p.fen.split(' ')[1]===cell.side);let count=0;
 for(const p of pool){if(count===2)break;const key=positionIdentity(p.fen),game=gameIdentity(p.gameUrl);if(identities.has(key)||games.has(game))continue;const proof=await verify(p,engine);if(!proof.ok)continue;
  identities.add(key);games.add(game);selected.push({...p,verification:{engine:'Stockfish 19 lite single',checkedOn:'2026-11-10',...proof}});count++;
  writeFileSync('.sites-local/calculation-selected.json',JSON.stringify(selected,null,2));if(selected.length%10===0)console.log(JSON.stringify({accepted:selected.length,checked:Object.keys(cache).length,last:p.id,depth:proof.root.depth}));
 }if(count<2)failures.push({...cell,accepted:count});
}}finally{engine.destroy();}}
await Promise.all([work(),work()]);
if(failures.length){console.log(JSON.stringify({selected:selected.length,shortCells:failures}));process.exitCode=1;}
else{
 selected.sort((a,b)=>levels.indexOf(a.level)-levels.indexOf(b.level)||groups.indexOf(a.group)-groups.indexOf(b.group)||a.id.localeCompare(b.id));
 writeFileSync('src/calculation-puzzles.json',JSON.stringify(selected,null,2)+'\n');console.log(JSON.stringify({total:selected.length,minRating:Math.min(...selected.map(p=>p.rating)),maxRating:Math.max(...selected.map(p=>p.rating)),minDepth:Math.min(...selected.map(p=>p.verification.root.depth)),white:selected.filter(p=>p.fen.split(' ')[1]==='w').length}));
}

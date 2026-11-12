import test from'node:test';import assert from'node:assert/strict';import{Chess}from'chess.js';import{Worker as ThreadWorker}from'node:worker_threads';
import{createReviewPlan}from'../src/review-plan.js';import{parseGame,terminalEvaluation}from'../src/game.js';import{evaluationReady,strongerScore}from'../src/review-quality.js';import{createReviewCache}from'../src/review-cache.js';import{Engine}from'../src/engine.js';
const score=(p,i,depth=19)=>({cp:0,mate:null,depth,best:p.moves[i]?p.moves[i].from+p.moves[i].to+(p.moves[i].promotion||''):null,pv:[],rootFen:p.fens[i],searchVersion:2});

test('a bounded whole-game preview starts at the selected move and precedes the depth-19 pass',()=>{
 const p=parseGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 *'),plan=createReviewPlan(p,'precise'),scores=[],visited=[];
 for(let i=0;i<p.fens.length;i++){const task=plan.next(i<3?4:1,scores);assert.equal(task.phase,'preview');assert.ok(task.search.milliseconds<=140);assert.equal(task.search.multiPV,1);assert.ok(task.search.depth<19);visited.push(task.index);scores[task.index]=score(p,task.index,12);assert.equal(evaluationReady(scores[task.index],'precise'),false);}
 assert.deepEqual(visited.slice(0,6),[3,4,5,0,1,2]);assert.equal(new Set(visited).size,p.fens.length);
 const deep=plan.next(4,scores);assert.equal(deep.phase,'deepen');assert.equal(deep.search.depth,19);assert.notEqual(deep.search.multiPV,1);assert.equal(deep.search.milliseconds,4500);assert.equal(deep.search.clearHash,true);
 scores[deep.index]=score(p,deep.index,15);const moved=plan.next(1,scores);assert.equal(moved.index,0);assert.equal(moved.search.depth,19);assert.notEqual(moved.search.clearHash,true);plan.retry(moved);assert.equal(plan.next(1,scores).index,0);
});

test('cached progress skips preview/deep work, while legacy and shallow evidence cannot finish Deep',()=>{
 const p=parseGame('1. e4 e5 *'),scores=p.fens.map((_,i)=>score(p,i));assert.equal(createReviewPlan(p,'precise').next(0,scores),null);
 scores[1]={...scores[1],depth:12};const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},cache=createReviewCache(storage);cache.save(p.pgn,'precise',scores);const restored=createReviewCache(storage).load(p.pgn,'precise',3),plan=createReviewPlan(p,'precise');
 assert.equal(evaluationReady(restored[1],'precise'),false);const pending=plan.next(1,restored);assert.equal(pending.phase,'deepen');assert.equal(pending.index,1);restored[1]=score(p,1);assert.equal(plan.next(1,restored),null);
 restored[1].legacy=true;assert.equal(evaluationReady(restored[1],'precise'),false);assert.equal(createReviewPlan(p,'precise').next(1,restored).phase,'preview');
});

test('timed-out positions remain provisional and resumable; Quick and Standard retain their own quality',()=>{
 const p=parseGame('1. e4 *'),scores=[score(p,0,18),score(p,1)],plan=createReviewPlan(p,'precise'),task=plan.next(1,scores);assert.equal(task.index,0);assert.equal(plan.next(1,scores),null);
 scores[0].searchTime=task.search.milliseconds;
 assert.equal(createReviewPlan(p,'precise').next(1,scores).search.milliseconds,4500);
 const retry=createReviewPlan(p,'precise',{extend:true}).next(1,scores);assert.equal(retry.search.milliseconds,9000);
 assert.equal(createReviewPlan(p,'deep').next(1,scores),null);scores[0].depth=12;assert.equal(createReviewPlan(p,'deep').next(1,scores).search.depth,16);
 assert.equal(createReviewPlan(p,'quick').next(0,[]).search,140);assert.equal(createReviewPlan(p,'quick').next(0,scores),null);
 const complete={...scores[0],alternative:{cp:-80,depth:12}};assert.equal(strongerScore(complete,{...scores[0],alternative:null}),complete);assert.equal(terminalEvaluation(new Chess('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1').fen()).terminal,true);
});

test('real Stockfish single-PV searches can be interrupted and resumed without reloading the worker', {timeout:20000},async()=>{
 const original=globalThis.Worker,commands=[];
 class Worker{constructor(){this.thread=new ThreadWorker(new URL('./engine-worker.cjs',import.meta.url));this.thread.on('message',line=>this.onmessage?.({data:line.trim()}));this.thread.on('error',error=>this.onerror?.(error));}postMessage(v){commands.push(v);this.thread.postMessage(v);}terminate(){this.thread.terminate();}}
 globalThis.Worker=Worker;const engine=new Engine();try{
  await engine.init();const worker=engine.worker,fen=new Chess().fen(),pending=engine.evaluate(fen,{depth:30,milliseconds:20000,multiPV:1});while(!commands.some(c=>c.startsWith('go ')))await new Promise(r=>setTimeout(r,1));assert.equal(engine.interrupt(),true);const stopped=await pending;assert.equal(stopped.interrupted,true);assert.equal(stopped.best,stopped.pv[0]);assert.equal(engine.worker,worker);assert.equal(engine.interrupt(),false);
  const mate=parseGame('1. f3 e5 2. g4 *').fens.at(-1),deep=await engine.evaluate(mate,{depth:19,milliseconds:10000,multiPV:1});assert.ok(deep.depth>=19);assert.equal(deep.best,'d8h4');assert.equal(engine.worker,worker);assert.ok(commands.includes('setoption name MultiPV value 1'));
  const comparison=await engine.evaluate(fen,{depth:8,milliseconds:5000,multiPV:2});assert.equal(comparison.alternative.depth,comparison.depth);assert.ok(commands.includes('setoption name MultiPV value 2'));await assert.rejects(engine.evaluate(fen,{milliseconds:100,multiPV:0}),/Invalid/);
 }finally{engine.destroy();globalThis.Worker=original;}
});

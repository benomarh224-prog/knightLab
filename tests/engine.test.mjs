import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker as ThreadWorker } from 'node:worker_threads';
import { Engine } from '../src/engine.js';
import { parseGame, DEMO_PGN } from '../src/game.js';
import { Chess } from 'chess.js';
import { playSearch } from '../src/play-settings.js';

class NodeWorker {
  constructor() {
    this.thread = new ThreadWorker(new URL('./engine-worker.cjs', import.meta.url));
    this.thread.on('message', line => this.onmessage?.({data:line.trim()}));
    this.thread.on('error', error => this.onerror?.(error));
  }
  postMessage(command) { this.thread.postMessage(command); }
  terminate() { this.thread.terminate(); }
}

test('real Stockfish accepts reduced and full skill settings, and both return legal replies', {timeout:20000}, async()=>{
 const original=globalThis.Worker,commands=[];
 class ObservedWorker extends NodeWorker {postMessage(command){commands.push(command);super.postMessage(command);}}
 globalThis.Worker=ObservedWorker;const engine=new Engine(),fen=new Chess().fen();
 try{
  for(const level of ['beginner','casual','strong']){
   const options=playSearch(level),result=await engine.evaluate(fen,{...options,clearHash:true});
   assert.ok(commands.includes(`setoption name Skill Level value ${options.skill}`));assert.ok(commands.includes(`go depth ${options.depth} movetime ${options.milliseconds}`));
   assert.doesNotThrow(()=>new Chess(fen).move({from:result.best.slice(0,2),to:result.best.slice(2,4),promotion:result.best[4]}));
  }
  await assert.rejects(engine.evaluate(fen,{milliseconds:100,skill:21}),/Invalid/);
 }finally{engine.destroy();globalThis.Worker=original;}
});
test('real Stockfish handshake, forced mate, terminal state, and cancellation', {timeout:20000}, async () => {
  const original = globalThis.Worker;
  globalThis.Worker = NodeWorker;
  const engine = new Engine();
  try {
    const beforeMate = parseGame('1. f3 e5 2. g4 *').fens.at(-1);
    const result = await engine.evaluate(beforeMate,140);
    assert.equal(result.best,'d8h4');
    assert.equal(result.cp,-10000);
    assert.equal(result.mate,-1);
    const terminal = await engine.evaluate(parseGame(DEMO_PGN).fens.at(-1),140);
    assert.equal(terminal.terminal,true);
    assert.equal(terminal.cp,10000);
    const precise = await engine.evaluate(beforeMate,{depth:18,milliseconds:10000,clearHash:true});
    assert.equal(precise.best,'d8h4');
    assert.ok(precise.depth >= 18);
    assert.equal(precise.searchTime,10000);
    await assert.rejects(engine.evaluate(beforeMate,{depth:NaN,milliseconds:100}),/Invalid/);
    const repeated = parseGame('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 1/2-1/2');
    const history = { startFen: repeated.fens[0], moves: repeated.moves.map(move=>move.from+move.to+(move.promotion||'')) };
    const draw = await engine.evaluate(repeated.fens.at(-1),{depth:18,milliseconds:10000},history);
    assert.equal(draw.terminal,true); assert.equal(draw.cp,0);
    await assert.rejects(engine.evaluate(beforeMate,140,history),/does not match/);
    const mating = parseGame('1. f3 e5 2. g4 *');
    const contextual = await engine.evaluate(beforeMate,{depth:18,milliseconds:10000,clearHash:true}, {startFen:mating.fens[0],moves:mating.moves.map(move=>move.from+move.to)});
    assert.equal(contextual.best,'d8h4'); assert.ok(contextual.depth>=18);
    const pending = engine.evaluate(parseGame(DEMO_PGN).fens[0],650);
    await new Promise(resolve => setTimeout(resolve,30));
    engine.destroy();
    await assert.rejects(pending,/paused/);
  } finally { engine.destroy(); globalThis.Worker = original; }
});

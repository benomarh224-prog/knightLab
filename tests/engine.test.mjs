import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker as ThreadWorker } from 'node:worker_threads';
import { Engine } from '../src/engine.js';
import { parseGame, DEMO_PGN } from '../src/game.js';

class NodeWorker {
  constructor() {
    this.thread = new ThreadWorker(new URL('./engine-worker.cjs', import.meta.url));
    this.thread.on('message', line => this.onmessage?.({data:line.trim()}));
    this.thread.on('error', error => this.onerror?.(error));
  }
  postMessage(command) { this.thread.postMessage(command); }
  terminate() { this.thread.terminate(); }
}
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
    const pending = engine.evaluate(parseGame(DEMO_PGN).fens[0],650);
    await new Promise(resolve => setTimeout(resolve,30));
    engine.destroy();
    await assert.rejects(pending,/paused/);
  } finally { engine.destroy(); globalThis.Worker = original; }
});

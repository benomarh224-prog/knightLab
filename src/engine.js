import { scoreFromInfo, terminalEvaluation } from './game.js';

export class Engine {
  constructor() { this.worker = null; this.pending = null; this.initializing = null; }
  init() {
    if (this.initializing) return this.initializing;
    this.initializing = new Promise((resolve, reject) => {
      this.worker = new Worker('./engine/stockfish-19-lite-single.js');
      const timeout = setTimeout(() => fail(new Error('The engine took too long to load. Try reviewing the game again.')), 30000);
      this.cancelInitialization = error => { clearTimeout(timeout); reject(error); };
      const fail = error => { clearTimeout(timeout); this.destroy(error); reject(error); };
      this.worker.onerror = () => fail(new Error('Stockfish could not load. Please try a modern browser and reload this page.'));
      this.worker.onmessage = ({ data }) => {
        for (const line of String(data).split('\n')) {
          if (line === 'uciok') {
            this.worker.postMessage('setoption name Hash value 32');
            this.worker.postMessage('setoption name MultiPV value 2');
            this.worker.postMessage('isready');
          }
          if (line === 'readyok') { clearTimeout(timeout); this.cancelInitialization = null; resolve(); }
          if (this.pending) this.pending(line);
        }
      };
      this.worker.postMessage('uci');
    });
    return this.initializing;
  }
  async evaluate(fen, milliseconds) {
    const terminal = terminalEvaluation(fen);
    if (terminal) return terminal;
    await this.init();
    if (this.pending) throw new Error('The engine is already evaluating a position.');
    return new Promise((resolve, reject) => {
      let info = null;
      let alternative = null;
      const timeout = setTimeout(() => { this.destroy(new Error('Engine analysis timed out. Please try again.')); }, Math.max(15000, milliseconds * 4));
      this.rejectPending = error => { clearTimeout(timeout); reject(error); };
      this.pending = line => {
        if (line.startsWith('info ')) {
          const score = scoreFromInfo(line, fen.split(' ')[1]);
          if (score?.multipv === 1) info = score;
          if (score?.multipv === 2) alternative = score;
        }
        if (line.startsWith('bestmove ')) {
          clearTimeout(timeout); this.pending = null; this.rejectPending = null;
          if (!info) { reject(new Error('The engine did not return a score for this position.')); return; }
          resolve({ ...info, best: line.split(' ')[1], alternative: alternative?.depth === info.depth ? alternative : null });
        }
      };
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go movetime ${milliseconds}`);
    });
  }
  destroy(error = new Error('Analysis paused.')) { this.cancelInitialization?.(error); this.cancelInitialization = null; this.rejectPending?.(error); this.rejectPending = null; this.worker?.terminate(); this.worker = null; this.pending = null; this.initializing = null; }
}

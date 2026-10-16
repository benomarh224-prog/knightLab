import { Variation } from './variation.js';

export class PlaySession extends Variation {
  constructor(fen, { mode = 'free', color = 'w' } = {}) {
    super(fen); this.configure(mode, color);
  }
  configure(mode, color) {
    if (!['free', 'engine'].includes(mode) || !['w', 'b'].includes(color)) throw new Error('Invalid play settings.');
    this.mode = mode; this.color = color; this.revision++;
  }
  get engineTurn() { return this.mode === 'engine' && !this.ending && this.chess.turn() !== this.color; }
  get canUndo() { return this.mode === 'free' ? this.moves.length > 0 : this.moves.some(move => move.color === this.color); }
  play(from, to, promotion) {
    if (this.ending) return { status: 'finished' };
    if (this.engineTurn) return { status: 'locked' };
    return super.play(from, to, promotion);
  }
  engineMove(uci, snapshot) {
    if (!this.matches(snapshot) || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci || '')) return { status: 'stale' };
    if (this.ending) return { status: 'finished' };
    return super.play(uci.slice(0,2), uci.slice(2,4), uci[4]);
  }
  undoTurn() {
    if (!this.canUndo) return [];
    const undone = [];
    do { const move = super.undo(); if (!move) break; undone.push(move); }
    while (this.mode === 'engine' && this.moves.length && this.chess.turn() !== this.color);
    return undone;
  }
  exportPgn() {
    const result = this.chess.isCheckmate() ? this.chess.turn() === 'w' ? '0-1' : '1-0' : this.ending ? '1/2-1/2' : '*';
    this.chess.header('Event', 'ROQVYN Play & Explore', 'White', this.mode === 'engine' && this.color === 'b' ? 'Stockfish' : 'White', 'Black', this.mode === 'engine' && this.color === 'w' ? 'Stockfish' : 'Black', 'Result', result);
    return this.chess.pgn();
  }
}

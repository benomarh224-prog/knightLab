import { Variation } from './variation.js';

export function playMoveRows(moves) {
  const rows = [];
  for (const move of moves) {
    const number = Number(move.before.split(' ')[5]);
    if (rows.at(-1)?.number !== number) rows.push({ number, white: '', black: '' });
    rows.at(-1)[move.color === 'w' ? 'white' : 'black'] = move.san;
  }
  return rows;
}

export class PlaySession extends Variation {
  constructor(fen, { mode = 'free', color = 'w' } = {}) {
    super(fen); this.resignedColor = null; this.configure(mode, color);
  }
  configure(mode, color) {
    if (!['free', 'engine'].includes(mode) || !['w', 'b'].includes(color)) throw new Error('Invalid play settings.');
    this.mode = mode; this.color = color; this.revision++;
  }
  get engineTurn() { return this.mode === 'engine' && !this.ending && this.chess.turn() !== this.color; }
  get ending() { return this.resignedColor ? 'Resignation' : super.ending; }
  get result() {
    if (this.resignedColor || this.chess.isCheckmate()) return (this.resignedColor || this.chess.turn()) === 'w' ? '0-1' : '1-0';
    return this.ending ? '1/2-1/2' : '*';
  }
  get canUndo() { return !this.resignedColor && (this.mode === 'free' ? this.moves.length > 0 : this.moves.some(move => move.color === this.color)); }
  resign() {
    if (this.mode !== 'engine' || this.ending || !this.canUndo) return false;
    this.resignedColor = this.color;
    this.revision++;
    return true;
  }
  reset() { super.reset(); this.resignedColor = null; }
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
    this.chess.header('Event', 'ROQVYN Play & Explore', 'White', this.mode === 'engine' && this.color === 'b' ? 'Stockfish' : 'White', 'Black', this.mode === 'engine' && this.color === 'w' ? 'Stockfish' : 'Black', 'Result', this.result);
    return this.chess.pgn();
  }
}

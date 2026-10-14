import { Chess } from 'chess.js';

export class Variation {
  constructor(fen) { this.startFen = fen; this.chess = new Chess(fen); this.revision = 0; }
  get fen() { return this.chess.fen(); }
  get moves() { return this.chess.history({ verbose: true }); }
  legal(square) { return this.chess.moves({ square, verbose: true }); }
  play(from, to, promotion) {
    const choices = this.legal(from).filter(move => move.to === to);
    if (!choices.length) return { status: 'illegal' };
    if (choices.some(move => move.promotion) && !promotion) return { status: 'promotion' };
    try {
      const move = this.chess.move({ from, to, promotion });
      this.revision++; return { status: 'played', move };
    } catch { return { status: 'illegal' }; }
  }
  snapshot() { return { fen: this.fen, revision: this.revision }; }
  matches(snapshot) { return snapshot.fen === this.fen && snapshot.revision === this.revision; }
  engineMove(uci, snapshot) {
    if (!this.matches(snapshot) || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci || '')) return { status: 'stale' };
    return this.play(uci.slice(0, 2), uci.slice(2, 4), uci[4]);
  }
  undo() { const move = this.chess.undo(); if (move) this.revision++; return move; }
  reset() { this.chess = new Chess(this.startFen); this.revision++; }
  get ending() {
    if (this.chess.isCheckmate()) return 'Checkmate';
    if (this.chess.isStalemate()) return 'Stalemate';
    if (this.chess.isDraw()) return 'Draw';
    return null;
  }
}

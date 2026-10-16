import { Chess } from 'chess.js';
const uci = move => move.from + move.to + (move.promotion || '');

export class AnalysisLine {
  constructor(fen, score = null, history = {startFen:fen,moves:[]}) {
    this.rootFen = fen; this.origin = {startFen:history.startFen,moves:[...history.moves]};
    this.entries = []; this.scores = [score]; this.cursor = 0; this.revision = 0;
    this.rebuild();
    if (this.fen !== fen) throw new Error('The exploration history does not match this position.');
  }
  rebuild() {
    this.chess = new Chess(this.origin.startFen);
    for (const move of [...this.origin.moves,...this.entries.slice(0,this.cursor).map(uci)]) {
      this.chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
    }
  }
  get fen() { return this.chess.fen(); }
  get last() { return this.entries[this.cursor-1] || null; }
  get score() { return this.scores[this.cursor] || null; }
  // Draw claims end a game, but do not remove legal moves from an analysis board.
  legal(square) { return this.chess.moves({square,verbose:true}); }
  play(from,to,promotion) {
    const choices = this.legal(from).filter(move=>move.to===to);
    if (!choices.length) return {status:'illegal'};
    if (choices.some(move=>move.promotion) && !promotion) return {status:'promotion'};
    try {
      const move=this.chess.move({from,to,promotion});
      this.entries=this.entries.slice(0,this.cursor); this.entries.push(move);
      this.scores=this.scores.slice(0,this.cursor+1); this.scores.push(null);
      this.cursor++; this.revision++; return {status:'played',move};
    } catch { return {status:'illegal'}; }
  }
  jump(cursor) {
    const next=Math.max(0,Math.min(this.entries.length,cursor));
    if (next===this.cursor) return;
    this.cursor=next; this.revision++; this.rebuild();
  }
  reset() { this.entries=[]; this.scores=[this.scores[0]]; this.cursor=0; this.revision++; this.rebuild(); }
  snapshot() { return {fen:this.fen,revision:this.revision,cursor:this.cursor}; }
  matches(snapshot) { return snapshot.fen===this.fen && snapshot.revision===this.revision && snapshot.cursor===this.cursor; }
  history(index=this.cursor) { return {startFen:this.origin.startFen,moves:[...this.origin.moves,...this.entries.slice(0,index).map(uci)]}; }
  fenAt(index) { return index===0 ? this.rootFen : this.entries[index-1].after; }
}

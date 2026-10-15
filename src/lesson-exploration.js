import { Variation } from './variation.js';

// A separate legal game tree: exploration never writes to the exercise session.
export class LessonExploration extends Variation {
  constructor(session,anchorCursor=session.cursor){
    super(session.lesson.fen);this.lesson=session.lesson;
    this.anchorCursor=anchorCursor;this.mode='explore';this.completed=false;
    this.reset();
  }
  get anchorFen(){return this.lesson.positions[this.anchorCursor];}
  get cursor(){return this.moves.length;}
  get last(){return this.moves.at(-1)||null;}
  get canUndo(){return this.moves.length>0;}
  // Study analysis can continue through repetition/insufficient material; only
  // positions without a legal move stop interaction (until Undo).
  get ending(){return this.chess.isCheckmate()?'Checkmate':this.chess.isStalemate()?'Stalemate':null;}
  get note(){return 'Free exploration. You control both sides. Your original study position is saved.';}
  reset(){
    super.reset();
    for(const move of this.lesson.verboseMoves.slice(0,this.anchorCursor))super.play(move.from,move.to,move.promotion);
  }
  play(from,to,promotion){return this.ending?{status:'finished',ending:this.ending}:super.play(from,to,promotion);}
  pgn(){this.chess.header('Event','Knightlab · Lesson exploration');return this.chess.pgn();}
  snapshotMoves(){return {anchorCursor:this.anchorCursor,moves:this.moves.map(move=>move.from+move.to+(move.promotion||''))};}
  static restore(session,saved){
    if(!saved||!Number.isInteger(saved.anchorCursor)||saved.anchorCursor<0||saved.anchorCursor>=session.lesson.positions.length||!Array.isArray(saved.moves)||saved.moves.length>1000)return null;
    const exploration=new LessonExploration(session,saved.anchorCursor);
    // Rebuild from legal moves, never trust a stored board position.
    Variation.prototype.reset.call(exploration);
    for(const move of saved.moves){
      if(typeof move!=='string'||!/^([a-h][1-8]){2}[qrbn]?$/.test(move)||exploration.play(move.slice(0,2),move.slice(2,4),move[4]).status!=='played')return null;
    }
    return exploration;
  }
}

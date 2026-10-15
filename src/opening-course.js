import { Chess } from 'chess.js';

export function prepareLesson(lesson){
  const chess=new Chess(),positions=[chess.fen()],moves=[];
  for(const san of lesson.moves){moves.push(chess.move(san));positions.push(chess.fen());}
  if(lesson.notes.length!==moves.length)throw new Error(`Every move needs an explanation: ${lesson.id}`);
  return {...lesson,positions,verboseMoves:moves};
}
export class OpeningLesson {
  constructor(lesson){this.lesson=prepareLesson(lesson);this.cursor=0;this.mode='watch';this.correct=0;this.hints=0;this.completed=false;}
  get fen(){return this.lesson.positions[this.cursor];}
  get expected(){return this.lesson.verboseMoves[this.cursor]||null;}
  get last(){return this.lesson.verboseMoves[this.cursor-1]||null;}
  get note(){return this.cursor?this.lesson.notes[this.cursor-1]:this.lesson.subtitle;}
  jump(cursor){if(this.mode==='practice')return;this.cursor=Math.max(0,Math.min(this.lesson.moves.length,cursor));}
  watch(){this.mode='watch';this.cursor=0;this.completed=false;}
  practice(){this.mode='practice';this.cursor=0;this.correct=0;this.hints=0;this.completed=false;this.skipOpponent();}
  skipOpponent(){while(this.expected&&this.expected.color!==this.lesson.practiceColor)this.cursor++;if(!this.expected)this.completed=true;}
  hint(){this.hints++;return this.expected;}
  attempt(from,to,promotion){
    if(this.mode!=='practice'||!this.expected)return {status:'inactive'};
    const chess=new Chess(this.fen);let move;
    try {move=chess.move({from,to,promotion});}catch{return {status:'illegal'};}
    const expected=this.expected;
    if(move.from!==expected.from||move.to!==expected.to||(move.promotion||'')!==(expected.promotion||''))return {status:'different',san:move.san};
    this.cursor++;this.correct++;this.skipOpponent();
    return {status:'correct',move,completed:this.completed};
  }
  pgn(){const chess=new Chess();for(const san of this.lesson.moves.slice(0,this.cursor))chess.move(san);chess.header('Event','Knightlab · French Defense lesson','White','Study position','Black','French Defense');return chess.pgn();}
}
export function createCourseProgress(storage,ids){
  const key='knightlab-french-course-v1';
  function read(){try {const data=JSON.parse(storage?.getItem(key)||'[]');return Array.isArray(data)?[...new Set(data.filter(id=>ids.includes(id)))]:[];}catch{return [];}}
  return {read,complete(id){if(!ids.includes(id))return;try{storage?.setItem(key,JSON.stringify([...new Set([...read(),id])]))}catch{}}};
}

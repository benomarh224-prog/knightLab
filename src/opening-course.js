import { Chess } from 'chess.js';

export function prepareLesson(lesson){
  const chess=new Chess(lesson.fen),positions=[chess.fen()],moves=[];
  for(const san of lesson.moves){moves.push(chess.move(san));positions.push(chess.fen());}
  const notes=typeof lesson.notes==='function'?lesson.notes(moves):lesson.notes;
  if(notes.length!==moves.length)throw new Error(`Every move needs an explanation: ${lesson.id}`);
  return {...lesson,notes,positions,verboseMoves:moves};
}
export class OpeningLesson {
  constructor(lesson){this.lesson=prepareLesson(lesson);this.cursor=0;this.mode='watch';this.correct=0;this.hints=0;this.completed=false;}
  get fen(){return this.lesson.positions[this.cursor];}
  get expected(){return this.lesson.verboseMoves[this.cursor]||null;}
  get last(){return this.lesson.verboseMoves[this.cursor-1]||null;}
  get note(){return this.cursor?this.lesson.notes[this.cursor-1]:this.lesson.subtitle;}
  jump(cursor){if(this.mode==='practice')return;this.cursor=Math.max(0,Math.min(this.lesson.moves.length,cursor));}
  watch(){this.mode='watch';this.cursor=0;this.completed=false;}
  practice({startPly=0}={}){this.mode='practice';this.cursor=Math.max(0,Math.min(this.lesson.moves.length-1,Number.isFinite(startPly)?Math.floor(startPly):0));this.correct=0;this.hints=0;this.completed=false;this.skipOpponent();this.practiceStart=this.cursor;}
  skipOpponent(){while(this.expected&&this.expected.color!==this.lesson.practiceColor)this.cursor++;if(!this.expected)this.completed=true;}
  hint(){this.hints++;return this.expected;}
  get canUndo(){return this.mode==='practice'&&this.correct>0;}
  undo(){
    if(!this.canUndo)return false;
    let cursor=this.cursor-1;
    while(cursor>this.practiceStart&&this.lesson.verboseMoves[cursor].color!==this.lesson.practiceColor)cursor--;
    this.cursor=cursor;this.correct--;this.completed=false;return true;
  }
  attempt(from,to,promotion){
    if(this.mode!=='practice'||!this.expected)return {status:'inactive'};
    const chess=new Chess(this.fen);let move;
    try {move=chess.move({from,to,promotion});}catch{return {status:'illegal'};}
    const expected=this.expected;
    if(move.from!==expected.from||move.to!==expected.to||(move.promotion||'')!==(expected.promotion||''))return {status:'different',san:move.san};
    this.cursor++;this.correct++;this.skipOpponent();
    return {status:'correct',move,completed:this.completed};
  }
  pgn(){const chess=new Chess(this.lesson.fen);for(const san of this.lesson.moves.slice(0,this.cursor))chess.move(san);chess.header('Event',`Knightlab · ${this.lesson.course||'French Defense'} lesson`,'White','Study position','Black',this.lesson.course||'French Defense');return chess.pgn();}
}
const progressFallbacks=new WeakMap(),noStorageFallback=new Map();
export function createCourseProgress(storage,ids,key='knightlab-french-course-v1'){
  let fallback=noStorageFallback;
  if(storage&&(typeof storage==='object'||typeof storage==='function')){
    if(!progressFallbacks.has(storage))progressFallbacks.set(storage,new Map());
    fallback=progressFallbacks.get(storage);
  }
  if(!fallback.has(key))fallback.set(key,new Set());
  const local=fallback.get(key);
  function read(){let saved=[];try {const data=JSON.parse(storage?.getItem(key)||'[]');if(Array.isArray(data))saved=data.filter(id=>ids.includes(id));}catch{}return [...new Set([...saved,...local].filter(id=>ids.includes(id)))];}
  return {read,complete(id){if(!ids.includes(id))return;const completed=[...new Set([...read(),id])];try{if(!storage?.setItem)throw Error('Storage unavailable');storage.setItem(key,JSON.stringify(completed));}catch{local.add(id);}}};
}

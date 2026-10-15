import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess,validateFen} from 'chess.js';
import {TACTICAL_LESSONS,TACTICAL_LEVELS} from '../src/tactical-lessons.js';
import {OpeningLesson,createCourseProgress} from '../src/opening-course.js';
import {COURSES,courseLessons} from '../src/courses.js';
import {parseGame} from '../src/game.js';

test('the workbook course has 144 unique diagram positions in three complete levels',()=>{
  assert.equal(TACTICAL_LESSONS.length,144);assert.equal(new Set(TACTICAL_LESSONS.map(lesson=>lesson.id)).size,144);
  for(const level of TACTICAL_LEVELS){
    const lessons=courseLessons(COURSES.tactics,level);assert.equal(lessons.length,48);
    assert.deepEqual(lessons.map(lesson=>lesson.number),Array.from({length:48},(_,i)=>i+1));
  }
});
test('all 144 source diagrams and selected solutions are legal and have grounded move explanations',()=>{
  for(const lesson of TACTICAL_LESSONS){
    assert.equal(validateFen(lesson.fen).ok,true,lesson.id);
    const session=new OpeningLesson(lesson),chess=new Chess(lesson.fen);
    assert.equal(chess.turn(),lesson.practiceColor,lesson.id);
    for(const san of lesson.moves)chess.move(san,{strict:true});
    assert.equal(session.lesson.positions.at(-1),chess.fen(),lesson.id);
    assert.equal(session.lesson.notes.length,lesson.moves.length);
    assert.ok(session.lesson.notes.every(note=>typeof note==='string'&&note.length>30));
    assert.ok(lesson.source.includes('PDF diagram page'));
  }
});
test('every workbook exercise can be completed from its diagram for either color without changing the source position',()=>{
  const sides=new Set();
  for(const lesson of TACTICAL_LESSONS){
    const session=new OpeningLesson(lesson);session.practice();sides.add(lesson.practiceColor);
    assert.equal(session.cursor,0);let solved=0;
    while(!session.completed){
      const move=session.expected;assert.equal(move.color,lesson.practiceColor);
      const result=session.attempt(move.from,move.to,move.promotion);assert.equal(result.status,'correct',lesson.id);solved++;
    }
    assert.equal(session.correct,solved);assert.equal(lesson.fen,session.lesson.positions[0]);
    assert.equal(session.attempt('a1','a2').status,'inactive');
    session.practice();assert.equal(session.fen,lesson.fen);assert.equal(session.correct,0);
  }
  assert.deepEqual([...sides].sort(),['b','w']);
});
test('promotion requires a choice and a different underpromotion preserves the workbook exercise',()=>{
  const lesson=TACTICAL_LESSONS.find(lesson=>{const session=new OpeningLesson(lesson);return session.lesson.verboseMoves.some(move=>move.color===lesson.practiceColor&&move.promotion);});
  assert.ok(lesson);const session=new OpeningLesson(lesson);session.practice();
  while(!session.expected.promotion){const move=session.expected;session.attempt(move.from,move.to,move.promotion);}
  const move=session.expected,before=session.fen;
  assert.equal(session.attempt(move.from,move.to).status,'illegal');assert.equal(session.fen,before);
  const alternate=move.promotion==='n'?'r':'n';
  assert.equal(session.attempt(move.from,move.to,alternate).status,'different');assert.equal(session.fen,before);
  assert.equal(session.attempt(move.from,move.to,move.promotion).status,'correct');
});
test('diagram PGN exports preserve side, move number and custom FEN before and after solving',()=>{
  for(const id of ['beginner-05','intermediate-01','advanced-15']){
    const lesson=TACTICAL_LESSONS.find(lesson=>lesson.id===id),session=new OpeningLesson(lesson);
    for(const cursor of [0,lesson.moves.length]){
      session.jump(cursor);const replay=new Chess();replay.loadPgn(session.pgn());
      assert.equal(replay.fen(),session.fen);assert.equal(replay.getHeaders().SetUp,'1');assert.equal(replay.getHeaders().FEN,lesson.fen);
      assert.match(replay.getHeaders().Event,/Tactical Vision/);
      if(cursor)assert.equal(parseGame(session.pgn()).fens.at(-1),session.fen);
    }
  }
});
test('tactical progress and French progress remain independent and survive new course instances',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const french=createCourseProgress(storage,COURSES.french.lessons.map(lesson=>lesson.id),COURSES.french.key);
  const tactics=createCourseProgress(storage,TACTICAL_LESSONS.map(lesson=>lesson.id),COURSES.tactics.key);
  tactics.complete('beginner-01');tactics.complete('advanced-48');french.complete('foundations');
  assert.deepEqual(french.read(),['foundations']);assert.deepEqual(tactics.read(),['beginner-01','advanced-48']);
  assert.deepEqual(createCourseProgress(storage,TACTICAL_LESSONS.map(lesson=>lesson.id),COURSES.tactics.key).read(),tactics.read());
});

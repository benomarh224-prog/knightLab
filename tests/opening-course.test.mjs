import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { FRENCH_LESSONS } from '../src/french-lessons.js';
import { OpeningLesson, prepareLesson, createCourseProgress } from '../src/opening-course.js';
import { PAGE_PATHS, pageFromPath } from '../src/routes.js';

test('every French lesson has a legal line, an explanation for each move and the French starting position',()=>{
  assert.equal(FRENCH_LESSONS.length,8);
  assert.equal(new Set(FRENCH_LESSONS.map(lesson=>lesson.id)).size,8);
  for(const lesson of FRENCH_LESSONS){
    const prepared=prepareLesson(lesson);
    assert.deepEqual(lesson.moves.slice(0,4),['e4','e6','d4','d5']);
    assert.equal(prepared.positions.length,lesson.moves.length+1);
    assert.ok(lesson.notes.every(note=>note.length>20));
    assert.ok(lesson.source&&lesson.takeaway);
  }
});
test('every lesson can be practiced to completion with White replies applied automatically',()=>{
  for(const lesson of FRENCH_LESSONS){
    const session=new OpeningLesson(lesson);session.practice();
    assert.equal(session.cursor,1);
    while(!session.completed){
      const expected=session.expected;
      assert.equal(new Chess(session.fen).turn(),'b');
      assert.equal(session.attempt(expected.from,expected.to,expected.promotion).status,'correct');
    }
    assert.equal(session.correct,session.lesson.verboseMoves.filter(move=>move.color==='b').length);
    assert.equal(session.cursor,lesson.moves.length);
    assert.equal(session.attempt('a7','a6').status,'inactive');
  }
});
test('a different legal move is described conservatively and never changes the exercise position',()=>{
  const session=new OpeningLesson(FRENCH_LESSONS[0]);session.practice();
  const before=session.fen;
  assert.deepEqual(session.attempt('c7','c5'),{status:'different',san:'c5'});
  assert.equal(session.fen,before);
  assert.equal(session.correct,0);
  assert.equal(session.attempt('e7','e4').status,'illegal');
  assert.equal(session.fen,before);
});
test('hints are tracked without marking a lesson complete or moving a piece',()=>{
  const session=new OpeningLesson(FRENCH_LESSONS[0]);session.practice();
  assert.equal(session.hint().san,'e6');
  assert.equal(session.hints,1);assert.equal(session.cursor,1);assert.equal(session.completed,false);
});
test('watch navigation stays in range and cannot reveal future positions during practice',()=>{
  const session=new OpeningLesson(FRENCH_LESSONS[0]);
  session.jump(999);assert.equal(session.cursor,4);
  session.jump(-1);assert.equal(session.cursor,0);
  session.practice();session.jump(4);assert.equal(session.cursor,1);
  session.watch();assert.equal(session.cursor,0);assert.equal(session.mode,'watch');
});
test('exported study PGN contains only the visited line and can be imported into analysis',()=>{
  const session=new OpeningLesson(FRENCH_LESSONS.at(-1));session.jump(10);
  const exported=new Chess();exported.loadPgn(session.pgn());
  assert.equal(exported.fen(),session.fen);
  assert.deepEqual(exported.history(),session.lesson.moves.slice(0,10));
  assert.match(exported.getHeaders().Event,/French Defense/);
});
test('practice progress persists unique known lessons and ignores corrupted storage',()=>{
  const values=new Map();const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const progress=createCourseProgress(storage,['foundations','advance']);
  progress.complete('foundations');progress.complete('foundations');progress.complete('unknown');
  assert.deepEqual(progress.read(),['foundations']);
  assert.deepEqual(createCourseProgress(storage,['foundations','advance']).read(),['foundations']);
  storage.setItem('knightlab-french-course-v1','["advance","foreign","advance"]');
  assert.deepEqual(progress.read(),['advance']);
  storage.setItem('knightlab-french-course-v1','broken');assert.deepEqual(progress.read(),[]);
  const unavailable=createCourseProgress({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},['foundations']);
  assert.doesNotThrow(()=>unavailable.complete('foundations'));assert.deepEqual(unavailable.read(),[]);
});
test('public page paths normalize trailing slashes and retain independent destinations',()=>{
  for(const [page,path] of Object.entries(PAGE_PATHS)){
    assert.equal(pageFromPath(path),page);
    assert.equal(pageFromPath(path.replace(/\/$/,'')),page);
    assert.equal(pageFromPath(path+'?lesson=advance'),page);
  }
  assert.equal(pageFromPath('/unknown/'),'home');
});

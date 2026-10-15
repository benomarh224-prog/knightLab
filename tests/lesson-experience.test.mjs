import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { COURSES } from '../src/courses.js';
import { LessonPlayer } from '../src/lesson-player.js';
import { OpeningLesson } from '../src/opening-course.js';
import { illegalMoveReason } from '../src/lesson-move-help.js';
import { createLessonMotion,lessonFrames } from '../src/lesson-motion.js';
import { coursePractice } from '../src/course-practice.js';

const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const playerFor=(course,lesson,store)=>new LessonPlayer({lesson,study:course.study(lesson.id),storage:store,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id)});
test('every current exercise can undo a solver decision and its reply, restore after reload, and retain earned completion',()=>{
  for(const course of Object.values(COURSES))for(const lesson of course.lessons){
    const store=storage(),player=playerFor(course,lesson,store),start=player.session.fen;
    const move=player.session.expected;assert.ok(move,lesson.id);
    player.attempt(move.from,move.to,move.promotion);
    assert.equal(player.undo(),true,lesson.id);assert.equal(player.session.fen,start);assert.equal(player.session.correct,0);
    assert.equal(player.undo(),false);assert.equal(playerFor(course,lesson,store).session.fen,start);
    while(player.session.expected){const m=player.session.expected;player.attempt(m.from,m.to,m.promotion);}
    if(lesson.quiz)player.answer(lesson.quiz.answer);
    assert.equal(player.complete,true);assert.equal(player.undo(),true);assert.equal(player.complete,true);
    const restored=playerFor(course,lesson,store);assert.equal(restored.session.fen,player.session.fen);assert.equal(restored.complete,true);
  }
});
test('undo an independent attempt keeps the original saved session and prevents an assisted solve clearing its review',()=>{
  const course=COURSES.french,lesson=course.lessons[0],store=storage(),player=playerFor(course,lesson,store);
  const start=player.session.fen;player.startChallenge();const move=player.session.expected;player.attempt(move.from,move.to,move.promotion);
  player.undo();assert.equal(player.activity.challengeHelped,true);player.endChallenge();assert.equal(player.session.fen,start);
});
test('illegal move help distinguishes geometry, blockers, pawn captures, check, pins, king safety and castling rights',()=>{
  const initial=new Chess().fen();
  assert.match(illegalMoveReason(initial,'b1','b3'),/knight.*L/);
  assert.match(illegalMoveReason(initial,'a1','a4'),/a2.*blocks/);
  assert.match(illegalMoveReason(initial,'e2','f3'),/capture diagonally/);
  assert.match(illegalMoveReason(initial,'e2','e1'),/own piece/);
  assert.match(illegalMoveReason(initial,'e2','e5'),/one square forward/);
  assert.match(illegalMoveReason('4r2k/8/8/8/8/8/8/4KB2 w - - 0 1','f1','g2'),/king is in check/);
  assert.match(illegalMoveReason('4r2k/8/8/8/8/8/4R3/4K3 w - - 0 1','e2','d2'),/expose your king/);
  assert.match(illegalMoveReason('4r2k/8/8/8/8/8/8/3K4 w - - 0 1','d1','e1'),/square is attacked/);
  assert.match(illegalMoveReason('4k3/8/8/8/8/8/8/4K2R w - - 0 1','e1','g1'),/castling rights/);
  assert.match(illegalMoveReason('5r1k/8/8/8/8/8/8/4K2R w K - 0 1','e1','g1'),/through check/);
  assert.equal(illegalMoveReason(initial,'e2','e4'),'That move is legal.');
  assert.equal(illegalMoveReason('7k/4P3/5K2/8/8/8/8/8 w - - 0 1','e7','e8','n'),'That move is legal.');
});
test('playback exposes each validated ply and cancellation prevents stale replies painting after a reset',()=>{
  const session=new OpeningLesson({id:'motion',title:'Motion',moves:['e4','e5','Nf3'],notes:['a','b','c'],practiceColor:'w'});session.practice();
  session.attempt('e2','e4');const frames=lessonFrames(session,0);
  assert.equal(frames.length,2);assert.equal(new Chess(frames[0].fen).turn(),'b');assert.equal(frames[1].fen,session.fen);
  const jobs=[],painted=[];let motion;
  motion=createLessonMotion({paint:()=>painted.push(motion.frame?.cursor??null),schedule:fn=>(jobs.push(fn),jobs.length),unschedule:()=>{}});
  motion.play(frames);assert.deepEqual(painted,[1]);assert.equal(motion.active,true);
  jobs.shift()();assert.deepEqual(painted,[1,2]);motion.cancel();jobs.shift()();assert.deepEqual(painted,[1,2]);assert.equal(motion.active,false);assert.equal(motion.frame,null);
});
test('reduced motion paints the authoritative final position without timers or delayed input',()=>{
  let paints=0;const motion=createLessonMotion({paint:()=>paints++,reduced:()=>true,schedule:()=>{throw Error('No animation timer');}});
  motion.play([{}]);assert.equal(paints,1);assert.equal(motion.active,false);assert.equal(motion.frame,null);
});
test('all courses provide playable optional application positions; future courses inherit the fallback',()=>{
  for(const course of Object.values(COURSES)){
    const practice=coursePractice(course),chess=new Chess(practice.fen);
    assert.equal(chess.isGameOver(),false);assert.equal(chess.turn(),practice.color);assert.ok(practice.goal);assert.equal(practice.moves,4);
  }
  const future={title:'Future course',lessons:[COURSES.beginners.lessons[0]]};assert.ok(coursePractice(future));
  const structured={title:'Future structured course',lessons:[{id:'future',title:'Center',concepts:['Develop'],activities:[{moves:['e4','e5'],practiceColor:'w'}]}]};assert.ok(coursePractice(structured));
  assert.equal(coursePractice({title:'Reading',lessons:[{id:'text',concepts:['Read']}] }),null);
});

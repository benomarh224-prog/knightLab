import test from'node:test';import assert from'node:assert/strict';import{COURSES}from'../src/courses.js';import{LessonPlayer}from'../src/lesson-player.js';import{Chess}from'chess.js';import{lessonCheckmate}from'../src/lesson-checkmate.js';import{createAutoplay}from'../src/autoplay.js';
const storage=()=>{const values=new Map();return{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};};
function player(course,lesson,store=storage()){return new LessonPlayer({lesson,study:course.study(lesson.id),storage:store,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id)});}
test('every current lesson can replay every legal solution ply without changing earned practice or answers',()=>{
 let count=0;for(const course of Object.values(COURSES))for(const lesson of course.lessons){const p=player(course,lesson);p.setStage('try');for(let index=0;index<p.activities.length;index++){
  p.selectActivity(index);while(p.session.expected){const m=p.session.expected;p.attempt(m.from,m.to,m.promotion);}const fen=p.session.fen,correct=p.session.correct,done=p.activity.done;assert.ok(p.startReview());
  const board=new Chess(p.session.lesson.fen);assert.equal(p.session.cursor,0);for(let ply=1;ply<=p.session.lesson.moves.length;ply++){board.move(p.session.lesson.moves[ply-1]);p.jump(ply);assert.equal(p.session.fen,board.fen(),lesson.id+' ply '+ply);assert.equal(lessonCheckmate(p),null);}
  p.jump(0);p.jump(p.session.lesson.moves.length);p.endReview();assert.equal(p.session.fen,fen);assert.equal(p.session.correct,correct);assert.equal(p.activity.done,done);count++;
 }}assert.ok(count>=200);
});
test('reviewing an unsolved line does not complete its practice or quiz; replay cursor resumes separately after reload',()=>{
 const store=storage(),course=COURSES.french,lesson=course.lessons[1],p=player(course,lesson,store);const initial=p.session.fen;p.startReview();p.jump(p.session.lesson.moves.length);assert.equal(p.boardComplete,false);assert.equal(p.complete,false);
 p.jump(2);const restored=player(course,lesson,store);assert.equal(restored.reviewing,true);assert.equal(restored.session.cursor,2);restored.endReview();assert.equal(restored.session.fen,initial);assert.equal(restored.complete,false);
});
test('shared autoplay visits opponent replies as well as solver moves and cancels on manual navigation',()=>{
 const p=player(COURSES.tactics,COURSES.tactics.lessons.find(l=>l.id==='beginner-03'));p.startReview();let queue=[],played=[];
 const autoplay=createAutoplay({read:()=>({source:p.session,cursor:p.session.cursor,total:p.session.lesson.moves.length}),next:()=>{p.jump(p.session.cursor+1);played.push(p.session.last.san);},schedule:fn=>(queue.push(fn),fn),unschedule:fn=>queue=queue.filter(task=>task!==fn)});
 autoplay.start();while(queue.length)queue.shift()();assert.deepEqual(played,p.session.lesson.moves);assert.equal(autoplay.active,false);p.jump(0);played=[];autoplay.start();queue.shift()();autoplay.stop();assert.equal(queue.length,0);assert.equal(played.length,1);
});

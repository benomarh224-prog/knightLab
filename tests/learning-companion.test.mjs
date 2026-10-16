import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from '../src/courses.js';
import { LessonPlayer } from '../src/lesson-player.js';
import { createLearningMemory,learningLink } from '../src/learning-memory.js';
import { progressiveHint } from '../src/lesson-hints.js';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),values};};
function fixture(courseId='opengames',id){
  const store=storage(),memory=createLearningMemory(store,COURSES),course=COURSES[courseId],lesson=course.lessons.find(l=>l.id===id)||course.lessons[0];
  const make=()=>new LessonPlayer({lesson,study:course.study(lesson.id),storage:store,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id),memory,courseId});
  return {store,memory,course,lesson,make,player:make()};
}
function solve(player){while(player.session.expected){const move=player.session.expected;assert.equal(player.attempt(move.from,move.to,move.promotion).status,'correct');}}

test('hint ladder reveals the idea, origin piece, then SAN/destination and promotion only at the final step',()=>{
  const f=fixture(),player=f.player;
  const move=player.session.expected,start=player.session.fen;
  const idea=player.requestHint();assert.equal(idea.level,1);assert.equal(idea.from,undefined);assert.equal(idea.to,undefined);assert.ok(!idea.text.includes(move.san));
  const piece=player.requestHint();assert.equal(piece.level,2);assert.equal(piece.from,move.from);assert.equal(piece.to,undefined);
  const answer=player.requestHint();assert.equal(answer.level,3);assert.equal(answer.to,move.to);assert.ok(answer.text.includes(move.san));
  assert.equal(player.session.hints,3);player.requestHint();assert.equal(player.session.hints,3);assert.equal(player.session.fen,start);
  assert.equal(f.memory.review().length,1);assert.equal(f.make().currentHint.level,3);
  player.attempt(move.from,move.to,move.promotion);assert.equal(player.currentHint,null);assert.equal(player.requestHint().level,1);
  const promotion=fixture('beginners','promote-a-pawn').player.session.expected;
  assert.ok(progressiveHint(promotion,3).text.includes('queen'));assert.equal(progressiveHint(null,1),null);
});

test('all current lessons can produce graduated hints without modifying legal moves or completion requirements',()=>{
  let count=0;
  for(const [courseId,course] of Object.entries(COURSES))for(const lesson of course.lessons){
    const f=fixture(courseId,lesson.id),fen=f.player.session.fen;
    for(let level=1;level<=3;level++)assert.equal(f.player.requestHint().level,level);
    assert.equal(f.player.session.fen,fen);assert.equal(f.player.complete,false);solve(f.player);
    assert.equal(f.player.complete,!lesson.quiz);count++;
  }
  assert.ok(count>=190);
});

test('review memory deduplicates exact exercises, keeps courses/questions independent and restores after reload',()=>{
  const f=fixture('beginners'),entry={courseId:'beginners',lessonId:f.lesson.id,kind:'practice',index:0,reason:'hint'};
  f.memory.add(entry);f.memory.add({...entry,reason:'retry'});f.memory.add({...entry,kind:'question',reason:'question'});
  assert.equal(f.memory.review().length,2);f.memory.remember('beginners',f.lesson.id);
  const restored=createLearningMemory(f.store,COURSES);assert.equal(restored.review().length,2);assert.deepEqual(restored.last(),{courseId:'beginners',lessonId:f.lesson.id});
  restored.resolve(entry);assert.equal(restored.review().length,1);assert.equal(restored.review()[0].kind,'question');
  const link=learningLink(COURSES,restored.review()[0],{review:true});assert.ok(link.href.includes('review=question'));assert.ok(link.href.includes('lesson='+f.lesson.id));
  assert.equal(learningLink(COURSES,{courseId:'missing',lessonId:'bad'}),null);
});

test('legal alternatives are recorded as retry practice without moving the board or claiming an engine mistake',()=>{
  const f=fixture('beginners'),start=f.player.session.fen;
  assert.equal(f.player.attempt('d2','d4').status,'different');assert.equal(f.player.session.fen,start);
  assert.equal(f.player.activity.mistakes,1);assert.equal(f.memory.review()[0].reason,'retry');
  solve(f.player);f.player.answer(f.lesson.quiz.answer);assert.equal(f.player.complete,true);assert.equal(f.memory.review().length,1);
});

test('independent practice survives reload, hides hints, preserves the original cursor and clears review only on a clean attempt',()=>{
  const f=fixture(),p=f.player;p.requestHint();let move=p.session.expected;p.attempt(move.from,move.to,move.promotion);
  const original=p.activity.session.fen;p.startChallenge();assert.equal(p.challengeMode,true);assert.equal(p.requestHint(),null);assert.equal(p.hint(),null);
  move=p.session.expected;p.attempt(move.from,move.to,move.promotion);let restored=f.make();assert.equal(restored.challengeMode,true);assert.equal(restored.session.correct,1);assert.equal(restored.activity.session.fen,original);
  solve(restored);assert.equal(f.memory.review().length,0);restored.endChallenge();assert.equal(restored.session.fen,original);assert.equal(restored.complete,true);
});

test('retrying with wrong moves or reviewing Learn retains the review item until a fresh clean solve',()=>{
  const f=fixture('beginners'),p=f.player;p.requestHint();solve(p);p.answer(f.lesson.quiz.answer);
  p.startChallenge();p.attempt('d2','d4');solve(p);assert.equal(f.memory.review().length,1);assert.equal(p.complete,true);
  p.startChallenge();p.setStage('learn');p.setStage('try');solve(p);assert.equal(f.memory.review().length,1);
  p.reset();solve(p);assert.equal(f.memory.review().length,0);assert.equal(p.complete,true);
});

test('question review resets only its own answer and resolves only after a correct reviewed answer',()=>{
  const f=fixture('beginners'),p=f.player;solve(p);
  p.answer((p.question.answer+1)%3);p.answer(p.question.answer);assert.equal(f.memory.review().length,1);assert.equal(p.complete,true);
  assert.equal(p.reviewQuestion(0),true);assert.equal(p.answers[0],null);assert.equal(p.complete,true);assert.equal(p.stage,'check');
  p.answer(p.question.answer);assert.equal(f.memory.review().length,0);assert.equal(p.complete,true);
});

test('older partial snapshots remain readable and completion arrays are unaffected by new features',()=>{
  const f=fixture(),p=f.player,move=p.session.expected;p.attempt(move.from,move.to,move.promotion);
  const data=JSON.parse(f.store.getItem(p.storageKey));delete data.challengeMode;delete data.reviewSource;delete data.questionReviewIndex;
  for(const activity of data.activities)for(const field of ['mistakes','hintCursor','hintLevel','challenge'])delete activity[field];
  f.store.setItem(p.storageKey,JSON.stringify(data));const restored=f.make();assert.equal(restored.session.correct,1);assert.equal(restored.challengeMode,false);assert.equal(restored.currentHint,null);
});

test('missing lessons, removed exercises, malformed storage and blocked storage do not break learning memory',()=>{
  const store=storage();store.setItem('knightlab-learning-memory-v1',JSON.stringify({last:{courseId:'bad',lessonId:'bad'},review:[{courseId:'french',lessonId:'advance',kind:'question',index:0},{courseId:'french',lessonId:'advance',kind:'practice',index:2000}]}));
  const m=createLearningMemory(store,COURSES);assert.equal(m.last(),null);assert.deepEqual(m.review(),[]);
  store.setItem('knightlab-learning-memory-v1','{broken');assert.equal(createLearningMemory(store,COURSES).last(),null);
  const blocked=createLearningMemory({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},COURSES);blocked.remember('french','advance');assert.equal(blocked.last().lessonId,'advance');
});

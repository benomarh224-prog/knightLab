import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from '../src/courses.js';
import { LessonPlayer,lessonPlan } from '../src/lesson-player.js';
import { Chess } from 'chess.js';

const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),values};};
function create(lesson,storage=memory(),course=COURSES.beginners){return new LessonPlayer({lesson,study:course.study?.(lesson.id),storage,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id)});}
function solve(player){while(player.session.expected){const {from,to,promotion}=player.session.expected;assert.equal(player.attempt(from,to,promotion).status,'correct');}}

test('all 190 current lessons inherit data-derived stages, strict legal practice and their original completion requirements',()=>{
  let count=0;
  for(const course of Object.values(COURSES))for(const lesson of course.lessons){
    const player=create(lesson,memory(),course);count++;
    assert.deepEqual(player.plan.stages,lesson.quiz?['learn','try','check']:['learn','try'],lesson.id);
    assert.equal(player.complete,false,lesson.id);assert.equal(player.checkUnlocked,false);
    assert.equal(player.setStage('check'),false);
    player.setStage('try');solve(player);
    assert.equal(player.boardComplete,true,lesson.id);assert.equal(player.complete,!lesson.quiz,lesson.id);
    if(lesson.quiz){assert.equal(player.setStage('check'),true);player.answer(lesson.quiz.answer);}
    assert.equal(player.complete,true,lesson.id);assert.ok(player.progress.read().includes(lesson.id));
    assert.equal(new Chess(player.session.fen).fen(),player.session.fen);
  }
  assert.equal(count,190);
});

test('multi-move opening keeps partial work, hints, stages and independent replay after reload',()=>{
  const storage=memory(),lesson=COURSES.opengames.lessons[0];let player=create(lesson,storage,COURSES.opengames);
  player.setStage('try');player.hint();const move=player.session.expected;player.attempt(move.from,move.to,move.promotion);
  const fen=player.session.fen,cursor=player.session.cursor;
  player.setStage('learn');player.learnNext();player.setStage('try');assert.equal(player.session.fen,fen);
  player.reviewing=true;player.jump(lesson.moves.length);player.save();
  player=create(lesson,storage,COURSES.opengames);assert.equal(player.reviewing,true);assert.equal(player.session.cursor,lesson.moves.length);
  player.reviewing=false;assert.equal(player.session.cursor,cursor);assert.equal(player.session.hints,1);assert.equal(player.session.fen,fen);
  solve(player);assert.equal(player.complete,true);
});

test('wrong legal alternatives and illegal moves do not advance practice; reset and retry preserve earned completion',()=>{
  const storage=memory(),lesson=COURSES.beginners.lessons[0],player=create(lesson,storage);
  const start=player.session.fen;
  assert.equal(player.attempt('d2','d4').status,'different');assert.equal(player.attempt('e2','e5').status,'illegal');assert.equal(player.session.fen,start);
  player.setStage('try');solve(player);player.setStage('check');
  assert.equal(player.answer((lesson.quiz.answer+1)%3),false);assert.equal(player.complete,false);
  player.answer(lesson.quiz.answer);assert.equal(player.complete,true);player.setStage('try');player.reset();
  assert.equal(player.session.correct,0);assert.equal(player.session.completed,false);assert.equal(player.complete,true);
  const restored=create(lesson,storage);assert.equal(restored.activity.done,true);assert.equal(restored.complete,true);
});

test('legacy completion arrays survive unchanged and do not require a migration or repeated quiz',()=>{
  for(const course of Object.values(COURSES)){
    const storage=memory(),lesson=course.lessons[0],before=JSON.stringify([lesson.id]);storage.setItem(course.key,before);
    const player=create(lesson,storage,course);assert.equal(player.complete,true);assert.equal(player.checkUnlocked,true);player.setStage('learn');
    assert.equal(storage.getItem(course.key),before);
  }
});

test('special moves preserve explicit promotion choice, castling and en passant under the shared player',()=>{
  for(const id of ['promote-a-pawn','castle-kingside','castle-queenside','en-passant']){
    const lesson=COURSES.beginners.lessons.find(l=>l.id===id),player=create(lesson);
    if(id==='promote-a-pawn'){assert.equal(player.attempt('e7','e8').status,'illegal');assert.equal(player.attempt('e7','e8','n').status,'different');}
    solve(player);assert.equal(player.boardComplete,true,id);
  }
});

const sample={id:'future',title:'Future lesson',concepts:['A single concept.','A second concept.'],takeaway:'Remember the idea.'};
const future=(lesson,storage=memory())=>new LessonPlayer({lesson,storage,progressKey:'future-v1'});
test('text-only lessons skip the board and quiz, retain each concept, and finish through reading',()=>{
  const storage=memory();let player=future(sample,storage);
  assert.deepEqual(player.plan.stages,['learn']);assert.equal(player.session,null);assert.equal(player.complete,false);
  player.learnNext();assert.equal(player.conceptIndex,1);assert.equal(player.complete,false);
  player=future(sample,storage);assert.equal(player.conceptIndex,1);assert.deepEqual(player.seen,[0]);
  player.learnNext();assert.equal(player.complete,true);assert.equal(player.setStage('try'),false);
});

test('demonstrations skip forced practice and finish by replaying the supplied line',()=>{
  const lesson={...sample,concepts:[],activities:[{kind:'demonstration',moves:['e4','e5','Nf3']}]},storage=memory();let player=future(lesson,storage);
  assert.deepEqual(player.plan.stages,['try']);assert.equal(player.session.mode,'watch');assert.equal(player.attempt('e2','e4').status,'inactive');
  player.jump(2);assert.equal(player.complete,false);player=future(lesson,storage);assert.equal(player.session.cursor,2);
  player.jump(3);assert.equal(player.complete,true);player.jump(0);assert.equal(player.complete,true);
});

test('static demonstrations can acknowledge a position without inventing moves or a quiz',()=>{
  const player=future({...sample,concepts:[],activities:[{kind:'demonstration',fen:new Chess().fen(),moves:[]}]});
  assert.deepEqual(player.plan.stages,['try']);assert.equal(player.complete,false);player.acknowledgeDemonstration();assert.equal(player.complete,true);
});

test('multiple positions and multiple real questions retain independent state and gate completion on all required work',()=>{
  const lesson={...sample,activities:[{moves:['e4','e5','Nf3'],practiceColor:'w'},{moves:['d4','d5','c4'],practiceColor:'w'}],questions:[{question:'One?',options:['yes','no'],answer:0},{question:'Two?',options:['no','yes'],answer:1}]};
  const storage=memory();let player=future(lesson,storage);player.setStage('try');solve(player);assert.equal(player.complete,false);assert.equal(player.checkUnlocked,false);
  player.selectActivity(1);const first=player.session.expected;player.attempt(first.from,first.to);player=future(lesson,storage);assert.equal(player.activityIndex,1);assert.equal(player.session.correct,1);
  player.selectActivity(0);assert.equal(player.session.completed,true);player.selectActivity(1);solve(player);assert.equal(player.checkUnlocked,true);
  player.setStage('check');player.answer(0);assert.equal(player.complete,false);player.questionIndex=1;player.answer(1);assert.equal(player.complete,true);
  player=future(lesson,storage);assert.deepEqual(player.answers,[0,1]);assert.equal(player.complete,true);
});

test('optional activities and questions follow lesson data rather than silently blocking completion',()=>{
  const player=future({...sample,concepts:[],activities:[{moves:['e4'],required:true},{moves:['d4'],required:false}],questions:[{question:'Optional?',options:['yes'],answer:0,required:false}]});
  solve(player);assert.equal(player.complete,true);assert.equal(player.checkUnlocked,true);
});

test('empty stages and unusable practice records fail explicitly; obsolete or corrupt drafts preserve legacy completion',()=>{
  assert.throws(()=>lessonPlan({id:'empty'}),/no learning content/);
  assert.throws(()=>lessonPlan({...sample,activities:[{kind:'practice',moves:[]}]}),/Practice needs/);
  const storage=memory(),lesson=COURSES.beginners.lessons[0],player=create(lesson,storage);player.setStage('try');solve(player);
  storage.setItem(player.storageKey,'{broken');assert.equal(create(lesson,storage).session.correct,0);
  player.save();const altered={...lesson,moves:['d4']};assert.equal(create(altered,storage).session.correct,0);
});

test('blocked storage still permits completing a lesson in memory',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},player=create(COURSES.beginners.lessons[0],storage);
  player.setStage('try');solve(player);player.answer(player.question.answer);assert.equal(player.complete,true);
});

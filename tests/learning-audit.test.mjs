import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSES} from '../src/courses.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {createLearningMemory} from '../src/learning-memory.js';
import {createCourseProgress} from '../src/opening-course.js';
import {lessonEntry,lessonGuidance,learningCategory} from '../src/lesson-guidance.js';
import {lessonContinuation} from '../src/lesson-navigation.js';
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};};
const create=(course,lesson,store=storage())=>new LessonPlayer({lesson,study:course.study?.(lesson.id),storage:store,courseId:course.id,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id)});

test('course entry honors explicit links, resumes each course and safely handles old or unknown links',()=>{
 const store=storage(),m=createLearningMemory(store,COURSES),f=COURSES.french,b=COURSES.beginners;
 m.remember(f.id,f.lessons[3].id);m.remember(b.id,b.lessons[5].id);
 const restored=createLearningMemory(store,COURSES);
 assert.equal(lessonEntry(f,{rememberedId:restored.lastFor(f.id)}).id,f.lessons[3].id);
 assert.equal(lessonEntry(b,{rememberedId:restored.lastFor(b.id)}).id,b.lessons[5].id);
 assert.equal(lessonEntry(f,{requestedId:f.lessons[1].id,rememberedId:restored.lastFor(f.id)}).id,f.lessons[1].id);
 assert.equal(lessonEntry(f,{requestedId:'removed',rememberedId:'bad',completed:[f.lessons[0].id]}).id,f.lessons[1].id);
 assert.equal(lessonEntry(f,{completed:f.lessons.map(l=>l.id)}).id,f.lessons[0].id);
});

test('old learning memory migrates without losing its resume link or existing completions',()=>{
 const store=storage(),c=COURSES.french,entry={courseId:c.id,lessonId:c.lessons[2].id};
 store.setItem('knightlab-learning-memory-v1',JSON.stringify({last:entry,review:[]}));store.setItem(c.key,JSON.stringify([c.lessons[0].id]));
 const m=createLearningMemory(store,COURSES);assert.equal(m.lastFor(c.id),entry.lessonId);m.remember('beginners',COURSES.beginners.lessons[0].id);
 const reloaded=createLearningMemory(store,COURSES);assert.equal(reloaded.lastFor(c.id),entry.lessonId);
 assert.deepEqual(createCourseProgress(store,c.lessons.map(l=>l.id),c.key).read(),[c.lessons[0].id]);
});

test('new learners see Beginners while explicit or saved valid categories remain accessible',()=>{
 assert.equal(learningCategory(COURSES,null,null),'beginners');
 assert.equal(learningCategory(COURSES,'tactics','openings'),'tactics');
 assert.equal(learningCategory(COURSES,'removed','openings'),'openings');
 assert.equal(learningCategory(COURSES,'bad','bad'),'beginners');
});

test('all current lessons describe the actual turn and keep the authored goal through multi-move practice',()=>{
 let count=0;
 for(const course of Object.values(COURSES))for(const lesson of course.lessons){
  const p=create(course,lesson);p.setStage('try');const first=lessonGuidance(p),goal=p.activity.data.instruction;
  assert.match(first.status,/Your turn/);assert.equal(first.instruction,goal||'Select a piece, then a highlighted square.');
  const m=p.session.expected;p.attempt(m.from,m.to,m.promotion);
  const next=lessonGuidance(p);assert.equal(next.mode,p.session.completed?'complete':'practice');
  if(!p.session.completed)assert.equal(next.instruction,goal||'Select a piece, then a highlighted square.');
  assert.equal(lessonGuidance(p,{busy:true}).mode,'playing');count++;
 }
 assert.ok(count>=202);
});

test('free play always has a working return action without unlocking an unsolved lesson',()=>{
 const c=COURSES.beginners,p=create(c,c.lessons[0]);p.setStage('try');const original=p.session.fen;p.startExploring();
 const m=p.exploration.legal()[0];p.exploreMove(m.from,m.to,m.promotion);
 assert.equal(lessonGuidance(p).mode,'explore');const next=lessonContinuation(p);
 assert.equal(next.action,'end-exploration');assert.equal(next.enabled,true);assert.equal(p.complete,false);
 p.stopExploring();assert.equal(p.session.fen,original);assert.equal(lessonContinuation(p).enabled,false);
});

test('review instruction explains the displayed move and text-only lessons do not invent practice',()=>{
 const lesson={id:'demo',concepts:[],activities:[{kind:'demonstration',moves:['e4'],notes:['The pawn controls the center.']}]},course={key:'demo-guidance',lessons:[lesson]};
 const p=create(course,lesson);p.jump(1);assert.equal(lessonGuidance(p).instruction,'The pawn controls the center.');assert.equal(lessonGuidance(p).mode,'review');
 const reading={id:'read',concepts:['One idea']};assert.equal(lessonGuidance(create({key:'read-guidance',lessons:[reading]},reading)),null);
});

test('blocked browser storage retains earned completion throughout the current session and across progress readers',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},c=COURSES.beginners,lesson=c.lessons[0],p=create(c,lesson,blocked);
 while(p.session.expected){const m=p.session.expected;p.attempt(m.from,m.to,m.promotion);}p.answer(p.question.answer);assert.equal(p.complete,true);
 p.reset();assert.equal(p.complete,true);assert.equal(p.storedComplete,true);
 assert.ok(createCourseProgress(blocked,c.lessons.map(l=>l.id),c.key).read().includes(lesson.id));
});

test('the same Continue flow completes every current course lesson from Learn through required practice and questions',()=>{
 let total=0;
 for(const course of Object.values(COURSES))for(const lesson of course.lessons){
  const p=create(course,lesson);let steps=0;
  while(steps++<300){
   const n=lessonContinuation(p);
   if(n.action==='next-lesson'){assert.equal(p.complete,true,lesson.id);break;}
   if(n.action==='learn-next')p.learnNext();
   else if(n.action==='stage')p.setStage(n.stage);
   else if(n.action==='question'){p.questionIndex=n.index;p.setStage('check');}
   else if(n.action==='activity'){p.selectActivity(n.index);p.setStage('try');}
   else if(n.action==='next-study-move')p.jump(p.session.cursor+1);
   else if(n.action==='demonstration-done')p.acknowledgeDemonstration();
   else if(n.action==='blocked'&&p.stage==='try'){const m=p.session.expected;assert.ok(m,lesson.id);assert.equal(p.attempt(m.from,m.to,m.promotion).status,'correct');}
   else if(n.action==='blocked'&&p.stage==='check')p.answer(p.question.answer);
   else assert.fail(`${lesson.id}: unexpected ${n.action}`);
  }
  assert.ok(steps<300,lesson.id);assert.equal(create(course,lesson,p.storage).complete,true,lesson.id);total++;
 }
 assert.ok(total>=202);console.log(`Learning journeys verified: ${total} lessons.`);
});

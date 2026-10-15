import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from '../src/courses.js';
import { LessonPlayer } from '../src/lesson-player.js';
import { lessonContinuation,createLessonDock } from '../src/lesson-navigation.js';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
function make(lesson,course){return new LessonPlayer({lesson,study:course?.study(lesson.id),storage:memory(),progressKey:course?.key||'fixture'});}
function solve(p){while(p.session.expected){const m=p.session.expected;p.attempt(m.from,m.to,m.promotion);}}

test('all 190 lessons expose the correct nearby continuation without bypassing their completion requirements',()=>{
  let count=0;
  for(const course of Object.values(COURSES))for(const lesson of course.lessons){
    const p=make(lesson,course);p.setStage('try');
    assert.equal(lessonContinuation(p).enabled,false,lesson.id);
    solve(p);const action=lessonContinuation(p,{label:course.label});
    assert.equal(action.enabled,true);
    if(lesson.quiz){
      assert.equal(action.action,'question');p.setStage('check');assert.equal(lessonContinuation(p).enabled,false);
      p.answer((lesson.quiz.answer+1)%lesson.quiz.options.length);assert.equal(lessonContinuation(p).enabled,false);
      p.answer(lesson.quiz.answer);
    }
    assert.equal(lessonContinuation(p).action,'next-lesson',lesson.id);assert.equal(p.complete,true);count++;
  }
  assert.equal(count,190);
});

test('reading progresses one idea at a time, skips absent stages and never invents a board or quiz',()=>{
  const p=make({id:'reading',title:'Read',concepts:['First idea.','Second idea.']});
  assert.equal(lessonContinuation(p).label,'Next idea →');p.learnNext();
  assert.equal(lessonContinuation(p).label,'Finish reading ✓');assert.equal(p.complete,false);
  p.learnNext();assert.equal(lessonContinuation(p).action,'next-lesson');
  assert.equal(lessonContinuation(p,{lastLesson:true}).label,'Back to course →');
});

test('multiple positions and questions lead to the next required task instead of skipping to another lesson',()=>{
  const p=make({id:'multi',title:'Multiple',concepts:[],activities:[{moves:['e4']},{moves:['d4']}],questions:[{question:'One?',options:['Yes'],answer:0},{question:'Two?',options:['Yes'],answer:0}]});
  solve(p);const next=lessonContinuation(p);assert.equal(next.action,'activity');assert.equal(next.index,1);
  p.selectActivity(next.index);assert.equal(lessonContinuation(p).enabled,false);solve(p);
  assert.equal(lessonContinuation(p).action,'question');p.setStage('check');p.answer(0);
  assert.equal(lessonContinuation(p).label,'Next question →');p.questionIndex=1;p.answer(0);
  assert.equal(lessonContinuation(p).action,'next-lesson');
});

test('moving and static demonstrations expose their real navigation or acknowledgement action',()=>{
  const p=make({id:'demo',title:'Demo',concepts:[],activities:[{kind:'demonstration',moves:['e4','e5']}]});
  assert.equal(lessonContinuation(p).action,'next-study-move');p.jump(1);assert.equal(lessonContinuation(p).action,'next-study-move');p.jump(2);
  assert.equal(lessonContinuation(p).action,'next-lesson');
  const staticDemo=make({id:'static',title:'Demo',concepts:[],activities:[{kind:'demonstration',moves:[]}]});
  assert.equal(lessonContinuation(staticDemo).action,'demonstration-done');staticDemo.acknowledgeDemonstration();assert.equal(lessonContinuation(staticDemo).action,'next-lesson');
});

test('review and independent practice return to the saved practice session without unlocking unfinished requirements',()=>{
  const course=COURSES.beginners,p=make(course.lessons[0],course);p.setStage('try');p.reviewing=true;
  assert.equal(lessonContinuation(p).action,'resume-practice');assert.equal(p.complete,false);
  p.reviewing=false;p.startChallenge();assert.equal(lessonContinuation(p).action,'end-challenge');assert.equal(lessonContinuation(p).enabled,true);
  solve(p);p.endChallenge();assert.equal(lessonContinuation(p).action,'question');assert.equal(p.complete,false);
  p.setStage('check');p.answer(p.question.answer);assert.equal(lessonContinuation(p).action,'next-lesson');
});

test('an explicitly required reading stage remains required after completing board work',()=>{
  const p=make({id:'required',title:'Both',concepts:['Read this.'],moves:['e4'],completion:{learn:true}});p.setStage('try');solve(p);
  assert.equal(p.complete,false);const next=lessonContinuation(p);assert.equal(next.action,'stage');assert.equal(next.stage,'learn');
  p.setStage('learn');p.learnNext();assert.equal(p.complete,true);
});

test('dock reservation tracks wrapped text and safe-area height, ignores hidden measurements and cleans up listeners',()=>{
  let height=88,notify,disconnected=false;const values=new Map(),events={};
  const footer={getBoundingClientRect:()=>({height})},root={style:{setProperty:(key,value)=>values.set(key,value),removeProperty:key=>values.delete(key)}};
  class Observer {constructor(callback){notify=callback;}observe(node){assert.equal(node,footer);}disconnect(){disconnected=true;}}
  const viewport={addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]};
  const dock=createLessonDock({footer,root,Observer,viewport});assert.equal(values.get('--lesson-dock-height'),'88px');
  height=122.25;notify();assert.equal(values.get('--lesson-dock-height'),'123px');
  height=0;notify();assert.equal(values.get('--lesson-dock-height'),'123px');
  height=104;events.resize();assert.equal(values.get('--lesson-dock-height'),'104px');
  dock.destroy();assert.equal(disconnected,true);assert.equal(events.resize,undefined);assert.equal(values.size,0);
});

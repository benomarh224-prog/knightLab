import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSES} from '../src/courses.js';
import {LessonPlayer,lessonPlan} from '../src/lesson-player.js';

const previous=value=>typeof value==='string'?value.replaceAll('ROQVYN','Knightlab'):Array.isArray(value)?value.map(previous):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,previous(item)])):value;
test('the new brand preserves all existing lesson content signatures and storage keys',()=>{
 for(const course of Object.values(COURSES)){
  assert.match(course.key,/^knightlab-/);
  for(const lesson of course.lessons){
   const study=course.study?.(lesson.id)||{};
   assert.equal(lessonPlan(lesson,study).signature,lessonPlan(previous(lesson),previous(study)).signature,lesson.id);
  }
 }
});
test('an existing learner resumes the same partial pawn exercise and hint after rebranding',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const course=COURSES.beginners,lesson=course.lessons.find(l=>l.id==='pawn-moves-and-captures');
 const options={storage,progressKey:course.key,study:course.study(lesson.id)};
 const before=new LessonPlayer({...options,lesson:previous(lesson)});
 before.setStage('try');before.requestHint();before.attempt('c4','c5');before.save();
 const after=new LessonPlayer({...options,lesson});
 assert.equal(after.stage,'try');assert.equal(after.currentHint.level,1);
 assert.equal(after.activity.mistakes,1);assert.equal(after.session.fen,before.session.fen);
});

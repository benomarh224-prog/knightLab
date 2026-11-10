import test from'node:test';import assert from'node:assert/strict';import{homePlanState,homePlanRows}from'../src/home-daily-plan.js';import{COURSES}from'../src/courses.js';
const tasks=[{id:'a',title:'Find a pawn break.',detail:'French Defense'},{id:'b',title:'Check the king.',detail:'Tactical Vision'},{id:'c',title:'A moment from your game',detail:'Your reviewed mistakes',kind:'mistake'}];
test('home daily actions distinguish a new, resumed and completed saved session',()=>{
 assert.deepEqual(homePlanState({tasks,done:[],started:false}),{done:0,total:3,complete:false,summary:'0 of 3 complete',action:'Start practice'});
 assert.equal(homePlanState({tasks,done:[],started:true}).action,'Continue practice');
 assert.equal(homePlanState({tasks,done:['a'],started:true}).summary,'1 of 3 complete');
 assert.equal(homePlanState({tasks,done:['a','b','c'],started:true}).action,'Review today’s plan');
});
test('completed and pending daily rows retain their actual task identities and can both open',()=>{
 const html=homePlanRows({tasks,done:['a']},COURSES);assert.match(html,/data-home-daily-task="a" aria-label="Review Find a pawn break/);assert.match(html,/data-home-daily-task="b" aria-label="Start Check the king/);assert.match(html,/data-home-daily-task="c"/);assert.doesNotMatch(html,/disabled|To practice/);
});
test('tactics daily rows use the same verified exercise title as their lesson and escape saved text',()=>{
 const lesson=COURSES.tactics.lessons[0],task={...tasks[0],courseId:'tactics',lessonId:lesson.id,title:'Beginner exercise 01'};
 const html=homePlanRows({tasks:[task,{id:'x"',title:'<img src=x>',detail:'A & B'}],done:[]},COURSES);
 assert.doesNotMatch(html,/Beginner exercise 01|<img/);assert.match(html,/&lt;img src=x&gt;/);assert.match(html,/A &amp; B/);assert.match(html,/data-home-daily-task="x&quot;"/);
});

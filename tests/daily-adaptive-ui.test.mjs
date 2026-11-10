import test from 'node:test';import assert from 'node:assert/strict';
import {COURSES} from '../src/courses.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {createDailyTrainingUI} from '../src/daily-training-ui.js';
import {dailyPracticeTask} from '../src/daily-training.js';

const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
function fixture(store=storage()){
  const elements=new Map(),routes=[],doc={getElementById(id){if(!elements.has(id))elements.set(id,{dataset:{},innerHTML:'',textContent:'',hidden:false,value:'',focus(){doc.activeElement=this;}});return elements.get(id);},querySelectorAll:()=>[]};
  const ui=createDailyTrainingUI({storage:store,courses:COURSES,mistakes:()=>[],go:(page,options)=>routes.push({page,...options}),practice:()=>{},doc,now:()=>new Date(2026,10,10,12)});
  return {ui,doc,elements,routes,store};
}
test('daily UI exposes every starting tier and a measured recap through the actual solve handlers',()=>{
  const f=fixture(),get=id=>f.doc.getElementById(id);f.ui.render();assert.match(get('daily-level').innerHTML,/Automatic/);assert.match(get('daily-level').innerHTML,/calculation:expert/);
  get('daily-level').value='calculation:advanced';get('daily-level').onchange();const day=f.ui.render(),target=day.tasks[0];
  get('daily-tasks').onclick({target:{closest:()=>({dataset:{dailyTask:target.id}})}});
  const route=f.routes.at(-1),lesson=COURSES.calculation.lessons.find(l=>l.id===target.lessonId),ctx=f.ui.context(route.page,lesson.id,new URLSearchParams(route.search));assert.ok(ctx);
  const player=new LessonPlayer({lesson,study:lesson.study,courseId:'calculation',storage:f.store,progressKey:COURSES.calculation.key,lessonIds:COURSES.calculation.lessons.map(l=>l.id),draftKey:ctx.draftKey,onPracticeEvent:e=>f.ui.observe(e)});
  player.requestHint();while(player.session.expected){const m=player.session.expected;player.attempt(m.from,m.to,m.promotion);}f.ui.solved(ctx,player.practiceOutcome());
  assert.equal(get('daily-report').hidden,false);assert.match(get('daily-report').innerHTML,/0 solved independently · 1 with help/);assert.match(get('daily-report').innerHTML,/Calculation Lab · Challenging/);
  assert.equal(get('daily-level').disabled,true);assert.equal(day.tasks[1].level,'challenging');
  const restored=fixture(f.store);restored.ui.render();assert.match(restored.doc.getElementById('daily-report').innerHTML,/1 with help/);
});

test('the recap appears at session completion and completed tasks remain available for review',()=>{
  const f=fixture(),day=f.ui.render();
  // Solve existing tasks without measurements to simulate an older saved session.
  for(const original of [...day.tasks]){
    const ctx={date:day.date,task:original};f.ui.start(ctx);f.ui.solved(ctx);
  }
  f.ui.render();assert.equal(f.doc.getElementById('daily-start').hidden,true);assert.match(f.doc.getElementById('daily-report').innerHTML,/3 earlier results not measured/);
  assert.match(f.doc.getElementById('daily-tasks').innerHTML,/>Review<\/button>/);assert.match(f.doc.getElementById('daily-description').textContent,/Session complete/);
});

for(const origin of ['daily-tasks','home-daily-plan'])test(`${origin} opens the visibly selected task even if newer practice changed the recommendation`,()=>{
  const f=fixture(),day=f.ui.render(),selected=day.tasks[1],lesson=COURSES.calculation.lessons.find(l=>l.level==='expert');
  f.ui.observe({...dailyPracticeTask(COURSES,'calculation',lesson.id),kind:'complete',outcome:{}});
  const attribute=origin==='daily-tasks'?'dailyTask':'homeDailyTask';f.doc.getElementById(origin).onclick({target:{closest:()=>({dataset:{[attribute]:selected.id}})}});
  assert.equal(f.routes.length,1);assert.match(f.routes[0].search,new RegExp('task='+selected.id));assert.equal(day.opened.includes(selected.id),true);
});

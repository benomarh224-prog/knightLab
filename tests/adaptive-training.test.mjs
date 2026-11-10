import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {COURSES} from '../src/courses.js';
import {createAdaptiveTraining,trainingBands,practiceOutcome} from '../src/adaptive-training.js';
import {createDailyTraining,dailyPracticeTask} from '../src/daily-training.js';
import {trainingDateAfter} from '../src/training-calendar.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {dailyLearningReport} from '../src/daily-learning-report.js';

const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const task=(course,index)=>dailyPracticeTask(COURSES,course.id,course.lessons[index].id);
const tier=(course,level)=>course.lessons.filter(l=>l.level===level).map(l=>dailyPracticeTask(COURSES,course.id,l.id));
const solve=player=>{while(player.session.expected){const m=player.session.expected;assert.equal(player.attempt(m.from,m.to,m.promotion).status,'correct');}};
const playerFor=(lesson,storage,observer)=>new LessonPlayer({lesson,study:COURSES.calculation.study(lesson.id),courseId:'calculation',storage,progressKey:COURSES.calculation.key,lessonIds:COURSES.calculation.lessons.map(l=>l.id),onPracticeEvent:observer});

test('difficulty bands come from course metadata and distinguish the two Advanced tiers',()=>{
  const bands=trainingBands(COURSES);assert.equal(bands.length,6);assert.equal(bands[2].id,'tactics:advanced');assert.equal(bands[4].id,'calculation:advanced');
  assert.equal(bands[3].value,'calculation:challenging');assert.equal(bands[1].value,'intermediate');
  assert.equal(practiceOutcome({hints:0,alternatives:0}).quality,'independent');assert.equal(practiceOutcome({known:false}).quality,'unknown');
  assert.equal(practiceOutcome({known:false,hints:1}).quality,'supported');
});

test('two distinct independent solves increase difficulty once; same-day replays cannot farm progress or erase help',()=>{
  const storage=memory(),adaptive=createAdaptiveTraining({storage,courses:COURSES,now:()=>new Date(2026,10,10,12)}),tasks=tier(COURSES.calculation,'challenging');
  adaptive.ensure('calculation:challenging');adaptive.record(tasks[0],{});adaptive.record(tasks[0],{});
  assert.equal(adaptive.recommendation().band.id,'calculation:challenging');adaptive.record(tasks[1],{});assert.equal(adaptive.recommendation().band.id,'calculation:advanced');
  adaptive.record(tasks[0],{});assert.equal(adaptive.recommendation().band.id,'calculation:advanced');
  const advanced=tier(COURSES.calculation,'advanced')[0];adaptive.help(advanced);assert.equal(adaptive.record(advanced,{}).quality,'supported');
  adaptive.record(advanced,{});assert.equal(adaptive.recommendation().band.id,'calculation:challenging');
});

test('spaced reviews wait two local calendar days, survive reloads and expand after an independent retry',()=>{
  let date=new Date(2026,9,24,12);const storage=memory(),make=()=>createAdaptiveTraining({storage,courses:COURSES,now:()=>date});let adaptive=make();const target=tier(COURSES.calculation,'challenging')[0];
  adaptive.ensure('calculation:challenging');adaptive.help(target);adaptive.record(target,{hints:1});assert.deepEqual(adaptive.due(),[]);
  date=new Date(2026,9,25,12);adaptive=make();assert.deepEqual(adaptive.due(),[]);
  date=new Date(2026,9,26,12);adaptive=make();assert.equal(adaptive.due()[0].id,target.id);adaptive.record(target,{});assert.deepEqual(adaptive.due(),[]);
  assert.match(adaptive.summary('2026-10-26',[target.id]).progress,/without help after an earlier supported attempt/);
  date=new Date(2026,9,29,12);assert.deepEqual(adaptive.due(),[]);date=new Date(2026,9,30,12);assert.equal(adaptive.due()[0].id,target.id);
  assert.equal(trainingDateAfter('2026-10-24',2),'2026-10-26');assert.equal(trainingDateAfter('2026-12-31',2),'2027-01-02');
});

test('an assisted solve replaces only an unopened future task with a different, easier position on the same idea',()=>{
  const storage=memory(),daily=createDailyTraining({storage,courses:COURSES,now:()=>new Date(2026,10,10,12)});assert.equal(daily.setLevel('calculation:advanced'),true);
  const day=daily.today(),first=day.tasks[0],other=day.tasks[1];assert.equal(first.courseId,'calculation');daily.start(day.date,first.id);
  daily.observe({...first,kind:'complete',outcome:{hints:1}});daily.solve(day.date,first.id,{hints:1});
  assert.equal(day.tasks[0].id,first.id);assert.equal(day.done.length,1);assert.notEqual(day.tasks[1].id,other.id);assert.equal(day.tasks[1].level,'challenging');
  const adaptive=createAdaptiveTraining({storage,courses:COURSES});assert.equal(adaptive.meta(first).skill,adaptive.meta(day.tasks[1]).skill);
  assert.equal(daily.report(day.date).supported,1);assert.equal(daily.report(day.date).independent,0);
  assert.equal(new Set(day.tasks.map(t=>t.id)).size,3);assert.equal(daily.setLevel('expert'),false);
});

test('already opened tasks and their saved drafts remain stable when another solve adapts the session',()=>{
  const daily=createDailyTraining({storage:memory(),courses:COURSES,now:()=>new Date(2026,10,10,12)});daily.setLevel('calculation:advanced');const day=daily.today(),first=day.tasks[0],opened=day.tasks[1];
  daily.start(day.date,opened.id);daily.start(day.date,first.id);daily.solve(day.date,first.id,{alternatives:1});assert.equal(day.tasks[1].id,opened.id);
  assert.equal(day.tasks[1].level,'advanced');assert.equal(day.tasks[2].level,'challenging');
});

test('hints, legal alternatives and solution review generate help evidence; illegal taps and promotion selection do not',()=>{
  const lesson=COURSES.calculation.lessons[0],events=[],storage=memory(),player=playerFor(lesson,storage,e=>events.push(e));
  assert.equal(player.attempt('a1','a1').status,'illegal');assert.equal(events.length,0);solve(player);
  assert.equal(events.filter(e=>e.kind==='complete').length,1);assert.equal(practiceOutcome(events.at(-1).outcome).quality,'independent');
  const other=playerFor(COURSES.calculation.lessons[1],storage,e=>events.push(e)),expected=other.session.expected;
  const alternative=new Chess(other.session.fen).moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')!==expected.from+expected.to+(expected.promotion||''));
  assert.equal(other.attempt(alternative.from,alternative.to,alternative.promotion).status,'different');other.requestHint();solve(other);
  assert.equal(practiceOutcome(events.at(-1).outcome).quality,'supported');assert.equal(events.at(-1).outcome.alternatives,1);
  const reviewing=playerFor(COURSES.calculation.lessons[2],storage,e=>events.push(e));reviewing.startReview();reviewing.jump(2);reviewing.endReview();solve(reviewing);assert.equal(events.at(-1).outcome.reviewed,true);
  const promotionLesson=COURSES.beginners.lessons.find(l=>l.id==='promote-a-pawn'),promotionEvents=[],promotion=new LessonPlayer({lesson:promotionLesson,study:COURSES.beginners.study(promotionLesson.id),courseId:'beginners',storage:memory(),progressKey:COURSES.beginners.key,onPracticeEvent:e=>promotionEvents.push(e)});
  promotion.attempt('e7','e8');assert.equal(promotionEvents.length,0);solve(promotion);assert.equal(practiceOutcome(promotionEvents.at(-1).outcome).quality,'independent');
});

test('the real lesson flow records once, retains legal multi-move validation, and preserves older course and daily progress',()=>{
  const storage=memory();storage.setItem(COURSES.mates.key,'["mate-back-rank-1"]');const before=storage.getItem(COURSES.mates.key);
  const daily=createDailyTraining({storage,courses:COURSES,now:()=>new Date(2026,10,10,12)});daily.setLevel('calculation:challenging');const day=daily.today(),target=day.tasks[0],lesson=COURSES.calculation.lessons.find(l=>l.id===target.lessonId);
  const query=new URLSearchParams(daily.link(day.date,target).split('?')[1]),ctx=daily.context('calculation',lesson.id,query);daily.start(day.date,target.id);
  const options={lesson,study:lesson.study,courseId:'calculation',storage,progressKey:COURSES.calculation.key,lessonIds:COURSES.calculation.lessons.map(l=>l.id),draftKey:ctx.draftKey,onPracticeEvent:e=>daily.observe(e)};
  let player=new LessonPlayer(options);player.requestHint();const first=player.session.expected;player.attempt(first.from,first.to,first.promotion);
  assert.equal(player.session.completed,false);assert.equal(daily.done(day.date,target.id),false);player=new LessonPlayer(options);assert.equal(player.currentHint,null);solve(player);
  daily.solve(day.date,target.id,player.practiceOutcome());daily.solve(day.date,target.id,player.practiceOutcome());assert.equal(daily.report(day.date).supported,1);
  assert.equal(storage.getItem(COURSES.mates.key),before);const restored=createDailyTraining({storage,courses:COURSES,now:()=>new Date(2026,10,10,13)});assert.equal(restored.report(day.date).supported,1);assert.equal(restored.done(day.date,target.id),true);
});

test('legacy daily results and partial drafts stay valid without inventing independence measurements',()=>{
  const storage=memory(),daily=createDailyTraining({storage,courses:COURSES,now:()=>new Date(2026,10,10,12)}),day=daily.today();daily.start(day.date,day.tasks[0].id);daily.solve(day.date,day.tasks[0].id);
  assert.equal(daily.report(day.date).unknown,1);assert.equal(daily.report(day.date).independent,0);
  const lesson=COURSES.calculation.lessons[0];let player=playerFor(lesson,storage);player.save();const draft=JSON.parse(storage.getItem(player.storageKey));
  for(const activity of draft.activities){delete activity.tracked;delete activity.alternatives;delete activity.viewed;}storage.setItem(player.storageKey,JSON.stringify(draft));
  player=playerFor(lesson,storage);assert.equal(player.practiceOutcome().known,false);assert.equal(practiceOutcome(player.practiceOutcome()).quality,'unknown');
});

test('corrupted, stale and blocked storage cannot fabricate reviews or prevent local training',()=>{
  const store=memory(),target=tier(COURSES.calculation,'challenging')[0];store.setItem('roqvyn-adaptive-training-v1',JSON.stringify({version:1,band:'bogus',records:{bad:{task:{...target,signature:'stale'},signature:'stale'}},events:[{date:'2026-11-10',key:'bad',quality:'independent'}]}));
  const adaptive=createAdaptiveTraining({storage:store,courses:COURSES});assert.equal(adaptive.ensure().id,'tactics:beginner');assert.deepEqual(adaptive.due(),[]);
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},local=createAdaptiveTraining({storage:blocked,courses:COURSES,now:()=>new Date(2026,10,10)});local.ensure('calculation:challenging');local.record(target,{});assert.equal(local.summary('2026-11-10',[target.id]).independent,1);
});

test('recaps use measured results and escaped skill names, with no invented ratings or accuracy percentages',()=>{
  const html=dailyLearningReport({independent:1,supported:1,unknown:1,progress:'Progress <img>',focus:'Next focus: pins & skewers',band:'Calculation Lab · Expert'});
  assert.match(html,/1 solved independently/);assert.match(html,/earlier result not measured/);assert.match(html,/&lt;img&gt;/);assert.match(html,/pins &amp; skewers/);assert.doesNotMatch(html,/<img|Elo|accuracy|\d+%/);
});

test('practice outside a daily session can establish a harder starting tier without discarding an opened daily plan',()=>{
  const storage=memory(),daily=createDailyTraining({storage,courses:COURSES,now:()=>new Date(2026,10,10,12)}),day=daily.today(),target=tier(COURSES.calculation,'expert')[0];
  daily.observe({...target,kind:'complete',outcome:{hints:0,alternatives:0}});const refreshed=daily.today();assert.equal(refreshed.tasks[1].level,'expert');
  daily.start(day.date,day.tasks[0].id);const before=JSON.stringify(day.tasks);daily.observe({...tier(COURSES.calculation,'expert')[1],kind:'complete',outcome:{hints:1}});daily.today();assert.equal(JSON.stringify(day.tasks),before);
});

test('reviewed game hints also schedule a spaced retry without duplicating the daily game task',()=>{
  let date=new Date(2026,10,10,12);const storage=memory(),mistake={fen:'7k/8/8/8/8/8/p7/7K b - - 0 1',solution:'a2a1q',bestSAN:'a1=Q+',color:'b',played:'Kg8',label:'Mistake',loss:180,moveNumber:'1'},daily=createDailyTraining({storage,courses:COURSES,now:()=>date});
  const first=daily.today({mistakes:[mistake]}),personal=first.tasks[2];daily.start(first.date,personal.id);daily.helpTask(first.date,personal.id);daily.solve(first.date,personal.id,{hints:1});
  date=new Date(2026,10,12,12);const second=daily.today({mistakes:[mistake]});assert.equal(second.tasks[0].id,personal.id);assert.equal(second.tasks.length,3);assert.equal(new Set(second.tasks.map(t=>t.id)).size,3);
});

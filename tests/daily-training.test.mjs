import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSES} from '../src/courses.js';
import {createDailyTraining,localTrainingDate,validDailyMistake,dailyPracticeTask,reviewedDailyMistakes} from '../src/daily-training.js';
import {parseGame} from '../src/game.js';
import {LessonPlayer} from '../src/lesson-player.js';
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),map};};
const make=(store,extra={})=>createDailyTraining({storage:store,courses:COURSES,now:()=>new Date(2026,10,6,21,30),...extra});
const mistake={fen:'7k/8/8/8/8/8/p7/7K b - - 0 1',solution:'a2a1q',bestSAN:'a1=Q+',color:'b',played:'Kg8',label:'Mistake',loss:180,moveNumber:'1'};
test('a daily plan uses three existing legal exercises and hides solutions from its labels',()=>{
 const daily=make(storage()),day=daily.today();assert.equal(day.tasks.length,3);assert.deepEqual(day.done,[]);
 assert.equal(day.date,'2026-11-06');assert.equal(day.tasks[1].level,'beginner');
 for(const task of day.tasks)assert.ok(dailyPracticeTask(COURSES,task.courseId,task.lessonId,task.index));
 assert.equal(new Set(day.tasks.map(task=>task.id)).size,3);
});
test('level changes before starting; the started plan and earned completion survive reloads',()=>{
 const store=storage(),daily=make(store);daily.today();assert.equal(daily.setLevel('intermediate'),true);
 const day=daily.today(),task=day.tasks[1];assert.equal(task.level,'intermediate');
 assert.equal(daily.solve(day.date,task.id),false);daily.start(day.date,task.id);daily.solve(day.date,task.id);daily.solve(day.date,task.id);
 assert.equal(daily.setLevel('advanced'),false);const restored=make(store).today();assert.deepEqual(restored,day);assert.equal(restored.done.length,1);
});
test('review practice is prioritized and personal mistakes require a legal move, including explicit promotion',()=>{
 assert.equal(validDailyMistake(mistake),true);assert.equal(validDailyMistake({...mistake,solution:'a2a1'}),false);
 assert.equal(validDailyMistake({...mistake,color:'w'}),false);assert.equal(validDailyMistake({...mistake,fen:'broken'}),false);
 const daily=make(storage(),{learningMemory:{review:()=>[{courseId:'french',lessonId:COURSES.french.lessons[2].id,kind:'practice',index:0}]}});
 const day=daily.today({mistakes:[{...mistake,solution:'a2a8'},mistake]});assert.equal(day.tasks[0].courseId,'french');assert.equal(day.tasks[2].kind,'mistake');
});
test('new personal evidence can join an unstarted plan; an active plan remains stable',()=>{
 const daily=make(storage()),day=daily.today();assert.equal(day.tasks[2].kind,'practice');
 assert.equal(daily.today({mistakes:[mistake]}).tasks[2].kind,'mistake');daily.start(day.date,day.tasks[0].id);
 const before=JSON.stringify(day);daily.today({mistakes:[{...mistake,solution:'a2a1r'}]});assert.equal(JSON.stringify(day),before);
});
test('daily training keeps a Level Test position stable after starting, saves a solve and rotates to a different position',()=>{
 const store=storage();let date=new Date(2026,10,6),daily=make(store,{now:()=>date});
 const first={...mistake,source:'level-test',title:'Find an alternative to 1... Kg8'};
 const second={...mistake,solution:'a2a1r',source:'level-test',title:'Find an alternative to your king move'};
 const day=daily.today({mistakes:[first]}),personal=day.tasks.filter(task=>task.kind==='mistake');
 assert.equal(day.tasks.length,3);assert.equal(personal.length,1);
 const [task]=personal;
 assert.equal(task.title,first.title);assert.equal(task.detail,'From your Level Test');
 daily.start(day.date,task.id);
 assert.equal(daily.today({mistakes:[second]}).tasks.find(item=>item.kind==='mistake').id,task.id);
 assert.equal(daily.solve(day.date,task.id),true);
 daily=make(store,{now:()=>date});
 assert.equal(daily.today({mistakes:[second]}).done.includes(task.id),true);
 date=new Date(2026,10,7);
 const next=daily.today({mistakes:[first,second]});
 assert.equal(next.tasks.length,3);
 assert.deepEqual(next.tasks.filter(item=>item.kind==='mistake').map(item=>item.exercise.solution),[second.solution]);
});
test('the local calendar date rolls over without erasing yesterday’s unfinished session',()=>{
 const store=storage();let date=new Date(2026,10,6,23,59);const daily=make(store,{now:()=>date});const first=daily.today();
 daily.start(first.date,first.tasks[0].id);daily.solve(first.date,first.tasks[0].id);date=new Date(2026,10,7,0,1);
 const next=daily.today();assert.equal(localTrainingDate(date),'2026-11-07');assert.equal(next.done.length,0);assert.equal(daily.get(first.date).done.length,1);
});
test('daily practice advances even when the full course quiz is still unfinished',()=>{
 const store=storage();let date=new Date(2026,10,6);const daily=make(store,{now:()=>date}),first=daily.today();
 for(const task of first.tasks){daily.start(first.date,task.id);daily.solve(first.date,task.id);}
 date=new Date(2026,10,7);const second=daily.today();for(let i=0;i<3;i++)assert.notEqual(second.tasks[i].id,first.tasks[i].id);
 assert.equal(store.getItem(COURSES.beginners.key),null);
});
test('daily lesson drafts preserve normal partial work, hints, full sequence validation and quiz requirements',()=>{
 const store=storage(),daily=make(store),day=daily.today(),task=day.tasks[2],course=COURSES[task.courseId],lesson=course.lessons.find(item=>item.id===task.lessonId);
 const options={lesson,study:course.study(lesson.id),storage:store,progressKey:course.key,lessonIds:course.lessons.map(item=>item.id)};
 const normal=new LessonPlayer(options);normal.requestHint();const original=store.getItem(normal.storageKey);
 const ctx=daily.context(course.id,lesson.id,new URLSearchParams(daily.link(day.date,task).split('?')[1]));assert.ok(ctx);daily.start(day.date,task.id);
 const player=new LessonPlayer({...options,draftKey:ctx.draftKey});player.selectActivity(task.index);player.setStage('try');player.requestHint();
 assert.equal(player.currentHint.level,1);
 let count=0;while(player.session.expected){const move=player.session.expected,result=player.attempt(move.from,move.to,move.promotion);assert.equal(result.status,'correct');count++;}
 assert.ok(count>0);assert.equal(store.getItem(normal.storageKey),original);
 if(player.plan.questions.some(q=>q.required))assert.equal(player.storedComplete,false);
 const resumed=new LessonPlayer({...options,draftKey:ctx.draftKey});assert.equal(resumed.session.completed,true);
 assert.equal(daily.done(day.date,task.id),false);daily.solve(day.date,task.id);assert.equal(daily.done(day.date,task.id),true);
});
test('invalid links do not attach daily progress to unrelated lessons; unavailable storage works in memory',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},daily=make(blocked),day=daily.today(),task=day.tasks[0];
 assert.equal(daily.context('tactics',task.lessonId,new URLSearchParams(daily.link(day.date,task).split('?')[1])),null);
 daily.start(day.date,task.id);assert.equal(daily.solve(day.date,task.id),true);assert.equal(daily.done(day.date,task.id),true);
});
test('personal training excludes samples, missing positions, wrong-position evidence and searches below depth 19',()=>{
 const pgn='1. e4 e5 *',parsed=parseGame(pgn),entries=[{game:{pgn},demo:false}];
 const scores=[{cp:100,best:'d2d4',depth:19},{cp:-100,best:'e7e5',depth:19},{cp:-100,best:'g1f3',depth:19}].map((score,i)=>({...score,mate:null,rootFen:parsed.fens[i]}));
 assert.equal(reviewedDailyMistakes(entries,()=>scores).length,1);
 const named={game:{pgn,white:{username:'Alpha'},black:{username:'Beta'}},demo:false};
 assert.equal(reviewedDailyMistakes([named],()=>scores,'alpha')[0]?.source,'reviewed-move');
 assert.equal(reviewedDailyMistakes([named],()=>scores,'bEtA').length,0);
 assert.equal(reviewedDailyMistakes([{...named,color:'b'}],()=>scores).length,0);
 assert.equal(reviewedDailyMistakes([{game:{pgn},demo:true}],()=>scores).length,0);
 for(const broken of [[{...scores[0],depth:18},...scores.slice(1)],[scores[0],null,scores[2]],[{...scores[0],rootFen:parsed.fens[1]},...scores.slice(1)]])assert.equal(reviewedDailyMistakes(entries,()=>broken).length,0);
});

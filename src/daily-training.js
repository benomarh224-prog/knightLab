import { Chess } from 'chess.js';
import { lessonPlan } from './lesson-player.js';
import { OpeningLesson, createCourseProgress } from './opening-course.js';
import {parseGame} from './game.js';
import {collectTraining} from './training.js';
import {depthReady,PRECISION_DEPTH} from './review-quality.js';
import {createAdaptiveTraining} from './adaptive-training.js';
import {localTrainingDate,trainingDateAfter} from './training-calendar.js';
import {OpeningTestSession} from './opening-training.js';
import {reviewPlayerColor} from './review-memory.js';
export {localTrainingDate} from './training-calendar.js';

const KEY='roqvyn-daily-training-v1';
export const DAILY_LEVELS=['beginner','intermediate','advanced'];
const hash=text=>{let n=2166136261;for(const char of text){n^=char.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(36);};
const openingTaskId=(position,source)=>`opening-${hash(position+(source?'|'+source:''))}`;
const mistakeTaskId=exercise=>`mistake-${hash(exercise.fen+exercise.solution)}`;
const isPosition=value=>typeof value==='string'&&/^[prnbqkPRNBQK1-8/]+ [wb] (?:-|[KQkq]+) (?:-|[a-h][36])$/.test(value);
const isMove=value=>typeof value==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value);
function openingTask(item){
  if(!item)return null;
  const {position,source}=item;
  return {id:openingTaskId(position,source),kind:'opening',position,source,title:source?'Try a related position':'Opening recall',
    detail:'Opening review',reason:source?'Use what you learned in a new position':'Recall a position from your Opening Test'};
}
export function reviewedDailyMistakes(entries,load,username){
  return entries.filter(entry=>!entry.demo).flatMap(entry=>{
    try{
      const parsed=parseGame(entry.game.pgn),scores=load(entry.game.pgn,parsed.fens.length);
      const ready=scores.map((score,index)=>depthReady(score,PRECISION_DEPTH)&&score.rootFen===parsed.fens[index]?score:null);
      const side=reviewPlayerColor(entry.game,username)??(['w','b'].includes(entry.color)?entry.color:null);
      return collectTraining(parsed,ready,side).exercises.map(exercise=>({...exercise,source:side?'reviewed-move':'reviewed-game'}));
    }catch{return [];}
  }).slice(0,20);
}
export function mistakeTask(exercise){
  const fromTest = exercise.source === 'level-test';
  const fromUnassignedGame = exercise.source === 'reviewed-game';
  const followup = exercise.source === 'followup';
  return { id:mistakeTaskId(exercise), kind:'mistake', exercise,
    title:fromTest || followup ? exercise.title : fromUnassignedGame ? 'A moment from a reviewed game' : 'A moment from your game',
    detail:fromTest ? 'From your Level Test' : followup ? 'Related practice' : fromUnassignedGame ? 'Reviewed game' : 'Your reviewed mistakes',
    reason:followup ? 'Apply the same idea' : 'Find the engine’s alternative' };
}
export function validDailyMistake(exercise){
  try{
    if(!exercise||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(exercise.solution))return false;
    const chess=new Chess(exercise.fen);
    return chess.turn()===exercise.color&&Boolean(chess.move({from:exercise.solution.slice(0,2),to:exercise.solution.slice(2,4),promotion:exercise.solution[4]}));
  }catch{return false;}
}
export function dailyPracticeTask(courses,courseId,lessonId,index=0){
  try{
    const course=courses[courseId],lesson=course?.lessons.find(item=>item.id===lessonId);
    if(!lesson)return null;
    const plan=lessonPlan(lesson,course.study?.(lesson.id)),activity=plan.activities[index];
    if(activity?.kind!=='practice')return null;
    const session=new OpeningLesson(activity);session.practice({startPly:activity.startPly});
    if(!session.expected||session.completed)return null;
    return {id:`practice-${courseId}-${lessonId}-${index}`,kind:'practice',courseId,lessonId,index,signature:plan.signature,
      title:lesson.title,detail:course.title,reason:'Practice one idea',level:lesson.level||null};
  }catch{return null;}
}
function taskValid(task,courses){
  if(task?.kind==='mistake')return validDailyMistake(task.exercise)&&task.id===mistakeTaskId(task.exercise);
  if(task?.kind==='opening')return isPosition(task.position)&&(task.source===null||isPosition(task.source)&&task.source!==task.position)&&task.id===openingTaskId(task.position,task.source);
  const current=dailyPracticeTask(courses,task?.courseId,task?.lessonId,task?.index);
  return Boolean(current&&current.id===task.id&&current.signature===task.signature);
}
export function createDailyTraining({storage,courses,learningMemory,openingReview,now=()=>new Date()}){
  let state;try{state=JSON.parse(storage?.getItem(KEY)||'null');}catch{}
  const adaptive=createAdaptiveTraining({storage,courses,now});
  state={version:1,level:adaptive.bands.some(b=>b.value===state?.level)?state.level:null,days:Array.isArray(state?.days)?state.days.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day?.date)&&Array.isArray(day.tasks)&&day.tasks.length>0&&day.tasks.length<=(day.merged?24:3)&&day.tasks.every(task=>taskValid(task,courses))).slice(-35).map(day=>({...day,done:Array.isArray(day.done)?day.done.filter(id=>day.tasks.some(task=>task.id===id)):[],started:day.started===true,
    opened:Array.isArray(day.opened)?day.opened.filter(id=>day.tasks.some(task=>task.id===id)):day.started?day.tasks.map(task=>task.id):[],choice:day.choice||day.level||'auto'})):[]};
  const save=()=>{try{storage?.setItem(KEY,JSON.stringify(state));}catch{}};
  const completed=course=>createCourseProgress(storage,course.lessons.map(lesson=>lesson.id),course.key).read();
  const practiced=()=>new Set(state.days.flatMap(day=>day.done));
  function personalFor(mistakes,date){
    const pool=new Map();
    for(const exercise of mistakes){
      if(!validDailyMistake(exercise))continue;
      const id=mistakeTaskId(exercise);
      if(!pool.has(id))pool.set(id,exercise);
    }
    const done=practiced(),yesterday=state.days.find(day=>day.date===trainingDateAfter(date,-1));
    const previous=new Set(yesterday?.tasks.filter(task=>task.kind==='mistake').map(task=>task.id));
    const fresh=[...pool].filter(([id])=>!previous.has(id));
    const choices=fresh.length?fresh:[...pool];
    return (choices.find(([id])=>!done.has(id))||choices[parseInt(hash(date).slice(0,4),36)%(choices.length||1)])?.[1];
  }
  function initialBand(){
    if(state.level)return state.level;
    const last=learningMemory?.last?.(),preferred=courses[last?.courseId],track=preferred?.training?.adaptive?preferred:Object.values(courses).find(c=>c.training?.adaptive);
    if(!track)return null;
    const done=completed(track),pending=track.lessons.find(l=>!done.includes(l.id));
    return `${track.id}:${pending?.level||track.levels.at(-1)}`;
  }
  adaptive.ensure(initialBand());
  const level=()=>adaptive.recommendation().band?.level||'beginner';
  function choose(course,date,{level:filterLevel,exclude=[],skill,freshOnly=false}={}){
    if(!course)return null;
    const done=completed(course),pool=course.lessons.filter(lesson=>(!filterLevel||lesson.level===filterLevel)&&!exclude.includes(lesson.id));
    let tasks=pool.flatMap(lesson=>{
      try{return lessonPlan(lesson,course.study?.(lesson.id)).activities.map((_,index)=>dailyPracticeTask(courses,course.id,lesson.id,index)).filter(Boolean);}catch{return [];}
    }),dailyDone=practiced();
    if(skill){const matching=tasks.filter(task=>adaptive.meta(task)?.skill===skill);if(matching.length)tasks=matching;}
    if(freshOnly){const seen=adaptive.seenIds();tasks=tasks.filter(task=>!seen.has(task.id)&&!dailyDone.has(task.id));}
    const pending=tasks.filter(task=>!done.includes(task.lessonId)&&!dailyDone.has(task.id)),fresh=tasks.filter(task=>!dailyDone.has(task.id));
    return pending[0]||fresh[0]||tasks[tasks.length?parseInt(hash(date).slice(0,4),36)%tasks.length:0]||null;
  }
  function challenge(date,tasks=[],{freshOnly=false}={}){
    const rec=adaptive.recommendation(),course=courses[rec.band?.courseId];
    const task=choose(course,date,{level:rec.band?.level,skill:rec.skill,exclude:tasks.filter(t=>t.courseId===course?.id).map(t=>t.lessonId),freshOnly});
    return task?{...task,reason:rec.skill&&adaptive.meta(task)?.skill===rec.skill?'Another position to practice the idea':'Difficulty adapts as you solve'}:null;
  }
  function today({mistakes=[]}={}){
    const date=localTrainingDate(now());let day=state.days.find(item=>item.date===date);
    const recall=!day?.started&&!day?.tasks.some(task=>task.kind==='opening')?openingTask(openingReview?.due(date)):null;
    if(day){
      if(!day.started){const band=adaptive.recommendation().band;for(let i=0;i<day.tasks.length;i++){const task=day.tasks[i];if(courses[task.courseId]?.training?.adaptive&&`${task.courseId}:${task.level}`!==band?.id){const replacement=challenge(date,day.tasks);if(replacement)day.tasks[i]=replacement;}}}
      if(recall){if(day.tasks.length<3)day.tasks.unshift(recall);else if(day.tasks[0].kind==='practice')day.tasks[0]=recall;}
      if(!day.started&&day.tasks.at(-1)?.kind!=='opening'&&!day.tasks.some(task=>task.kind==='mistake')){
        const personal=personalFor(mistakes,date);
        if(personal)day.tasks[day.tasks.length-1]=mistakeTask(personal);
      }
      save();return day;
    }
    const tasks=[],used=new Set();
    const add=task=>{if(task&&!used.has(task.id)){used.add(task.id);tasks.push(task);}};
    const pending=learningMemory?.review()||[];
    const tracked=adaptive.trackedIds(),due=adaptive.due(date).find(task=>task.kind==='practice'||task.kind==='mistake'&&task.exercise.source!=='followup')||pending.filter(entry=>entry.kind==='practice').map(entry=>dailyPracticeTask(courses,entry.courseId,entry.lessonId,entry.index)).find(task=>task&&!tracked.has(task.id));
    if(recall)add(recall);
    else if(due)add({...due,reason:'Spaced review · Try the idea again'});
    else if(adaptive.recommendation().band?.id!==adaptive.bands[0]?.id)add(challenge(date));
    else add(choose(Object.values(courses).find(course=>course.category==='beginners'),date));
    add(challenge(date,tasks));
    const personal=tasks.some(task=>task.kind==='mistake') ? null : personalFor(mistakes,date);
    if(personal)add(mistakeTask(personal));
    else {
      const last=learningMemory?.last?.(),preferred=courses[last?.courseId];
      const opening=preferred?.category==='openings'?preferred:Object.values(courses).find(course=>course.category==='openings');
      add(choose(opening,date,{exclude:tasks.filter(task=>task.courseId===opening?.id).map(task=>task.lessonId)}));
    }
    day={date,level:level(),choice:'auto',tasks,done:[],opened:[],started:false};state.days.push(day);state.days=state.days.slice(-35);save();return day;
  }
  return {
    today,level,weeklyEvidence:adaptive.weeklyEvidence,practiceMeta:adaptive.meta,
    helpReview:exercise=>adaptive.help(mistakeTask(exercise)),
    recordReview:(exercise,outcome)=>adaptive.record(mistakeTask(exercise),outcome),
    recordEndgame:(technique,outcome)=>adaptive.record({kind:'endgame',id:`endgame-${technique.id}`},outcome),
    choices:()=>[{value:'auto',label:'Automatic'},...adaptive.bands.map(b=>({value:b.value,label:b.label}))],
    setLevel(value){const day=state.days.find(item=>item.date===localTrainingDate(now()));if(day?.started||value!=='auto'&&!adaptive.setBand(value))return false;state.level=value==='auto'?null:value;state.days=state.days.filter(item=>item!==day);save();const next=today();next.choice=value;save();return true;},
    get(date){return state.days.find(day=>day.date===date)||null;},
    start(date,id){const day=state.days.find(item=>item.date===date);if(!day?.tasks.some(task=>task.id===id))return false;day.started=true;if(!day.opened.includes(id))day.opened.push(id);save();return true;},
    solve(date,id,outcome){const day=state.days.find(item=>item.date===date),task=day?.tasks.find(t=>t.id===id);if(!day?.started||!task||task.kind==='opening')return false;if(day.done.includes(id))return true;day.done.push(id);
      const evidence=outcome?adaptive.record(task,outcome):adaptive.result(task,date);
      if(date===localTrainingDate(now())&&evidence&&evidence.quality!=='unknown'&&adaptive.meta(task)?.band){
        const index=day.tasks.findIndex(t=>t.kind==='practice'&&!day.done.includes(t.id)&&!day.opened.includes(t.id));
        const replacement=index>=0?challenge(date,day.tasks,{freshOnly:true}):null;
        if(replacement)day.tasks[index]=replacement;
      }
      save();return true;},
    observe(event){const task=dailyPracticeTask(courses,event.courseId,event.lessonId,event.index);if(!task)return null;return event.kind==='help'?adaptive.help(task):event.kind==='complete'?adaptive.record(task,event.outcome):null;},
    helpTask(date,id){const task=state.days.find(day=>day.date===date)?.tasks.find(task=>task.id===id);return task?adaptive.help(task):false;},
    report(date){const day=state.days.find(d=>d.date===date);if(!day)return null;
      const opening=day.tasks.filter(task=>task.kind==='opening'&&day.done.includes(task.id));
      return {...adaptive.summary(date,day.done.filter(id=>!opening.some(task=>task.id===id))),
        opening:opening.length, openingMatched:opening.filter(task=>day.openingAnswers?.[task.id]?.matched===true).length};},
    done(date,id){return Boolean(state.days.find(day=>day.date===date)?.done.includes(id));},
    next(date){const day=state.days.find(item=>item.date===date);return day?.tasks.find(task=>!day.done.includes(task.id))||null;},
    context(courseId,lessonId,query){const day=state.days.find(item=>item.date===query.get('daily')),task=day?.tasks.find(item=>item.id===query.get('task'));return task?.kind==='practice'&&task.courseId===courseId&&task.lessonId===lessonId?{date:day.date,task,draftKey:`${KEY}:draft:${day.date}:${task.id}`}:null;},
    openingContext(query){
      const day=state.days.find(item=>item.date===query.get('daily')),task=day?.tasks.find(item=>item.id===query.get('task'));
      const question=task?.kind==='opening'?openingReview?.question(task.position):null;
      if(!question)return null;
      return {date:day.date,task,question,answer:day.openingAnswers?.[task.id]||null,complete:day.done.includes(task.id)};
    },
    solveOpening(context,move){
      const day=state.days.find(item=>item.date===context.date),task=day?.tasks.find(item=>item.id===context.task.id);
      if(task?.kind!=='opening'||!day.opened.includes(task.id)||!isMove(move))return null;
      if(day.done.includes(task.id))return day.openingAnswers?.[task.id]||null;
      const question=openingReview?.question(task.position);
      const result=question&&new OpeningTestSession([question]).attempt(move.slice(0,2),move.slice(2,4),move[4]);
      if(!result)return null;
      const schedule=openingReview.record(question,result,{source:task.source});
      const answer={move,matched:result.matched,schedule};
      day.openingAnswers={...day.openingAnswers,[task.id]:answer};day.done.push(task.id);save();
      return answer;
    },
    link(date,task){const query=new URLSearchParams({daily:date,task:task.id});
      if(task.kind==='opening')return `/train/opening-test/?${query}`;
      query.set('lesson',task.lessonId);return `${courses[task.courseId].path}?${query}`;},
  };
}

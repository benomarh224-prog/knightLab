import { Chess } from 'chess.js';
import { lessonPlan } from './lesson-player.js';
import { OpeningLesson, createCourseProgress } from './opening-course.js';
import {parseGame} from './game.js';
import {collectTraining} from './training.js';
import {depthReady,PRECISION_DEPTH} from './review-quality.js';

const KEY='roqvyn-daily-training-v1';
export const DAILY_LEVELS=['beginner','intermediate','advanced'];
export function localTrainingDate(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
const hash=text=>{let n=2166136261;for(const char of text){n^=char.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(36);};
export function reviewedDailyMistakes(entries,load){
  return entries.filter(entry=>!entry.demo).flatMap(entry=>{
    try{
      const parsed=parseGame(entry.game.pgn),scores=load(entry.game.pgn,parsed.fens.length);
      const ready=scores.map((score,index)=>depthReady(score,PRECISION_DEPTH)&&score.rootFen===parsed.fens[index]?score:null);
      return collectTraining(parsed,ready).exercises;
    }catch{return [];}
  }).slice(0,20);
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
  if(task?.kind==='mistake')return validDailyMistake(task.exercise)&&task.id===`mistake-${hash(task.exercise.fen+task.exercise.solution)}`;
  const current=dailyPracticeTask(courses,task?.courseId,task?.lessonId,task?.index);
  return Boolean(current&&current.id===task.id&&current.signature===task.signature);
}
export function createDailyTraining({storage,courses,learningMemory,now=()=>new Date()}){
  let state;try{state=JSON.parse(storage?.getItem(KEY)||'null');}catch{}
  state={version:1,level:DAILY_LEVELS.includes(state?.level)?state.level:null,days:Array.isArray(state?.days)?state.days.filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day?.date)&&Array.isArray(day.tasks)&&day.tasks.length>0&&day.tasks.length<=3&&day.tasks.every(task=>taskValid(task,courses))).slice(-35).map(day=>({...day,done:Array.isArray(day.done)?day.done.filter(id=>day.tasks.some(task=>task.id===id)):[],started:day.started===true})):[]};
  const save=()=>{try{storage?.setItem(KEY,JSON.stringify(state));}catch{}};
  const completed=course=>createCourseProgress(storage,course.lessons.map(lesson=>lesson.id),course.key).read();
  const practiced=()=>new Set(state.days.flatMap(day=>day.done));
  function personalFor(mistakes,date){
    const pool=mistakes.filter(validDailyMistake),done=practiced();
    return pool.find(item=>!done.has(`mistake-${hash(item.fen+item.solution)}`))||pool[pool.length?parseInt(hash(date).slice(0,4),36)%pool.length:0];
  }
  function level(){
    if(state.level)return state.level;
    const tactics=Object.values(courses).find(course=>course.levels?.length);
    if(!tactics)return 'beginner';
    const done=completed(tactics),dailyDone=practiced();
    return DAILY_LEVELS.find(name=>{const lessons=tactics.lessons.filter(lesson=>lesson.level===name);return lessons.some(lesson=>!done.includes(lesson.id)&&!dailyDone.has(`practice-${tactics.id}-${lesson.id}-0`));})||'advanced';
  }
  function choose(course,date,{level:filterLevel,exclude=[]}={}){
    if(!course)return null;
    const done=completed(course),pool=course.lessons.filter(lesson=>(!filterLevel||lesson.level===filterLevel)&&!exclude.includes(lesson.id));
    const tasks=pool.flatMap(lesson=>{
      try{return lessonPlan(lesson,course.study?.(lesson.id)).activities.map((_,index)=>dailyPracticeTask(courses,course.id,lesson.id,index)).filter(Boolean);}catch{return [];}
    }),dailyDone=practiced();
    const pending=tasks.filter(task=>!done.includes(task.lessonId)&&!dailyDone.has(task.id)),fresh=tasks.filter(task=>!dailyDone.has(task.id));
    return pending[0]||fresh[0]||tasks[tasks.length?parseInt(hash(date).slice(0,4),36)%tasks.length:0]||null;
  }
  function today({mistakes=[]}={}){
    const date=localTrainingDate(now());let day=state.days.find(item=>item.date===date);
    if(day){
      const personal=personalFor(mistakes,date);
      if(!day.started&&personal&&!day.tasks.some(task=>task.kind==='mistake')){
        day.tasks[day.tasks.length-1]={id:`mistake-${hash(personal.fen+personal.solution)}`,kind:'mistake',title:'A moment from your game',detail:'Your reviewed mistakes',reason:'Find the engine’s alternative',exercise:personal};save();
      }
      return day;
    }
    const tasks=[],used=new Set();
    const add=task=>{if(task&&!used.has(task.id)){used.add(task.id);tasks.push(task);}};
    const pending=learningMemory?.review()||[];
    const due=pending.filter(entry=>entry.kind==='practice').map(entry=>dailyPracticeTask(courses,entry.courseId,entry.lessonId,entry.index)).find(Boolean);
    if(due)add({...due,reason:'Revisit an idea you practiced with help'});
    else add(choose(Object.values(courses).find(course=>course.category==='beginners'),date));
    const tactics=Object.values(courses).find(course=>course.levels?.length);
    add(choose(tactics,date,{level:level(),exclude:tasks.filter(task=>task.courseId===tactics?.id).map(task=>task.lessonId)}));
    const personal=personalFor(mistakes,date);
    if(personal)add({id:`mistake-${hash(personal.fen+personal.solution)}`,kind:'mistake',title:'A moment from your game',detail:'Your reviewed mistakes',reason:'Find the engine’s alternative',exercise:personal});
    else {
      const last=learningMemory?.last(),preferred=courses[last?.courseId];
      const opening=preferred?.category==='openings'?preferred:Object.values(courses).find(course=>course.category==='openings');
      add(choose(opening,date,{exclude:tasks.filter(task=>task.courseId===opening?.id).map(task=>task.lessonId)}));
    }
    day={date,level:level(),tasks,done:[],started:false};state.days.push(day);state.days=state.days.slice(-35);save();return day;
  }
  return {
    today,level,
    setLevel(value){const day=state.days.find(item=>item.date===localTrainingDate(now()));if(!DAILY_LEVELS.includes(value)||day?.started)return false;state.level=value;state.days=state.days.filter(item=>item!==day);save();return true;},
    get(date){return state.days.find(day=>day.date===date)||null;},
    start(date,id){const day=state.days.find(item=>item.date===date);if(!day?.tasks.some(task=>task.id===id))return false;day.started=true;save();return true;},
    solve(date,id){const day=state.days.find(item=>item.date===date);if(!day?.started||!day.tasks.some(task=>task.id===id))return false;if(!day.done.includes(id))day.done.push(id);save();return true;},
    done(date,id){return Boolean(state.days.find(day=>day.date===date)?.done.includes(id));},
    next(date){const day=state.days.find(item=>item.date===date);return day?.tasks.find(task=>!day.done.includes(task.id))||null;},
    context(courseId,lessonId,query){const day=state.days.find(item=>item.date===query.get('daily')),task=day?.tasks.find(item=>item.id===query.get('task'));return task?.kind==='practice'&&task.courseId===courseId&&task.lessonId===lessonId?{date:day.date,task,draftKey:`${KEY}:draft:${day.date}:${task.id}`}:null;},
    link(date,task){const query=new URLSearchParams({lesson:task.lessonId,daily:date,task:task.id});return `${courses[task.courseId].path}?${query}`;},
  };
}

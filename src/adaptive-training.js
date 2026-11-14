import {Chess} from 'chess.js';
import {lessonPlan} from './lesson-player.js';
import {lessonDisplay} from './lesson-insight.js';
import {localTrainingDate,trainingDateAfter} from './training-calendar.js';
import {ENDGAMES} from './endgame-lab.js';
import {practiceTheme,practiceThemeLabel} from './practice-themes.js';

const KEY='roqvyn-adaptive-training-v1',datePattern=/^\d{4}-\d{2}-\d{2}$/;
const count=value=>Number.isFinite(value)?Math.max(0,Math.min(10000,Math.floor(value))):0;
export function trainingBands(courses){
  return Object.values(courses).filter(course=>course.training?.adaptive&&course.levels?.length).sort((a,b)=>a.training.order-b.training.order).flatMap(course=>course.levels.map(level=>({id:`${course.id}:${level}`,courseId:course.id,level,label:`${course.title} · ${course.levelLabels?.[level]||level[0].toUpperCase()+level.slice(1)}`,value:course.training.legacyLevels?level:`${course.id}:${level}`})));
}
export function practiceOutcome({hints=0,alternatives=0,reviewed=false,known=true}={}){
  const helped=count(hints)>0||count(alternatives)>0||reviewed===true;
  return {quality:helped?'supported':known===false?'unknown':'independent',hints:count(hints),alternatives:count(alternatives),reviewed:reviewed===true};
}
function practiceMeta(courses,task){
  if(task?.kind==='endgame'){
    const technique=ENDGAMES.find(item=>task.id===`endgame-${item.id}`);
    return technique&&{key:task.id,signature:technique.fen,skill:task.id,name:technique.title,band:null};
  }
  if(task?.kind==='mistake'){
    try{
      const e=task.exercise,b=new Chess(e.fen);
      if(b.turn()!==e.color||!b.move({from:e.solution.slice(0,2),to:e.solution.slice(2,4),promotion:e.solution[4]}))return null;
      const theme=practiceTheme(e.fen,e.solution);
      return {key:task.id,signature:e.fen+e.solution,skill:theme?`theme-${theme}`:'reviewed-games',name:practiceThemeLabel(theme)||'positions from your games',band:null};
    }catch{return null;}
  }
  if(task?.kind!=='practice'||task.id!==`practice-${task.courseId}-${task.lessonId}-${task.index}`)return null;
  const course=courses[task?.courseId],lesson=course?.lessons.find(l=>l.id===task.lessonId);if(!lesson)return null;
  const plan=lessonPlan(lesson,course.study?.(lesson.id));if(plan.signature!==task.signature||plan.activities[task.index]?.kind!=='practice')return null;
  const display=lessonDisplay(course,lesson,course.study?.(lesson.id)),group=display.group||course.title;
  return {key:task.id,signature:task.signature,skill:group.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:group,band:course.training?.adaptive?`${course.id}:${lesson.level}`:null};
}

// Training evidence is separate from earned lesson completions. No engine rating,
// quiz requirement or accuracy formula is changed by this local scheduler.
export function createAdaptiveTraining({storage,courses,now=()=>new Date()}){
  const bands=trainingBands(courses),metadata=new Map();let state={version:1,band:null,streak:0,records:{},events:[]};
  const valid=task=>{try{const key=JSON.stringify([task?.kind,task?.id,task?.signature,task?.courseId,task?.lessonId,task?.index,task?.exercise]);if(!metadata.has(key))metadata.set(key,practiceMeta(courses,task));return metadata.get(key);}catch{return null;}};
  function read(){
    try{const raw=JSON.parse(storage?.getItem(KEY)||'null');if(raw?.version===1){state={version:1,band:bands.some(b=>b.id===raw.band)?raw.band:null,streak:Math.min(1,count(raw.streak)),records:{},events:[]};
      for(const [key,value] of Object.entries(raw.records||{}).slice(-1000)){const meta=valid(value?.task);if(meta&&meta.key===key&&meta.signature===value.signature)state.records[key]={...value,meta,interval:count(value.interval),independent:count(value.independent),supported:count(value.supported),due:datePattern.test(value.due)?value.due:null};}
      const seen=new Set();state.events=(Array.isArray(raw.events)?raw.events:[]).filter(event=>{const id=`${event?.date}:${event?.key}`,ok=datePattern.test(event?.date)&&['independent','supported','unknown'].includes(event.quality)&&state.records[event.key]?.signature===event.signature&&!seen.has(id);if(ok)seen.add(id);return ok;}).slice(-300).map(event=>({...event,skill:state.records[event.key].meta.skill,name:state.records[event.key].meta.name,band:state.records[event.key].meta.band}));
    }}catch{/* Keep the in-memory session if storage is unavailable. */}
    return state;
  }
  const save=()=>{try{storage?.setItem(KEY,JSON.stringify(state));}catch{}};
  function recordFor(task){const meta=valid(task);if(!meta)return null;const old=state.records[meta.key];if(old?.signature===meta.signature)return old;return state.records[meta.key]={task,signature:meta.signature,meta,interval:0,independent:0,supported:0};}
  function ensure(id){read();if(!state.band){state.band=bands.find(b=>b.id===id||b.value===id)?.id||bands[0]?.id||null;save();}return bands.find(b=>b.id===state.band)||null;}
  function result(task,date){read();return state.events.find(event=>event.key===task.id&&event.date===date)||null;}
  function help(task){read();const record=recordFor(task);if(!record)return false;const date=localTrainingDate(now());record.helpDate=date;
    if(record.meta.band===state.band)state.streak=0;
    const due=trainingDateAfter(date,2);if(!record.due||record.due>due)record.due=due;save();return true;
  }
  function record(task,outcome){
    read();const row=recordFor(task);if(!row)return null;const date=localTrainingDate(now()),existing=state.events.find(e=>e.key===task.id&&e.date===date);
    // A same-day replay cannot erase help or farm difficulty increases.
    if(existing)return existing;
    const measured=practiceOutcome(outcome),quality=row.helpDate===date?'supported':measured.quality;
    const event={key:task.id,date,signature:row.signature,...measured,quality,skill:row.meta.skill,name:row.meta.name,band:row.meta.band};state.events.push(event);state.events=state.events.slice(-300);
    const previous=state.events.slice(0,-1).findLast(e=>e.skill===event.skill);event.improved=quality==='independent'&&previous?.quality==='supported';
    if(quality!=='unknown'){
      row.last=date;row.lastQuality=quality;
      if(quality==='supported'){row.supported++;row.interval=2;state.streak=0;}
      else {row.independent++;row.interval=row.interval?Math.min(30,Math.max(4,row.interval*2)):7;}
      row.due=trainingDateAfter(date,row.interval);
      const position=bands.findIndex(b=>b.id===state.band),attempt=bands.findIndex(b=>b.id===row.meta.band);
      if(attempt>position){state.band=bands[quality==='supported'?Math.max(0,attempt-1):attempt].id;state.streak=quality==='independent'?1:0;}
      else if(attempt>=0&&attempt===position){
        if(quality==='supported'){state.band=bands[Math.max(0,position-1)].id;state.streak=0;}
        else if(++state.streak>=2){state.band=bands[Math.min(bands.length-1,position+1)].id;state.streak=0;}
      }
    }
    save();return event;
  }
  function recommendation(){
    read();const band=bands.find(b=>b.id===state.band)||bands[0],last=state.events.findLast(e=>e.quality==='supported'&&e.band);
    const recent=state.events.slice(-6),unresolved=last&&!recent.some(e=>e.skill===last.skill&&e.date>last.date&&e.quality==='independent');
    return {band,skill:unresolved?last.skill:null,name:unresolved?last.name:null};
  }
  function due(date=localTrainingDate(now())){read();return Object.values(state.records).filter(r=>r.due&&r.due<=date&&!state.events.some(e=>e.key===r.task.id&&e.date===date)).sort((a,b)=>a.due.localeCompare(b.due)||Number(b.lastQuality==='supported')-Number(a.lastQuality==='supported')).map(r=>r.task);}
  function summary(date,taskIds){
    read();const selected=state.events.filter(e=>e.date===date&&taskIds.includes(e.key)),independent=selected.filter(e=>e.quality==='independent'),supported=selected.filter(e=>e.quality==='supported');
    const recent=state.events.filter(e=>e.quality==='supported').slice(-12),focus=recent.findLast(e=>!state.events.some(later=>later.skill===e.skill&&later.date>e.date&&later.quality==='independent'));
    const improvement=independent.find(e=>e.improved);
    return {independent:independent.length,supported:supported.length,unknown:taskIds.length-independent.length-supported.length,
      progress:improvement?`Progress: you solved ${improvement.name.toLowerCase()} without help after an earlier supported attempt.`:independent.length?`Solved independently: ${[...new Set(independent.map(e=>e.name.toLowerCase()))].join(', ')}.`:'Hints and retries show which ideas to revisit.',
      focus:focus?`Next focus: ${focus.name.toLowerCase()}. A different position will help you practice the idea.`:'Next focus: a new position at your current difficulty.',band:bands.find(b=>b.id===state.band)?.label||''};
  }
  function weeklyEvidence(){
    read();
    const today=localTrainingDate(now()),start=trainingDateAfter(today,-6);
    return state.events.filter(event=>event.date>=start&&event.date<=today)
      .map(event=>({...event,task:state.records[event.key].task}));
  }
  return {bands,ensure,help,record,result,due,recommendation,summary,weeklyEvidence,
    setBand(value){read();const band=bands.find(b=>b.id===value||b.value===value);if(!band)return false;state.band=band.id;state.streak=0;save();return true;},
    has(task){read();return Boolean(state.records[task.id]);},
    seen(task){read();return state.events.some(e=>e.key===task.id);},
    seenIds(){read();return new Set([...Object.values(state.records).filter(row=>row.last).map(row=>row.task.id),...state.events.map(event=>event.key)]);},
    trackedIds(){read();return new Set(Object.keys(state.records));},
    meta:valid,
  };
}

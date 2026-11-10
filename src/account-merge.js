const unique=(items,key=x=>x)=>[...new Map(items.map(item=>[key(item),item])).values()];
const parse=text=>{try{return JSON.parse(text);}catch{return null;}};
const union=(a=[],b=[])=>unique([...a,...b]);
function draft(a,b,key){
  if(a?.signature!==b?.signature)return b;
  const result={...a,seen:union(a.seen,b.seen)};
  result.activities=(a.activities||[]).map((v,i)=>{const old=b.activities?.[i]||{};if((old.runId||'legacy')!==(v.runId||'legacy')){const newer=(old.runStarted||0)>(v.runStarted||0)?old:v;return {...newer,done:old.done||v.done};}return {...v,correct:Math.max(old.correct||0,v.correct||0),done:old.done||v.done,hints:Math.max(old.hints||0,v.hints||0),mistakes:Math.max(old.mistakes||0,v.mistakes||0),alternatives:Math.max(old.alternatives||0,v.alternatives||0),viewed:old.viewed||v.viewed,tracked:old.tracked===true&&v.tracked===true};});
  const expected=correctAnswers(key);
  result.answers=(a.answers||[]).map((answer,i)=>Number.isInteger(expected[i])&&b.answers?.[i]===expected[i]?b.answers[i]:answer);
  // Answers are chosen by the receiving lesson's actual question data, not by
  // treating an arbitrary answer as correct. Completion arrays remain separate.
  return result;
}
function day(a,b){
  const done=union(a.done,b.done),opened=union(a.opened||[],b.opened||[]),tasks=unique([...(b.tasks||[]),...(a.tasks||[])],t=>t.id);
  return {...b,tasks,done:done.filter(id=>tasks.some(t=>t.id===id)),opened:opened.filter(id=>tasks.some(t=>t.id===id)),started:a.started||b.started,merged:tasks.length>3||a.merged||b.merged};
}
function adaptive(a,b){
  const events=unique([...(a.events||[]),...(b.events||[])],e=>`${e.date}:${e.key}`);
  for(const event of events){const old=a.events?.find(e=>e.date===event.date&&e.key===event.key);if(old?.quality==='supported')event.quality='supported';}
  events.sort((x,y)=>x.date.localeCompare(y.date));
  const records={...a.records,...b.records};for(const [key,v] of Object.entries(records)){const old=a.records?.[key];if(old?.signature===v.signature)records[key]={...v,due:[old.due,v.due].filter(Boolean).sort()[0],independent:Math.max(old.independent||0,v.independent||0),supported:Math.max(old.supported||0,v.supported||0)};}
  return {...b,records,events:events.slice(-300),streak:0};
}
export function mergeAccountValue(key,local,remote){
  if(local===remote||local===null)return remote;if(remote===null)return local;
  const a=parse(local),b=parse(remote);if(a===null||b===null)return local;
  try{
    if(/-course-v1$/.test(key)&&Array.isArray(a)&&Array.isArray(b))return JSON.stringify(union(a,b));
    if(key.includes(':lesson-player-v1:')||key.includes(':draft:'))return JSON.stringify(draft(a,b,key));
    if(key.includes(':square-practice-v1:')&&a.signature===b.signature)return JSON.stringify({...b,solved:union(a.solved,b.solved)});
    if(key==='knightlab-learning-memory-v1')return JSON.stringify({...b,lastByCourse:{...a.lastByCourse,...b.lastByCourse},review:unique([...(b.review||[]),...(a.review||[])],e=>`${e.courseId}:${e.lessonId}:${e.kind}:${e.index}`).slice(0,100)});
    if(key==='knightlab-review-memory-v1')return JSON.stringify(unique([...b,...a],e=>e.game.pgn).slice(0,8));
    if(key==='knightlab-review-evidence-v1'){
      const entries=unique([...b,...a],e=>e.pgn+e.mode);for(const entry of entries){const x=a.find(e=>e.pgn===entry.pgn&&e.mode===entry.mode),y=b.find(e=>e.pgn===entry.pgn&&e.mode===entry.mode);if(x&&y)entry.scores=Array.from({length:Math.max(x.scores.length,y.scores.length)},(_,i)=>{const p=x.scores[i],q=y.scores[i];return !p?q:!q?p:(q.depth||0)>=(p.depth||0)?q:p;});}return JSON.stringify(entries.slice(0,8));
    }
    if(key==='roqvyn-daily-training-v1'){const days=unique([...(b.days||[]).filter(d=>d.started),...(a.days||[])],d=>d.date);for(let i=0;i<days.length;i++){const x=a.days?.find(d=>d.date===days[i].date),y=b.days?.find(d=>d.date===days[i].date);if(x&&y)days[i]=x.started||y.started?day(x,y):x;}return JSON.stringify({...a,days:days.sort((x,y)=>x.date.localeCompare(y.date)).slice(-35)});}
    if(key==='roqvyn-adaptive-training-v1')return JSON.stringify(adaptive(a,b));
    if(key.startsWith('roqvyn-board-lab-v1:'))return JSON.stringify({...a,best:Math.max(a.best||0,b.best||0)});
  }catch{/* Preserve the local item if an older/corrupted value cannot merge. */}
  return local;
}
import {COURSES} from './courses.js';
import {lessonPlan} from './lesson-player.js';
const questionCache=new Map();
function correctAnswers(key){if(!questionCache.has(key)){let found;for(const course of Object.values(COURSES)){found=course.lessons.find(lesson=>key===`${course.key}:lesson-player-v1:${lesson.id}`||key.endsWith(`-${lesson.id}-0`));if(found){found=lessonPlan(found,course.study?.(found.id)).questions.map(q=>q.answer);break;}}questionCache.set(key,found||[]);}return questionCache.get(key);}

import { localTrainingDate, trainingDateAfter } from './training-calendar.js';
import { dailyPracticeTask } from './daily-training.js';
import { relatedPractice } from './practice-themes.js';

export function weeklyTraining(events, today, { nextFor } = {}) {
  const days = Array.from({ length:7 }, (_, index) => ({
    date:trainingDateAfter(today,index-6), independent:0, supported:0, unknown:0,
  }));
  const byDate = new Map(days.map(day=>[day.date,day])), skills = new Map();
  const totals = { independent:0, supported:0, unknown:0 }, seen = new Set();
  for (const event of events) {
    const date = byDate.get(event.date);
    const identity = `${event.date}:${event.key}`;
    if (!date || seen.has(identity) || !Object.hasOwn(totals,event.quality)) continue;
    seen.add(identity);
    date[event.quality]++;
    totals[event.quality]++;
    if (event.quality !== 'supported') continue;
    const previous = skills.get(event.skill);
    skills.set(event.skill,{
      count:(previous?.count||0)+1,
      sample:!previous || event.date>=previous.sample.date ? event : previous.sample,
    });
  }
  const ranked = [...skills.values()].sort((a,b)=>b.count-a.count || b.sample.date.localeCompare(a.sample.date));
  const focus = ranked[0] || null;
  return { days, totals, focus, next:focus && nextFor?.(focus.sample) };
}

export function weeklyRecommendation(event, courses, meta) {
  const task = event.task;
  if (task.kind === 'endgame') {
    const id = task.id.slice('endgame-'.length);
    return { route:'endgames', search:`?technique=${encodeURIComponent(id)}`, label:'Revisit this endgame' };
  }
  if (task.kind === 'mistake') {
    if (!event.skill.startsWith('theme-')) {
      return { route:'train', search:'?practice=mistakes', label:'Practice a reviewed game' };
    }
    const exercise = relatedPractice(event.skill.slice(6),task.exercise.fen);
    return exercise && { exercise, label:'Try another position' };
  }
  const course = courses[task.courseId];
  if (!course) return null;
  let target=task;
  for (const lesson of course.lessons) {
    if (lesson.id === task.lessonId || task.level && lesson.level !== task.level) continue;
    const candidate = dailyPracticeTask(courses,course.id,lesson.id);
    if (candidate && meta(candidate)?.skill === event.skill) { target=candidate; break; }
  }
  const query = new URLSearchParams({lesson:target.lessonId,review:'practice',exercise:target.index});
  return { route:course.id, search:`?${query}`, label:target===task?'Revisit this exercise':'Practice a related lesson' };
}

export function createWeeklyTrainingUI({ evidence, nextFor, go, practice, now=()=>new Date(), doc=document }) {
  const get = id => doc.getElementById(id);
  let recommendation;
  function render() {
    const report = weeklyTraining(evidence(),localTrainingDate(now()),{nextFor});
    const long = new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'});
    const short = new Intl.DateTimeFormat(undefined,{weekday:'short'});
    const date = day => new Date(day.date+'T12:00:00');
    const total = Object.values(report.totals).reduce((sum,n)=>sum+n,0);
    const max = Math.max(1,...report.days.map(day=>day.independent+day.supported+day.unknown));
    get('weekly-date-range').textContent = `${long.format(date(report.days[0]))} – ${long.format(date(report.days.at(-1)))}`;
    get('weekly-independent').textContent = report.totals.independent;
    get('weekly-supported').textContent = report.totals.supported;
    get('weekly-untracked').hidden = report.totals.unknown===0;
    get('weekly-untracked-count').textContent = report.totals.unknown;
    get('weekly-empty').hidden = total>0;
    get('weekly-days').replaceChildren(...report.days.map(day=>{
      const completed = day.independent+day.supported+day.unknown;
      const row = doc.createElement('li');
      const time = doc.createElement('time');
      time.dateTime = day.date;
      time.textContent = short.format(date(day));
      time.setAttribute('aria-label',long.format(date(day)));
      const meter = doc.createElement('meter');
      meter.min=0;
      meter.max=max;
      meter.value=completed;
      meter.setAttribute('aria-label',`${completed} solved on ${long.format(date(day))}`);
      const value=doc.createElement('span');
      value.textContent=completed;
      value.setAttribute('aria-hidden','true');
      row.append(time,meter,value);
      return row;
    }));
    get('weekly-focus-title').textContent = report.focus?.sample.name || 'Your next practice';
    const supported = report.focus?.count;
    get('weekly-focus-note').textContent = report.focus
      ? `${supported} ${supported===1?'solve needed':'solves needed'} a hint or retry for this idea.`
      : total ? 'Start today’s plan to keep practicing.' : 'Finish an exercise to start building your report.';
    recommendation = report.next || {route:'train',label:'Open daily training'};
    get('weekly-practice').textContent = recommendation.label;
  }
  get('weekly-practice').onclick = () => {
    if (recommendation.exercise) practice([recommendation.exercise],{
      backLabel:'Back to weekly report',onClose:()=>{render();get('weekly-practice').focus({preventScroll:true});},
    });
    else go(recommendation.route,{search:recommendation.search});
  };
  return { render };
}

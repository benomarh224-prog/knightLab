import{lessonDisplay}from'./lesson-insight.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function homePlanState(day){
 const done=day.done.length,total=day.tasks.length,complete=done===total;
 return{done,total,complete,summary:`${done} of ${total} complete`,action:complete?'Review today’s plan':day.started||done?'Continue practice':'Start practice'};
}
export function homePlanRows(day,courses){
 return day.tasks.map((task,index)=>{
  const done=day.done.includes(task.id),course=courses[task.courseId],lesson=course?.lessons.find(l=>l.id===task.lessonId);
  const title=course?.presentation==='tactical-themes'&&lesson?lessonDisplay(course,lesson,course.study?.(lesson.id)).title:task.title;
  return `<li${done?' class="home-daily-done"':''}><button type="button" data-home-daily-task="${escape(task.id)}" aria-label="${done?'Review':'Start'} ${escape(title)}"><span class="home-daily-mark" aria-hidden="true">${done?'✓':index+1}</span><span class="home-daily-copy"><span>${escape(task.detail)}</span><strong>${escape(title)}</strong></span><svg class="home-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7"/></svg></button></li>`;
 }).join('');
}

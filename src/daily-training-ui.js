import { createDailyTraining } from './daily-training.js';
import { createLearningMemory } from './learning-memory.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function createDailyTrainingUI({storage,courses,mistakes,go,practice}){
  const $=id=>document.getElementById(id),freshMemory=()=>createLearningMemory(storage,courses);
  const model=createDailyTraining({storage,courses,learningMemory:{review:()=>freshMemory().review(),last:()=>freshMemory().last()}});
  function render(){
    const day=model.today({mistakes:mistakes()}),count=day.done.length,total=day.tasks.length,complete=count===total;
    $('daily-count').textContent=`${count} of ${total} exercises complete`;
    $('daily-progress').max=total;$('daily-progress').value=count;
    $('daily-date').textContent=new Date(day.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
    $('daily-level').value=day.level;$('daily-level').disabled=day.started;
    $('daily-level-help').textContent=day.started?'Your session is saved. You can choose another level tomorrow.':'Choose the tactics level for today’s session.';
    $('daily-description').textContent=complete?'Daily session complete. You can review any exercise below.':`Three focused exercises · About 10 minutes${day.tasks.some(task=>task.kind==='mistake')?' · Includes a moment from your game':''}.`;
    $('daily-tasks').innerHTML=day.tasks.map((task,index)=>`<li${day.done.includes(task.id)?' class="daily-done"':''}><span class="daily-task-status" aria-hidden="true">${day.done.includes(task.id)?'✓':index+1}</span><span class="daily-task-copy"><strong>${escape(task.title)}</strong><small>${escape(task.detail)}${task.reason==='Practice one idea'?'':' · '+escape(task.reason)}</small></span><button type="button" class="daily-task-open" data-daily-task="${escape(task.id)}" aria-label="${day.done.includes(task.id)?'Review':'Start'} ${escape(task.title)}">${day.done.includes(task.id)?'Review':'Open'}</button></li>`).join('');
    $('daily-start').hidden=complete;$('daily-start').textContent=day.started?'Continue daily training →':'Start daily training →';
    for(const link of document.querySelectorAll('[data-daily-shortcut]')){
      link.querySelector('strong').textContent=complete?'Daily training complete':'Your daily training';
      link.querySelector('span').textContent=complete?`${total} exercises completed today · Review →`:count?`${count}/${total} completed · Continue →`:'3 exercises · About 10 minutes →';
    }
    const preview=$('home-daily-plan');
    if(preview)preview.innerHTML=day.tasks.map(task=>`<li><span class="home-daily-state">${day.done.includes(task.id)?'Completed':'To practice'}</span><strong>${escape(task.title)}</strong><span>${escape(task.detail)}</span></li>`).join('');
    return day;
  }
  function open(date,task){
    if(!model.start(date,task.id))return;
    if(task.kind==='mistake'){
      go('train');
      practice([task.exercise],{onSolved:()=>{model.solve(date,task.id);render();},onClose:()=>{render();($('daily-start').hidden?$('daily-heading'):$('daily-start')).focus({preventScroll:true});}});
    }
    else go(task.courseId,{search:'?'+model.link(date,task).split('?')[1]});
  }
  function advance(date){const task=model.next(date);if(task)open(date,task);else go('train');}
  $('daily-start').onclick=()=>{const day=render();advance(day.date);};
  $('daily-tasks').onclick=event=>{const id=event.target.closest('[data-daily-task]')?.dataset.dailyTask;if(!id)return;const day=render(),task=day.tasks.find(item=>item.id===id);if(task)open(day.date,task);};
  $('daily-level').onchange=()=>{model.setLevel($('daily-level').value);render();};
  return {render,context:(courseId,lessonId,query)=>model.context(courseId,lessonId,query),start:ctx=>model.start(ctx.date,ctx.task.id),
    solved(ctx){model.solve(ctx.date,ctx.task.id);render();},complete:ctx=>model.done(ctx.date,ctx.task.id),advance:ctx=>advance(ctx.date),plan:()=>go('train'),
    label(ctx){const day=model.get(ctx.date);return `Daily training · ${day.tasks.findIndex(task=>task.id===ctx.task.id)+1} of ${day.tasks.length}`;}};
}

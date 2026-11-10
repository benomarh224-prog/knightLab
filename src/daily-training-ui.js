import { createDailyTraining } from './daily-training.js';
import { createLearningMemory } from './learning-memory.js';
import {homePlanState,homePlanRows} from './home-daily-plan.js';
import {dailyLearningReport} from './daily-learning-report.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function createDailyTrainingUI({storage,courses,mistakes,go,practice,doc=document,now}){
  const $=id=>doc.getElementById(id),freshMemory=()=>createLearningMemory(storage,courses);
  const model=createDailyTraining({storage,courses,learningMemory:{review:()=>freshMemory().review(),last:()=>freshMemory().last()},now});
  let displayedDay=null;
  function render(){
    const day=model.today({mistakes:mistakes()}),count=day.done.length,total=day.tasks.length,complete=count===total;
    $('daily-count').textContent=`${count} of ${total} exercises complete`;
    $('daily-progress').max=total;$('daily-progress').value=count;
    $('daily-date').textContent=new Date(day.date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
    const choices=model.choices(),options=choices.map(choice=>`<option value="${escape(choice.value)}">${escape(choice.label)}</option>`).join('');
    if($('daily-level').dataset.options!==options){$('daily-level').innerHTML=options;$('daily-level').dataset.options=options;}
    $('daily-level').value=day.choice||'auto';$('daily-level').disabled=day.started;
    $('daily-level-help').textContent=day.started?'Your opened exercises stay in place. Unopened challenges can adapt after a solve.':'Choose a starting difficulty, or let your recent practice guide the session.';
    $('daily-description').textContent=complete?'Session complete. Your recap shows independent solves and ideas to revisit.':`${total} focused exercises · Difficulty adapts to your practice${day.tasks.some(task=>task.kind==='mistake')?' · Includes a moment from your game':''}.`;
    $('daily-tasks').innerHTML=day.tasks.map((task,index)=>`<li${day.done.includes(task.id)?' class="daily-done"':''}><span class="daily-task-status" aria-hidden="true">${day.done.includes(task.id)?'✓':index+1}</span><span class="daily-task-copy"><strong>${escape(task.title)}</strong><small>${escape(task.detail)}${task.reason==='Practice one idea'?'':' · '+escape(task.reason)}</small></span><button type="button" class="daily-task-open" data-daily-task="${escape(task.id)}" aria-label="${day.done.includes(task.id)?'Review':'Start'} ${escape(task.title)}">${day.done.includes(task.id)?'Review':'Open'}</button></li>`).join('');
    $('daily-start').hidden=complete;$('daily-start').textContent=day.started?'Continue daily training →':'Start daily training →';
    const report=$('daily-report');report.hidden=!count;report.innerHTML=count?dailyLearningReport(model.report(day.date)):'';
    for(const link of doc.querySelectorAll('[data-daily-shortcut]')){
      link.querySelector('strong').textContent=complete?'Daily training complete':'Your daily training';
      link.querySelector('span').textContent=complete?`${total} exercises completed today · Review →`:count?`${count}/${total} completed · Continue →`:'3 exercises · About 10 minutes →';
    }
    const preview=$('home-daily-plan');
    if(preview){
      preview.innerHTML=homePlanRows(day,courses);const state=homePlanState(day);
      $('home-daily-summary').textContent=state.summary;$('home-daily-progress').max=state.total;$('home-daily-progress').value=state.done;
      $('home-daily-start-label').textContent=state.action;
    }
    displayedDay=day;return day;
  }
  function open(date,task){
    if(!model.start(date,task.id))return;
    if(task.kind==='mistake'){
      go('train');
      practice([task.exercise],{onHelp:()=>model.helpTask(date,task.id),onSolved:(_exercise,outcome)=>{model.solve(date,task.id,outcome);render();},onClose:()=>{render();($('daily-start').hidden?$('daily-heading'):$('daily-start')).focus({preventScroll:true});}});
    }
    else go(task.courseId,{search:'?'+model.link(date,task).split('?')[1]});
  }
  function advance(date){const task=model.next(date);if(task)open(date,task);else go('train');}
  $('daily-start').onclick=()=>{const day=render();advance(day.date);};
  $('home-daily-start').onclick=()=>{const day=render();if(day.done.length===day.tasks.length)go('train');else advance(day.date);};
  // Lock the visible selection before refreshing recommendations. A new result
  // from elsewhere must not replace the exercise under the user's click.
  const openDisplayed=id=>{const day=displayedDay||render(),task=day.tasks.find(item=>item.id===id);if(task)open(day.date,task);};
  $('home-daily-plan').onclick=event=>{const id=event.target.closest('[data-home-daily-task]')?.dataset.homeDailyTask;if(id)openDisplayed(id);};
  $('daily-tasks').onclick=event=>{const id=event.target.closest('[data-daily-task]')?.dataset.dailyTask;if(id)openDisplayed(id);};
  $('daily-level').onchange=()=>{model.setLevel($('daily-level').value);render();};
  return {render,context:(courseId,lessonId,query)=>model.context(courseId,lessonId,query),start:ctx=>model.start(ctx.date,ctx.task.id),
    observe:event=>model.observe(event),solved(ctx,outcome){model.solve(ctx.date,ctx.task.id,outcome);render();},complete:ctx=>model.done(ctx.date,ctx.task.id),advance:ctx=>advance(ctx.date),plan:()=>go('train'),
    label(ctx){const day=model.get(ctx.date);return `Daily training · ${day.tasks.findIndex(task=>task.id===ctx.task.id)+1} of ${day.tasks.length}`;}};
}

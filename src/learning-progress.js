import {COURSES} from './courses.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderLearningProgress({progress,activeLessons,course,player,memoryFor,studyFor}){
  function updateProgress(){
    const completed=progress.read(),visible=activeLessons(),inLevel=visible.filter(lesson=>completed.includes(lesson.id)).length;
    const focusedLesson=document.activeElement?.closest('#course-lessons [data-lesson]')?.dataset.lesson;
    $('course-progress-label').textContent=`${inLevel} of ${visible.length} ${course.id==='tactics'?'exercises':'lessons'} practiced`;
    $('course-progress-fill').style.width=`${inLevel/visible.length*100}%`;
    for(const element of document.querySelectorAll('[data-course-progress]')){
      const target=COURSES[element.dataset.courseProgress];if(target)element.textContent=`${memoryFor(target).read().length} of ${target.lessons.length} lessons completed`;
    }
    const frenchDone=memoryFor(COURSES.french).read(),tacticsDone=memoryFor(COURSES.tactics).read();
    $('learn-progress-label').textContent=frenchDone.length?`${frenchDone.length} of ${COURSES.french.lessons.length} lessons practiced`:`${COURSES.french.lessons.length} focused lessons · Interactive practice`;
    $('tactics-progress-label').textContent=`${tacticsDone.length} of ${COURSES.tactics.lessons.length} exercises practiced`;
    const openGamesDone=memoryFor(COURSES.opengames).read();
    $('open-games-progress-label').textContent=`${openGamesDone.length} of ${COURSES.opengames.lessons.length} lessons practiced`;
    const beginnerDone=memoryFor(COURSES.beginners).read(),beginnerTotal=COURSES.beginners.lessons.length;
    $('beginner-progress-label').textContent=`${beginnerDone.length} of ${beginnerTotal} lessons completed`;
    $('home-beginner-progress').textContent=beginnerDone.length?`${beginnerDone.length} of ${beginnerTotal} lessons completed`:`${beginnerTotal} lessons · Guided board exercises`;
    $('home-tactics-progress').textContent=`144 exercises · 3 levels${tacticsDone.length?' · '+tacticsDone.length+' practiced':''}`;
    $('home-course-progress').textContent=`Chess for Beginners · ${beginnerDone.length} of ${beginnerTotal} lessons completed`;
    $('home-course-progress-fill').style.width=`${beginnerDone.length/beginnerTotal*100}%`;
    $('home-course-progressbar').setAttribute('aria-valuenow',String(beginnerDone.length));
    $('home-course-progressbar').setAttribute('aria-valuemax',String(beginnerTotal));
    const pathNodes=document.querySelectorAll('.academy-milestones .milestone-node');
    pathNodes[0]?.classList.toggle('active',beginnerDone.length<beginnerTotal);pathNodes[1]?.classList.toggle('active',beginnerDone.length===beginnerTotal);
    if(pathNodes[0])pathNodes[0].textContent=beginnerDone.length===beginnerTotal?'✓':'01';
    $('course-levels').hidden=!course.levels?.length;
    for(const button of document.querySelectorAll('[data-course-level]'))button.setAttribute('aria-pressed',String(button.dataset.courseLevel===player.lesson.level));
    $('course-lessons').innerHTML=visible.map((lesson,index)=>{
      const active=lesson.id===player.lesson.id,done=completed.includes(lesson.id);
      const title=(studyFor(lesson.id).title||lesson.title).replace(/\.$/,'');
      const subtitle=lesson.unit||'';
      const unit=lesson.unit&&visible[index-1]?.unit!==lesson.unit?`<p class="lesson-unit-heading">${escape(lesson.unit)}</p>`:'';
      return `${unit}<button data-lesson="${lesson.id}" aria-current="${active?'step':'false'}" class="${done?'is-practiced':''}" aria-label="${course.label} ${index+1}: ${escape((studyFor(lesson.id).title||lesson.title))}${done?'. Practiced':''}"><span class="lesson-status" aria-hidden="true">${done?'✓':active?'▶':'○'}</span><span class="lesson-number">${String(index+1).padStart(2,'0')}</span><span class="lesson-list-name"><strong>${escape(title)}</strong>${subtitle?`<small>${escape(subtitle)}</small>`:''}</span></button>`;
    }).join('');
    if(focusedLesson)$('course-lessons').querySelector(`[data-lesson="${focusedLesson}"]`)?.focus({preventScroll:true});
  }

updateProgress();
}

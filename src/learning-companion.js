import { learningLink } from './learning-memory.js';
import { createCourseProgress } from './opening-course.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=(course,lesson)=>course.study?.(lesson.id)?.title||lesson.title;
export function renderLearningCompanion({memory,courses,storage}){
  const last=learningLink(courses,memory.last());
  if(last){
    for(const id of ['home-continue','learn-continue']){const link=$(id);link.href=last.href;link.dataset.route=last.route;link.setAttribute('aria-label',`Continue ${last.course.title}: ${title(last.course,last.lesson)}`);}
    $('learn-continue-title').textContent=title(last.course,last.lesson);
    $('learn-continue-course').textContent=last.course.title;
    const done=createCourseProgress(storage,last.course.lessons.map(l=>l.id),last.course.key).read(),total=last.course.lessons.length;
    $('home-course-progress').textContent=`${last.course.title} · ${done.length} of ${total} lessons completed`;
    $('home-course-progress-fill').style.width=`${done.length/total*100}%`;
    $('home-course-progressbar').setAttribute('aria-valuenow',String(done.length));$('home-course-progressbar').setAttribute('aria-valuemax',String(total));$('home-course-progressbar').setAttribute('aria-label',`${last.course.title} lessons completed`);
  }
  $('learn-continue').hidden=!last;
  const pending=memory.review().map(entry=>({entry,link:learningLink(courses,entry,{review:true})})).filter(item=>item.link);
  $('learn-review').hidden=!pending.length;$('learn-review-count').textContent=String(pending.length);
  $('learn-review-list').innerHTML=pending.map(({entry,link})=>`<a href="${escape(link.href)}" data-route="${link.route}"><span><strong>${escape(title(link.course,link.lesson))}</strong><small>${escape(link.course.title)} · ${entry.kind==='question'?'Knowledge check':entry.reason==='hint'?'Practice after a hint':'Try the study line again'}</small></span><span aria-hidden="true">↗</span></a>`).join('');
  $('learn-course-map').innerHTML=Object.values(courses).map(course=>{
    const done=createCourseProgress(storage,course.lessons.map(l=>l.id),course.key).read();
    const groups=[...new Set(course.lessons.map(lesson=>lesson.unit||lesson.level||course.title))];
    return `<section><h3>${escape(course.title)} <small>${done.length}/${course.lessons.length}</small></h3><ol>${groups.map(group=>{
      const lessons=course.lessons.filter(lesson=>(lesson.unit||lesson.level||course.title)===group),next=lessons.find(lesson=>!done.includes(lesson.id))||lessons[0],count=lessons.filter(l=>done.includes(l.id)).length;
      return `<li><a href="${course.path}?lesson=${encodeURIComponent(next.id)}" data-route="${course.id}"><span aria-hidden="true">${count===lessons.length?'✓':'○'}</span><span>${escape(group)} <small>${count}/${lessons.length}</small></span><span aria-hidden="true">→</span></a></li>`;
    }).join('')}</ol></section>`;
  }).join('');
}

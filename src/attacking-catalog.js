import { pieceSvg } from './pieces.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderAttackingCatalog(courses){
 const root=document.getElementById('attacking-course-cards');if(!root)return;
 root.innerHTML=Object.values(courses).filter(course=>course.category==='attacking').map(course=>{
  const types={king:'k',knight:'n',rook:'r'},type=types[course.art]||'q';
  return `<a class="course-cover tal-course-cover" href="${course.path}" data-route="${course.id}"><div class="course-cover-art tal-course-art" aria-hidden="true"><span class="tal-art-edition">THE ATTACKING LAB <b>0${course.order}</b></span><span class="tal-art-piece tal-art-black">${pieceSvg({type:'k',color:'b'})}</span><span class="tal-art-piece tal-art-white">${pieceSvg({type,color:'w'})}</span><span class="tal-art-caption">${escape(course.kicker)}</span></div><div class="course-cover-copy"><span class="page-eyebrow">INSPIRED BY TAL · INTERMEDIATE</span><h2>${escape(course.title)}</h2><p>${escape(course.description)}</p><ul>${course.benefits.map(text=>`<li>${escape(text)}</li>`).join('')}</ul><span class="course-progress-caption" data-course-progress="${course.id}">0 of ${course.lessons.length} lessons completed</span><span class="primary-button">Open course <span aria-hidden="true">→</span></span></div></a>`;
 }).join('');
}

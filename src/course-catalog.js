const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Metadata determines catalog entries for existing and future courses.
export function renderCatalogAdditions(courses,{category,hostId},doc=document){
 const root=doc.getElementById(hostId);if(!root)return;
 root.innerHTML=Object.values(courses).filter(course=>course.category===category&&course.catalog).map(course=>{
  const card=course.catalog,unit=course.label==='Exercise'?'exercises':'lessons';
  return `<a class="course-cover ${category==='openings'?'opening':'tactics'}-cover" href="${escape(course.path)}" data-route="${escape(course.id)}"><div class="course-cover-art"><img class="course-cover-photo" src="${escape(card.cover)}" alt="${escape(card.alt)}" width="1200" height="800" loading="lazy" decoding="async"/></div><div class="course-cover-copy"><span class="page-eyebrow">${escape(card.kicker)}</span><h2>${escape(course.title)}</h2><p>${escape(card.description)}</p><ul>${card.benefits.map(value=>`<li>${escape(value)}</li>`).join('')}</ul><span class="course-progress-caption" data-course-progress="${escape(course.id)}">0 of ${course.lessons.length} ${unit} completed</span><span class="primary-button">Open course <span aria-hidden="true">→</span></span></div></a>`;
 }).join('');
}

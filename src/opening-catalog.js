const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Course metadata supplies new opening cards without adding lesson-specific UI.
export function renderOpeningCatalog(courses,doc=document){
  const openings=Object.values(courses).filter(course=>course.category==='openings');
  const root=doc.getElementById('additional-opening-courses');
  if(root)root.innerHTML=openings.filter(course=>course.catalog).map(course=>{
    const card=course.catalog;
    return `<a class="course-cover opening-cover" href="${course.path}" data-route="${course.id}"><div class="course-cover-art"><img class="course-cover-photo" src="${escape(card.cover)}" alt="${escape(card.alt)}" width="1280" height="853" loading="lazy" decoding="async"/></div><div class="course-cover-copy"><span class="page-eyebrow">${escape(card.kicker)}</span><h2>${escape(course.title)}</h2><p>${escape(card.description)}</p><ul>${card.benefits.map(value=>`<li>${escape(value)}</li>`).join('')}</ul><span class="course-progress-caption" data-course-progress="${course.id}">0 of ${course.lessons.length} lessons completed</span><span class="primary-button">Open course <span aria-hidden="true">→</span></span></div></a>`;
  }).join('');
  for(const counter of doc.querySelectorAll('[data-learn-filter="openings"] span'))counter.textContent=String(openings.length);
  for(const names of doc.querySelectorAll('[data-opening-course-names]'))names.textContent=openings.map(course=>course.title).join(' · ');
}

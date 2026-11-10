const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Course metadata supplies the levels; neither the player nor the UI assumes a course name.
export function renderCourseLevels(root,course,activeLevel,doc=document){
  const levels=course.levels||[];root.hidden=!levels.length;
  const signature=JSON.stringify(levels.map(level=>[level,course.levelLabels?.[level]||level[0].toUpperCase()+level.slice(1)]));
  if(root.dataset.levelSignature!==signature){
    const focused=root.contains(doc.activeElement)?doc.activeElement.dataset.courseLevel:null;
    root.innerHTML=levels.map(level=>`<button type="button" data-course-level="${escape(level)}" aria-pressed="${level===activeLevel}">${escape(course.levelLabels?.[level]||level[0].toUpperCase()+level.slice(1))}</button>`).join('');
    root.dataset.levelSignature=signature;
    if(focused){const restore=levels.includes(focused)?focused:activeLevel;[...root.querySelectorAll('[data-course-level]')].find(button=>button.dataset.courseLevel===restore)?.focus({preventScroll:true});}
  }
  for(const button of root.querySelectorAll('[data-course-level]'))button.setAttribute('aria-pressed',String(button.dataset.courseLevel===activeLevel));
}

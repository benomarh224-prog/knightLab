// A long course must not turn the board workspace into a long, empty page.
// Only the selected group and one short page of its exercises are rendered.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function outlinePage(rows,{group,activeId,page=0,size=5,follow=false}={}){
  const groups=[...new Set(rows.map(row=>row.group||'Course lessons'))];
  const active=rows.find(row=>row.id===activeId),selected=follow&&active?active.group||'Course lessons':groups.includes(group)?group:groups[0];
  const matching=rows.filter(row=>(row.group||'Course lessons')===selected),count=Math.max(1,Math.ceil(matching.length/size));
  const activeIndex=matching.findIndex(row=>row.id===activeId),index=Math.max(0,Math.min(count-1,follow&&activeIndex>=0?Math.floor(activeIndex/size):page));
  return {groups,group:selected,page:index,pages:count,total:matching.length,start:index*size,end:Math.min((index+1)*size,matching.length),rows:matching.slice(index*size,(index+1)*size)};
}
export function createLessonOutline({doc=document,viewport=window}={}){
  const get=id=>doc.getElementById(id),list=get('course-lessons'),groupSelect=get('course-group'),previous=get('course-page-previous'),next=get('course-page-next');
  let rows=[],scope=null,activeId=null,state={},size=5,label='Lesson';
  function paint(follow=false){
    state=outlinePage(rows,{...state,activeId,size,follow});
    groupSelect.innerHTML=state.groups.map(group=>`<option value="${escape(group)}"${group===state.group?' selected':''}>${escape(group)}</option>`).join('');
    get('course-group-control').hidden=state.groups.length<2;
    const focused=doc.activeElement?.closest('#course-lessons [data-lesson]')?.dataset.lesson;
    list.innerHTML=state.rows.map(row=>`<button type="button" data-lesson="${escape(row.id)}" aria-current="${row.id===activeId?'step':'false'}" class="${row.done?'is-practiced':''}" aria-label="${escape(label)} ${row.index+1}: ${escape(row.title)}${row.done?'. Practiced':''}"><span class="lesson-status" aria-hidden="true">${row.done?'✓':row.id===activeId?'▶':'○'}</span><span class="lesson-number">${String(row.index+1).padStart(2,'0')}</span><span class="lesson-list-name"><strong>${escape(row.title.replace(/\.$/,''))}</strong>${row.subtitle?`<small>${escape(row.subtitle)}</small>`:''}</span></button>`).join('');
    if(focused)list.querySelector(`[data-lesson="${focused}"]`)?.focus({preventScroll:true});
    get('course-page-label').textContent=`${state.start+1}–${state.end} of ${state.total}`;
    previous.disabled=state.page===0;next.disabled=state.page===state.pages-1;
    get('course-pagination').hidden=state.pages<2;
    if(doc.activeElement===previous&&previous.disabled||doc.activeElement===next&&next.disabled)get('course-page-label').focus({preventScroll:true});
  }
  groupSelect.onchange=()=>{state={group:groupSelect.value,page:0};paint();};
  previous.onclick=()=>{state.page--;paint();};next.onclick=()=>{state.page++;paint();};
  function resize(){const nextSize=viewport.innerHeight<760?3:5;if(nextSize!==size){size=nextSize;if(rows.length)paint(true);}}
  viewport.addEventListener('resize',resize);resize();
  return {render(nextRows,{courseId,lessonId,lessonLabel}){const follow=scope!==courseId||activeId!==lessonId;scope=courseId;activeId=lessonId;label=lessonLabel;rows=nextRows;paint(follow);}};
}

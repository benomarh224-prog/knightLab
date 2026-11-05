// One coach for every lesson type. Existing tools/disclosures keep their own
// handlers and progress; the dialog only changes where those nodes are shown.
export function createLessonCoach({doc=document,compact=matchMedia('(max-width:1020px)')}={}){
  const get=id=>doc.getElementById(id),dialog=get('lesson-coach-dialog'),panel=doc.querySelector('.lesson-practice-panel'),details=get('lesson-more');
  const home=doc.createComment('Lesson practice tools');panel.before(home);
  const body=get('lesson-coach-tools'),trigger=get('lesson-coach-open'),closeButton=get('lesson-coach-close');
  let origin=trigger,key=null;
  const close=()=>{if(dialog.open)dialog.close();};
  const open=(from=trigger)=>{
    if(dialog.open)return;
    for(const menu of doc.querySelectorAll('.compact-options[open]'))menu.open=false;
    origin=from;dialog.showModal();trigger.setAttribute('aria-expanded','true');
    closeButton.focus({preventScroll:true});
  };
  trigger.onclick=()=>open();closeButton.onclick=close;
  get('lesson-coach-board').onclick=close;
  get('lesson-coach-hint').onclick=()=>get('lesson-hint').click();
  dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');const target=origin?.isConnected&&!origin.hidden&&!origin.disabled?origin:trigger;if(!target.hidden)target.focus({preventScroll:true});});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();close();}});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
  function arrange(){close();if(compact.matches)body.append(panel,details);else{home.after(panel);get('lesson-coach-details').append(details);}}
  compact.addEventListener('change',arrange);arrange();
  function update({lessonKey,stage,title,instruction,hint,feedback}){
    const nextKey=lessonKey+':'+stage;if(key!==nextKey){close();key=nextKey;}
    get('lesson-coach-heading').textContent=title||'Your coach';
    get('lesson-coach-instruction').textContent=instruction||'';
    const response=get('lesson-coach-response');response.textContent=feedback||'';response.hidden=!feedback;
    const hintButton=get('lesson-coach-hint');hintButton.hidden=stage!=='try'||get('lesson-hint').hidden;
    hintButton.disabled=get('lesson-hint').disabled;hintButton.textContent=hint?'Next hint':'Get a hint';
    if(hint?.level===3)hintButton.textContent='Move revealed';
    trigger.hidden=stage==='check';
  }
  return {open,close,update};
}

// The compact, always-present coach is above the mobile board. Full teaching
// stays beside the desktop board or in an explicitly opened Details dialog.
export function createLessonCoach({doc=document,compact=matchMedia('(max-width:1020px)'),viewport=globalThis.window}={}){
  const get=id=>doc.getElementById(id),dialog=get('lesson-coach-dialog'),inline=get('lesson-coach-inline'),content=get('lesson-coach-content');
  const panel=doc.querySelector('.lesson-practice-panel'),details=get('lesson-more'),trigger=get('lesson-coach-open'),closeButton=get('lesson-coach-close');
  get('lesson-coach-tools').append(panel,get('lesson-solution-recap'));get('lesson-coach-details').append(details);
  let origin=trigger,key=null,stage='try';
  const floating=()=>compact.matches||stage!=='try'||doc.body?.dataset.lessonFocus==='true';
  function measure(){
    // Details never adds padding, resizes the board, or scrolls the document.
    if(doc.body)doc.body.dataset.lessonCoachOpen=String(dialog.open);
  }
  function close(){if(dialog.open)dialog.close();measure();}
  function open(from=trigger){
    if(!floating()){
      get('lesson-coach-heading').tabIndex=-1;get('lesson-coach-heading').focus({preventScroll:true});return;
    }
    if(dialog.open)return;
    for(const menu of doc.querySelectorAll('.compact-options[open]'))menu.open=false;
    origin=from;dialog.setAttribute('aria-modal','false');dialog.show();trigger.setAttribute('aria-expanded','true');
    measure();closeButton.focus({preventScroll:true});
  }
  trigger.onclick=()=>open();closeButton.onclick=close;get('lesson-coach-board').onclick=close;
  get('lesson-coach-hint').onclick=()=>get('lesson-hint').click();
  dialog.addEventListener('close',()=>{
    trigger.setAttribute('aria-expanded','false');measure();
    const target=origin?.isConnected&&!origin.hidden&&!origin.disabled?origin:trigger;
    if(!target.hidden)target.focus({preventScroll:true});
  });
  doc.addEventListener('keydown',event=>{if(dialog.open&&event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();close();}},true);
  doc.addEventListener('pointerdown',event=>{
    const path=event.composedPath?.()||[],inside=node=>node.contains(event.target)||path.includes(node);
    if(!dialog.open||[dialog,trigger,get('lesson-hint'),get('lesson-board')].some(inside))return;
    close();
  });
  function arrange(){
    close();(floating()?dialog:inline).append(content);
    inline.hidden=floating();
    closeButton.hidden=!floating();get('lesson-coach-board').hidden=!floating();
    trigger.hidden=stage==='check'||!floating();
    placeTrigger();
  }
  function placeTrigger(){
    const above=compact.matches&&stage==='try',owner=above?get('lesson-summary-details'):doc.querySelector('.lesson-topline');
    if(trigger.parentElement!==owner)owner.append(trigger);
    trigger.textContent=above?'Details':'Coach';
  }
  compact.addEventListener('change',arrange);viewport?.addEventListener('resize',measure);arrange();
  function update({lessonKey,stage:nextStage,title,instruction,hint,feedback}){
    stage=nextStage;const nextKey=lessonKey+':'+stage;if(key!==nextKey){close();key=nextKey;}
    if(content.parentElement!==(floating()?dialog:inline))arrange();
    inline.hidden=floating();
    get('lesson-coach-heading').textContent=title||'Your coach';
    get('lesson-coach-instruction').textContent=instruction||'';
    // The requested hint or latest move explanation leads; the original
    // concept remains in Learn more rather than pushing feedback off the sheet.
    get('lesson-coach-instruction').hidden=Boolean(feedback);
    const response=get('lesson-coach-response');response.textContent=feedback||'';response.hidden=!feedback;
    const hintButton=get('lesson-coach-hint');hintButton.hidden=stage!=='try'||get('lesson-hint').hidden;
    hintButton.disabled=get('lesson-hint').disabled;hintButton.textContent=hint?'Next hint':'Get a hint';
    if(hint?.level===3)hintButton.textContent='Move revealed';
    trigger.hidden=stage==='check'||!floating();placeTrigger();measure();
  }
  return {open,close,update};
}

export function lessonBoardLimit({height,compact=false,focus=false}){
  // Reserve a consistent shell, never the current instruction/footer text height.
  // Longer content remains in normal page flow instead of shrinking the board.
  const reserved=focus?260:compact?400:300;
  return Math.max(220,Math.min(680,Math.floor(height-reserved)));
}

export function createLessonViewport({doc=document,viewport=window}={}){
  const get=id=>doc.getElementById(id),footer=doc.querySelector('.lesson-course-footer');
  const home=doc.createComment('Lesson navigation');get('lesson-stage-panel').after(home);
  const instruction=get('lesson-instruction'),status=get('lesson-mode-status'),heading=doc.querySelector('.lesson-page-heading'),panel=doc.querySelector('.lesson-practice-panel');
  const desktop=viewport.matchMedia('(min-width:1021px)');let stage='learn';
  // Small viewport units stay stable when mobile browser toolbars open/close.
  // The probe also responds to real window resizing and device rotation.
  const probe=doc.createElement('div');
  probe.setAttribute('aria-hidden','true');
  probe.style.cssText='position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none;contain:strict;';
  doc.body.append(probe);
  function measure(){
    if(stage!=='try'||!get('lesson-board').getClientRects().length)return;
    const limit=lessonBoardLimit({height:probe.getBoundingClientRect().height||viewport.innerHeight,compact:!desktop.matches,focus:doc.body.dataset.lessonFocus==='true'});
    doc.documentElement.style.setProperty('--lesson-board-limit',`${limit}px`);
  }
  function arrange(next=stage){
    stage=next;doc.body.dataset.lessonStage=stage;
    const adjacent=stage==='try'&&desktop.matches&&doc.body.dataset.lessonFocus!=='true';
    const owner=adjacent?panel:heading;
    if(status.parentElement!==owner){if(owner===heading)owner.append(status,instruction);else owner.prepend(status,instruction);}
    if(adjacent){if(footer.parentElement!==panel)panel.append(footer);}
    else if(stage==='try'){if(footer.previousElementSibling!==get('lesson-controls'))get('lesson-controls').after(footer);}
    else if(footer.previousSibling!==home)home.after(footer);
    measure();
  }
  desktop.addEventListener('change',()=>arrange());viewport.addEventListener('resize',measure);
  return {arrange,measure};
}

const $=id=>document.getElementById(id);

export function createBoardCoach({showBoard,navigate}) {
  const panel=$('coach-panel'), popover=$('board-coach-popover');
  const triggers=['board-coach-toggle','board-coach','coach-tab','mobile-coach-tab'].map($);
  popover.insertBefore(panel,$('coach-playback'));
  panel.setAttribute('role','region');
  panel.setAttribute('aria-labelledby','board-coach-title');
  let opened=false;
  function fit() {
    if(!opened)return;
    const viewport=window.visualViewport;
    const bottom=(viewport?.height||innerHeight)+(viewport?.offsetTop||0);
    const dock=matchMedia('(max-width:860px)').matches&&!popover.closest('dialog[open]')?84:16;
    popover.style.setProperty('--coach-available-height',`${Math.max(160,bottom-popover.getBoundingClientRect().top-dock)}px`);
  }
  function close(restoreFocus=true) {
    const hadFocus=popover.contains(document.activeElement);
    opened=false; popover.hidden=true; panel.hidden=true;
    for(const trigger of triggers){trigger.setAttribute('aria-expanded','false');trigger.classList.remove('toggled');}
    if(restoreFocus && hadFocus) $('board-coach-toggle').focus({preventScroll:true});
  }
  function open() {
    showBoard(); opened=true; panel.hidden=false; popover.hidden=false;
    for(const trigger of triggers){trigger.setAttribute('aria-expanded','true');trigger.classList.add('toggled');}
    const rect=$('board-top').getBoundingClientRect();
    if(rect.top<70 || rect.bottom>innerHeight-300) $('board-top').scrollIntoView({block:'start',behavior:'instant'});
    fit();
    $('board-coach-close').focus({preventScroll:true});
  }
  $('board-coach-toggle').onclick=()=>opened?close():open();
  for(const trigger of triggers.slice(1))trigger.onclick=open;
  $('board-coach-close').onclick=()=>close();
  $('coach-previous').onclick=()=>navigate(-1);
  $('coach-next').onclick=()=>navigate(1);
  window.addEventListener('resize',fit,{passive:true});
  window.addEventListener('scroll',fit,{passive:true});
  window.visualViewport?.addEventListener('resize',fit,{passive:true});
  window.visualViewport?.addEventListener('scroll',fit,{passive:true});
  document.addEventListener('click',event=>{
    if(opened && !popover.contains(event.target) && !triggers.some(trigger=>trigger.contains(event.target)))close(false);
  });
  document.addEventListener('keydown',event=>{
    if(opened && event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}
  },true);
  return {open,close};
}

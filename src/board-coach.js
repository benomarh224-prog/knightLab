const $=id=>document.getElementById(id);

export function createBoardCoach({showBoard}) {
  const panel=$('coach-panel'), popover=$('board-coach-popover');
  const triggers=['board-coach-toggle','board-coach','coach-tab','mobile-coach-tab'].map($);
  popover.append(panel);
  panel.setAttribute('role','region');
  panel.setAttribute('aria-labelledby','board-coach-title');
  let opened=false;
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
    if(rect.top<70 || rect.bottom>innerHeight) $('board-top').scrollIntoView({block:'start',behavior:'instant'});
    $('board-coach-close').focus({preventScroll:true});
  }
  $('board-coach-toggle').onclick=()=>opened?close():open();
  for(const trigger of triggers.slice(1))trigger.onclick=open;
  $('board-coach-close').onclick=()=>close();
  document.addEventListener('click',event=>{
    if(opened && !popover.contains(event.target) && !triggers.some(trigger=>trigger.contains(event.target)))close(false);
  });
  document.addEventListener('keydown',event=>{
    if(opened && event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}
  },true);
  return {open,close};
}

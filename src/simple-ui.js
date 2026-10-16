// Keep the existing controls and handlers; only secondary tools move into disclosures.
export function createCompactMenu({host,controls,label='More',document:doc=document}) {
  const menu=doc.createElement('details'),summary=doc.createElement('summary'),panel=doc.createElement('div');
  menu.className='compact-options';summary.textContent=label;summary.setAttribute('aria-label',label+' options');
  panel.className='compact-options-panel';panel.append(...controls);menu.append(summary,panel);host.append(menu);
  menu.addEventListener('click',event=>{
    const action=event.target.closest('button,a');
    if(!action||action.disabled)return;
    const hadFocus=panel.contains(doc.activeElement);
    menu.open=false;if(hadFocus)summary.focus({preventScroll:true});
  });
  return menu;
}

export function installSimpleUI(doc=document) {
  const get=id=>doc.getElementById(id);
  createCompactMenu({host:doc.querySelector('.topbar-actions'),controls:['sidebar-import','how-it-works'].map(get),document:doc}).classList.add('header-options');
  get('sidebar-import').textContent='Import PGN';get('how-it-works').textContent='Quick guide';
  // The mobile navigation already contains Import and Guide.
  const boardMenu=get('board-actions-panel');
  boardMenu.append(get('focus-mode'),get('line-reply'),get('download-pgn'));
  get('board-actions-toggle').setAttribute('aria-label','More board options');
  get('board-actions-toggle').firstElementChild.textContent='More';
  get('board-actions-toggle').title='More board options';
  createCompactMenu({host:get('lesson-controls'),controls:['lesson-reset','lesson-flip','lesson-focus','lesson-explore-start','lesson-explore-resume','lesson-replay','lesson-challenge'].map(get),document:doc}).classList.add('lesson-options');
  // Stages remain available for review without occupying the lesson header.
  createCompactMenu({host:doc.querySelector('.lesson-topline'),controls:[get('lesson-stages'),get('lesson-squares-open')],document:doc}).classList.add('lesson-stage-options');
  get('lesson-reset').textContent='Restart exercise';get('lesson-flip').textContent='Flip board';
  for(const menu of doc.querySelectorAll('.compact-options')) {
    menu.addEventListener('toggle',()=>{
      if(menu.open)for(const other of doc.querySelectorAll('.compact-options'))if(other!==menu)other.open=false;
    });
  }
  doc.addEventListener('click',event=>{
    for(const menu of doc.querySelectorAll('.compact-options'))if(!menu.contains(event.target))menu.open=false;
  });
  doc.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const open=[...doc.querySelectorAll('.compact-options[open]')];
    if(!open.length)return;
    event.preventDefault();event.stopImmediatePropagation();
    for(const menu of open){menu.open=false;menu.querySelector('summary').focus({preventScroll:true});}
  },true);
}

export function coachPlacement(viewport,{x,y}={}){
  const {left=0,top=0,width,height,headerBottom=top}=viewport,gap=12;
  const w=Math.min(460,Math.max(0,width-gap*2));
  const maxHeight=Math.max(120,Math.min(480,height-gap*2));
  const defaultY=Math.max(top+gap,Math.min(headerBottom+gap,top+height-Math.min(maxHeight,240)-gap));
  return {left:Math.max(left+gap,Math.min(x??left+width-w-gap,left+width-w-gap)),top:Math.max(top+gap,Math.min(y??defaultY,top+height-Math.min(maxHeight,240)-gap)),width:w,maxHeight:Math.min(maxHeight,top+height-(y===undefined?defaultY:Math.max(top+gap,Math.min(y,top+height-Math.min(maxHeight,240)-gap)))-gap)};
}

export function createBoardCoach({showBoard,navigate,onInspect=()=>{},doc=document,win=window}) {
  const get=id=>doc.getElementById(id),panel=get('coach-panel'),card=get('board-coach-card');
  const board=doc.querySelector('.board-card'),sidePanel=doc.querySelector('.review-panel'),desktop=win.matchMedia('(min-width:861px)');
  const triggers=['board-coach-toggle','board-coach','coach-tab','mobile-coach-tab'].map(get);
  const launcher=doc.createElement('button');launcher.id='analysis-coach-open';launcher.type='button';launcher.className='analysis-coach-launch';
  launcher.innerHTML='<span class="coach-launch-copy"><strong id="coach-launch-verdict">Move coach</strong><span id="coach-launch-move"></span></span><span class="coach-launch-action">Coach <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></span>';
  launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-controls',card.id);launcher.setAttribute('aria-expanded','false');
  const players=doc.createElement('div');players.className='board-players';
  get('board-top').append(get('line-toolbar'),players);
  doc.querySelector('.board-area').after(board.querySelector('.board-controls'));
  board.querySelector('.board-header-actions').append(board.querySelector('.board-actions'));
  players.append(...board.querySelectorAll(':scope > .player-row'));
  card.insertBefore(panel,get('coach-playback'));
  const header=card.querySelector('.coach-card-heading'),closeButton=get('board-coach-close');header.className='coach-card-heading floating-coach-heading';header.title='Drag to move';header.append(closeButton);
  closeButton.hidden=false;closeButton.textContent='×';closeButton.setAttribute('aria-label','Close move coach');closeButton.removeAttribute('aria-expanded');closeButton.removeAttribute('aria-controls');
  card.classList.add('is-expanded','floating-analysis-coach');card.setAttribute('role','dialog');card.setAttribute('aria-modal','false');card.setAttribute('aria-labelledby','board-coach-title');
  const layered=typeof card.showPopover==='function';if(layered)card.setAttribute('popover','manual');
  panel.hidden=false;panel.removeAttribute('role');panel.removeAttribute('aria-labelledby');
  get('coach-playback').hidden=false;
  let opened=false,preferred=null,drag=null;
  function placement(){
    if(!opened)return;
    const v=win.visualViewport,h=doc.querySelector('.topbar')?.getBoundingClientRect();
    const rect=coachPlacement({left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||win.innerWidth,height:v?.height||win.innerHeight,headerBottom:h?.bottom||0},preferred||{});
    for(const [key,value]of Object.entries(rect))card.style[key]=value+'px';
  }
  function close(restoreFocus=false){
    if(!opened){card.hidden=true;return;}
    opened=false;if(layered&&card.matches(':popover-open'))card.hidePopover();card.hidden=true;
    for(const trigger of [launcher,...triggers])trigger.setAttribute('aria-expanded','false');
    if(restoreFocus&&launcher.getClientRects().length)launcher.focus({preventScroll:true});
  }
  function open(){
    showBoard();if(opened)return;
    const host=board.closest('dialog[open]')||doc.body;if(card.parentElement!==host)host.append(card);
    for(const menu of doc.querySelectorAll('.compact-options[open]'))menu.open=false;
    card.hidden=false;opened=true;if(layered)card.showPopover();
    for(const trigger of [launcher,...triggers])trigger.setAttribute('aria-expanded','true');
    preferred=null;placement();panel.scrollTop=0;closeButton.focus({preventScroll:true});onInspect();
  }
  function position(){
    close();
    if(desktop.matches&&!board.closest('.focus-dialog'))sidePanel.prepend(launcher);else board.querySelector('.board-area').before(launcher);
  }
  function update(){
    get('coach-launch-verdict').textContent=card.dataset.reviewState==='ready'?get('insight-title').textContent:'Move coach';
    get('coach-launch-move').textContent=get('insight-move').textContent;
    launcher.setAttribute('aria-label',`${get('coach-launch-verdict').textContent}${get('insight-move').textContent?' · '+get('insight-move').textContent:''}. Open floating coach`);
  }
  for(const trigger of [launcher,...triggers])trigger.onclick=open;
  closeButton.onclick=()=>close(true);
  get('coach-previous').onclick=()=>navigate(-1);get('coach-next').onclick=()=>navigate(1);
  doc.addEventListener('keydown',event=>{
    if(doc.querySelector('.viewport-menu:not([hidden])'))return;
    if(opened&&event.key==='Escape'&&(!doc.querySelector('dialog[open]')||board.closest('.focus-dialog'))){event.preventDefault();event.stopImmediatePropagation();close(true);}
  },true);
  doc.addEventListener('click',event=>{if(opened&&!card.contains(event.target)&&!board.contains(event.target)&&!sidePanel.contains(event.target))close(false);});
  header.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button'))return;const r=card.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};header.setPointerCapture(event.pointerId);});
  header.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;preferred={x:drag.left+event.clientX-drag.x,y:drag.top+event.clientY-drag.y};placement();});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])header.addEventListener(name,()=>{drag=null;});
  win.addEventListener('resize',placement);win.visualViewport?.addEventListener('resize',placement);win.visualViewport?.addEventListener('scroll',placement);
  desktop.addEventListener('change',position);position();
  return {open,close,update,reveal(){},position,focusLauncher(){launcher.focus({preventScroll:true});},get opened(){return opened;}};
}

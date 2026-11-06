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
  launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-controls',card.id);launcher.setAttribute('aria-expanded','false');
  const summary=doc.createElement('section');summary.id='analysis-coach-summary';summary.className='analysis-coach-summary';summary.setAttribute('aria-label','Move coach');
  summary.innerHTML='<header><strong id="analysis-summary-verdict">Your move coach</strong><span id="analysis-summary-move"></span></header><p id="analysis-summary-text" aria-live="polite" aria-atomic="true">Choose a move to begin.</p><div class="analysis-summary-actions"><button id="analysis-summary-show" type="button" disabled>Show me</button></div>';
  launcher.className='analysis-coach-launch analysis-coach-details';launcher.textContent='Details';summary.querySelector('.analysis-summary-actions').append(launcher);
  summary.querySelector('#analysis-summary-show').onclick=()=>get('coach-show-me').click();
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
    if(desktop.matches&&!board.closest('.focus-dialog'))sidePanel.prepend(summary);else board.prepend(summary);
  }
  function update(report={}){
    const verdict=card.dataset.reviewState==='ready'?get('insight-title').textContent:'Your move coach',move=get('insight-move').textContent;
    get('analysis-summary-verdict').textContent=verdict;get('analysis-summary-move').textContent=move;
    const text=report.teaching?.reason||report.brief||report.summary||get('coach-brief').textContent;
    const message=get('analysis-summary-text');if(message.textContent!==text)message.textContent=text;
    message.title=text;get('analysis-summary-show').disabled=get('coach-show-me').disabled;
    launcher.setAttribute('aria-label',`${verdict}${move?' · '+move:''}. Full coach details`);
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

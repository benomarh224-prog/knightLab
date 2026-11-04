// One positioning/dismissal contract for secondary controls in every workspace.
export function menuPlacement(anchor,{left=0,top=0,width,height,headerBottom=0},panelWidth=250){
  const gap=8,minY=Math.max(top+gap,headerBottom+gap),bottom=top+height-gap;
  const below=Math.max(0,bottom-anchor.bottom-gap),above=Math.max(0,anchor.top-gap-minY);
  const down=below>=Math.min(300,above),maxHeight=Math.max(44,down?below:above);
  const w=Math.min(panelWidth,width-16),x=Math.max(left+gap,Math.min(anchor.right-w,left+width-w-gap));
  return {left:x,width:w,maxHeight,top:down?Math.max(minY,anchor.bottom+gap):Math.max(minY,anchor.top-gap-maxHeight)};
}
const menus=new Set();
export function createViewportMenu({trigger,panel,details=null,doc=document,dismissOnAction=true}){
  let opened=false,raf=0;
  const win=doc.defaultView,layer=typeof panel.showPopover==='function';
  panel.classList.add('viewport-menu');panel.hidden=true;if(layer)panel.setAttribute('popover','manual');
  if(!panel.id)panel.id='secondary-menu-'+(menus.size+1);
  trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','false');
  function position(){
    if(!opened)return;
    const v=win.visualViewport,a=trigger.getBoundingClientRect(),header=doc.querySelector('.topbar')?.getBoundingClientRect();
    const placement=menuPlacement(a,{left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||win.innerWidth,height:v?.height||win.innerHeight,headerBottom:header&&header.top<=0?header.bottom:0});
    for(const [key,value] of Object.entries(placement))panel.style[key]=value+'px';
  }
  function close(restore=true){
    if(!opened)return;opened=false;
    if(layer&&panel.matches(':popover-open'))panel.hidePopover();panel.hidden=true;
    if(details)details.open=false;trigger.setAttribute('aria-expanded','false');
    if(restore&&!(doc.activeElement?.closest('dialog[open]')&&!trigger.closest('dialog[open]')))trigger.focus({preventScroll:true});
  }
  function open(){
    for(const other of menus)if(other!==api)other.close(false);
    if(details)details.open=true;panel.hidden=false;opened=true;
    if(layer)panel.showPopover();trigger.setAttribute('aria-expanded','true');position();panel.scrollTop=0;
  }
  const api={open,close,toggle(){opened?close():open();},get opened(){return opened;}};menus.add(api);
  if(details){trigger.addEventListener('click',event=>{event.preventDefault();api.toggle();});details.addEventListener('toggle',()=>{if(!details.open&&opened)close(false);});}
  trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();if(!opened)open();panel.querySelector('button:not([disabled]),a[href],summary')?.focus();}});
  if(dismissOnAction)panel.addEventListener('click',event=>{const action=event.target.closest('button,a');if(action&&!action.disabled)close(panel.contains(doc.activeElement)||doc.activeElement===trigger);});
  doc.addEventListener('click',event=>{if(opened&&!panel.contains(event.target)&&!trigger.contains(event.target))close(panel.contains(doc.activeElement)||doc.activeElement===doc.body);});
  doc.addEventListener('keydown',event=>{if(opened&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}},true);
  const update=()=>{win.cancelAnimationFrame(raf);raf=win.requestAnimationFrame(position);};
  win.addEventListener('resize',update);win.addEventListener('scroll',update,true);win.visualViewport?.addEventListener('resize',update);win.visualViewport?.addEventListener('scroll',update);
  return api;
}

export function lessonBoardLimit({height,chrome=0,controls=0,navigation=0}){
  // On exceptionally short screens keep a usable board and allow page scrolling.
  return Math.max(220,Math.floor(height-chrome-controls-navigation-24));
}

export function createLessonViewport({doc=document,viewport=window,Observer=globalThis.ResizeObserver}={}){
  const get=id=>doc.getElementById(id),footer=doc.querySelector('.lesson-course-footer');
  const home=doc.createComment('Lesson navigation');get('lesson-stage-panel').after(home);
  const instruction=get('lesson-instruction'),status=get('lesson-mode-status'),heading=doc.querySelector('.lesson-page-heading'),panel=doc.querySelector('.lesson-practice-panel');
  const desktop=viewport.matchMedia('(min-width:1021px)');let stage='learn';
  function extent(element){
    if(!element?.getClientRects().length)return 0;
    const style=viewport.getComputedStyle(element);
    return element.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
  }
  function measure(){
    if(stage!=='try'||!get('lesson-board').getClientRects().length)return;
    const chrome=['.topbar','.lesson-mobile-toolbar','.lesson-topline','.lesson-page-heading'].reduce((sum,selector)=>sum+extent(doc.querySelector(selector)),0)+24;
    const limit=lessonBoardLimit({height:viewport.visualViewport?.height||viewport.innerHeight,chrome,controls:extent(get('lesson-controls')),navigation:footer.parentElement===panel?0:extent(footer)});
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
  const observer=Observer?new Observer(measure):null;
  for(const element of [footer,heading,get('lesson-controls'),doc.querySelector('.topbar'),doc.querySelector('.lesson-mobile-toolbar'),doc.querySelector('.lesson-topline')])if(element)observer?.observe(element);
  desktop.addEventListener('change',()=>arrange());viewport.addEventListener('resize',measure);viewport.visualViewport?.addEventListener('resize',measure);
  return {arrange,measure};
}

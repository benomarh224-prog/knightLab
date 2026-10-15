// Keep a single course outline and set of lesson controls across screen sizes.
export function createLessonLayout({compact,layout,sidebar,drawer,drawerBody,openButton,closeButton,outline,thinking,mode,footer,next,goals,teaching,notes,extras,coach,actions}){
  function close(){if(drawer.open)drawer.close();}
  function arrange(){
    close();
    if(compact.matches){
      drawerBody.append(sidebar);
      extras.append(mode,thinking,goals);
    }else{
      layout.prepend(sidebar);
      footer.insertBefore(mode,next);
      teaching.insertBefore(goals,notes);
      coach.insertBefore(thinking,actions);
    }
    outline.open=true;
    thinking.open=!compact.matches;
  }
  openButton.onclick=()=>{
    if(!compact.matches||drawer.open)return;
    drawer.showModal();
    openButton.setAttribute('aria-expanded','true');
    const current=sidebar.querySelector('[aria-current="step"]');
    current?.focus({preventScroll:true});
    current?.scrollIntoView({block:'nearest'});
  };
  closeButton.onclick=close;
  drawer.addEventListener('close',()=>openButton.setAttribute('aria-expanded','false'));
  compact.addEventListener('change',arrange);
  arrange();
  return {close};
}

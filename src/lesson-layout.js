// Keep a single course outline and set of lesson controls across screen sizes.
export function createLessonLayout({compact,layout,sidebar,drawer,drawerBody,openButton,closeButton,outline}){
  let returnFocus=true;
  function close({restoreFocus=true}={}){returnFocus=restoreFocus;if(drawer.open)drawer.close();}
  function arrange(){
    close({restoreFocus:false});
    if(compact.matches){
      drawerBody.append(sidebar);
    }else{
      layout.prepend(sidebar);
    }
    outline.open=true;
  }
  openButton.onclick=()=>{
    if(!compact.matches||drawer.open)return;
    returnFocus=true;
    drawer.showModal();
    openButton.setAttribute('aria-expanded','true');
    const current=sidebar.querySelector('[aria-current="step"]');
    current?.focus({preventScroll:true});
    current?.scrollIntoView({block:'nearest'});
  };
  closeButton.onclick=()=>close();
  drawer.addEventListener('close',()=>{openButton.setAttribute('aria-expanded','false');if(returnFocus&&compact.matches)openButton.focus({preventScroll:true});});
  compact.addEventListener('change',arrange);
  arrange();
  return {close};
}

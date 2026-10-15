// The same navigation controls live in the header or in a native mobile dialog.
export function createNavigation({compact,nav,desktopSlot,mobileSlot,dialog,toggle,closeButton}){
  function sync(){
    const open=dialog.open;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
  }
  function close(){if(dialog.open)dialog.close();sync();}
  function open(){
    if(!compact.matches||dialog.open)return;
    dialog.showModal();sync();
    (nav.querySelector('[aria-current="page"]')||nav.querySelector('a,button'))?.focus({preventScroll:true});
  }
  function arrange(){close();(compact.matches?mobileSlot:desktopSlot).append(nav);}
  toggle.onclick=()=>dialog.open?close():open();
  closeButton.onclick=close;
  // Close before destination handlers run, so the next dialog can take focus.
  nav.addEventListener('click',event=>{if(event.target.closest('a,button'))close();},true);
  dialog.addEventListener('close',sync);
  compact.addEventListener('change',arrange);
  arrange();
  return {close};
}

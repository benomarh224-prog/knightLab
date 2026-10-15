export const PAGE_PATHS={home:'/',games:'/games/',analysis:'/analysis/',learn:'/learn/',french:'/learn/french-defense/',tactics:'/learn/tactical-vision/',opengames:'/learn/open-games/',beginners:'/learn/chess-for-beginners/'};
export const PAGE_VIEWS={tactics:'french',opengames:'french',beginners:'french'};
const isLesson=page=>page==='french'||page in PAGE_VIEWS;
export function pageFromPath(path){
  const normalized=('/'+String(path||'').split('?')[0].replace(/^\/+|\/+$/g,'' )+'/').replace(/^\/\/$/,'/');
  return Object.keys(PAGE_PATHS).find(page=>PAGE_PATHS[page]===normalized)||'home';
}
export function createPageRouter(onChange){
  let current=null;
  function paint(){
    current=pageFromPath(location.pathname);
    document.body.dataset.page=current;
    document.body.dataset.layout=isLesson(current)?'lesson':current;
    for(const page of document.querySelectorAll('[data-page-view]'))page.hidden=page.dataset.pageView!==(PAGE_VIEWS[current]||current);
    const names={home:'Your next move, better',games:'My games',analysis:'Game analysis',learn:'Learn chess',french:'Learn the French Defense',tactics:'Tactical Vision',opengames:'Italian Game',beginners:'Chess for Beginners'};
    document.title=`${names[current]} · Knightlab`;
    for(const link of document.querySelectorAll('[data-route]')){
      const active=link.dataset.route===current||isLesson(current)&&link.dataset.route==='learn';
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    onChange?.(current);
  }
  function go(page,{replace=false}={}){
    const path=PAGE_PATHS[page]||PAGE_PATHS.home;
    if(location.pathname!==path)history[replace?'replaceState':'pushState']({},'',path);
    paint();window.scrollTo({top:0,behavior:'instant'});
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[data-route]');
    if(!link||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.button!==0)return;
    event.preventDefault();go(link.dataset.route);
  });
  window.addEventListener('popstate',()=>{paint();window.scrollTo({top:0,behavior:'instant'});});
  return {go,start:paint,get page(){return current;}};
}

export const THEME_KEY='roqvyn-theme';
export function readThemePreference(storage){
  try{const value=storage?.getItem(THEME_KEY);return value==='dark'||value==='light'?value:'system';}catch{return 'system';}
}
export function resolveTheme(preference,systemDark=false){return preference==='dark'||preference==='light'?preference:systemDark?'dark':'light';}
export function applyTheme(doc,theme){
  doc.documentElement.dataset.theme=theme;
  doc.documentElement.style.colorScheme=theme;
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#141920':'#24272b');
}
// One controller updates every switch. Storage is independent of lesson,
// review and sound preferences; blocked storage still permits session changes.
export function createAppearance({doc=document,storage,media=window.matchMedia('(prefers-color-scheme: dark)'),win=window}={}){
  let preference=readThemePreference(storage),theme;
  const buttons=[...doc.querySelectorAll('[data-theme-toggle]')];
  function render(announce=false){
    theme=resolveTheme(preference,media.matches);applyTheme(doc,theme);
    for(const button of buttons){
      button.setAttribute('role','switch');button.setAttribute('aria-label','Dark mode');button.setAttribute('aria-checked',String(theme==='dark'));
      const state=button.querySelector('[data-theme-state]');if(state)state.textContent=theme==='dark'?'On':'Off';
    }
    if(announce){const status=doc.getElementById('appearance-status');if(status)status.textContent=theme==='dark'?'Dark mode on':'Dark mode off';}
  }
  function toggle(){preference=theme==='dark'?'light':'dark';try{storage?.setItem(THEME_KEY,preference);}catch{}render(true);}
  for(const button of buttons)button.addEventListener('click',toggle);
  const systemChanged=()=>{if(preference==='system')render();};
  if(media.addEventListener)media.addEventListener('change',systemChanged);else media.addListener?.(systemChanged);
  win.addEventListener('storage',event=>{if(event.key!==THEME_KEY&&event.key!==null)return;preference=readThemePreference(storage);render();});
  render();
  return {toggle,get theme(){return theme;},get preference(){return preference;}};
}

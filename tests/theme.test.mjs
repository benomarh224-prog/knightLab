import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {THEME_KEY,readThemePreference,resolveTheme,createAppearance} from '../src/theme.js';

function fixture({saved,systemDark=false,blocked=false}={}){
 const values=new Map([['lesson-progress','keep'],['knightlab-audio','keep']]);
 if(saved!==undefined)values.set(THEME_KEY,saved);
 const writes=[],events={},mediaEvents={};
 const storage={getItem(key){if(blocked)throw Error('Blocked');return values.get(key)??null;},setItem(key,value){if(blocked)throw Error('Blocked');writes.push([key,value]);values.set(key,value);}};
 const buttons=[0,1].map(()=>({attrs:{},state:{textContent:''},setAttribute(k,v){this.attrs[k]=v;},querySelector(){return this.state;},addEventListener(k,fn){this[k]=fn;}}));
 const meta={setAttribute(k,v){this[k]=v;}},status={textContent:''};
 const doc={documentElement:{dataset:{},style:{}},querySelector:()=>meta,querySelectorAll:()=>buttons,getElementById:()=>status};
 const media={matches:systemDark,addEventListener(k,fn){mediaEvents[k]=fn;}};
 const win={addEventListener(k,fn){events[k]=fn;}};
 const controller=createAppearance({doc,storage,media,win});
 return {values,writes,buttons,doc,media,meta,status,events,mediaEvents,controller,storage};
}

test('appearance follows the system until an explicit valid preference is saved',()=>{
 for(const value of [undefined,'unknown','null'])assert.equal(readThemePreference({getItem:()=>value}),'system');
 assert.equal(readThemePreference({getItem(){throw Error('Blocked');}}),'system');
 assert.equal(readThemePreference(undefined),'system');
 assert.equal(resolveTheme('system',true),'dark');assert.equal(resolveTheme('system',false),'light');
 assert.equal(resolveTheme('light',true),'light');assert.equal(resolveTheme('dark',false),'dark');
 const f=fixture({systemDark:true});assert.equal(f.controller.theme,'dark');
 f.media.matches=false;f.mediaEvents.change();assert.equal(f.controller.theme,'light');
});
test('both accessible switches synchronize, persist only the theme, and reload correctly',()=>{
 const f=fixture();f.buttons[1].click();
 assert.equal(f.doc.documentElement.dataset.theme,'dark');assert.equal(f.doc.documentElement.style.colorScheme,'dark');
 assert.equal(f.meta.content,'#141920');assert.equal(f.status.textContent,'Dark mode on');
 for(const b of f.buttons){assert.deepEqual(b.attrs,{role:'switch','aria-label':'Dark mode','aria-checked':'true'});assert.equal(b.state.textContent,'On');}
 assert.deepEqual(f.writes,[[THEME_KEY,'dark']]);
 assert.equal(f.values.get('lesson-progress'),'keep');assert.equal(f.values.get('knightlab-audio'),'keep');
 assert.equal(fixture({saved:f.values.get(THEME_KEY)}).controller.theme,'dark');
 f.buttons[0].click();assert.equal(f.controller.theme,'light');assert.equal(f.meta.content,'#24272b');
 assert.equal(f.buttons[1].attrs['aria-checked'],'false');assert.equal(f.status.textContent,'Dark mode off');
});
test('explicit preference ignores system changes; cross-tab changes and clear remain synchronized',()=>{
 const f=fixture({saved:'light',systemDark:true});f.mediaEvents.change();assert.equal(f.controller.theme,'light');
 f.values.set(THEME_KEY,'dark');f.events.storage({key:'lesson-progress'});assert.equal(f.controller.theme,'light');
 f.events.storage({key:THEME_KEY});assert.equal(f.controller.theme,'dark');
 f.values.delete(THEME_KEY);f.events.storage({key:null});assert.equal(f.controller.preference,'system');
 f.media.matches=false;f.mediaEvents.change();assert.equal(f.controller.theme,'light');
});
test('blocked browser storage still allows session toggles',()=>{
 const f=fixture({blocked:true,systemDark:true});assert.equal(f.controller.theme,'dark');
 assert.doesNotThrow(()=>f.buttons[0].click());assert.equal(f.controller.theme,'light');
 assert.equal(f.buttons[1].state.textContent,'Off');assert.deepEqual(f.writes,[]);
});
test('the independent first-paint bootstrap applies saved dark before app initialization',async()=>{
 const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('src="/theme-init.js"')<html.indexOf('rel="stylesheet"'));
 const code=await readFile(new URL('../dist/theme-init.js',import.meta.url),'utf8');
 const doc={documentElement:{dataset:{},style:{}},querySelector:()=>null};
 vm.runInNewContext(code,{document:doc,window:{localStorage:{getItem:()=> 'dark'},matchMedia:()=>({matches:false})}});
 assert.equal(doc.documentElement.dataset.theme,'dark');
 const win={matchMedia:()=>({matches:true})};Object.defineProperty(win,'localStorage',{get(){throw Error('Blocked');}});
 assert.doesNotThrow(()=>vm.runInNewContext(code,{document:doc,window:win}));
 assert.equal(doc.documentElement.dataset.theme,'dark');
});

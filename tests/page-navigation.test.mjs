import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPageRouter, PAGE_PATHS, PAGE_VIEWS } from '../src/routes.js';

test('page navigation supports direct course visits, separate game analysis, and browser Back',()=>{
  const saved=Object.fromEntries(['document','window','location','history'].map(key=>[key,globalThis[key]]));
  const events={},windowEvents={},changed=[],stack=['/learn/french-defense/?lesson=advance'];
  const views=Object.keys(PAGE_PATHS).map(page=>({dataset:{pageView:page},hidden:true}));
  const links=Object.keys(PAGE_PATHS).map(page=>({dataset:{route:page},attributes:{},classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];}}));
  const setLocation=path=>{const url=new URL(path,'https://knightlab.example');globalThis.location={pathname:url.pathname,search:url.search};};
  try {
    setLocation(stack[0]);
    globalThis.document={body:{dataset:{}},querySelectorAll:selector=>selector==='[data-page-view]'?views:links,addEventListener:(event,handler)=>events[event]=handler};
    globalThis.window={scrollTo(){},addEventListener:(event,handler)=>windowEvents[event]=handler};
    globalThis.history={pushState(_state,_title,path){stack.push(path);setLocation(path);},replaceState(_state,_title,path){stack[stack.length-1]=path;setLocation(path);}};
    const router=createPageRouter(page=>changed.push(page));router.start();
    assert.equal(router.page,'french');
    assert.equal(links.find(link=>link.dataset.route==='learn').attributes['aria-current'],'page');
    assert.deepEqual(views.filter(view=>!view.hidden).map(view=>view.dataset.pageView),['french']);
    assert.equal(location.search,'?lesson=advance');
    router.go('games');assert.equal(location.pathname,'/games/');
    router.go('analysis');assert.equal(location.pathname,'/analysis/');
    assert.deepEqual(views.filter(view=>!view.hidden).map(view=>view.dataset.pageView),['analysis']);
    stack.pop();setLocation(stack.at(-1));windowEvents.popstate();
    assert.equal(router.page,'games');
    assert.deepEqual(views.filter(view=>!view.hidden).map(view=>view.dataset.pageView),['games']);
    assert.deepEqual(changed,['french','games','analysis','games']);
    let prevented=false;
    const event={target:{closest:()=>links[0]},button:0,ctrlKey:true,preventDefault(){prevented=true;}};
    events.click(event);assert.equal(prevented,false);assert.equal(router.page,'games');
    event.ctrlKey=false;events.click(event);assert.equal(prevented,true);assert.equal(router.page,'home');
    router.go('tactics');assert.equal(location.pathname,'/learn/tactical-vision/');
    assert.equal(document.body.dataset.layout,'lesson');
    assert.deepEqual(views.filter(view=>!view.hidden).map(view=>view.dataset.pageView),['french']);
    assert.equal(links.find(link=>link.dataset.route==='learn').attributes['aria-current'],'page');
    router.go('opengames');assert.equal(location.pathname,'/learn/open-games/');
    assert.equal(document.body.dataset.layout,'lesson');
    assert.deepEqual(views.filter(view=>!view.hidden).map(view=>view.dataset.pageView),['french']);
    assert.equal(links.find(link=>link.dataset.route==='learn').attributes['aria-current'],'page');
    router.go('french');assert.equal(document.body.dataset.layout,'lesson');
    router.go('analysis');assert.equal(document.body.dataset.layout,'analysis');
  } finally {for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
test('page source covers every routed view and uses origin-rooted assets for direct refresh',async()=>{
  const source=await readFile('src/index.html','utf8');
  for(const page of Object.keys(PAGE_PATHS))assert.ok(source.includes(`data-page-view="${PAGE_VIEWS[page]||page}"`));
  assert.match(source,/src="\/app.js"/);
  assert.match(source,/href="\/pages.css"/);
  assert.match(source,/href="\/style.css"/);
  assert.match(source,/href="\/navigation.css"/);
  const engine=await readFile('src/engine.js','utf8');
  assert.match(engine,/new Worker\('\/engine\//);
});

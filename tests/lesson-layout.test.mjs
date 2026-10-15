import test from 'node:test';
import assert from 'node:assert/strict';
import { createLessonLayout } from '../src/lesson-layout.js';

function fixture(mobile){
  function node(){
    return {
      children:[],parent:null,open:false,attributes:{},events:{},focusCount:0,
      append(...items){for(const item of items){item.parent?.remove(item);this.children.push(item);item.parent=this;}},
      prepend(item){item.parent?.remove(item);this.children.unshift(item);item.parent=this;},
      remove(item){this.children=this.children.filter(child=>child!==item);item.parent=null;},
      insertBefore(item,before){item.parent?.remove(item);this.children.splice(this.children.indexOf(before),0,item);item.parent=this;},
      addEventListener(name,handler){this.events[name]=handler;},
      setAttribute(name,value){this.attributes[name]=value;},
      showModal(){this.open=true;this.shown=(this.shown||0)+1;},
      close(){this.open=false;this.events.close?.();},
      focus(){this.focusCount++;},scrollIntoView(){this.scrolled=true;},
    };
  }
  const ui=Object.fromEntries(['layout','sidebar','drawer','drawerBody','openButton','closeButton','outline','thinking','mode','footer','next','goals','teaching','notes','extras','coach','actions'].map(name=>[name,node()]));
  const current=node();ui.sidebar.querySelector=()=>current;
  ui.layout.append(ui.sidebar,ui.teaching);ui.footer.append(ui.mode,ui.next);
  ui.teaching.append(ui.coach,ui.goals,ui.notes);ui.coach.append(ui.thinking,ui.actions);
  ui.compact={matches:mobile,addEventListener(_event,handler){this.change=handler;}};
  const controller=createLessonLayout(ui);
  return {ui,current,controller};
}

test('responsive lesson layout moves only the outline and leaves stage controls and teaching in place',()=>{
  const {ui}=fixture(false);
  const savedProgress={exercise:'advanced-17',solved:3};ui.sidebar.progress=savedProgress;
  let stageClicks=0;ui.mode.onclick=()=>stageClicks++;
  for(let i=0;i<3;i++){
    ui.compact.matches=true;ui.compact.change();
    assert.equal(ui.sidebar.parent,ui.drawerBody);
    assert.deepEqual(ui.extras.children,[]);
    assert.deepEqual(ui.footer.children,[ui.mode,ui.next]);
    assert.deepEqual(ui.teaching.children,[ui.coach,ui.goals,ui.notes]);
    assert.equal(ui.outline.open,true);
    ui.mode.onclick();
    ui.compact.matches=false;ui.compact.change();
    assert.equal(ui.layout.children[0],ui.sidebar);
    assert.deepEqual(ui.footer.children,[ui.mode,ui.next]);
    assert.deepEqual(ui.teaching.children,[ui.coach,ui.goals,ui.notes]);
    assert.deepEqual(ui.coach.children,[ui.thinking,ui.actions]);
    assert.equal(ui.extras.children.length,0);
  }
  assert.equal(ui.sidebar.progress,savedProgress);
  assert.equal(stageClicks,3);
});

test('compact course picker focuses the active lesson and closes without a stale modal on desktop',()=>{
  const {ui,current,controller}=fixture(true);
  ui.openButton.onclick();ui.openButton.onclick();
  assert.equal(ui.drawer.open,true);assert.equal(ui.drawer.shown,1);
  assert.equal(current.focusCount,1);assert.equal(current.scrolled,true);
  assert.equal(ui.openButton.attributes['aria-expanded'],'true');
  controller.close();assert.equal(ui.openButton.attributes['aria-expanded'],'false');
  ui.openButton.onclick();ui.closeButton.onclick();assert.equal(ui.drawer.open,false);
  ui.openButton.onclick();ui.compact.matches=false;ui.compact.change();
  assert.equal(ui.drawer.open,false);assert.equal(ui.sidebar.parent,ui.layout);
  assert.equal(ui.openButton.attributes['aria-expanded'],'false');
  ui.openButton.onclick();assert.equal(ui.drawer.open,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from '../src/navigation.js';

function fixture(mobile=true){
  const current={focus(){this.focused=true;}};
  const nav={listeners:{},querySelector:()=>current,addEventListener(event,handler,capture){this.listeners[event]={handler,capture};}};
  const slot=()=>({append(child){child.parent=this;}});
  const dialog={open:false,listeners:{},showModal(){this.open=true;this.shown=(this.shown||0)+1;},close(){this.open=false;this.listeners.close();},addEventListener(event,handler){this.listeners[event]=handler;}};
  const toggle={attributes:{},setAttribute(key,value){this.attributes[key]=value;}},closeButton={};
  const compact={matches:mobile,addEventListener(_event,handler){this.change=handler;}};
  const desktopSlot=slot(),mobileSlot=slot();
  const controller=createNavigation({compact,nav,desktopSlot,mobileSlot,dialog,toggle,closeButton});
  return {controller,nav,dialog,toggle,closeButton,compact,desktopSlot,mobileSlot,current};
}

test('mobile navigation uses the same controls, focuses the current page, and tracks native dismissal',()=>{
  const {nav,mobileSlot,toggle,dialog,current}=fixture();
  assert.equal(nav.parent,mobileSlot);assert.equal(toggle.attributes['aria-expanded'],'false');
  toggle.onclick();assert.equal(dialog.open,true);assert.equal(current.focused,true);
  assert.equal(toggle.attributes['aria-expanded'],'true');assert.equal(toggle.attributes['aria-label'],'Close navigation menu');
  dialog.close(); // Native Escape or backdrop dismissal dispatches this close event.
  assert.equal(toggle.attributes['aria-expanded'],'false');assert.equal(toggle.attributes['aria-label'],'Open navigation menu');
  toggle.onclick();toggle.onclick();assert.equal(dialog.open,false);
});

test('activating a destination closes navigation before a destination opens another dialog',()=>{
  const {nav,dialog,toggle}=fixture();toggle.onclick();
  assert.equal(nav.listeners.click.capture,true);
  nav.listeners.click.handler({target:{closest:()=>null}});
  assert.equal(dialog.open,true);
  nav.listeners.click.handler({target:{closest:()=>({})}});
  assert.equal(dialog.open,false);assert.equal(toggle.attributes['aria-expanded'],'false');
});

test('resize restores the live desktop navigation without a stale open modal or detached handlers',()=>{
  const {controller,nav,compact,desktopSlot,mobileSlot,toggle,dialog,closeButton}=fixture(false);
  const liveState={games:17};nav.liveState=liveState;
  assert.equal(nav.parent,desktopSlot);toggle.onclick();assert.equal(dialog.open,false);
  compact.matches=true;compact.change();assert.equal(nav.parent,mobileSlot);
  toggle.onclick();closeButton.onclick();assert.equal(dialog.open,false);
  toggle.onclick();compact.matches=false;compact.change();
  assert.equal(dialog.open,false);assert.equal(nav.parent,desktopSlot);assert.equal(nav.liveState,liveState);
  assert.equal(toggle.attributes['aria-expanded'],'false');assert.equal(typeof nav.listeners.click.handler,'function');
  controller.close();assert.equal(nav.parent,desktopSlot);
});

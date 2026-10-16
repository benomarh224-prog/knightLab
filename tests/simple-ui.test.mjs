import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompactMenu} from '../src/simple-ui.js';

function fixture(){
 const doc={activeElement:null,createElement(tag){
  return {tag,children:[],events:{},attributes:{},open:false,
   append(...children){for(const child of children){if(child.parent)child.parent.children.splice(child.parent.children.indexOf(child),1);child.parent=this;this.children.push(child);}},
   setAttribute(key,value){this.attributes[key]=value;},addEventListener(key,fn){this.events[key]=fn;},
   contains(child){return child===this||this.children.some(node=>node.contains(child));},
   focus(){doc.activeElement=this;},closest(){return this.tag==='button'?this:null;}};
 }};
 const host=doc.createElement('div'),control=doc.createElement('button'),original=doc.createElement('div');
 original.append(control);let calls=0;control.onclick=()=>calls++;control.progress={solved:true};
 const menu=createCompactMenu({host,controls:[control],document:doc});
 return {doc,host,control,original,menu,summary:menu.children[0],panel:menu.children[1],get calls(){return calls;}};
}

test('secondary tools retain their handlers and state and return keyboard focus after use',()=>{
 const h=fixture();assert.equal(h.original.children.length,0);assert.equal(h.panel.children[0],h.control);
 assert.equal(h.control.progress.solved,true);assert.equal(h.menu.open,false);
 h.menu.open=true;h.control.focus();h.control.onclick();h.menu.events.click({target:h.control});
 assert.equal(h.calls,1);assert.equal(h.menu.open,false);assert.equal(h.doc.activeElement,h.summary);
});

test('disabled actions leave More open, and pointer use does not steal outside focus',()=>{
 const h=fixture();h.menu.open=true;h.control.disabled=true;
 h.menu.events.click({target:h.control});assert.equal(h.menu.open,true);
 h.control.disabled=false;const outside=h.doc.createElement('button');outside.focus();
 h.menu.events.click({target:h.control});assert.equal(h.menu.open,false);assert.equal(h.doc.activeElement,outside);
});

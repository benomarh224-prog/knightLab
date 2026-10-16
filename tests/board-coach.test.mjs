import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoardCoach } from '../src/board-coach.js';

function fixture(wide){
 const elements=new Map(),listeners={};let focusMode=false;
 function node(id){
  if(elements.has(id))return elements.get(id);
  const classes=new Set();
  const element={id,children:[],attributes:{},classList:{contains:key=>classes.has(key),add:key=>classes.add(key),remove:key=>classes.delete(key),toggle(key,on){if(on??!classes.has(key))classes.add(key);else classes.delete(key);}},
   setAttribute(key,value){this.attributes[key]=value;},contains(child){return child===this||this.children.some(item=>item.contains(child));},
   append(...children){for(const child of children){child.parent?.children.splice(child.parent.children.indexOf(child),1);child.parent=this;this.children.push(child);}},
   prepend(child){this.append(child);this.children.splice(this.children.indexOf(child),1);this.children.unshift(child);},
   before(child){this.parent.append(child);},after(child){this.parent.append(child);},insertBefore(child){this.append(child);},
   querySelector(selector){return node(selector);},querySelectorAll(){return [];},closest(selector){return selector==='.focus-dialog'&&focusMode?{}:null;},focus(){document.activeElement=this;}};
  elements.set(id,element);return element;
 }
 const board=node('.board-card'),side=node('.review-panel'),area=node('.board-area'),card=node('board-coach-card');
 board.append(area,card);card.append(node('coach-panel'));
 const desktop={matches:wide,addEventListener(_event,handler){this.change=handler;}};
 globalThis.matchMedia=query=>query.includes('min-width')?desktop:{matches:!desktop.matches};
 globalThis.document={activeElement:null,getElementById:node,createElement:()=>node('players'),querySelector:node,addEventListener(event,handler){listeners[event]=handler;}};
 const controller=createBoardCoach({showBoard(){},navigate(){}});
 return {controller,desktop,node,board,side,area,card,listeners,set focusMode(value){focusMode=value;}};
}

test('desktop coach sits next to the board and resizing moves the same live panel above it',()=>{
 const h=fixture(true),panel=h.node('coach-panel');
 assert.equal(h.card.parent,h.side);assert.equal(h.card.contains(panel),true);assert.equal(h.card.classList.contains('is-expanded'),true);
 assert.equal(h.node('board-coach-close').hidden,true);
 panel.focus();h.desktop.matches=false;h.desktop.change();
 assert.equal(h.card.parent,h.board);assert.equal(h.card.contains(panel),true);assert.equal(document.activeElement,panel);
 assert.equal(h.card.classList.contains('is-expanded'),false);assert.equal(h.node('board-coach-close').hidden,false);
 h.desktop.matches=true;h.desktop.change();assert.equal(h.card.parent,h.side);
});

test('focus mode brings the coach along and an adjacent coach does not swallow Escape from other dialogs',()=>{
 const h=fixture(true);let prevented=false;
 const escape={key:'Escape',preventDefault(){prevented=true;},stopImmediatePropagation(){}};
 h.listeners.keydown(escape);assert.equal(prevented,false);
 h.focusMode=true;h.controller.position();assert.equal(h.card.parent,h.board);assert.equal(h.card.classList.contains('is-expanded'),false);
 h.node('board-coach-close').onclick();assert.equal(h.card.classList.contains('is-expanded'),true);
 // close() is tested independently of viewport geometry in reveal().
 h.controller.close();assert.equal(h.card.classList.contains('is-expanded'),false);
 h.focusMode=false;h.controller.position();assert.equal(h.card.parent,h.side);
});

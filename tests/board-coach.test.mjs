import test from 'node:test';import assert from 'node:assert/strict';import {createBoardCoach,coachPlacement} from '../src/board-coach.js';
function fixture(wide=false){
 const nodes=new Map(),listeners={};let focusMode=false,otherDialog=null,created=0,active=null;
 function node(id){if(nodes.has(id))return nodes.get(id);const classes=new Set();let name=id;
 const n={children:[],attributes:{},style:{},dataset:{},events:{},hidden:false,textContent:'',
 get id(){return name;},set id(v){nodes.delete(name);name=v;nodes.set(v,this);},
 classList:{contains:k=>classes.has(k),add(...keys){keys.forEach(k=>classes.add(k));},remove:k=>classes.delete(k)},
 setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},
 contains(child){return this===child||this.children.some(n=>n.contains(child));},
 append(...children){for(const child of children){if(child.parent)child.parent.children=child.parent.children.filter(x=>x!==child);child.parent=this;child.parentElement=this;this.children.push(child);}},
 prepend(child){this.append(child);this.children.pop();this.children.unshift(child);},before(child){const p=this.parent;p.append(child);p.children.pop();p.children.splice(p.children.indexOf(this),0,child);},after(child){this.parent.append(child);},insertBefore(child,before){this.append(child);this.children.pop();this.children.splice(this.children.indexOf(before),0,child);},
 querySelector:s=>node(s),querySelectorAll:()=>[],closest(s){return focusMode&&(s==='.focus-dialog'||s==='dialog[open]')?node('focus-dialog'):null;},focus(){active=this;},getClientRects(){return[{}];},getBoundingClientRect(){return{left:12,top:76,bottom:64};},
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);},showPopover(){this.popover=true;},hidePopover(){this.popover=false;},matches(){return !!this.popover;},setPointerCapture(){}
 };nodes.set(id,n);return n;}
 const board=node('.board-card'),side=node('.review-panel'),area=node('.board-area'),card=node('board-coach-card'),panel=node('coach-panel');board.append(area,card,node('.board-controls'));card.append(node('.coach-card-heading'),panel,node('coach-playback'));node('body').append(board,side);
 const desktop={matches:wide,addEventListener(_e,fn){this.change=fn;}};
 const doc={getElementById:node,createElement:()=>node('created-'+(++created)),body:node('body'),querySelector:s=>s==='dialog[open]'?otherDialog:s.includes('viewport-menu')?null:node(s),querySelectorAll:()=>[],addEventListener(k,fn){listeners[k]=fn;}};
 const win={matchMedia:()=>desktop,innerWidth:390,innerHeight:844,addEventListener(){}};
 let moved=0;const controller=createBoardCoach({doc,win,showBoard(){},navigate(delta){moved+=delta;}});
 return{controller,node,card,panel,board,side,desktop,listeners,get active(){return active;},get moved(){return moved;},set focusMode(v){focusMode=v;},set otherDialog(v){otherDialog=v;}};
}
test('analysis coach floats in a top layer with one live explanation and a compact launcher in the workspace',()=>{
 const h=fixture(true),launcher=h.node('analysis-coach-open');assert.equal(launcher.parent,h.side);assert.equal(h.card.hidden,true);
 h.controller.open();assert.equal(h.card.parent,h.node('body'));assert.equal(h.card.popover,true);assert.equal(h.card.contains(h.panel),true);assert.equal(h.card.attributes['aria-modal'],'false');assert.equal(h.active.id,'board-coach-close');
 h.card.dataset.reviewState='ready';h.node('insight-title').textContent='Inaccuracy';h.node('insight-move').textContent='24... Qe1';h.controller.update();assert.equal(h.controller.opened,true);assert.equal(h.node('coach-launch-verdict').textContent,'Inaccuracy');
 h.node('coach-next').onclick();assert.equal(h.moved,1);assert.equal(h.controller.opened,true);
 h.node('board-coach-close').onclick();assert.equal(h.card.hidden,true);assert.equal(h.active,launcher);h.desktop.matches=false;h.desktop.change();assert.equal(launcher.parent,h.board);
});
test('floating coach works inside Focus and only consumes Escape for its own open layer',()=>{
 const h=fixture();let prevented=false;const e={key:'Escape',preventDefault(){prevented=true;},stopImmediatePropagation(){}};
 h.listeners.keydown(e);assert.equal(prevented,false);h.focusMode=true;h.otherDialog=h.node('focus-dialog');h.controller.open();assert.equal(h.card.parent,h.node('focus-dialog'));
 h.listeners.keydown(e);assert.equal(prevented,true);assert.equal(h.controller.opened,false);h.focusMode=false;h.otherDialog=null;h.controller.open();h.otherDialog=h.node('import-dialog');prevented=false;h.listeners.keydown(e);assert.equal(prevented,false);assert.equal(h.controller.opened,true);h.controller.close();
});
test('floating coach placements and dragged positions stay inside mobile, landscape and desktop viewports',()=>{
 for(const [width,height]of[[360,740],[390,844],[430,844],[844,390],[1280,600]])for(const requested of[{}, {x:-500,y:-500},{x:3000,y:3000}]){
 const r=coachPlacement({width,height,headerBottom:64},requested);assert.ok(r.left>=12&&r.top>=12);assert.ok(r.left+r.width<=width-12);assert.ok(r.top+r.maxHeight<=height-12);assert.ok(r.maxHeight>=120);
 }
});

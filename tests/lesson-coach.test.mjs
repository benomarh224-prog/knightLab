import test from 'node:test';import assert from 'node:assert/strict';
import {createLessonCoach} from '../src/lesson-coach.js';
function fixture(){
 const nodes=new Map();let active=null;
 const node=id=>{if(nodes.has(id))return nodes.get(id);const n={id,children:[],parent:null,hidden:false,disabled:false,isConnected:true,open:false,events:{},attributes:{},textContent:'',
 append(...children){for(const child of children){child.parent?.remove(child);this.children.push(child);child.parent=this;}},remove(child){this.children=this.children.filter(n=>n!==child);child.parent=null;},
 before(child){const parent=this.parent;parent.append(child);parent.children.splice(parent.children.indexOf(child),1);parent.children.splice(parent.children.indexOf(this),0,child);},
 after(child){const parent=this.parent;child.parent?.remove(child);parent.children.splice(parent.children.indexOf(this)+1,0,child);child.parent=parent;},
 setAttribute(k,v){this.attributes[k]=v;},focus(){active=this;},addEventListener(k,fn){(this.events[k]??=[]).push(fn);},fire(k,event={}){for(const f of this.events[k]||[])f(event);},
 showModal(){this.open=true;},close(){this.open=false;this.fire('close');},getBoundingClientRect(){return{left:10,top:10,right:300,bottom:500};},click(){this.onclick?.();}};nodes.set(id,n);return n;};
 const panel=node('panel'),more=node('lesson-more'),practice=node('practice');practice.append(panel);node('workspace').append(more);
 const compact={matches:true,addEventListener(_k,fn){this.change=fn;}};
 const doc={getElementById:node,querySelector:()=>panel,querySelectorAll:()=>[],createComment:()=>node('home')};
 const coach=createLessonCoach({doc,compact});return {coach,node,panel,more,practice,compact,get active(){return active;}};
}
test('shared coach moves live lesson tools between phone dialog and desktop without replacing progress or handlers',()=>{
 const f=fixture(),saved={solved:2};f.panel.progress=saved;let clicks=0;f.node('lesson-hint').onclick=()=>clicks++;
 assert.equal(f.panel.parent,f.node('lesson-coach-tools'));assert.equal(f.more.parent,f.node('lesson-coach-tools'));
 f.coach.update({lessonKey:'one',stage:'try',title:'Find the capture',instruction:'Capture a pawn'});f.coach.open(f.node('lesson-hint'));
 assert.equal(f.node('lesson-coach-dialog').open,true);assert.equal(f.active.id,'lesson-coach-close');f.node('lesson-coach-hint').click();assert.equal(clicks,1);
 f.compact.matches=false;f.compact.change();assert.equal(f.panel.parent,f.practice);assert.equal(f.more.parent,f.node('lesson-coach-details'));assert.equal(f.panel.progress,saved);assert.equal(f.active.id,'lesson-hint');
 f.compact.matches=true;f.compact.change();assert.equal(f.panel.progress,saved);assert.equal(f.panel.parent,f.node('lesson-coach-tools'));
});
test('coach closes on stage changes, Escape and outside click and restores an enabled focus target',()=>{
 const f=fixture(),dialog=f.node('lesson-coach-dialog');f.coach.update({lessonKey:'one',stage:'try'});f.coach.open(f.node('lesson-hint'));f.node('lesson-hint').disabled=true;
 let prevented=false;dialog.fire('keydown',{key:'Escape',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(dialog.open,false);assert.equal(f.active.id,'lesson-coach-open');
 f.coach.open();dialog.fire('click',{target:dialog,clientX:1,clientY:1});assert.equal(dialog.open,false);
 f.coach.open();f.coach.update({lessonKey:'one',stage:'check'});assert.equal(dialog.open,false);assert.equal(f.node('lesson-coach-open').hidden,true);
});

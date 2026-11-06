import test from 'node:test';import assert from 'node:assert/strict';
import {createLessonCoach} from '../src/lesson-coach.js';
function fixture(){
 const nodes=new Map();let active=null;
 const node=id=>{if(nodes.has(id))return nodes.get(id);const n={id,children:[],parent:null,hidden:false,disabled:false,isConnected:true,open:false,events:{},attributes:{},textContent:'',get parentElement(){return this.parent;},
 append(...children){for(const child of children){child.parent?.remove(child);this.children.push(child);child.parent=this;}},remove(child){this.children=this.children.filter(n=>n!==child);child.parent=null;},
 before(child){const parent=this.parent;parent.append(child);parent.children.splice(parent.children.indexOf(child),1);parent.children.splice(parent.children.indexOf(this),0,child);},
 after(child){const parent=this.parent;child.parent?.remove(child);parent.children.splice(parent.children.indexOf(this)+1,0,child);child.parent=parent;},
 setAttribute(k,v){this.attributes[k]=v;},focus(){active=this;},addEventListener(k,fn){(this.events[k]??=[]).push(fn);},fire(k,event={}){for(const f of this.events[k]||[])f(event);},
 contains(target){return this===target||this.children.some(child=>child.contains(target));},show(){this.open=true;this.modeless=true;},close(){this.open=false;this.fire('close');},getBoundingClientRect(){return{left:10,top:10,right:300,bottom:250,height:240};},click(){this.onclick?.();}};nodes.set(id,n);return n;};
 const panel=node('panel'),more=node('lesson-more'),practice=node('practice');practice.append(panel);node('workspace').append(more);
 const compact={matches:true,addEventListener(_k,fn){this.change=fn;}};
 const doc=node('document');Object.assign(doc,{getElementById:node,querySelector:s=>s==='.topbar'?node('header'):panel,querySelectorAll:()=>[],documentElement:{style:{setProperty(){}}},body:{dataset:{}}});
 node('lesson-coach-content').append(node('lesson-coach-tools'),node('lesson-coach-details'));
 const viewport={addEventListener(){},scrollBy(){throw Error('Coach must not scroll the page');}};
 const coach=createLessonCoach({doc,compact,viewport});return {coach,node,panel,more,practice,compact,doc,get active(){return active;}};
}
test('shared coach moves live lesson tools between phone dialog and desktop without replacing progress or handlers',()=>{
 const f=fixture(),saved={solved:2};f.panel.progress=saved;let clicks=0;f.node('lesson-hint').onclick=()=>clicks++;
 assert.equal(f.panel.parent,f.node('lesson-coach-tools'));assert.equal(f.more.parent,f.node('lesson-coach-details'));
 f.coach.update({lessonKey:'one',stage:'try',title:'Find the capture',instruction:'Capture a pawn'});f.coach.open(f.node('lesson-hint'));
 assert.equal(f.node('lesson-coach-dialog').open,true);assert.equal(f.node('lesson-coach-dialog').modeless,true);assert.equal(f.active.id,'lesson-coach-close');f.node('lesson-coach-hint').click();assert.equal(clicks,1);
 f.compact.matches=false;f.compact.change();assert.equal(f.node('lesson-coach-content').parent,f.node('lesson-coach-inline'));assert.equal(f.more.parent,f.node('lesson-coach-details'));assert.equal(f.panel.progress,saved);assert.equal(f.active.id,'lesson-hint');
 f.coach.open();assert.equal(f.node('lesson-coach-dialog').open,false);assert.equal(f.active.id,'lesson-coach-heading');
 f.compact.matches=true;f.compact.change();assert.equal(f.panel.progress,saved);assert.equal(f.panel.parent,f.node('lesson-coach-tools'));
});
test('coach closes on stage changes, Escape and outside click and restores an enabled focus target',()=>{
 const f=fixture(),dialog=f.node('lesson-coach-dialog');f.coach.update({lessonKey:'one',stage:'try'});f.coach.open(f.node('lesson-hint'));f.node('lesson-hint').disabled=true;
 let prevented=false;f.doc.fire('keydown',{key:'Escape',preventDefault(){prevented=true;},stopPropagation(){}});assert.equal(prevented,true);assert.equal(dialog.open,false);assert.equal(f.active.id,'lesson-coach-open');
 f.coach.open();f.doc.fire('pointerdown',{target:f.node('lesson-board')});assert.equal(dialog.open,true);
 f.doc.fire('pointerdown',{target:f.node('outside')});assert.equal(dialog.open,false);
 f.coach.open();f.coach.update({lessonKey:'one',stage:'check'});assert.equal(dialog.open,false);assert.equal(f.node('lesson-coach-open').hidden,true);
});

test('desktop Focus uses the same modeless coach and restores its content when leaving Focus',()=>{
 const f=fixture();f.compact.matches=false;f.compact.change();f.doc.body.dataset.lessonFocus='true';f.coach.update({lessonKey:'one',stage:'try'});
 f.coach.open();assert.equal(f.node('lesson-coach-content').parent,f.node('lesson-coach-dialog'));assert.equal(f.node('lesson-coach-dialog').open,true);
 f.doc.body.dataset.lessonFocus='false';f.coach.update({lessonKey:'one',stage:'try'});assert.equal(f.node('lesson-coach-content').parent,f.node('lesson-coach-inline'));assert.equal(f.node('lesson-coach-dialog').open,false);
});

test('Details stays above the mobile board and never scrolls or adds document padding',()=>{
 const f=fixture();f.doc.documentElement.style.setProperty=()=>{throw Error('Coach must not resize the page');};
 f.coach.update({lessonKey:'bishop',stage:'try'});
 assert.equal(f.node('lesson-coach-open').parent,f.node('lesson-summary-details'));
 assert.equal(f.node('lesson-coach-open').textContent,'Details');
 assert.equal(f.node('lesson-solution-recap').parent,f.node('lesson-coach-tools'));
 f.coach.open();assert.equal(f.node('lesson-coach-dialog').open,true);f.coach.close();
 assert.equal(f.active.id,'lesson-coach-open');
});

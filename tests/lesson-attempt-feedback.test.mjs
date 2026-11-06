import test from 'node:test';import assert from 'node:assert/strict';
import {lessonAttemptFeedback,createLessonAttemptEffect} from '../src/lesson-attempt-feedback.js';
import {COURSES} from '../src/courses.js';import {LessonPlayer} from '../src/lesson-player.js';

function fixture(reduced=false){
 const timers=new Map();let id=0,animations=0,cancels=0;
 const overlay={hidden:true,dataset:{}},target={style:{},dataset:{},animate(){animations++;return{cancel(){cancels++;}};}};
 const clock={setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 return{overlay,target,timers,effect:createLessonAttemptEffect({overlay,target,clock,reduced:()=>reduced}),get animations(){return animations;},get cancels(){return cancels;}};
}
test('move cues distinguish an illegal attempt from a legal alternative without moving the study position',()=>{
 const c=COURSES.beginners,l=c.lessons.find(l=>l.id==='pawn-moves-and-captures'),p=new LessonPlayer({lesson:l,study:c.study(l.id),progressKey:c.key,storage:{getItem:()=>null,setItem(){}}});const before=p.session.fen;
 assert.deepEqual(lessonAttemptFeedback(p.attempt('c4','c6'),'c4','c6'),{kind:'illegal',square:'c6'});
 assert.deepEqual(lessonAttemptFeedback(p.attempt('c4','c5'),'c4','c5'),{kind:'objective',square:'c5'});assert.equal(p.session.fen,before);assert.equal(p.boardComplete,false);
 assert.equal(lessonAttemptFeedback(p.attempt('c4','b5'),'c4','b5'),null);assert.equal(p.boardComplete,true);
});
test('free legal play, completed positions and promotion choices never create an error cue',()=>{
 for(const status of ['played','correct','finished','promotion','inactive'])assert.equal(lessonAttemptFeedback({status},'c4','c5'),null);
 assert.equal(lessonAttemptFeedback({status:'illegal'},'missing','c5'),null);
});
test('the cue follows board orientation and render-only repositioning cannot replay it',()=>{
 const h=fixture();h.effect.show({kind:'illegal',square:'e4'});assert.equal(h.overlay.hidden,false);assert.equal(h.target.style.gridColumn,'5');assert.equal(h.target.style.gridRow,'5');
 h.effect.position(true);assert.equal(h.target.style.gridColumn,'4');assert.equal(h.target.style.gridRow,'4');h.effect.position(true);assert.equal(h.animations,1);assert.equal(h.overlay.dataset.sequence,'1');
 h.effect.clear();assert.equal(h.overlay.hidden,true);assert.equal(h.timers.size,0);assert.equal(h.cancels,1);
});
test('a repeated attempt replaces its cue; an older timeout cannot erase the new one',()=>{
 const h=fixture();h.effect.show({kind:'illegal',square:'c6'});const stale=[...h.timers.values()][0];h.effect.show({kind:'objective',square:'c5'});
 stale();assert.equal(h.overlay.hidden,false);assert.equal(h.overlay.dataset.kind,'objective');assert.equal(h.target.dataset.symbol,'?');assert.equal(h.overlay.dataset.sequence,'2');
 [...h.timers.values()][0]();assert.equal(h.overlay.hidden,true);assert.equal(h.timers.size,0);
});
test('reduced motion uses the same explanatory static marker without animation',()=>{
 const h=fixture(true);h.effect.show({kind:'illegal',square:'a1'},true);assert.equal(h.animations,0);assert.equal(h.overlay.hidden,false);assert.equal(h.target.style.gridColumn,'8');assert.equal(h.target.style.gridRow,'1');
 h.effect.clear();assert.equal(h.overlay.hidden,true);
});

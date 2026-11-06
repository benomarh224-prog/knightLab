import test from 'node:test';
import assert from 'node:assert/strict';
import {nextReviewPosition} from '../src/review-schedule.js';
import {classifyMove,parseGame} from '../src/game.js';
import {coachMove} from '../src/coach.js';
import {createReviewCache} from '../src/review-cache.js';
const score=(cp,best,depth=18)=>({cp,mate:null,best,depth,pv:best?[best]:[]});

test('review starts around a late selected move, adapts to navigation, and covers every missing position once',()=>{
 const scores=[],attempted=new Set(),picked=[];
 assert.equal(nextReviewPosition(100,95,scores,'quick',attempted),94);
 for(let count=0;count<100;count++){
  const index=nextReviewPosition(100,count>4?12:95,scores,'quick',attempted);
  assert.equal(attempted.has(index),false);attempted.add(index);picked.push(index);scores[index]=score(0);
 }
 assert.deepEqual(picked.slice(0,3),[94,95,96]);assert.ok(picked.indexOf(11)<10);
 assert.equal(new Set(picked).size,100);assert.equal(nextReviewPosition(100,0,scores,'quick',attempted),null);
});
test('precise searches cannot loop forever on an unfinished depth; resume retries those positions',()=>{
 const scores=[score(0,null,18),score(0,null,19)],tried=new Set();
 assert.equal(nextReviewPosition(2,1,scores,'precise',tried),0);tried.add(0);
 assert.equal(nextReviewPosition(2,1,scores,'precise',tried),null);
 assert.equal(nextReviewPosition(2,1,scores,'precise',new Set()),0);
});
test('rating and coach caches reuse unchanged evidence and invalidate when deeper evidence changes',()=>{
 const p=parseGame('1. e4 e5 *'),m=p.moves[0],before=score(0,'e2e4'),after=score(0,'e7e5');
 const first=classifyMove(m,before,after);assert.equal(classifyMove(m,before,after),first);
 const report=coachMove(m,before,after);assert.equal(coachMove(m,before,after),report);
 after.cp=-250;assert.notEqual(classifyMove(m,before,after),first);assert.notEqual(coachMove(m,before,after),report);
 assert.equal(classifyMove(m,before,after).loss,250);
 before.best='d2d4';assert.equal(classifyMove(m,before,after).best,'d4');
});
test('fast evidence survives reload and remains separate from Standard and Deep evidence',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 createReviewCache(storage).save('1. e4 *','quick',[score(0,'e2e4'),score(20,'e7e5')]);
 const restored=createReviewCache(storage);assert.equal(restored.load('1. e4 *','quick',2).length,2);
 assert.equal(restored.load('1. e4 *','deep',2).length,0);assert.equal(restored.load('1. e4 *','precise',2).length,0);
});

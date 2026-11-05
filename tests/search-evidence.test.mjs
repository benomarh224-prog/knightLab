import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {completedSearch} from '../src/engine.js';
import {createReviewCache} from '../src/review-cache.js';
import {evaluationReady} from '../src/review-quality.js';

const s=(depth,cp,pv,multipv=1)=>({depth,cp,pv,multipv,mate:null});
test('an interrupted MultiPV iteration cannot mix a new move with an older score or continuation',()=>{
 const fen=new Chess().fen(),first=s(18,30,['e2e4','e7e5']),second=s(18,15,['d2d4','d7d5'],2);
 const frames=new Map([[18,new Map([[1,first],[2,second]])],[19,new Map([[1,s(19,40,['d2d4','d7d5'])]])]]);
 const result=completedSearch(frames,'e2e4',fen);
 assert.equal(result.best,result.pv[0]);assert.equal(result.cp,30);assert.equal(result.depth,18);
 assert.equal(result.alternative.depth,result.depth);assert.equal(result.alternative.cp,15);assert.equal(result.rootFen,fen);
 assert.throws(()=>completedSearch(frames,'c2c4',fen),/matching evidence/);
});
test('forced replies with one PV and deliberate reduced-skill choices retain their own legal line',()=>{
 const fen=new Chess().fen(),single=new Map([[1,s(20,10,['e2e4','e7e5'])]]);
 assert.equal(completedSearch(new Map([[20,single]]),'e2e4',fen).alternative,null);
 single.set(2,s(20,5,['d2d4'],2));single.set(3,s(20,-5,['g1f3'],3));
 assert.equal(completedSearch(new Map([[20,single]]),'g1f3',fen).cp,-5);
 assert.throws(()=>completedSearch(new Map([[20,new Map([[1,s(20,0,['e2e4','e2e3'])]])]]),'e2e4',fen),/Invalid move/);
});
test('stored evidence is migrated without deleting it; only coherent new evidence is complete after reload',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},cache=createReviewCache(storage);
 cache.save('game','precise',[s(22,0,['e2e4'])]);
 const old=createReviewCache(storage).load('game','precise',1)[0];
 assert.equal(old.cp,0);assert.equal(old.legacy,true);assert.equal(evaluationReady(old,'precise'),false);
 const current={...s(18,15,['e2e4']),searchVersion:2,rootFen:new Chess().fen(),best:'e2e4'};
 cache.save('game','precise',[current]);const restored=createReviewCache(storage).load('game','precise',1)[0];
 assert.equal(restored.rootFen,current.rootFen);assert.equal(evaluationReady(restored,'precise'),true);
});

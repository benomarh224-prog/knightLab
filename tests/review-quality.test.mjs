import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluationReady, reviewSearch,depthReady,positionSearch,strongerScore,DEFAULT_REVIEW_MODE,PRECISION_DEPTH,INSPECTION_DEPTH,loadReviewMode } from '../src/review-quality.js';

test('deep review requires the target depth and only retries unfinished positions', () => {
  assert.equal(evaluationReady({cp:0,depth:17},'precise'),false);
  assert.equal(evaluationReady({cp:NaN,depth:18},'precise'),false);
  assert.equal(evaluationReady({cp:0,depth:18},'precise'),false);
  assert.equal(evaluationReady({cp:0,depth:19},'precise'),true);
  assert.equal(evaluationReady({cp:0,terminal:true,depth:0},'precise'),true);
  assert.deepEqual(reviewSearch('precise'),{depth:19,milliseconds:4500});
  assert.equal(reviewSearch('precise',{searchTime:4500}).milliseconds,9000);
  assert.equal(reviewSearch('precise',{searchTime:20000}).milliseconds,40000);
  assert.equal(reviewSearch('precise',{searchTime:80000}).milliseconds,80000);
  assert.deepEqual(reviewSearch('deep'),{depth:16,milliseconds:2200});
});

test('retry budgets grow after a completed search even when it returns a shallower score',()=>{
  const previous={cp:20,depth:18,searchTime:4500};
  const attempted=strongerScore(previous,{cp:12,depth:16,searchTime:9000});
  assert.equal(attempted.depth,18);
  assert.equal(attempted.searchTime,9000);
  const interrupted=strongerScore(attempted,{cp:22,depth:19,searchTime:18000,interrupted:true});
  assert.equal(interrupted.depth,19);
  assert.equal(interrupted.searchTime,9000);
  assert.equal(strongerScore(undefined,{cp:0,depth:12,searchTime:4500,interrupted:true}).searchTime,0);
});

test('default review and free analysis have real depth floors; cached legacy evidence stays provisional',()=>{
  assert.equal(DEFAULT_REVIEW_MODE,'precise');assert.equal(positionSearch().depth,19);
  assert.equal(PRECISION_DEPTH,19);assert.equal(INSPECTION_DEPTH,19);
  assert.equal(positionSearch(20).milliseconds,20000);
  assert.equal(evaluationReady({cp:0,depth:15},'deep'),false);
  assert.equal(evaluationReady({cp:0,depth:16},'deep'),true);
  for(const mode of ['quick','deep','precise'])assert.equal(evaluationReady({cp:0,depth:22,legacy:true},mode),false);
  assert.equal(depthReady({cp:0,terminal:true,legacy:true},20),true);
  const stronger={cp:20,depth:20},weaker={cp:40,depth:17};
  assert.equal(strongerScore(stronger,weaker),stronger);
  assert.equal(strongerScore({...stronger,legacy:true},weaker),weaker);
  assert.equal(strongerScore({cp:0},weaker),weaker);
});

test('the depth-19 preference upgrades older saved modes once without touching game or lesson data',()=>{
  for(const saved of ['quick','deep','precise',null]){
    const data=new Map([['roqvyn-review-mode',saved],['knightlab-course','saved lesson'],['knightlab-review-evidence-v1','cached scores']]);
    const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
    assert.equal(loadReviewMode(storage),'precise');assert.equal(data.get('roqvyn-review-mode'),'precise');
    assert.equal(data.get('knightlab-course'),'saved lesson');assert.equal(data.get('knightlab-review-evidence-v1'),'cached scores');
    storage.setItem('roqvyn-review-mode','quick');assert.equal(loadReviewMode(storage),'quick');
  }
});
test('depth-19 review still starts with unavailable or blocked preference storage',()=>{
  assert.equal(loadReviewMode(undefined),'precise');
  assert.equal(loadReviewMode({getItem(){throw Error('Blocked');}}),'precise');
  assert.equal(loadReviewMode({getItem(){return null;},setItem(){throw Error('Full');}}),'precise');
});

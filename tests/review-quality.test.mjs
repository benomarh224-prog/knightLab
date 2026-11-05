import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluationReady, reviewSearch,depthReady,positionSearch,strongerScore,DEFAULT_REVIEW_MODE } from '../src/review-quality.js';

test('deep review requires the target depth and only retries unfinished positions', () => {
  assert.equal(evaluationReady({cp:0,depth:17},'precise'),false);
  assert.equal(evaluationReady({cp:NaN,depth:18},'precise'),false);
  assert.equal(evaluationReady({cp:0,depth:18},'precise'),true);
  assert.equal(evaluationReady({cp:0,terminal:true,depth:0},'precise'),true);
  assert.deepEqual(reviewSearch('precise'),{depth:18,milliseconds:20000});
  assert.equal(reviewSearch('precise',{searchTime:20000}).milliseconds,40000);
  assert.equal(reviewSearch('precise',{searchTime:80000}).milliseconds,80000);
  assert.deepEqual(reviewSearch('deep'),{depth:16,milliseconds:6000});
});

test('default review and free analysis have real depth floors; cached legacy evidence stays provisional',()=>{
  assert.equal(DEFAULT_REVIEW_MODE,'precise');assert.equal(positionSearch().depth,18);
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

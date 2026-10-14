import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluationReady, reviewSearch } from '../src/review-quality.js';

test('deep review requires the target depth and only retries unfinished positions', () => {
  assert.equal(evaluationReady({cp:0,depth:17},'precise'),false);
  assert.equal(evaluationReady({cp:NaN,depth:18},'precise'),false);
  assert.equal(evaluationReady({cp:0,depth:18},'precise'),true);
  assert.equal(evaluationReady({cp:0,terminal:true,depth:0},'precise'),true);
  assert.deepEqual(reviewSearch('precise'),{depth:18,milliseconds:20000,clearHash:true});
  assert.equal(reviewSearch('precise',{searchTime:20000}).milliseconds,40000);
  assert.equal(reviewSearch('precise',{searchTime:80000}).milliseconds,80000);
  assert.equal(reviewSearch('deep'),650);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { moveAccuracy, gameAccuracy } from '../src/accuracy.js';
import { parseGame } from '../src/game.js';

test('accuracy rewards engine choices and improvement, penalizes evaluation loss', () => {
  const move = parseGame('1. e4 *').moves[0];
  assert.equal(moveAccuracy(move,{cp:0,best:'e2e4'},{cp:-50}),100);
  assert.equal(moveAccuracy(move,{cp:0},{cp:100}),100);
  const small = moveAccuracy(move,{cp:0},{cp:-50}), large = moveAccuracy(move,{cp:0},{cp:-400});
  assert.ok(small < 100 && large < small && large >= 0);
});
test('accuracy normalizes losses for Black and stays finite for mate scores', () => {
  const moves = parseGame('1. e4 e5 *').moves;
  const white = moveAccuracy(moves[0],{cp:80},{cp:-80});
  const black = moveAccuracy(moves[1],{cp:-80},{cp:80});
  assert.ok(Math.abs(white-black)<1e-10);
  const mate = moveAccuracy(moves[0],{cp:10000,mate:3},{cp:-10000,mate:-2});
  assert.ok(Number.isFinite(mate) && mate >= 0 && mate <= 100);
});
test('partial review uses only adjacent valid scores and separates player coverage', () => {
  const parsed = parseGame('1. e4 e5 2. Nf3 Nc6 *');
  const accuracy = gameAccuracy(parsed,[{cp:0,best:'e2e4'},{cp:0},undefined,{cp:20},{cp:NaN}]);
  assert.equal(accuracy.w.score,100); assert.equal(accuracy.w.reviewed,1);
  assert.equal(accuracy.w.total,2); assert.equal(accuracy.w.complete,false);
  assert.equal(accuracy.b.score,null); assert.equal(accuracy.b.reviewed,0);
  assert.equal(moveAccuracy(parsed.moves[0],null,{cp:0}),null);
});
test('a completed review marks both sides complete without inventing a zero-move score', () => {
  const parsed = parseGame('1. e4 *');
  const accuracy = gameAccuracy(parsed,[{cp:0},{cp:0}]);
  assert.equal(accuracy.w.complete,true); assert.equal(accuracy.w.score,100);
  assert.equal(accuracy.b.complete,true); assert.equal(accuracy.b.score,null); assert.equal(accuracy.b.total,0);
});
test('the exact engine promotion choice counts as best', () => {
  const parsed = parseGame('[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=N *');
  assert.equal(moveAccuracy(parsed.moves[0],{cp:0,best:'a7a8n'},{cp:0}),100);
});

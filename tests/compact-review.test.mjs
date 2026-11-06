import test from 'node:test';
import assert from 'node:assert/strict';
import { compactCoachText, compactMoveText,reviewPlayerName } from '../src/compact-review.js';

test('PGN placeholder names display the player color without modifying imported names',()=>{
  assert.equal(reviewPlayerName('?','white'),'White');assert.equal(reviewPlayerName('  ','black'),'Black');
  assert.equal(reviewPlayerName(null,'white'),'White');assert.equal(reviewPlayerName('Paul Morphy','white'),'Paul Morphy');
});

test('compact coaching preserves short tactical facts and normalizes whitespace',()=>{
  assert.equal(compactCoachText('Black can take your knight on b5.'),'Black can take your knight on b5.');
  assert.equal(compactCoachText('  Black\n has   Qh4#: checkmate. '),'Black has Qh4#: checkmate.');
  assert.equal(compactCoachText(null),'');
});
test('long coaching is bounded at a word boundary while the source remains complete',()=>{
  const original='Black can play Bxb5+, taking your pawn on b5 with check. The continuation then puts pressure on the king and needs a deeper review.';
  const compact=compactCoachText(original);
  assert.ok(compact.length<=96);
  assert.ok(compact.endsWith('…'));
  assert.ok(original.startsWith(compact.slice(0,-1)));
  assert.match(original,/deeper review\.$/);
});
test('move chips retain standard capture, castling, promotion and mate notation without repeated move numbers',()=>{
  for(const san of ['Nf3','O-O','O-O-O','exd6','a8=Q+','Qxh7#'])assert.equal(compactMoveText({san,color:'b',before:'fen b - - 0 17'}),san);
  assert.equal(compactMoveText(null),'Start');
});

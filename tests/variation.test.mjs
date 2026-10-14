import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { Variation } from '../src/variation.js';
import { parseGame, DEMO_PGN } from '../src/game.js';

test('exploration accepts legal moves for both sides and preserves the game', () => {
  const parsed = parseGame(DEMO_PGN), original = JSON.stringify(parsed);
  const variation = new Variation(parsed.fens[0]);
  assert.equal(variation.play('e2','e4').status, 'played');
  assert.equal(variation.play('e7','e5').status, 'played');
  assert.deepEqual(variation.moves.map(move => move.san), ['e4','e5']);
  assert.equal(variation.play('e1','e5').status, 'illegal');
  assert.equal(variation.chess.turn(), 'w');
  assert.equal(JSON.stringify(parsed), original);
  variation.undo(); assert.equal(variation.chess.turn(), 'b');
  variation.reset(); assert.equal(variation.fen, parsed.fens[0]); assert.equal(variation.moves.length, 0);
});
test('promotion requires explicit choice and accepts underpromotion', () => {
  const variation = new Variation('7k/P7/8/8/8/8/8/7K w - - 0 1');
  const before = variation.fen;
  assert.equal(variation.play('a7','a8').status, 'promotion'); assert.equal(variation.fen, before);
  assert.equal(variation.play('a7','a8','n').status, 'played'); assert.equal(variation.chess.get('a8').type, 'n');
  variation.undo(); assert.equal(variation.fen, before);
});
test('castling and en passant use complete chess rules and undo correctly', () => {
  const castle = new Variation('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  castle.play('e1','g1'); assert.equal(castle.chess.get('f1').type, 'r'); assert.equal(castle.chess.get('h1'), undefined);
  castle.undo(); assert.equal(castle.fen, castle.startFen);
  const passant = new Variation('7k/8/8/3pP3/8/8/8/7K w - d6 0 1');
  passant.play('e5','d6'); assert.equal(passant.chess.get('d5'), undefined);
  passant.undo(); assert.equal(passant.fen, passant.startFen);
});
test('engine responses from an older revision are rejected even after undo or reset', () => {
  const variation = new Variation(new Chess().fen()), first = variation.snapshot();
  variation.play('e2','e4'); variation.undo();
  assert.equal(variation.fen, first.fen);
  assert.equal(variation.engineMove('e2e4', first).status, 'stale');
  const second = variation.snapshot(); variation.reset();
  assert.equal(variation.engineMove('d2d4', second).status, 'stale');
  assert.equal(variation.engineMove('e2e4', variation.snapshot()).status, 'played');
  assert.equal(variation.engineMove('(none)', variation.snapshot()).status, 'stale');
});
test('terminal positions are recognized and cannot accept an engine move', () => {
  const chess = new Chess(); chess.loadPgn('1. f3 e5 2. g4 Qh4#');
  const variation = new Variation(chess.fen()); assert.equal(variation.ending, 'Checkmate');
  assert.equal(variation.play('e1','e2').status, 'illegal');
  assert.equal(new Variation('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').ending, 'Stalemate');
});
test('repetition is tracked within the variation and undo restores a playable position', () => {
  const variation = new Variation(new Chess().fen());
  for (let i = 0; i < 2; i++) for (const move of ['g1f3','g8f6','f3g1','f6g8']) variation.play(move.slice(0,2), move.slice(2));
  assert.equal(variation.ending, 'Draw');
  variation.undo(); assert.equal(variation.ending, null);
});

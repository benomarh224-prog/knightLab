import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { PlaySession } from '../src/play.js';

const start = new Chess().fen();
test('computer mode locks the engine side and accepts its valid response', () => {
  const play = new PlaySession(start, {mode:'engine', color:'w'});
  assert.equal(play.engineTurn, false);
  assert.equal(play.play('e2','e4').status, 'played');
  assert.equal(play.engineTurn, true);
  assert.equal(play.play('e7','e5').status, 'locked');
  assert.equal(play.engineMove('e7e5', play.snapshot()).status, 'played');
  assert.equal(play.engineTurn, false);
});
test('undo removes a reply and the human move, or cancels a pending response', () => {
  const play = new PlaySession(start, {mode:'engine',color:'w'});
  play.play('e2','e4'); const pending = play.snapshot();
  assert.equal(play.undoTurn().length, 1);
  assert.equal(play.engineMove('e7e5', pending).status, 'stale');
  play.play('d2','d4'); play.engineMove('d7d5', play.snapshot());
  assert.equal(play.undoTurn().length, 2); assert.equal(play.fen, start);
});
test('playing Black lets the engine open and undo keeps the initial engine move', () => {
  const play = new PlaySession(start, {mode:'engine',color:'b'});
  assert.equal(play.engineTurn, true);
  play.engineMove('e2e4', play.snapshot());
  assert.equal(play.canUndo, false); assert.deepEqual(play.undoTurn(), []);
  const opening = play.fen;
  play.play('e7','e5'); play.engineMove('g1f3', play.snapshot());
  assert.equal(play.undoTurn().length, 2); assert.equal(play.fen, opening);
});
test('free play permits both sides, mode changes invalidate pending results', () => {
  const play = new PlaySession(start);
  play.play('e2','e4'); const pending = play.snapshot();
  play.configure('engine','b');
  assert.equal(play.engineMove('e7e5', pending).status, 'stale');
  play.configure('free','w'); assert.equal(play.play('e7','e5').status, 'played');
  assert.equal(play.undoTurn().length, 1); assert.equal(play.chess.turn(), 'b');
});
test('custom play positions promote legally and exported PGN preserves the start', () => {
  const fen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
  const play = new PlaySession(fen);
  assert.equal(play.play('a7','a8').status, 'promotion');
  assert.equal(play.play('a7','a8','r').status, 'played');
  const imported = new Chess(); imported.loadPgn(play.exportPgn());
  assert.equal(imported.fen(), play.fen); assert.equal(imported.header().FEN, fen);
  play.reset(); assert.equal(play.fen, fen); assert.equal(play.moves.length, 0);
});
test('mate ends play and exports the correct result; a draw also ends play', () => {
  const play = new PlaySession(start);
  for (const move of ['f2f3','e7e5','g2g4','d8h4']) play.play(move.slice(0,2), move.slice(2));
  assert.equal(play.ending, 'Checkmate'); assert.equal(play.engineTurn, false);
  assert.equal(play.play('a2','a3').status, 'finished');
  assert.match(play.exportPgn(), /\[Result "0-1"\]/);
  const drawn = new PlaySession('7k/8/8/8/8/8/8/7K w - - 0 1');
  assert.equal(drawn.ending, 'Draw'); assert.equal(drawn.play('h1','g1').status, 'finished');
});

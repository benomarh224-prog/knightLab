import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame, classifyMove } from '../src/game.js';
import { selectedMoveVerdict, pieceMoveVerdict } from '../src/verdict.js';

test('move verdicts have explicit starting and not-analyzed states', () => {
  assert.equal(selectedMoveVerdict(null,null).label,'Starting position');
  const move = parseGame('1. e4 *').moves[0];
  const verdict = selectedMoveVerdict(move,null);
  assert.equal(verdict.label,'Not analyzed yet');
  assert.equal(verdict.move,'1. e4');
  assert.equal(verdict.tone,'pending');
});

test('the verdict uses the selected move’s notation and matching rating after navigation', () => {
  const moves = parseGame('1. e4 e5 *').moves;
  const first = selectedMoveVerdict(moves[0],classifyMove(moves[0],{cp:30,best:'e2e4'},{cp:25}));
  const next = selectedMoveVerdict(moves[1],classifyMove(moves[1],{cp:25,best:'c7c5'},{cp:250}));
  assert.equal(first.label,'Best move');
  assert.equal(first.move,'1. e4');
  assert.equal(next.label,'Blunder');
  assert.equal(next.move,'1... e5');
  assert.equal(next.tone,'blunder');
});

test('great moves use their own label and color tone', () => {
  const move = parseGame('1. e4 *').moves[0];
  const classification = classifyMove(move,{cp:150,best:'e2e4',depth:12,alternative:{cp:30,depth:12}},{cp:145});
  const verdict = selectedMoveVerdict(move,classification);
  assert.equal(verdict.label,'Great move');
  assert.equal(verdict.tone,'great');
  assert.equal(verdict.symbol,'!');
});

test('piece badges belong to the selected destination and never show an unrated move', () => {
  const moves = parseGame('1. e4 e5 *').moves;
  const classification = classifyMove(moves[0],{cp:30,best:'e2e4'},{cp:25});
  assert.equal(pieceMoveVerdict(null,classification),null);
  assert.equal(pieceMoveVerdict(moves[0],null),null);
  assert.equal(pieceMoveVerdict(moves[0],classification).square,'e4');
  assert.equal(pieceMoveVerdict(moves[1],{label:'Good',loss:0,best:'e5'}).square,'e5');
});

test('castling, captures, and promotion place a badge on the moved piece', () => {
  const opera = parseGame('1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O *');
  const rating = {label:'Best',loss:0,best:'O-O-O'};
  const castling = opera.moves.at(-1);
  assert.equal(pieceMoveVerdict(castling,rating).square,'c1');
  assert.equal(pieceMoveVerdict(opera.moves.find(move=>move.san==='Nxb5'),rating).square,'b5');
  const promotion = parseGame('[SetUp "1"]\n[FEN "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"]\n\n1. a8=Q+ *').moves[0];
  assert.equal(pieceMoveVerdict(promotion,rating).square,'a8');
});

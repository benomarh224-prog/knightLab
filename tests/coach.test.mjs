import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { coachMove, legalLine } from '../src/coach.js';
import { parseGame, DEMO_PGN } from '../src/game.js';

const score = (cp, best, pv = [], mate = null) => ({cp,best,pv,mate,depth:14});
test('coach waits for complete move evidence instead of inventing an explanation', () => {
  const move = parseGame('1. e4 *').moves[0];
  assert.equal(coachMove(null,null,null).status,'start');
  const pending = coachMove(move,score(0,'d2d4'),null);
  assert.equal(pending.status,'pending'); assert.equal(pending.bestMove,null);
  assert.equal(coachMove(move,score(NaN,'d2d4'),score(0,'e7e5')).status,'pending');
});
test('engine lines are replayed legally and stop at the first invalid move', () => {
  const line = legalLine(new Chess().fen(),['e2e4','e7e5','g1f3','a1a8','b8c6']);
  assert.deepEqual(line.map(move=>move.san),['e4','e5','Nf3']);
  assert.deepEqual(legalLine('invalid',[]),[]);
});
test('coach explains an immediately captured moved piece and provides a legal alternative', () => {
  const move = parseGame(DEMO_PGN).moves[18];
  const report = coachMove(move,score(20,'a2a3',['a2a3','b5b4']),score(-330,'c6b5',['c6b5']));
  assert.equal(report.rating,'Blunder');
  assert.match(report.why,/Black plays cxb5/); assert.match(report.why,/knight you just moved/);
  assert.match(report.why,/b5/); assert.equal(report.bestMove,'a2a3');
  assert.match(report.bestLine,/a3/); assert.match(report.replyLine,/cxb5/);
});
test('a sound sacrifice is not described as an automatic mistake', () => {
  const move = parseGame(DEMO_PGN).moves[18];
  const report = coachMove(move,score(300,'c3b5',['c3b5']),score(310,'c6b5',['c6b5']));
  assert.equal(report.rating,'Best'); assert.match(report.why,/considers compensation/);
  assert.doesNotMatch(report.summary,/blunder|mistake/);
});
test('mate explanations distinguish a new forced mate and do not call mate loss pawns', () => {
  const move = parseGame('1. f3 e5 2. g4 Qh4# 0-1').moves[2];
  const report = coachMove(move,score(0,'g1h3'),score(-10000,'d8h4',['d8h4'],-1));
  assert.match(report.why,/now finds a forced mate for Black/);
  assert.match(report.why,/Qh4# delivers mate immediately/);
  assert.doesNotMatch(report.summary,/100\.00 pawns/);
  const repeated = coachMove(move,score(-10000,'g1h3',[],-2),score(-10000,'d8h4',['d8h4'],-1));
  assert.match(repeated.why,/still finds/);
});
test('development and central control are grounded in the legal alternative', () => {
  const move = parseGame('1. a3 *').moves[0];
  const report = coachMove(move,score(0,'g1f3',['g1f3','d7d5']),score(-70,'e7e5',['e7e5']));
  assert.match(report.better,/develops the knight from g1 to f3/);
  assert.match(report.better,/d4 and e5/); assert.match(report.lesson,/developing a minor piece/);
});
test('a positional loss is described conservatively without an invented tactic', () => {
  const move = parseGame('1. e4 *').moves[0];
  const report = coachMove(move,score(0,'d2d4',['d2d4']),score(-120,'e7e5',['e7e5','g1f3','b8c6']));
  assert.match(report.why,/does not establish one clear tactical cause/);
  assert.match(report.why,/Deep review/);
});
test('invalid or inconsistent engine PVs never create an illegal recommended line', () => {
  const move = parseGame('1. e4 *').moves[0];
  const invalid = coachMove(move,score(0,'e2e8',['e2e8']),score(-100,'e7e5'));
  assert.equal(invalid.bestMove,null); assert.equal(invalid.bestLine,'');
  const mismatched = coachMove(move,score(0,'d2d4',['e2e4','e7e5']),score(-100,'e7e5'));
  assert.equal(mismatched.bestLine,'1. d4');
});
test('Black coaching keeps evaluation perspective and names the White reply correctly', () => {
  const move = parseGame('1. e4 f6 *').moves[1];
  const report = coachMove(move,score(0,'e7e5',['e7e5']),score(150,'d1h5',['d1h5']));
  assert.equal(report.rating,'Mistake'); assert.match(report.why,/White can answer with Qh5\+/);
  assert.match(report.comparison,/White’s view/); assert.match(report.title,/1\.\.\. f6/);
});
test('a fork explanation names only valuable pieces actually attacked from the destination', () => {
  const parsed = parseGame('[SetUp "1"]\n[FEN "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1"]\n\n1. Nc7+ *');
  const report = coachMove(parsed.moves[0],score(100,'b5c7',['b5c7']),score(100,'e8d7',['e8d7']));
  assert.match(report.better,/king on e8/); assert.match(report.better,/rook on a8/);
  assert.doesNotMatch(report.better,/wins|traps/);
});

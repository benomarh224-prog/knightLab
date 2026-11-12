import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame } from '../src/game.js';
import { assessPlayGame, reviewPlayGame } from '../src/play-assessment.js';

const game = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 *');
const score = cp => ({ cp, mate: null, depth: 14 });

test('reports the human side accuracy and recommends an adjacent difficulty from the result', () => {
  const steady = game.fens.map(() => score(0));
  assert.deepEqual(assessPlayGame({ ...game, color:'w', result:'1-0', difficulty:'casual' }, steady), {
    accuracy:100, outcome:'win', moves:10, level:'Precise', recommended:'challenging',
  });
  const blackLosses = game.fens.map((_, index) => score(index % 2 ? -250 : 250));
  const black = assessPlayGame({ ...game, color:'b', result:'1-0', difficulty:'casual' }, blackLosses);
  assert.equal(black.outcome, 'loss');
  assert.ok(black.accuracy < 63);
  assert.equal(black.level, 'Foundations');
  assert.equal(black.recommended, 'beginner');
  const draw = assessPlayGame({ ...game, color:'b', result:'1/2-1/2', difficulty:'strong' }, steady);
  assert.equal(draw.outcome, 'draw');
  assert.equal(draw.recommended, 'strong');
});

test('unfinished evidence, short games, and assisted play never assign a performance level', () => {
  const scores = game.fens.map(() => score(0));
  const full = { ...game, color:'w', result:'1-0', difficulty:'casual' };
  assert.equal(assessPlayGame(full, scores.slice(0, -1)).accuracy, null);
  const assisted = assessPlayGame({ ...full, assisted:true }, scores);
  assert.equal(assisted.accuracy, 100);
  assert.equal(assisted.level, null);
  assert.equal(assisted.recommended, null);
  const short = { ...full, moves:game.moves.slice(0, 18), fens:game.fens.slice(0, 19) };
  assert.equal(assessPlayGame(short, scores.slice(0, 19)).moves, 9);
  assert.equal(assessPlayGame(short, scores.slice(0, 19)).level, null);
});

test('retry keeps prior scores and a canceled review cannot apply a late response', async () => {
  const short = parseGame('1. e4 e5 *');
  const scores = [score(0)];
  let active = true;
  let progressed = 0;
  const callbacks = { active:() => active, progress:() => progressed++ };
  const engine = { async evaluate(fen, options, history) {
    assert.equal(fen, short.fens[1]);
    assert.deepEqual(history.moves, ['e2e4']);
    assert.equal(options.multiPV, 1);
    active = false;
    return score(0);
  } };
  await reviewPlayGame(short, scores, engine, callbacks);
  assert.equal(progressed, 0);
  assert.equal(scores.length, 1);
  active = true;
  await reviewPlayGame(short, scores, { evaluate:async () => score(0) }, callbacks);
  assert.equal(progressed, 2);
  assert.equal(scores.length, 3);
});

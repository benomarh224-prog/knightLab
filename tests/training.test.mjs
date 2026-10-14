import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { parseGame } from '../src/game.js';
import { collectTraining, PracticeSession } from '../src/training.js';

const parsed = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. O-O d6 *');
const cp = [0, -120, 100, -60, 0, -250, -250, -250, -250, -250, -250];
const evaluations = parsed.fens.map((fen, index) => {
  const played = parsed.moves[index];
  const best = new Chess(fen).moves({ verbose: true }).find(move => !played || move.from + move.to + (move.promotion || '') !== played.from + played.to + (played.promotion || ''));
  return { cp: cp[index], mate: null, depth: 12, best: best ? best.from + best.to + (best.promotion || '') : null };
});

test('key moments select the largest reviewed swings and display them in game order', () => {
  const { moments } = collectTraining(parsed, evaluations);
  assert.deepEqual(moments.map(event => event.ply), [2, 3, 5]);
  assert.deepEqual(moments.map(event => event.rating.loss), [220, 160, 250]);
});

test('connected account practice uses only that player’s mistakes; PGN practice uses both', () => {
  assert.deepEqual(collectTraining(parsed, evaluations, 'w').exercises.map(exercise => exercise.ply), [5, 3, 1]);
  assert.deepEqual(collectTraining(parsed, evaluations, 'b').exercises.map(exercise => exercise.ply), [2, 4]);
  assert.equal(collectTraining(parsed, evaluations).exercises.length, 5);
});

test('practice positions are before the error and contain a legal engine alternative', () => {
  for (const exercise of collectTraining(parsed, evaluations).exercises) {
    assert.equal(exercise.fen, parsed.fens[exercise.ply - 1]);
    const chess = new Chess(exercise.fen);
    const move = chess.move({ from: exercise.solution.slice(0,2), to: exercise.solution.slice(2,4), promotion: exercise.solution[4] });
    assert.equal(move.san, exercise.bestSAN);
    assert.notEqual(exercise.bestSAN, exercise.played);
    assert.equal(chess.turn(), exercise.color === 'w' ? 'b' : 'w');
  }
});

test('partial review and missing engine alternatives do not create unsolvable exercises', () => {
  assert.equal(collectTraining(parsed, []).exercises.length, 0);
  assert.equal(collectTraining(parsed, evaluations.slice(0, 2)).exercises.length, 1);
  assert.equal(collectTraining(parsed, evaluations.map(score => ({ ...score, best: '(none)' }))).exercises.length, 0);
});

test('wrong and illegal attempts preserve the puzzle, then a correct move counts once', () => {
  const session = new PracticeSession(collectTraining(parsed, evaluations).exercises);
  const exercise = session.exercise;
  assert.equal(session.submit('a1', 'a8').status, 'illegal');
  assert.equal(session.attempts, 0);
  const wrong = new Chess(exercise.fen).moves({ verbose: true }).find(move => move.from + move.to + (move.promotion || '') !== exercise.solution);
  assert.equal(session.submit(wrong.from, wrong.to, wrong.promotion).status, 'retry');
  assert.equal(session.answerFen, null);
  assert.equal(session.exercise.fen, exercise.fen);
  assert.equal(session.next(), false);
  assert.equal(session.submit(exercise.solution.slice(0,2), exercise.solution.slice(2,4), exercise.solution[4]).status, 'correct');
  assert.equal(session.solved, 1);
  assert.equal(session.attempts, 2);
  assert.equal(session.submit(exercise.solution.slice(0,2), exercise.solution.slice(2,4)).status, 'locked');
  assert.equal(session.solved, 1);
});

test('revealing and completing a session keep separate solved and revealed totals', () => {
  const exercise = collectTraining(parsed, evaluations).exercises[0];
  const session = new PracticeSession([exercise, exercise]);
  session.reveal(); session.reveal();
  assert.equal(session.revealed, 1);
  assert.equal(session.solved, 0);
  assert.equal(session.next(), true);
  assert.equal(session.hint, false);
  assert.equal(session.status, 'playing');
  session.submit(exercise.solution.slice(0,2), exercise.solution.slice(2,4), exercise.solution[4]);
  assert.equal(session.next(), false);
  assert.equal(session.finished, true);
  assert.equal(session.solved + session.revealed, 2);
});

test('promotion requires a piece choice and accepts the engine’s underpromotion', () => {
  const session = new PracticeSession([{ fen: '8/P7/8/8/8/8/6k1/4K3 w - - 0 1', solution: 'a7a8n', color: 'w' }]);
  assert.equal(session.submit('a7','a8').status, 'promotion');
  assert.equal(session.attempts, 0);
  assert.equal(session.submit('a7','a8','q').status, 'retry');
  assert.equal(session.submit('a7','a8','n').status, 'correct');
  assert.equal(new Chess(session.answerFen).get('a8').type, 'n');
});

test('castling and en passant are validated as legal practice moves', () => {
  const castle = new PracticeSession([{ fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', solution: 'e1g1', color: 'w' }]);
  assert.equal(castle.submit('e1','g1').status, 'correct');
  assert.equal(new Chess(castle.answerFen).get('f1').type, 'r');
  const enPassant = new PracticeSession([{ fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', solution: 'e5d6', color: 'w' }]);
  assert.equal(enPassant.submit('e5','d6').status, 'correct');
  assert.equal(new Chess(enPassant.answerFen).get('d5'), undefined);
});

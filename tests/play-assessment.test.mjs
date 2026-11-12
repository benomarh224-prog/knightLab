import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame } from '../src/game.js';
import { assessLevelTestElo, assessPlayGame, formatLevelTestElo, reviewPlayGame } from '../src/play-assessment.js';
import { readLevelTestResult, restoreLevelTestAttempt } from '../src/level-test.js';
import { LEVEL_TEST_DIFFICULTY, playSearch } from '../src/play-settings.js';
import { pageFromPath } from '../src/routes.js';

const game = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 *');
const ratingGame = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. a4 Bg4 10. h3 Bxf3 11. Qxf3 Na5 12. Bc2 c5 13. d3 b4 14. Nd2 Nd7 15. Nf1 Bg5 16. Qg3 Bxc1 17. Raxc1 Nc6 18. Ne3 Rb8 19. Rf1 Nf6 20. Bd1 Ne7 21. h4 Kh8 22. h5 bxc3 23. bxc3 h6 24. f4 exf4 25. Qxf4 d5 *');
const score = cp => ({ cp, mate: null, depth: 14 });

test('the dedicated Level Test route and its saved result work on a fresh visit', () => {
  assert.equal(pageFromPath('/train/level-test/?from=menu'), 'leveltest');
  const result = { accuracy:81, moves:15, level:'Solid', outcome:'draw', difficulty:'casual', recommended:'casual' };
  const storage = value => ({ getItem: () => JSON.stringify(value) });
  assert.deepEqual(readLevelTestResult(storage(result)), result);
  assert.equal(readLevelTestResult(storage({ ...result, moves:2 })), null);
  assert.equal(readLevelTestResult(storage({ ...result, recommended:'invalid' })), null);
  const rated = { ...result, difficulty:LEVEL_TEST_DIFFICULTY, rating:{ elo:2000, bound:null } };
  assert.deepEqual(readLevelTestResult(storage(rated)), rated);
  assert.equal(readLevelTestResult(storage({ ...rated, rating:{ elo:2001, bound:null } })).rating, null);
  assert.equal(readLevelTestResult({ getItem() { throw Error('storage blocked'); } }), null);
});

test('a saved Level Test restores its turn, legal history and final result', () => {
  const snapshot = { color:'b', difficulty:'casual', moves:['e2e4','c7c5','g1f3','d7d6'], resigned:false };
  const resumed = restoreLevelTestAttempt(snapshot);
  assert.equal(resumed.engineTurn, true);
  assert.deepEqual(resumed.moves.map(move=>move.san), ['e4','c5','Nf3','d6']);
  assert.equal(restoreLevelTestAttempt({...snapshot, resigned:true}).result,'1-0');
  assert.equal(restoreLevelTestAttempt({...snapshot, moves:['e2e5']}), null);
  assert.equal(restoreLevelTestAttempt({...snapshot, resigned:true, moves:['e2e4']}), null);
  const mate = {...snapshot, moves:['f2f3','e7e5','g2g4','d8h4']};
  assert.equal(restoreLevelTestAttempt(mate).ending, 'Checkmate');
  assert.equal(restoreLevelTestAttempt({...mate, moves:[...mate.moves,'e2e4']}), null);
});

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

test('Level Test uses full skill and estimates from either color’s post-opening decisions', () => {
  assert.equal(playSearch(LEVEL_TEST_DIFFICULTY).skill, 20);
  for (const color of ['w','b']) {
    const full = { ...ratingGame, color, difficulty:LEVEL_TEST_DIFFICULTY };
    const losses = ratingGame.fens.map((_, index) => score(index % 2 ? -12 : 0));
    if (color === 'b') losses.forEach((entry, index) => { entry.cp = index % 2 ? 0 : 12; });
    const { decisions, rating } = assessLevelTestElo(full, losses);
    assert.equal(decisions, 17);
    assert.deepEqual(rating, { elo:2000, bound:null });
    assert.equal(formatLevelTestElo(rating), '≈ 2000 Elo');
    assert.deepEqual(assessLevelTestElo(full, losses.slice(0, -1)), { decisions:null, rating:null });
    assert.equal(assessLevelTestElo({ ...full, assisted:true }, losses).rating, null);
    assert.equal(assessLevelTestElo({ ...full, difficulty:'beginner' }, losses).rating, null);
    const tooFew = losses.map((entry, index) => index >= 24 ? score(400) : entry);
    assert.deepEqual(assessLevelTestElo(full, tooFew), { decisions:4, rating:null });
    assert.deepEqual(assessLevelTestElo(full, losses, 32), { decisions:9, rating:null });
  }
});

test('Level Test describes performance beyond the Elo benchmark boundaries without extrapolating', () => {
  const full = { ...ratingGame, color:'w', difficulty:LEVEL_TEST_DIFFICULTY };
  const precise = ratingGame.fens.map(() => score(0));
  const costly = ratingGame.fens.map((_, index) => score(index % 2 ? -200 : 0));
  assert.deepEqual(assessLevelTestElo({ ...game, color:'w', difficulty:LEVEL_TEST_DIFFICULTY }, precise), { decisions:2, rating:null });
  assert.equal(formatLevelTestElo(assessLevelTestElo(full, precise).rating), 'Above 2700 Elo');
  assert.equal(formatLevelTestElo(assessLevelTestElo(full, costly).rating), 'Below 1600 Elo');
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

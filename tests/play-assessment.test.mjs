import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame } from '../src/game.js';
import { assessLevelTestElo, assessPlayGame, formatLevelTestElo, reviewPlayGame } from '../src/play-assessment.js';
import { createLevelTestHistory, levelTestPracticeExercises, readLevelTestHistory, readLevelTestResult, restoreLevelTestAttempt } from '../src/level-test.js';
import { levelTestMoments, levelTestMomentDetails } from '../src/level-test-moments.js';
import { PracticeSession } from '../src/training.js';
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
  const provisional = { ...rated, rating:{ ...rated.rating, provisional:true } };
  assert.deepEqual(readLevelTestResult(storage(provisional)), provisional);
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

test('Level Test history keeps the previous saved result and stores new dated results newest first', () => {
  const legacy = { accuracy:81, moves:19, level:'Solid', outcome:'draw', difficulty:LEVEL_TEST_DIFFICULTY,
    recommended:'casual', rating:{ elo:2000, bound:null, provisional:true }, moments:[
      { fen:game.fens[0], ply:1, played:'a2a3', solution:'e2e4', reply:'e7e5', swing:20, mateChange:null },
    ] };
  const data = new Map([['roqvyn-level-test-result-v1',JSON.stringify(legacy)]]);
  const store = { getItem:key=>data.get(key), setItem:(key,value)=>data.set(key,value) };
  let time = Date.UTC(2026,10,14);
  const history = createLevelTestHistory(store, () => time);
  assert.deepEqual(history.list(), [legacy]);
  assert.equal(history.add(legacy, {...legacy, accuracy:86, rating:{ elo:2200, bound:null }}), true);
  time += 86400000;
  assert.equal(history.add(legacy, {...legacy, accuracy:90}), true);
  assert.equal(history.add(legacy, {...legacy, accuracy:null}), false);
  const reloaded = readLevelTestHistory(store);
  assert.deepEqual(reloaded.map(result=>result.savedAt), [time, time-86400000, undefined]);
  assert.deepEqual(reloaded.map(result=>result.accuracy), [90,86,81]);
  assert.deepEqual(reloaded[2], legacy);
  assert.equal(readLevelTestResult(store).accuracy, 90);
  const exercises = levelTestPracticeExercises([{ moments:[{ ...legacy.moments[0], solution:'e2e5' }] }, ...reloaded]);
  assert.equal(exercises.length, 1);
  assert.equal(exercises[0].source, 'level-test');
  assert.equal(new PracticeSession(exercises).submit('e2','e4').status, 'correct');
  for(let i=0;i<21;i++) history.add(legacy, legacy);
  assert.equal(readLevelTestHistory(store).length, 20);
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
    const limited = assessLevelTestElo(full, tooFew);
    assert.equal(limited.decisions, 4);
    assert.equal(limited.rating.provisional, true);
    assert.deepEqual(assessLevelTestElo(full, losses, 32), { decisions:9, sampleDecisions:9, rating:{ elo:2000, bound:null, provisional:true } });
  }
});

test('Level Test describes performance beyond the Elo benchmark boundaries without extrapolating', () => {
  const full = { ...ratingGame, color:'w', difficulty:LEVEL_TEST_DIFFICULTY };
  const precise = ratingGame.fens.map(() => score(0));
  const costly = ratingGame.fens.map((_, index) => score(index % 2 ? -200 : 0));
  assert.deepEqual(assessLevelTestElo({ ...game, color:'w', difficulty:LEVEL_TEST_DIFFICULTY }, precise, game.moves.length), { decisions:0, sampleDecisions:0, rating:null });
  assert.equal(formatLevelTestElo(assessLevelTestElo(full, precise).rating), 'Above 2700 Elo');
  assert.equal(formatLevelTestElo(assessLevelTestElo(full, costly).rating), 'Below 1600 Elo');
});

test('a meaningful mistake before move eight still yields a provisional estimate in an otherwise decided match', () => {
  for (const color of ['w','b']) {
    const full = { ...ratingGame, color, difficulty:LEVEL_TEST_DIFFICULTY };
    const firstDecision = color === 'w' ? 6 : 7;
    const perspective = color === 'w' ? 1 : -1;
    const scores = full.fens.map((_, index) => score(index <= firstDecision ? 0 : -480 * perspective));
    assert.deepEqual(assessLevelTestElo(full, scores, 6), {
      decisions:0, sampleDecisions:22, rating:{ elo:1600, bound:'below', provisional:true },
    });
    const alreadyDecided = full.fens.map(() => score(-480 * perspective));
    assert.deepEqual(assessLevelTestElo(full, alreadyDecided, 6), { decisions:0, sampleDecisions:22, rating:null });
    const oneGoodMove = alreadyDecided.slice();
    oneGoodMove[firstDecision] = score(0);
    oneGoodMove[firstDecision + 1] = score(0);
    assert.equal(assessLevelTestElo(full, oneGoodMove, 6).rating, null);
  }
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

test('Level Test picks the player’s two biggest supported swings and turns them into legal retries', () => {
  const game = parseGame('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 *');
  const coordinates = ['d2d4', 'c7c5', 'f2f4', 'g8f6', 'f1c4', 'g8f6', 'b5c6', 'd7d6', 'e1g1'];
  const values = [0, -350, 0, -150, 0, -100, 0, -400, 0];
  const scores = game.fens.map((rootFen, i) => ({ ...score(values[i]), rootFen, best:coordinates[i] }));
  const white = levelTestMoments({ ...game, color:'w' }, scores);
  assert.deepEqual(white.map(moment => moment.ply), [7, 1]);
  assert.deepEqual(levelTestMoments({ ...game, color:'b' }, scores).map(moment => moment.ply), [8, 2]);
  const details = levelTestMomentDetails(white[0]);
  assert.equal(details.title, '4. Ba4');
  assert.match(details.alternative, /Bxc6/);
  const session = new PracticeSession([details.exercise]);
  assert.equal(session.submit('b5','a4').status, 'retry');
  assert.equal(session.submit('b5','c6').status, 'correct');
  assert.equal(levelTestMomentDetails({ ...white[0], solution:'a1h8' }), null);
  scores[6].rootFen = game.fens[0];
  scores[0].best = 'e2e4';
  scores[2].depth = 9;
  scores[4].depth = 9;
  assert.deepEqual(levelTestMoments({ ...game, color:'w' }, scores), []);
});

test('a mate swing describes the mating reply without presenting it as a material loss', () => {
  const game = parseGame('1. f3 e5 2. g4 Qh4# 0-1');
  const scores = game.fens.map((rootFen, i) => ({ ...score(0), rootFen, best:i === 2 ? 'g2g3' : i === 3 ? 'd8h4' : null }));
  scores[3].cp = -10000;
  scores[3].mate = -1;
  const [moment] = levelTestMoments({ ...game, color:'w' }, scores);
  const { explanation } = levelTestMomentDetails(moment);
  assert.equal(moment.ply, 3);
  assert.match(explanation, /forced mate.*Qh4# is immediate checkmate/);
  assert.doesNotMatch(explanation, /pawns|10000/);
});

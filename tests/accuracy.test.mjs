import test from 'node:test';
import assert from 'node:assert/strict';
import { moveAccuracy, gameAccuracy, accuracyPresentation, winPercent } from '../src/accuracy.js';
import { parseGame } from '../src/game.js';
import { evaluationReady, reviewSearch } from '../src/review-quality.js';
const score = cp => ({cp,depth:18,mate:null});
const fixture = (cps, start = 'w', initial = 15) => {
  const parsed = {moves:cps.map((_,i)=>({color:i%2===0?start:start==='w'?'b':'w'})),fens:Array(cps.length+1).fill('fixture')};
  return {parsed,evaluations:[initial,...cps].map(score)};
};
const result = (cps, start, initial) => { const f=fixture(cps,start,initial); return gameAccuracy(f.parsed,f.evaluations); };
const near = (actual, expected, tolerance=1e-8) => assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test('published Lichess model penalizes first-move blunders for either side', () => {
  // Reference expectations: Lichess AccuracyPercentTest at revision 2e653ad.
  near(result([-900,-900]).w.score,10,5); near(result([-900,-900]).b.score,100);
  near(result([15,900]).b.score,10,5); near(result([15,900]).w.score,100);
  near(result([900,900],'b').b.score,10,5);
});
test('critical errors remain visible after twenty easy plies', () => {
  near(result([...Array(20).fill(15),-900]).w.score,50,5);
  near(result([...Array(21).fill(15),900]).b.score,50,5);
});
test('published average, mediocre and terrible play examples stay in the expected ranges', () => {
  for (const [cp,expected] of [[-50,76],[-135,54],[-435,20]]) {
    const accuracy=result(Array.from({length:100},(_,i)=>i%2?15:cp));
    near(accuracy.w.score,expected,8); near(accuracy.b.score,expected,8);
  }
});
test('equal evaluations score 100 across short and long window sizes', () => {
  for (const length of [2,20,30,79,80,200]) {
    const accuracy=result(Array(length).fill(15));
    near(accuracy.w.score,100); near(accuracy.b.score,100);
  }
});
test('move accuracy uses evaluation loss even if a shallow engine named the move best', () => {
  const move=parseGame('1. e4 *').moves[0];
  const accuracy=moveAccuracy(move,{cp:0,best:'e2e4'},{cp:-400});
  assert.ok(accuracy<30); near(moveAccuracy(move,{cp:0},{cp:100}),100);
  const black=parseGame('1. e4 e5 *').moves[1];
  near(moveAccuracy(move,{cp:80},{cp:-80}),moveAccuracy(black,{cp:-80},{cp:80}));
});
test('mate extremes, zero accuracy and saturated winning positions remain finite', () => {
  near(winPercent(0),50); near(winPercent(10000),winPercent(1000));
  const f=fixture([-10000,10000], 'w',10000), accuracy=gameAccuracy(f.parsed,f.evaluations);
  near(accuracy.w.score,0); near(accuracy.b.score,0);
  near(moveAccuracy({color:'w'},{cp:10000},{cp:1200}),100);
});
test('missing or invalid evaluations withhold both scores and retain real move coverage', () => {
  const parsed=parseGame('1. e4 e5 2. Nf3 Nc6 *');
  for (const missing of [undefined,{cp:NaN},{cp:Infinity}]) {
    const accuracy=gameAccuracy(parsed,[score(0),score(0),missing,score(20),score(0)]);
    assert.equal(accuracy.w.reviewed,1); assert.equal(accuracy.b.reviewed,1);
    assert.equal(accuracy.w.score,null); assert.equal(accuracy.b.score,null);
  }
});
test('depth-limited searches never become a verified precision score', () => {
  const f=fixture([0,0],'w',0); f.evaluations[1].depth=17;
  const accuracy=accuracyPresentation({},f.parsed,f.evaluations);
  assert.equal(accuracy.status,'Needs depth 18'); assert.equal(accuracy.players.w.score,null);
  assert.equal(accuracy.players.w.minDepth,17); assert.equal(accuracy.players.w.qualified,0);
  const quick=accuracyPresentation({},f.parsed,f.evaluations,'quick');
  assert.equal(quick.status,'Quick estimate'); near(quick.players.w.score,100);
  f.evaluations[1].depth=18;
  assert.equal(accuracyPresentation({},f.parsed,f.evaluations).status,'Depth 18 verified');
});
test('terminal positions qualify without a search depth and zero-move sides remain unavailable', () => {
  const parsed=parseGame('1. e4 *'), evaluations=[score(0),{cp:0,terminal:true,depth:0}];
  const accuracy=gameAccuracy(parsed,evaluations);
  near(accuracy.w.score,100); assert.equal(accuracy.b.score,null);
  assert.equal(accuracy.w.minDepth,18); assert.equal(accuracy.b.total,0);
});
test('custom Black-to-move games use the actual initial evaluation and correct player', () => {
  const parsed=parseGame('[SetUp "1"]\n[FEN "7k/8/8/8/8/8/8/KR6 b - - 0 1"]\n\n1... Kh7 *');
  const accuracy=gameAccuracy(parsed,[score(700),score(700)]);
  near(accuracy.b.score,100); assert.equal(accuracy.w.score,null);
});
test('published Chess.com accuracy remains a separate reference and never replaces independent results', () => {
  const f=fixture([-900,-900]);
  const display=accuracyPresentation({accuracies:{white:75.66,black:74.12}},f.parsed,f.evaluations);
  assert.equal(display.title,'Knightlab accuracy'); assert.equal(display.source,'knightlab');
  near(display.players.w.score,10,5); assert.equal(display.reference.w.toFixed(1),'75.7');
  assert.equal(display.reference.b.toFixed(1),'74.1');
  assert.equal(accuracyPresentation({},f.parsed,f.evaluations).reference.w,null);
  for (const value of [null,'75.7',NaN,Infinity,-1,101]) assert.equal(accuracyPresentation({accuracies:{white:value}},f.parsed,[]).reference.w,null);
  assert.deepEqual(accuracyPresentation({accuracies:{white:0,black:100}},f.parsed,[]).reference,{w:0,b:100});
});
test('precision retries increase the budget only for unfinished positions', () => {
  assert.equal(evaluationReady({cp:0,depth:17},'precise'),false);
  assert.equal(evaluationReady({cp:NaN,depth:18},'precise'),false);
  assert.equal(evaluationReady({cp:0,depth:18},'precise'),true);
  assert.equal(evaluationReady({cp:0,terminal:true,depth:0},'precise'),true);
  assert.deepEqual(reviewSearch('precise'),{depth:18,milliseconds:20000,clearHash:true});
  assert.equal(reviewSearch('precise',{searchTime:20000}).milliseconds,40000);
  assert.equal(reviewSearch('precise',{searchTime:80000}).milliseconds,80000);
  assert.equal(reviewSearch('quick'),140); assert.equal(reviewSearch('deep'),650);
});

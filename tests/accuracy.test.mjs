import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGame,terminalEvaluation,scoreFromInfo} from '../src/game.js';
import {whiteWinPercent,moveAccuracy,aggregateAccuracy,gameAccuracy,evaluationLossText} from '../src/accuracy.js';
import {reviewStatistics} from '../src/review-statistics.js';
import {menuPlacement} from '../src/viewport-menu.js';
const score=(cp,mate=null)=>({cp,mate,depth:19});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('winning chances use bounded White evaluations and accuracy uses the mover perspective',()=>{
  near(whiteWinPercent(score(0)),50);near(whiteWinPercent(score(100)),59.102589719161294);
  near(whiteWinPercent(score(-100)),100-whiteWinPercent(score(100)));
  near(whiteWinPercent(score(10000)),whiteWinPercent(score(1000)));
  assert.equal(moveAccuracy(50,60,'w'),100);assert.ok(moveAccuracy(50,60,'b')<70);
  near(moveAccuracy(60,50,'w'),moveAccuracy(40,50,'b'));
  assert.equal(whiteWinPercent(null),null);
});
test('game aggregation combines volatility weights and harmonic mean, not average move accuracy or ACPL',()=>{
  near(aggregateAccuracy([100,50],[1,3]),(62.5+200/3)/2);
  near(aggregateAccuracy([100,0],[1,1]),(50+2/1.01)/2);
  const p=parseGame('1. e4 e5 2. Nf3 Nc6 *'),e=[0,-200,-200,-250,-250].map(cp=>score(cp));
  const report=gameAccuracy(p,e);assert.equal(report.complete,true);assert.equal(report.windowSize,2);
  assert.equal(report.sides[1].accuracy,100);assert.ok(report.sides[0].accuracy<80);
  assert.equal(report.sides[0].total,2);assert.equal(report.sides[1].total,2);
});
test('long-game sliding volatility windows give an isolated swing more weight than quiet moves',()=>{
  const p=parseGame(Array.from({length:10},(_,i)=>`${i*2+1}. Nf3 Nf6 ${i*2+2}. Ng1 Ng8`).join(' ')+' *');
  const e=p.fens.map((_,i)=>score(i===20?600:0));const report=gameAccuracy(p,e);
  assert.equal(report.windowSize,4);assert.ok(report.sides.every(s=>s.accuracy<85));
  const white=p.moves.flatMap((m,i)=>m.color==='w'?[moveAccuracy(whiteWinPercent(e[i]),whiteWinPercent(e[i+1]),'w')]:[]);
  assert.ok(white.reduce((a,b)=>a+b,0)/white.length>95);
  assert.ok(report.sides[0].accuracy<white.reduce((a,b)=>a+b,0)/white.length-10);
});
test('custom-FEN Black starts align with actual move colors and actual initial evaluation',()=>{
  const p=parseGame('[SetUp "1"]\n[FEN "7k/8/8/8/8/8/8/K6R b - - 0 23"]\n\n23... Kg8 24. Kb1 *');
  const report=gameAccuracy(p,[score(-150),score(50),score(50)]);
  assert.equal(report.sides[0].accuracy,100);assert.ok(report.sides[1].accuracy<80);
  assert.equal(report.sides[1].total,1);
});
test('missing, sparse, shallow and invalid evidence never becomes a completed accuracy percentage',()=>{
  const p=parseGame('1. e4 e5 *'),complete=[score(0),score(10),score(10)];
  for(const e of [[],complete.slice(0,2),[complete[0],undefined,complete[2]],[complete[0],score(NaN),complete[2]]]){
    const r=gameAccuracy(p,e);assert.equal(r.complete,false);assert.ok(r.sides.every(s=>s.accuracy===null&&s.status==='pending'));
  }
  assert.equal(gameAccuracy(p,complete.map(s=>({...s,depth:10})),'precise').complete,false);
  assert.equal(gameAccuracy(p,complete,'precise').complete,true);
  assert.equal(gameAccuracy(parseGame('1. e4 *'),[score(0),score(0)]).sides[1].status,'unavailable');
});
test('forced-mate signs, terminal M0 and retained mates never turn into enormous pawn-loss statistics',()=>{
  const p=parseGame('1. f3 e5 2. g4 Qh4# 0-1'),terminal=terminalEvaluation(p.fens.at(-1));
  assert.ok(whiteWinPercent(terminal)<3);
  const ev=[score(0),score(-80),score(-70),score(-10000,-1),terminal];
  const r=reviewStatistics(p,ev);assert.ok(r.sides.every(s=>Number.isFinite(s.accuracy)));
  assert.equal(r.sides[0].finiteCount,1);assert.equal(r.sides[0].mateTransitions,1);
  assert.equal(r.sides[0].finiteAverageLoss,80);assert.equal(r.sides[1].mateTransitions,1);
  const text=evaluationLossText(p.moves[2],ev[2],ev[3]);assert.match(text,/forced mate/);assert.doesNotMatch(text,/pawns|97\.41|10000/);
  near(whiteWinPercent(score(10000,2)),whiteWinPercent(score(10000,9)));
  near(whiteWinPercent(score(-10000,-9)),whiteWinPercent(terminal));
  const normalized=scoreFromInfo('info depth 18 score mate 3 pv h4e1','b');assert.ok(whiteWinPercent(normalized)<3);
  // Qg7 is a genuine White mate, not a signed-zero guess.
  const won=parseGame('[SetUp "1"]\n[FEN "6k1/5Q2/6K1/8/8/8/8/8 w - - 0 1"]\n\n1. Qg7# 1-0');
  assert.ok(whiteWinPercent(terminalEvaluation(won.fens.at(-1)))>97);
});
test('responsive menu geometry stays below sticky chrome and inside narrow or short viewports',()=>{
  for(const [width,height] of [[360,740],[390,844],[430,844],[844,390]])for(const y of [80,height-90]){
    const p=menuPlacement({right:width-12,top:y,bottom:y+44},{width,height,headerBottom:64});
    assert.ok(p.left>=8&&p.left+p.width<=width-8);assert.ok(p.top>=72);assert.ok(p.top+p.maxHeight<=height-8);
  }
});

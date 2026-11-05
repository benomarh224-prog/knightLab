import test from 'node:test';import assert from 'node:assert/strict';import {Chess} from 'chess.js';
import {DEMO_PGN,parseGame,classifyMove,summarize} from '../src/game.js';import {brilliantEvidence,BRILLIANT_DEPTH} from '../src/brilliant.js';import {coachMove} from '../src/coach.js';import {pieceMoveVerdict,qualityGlyph} from '../src/verdict.js';import {reviewStatistics} from '../src/review-statistics.js';import {gameAccuracy} from '../src/accuracy.js';import {collectTraining} from '../src/training.js';import {createReviewCache} from '../src/review-cache.js';
const uci=m=>m?m.from+m.to+(m.promotion||''):null;
const opera=parseGame(DEMO_PGN);
function sample(index=18){const move=opera.moves[index];return{move,before:{cp:180,mate:null,depth:18,best:uci(move),pv:opera.moves.slice(index,index+6).map(uci),alternative:{cp:20,depth:18}},after:{cp:175,mate:null,depth:18,best:uci(opera.moves[index+1]),pv:opera.moves.slice(index+1,index+7).map(uci)}};}
function generated(fen,text){const game=new Chess(fen),move=game.move(text),afterFen=game.fen(),pv=[];for(let n=0;n<5&&!game.isCheckmate()&&!game.isStalemate();n++){const next=game.moves({verbose:true})[0];if(!next)break;game.move({from:next.from,to:next.to,promotion:next.promotion});pv.push(uci(next));}return{move,before:{cp:100,mate:null,depth:18,best:uci(move),pv:[uci(move),...pv],alternative:{cp:0,depth:18}},after:{cp:100,mate:null,depth:18,best:pv[0],pv},afterFen};}

test('a sound knight sacrifice and rook-for-minor sacrifice get a distinct Brilliant verdict',()=>{
 for(const index of[18,24]){const {move,before,after}=sample(index),r=classifyMove(move,before,after);assert.equal(r.label,'Brilliant');assert.ok(r.sacrifice.materialCp>=100);assert.equal(r.sacrifice.square,move.to);assert.equal(r.sacrifice.depth,18);const badge=pieceMoveVerdict(move,r);assert.equal(badge.symbol,'!!');assert.equal(badge.tone,'brilliant');assert.equal(badge.square,move.to);assert.match(qualityGlyph(r.label),/M8 4v9m8-9v9/);}
});
test('a queen sacrifice leading to forced mate is not treated as an artificial pawn loss',()=>{
 const {move,before,after}=sample(30);before.cp=after.cp=10000;before.mate=2;after.mate=1;
 const r=classifyMove(move,before,after);assert.equal(r.label,'Brilliant');assert.equal(r.loss,0);assert.equal(r.sacrifice.captureSan,'Nxb8');assert.equal(r.sacrifice.materialCp,900);const report=coachMove(move,before,after);assert.match(report.why,/only legal reply is Nxb8/);assert.doesNotMatch(report.why,/not a forced acceptance/);
});
test('Black gets the same sacrifice classification with correctly normalized evaluation signs',()=>{
 const a=sample(30),square=s=>s[0]+(9-Number(s[1])),coordinate=s=>square(s.slice(0,2))+square(s.slice(2,4))+(s[4]||'');
 const f=a.move.before.split(' ');f[0]=f[0].split('/').reverse().map(row=>row.replace(/[a-zA-Z]/g,c=>c===c.toUpperCase()?c.toLowerCase():c.toUpperCase())).join('/');f[1]='b';f[2]=f[2].replace(/[a-zA-Z]/g,c=>c===c.toUpperCase()?c.toLowerCase():c.toUpperCase());if(f[3]!=='-')f[3]=square(f[3]);
 const game=new Chess(f.join(' ')),move=game.move({from:square(a.move.from),to:square(a.move.to)}),before={...a.before,cp:-10000,mate:-2,best:coordinate(a.before.best),pv:a.before.pv.map(coordinate),alternative:{cp:-20,depth:18}},after={...a.after,cp:-10000,mate:-1,best:coordinate(a.after.best),pv:a.after.pv.map(coordinate)};
 assert.equal(move.color,'b');assert.equal(classifyMove(move,before,after).label,'Brilliant');assert.equal(classifyMove(move,before,after).loss,0);
});
test('ordinary equal trades, free queen captures, pinned attackers and poisoned recaptures stay unlabelled as Brilliant',()=>{
 const fixtures=[generated('4k3/5n2/8/8/2B5/8/8/4K3 w - - 0 1','Bxf7+'),generated('4k3/8/8/8/2q5/8/8/2R1K3 w - - 0 1','Rxc4'),generated('5k2/8/8/8/8/5n2/8/K4R1R w - - 0 1','Rh2'),generated('k7/8/8/q7/P7/2N5/8/7K w - - 0 1','Nb5')];
 for(const {move,before,after}of fixtures)assert.equal(brilliantEvidence(move,before,after),null,move.san);
});
test('a pawn sacrifice, a promotion and an immediate checkmate do not qualify',()=>{
 const fixtures=[generated('7k/8/8/8/1p6/8/P7/7K w - - 0 1','a4'),generated('7k/P7/8/8/8/8/8/7K w - - 0 1','a8=Q+'),sample(32)];
 for(const {move,before,after}of fixtures)assert.equal(brilliantEvidence(move,before,after),null);
});
test('missing, shallow, mismatched and illegal engine continuations never create Brilliant labels',()=>{
 const {move,before,after}=sample();const cases=[{before:{...before,depth:BRILLIANT_DEPTH-1}}, {after:{...after,depth:BRILLIANT_DEPTH-1}}, {before:{...before,alternative:null}}, {before:{...before,alternative:{cp:20,depth:17}}}, {before:{...before,pv:[]}}, {after:{...after,pv:[after.best]}}, {after:{...after,pv:[after.best,'a1a8','a8h8']}}, {after:{...after,best:'a7a5'}}, {before:{...before,pv:['a2a3',...before.pv.slice(1)]}}, {before:{...before,cp:NaN}}, {after:{...after,depth:NaN}}, {after:{...after,mate:-3}}, {after:{...after,mate:NaN}}, {after:{...after,mate:0}}];
 for(const patch of cases)assert.equal(brilliantEvidence(move,patch.before||before,patch.after||after),null,JSON.stringify(patch));
});
test('loss, a bad resulting position, a losing mate, an already winning alternative and a non-best move reject the special label',()=>{
 const {move,before,after}=sample();const cases=[{after:{...after,cp:100}}, {before:{...before,cp:-80,alternative:{cp:-150,depth:18}},after:{...after,cp:-80}}, {after:{...after,cp:-10000,mate:-3}}, {before:{...before,cp:10000,mate:-3}}, {before:{...before,cp:500,alternative:{cp:450,depth:18}},after:{...after,cp:495}}, {before:{...before,alternative:{cp:160,depth:18}}}, {before:{...before,best:'a2a3'}}];
 for(const patch of cases)assert.notEqual(classifyMove(move,patch.before||before,patch.after||after).label,'Brilliant');
});
test('verdict cache invalidates as PV, depth, mate or legal position evidence changes',()=>{
 const {move,before,after}=sample();const first=classifyMove(move,before,after);assert.equal(first.label,'Brilliant');assert.equal(classifyMove(move,before,after),first);
 after.depth=10;assert.notEqual(classifyMove(move,before,after).label,'Brilliant');after.depth=18;after.pv=['a1a8'];assert.notEqual(classifyMove(move,before,after).label,'Brilliant');after.pv=opera.moves.slice(19,25).map(uci);assert.equal(classifyMove(move,before,after).label,'Brilliant');
});
test('Brilliant is counted once per side, survives evidence reload and never changes accuracy calculations',()=>{
 const {move,before,after}=sample(),scores=Array(opera.fens.length).fill(null);scores[18]=before;scores[19]=after;
 const prior=gameAccuracy(opera,scores);assert.equal(summarize(opera,scores,'w').counts.Brilliant,1);assert.equal(summarize(opera,scores,'b').counts.Brilliant,0);const report=reviewStatistics(opera,scores);assert.equal(report.combined.counts.Brilliant,1);assert.equal(Object.values(report.combined.counts).reduce((a,b)=>a+b,0),report.combined.count);assert.deepEqual(gameAccuracy(opera,scores),prior);assert.equal(report.provisional,true);assert.ok(collectTraining(opera,scores).moments.some(m=>m.rating.label==='Brilliant'));
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};createReviewCache(storage).save(opera.pgn,'precise',scores);const restored=createReviewCache(storage).load(opera.pgn,'precise',scores.length);assert.equal(classifyMove(move,restored[18],restored[19]).label,'Brilliant');
});
test('the coach explains the actual offer, not a forced acceptance or a same-move improvement',()=>{
 const {move,before,after}=sample(),game=new Chess(move.after),pv=['a7a6'];game.move('a6');for(let n=0;n<3;n++){const m=game.moves({verbose:true})[0];game.move({from:m.from,to:m.to,promotion:m.promotion});pv.push(uci(m));}
 const report=coachMove(move,before,{...after,best:pv[0],pv});assert.equal(report.rating,'Brilliant');assert.equal(report.hasImprovement,false);assert.equal(report.whyLabel,'Why this works');assert.match(report.why,/cxb5 is a legal way/);assert.match(report.why,/does not accept/);assert.match(report.summary,/offers your knight/);assert.match(report.brief,/knight on b5/);
});

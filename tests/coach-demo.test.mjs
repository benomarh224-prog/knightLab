import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGame,DEMO_PGN} from '../src/game.js';
import {coachMove,legalLine,moveIdea} from '../src/coach.js';
import {createCoachDemo} from '../src/coach-demo.js';
const score=(cp,best,pv=[],mate=null)=>({cp,best,pv,mate,depth:18});
function harness(){
 const jobs=[],sounds=[];let paints=0;
 const demo=createCoachDemo({schedule:callback=>{jobs.push(callback);return callback;},unschedule(){},onChange(){paints++;},onMove(move,options){sounds.push({san:move.san,...options});}});
 return {demo,jobs,sounds,get paints(){return paints;}};
}

test('Show me is a bounded legal view; later moves retain their order and game history is unchanged',()=>{
 const parsed=parseGame(DEMO_PGN),move=parsed.moves[18],report=coachMove(move,score(300,'c3b5',['c3b5']),score(300,'e7b4',['e7b4','b3b4','f8b4','c2c3','b4c5']));
 const line=report.continuations.find(line=>line.kind==='reply'),original=JSON.stringify(parsed),{demo,jobs,sounds}=harness();
 assert.equal(demo.start({...line,context:{move,report}}),true);assert.equal(demo.view().fen,move.after);assert.equal(demo.view().index,0);assert.equal(sounds.length,0);
 jobs.shift()();assert.equal(demo.view().index,1);assert.match(demo.view().text,/Immediate reply.*Qb4\+/);assert.doesNotMatch(demo.view().text,/captures/);
 jobs.shift()();assert.equal(demo.view().fen,line.moves[1].after);assert.match(demo.view().text,/Later.*Qxb4.*captur(?:es|ing) the queen/);
 jobs.shift()();assert.match(demo.view().text,/Later.*Bxb4\+/);assert.equal(demo.view().total,4);
 jobs.shift()();assert.equal(demo.view().playing,false);assert.equal(demo.view().index,4);assert.equal(sounds.length,4);assert.equal(new Set(sounds.map(s=>s.eventId)).size,4);
 assert.equal(JSON.stringify(parsed),original);assert.equal(demo.session.context.report,report);
 demo.stop();assert.equal(demo.view(),null);assert.equal(JSON.stringify(parsed),original);
});

test('invalid continuation cannot replace a live demonstration, including invalid suffixes beyond the preview limit',()=>{
 const parsed=parseGame('1. e4 e5 2. Nf3 Nc6 *'),{demo}=harness(),fen=parsed.fens[0];
 demo.start({fen,moves:parsed.moves,autoplay:false});const active=demo.session;
 assert.equal(demo.start({fen,moves:[...parsed.moves,{...parsed.moves[0],before:parsed.fens.at(-1)}],limit:2}),false);
 assert.equal(demo.session,active);assert.equal(demo.start({fen:'invalid',moves:parsed.moves}),false);assert.equal(demo.session,active);
});

test('pause, stepping, replay and disposal invalidate stale timers without duplicate sounds',()=>{
 const parsed=parseGame('1. e4 e5 2. Nf3 Nc6 *'),{demo,jobs,sounds}=harness();
 demo.start({fen:parsed.fens[0],moves:parsed.moves});const stale=jobs.shift();demo.pause();stale();assert.equal(demo.view().index,0);
 demo.jump(2);assert.equal(demo.view().index,2);assert.equal(sounds.length,1);demo.jump(2);assert.equal(sounds.length,1);
 demo.jump(4);demo.toggle();assert.equal(demo.view().index,0);assert.equal(demo.view().playing,true);
 const old=jobs.shift();demo.stop();old();assert.equal(demo.active,false);assert.equal(sounds.length,2);
});

test('demonstrations support mate, endgames, promotion, en passant and castling with exact resulting FENs',()=>{
 const examples=[
  parseGame('1. f3 e5 2. g4 Qh4# 0-1').moves.slice(-1),
  parseGame('[SetUp "1"]\n[FEN "8/7k/8/8/8/2K5/4P3/8 w - - 0 1"]\n\n1. Kd4 Kg6 2. e4 *').moves,
  parseGame('[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=Q+ Kh7 2. Qc8 *').moves,
  parseGame('[SetUp "1"]\n[FEN "7k/8/8/3pP3/8/8/8/7K w - d6 0 1"]\n\n1. exd6 Kh7 2. d7 *').moves,
  parseGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O Bc5 *').moves.slice(-2)
 ];
 for(const moves of examples){const {demo}=harness();assert.equal(demo.start({fen:moves[0].before,moves,autoplay:false}),true);for(let i=0;i<=moves.length;i++){demo.jump(i);assert.equal(demo.view().fen,i?moves[i-1].after:moves[0].before);}demo.stop();}
});

test('short coach teaching separates an available capture from an unsupported forced loss',()=>{
 const move=parseGame(DEMO_PGN).moves[18];
 const bad=coachMove(move,score(20,'a2a3',['a2a3']),score(-330,'c6b5',['c6b5']));
 assert.equal(bad.teaching.demonstration,'reply');assert.match(bad.teaching.reason,/knight you just moved.*b5.*legal capture/);assert.match(bad.teaching.alternative,/a3/);
 const good=coachMove(move,score(300,'c3b5',['c3b5']),score(310,'c6b5',['c6b5']));
 assert.equal(good.teaching.demonstration,'best');assert.equal(good.teaching.alternative,'');assert.doesNotMatch(good.teaching.reason,/loses|blunder|mistake/);
 const sparse=coachMove(parseGame('1. e4 *').moves[0],score(0,'d2d4'),score(-150,null));
 assert.match(sparse.teaching.reason,/too short/);assert.equal(sparse.teaching.demonstration,'played');
});

test('queen exchange, delayed capture and pawn-ending explanations use only validated board evidence',()=>{
 const opera=parseGame(DEMO_PGN).moves[18],report=coachMove(opera,score(300,'c3b5'),score(300,'e7b4',['e7b4','b3b4','f8b4']));
 assert.match(report.teaching.reply,/immediate reply.*Qb4\+/);assert.match(report.teaching.reply,/exchanges both queens/);assert.match(report.replyEvidence,/even in material/);
 const move=parseGame('1. e4 *').moves[0],late=coachMove(move,score(0,'d2d4'),score(-120,'d7d5',['d7d5','g1f3','d5e4','a1a8']));
 assert.match(late.teaching.reason,/after.*Nf3.*dxe4.*later/);assert.doesNotMatch(late.teaching.reply,/immediate.*captures/);assert.doesNotMatch(late.teaching.reason,/queen/);
 const ending=parseGame('[SetUp "1"]\n[FEN "8/7k/8/8/8/2K5/4P3/8 w - - 0 1"]\n\n1. Kd4 Kg6 2. e4 *');
 assert.match(moveIdea(ending.moves[0]),/closer to the center.*pawn ending/);assert.match(moveIdea(ending.moves[2]),/passed pawn/);
 const mate=parseGame('1. f3 e5 2. g4 Qh4# 0-1').moves[2];
 assert.doesNotMatch(coachMove(mate,score(0,'g1h3'),score(-10000,'d8h4',['d8h4'],-1)).teaching.reason,/pawns|100.00/);
 assert.equal(legalLine(move.after,['a1a8']).length,0);
});

test('a defensive alternative identifies the threatened pawn and proves a legal recapture',()=>{
 const game=parseGame('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O *'),move=game.moves.at(-1),report=coachMove(move,score(0,'d2d3',['d2d3']),score(-80,'f6e4',['f6e4']));
 assert.match(report.teaching.reason,/pawn on e4.*legal capture/);
 assert.match(report.teaching.alternative,/protection.*pawn on e4.*recapture/);
 assert.match(report.teaching.reply,/immediate reply.*Nxe4.*capturing the pawn on e4/);
 assert.doesNotMatch(report.teaching.reason,/Nxe4/);
 const played=report.continuations.find(line=>line.kind==='played');assert.equal(played.moves[0].san,'O-O');
});

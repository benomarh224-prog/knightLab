import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {coachMove,legalLine} from '../src/coach.js';
import {parseGame,DEMO_PGN,summarize} from '../src/game.js';
import {COURSES} from '../src/courses.js';
import {LessonPlayer} from '../src/lesson-player.js';
import {lessonContinuation} from '../src/lesson-navigation.js';
import {lessonBoardLimit} from '../src/lesson-viewport.js';
import {offTargetFeedback} from '../src/lesson-objectives.js';
import {playSearch,PLAY_LEVELS} from '../src/play-settings.js';
import {createReviewCache} from '../src/review-cache.js';
import {reviewStatistics} from '../src/review-statistics.js';
import {collectTraining} from '../src/training.js';
const store=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const score=(cp,best,pv=[],alternative=null)=>({cp,best,pv,depth:14,mate:null,alternative});
const pawn=COURSES.beginners.lessons.find(l=>l.id==='pawn-moves-and-captures');
const player=(storage=store())=>new LessonPlayer({lesson:pawn,study:pawn.study,storage,progressKey:COURSES.beginners.key});

test('Opera 10.Nxb5: Great engine-best moves never recommend themselves as an improvement',()=>{
 const move=parseGame(DEMO_PGN).moves[18],before=score(300,'c3b5',['c3b5'],{cp:100,depth:14});
 const report=coachMove(move,before,score(300,'e7b4',['e7b4','b3b4','f8b4']));
 assert.equal(report.rating,'Great');assert.equal(report.sameBest,true);assert.equal(report.hasImprovement,false);assert.equal(report.whyLabel,'Why this works');
 assert.doesNotMatch(report.better,/Consider the alternative/);assert.match(report.summary,/matches Stockfish/);
});

test('Opera queen exchange is described in order, with equal queens exchanged rather than an immediate queen loss',()=>{
 const move=parseGame(DEMO_PGN).moves[18],report=coachMove(move,score(300,'c3b5'),score(300,'e7b4',['e7b4','b3b4','f8b4']));
 const text=report.why;
 assert.ok(text.indexOf('10... Qb4+')<text.indexOf('11. Qxb4'));assert.ok(text.indexOf('11. Qxb4')<text.indexOf('11... Bxb4+'));
 assert.match(text,/queen exchange: each side gives up a queen/);assert.match(text,/White captures queen; Black captures queen/);
 assert.doesNotMatch(report.brief,/taking your queen|immediate.*queen/);
 const line=report.continuations.find(line=>line.kind==='reply');const chess=new Chess(line.fen);
 for(const move of line.moves){assert.equal(chess.fen(),move.before);chess.move({from:move.from,to:move.to,promotion:move.promotion});assert.equal(chess.fen(),move.after);}
});

test('a later capture is labelled later and illegal PV suffixes contribute no coaching evidence',()=>{
 const move=parseGame('1. e4 *').moves[0];
 const report=coachMove(move,score(0,'d2d4'),score(-120,'d7d5',['d7d5','g1f3','d5e4','a1a8','d8d1']));
 assert.match(report.replyEvidence,/immediate reply.*d5/);assert.match(report.replyEvidence,/Later, after.*Nf3.*dxe4/);
 assert.doesNotMatch(report.replyEvidence,/queen/);assert.equal(report.continuations.find(l=>l.kind==='reply').moves.length,3);
 assert.equal(legalLine(move.after,['a1a8']).length,0);
});

test('pawn demonstration and independent exercise use different legal positions without leaking the practice destination',()=>{
 assert.notEqual(pawn.fen,pawn.demonstration.fen);const example=new Chess(pawn.demonstration.fen);example.move(pawn.demonstration.moves[0],{strict:true});assert.equal(example.get('e5').color,'w');
 const p=player(),expected=p.session.expected;
 assert.equal(expected.san,'cxb5');assert.doesNotMatch(p.study?.prompt||pawn.study.prompt,/c4|b5|cxb5/);
 p.setStage('try');const first=p.requestHint();assert.match(first.text,/diagonally/);assert.equal(first.from,undefined);assert.equal(first.to,undefined);
 const second=p.requestHint();assert.equal(second.from,'c4');assert.equal(second.to,undefined);assert.doesNotMatch(second.text,/b5/);
 const third=p.requestHint();assert.equal(third.to,'b5');
});

test('legal but off-target pawn pushes explain the objective; illegal moves stay separate and preserve the board',()=>{
 const p=player(),fen=p.session.fen;
 const legal=p.attempt('c4','c5');assert.equal(legal.status,'different');assert.match(legal.feedback,/c5 is legal, but it does not capture the pawn. Pawns capture diagonally/);assert.equal(p.session.fen,fen);
 assert.equal(p.attempt('c4','c3').status,'illegal');assert.equal(p.session.fen,fen);
 const demo=new Chess(pawn.demonstration.fen);const push=demo.move('d5');assert.match(offTargetFeedback(pawn,push),/^d5 is legal/);
 assert.equal(p.attempt('c4','b5').completed,true);assert.equal(p.complete,false);p.answer(p.question.answer);assert.equal(p.complete,true);
});

test('the revised pawn lesson migrates earlier reading and solved credit without pretending the new move was played',()=>{
 const storage=store(),p=player();p.storage=storage;p.save();
 const old=JSON.parse(storage.getItem(p.storageKey));old.signature='g5vcbp';old.stage='check';old.seen=[0,1];old.activities[0].correct=1;old.activities[0].done=true;storage.setItem(p.storageKey,JSON.stringify(old));
 const migrated=player(storage);assert.equal(migrated.stage,'check');assert.equal(migrated.boardComplete,true);assert.equal(migrated.session.correct,0);assert.equal(migrated.session.fen,pawn.fen);assert.deepEqual(migrated.seen,[0,1]);
 assert.ok(storage.getItem(p.storageKey+':legacy:g5vcbp'));migrated.answer(migrated.question.answer);assert.equal(migrated.complete,true);
});

test('lesson sizing reserves controls and navigation on mobile and short laptop screens',()=>{
 for(const [height,chrome,controls,navigation] of [[740,260,52,100],[760,240,52,100],[768,160,52,100],[900,170,52,100]]){
  const edge=lessonBoardLimit({height,chrome,controls,navigation});assert.ok(edge+chrome+controls+navigation<=height);assert.ok(edge>=220);
 }
 assert.equal(lessonBoardLimit({height:320,chrome:200,controls:52,navigation:100}),220); // normal page scroll instead of tiny scaling
});

test('play levels use distinct real skill and search settings with no claimed rating equivalents',()=>{
 const levels=Object.keys(PLAY_LEVELS).map(playSearch);assert.deepEqual(levels.map(l=>l.skill),[0,5,12,20]);assert.equal(new Set(levels.map(l=>l.depth)).size,4);assert.equal(new Set(levels.map(l=>l.milliseconds)).size,4);
 assert.throws(()=>playSearch('bogus'));assert.doesNotMatch(JSON.stringify(PLAY_LEVELS),/elo|rating|[1-9][0-9]{3} rated/i);
});

test('review evidence survives reload by exact PGN and mode, and training can choose either side',()=>{
 const storage=store(),cache=createReviewCache(storage),parsed=parseGame('1. e4 f6 2. a3 *');
 const evaluations=[score(0,'d2d4'),score(-120,'e7e5'),score(80,'g1f3'),score(-70,'e7e5')];cache.save(parsed.pgn,'deep',evaluations);
 const restored=createReviewCache(storage).load(parsed.pgn,'deep',parsed.fens.length);assert.equal(restored.length,4);assert.equal(createReviewCache(storage).load(parsed.pgn,'precise',4).length,0);
 const white=collectTraining(parsed,restored,'w').exercises,black=collectTraining(parsed,restored,'b').exercises,both=collectTraining(parsed,restored,null).exercises;
 assert.ok(white.length);assert.ok(black.length);assert.ok(white.every(e=>e.color==='w'));assert.ok(black.every(e=>e.color==='b'));assert.equal(both.length,white.length+black.length);
});

test('White and Black statistics add up to labelled combined totals while incomplete or shallow work stays provisional',()=>{
 const parsed=parseGame('1. e4 e5 2. Nf3 Nc6 *'),evaluations=parsed.fens.map((_,i)=>score(i*60,['d2d4','c7c5','f1c4','d7d6','f1b5'][i]));
 const report=reviewStatistics(parsed,evaluations);assert.equal(report.provisional,false);assert.equal(report.combined.count,4);assert.equal(report.sides[0].count+report.sides[1].count,4);
 assert.deepEqual(report.combined,summarize(parsed,evaluations,null));
 assert.equal(reviewStatistics(parsed,evaluations.slice(0,2)).provisional,true);assert.equal(reviewStatistics(parsed,evaluations,'precise').provisional,true);
 assert.equal(reviewStatistics(parsed,[]).combined.count,0);
});

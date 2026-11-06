import test from 'node:test';import assert from 'node:assert/strict';import {Chess} from 'chess.js';
import {COURSES} from '../src/courses.js';import {BEGINNER_SEQUENCE} from '../src/beginner-lessons.js';
import {LessonPlayer} from '../src/lesson-player.js';import {solutionRecap} from '../src/lesson-experience.js';
import {alternativeExplanation,createLessonAnalysis} from '../src/lesson-analysis.js';
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
const playerFor=(course,lesson,storage)=>new LessonPlayer({lesson,study:course.study?.(lesson.id),storage,progressKey:course.key,lessonIds:course.lessons.map(l=>l.id)});
test('all current lessons immediately show their practice board or interactive coordinate warmup; reading and completion requirements remain',()=>{
 for(const course of Object.values(COURSES))for(const lesson of course.lessons){const p=playerFor(course,lesson,memory());assert.equal(p.stage,lesson.squarePractice?'learn':'try',lesson.id);assert.equal(p.complete,false);assert.ok(p.session);assert.equal(p.setStage('learn'),true);assert.equal(p.checkUnlocked,false);}
});
test('legacy intro states migrate to the board with partial moves, hints, reading position and earned completion intact',()=>{
 const course=COURSES.french,l=course.lessons[0],storage=memory();let p=playerFor(course,l,storage);p.requestHint();const move=p.session.expected;p.attempt(move.from,move.to);p.setStage('learn');p.conceptIndex=0;p.save();
 const draft=JSON.parse(storage.getItem(p.storageKey));delete draft.presentationRevision;storage.setItem(p.storageKey,JSON.stringify(draft));const fen=p.session.fen;
 p=playerFor(course,l,storage);assert.equal(p.stage,'try');assert.equal(p.session.fen,fen);assert.equal(p.session.hints,1);p.setStage('learn');p=playerFor(course,l,storage);assert.equal(p.stage,'learn');assert.equal(p.session.fen,fen);
});
test('beginner curriculum moves from coordinates and single-piece routes to rules, tactics and long endings without replacing IDs',()=>{
 assert.deepEqual(COURSES.beginners.lessons.map(l=>l.id),BEGINNER_SEQUENCE);assert.equal(new Set(BEGINNER_SEQUENCE).size,28);
 const index=id=>BEGINNER_SEQUENCE.indexOf(id);assert.ok(index('rook-straight-lines')<index('friendly-blockers'));assert.ok(index('spot-an-undefended-piece')<index('knight-fork'));assert.ok(index('simple-rook-mate')<index('capablanca-rook-finish'));
});
test('every beginner solution has its own factual recap before the quiz; undo hides it without revoking credit',()=>{
 for(const lesson of COURSES.beginners.lessons){const p=playerFor(COURSES.beginners,lesson,memory());assert.equal(solutionRecap(p),null);while(p.session.expected){const m=p.session.expected;p.attempt(m.from,m.to,m.promotion);}const recap=solutionRecap(p);assert.ok(recap?.text.includes(lesson.takeaway),lesson.id);assert.ok(recap.text.includes(p.session.note),lesson.id);assert.equal(p.checksComplete,false);p.undo();assert.equal(solutionRecap(p),null);}
});
test('future demonstration and text-only lessons retain their own completion model without forced puzzles',()=>{
 const demo={id:'demo',title:'Develop a knight',concepts:['Develop toward the center.'],takeaway:'Bring a knight into play.',activities:[{kind:'demonstration',moves:['e4','e5','Nf3'],notes:['Open a diagonal.','Black answers.','The knight develops.']}]};
 const p=new LessonPlayer({lesson:demo,progressKey:'demo'});assert.equal(p.stage,'try');assert.equal(solutionRecap(p),null);p.jump(3);assert.equal(p.complete,true);assert.match(solutionRecap(p).text,/knight/);
 const text=new LessonPlayer({lesson:{id:'reading',concepts:['First idea.','Second idea.']},progressKey:'text'});assert.equal(text.stage,'learn');assert.equal(text.session,null);text.learnNext();text.learnNext();assert.equal(text.complete,true);assert.equal(solutionRecap(text),null);
});
const move=new Chess().move('d4'),before={rootFen:move.before,depth:16,cp:24,mate:null,best:'e2e4',pv:['e2e4']},after={rootFen:move.after,depth:16,cp:18,mate:null,best:'d7d5',pv:['d7d5','c1f4']};
test('off-line legal moves receive objective feedback and a strictly legal immediate engine reply without a mistake label',()=>{
 const text=alternativeExplanation(move,before,after);assert.match(text,/first choice is e4/);assert.match(text,/immediate reply.*d5/);assert.doesNotMatch(text,/Bf4|mistake|blunder|pawns lost/i);
 assert.match(alternativeExplanation(move,{...before,best:'d2d4',pv:['d2d4']},after),/prefers your move/);
 assert.equal(alternativeExplanation(move,before,{...after,pv:['a8a1']}),null);assert.equal(alternativeExplanation(move,before,{...after,rootFen:move.before}),null);assert.equal(alternativeExplanation(move,{...before,depth:8},after),null);
 assert.equal(alternativeExplanation(move,before,{...after,terminal:true}),null);
});
test('Black perspective and mate evidence are explicitly labelled rather than reported as enormous pawn losses',()=>{
 const g=new Chess();g.move('e4');const black=g.move('c5');const a={rootFen:black.before,depth:16,cp:-36,mate:null,best:'c7c5',pv:['c7c5']},b={rootFen:black.after,depth:16,cp:-40,mate:null,best:'g1f3',pv:['g1f3']};
 assert.match(alternativeExplanation(black,a,b),/−?\-0.40 from White/);
 assert.match(alternativeExplanation(black,a,{...b,cp:-10000,mate:-4}),/−M4/);assert.doesNotMatch(alternativeExplanation(black,a,{...b,cp:-10000,mate:-4}),/100|pawns/);
});
test('cancelled or superseded engine comparisons cannot overwrite another lesson’s coaching',async()=>{
 const pending=[],shown=[];let destroyed=0;const analysis=createLessonAnalysis({makeEngine:()=>({evaluate:()=>new Promise(resolve=>pending.push(resolve)),destroy(){destroyed++;}})});
 const first=analysis.explain(move,t=>shown.push(t));analysis.cancel();pending.shift()(before);await first;assert.deepEqual(shown,[]);assert.ok(destroyed>0);
 const second=analysis.explain(move,t=>shown.push(t));pending.shift()(before);await Promise.resolve();pending.shift()(after);await second;assert.equal(shown.length,1);assert.match(shown[0],/Stockfish/);analysis.cancel();
});

import test from'node:test';import assert from'node:assert/strict';import{Chess}from'chess.js';import puzzles from'../src/mate-puzzles.json'with{type:'json'};import{MATE_LESSONS,mateRecap}from'../src/mate-lessons.js';import{COURSES}from'../src/courses.js';import{LessonPlayer}from'../src/lesson-player.js';
import{renderCatalogAdditions}from'../src/course-catalog.js';
test('24 original mate positions have one unique legal finish, balanced colors and three groups',()=>{
 assert.equal(puzzles.length,24);assert.equal(new Set(puzzles.map(p=>p.fen)).size,24);assert.equal(puzzles.filter(p=>p.fen.split(' ')[1]==='w').length,12);
 for(const group of['back-rank','queen-net','teamwork'])assert.equal(puzzles.filter(p=>p.group===group).length,8);
 for(const p of puzzles){const board=new Chess(p.fen),side=board.turn();for(const king of board.board().flat().filter(p=>p?.type==='k'))assert.equal(board.isAttacked(king.square,king.color==='w'?'b':'w'),false);const mates=board.moves({verbose:true}).filter(m=>{const b=new Chess(p.fen);b.move(m);return b.isCheckmate();});assert.deepEqual(mates.map(m=>m.from+m.to+(m.promotion||'')),[p.solution]);assert.equal(mates[0].san,p.san);assert.match(mateRecap(p),/checkmate/);
  if(p.group==='teamwork'){board.move(mates[0]);const support=board.board().flat().find(piece=>piece?.color===side&&['b','n'].includes(piece.type)),king=board.board().flat().find(piece=>piece?.type==='k'&&piece.color!==side),escape=king.square[0]+(side==='w'?'7':'2');assert.ok(board.attackers(escape,side).includes(support.square));}
 }
});
test('new mates use the shared lesson flow, legal off-target feedback and independent saved progress',()=>{
 const values=new Map([['knightlab-beginner-course-v1','["rook-straight-lines"]']]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const lesson=MATE_LESSONS[0],make=()=>new LessonPlayer({lesson,study:lesson.study,storage,progressKey:COURSES.mates.key,lessonIds:MATE_LESSONS.map(l=>l.id)});let player=make();assert.deepEqual(player.plan.stages,['learn','try']);
 const wrong=new Chess(lesson.fen).moves({verbose:true}).find(m=>!m.san.includes('#')),feedback=player.attempt(wrong.from,wrong.to,wrong.promotion);assert.equal(feedback.status,'different');assert.match(feedback.feedback,/legal/);assert.match(feedback.feedback,/does not give checkmate|still has a legal reply/);
 const expected=player.session.expected;assert.equal(player.attempt(expected.from,expected.to,expected.promotion).completed,true);assert.equal(player.boardComplete,true);player=make();assert.equal(player.boardComplete,true);assert.equal(player.session.cursor,1);assert.equal(values.get('knightlab-beginner-course-v1'),'["rook-straight-lines"]');
});
test('metadata-based catalogs expose new training courses without overwriting opening entries',()=>{
 const opening={innerHTML:'Existing opening'},training={innerHTML:''},doc={getElementById:id=>id==='training'?training:opening};
 renderCatalogAdditions(COURSES,{category:'tactics',hostId:'training'},doc);assert.match(training.innerHTML,/\/learn\/mate-in-one\//);assert.match(training.innerHTML,/24 exercises/);assert.doesNotMatch(training.innerHTML,/Scotch Gambit/);assert.equal(opening.innerHTML,'Existing opening');
});

import test from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{Chess}from'chess.js';import puzzles from'../src/mate-puzzles.json'with{type:'json'};import{MATE_LESSONS,mateRecap,MATE_GROUPS}from'../src/mate-lessons.js';import{COURSES}from'../src/courses.js';import{LessonPlayer}from'../src/lesson-player.js';
import{renderCatalogAdditions}from'../src/course-catalog.js';
test('120 original mate positions have one unique legal finish, balanced colors and nine groups',()=>{
 assert.equal(puzzles.length,120);assert.equal(new Set(puzzles.map(p=>p.fen)).size,120);assert.equal(puzzles.filter(p=>p.fen.split(' ')[1]==='w').length,60);
 for(const group of Object.keys(MATE_GROUPS)){const total=['back-rank','queen-net','teamwork'].includes(group)?8:16;assert.equal(puzzles.filter(p=>p.group===group).length,total);assert.equal(puzzles.filter(p=>p.group===group&&p.fen.split(' ')[1]==='b').length,total/2);}
 for(const p of puzzles){const board=new Chess(p.fen),side=board.turn();for(const king of board.board().flat().filter(p=>p?.type==='k'))assert.equal(board.isAttacked(king.square,king.color==='w'?'b':'w'),false);const mates=board.moves({verbose:true}).filter(m=>{const b=new Chess(p.fen);b.move(m);return b.isCheckmate();});assert.deepEqual(mates.map(m=>m.from+m.to+(m.promotion||'')),[p.solution]);assert.equal(mates[0].san,p.san);assert.match(mateRecap(p),/checkmate/);
  board.move(mates[0]);const king=board.board().flat().find(piece=>piece?.type==='k'&&piece.color!==side);
  if(p.group==='teamwork'){const support=board.board().flat().find(piece=>piece?.color===side&&['b','n'].includes(piece.type)),escape=king.square[0]+(side==='w'?'7':'2');assert.ok(board.attackers(escape,side).includes(support.square));}
  const expected={'pawn-mate':'p','bishop-mate':'b','knight-mate':'n','rook-net':'r','queen-capture':'q','promotion-mate':'p'}[p.group];if(expected){assert.equal(mates[0].piece,expected);assert.ok(board.attackers(king.square,side).includes(mates[0].to));}
  if(p.group==='queen-capture')assert.ok(mates[0].captured);if(p.group==='promotion-mate')assert.ok(mates[0].promotion);
  assert.ok(MATE_LESSONS.find(l=>l.id===p.id)?.study.title);assert.doesNotMatch(mateRecap(p),/undefined/);
 }
});
test('the original 24 exercise IDs, positions and solutions stay byte-for-byte compatible',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(puzzles.slice(0,24))).digest('hex'),'f2634ecf31f86c35243f004b5345c2fe4abd7fa8be65c1dbe843ea8e6630f6d6');
});
test('old completed exercises remain earned while all 96 additions stay unsolved',()=>{
 const ids=puzzles.slice(0,24).map(p=>p.id),values=new Map([[COURSES.mates.key,JSON.stringify(ids)]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 for(const lesson of MATE_LESSONS){const player=new LessonPlayer({lesson,study:lesson.study,storage,progressKey:COURSES.mates.key,lessonIds:MATE_LESSONS.map(l=>l.id)});assert.equal(player.storedComplete,ids.includes(lesson.id));}
 assert.deepEqual(JSON.parse(values.get(COURSES.mates.key)),ids);
});
test('new mates use the shared lesson flow, legal off-target feedback and independent saved progress',()=>{
 const values=new Map([['knightlab-beginner-course-v1','["rook-straight-lines"]']]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const lesson=MATE_LESSONS[0],make=()=>new LessonPlayer({lesson,study:lesson.study,storage,progressKey:COURSES.mates.key,lessonIds:MATE_LESSONS.map(l=>l.id)});let player=make();assert.deepEqual(player.plan.stages,['learn','try']);
 const wrong=new Chess(lesson.fen).moves({verbose:true}).find(m=>!m.san.includes('#')),feedback=player.attempt(wrong.from,wrong.to,wrong.promotion);assert.equal(feedback.status,'different');assert.match(feedback.feedback,/legal/);assert.match(feedback.feedback,/does not give checkmate|still has a legal reply/);
 const expected=player.session.expected;assert.equal(player.attempt(expected.from,expected.to,expected.promotion).completed,true);assert.equal(player.boardComplete,true);player=make();assert.equal(player.boardComplete,true);assert.equal(player.session.cursor,1);assert.equal(values.get('knightlab-beginner-course-v1'),'["rook-straight-lines"]');
});
test('metadata-based catalogs expose new training courses without overwriting opening entries',()=>{
 const opening={innerHTML:'Existing opening'},training={innerHTML:''},doc={getElementById:id=>id==='training'?training:opening};
 renderCatalogAdditions(COURSES,{category:'tactics',hostId:'training'},doc);assert.match(training.innerHTML,/\/learn\/mate-in-one\//);assert.match(training.innerHTML,/120 exercises/);assert.doesNotMatch(training.innerHTML,/Scotch Gambit/);assert.equal(opening.innerHTML,'Existing opening');
});

import test from'node:test';import assert from'node:assert/strict';import{Chess}from'chess.js';
import{BoardLabSession,LAB_PUZZLES,LAB_LEVELS,readLabPreferences}from'../src/board-lab.js';
import{knightSquares,knightStep,routeDestination,routePosition,shortestKnightPath}from'../src/board-lab-rules.js';
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),map};};
test('all original memory positions are quiet, uniquely identifiable and graded by piece count',()=>{
 const ids=new Set();let count=0;
 for(const [level,records]of Object.entries(LAB_PUZZLES.memory))for(const puzzle of records){
  assert.ok(!ids.has(puzzle.id));ids.add(puzzle.id);count++;
  const chess=new Chess(puzzle.fen),pieces=chess.board().flat().filter(Boolean),target=chess.get(puzzle.target);
  assert.equal(pieces.length,({beginner:3,intermediate:5,advanced:7,expert:12})[level]);assert.ok(target);assert.notEqual(target.type,'k');
  assert.equal(pieces.filter(piece=>piece.type===target.type&&piece.color===target.color).length,1);
  for(const king of pieces.filter(piece=>piece.type==='k'))assert.equal(chess.isAttacked(king.square,king.color==='w'?'b':'w'),false);
 }assert.ok(count>=15);
});
test('every knight trail has its advertised shortest safe path and follows real knight geometry',()=>{
 let count=0;for(const records of Object.values(LAB_PUZZLES.route))for(const puzzle of records){
  const path=shortestKnightPath(puzzle);assert.ok(path);assert.equal(path.length-1,puzzle.distance);assert.equal(path[0],puzzle.from);assert.equal(path.at(-1),puzzle.to);
  for(let i=1;i<path.length;i++){const from=path[i-1],to=path[i],chess=routePosition(puzzle,from);assert.equal(knightStep(puzzle,from,to).allowed,true);assert.equal(routeDestination(puzzle,to).allowed,true);assert.ok(chess.move({from,to}));}
  count++;
 }assert.ok(count>=15);assert.deepEqual(new Set(knightSquares('a1')),new Set(['b3','c2']));assert.deepEqual(knightSquares('z9'),[]);
});
test('a hidden-memory answer is accepted only in the answer stage and records once',()=>{
 const session=new BoardLabSession({storage:storage(),seed:42}),answer=session.puzzle.target;
 assert.equal(session.attempt(answer).status,'inactive');session.start();assert.equal(session.phase,'observe');assert.equal(session.attempt(answer).status,'inactive');
 session.hide();assert.equal(session.visiblePieces,false);assert.equal(session.attempt(answer).status,'correct');assert.equal(session.results.length,1);assert.equal(session.results[0].clean,true);
 assert.equal(session.attempt(answer).status,'inactive');assert.equal(session.results.length,1);assert.equal(session.visiblePieces,true);
});
test('hints and wrong answers stay distinct from a clean recall; revealing never counts as solving',()=>{
 const session=new BoardLabSession({storage:storage(),seed:42});session.start();session.hide();
 const wrong=session.puzzle.target==='a1'?'b1':'a1';assert.equal(session.attempt(wrong).status,'retry');assert.equal(session.results.length,0);
 session.hint();assert.match(session.round.feedback,/file/);session.hint();assert.match(session.round.feedback,/rank/);session.attempt(session.puzzle.target);
 assert.equal(session.results[0].solved,true);assert.equal(session.results[0].clean,false);session.next();session.reveal();assert.equal(session.results[1].solved,false);
});
test('countdown pauses, resumes and restores without answering or marking progress',()=>{
 const store=storage(),session=new BoardLabSession({storage:store,level:'advanced',seed:42});session.start();session.tick(1500);session.pause();
 const left=session.round.remaining;assert.equal(left,2500);session.tick(100000);assert.equal(session.round.remaining,left);
 const restored=new BoardLabSession({storage:store,level:'advanced'});assert.equal(restored.phase,'paused');assert.equal(restored.round.remaining,left);assert.equal(restored.results.length,0);
 restored.start();restored.tick(2499);assert.equal(restored.phase,'observe');restored.tick(1);assert.equal(restored.phase,'answer');assert.equal(restored.visiblePieces,false);
});
test('wrong knight shape, occupancy and attack feedback use the current position',()=>{
 const puzzle=LAB_PUZZLES.route.advanced[0],session=new BoardLabSession({storage:storage(),mode:'route',level:'advanced',seed:1});
 assert.equal(knightStep(puzzle,puzzle.from,puzzle.from).reason,'shape');assert.equal(routeDestination(puzzle,'h8').reason,'occupied');
 const destination=['a','b','c','d','e','f','g','h'].flatMap(file=>[1,2,3,4,5,6,7,8].map(rank=>file+rank)).find(square=>routeDestination(puzzle,square).reason==='attacked');
 assert.ok(destination);const result=routeDestination(puzzle,destination);assert.ok(result.attackers.length);assert.ok(new Chess(puzzle.fen).get(result.attackers[0]));
 const original=session.current;assert.equal(session.attempt(session.current).status,'retry');assert.equal(session.current,original);assert.equal(session.results.length,0);
});
test('multiple shortest routes are accepted; hints recalculate and Undo cannot inflate a clean score',()=>{
 const session=new BoardLabSession({storage:storage(),mode:'route',seed:19}),puzzle=session.puzzle,canonical=shortestKnightPath(puzzle);
 const alternatives=knightSquares(puzzle.from).filter(square=>knightStep(puzzle,puzzle.from,square).allowed).map(square=>shortestKnightPath(puzzle,square)).filter(path=>path&&path.length===puzzle.distance);
 assert.ok(alternatives.length);const chosen=alternatives.find(path=>path[0]!==canonical[1])||alternatives[0];
 session.start();session.attempt(chosen[0]);session.hint();assert.equal(session.round.hintSquare,shortestKnightPath(puzzle,session.current)[1]);assert.ok(session.undo());assert.equal(session.current,puzzle.from);
 for(const square of [puzzle.from,...chosen].slice(1))session.attempt(square);
 assert.equal(session.phase,'result');assert.equal(session.results[0].solved,true);assert.equal(session.results[0].clean,false);
});
test('partial routes and each mode/level resume separately without touching course or daily progress',()=>{
 const store=storage();store.setItem('knightlab-beginner-course-v1','["rook-straight-lines"]');store.setItem('roqvyn-daily-training-v1','{"test":true}');
 const session=new BoardLabSession({storage:store,mode:'route',seed:19});session.start();const path=shortestKnightPath(session.puzzle);session.attempt(path[1]);
 const restored=new BoardLabSession({storage:store,mode:'route'});assert.equal(restored.current,path[1]);assert.equal(restored.phase,'paused');restored.start();assert.equal(restored.phase,'play');
 const memory=new BoardLabSession({storage:store,mode:'memory',seed:4});assert.equal(memory.phase,'ready');assert.equal(store.getItem('knightlab-beginner-course-v1'),'["rook-straight-lines"]');assert.equal(store.getItem('roqvyn-daily-training-v1'),'{"test":true}');
});
test('a complete session has five unique rounds, honest totals, a retained best and fresh next puzzles',()=>{
 const store=storage(),session=new BoardLabSession({storage:store,seed:19}),old=[...session.ids];assert.equal(new Set(old).size,5);
 for(let i=0;i<5;i++){session.start();session.hide();if(i===0)session.reveal();else session.attempt(session.puzzle.target);session.next();}
 assert.equal(session.phase,'complete');assert.equal(session.cleanCount,4);assert.equal(session.best,4);assert.equal(session.results.filter(r=>!r.solved).length,1);
 const restored=new BoardLabSession({storage:store});assert.equal(restored.phase,'complete');assert.equal(restored.best,4);restored.newSession(22);assert.equal(restored.results.length,0);assert.equal(restored.best,4);assert.ok(restored.ids.every(id=>!old.includes(id)));
});
test('unavailable storage and corrupt drafts retain a usable local puzzle',()=>{
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(readLabPreferences(broken).mode,'memory');
 const session=new BoardLabSession({storage:broken,seed:1});session.start();session.hide();assert.equal(session.attempt(session.puzzle.target).status,'correct');
 const store=storage(),route=new BoardLabSession({storage:store,mode:'route'}),saved=JSON.parse(store.getItem(route.key));saved.phase='play';saved.round.path=[route.puzzle.from,'h8'];store.setItem(route.key,JSON.stringify(saved));
 const clean=new BoardLabSession({storage:store,mode:'route'});assert.equal(clean.phase,'ready');assert.equal(clean.current,clean.puzzle.from);
 for(const level of Object.keys(LAB_LEVELS))assert.ok(LAB_PUZZLES.memory[level].length>=5);
});

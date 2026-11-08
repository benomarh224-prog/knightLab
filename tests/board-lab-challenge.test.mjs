import test from'node:test';import assert from'node:assert/strict';import{Chess}from'chess.js';
import{LAB_LEVELS,LAB_PUZZLES,BoardLabSession,readLabPreferences}from'../src/board-lab.js';import{shortestKnightPath,knightStep}from'../src/board-lab-rules.js';
const storage=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};

test('Expert uses denser unique recall questions and genuinely longer validated knight routes',()=>{
 assert.equal(LAB_PUZZLES.memory.expert.length,24);assert.equal(LAB_PUZZLES.route.expert.length,19);
 for(const p of LAB_PUZZLES.memory.expert){const c=new Chess(p.fen),pieces=c.board().flat().filter(Boolean);assert.equal(pieces.length,12);assert.equal(new Set(p.targets).size,3);for(const square of p.targets){const target=c.get(square);assert.ok(target&&target.type!=='k');assert.equal(pieces.filter(piece=>piece.type===target.type&&piece.color===target.color).length,1);}}
 for(const p of LAB_PUZZLES.route.expert){const path=shortestKnightPath(p);assert.ok(p.distance>=8&&p.distance<=12);assert.equal(path.length-1,p.distance);assert.equal(p.hideTargets,true);for(let i=1;i<path.length;i++)assert.ok(knightStep(p,path[i-1],path[i]).allowed);}
 assert.deepEqual(['beginner','intermediate','advanced'].map(level=>[LAB_PUZZLES.memory[level].length,LAB_PUZZLES.route[level].length]),[[29,30],[29,27],[29,18]]);
});

test('three recalls are one round; answers, hints and the same deadline survive reload',()=>{
 const store=storage(),s=new BoardLabSession({storage:store,level:'expert',seed:42});s.start();s.hide();const targets=s.targets;s.tick(5000);s.hint();assert.equal(s.attempt(targets[0]).status,'recalled');assert.equal(s.results.length,0);assert.equal(s.targetSquare,targets[1]);assert.equal(s.round.questionHints,0);assert.equal(s.round.hints,1);s.pause();
 const r=new BoardLabSession({storage:store,level:'expert'});assert.equal(r.phase,'paused');assert.equal(r.visiblePieces,false);assert.equal(r.round.solveRemaining,30000);assert.equal(r.targetSquare,targets[1]);r.start();assert.equal(r.attempt(targets[1]).status,'recalled');assert.equal(r.results.length,0);assert.equal(r.attempt(targets[2]).status,'correct');assert.equal(r.results.length,1);assert.equal(r.results[0].clean,false);assert.equal(r.attempt(targets[2]).status,'inactive');
});

test('study and solve clocks are distinct; pausing an answer never reveals the hidden pieces',()=>{
 const s=new BoardLabSession({storage:storage(),seed:4});s.start();s.tick(8000);assert.equal(s.phase,'answer');assert.equal(s.round.solveRemaining,45000);s.tick(12000);s.pause();assert.equal(s.visiblePieces,false);assert.equal(s.round.solveRemaining,33000);s.tick(999999);assert.equal(s.round.solveRemaining,33000);s.start();assert.equal(s.phase,'answer');s.tick(33000);assert.equal(s.round.timedOut,true);assert.equal(s.results.length,0);assert.equal(s.phase,'answer');assert.equal(s.attempt(s.targetSquare).status,'correct');assert.equal(s.results[0].clean,false);assert.equal(s.results[0].timedOut,true);
});

test('route timeout allows practice without recording a clean solve or advancing the puzzle',()=>{
 const s=new BoardLabSession({storage:storage(),mode:'route',level:'expert',seed:9});s.start();s.tick(89999);assert.equal(s.round.timedOut,false);s.tick(1);assert.equal(s.clockRunning,false);assert.equal(s.index,0);assert.equal(s.results.length,0);const path=shortestKnightPath(s.puzzle);for(const square of path.slice(1))s.attempt(square);assert.equal(s.results[0].solved,true);assert.equal(s.results[0].clean,false);assert.equal(s.results[0].timedOut,true);
});

test('untimed training does not consume either clock; toggling the timer cannot refill a budget',()=>{
 const s=new BoardLabSession({storage:storage(),timed:false});s.start();s.tick(999999);assert.equal(s.phase,'observe');s.hide();s.tick(999999);assert.equal(s.round.solveRemaining,s.solveLimit);s.timed=true;s.tick(1000);const left=s.round.solveRemaining;s.timed=false;s.tick(999999);s.timed=true;assert.equal(s.round.solveRemaining,left);assert.equal(s.attempt(s.targetSquare).status,'correct');
 const preferences=readLabPreferences({getItem:()=>JSON.stringify({level:'expert',timed:false})});assert.equal(preferences.level,'expert');assert.equal(preferences.timed,false);
});

test('retry keeps earlier results and assistance history; clean scores cannot be farmed by resetting one puzzle',()=>{
 const s=new BoardLabSession({storage:storage(),level:'expert',seed:12});s.start();s.hide();for(const target of s.targets)s.attempt(target);s.next();const first=s.results[0],id=s.puzzle.id;s.start();s.hide();s.hint();s.tick(s.solveLimit);assert.equal(s.retry(),true);assert.equal(s.puzzle.id,id);assert.equal(s.phase,'ready');assert.equal(s.results.length,1);assert.deepEqual(s.results[0],first);assert.equal(s.round.retries,1);assert.equal(s.round.hints,1);s.start();s.hide();for(const target of s.targets)s.attempt(target);assert.equal(s.results[1].clean,false);
});

test('legacy v1 active drafts migrate with their position, counters and best preserved, and a fresh solve budget',()=>{
 const store=storage(),s=new BoardLabSession({storage:store,mode:'route',seed:5});s.start();s.attempt(shortestKnightPath(s.puzzle)[1]);s.best=4;s.save();const data=JSON.parse(store.getItem(s.key));for(const key of['solveRemaining','timedOut','answers','questionHints','retries','resumePhase'])delete data.round[key];store.setItem(s.key,JSON.stringify(data));const r=new BoardLabSession({storage:store,mode:'route'});assert.equal(r.current,s.current);assert.equal(r.best,4);assert.equal(r.phase,'paused');assert.equal(r.round.solveRemaining,LAB_LEVELS.beginner.routeSeconds*1000);r.start();assert.equal(r.phase,'play');
});

test('corrupt recall prefixes and paused phases are rejected without awarding progress',()=>{
 const store=storage(),s=new BoardLabSession({storage:store,level:'expert'});s.start();s.hide();s.save();const data=JSON.parse(store.getItem(s.key));data.round.answers=[s.targets[2]];store.setItem(s.key,JSON.stringify(data));const r=new BoardLabSession({storage:store,level:'expert'});assert.equal(r.phase,'ready');assert.equal(r.results.length,0);assert.deepEqual(r.round.answers,[]);
});

test('a timed position cannot be studied before Start or while paused; untimed study remains available',()=>{
 for(const mode of['memory','route']){const s=new BoardLabSession({storage:storage(),mode,level:'expert'});assert.equal(s.visiblePieces,false);s.start();assert.equal(s.visiblePieces,true);s.pause();assert.equal(s.visiblePieces,false);s.start();assert.equal(s.visiblePieces,true);const u=new BoardLabSession({storage:storage(),mode,timed:false});assert.equal(u.visiblePieces,true);}
});

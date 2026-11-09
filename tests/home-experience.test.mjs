import test from'node:test';import assert from'node:assert/strict';import{Chess}from'chess.js';import{homeReviewFrames,homeLabFacts}from'../src/home-experience.js';import{LAB_PUZZLES}from'../src/board-lab.js';
test('the homepage sample is a continuous legal Opera Game line with accurate turn order and descriptions',()=>{
 const frames=homeReviewFrames();assert.deepEqual(frames.map(f=>f.move.san),['Nxb5','cxb5','Bxb5+','Nbd7','O-O-O']);
 for(let i=0;i<frames.length;i++){const f=frames[i],board=new Chess(f.move.before);if(i)assert.equal(board.fen(),frames[i-1].fen);const actual=board.move({from:f.move.from,to:f.move.to,promotion:f.move.promotion});assert.equal(board.fen(),f.fen);assert.equal(actual.san,f.move.san);assert.match(f.label,new RegExp('^'+f.move.before.split(' ')[5]));}
 assert.equal(frames[0].move.captured,'p');assert.equal(frames[1].move.captured,'n');assert.equal(frames[2].move.captured,'p');assert.equal(new Chess(frames[2].fen).isCheck(),true);assert.equal(new Chess(frames[3].fen).isCheck(),false);assert.ok(frames[4].move.flags.includes('q'));
 const castled=new Chess(frames[4].fen);assert.equal(castled.get('c1').type,'k');assert.equal(castled.get('d1').type,'r');assert.equal(castled.get('d1').color,'w');
});
test('homepage puzzle figures come from the existing library rather than invented totals',()=>{
 const facts=homeLabFacts();assert.equal(facts.total,Object.values(LAB_PUZZLES.memory).flat().length+Object.values(LAB_PUZZLES.route).flat().length);assert.equal(facts.expert,LAB_PUZZLES.memory.expert.length+LAB_PUZZLES.route.expert.length);assert.equal(facts.minHops,8);assert.equal(facts.maxHops,10);
});

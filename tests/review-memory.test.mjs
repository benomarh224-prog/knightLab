import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewMemory } from '../src/review-memory.js';

function storage(){let value=null;return {getItem:()=>value,setItem:(_,next)=>{value=next;}};}
test('review memory restores the exact game, position, and orientation across instances',()=>{
  const local=storage(),memory=createReviewMemory(local);
  const game={pgn:'1. e4 e5 2. Nf3 *',white:{username:'Player',rating:800},black:{username:'Opponent'},secret:'not retained'};
  memory.save(game,{ply:3,flipped:true,demo:false});
  const resumed=createReviewMemory(local);
  assert.deepEqual(resumed.position(game.pgn,3),{ply:3,flipped:true});
  assert.equal(resumed.last().game.white.username,'Player');
  assert.equal(resumed.last().game.secret,undefined);
  assert.equal(resumed.position('1. d4 *',1),null);
  assert.equal(resumed.position(game.pgn,1).ply,1);
});
test('switching games keeps separate cursors, moves the last review first and bounds retention',()=>{
  const local=storage(),memory=createReviewMemory(local);
  for(let i=0;i<10;i++)memory.save({pgn:`game ${i}`},{ply:i,flipped:false,demo:false});
  assert.equal(memory.position('game 0',20),null);
  assert.equal(memory.position('game 5',20).ply,5);
  memory.save({pgn:'game 5'},{ply:2,flipped:true,demo:false});
  assert.equal(memory.last().game.pgn,'game 5');
  assert.equal(memory.position('game 5',20).ply,2);
  assert.equal(JSON.parse(local.getItem()).length,8);
});
test('blocked, corrupted and invalid storage never interrupts reviewing',()=>{
  assert.equal(createReviewMemory({getItem:()=>'{broken'}).last(),null);
  assert.equal(createReviewMemory({getItem:()=>'{"ply":5}'}).last(),null);
  assert.equal(createReviewMemory({getItem:()=>JSON.stringify([{game:{pgn:'x'},ply:-1}])}).last(),null);
  const denied=createReviewMemory({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});
  assert.equal(denied.position('x',3),null);
  assert.equal(denied.save({pgn:'x'},{ply:2}),false);
  assert.equal(createReviewMemory().save({pgn:'x'},{ply:1}),false);
  assert.equal(createReviewMemory(storage()).save({pgn:'x'.repeat(250001)},{ply:1}),false);
});

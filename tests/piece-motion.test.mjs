import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame } from '../src/game.js';
import { moveTransitions } from '../src/piece-motion.js';

function positions(pgn,index){const game=parseGame(pgn);return [
  {game,fen:game.fens[index],last:game.moves[index-1],flipped:false},
  {game,fen:game.fens[index+1],last:game.moves[index],flipped:false},
];}
test('motion handles forward moves, captures and backward navigation without animating engine refreshes',()=>{
  const [before,after]=positions('1. e4 d5 2. exd5 *',2);
  assert.deepEqual(moveTransitions(before,after),[{from:'e4',to:'d5'}]);
  assert.deepEqual(moveTransitions(after,before),[{from:'d5',to:'e4'}]);
  assert.deepEqual(moveTransitions(after,after),[]);
  assert.deepEqual(moveTransitions(null,after),[]);
  assert.deepEqual(moveTransitions(before,{...after,flipped:true}),[]);
  assert.deepEqual(moveTransitions(before,{...after,game:{}}),[]);
});
test('castling moves both king and rook; promotion and en passant use the actual moving squares',()=>{
  const castle=positions('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *',6);
  assert.deepEqual(moveTransitions(...castle),[{from:'e1',to:'g1'},{from:'h1',to:'f1'}]);
  assert.deepEqual(moveTransitions(castle[1],castle[0]),[{from:'g1',to:'e1'},{from:'f1',to:'h1'}]);
  const promotion=positions('[SetUp "1"]\n[FEN "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"]\n\n1. a8=Q+ *',0);
  assert.deepEqual(moveTransitions(...promotion),[{from:'a7',to:'a8'}]);
  assert.deepEqual(moveTransitions(...positions('1. e4 a6 2. e5 d5 3. exd6 *',4)),[{from:'e5',to:'d6'}]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame } from '../src/game.js';
import { createInlineAnalysis } from '../src/inline-analysis.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('coach playback validates the full continuation before replacing a branch and keeps its board synchronized',()=>{
 const h=harness(),c=h.controller;
 const line=parseGame('1. e4 e5 2. Nf3 *').moves;
 assert.equal(c.playback(h.state.parsed.fens[0],line,2),true);assert.equal(c.line.cursor,2);assert.equal(c.line.fen,line[1].after);assert.equal(c.line.entries.length,3);
 c.jump(3);assert.equal(c.line.last.san,'Nf3');assert.equal(c.line.fen,line[2].after);assert.equal(h.state.ply,0);
 const before=c.line.fen;assert.equal(c.playback(h.state.parsed.fens[0],[{...line[0],before:'wrong'}],1),false);assert.equal(c.line.fen,before);
 c.exit();assert.equal(c.active,false);assert.equal(h.resumes,1);
});
function harness(pgn='1. e4 e5 2. Nf3 Nc6 *',ply=0){
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,open:false,textContent:'',classList:{toggle(){}},setAttribute(){}});return nodes.get(id);};
 globalThis.document={getElementById:node,querySelectorAll:()=>[],querySelector:()=>node('board-card')};
 const state={parsed:parseGame(pgn),evaluations:[],ply};
 const engines=[],sounds=[];let paints=0,resumes=0,pauses=0,controller;
 const createEngine=()=>{
  const requests=[];
  const engine={requests,destroy(){},evaluate(fen){return new Promise((resolve,reject)=>requests.push({fen,resolve,reject}));}};
  engines.push(engine);return engine;
 };
 controller=createInlineAnalysis({context:()=>state,pause:()=>{pauses++;return true;},resume:()=>resumes++,onChange:()=>{paints++;controller.paint();},playSound:move=>sounds.push(move.san),createEngine});
 return {controller,state,nodes,engines,sounds,get paints(){return paints;},get resumes(){return resumes;},get pauses(){return pauses;}};
}

test('the review board accepts direct selection and both sides can move during engine search',()=>{
 const h=harness(),original=JSON.stringify(h.state.parsed),c=h.controller;
 c.click('e7');assert.equal(c.active,false); // White must move first.
 c.click('e2');assert.equal(c.active,true);assert.equal(c.selected,'e2');assert.ok(c.targets.has('e4'));
 c.click('e4');c.click('e7');c.click('e5');
 assert.deepEqual(h.sounds,['e4','e5']);assert.equal(c.line.cursor,2);
 assert.equal(JSON.stringify(h.state.parsed),original);assert.equal(h.state.ply,0);
 assert.match(h.nodes.get('analysis-board-instruction').textContent,/White.*Free play/);
 c.exit();assert.equal(c.active,false);assert.equal(h.resumes,1);assert.equal(h.pauses,1);
});

test('starting a drag keeps its DOM intact until the drop, then undo and reset retain the game',()=>{
 const h=harness(),c=h.controller;
 c.select('g1',false);assert.equal(c.selected,'g1');assert.equal(h.paints,0);assert.equal(h.engines.length,0);
 c.attempt('g1','f3');assert.equal(c.line.last.san,'Nf3');
 h.nodes.get('line-undo').onclick();assert.equal(c.line.cursor,0);assert.equal(c.line.chess.get('g1').type,'n');
 c.attempt('d2','d4');assert.deepEqual(c.line.entries.map(m=>m.san),['d4']);
 h.nodes.get('line-reset').onclick();assert.equal(c.line.cursor,0);assert.equal(c.line.entries.length,0);
 c.exit();
});

test('engine replies and coach alternatives use their own exact positions, including branch roots',()=>{
 const h=harness(undefined,2),c=h.controller,original=h.state.parsed.fens[2];
 assert.equal(c.tryBest('g1f3'),true);assert.equal(c.line.rootFen,original);assert.equal(c.line.last.san,'Nf3');
 assert.equal(c.tryBest('f1c4',{replaceLast:true}),true);assert.deepEqual(c.line.entries.map(m=>m.san),['Bc4']);
 const snapshot=c.line.snapshot();assert.equal(c.tryBest('e7e5',{replaceLast:true}),false);assert.equal(c.line.matches(snapshot),true);
 c.jump(0);assert.equal(c.tryBest('d2d4',{replaceLast:true}),true);assert.equal(c.line.last.san,'d4');
 c.exit();assert.equal(c.tryBest('c7c5',{replaceLast:true}),true);
 assert.equal(c.line.rootFen,h.state.parsed.fens[1]);assert.equal(c.line.last.san,'c5');assert.equal(h.state.ply,2);
 c.exit();
});

test('Play best works at the game starting position and Undo is disabled at the branch root',()=>{
 const h=harness(),c=h.controller;
 h.state.evaluations[0]={cp:20,mate:null,best:'e2e4'};c.paint();
 assert.equal(h.nodes.get('line-reply').disabled,false);
 h.nodes.get('line-reply').onclick();assert.equal(c.line.last.san,'e4');
 c.jump(0);assert.equal(h.nodes.get('line-undo').disabled,true);
 c.exit();
});

test('stale engine results cannot overwrite a newer position or a closed variation',async()=>{
 const h=harness(),c=h.controller;
 c.click('e2');const stale=h.engines[0].requests[0];c.click('e4');
 stale.resolve({cp:999,best:'d2d4'});await tick();assert.equal(c.line.scores[0],null);assert.equal(c.line.score,null);
 c.exit();for(const engine of h.engines)for(const request of engine.requests)request.resolve({cp:10,best:null});
 await tick();assert.equal(c.active,false);
});

test('promotion waits for an explicit piece and insufficient material does not lock analysis',()=>{
 const h=harness('[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=Q+ Kh7 *'),c=h.controller;
 c.click('a7');c.click('a8');assert.equal(c.line.cursor,0);assert.equal(h.nodes.get('line-promotion').hidden,false);
 c.attempt('a7','a8','n');assert.equal(c.line.chess.get('a8').type,'n');assert.equal(c.line.chess.isInsufficientMaterial(),true);
 c.click('h8');c.click('g8');assert.equal(c.line.last.san,'Kg8');c.exit();
});

test('engine failure leaves free movement, retry, and return to game available',async()=>{
 const h=harness(),c=h.controller;c.click('e2');
 h.engines[0].requests[0].reject(new Error('Engine unavailable'));await tick();
 assert.equal(h.nodes.get('line-retry').hidden,false);
 c.click('e4');assert.equal(c.line.last.san,'e4');c.exit();assert.equal(c.active,false);
});

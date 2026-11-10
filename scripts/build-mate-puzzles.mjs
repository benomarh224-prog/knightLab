// Original constructed study positions. Exhaustive one-ply legality verifies
// that every exercise has exactly one move that gives immediate checkmate.
import{Chess}from'chess.js';import{writeFile}from'node:fs/promises';
const records=[],seen=new Set(),squares=[...'abcdefgh'].flatMap(f=>[1,2,3,4,5,6,7,8].map(r=>f+r));
function board(pieces,side='w'){
 const chess=new Chess();chess.clear();for(const[color,type,square]of pieces)if(chess.get(square)||!chess.put({color,type},square))return null;
 const fen=chess.fen().split(' ');fen[1]=side;try{return new Chess(fen.join(' '));}catch{return null;}
}
function quiet(chess){return chess&&chess.board().flat().filter(p=>p?.type==='k').every(k=>!chess.isAttacked(k.square,k.color==='w'?'b':'w'));}
function add(chess,group){
 if(!quiet(chess)||seen.has(chess.fen()))return false;const mates=[];
 for(const move of chess.moves({verbose:true})){const next=new Chess(chess.fen());next.move({from:move.from,to:move.to,promotion:move.promotion});if(next.isCheckmate())mates.push(move);}
 if(mates.length!==1)return false;
 const move=mates[0];records.push({id:`mate-${group}-${records.filter(p=>p.group===group).length+1}`,group,fen:chess.fen(),solution:move.from+move.to+(move.promotion||''),san:move.san});seen.add(chess.fen());return true;
}
function rotate(pieces){return pieces.map(([c,t,s])=>[c==='w'?'b':'w',t,String.fromCharCode(104-(s.charCodeAt(0)-97))+(9-Number(s[1]))]);}
for(const[king,rook]of[['h8','a1'],['g8','b1'],['b8','g1'],['a8','h1']]){
 const f=king.charCodeAt(0),pawns=[-1,0,1].map(d=>f+d).filter(f=>f>=97&&f<=104).map(f=>['b','p',String.fromCharCode(f)+'7']);
 const pieces=[['w','k','e2'],['b','k',king],['w','r',rook],...pawns];
 if(!add(board(pieces),'back-rank')||!add(board(rotate(pieces),'b'),'back-rank'))throw Error('Back-rank construction failed');
}
let state=10112026;const random=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/4294967296*n);};
for(let attempt=0;attempt<25000&&records.filter(p=>p.group==='queen-net').length<8;attempt++){
 const pieces=[['w','k',squares[random(64)]],['b','k',['a8','b8','g8','h8','a7','h7'][random(6)]],['w','q',squares[random(64)]]];
 if(records.filter(p=>p.group==='queen-net').length%2)add(board(rotate(pieces),'b'),'queen-net');else add(board(pieces),'queen-net');
}
for(const[piece,square,rook]of[['n','g5','a1'],['b','f5','b1'],['b','g6','d1'],['n','g5','e1']]){
 const pieces=[['w','k','c2'],['b','k','h8'],['b','p','g7'],['w',piece,square],['w','r',rook]];
 if(!add(board(pieces),'teamwork')||!add(board(rotate(pieces),'b'),'teamwork'))throw Error('Supported mate construction failed');
}
if(records.length!==24||new Set(records.map(p=>p.fen)).size!==24)throw Error('Expected 24 unique positions');
await writeFile('src/mate-puzzles.json',JSON.stringify(records,null,2)+'\n');console.log({total:records.length,white:records.filter(p=>p.fen.split(' ')[1]==='w').length,groups:Object.fromEntries(['back-rank','queen-net','teamwork'].map(g=>[g,records.filter(p=>p.group===g).length]))});

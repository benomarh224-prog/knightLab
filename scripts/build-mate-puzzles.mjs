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
// Keep the first 24 IDs/positions intact: existing completion and drafts survive.
function pair(pieces,group,predicate=()=>true){
 const chess=board(pieces);if(!quiet(chess))return false;
 const mates=chess.moves({verbose:true}).filter(move=>move.san.endsWith('#'));
 if(mates.length!==1||!predicate(mates[0]))return false;
 if(!add(chess,group))return false;
 if(!add(board(rotate(pieces),'b'),group))throw Error('Invalid mirrored exercise: '+group);
 return true;
}
const file=n=>String.fromCharCode(97+n);
for(const k of[2,3,4,5])for(const offset of[-1,1]){
 pair([['w','k',file(k)+'6'],['b','k',file(k)+'8'],['w','b',file(k)+'7'],['w','p',file(k+offset)+'6']],'pawn-mate',move=>move.piece==='p');
}
for(const k of[2,3])for(const rank of[1,2,3,4]){
 pair([['w','k',file(k)+'6'],['b','k',file(k)+'8'],['w','b',file(k+2)+'8'],['w','r',file(k-1)+rank],['w','n',file(k+3)+'7']],'bishop-mate',move=>move.piece==='b');
}
for(const king of['h8','a8'])for(const start of king==='h8'?['d6','d8','e5','g5']:['e6','e8','d5','b5']){
 const right=king==='h8';
 pair([['w','k',right?'b2':'g2'],['b','k',king],['b','r',right?'g8':'b8'],['b','p',right?'g7':'b7'],['b','p',right?'h7':'a7'],['w','n',start]],'knight-mate',move=>move.piece==='n');
}
// Sparse rook nets: vary the king's edge, support geometry and rook's distance.
for(let attempt=0;attempt<30000&&records.filter(p=>p.group==='rook-net').length<16;attempt++){
 const king=['a8','b8','g8','h8','a7','h7','a5','h4'][random(8)],near=squares.filter(s=>Math.max(Math.abs(s.charCodeAt(0)-king.charCodeAt(0)),Math.abs(+s[1]- +king[1]))===2);
 pair([['w','k',near[random(near.length)]],['b','k',king],['w','r',squares[random(64)]]],'rook-net',move=>move.piece==='r');
}
// Turn verified queen finishes into captures, then recheck every alternative.
for(let attempt=0;attempt<30000&&records.filter(p=>p.group==='queen-capture').length<16;attempt++){
 const pieces=[['w','k',squares[random(64)]],['b','k',['a8','b8','g8','h8','a7','h7'][random(6)]],['w','q',squares[random(64)]]],chess=board(pieces);
 if(!quiet(chess))continue;const mates=chess.moves({verbose:true}).filter(m=>m.san.endsWith('#'));if(mates.length!==1)continue;
 pair([...pieces,['b',['n','b','r'][random(3)],mates[0].to]],'queen-capture',move=>move.piece==='q'&&Boolean(move.captured));
}
// Promotion positions include a supporting piece; queen/rook alternatives must
// be tested independently, so a position with two mating promotions is rejected.
for(let attempt=0;attempt<60000&&records.filter(p=>p.group==='promotion-mate').length<16;attempt++){
 const king=['a8','b8','c8','f8','g8','h8','a7','h7'][random(8)],pieces=[['w','k',squares[random(64)]],['b','k',king],['w','p',file(random(8))+'7'],['w',['q','r','b','n'][random(4)],squares[random(64)]]];
 pair(pieces,'promotion-mate',move=>Boolean(move.promotion));
}
const expected={'back-rank':8,'queen-net':8,teamwork:8,'pawn-mate':16,'bishop-mate':16,'knight-mate':16,'rook-net':16,'queen-capture':16,'promotion-mate':16};
for(const[group,total]of Object.entries(expected))if(records.filter(p=>p.group===group).length!==total)throw Error('Missing exercises: '+group+' '+records.filter(p=>p.group===group).length);
if(records.length!==120||new Set(records.map(p=>p.fen)).size!==120)throw Error('Expected 120 unique positions');
await writeFile('src/mate-puzzles.json',JSON.stringify(records,null,2)+'\n');console.log({total:records.length,white:records.filter(p=>p.fen.split(' ')[1]==='w').length,groups:expected});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGame } from '../src/game.js';
import { AnalysisLine } from '../src/analysis-line.js';
import { positionThreats, arrowPath } from '../src/board-visuals.js';

test('inline exploration branches without changing the original PGN or its FENs',()=>{
 const parsed=parseGame('1. e4 e5 2. Nf3 Nc6 *'),original=JSON.stringify(parsed);
 const line=new AnalysisLine(parsed.fens[2],null,{startFen:parsed.fens[0],moves:['e2e4','e7e5']});
 assert.equal(line.play('f1','c4').status,'played');
 assert.equal(line.last.san,'Bc4'); assert.equal(JSON.stringify(parsed),original);
 assert.deepEqual(line.history().moves,['e2e4','e7e5','f1c4']);
 line.jump(0); assert.equal(line.fen,parsed.fens[2]);
 line.jump(1); assert.equal(line.last.san,'Bc4');
});
test('rewinding then trying another move discards the abandoned future and scores',()=>{
 const parsed=parseGame('1. e4 *'),line=new AnalysisLine(parsed.fens[0],{cp:0});
 line.play('e2','e4'); line.play('e7','e5'); line.scores[2]={cp:50};
 line.jump(1); const previous=line.snapshot();
 assert.equal(line.play('c7','c5').status,'played');
 assert.equal(line.entries[1].san,'c5'); assert.equal(line.scores[2],null);
 assert.equal(line.matches(previous),false);
 line.reset(); assert.equal(line.cursor,0); assert.equal(line.entries.length,0); assert.equal(line.score.cp,0);
});
test('illegal moves and explicit promotions preserve the board until a legal choice',()=>{
 const line=new AnalysisLine('7k/P7/8/8/8/8/8/7K w - - 0 1'),original=line.fen;
 assert.equal(line.play('a7','a5').status,'illegal'); assert.equal(line.fen,original);
 assert.equal(line.play('a7','a8').status,'promotion'); assert.equal(line.fen,original);
 assert.equal(line.play('a7','a8','r').status,'played'); assert.equal(line.chess.get('a8').type,'r');
 line.jump(0); assert.equal(line.fen,original);
});
test('castling and inherited threefold repetition survive inline history reconstruction',()=>{
 const castle=new AnalysisLine('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
 assert.equal(castle.play('e1','g1').status,'played'); assert.equal(castle.chess.get('f1').type,'r');
 castle.jump(0); assert.equal(castle.chess.get('h1').type,'r');
 const parsed=parseGame('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 *');
 const prefix=parsed.moves.map(m=>m.from+m.to);
 const line=new AnalysisLine(parsed.fens.at(-1),null,{startFen:parsed.fens[0],moves:prefix});
 line.play('f6','g8'); assert.equal(line.chess.isThreefoldRepetition(),true);
 assert.equal(line.play('g1','f3').status,'illegal');
});
test('attack maps distinguish unprotected pieces, defended attacks and poor exchanges',()=>{
 const loose=positionThreats('7k/8/8/8/4q3/8/4R3/K7 w - - 0 1').find(t=>t.square==='e2');
 assert.equal(loose.kind,'loose'); assert.match(loose.explanation,/Black queen on e4/);
 const defended=positionThreats('7k/8/8/4p3/3P4/2P5/8/K7 b - - 0 1').find(t=>t.square==='d4');
 assert.equal(defended.kind,'defended'); assert.match(defended.explanation,/does not by itself mean/);
 const trade=positionThreats('7k/8/8/4p3/3Q4/2P5/8/K7 b - - 0 1').find(t=>t.square==='d4');
 assert.equal(trade.kind,'exchange'); assert.match(trade.explanation,/lower-value/i);
});
test('pinned attackers do not produce an illegal capture threat',()=>{
 const threats=positionThreats('6k1/6n1/4P3/8/8/8/8/K5R1 w - - 0 1');
 assert.equal(threats.some(t=>t.square==='e6'),false);
});
test('a protected attacking rook explains why the king cannot recapture',()=>{
 const pawn=positionThreats('8/p7/2p2pkp/1p4p1/1P4P1/P1P2RP1/3rr1PK/R7 w - - 1 30').find(t=>t.square==='g2');
 assert.equal(pawn.kind,'loose'); assert.match(pawn.explanation,/king cannot recapture on g2: Black rook on d2 protects/);
});
test('check highlights the checked king and names the attacker',()=>{
 const threats=positionThreats('7k/8/8/8/8/8/7R/K7 b - - 0 1');
 const king=threats.find(t=>t.square==='h8'); assert.equal(king.kind,'check'); assert.match(king.explanation,/White rook on h2/);
});
test('en passant highlights the captured pawn and explains the unusual destination',()=>{
 const threats=positionThreats('7k/8/8/3pP3/8/8/8/K7 w - d6 0 1');
 const pawn=threats.find(t=>t.square==='d5'); assert.equal(pawn.attackers[0].to,'d6'); assert.match(pawn.explanation,/en passant on d6/);
});
test('arrow geometry follows orientation, uses L-shaped knight paths and rejects invalid moves',()=>{
 assert.equal(arrowPath('e2','e4'),'M 450 650 L 450 477');
 assert.equal(arrowPath('e2','e4',true),'M 350 150 L 350 323');
 assert.equal(arrowPath('g1','f3'),'M 650 750 L 650 550 L 577 550');
 assert.equal(arrowPath('g1','f3',true),'M 150 50 L 150 250 L 223 250');
 assert.equal(arrowPath('a1','a1'),''); assert.equal(arrowPath('x9','e4'),'');
});

import { Chess } from 'chess.js';
export const pieceNames = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const value = {p:1,n:3,b:3,r:5,q:9,k:100};
const name = color => color==='w'?'White':'Black';

// Legal captures after a hypothetical pass. This is an attack map, not a
// prediction that the opponent will make the capture or win the game.
export function positionThreats(fen) {
  const board=new Chess(fen), result=[];
  for (const color of ['w','b']) {
    const parts=fen.split(' '); parts[1]=color;
    if (color!==board.turn()) parts[3]='-'; // En passant belongs to the actual turn only.
    const attacker=new Chess(parts.join(' '));
    const captures=attacker.moves({verbose:true}).filter(move=>move.captured && move.captured!=='k');
    const groups=new Map();
    for (const capture of captures) {
      // En passant removes a pawn on a different square from its destination.
      const square=capture.isEnPassant() ? capture.to[0]+capture.from[1] : capture.to;
      const target=board.get(square); if (!target || target.color===color) continue;
      const after=new Chess(capture.after);
      const defended=after.moves({verbose:true}).some(reply=>reply.to===capture.to && reply.captured);
      const king=after.attackers(capture.to,target.color).find(square=>after.get(square)?.type==='k');
      const guards=king&&!defended ? after.attackers(capture.to,color).map(square=>`${name(color)} ${pieceNames[after.get(square).type]} on ${square}`) : [];
      const recaptureReason=guards.length?`The king cannot recapture on ${capture.to}: ${guards.join(', ')} ${guards.length===1?'protects':'protect'} that square.`:'';
      if (!groups.has(square)) groups.set(square,{square,piece:target,attackers:[],kind:'defended'});
      const item=groups.get(square);
      item.attackers.push({from:capture.from,to:capture.to,piece:capture.piece,san:capture.san,defended,enPassant:capture.isEnPassant(),recaptureReason});
      if (!defended) item.kind='loose';
      else if (item.kind!=='loose' && value[capture.piece]<value[target.type]) item.kind='exchange';
    }
    result.push(...groups.values());
  }
  if (board.isCheck()) {
    const king=board.board().flat().find(piece=>piece?.type==='k'&&piece.color===board.turn());
    result.push({square:king.square,piece:king,kind:'check',attackers:board.attackers(king.square,board.turn()==='w'?'b':'w').map(from=>({from,to:king.square,piece:board.get(from).type}))});
  }
  return result.map(item=>{
    const attackers=item.attackers.map(a=>`${name(item.piece.color==='w'?'b':'w')} ${pieceNames[a.piece]} on ${a.from}`).join(', ');
    const detail=item.kind==='check'?'The king is in check. You must answer the check.':item.kind==='loose'?'At least one capture has no legal immediate recapture. Consider moving the piece, defending it, or a forcing reply.':item.kind==='exchange'?'A lower-value piece can capture it. A recapture is available, but the material exchange may be unfavorable.':'An immediate legal recapture is available. Being attacked does not by itself mean the piece is lost.';
    const ep=item.attackers.find(attack=>attack.enPassant);
    const reason=item.kind==='loose'?item.attackers.find(attack=>!attack.defended)?.recaptureReason:'';
    return {...item,label:`${name(item.piece.color)} ${pieceNames[item.piece.type]} on ${item.square}`,explanation:`${attackers} ${ep?`can capture this pawn en passant on ${ep.to}`:`${item.attackers.length===1?'attacks':'attack'} ${item.square}`}. ${reason?reason+' ':''}${detail}`};
  });
}

export function arrowPath(from,to,flipped=false) {
  if (!/^[a-h][1-8]$/.test(from||'') || !/^[a-h][1-8]$/.test(to||'') || from===to) return '';
  const point=square=>[flipped?(7-(square.charCodeAt(0)-97))*100+50:(square.charCodeAt(0)-97)*100+50,flipped?(Number(square[1])-1)*100+50:(8-Number(square[1]))*100+50];
  const a=point(from),b=point(to),dx=b[0]-a[0],dy=b[1]-a[1];
  const knight=Math.abs(dx)*Math.abs(dy)===20000 && Math.abs(dx)+Math.abs(dy)===300;
  const corner=knight ? Math.abs(dx)>Math.abs(dy)?[b[0],a[1]]:[a[0],b[1]] : a;
  const length=Math.hypot(b[0]-corner[0],b[1]-corner[1]);
  const end=[b[0]-(b[0]-corner[0])/length*27,b[1]-(b[1]-corner[1])/length*27];
  return `M ${a[0]} ${a[1]}${knight?` L ${corner[0]} ${corner[1]}`:''} L ${end[0]} ${end[1]}`;
}

import { Chess } from 'chess.js';

const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
// Explain board facts only. A legal move outside the selected study line is not illegal.
export function illegalMoveReason(fen,from,to,promotion){
  const chess=new Chess(fen),piece=chess.get(from),target=chess.get(to);
  if(!piece)return 'There is no piece on that square. Select one of your pieces first.';
  if(piece.color!==chess.turn())return 'It is the other side’s turn. Move a piece of the side to play.';
  if(from===to)return 'Choose a different destination square.';
  if(target?.color===piece.color)return 'Your own piece occupies that square. Choose another destination.';
  if(target?.type==='k')return 'Kings are never captured. Give check or checkmate instead.';
  try{chess.move({from,to,promotion:promotion||'q'});return 'That move is legal.';}catch{}
  const dx=to.charCodeAt(0)-from.charCodeAt(0),dy=Number(to[1])-Number(from[1]),ax=Math.abs(dx),ay=Math.abs(dy);
  const step=piece.color==='w'?1:-1;
  if(piece.type==='n'&&!((ax===1&&ay===2)||(ax===2&&ay===1)))return 'A knight moves in an L: two squares in one direction and one across.';
  if(piece.type==='b'&&ax!==ay)return 'A bishop moves diagonally. Choose a square on the same diagonal.';
  if(piece.type==='r'&&dx&&dy)return 'A rook moves along a rank or a file, in a straight line.';
  if(piece.type==='q'&&dx&&dy&&ax!==ay)return 'A queen moves along a rank, file, or diagonal.';
  if(piece.type==='k'&&Math.max(ax,ay)>1&&!(ax===2&&!dy&&from[0]==='e'))return 'A king moves one square, except when castling.';
  if(piece.type==='p'){
    if(dy*step<=0)return 'Pawns move forward; they cannot move backward or sideways.';
    if(!dx&&target)return 'A pawn cannot capture straight ahead. That square is occupied.';
    if(ax===1&&dy===step&&!target&&to!==fen.split(' ')[3])return 'Pawns capture diagonally only when an opponent’s piece is there, or en passant is available.';
    if(!((!dx&&(dy===step||dy===2*step&&Number(from[1])===(piece.color==='w'?2:7)))||(ax===1&&dy===step)))return 'A pawn moves one square forward, or two from its starting rank, and captures one square diagonally.';
  }
  if(['b','r','q','p'].includes(piece.type)||piece.type==='k'&&ax===2){
    const sx=Math.sign(dx),sy=Math.sign(dy),distance=Math.max(ax,ay);
    for(let i=1;i<distance;i++){
      const square=String.fromCharCode(from.charCodeAt(0)+sx*i)+(Number(from[1])+sy*i);
      if(chess.get(square))return `The piece on ${square} blocks your ${names[piece.type]}. Only knights can jump over pieces.`;
    }
  }
  if(piece.type==='k'&&ax===2){
    const rank=from[1],kingSide=dx>0,right=piece.color==='w'?(kingSide?'K':'Q'):(kingSide?'k':'q');
    if(!fen.split(' ')[2].includes(right))return 'Castling is unavailable: the king or rook no longer has castling rights.';
    if(!kingSide&&chess.get('b'+rank))return `The piece on b${rank} blocks queenside castling.`;
    return 'You cannot castle while in check, through check, or into check.';
  }
  return piece.type==='k'?'That square is attacked. Your king cannot move into check.':chess.isCheck()?'Your king is in check. Capture the attacker, block the check, or move the king safely.':'That move would expose your king to check. Keep the king protected.';
}

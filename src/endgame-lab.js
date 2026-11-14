import { Chess } from 'chess.js';

export const ENDGAMES = [
  {
    id:'rook-mate', title:'Mate with king and rook', description:'Take away the exit squares before checking.',
    demo:'8/8/8/8/8/2K5/R7/2k5 w - - 0 1',
    steps:[['Ra1#','The rook checks along the first rank. Your king covers b2, c2 and d2, so Black has no escape.']],
    fen:'7k/8/5K2/8/8/8/8/R7 w - - 0 1', color:'w', objective:'mate',
    goal:'Checkmate with White. First bring your king close enough to cover the escape squares.',
  },
  {
    id:'pawn-promotion', title:'Escort a pawn to promotion', description:'Use your king to clear the path.',
    demo:'8/4P1k1/4K3/8/8/8/8/8 w - - 0 1',
    steps:[['e8=Q','The pawn reaches the last rank and becomes a queen. Black’s king is too far away to capture it.']],
    fen:'8/6k1/4K3/4P3/8/8/8/8 w - - 0 1', color:'w', objective:'promotion',
    goal:'Promote White’s pawn and keep the promoted piece safe through Stockfish’s reply.',
  },
  {
    id:'save-the-draw', title:'Save the draw', description:'Put your king in the pawn’s path.',
    demo:'8/8/8/4k3/8/2p5/3K4/8 w - - 0 1',
    steps:[['Kxc3','The king captures the pawn before it can promote. Two bare kings cannot deliver mate, so the game is drawn.']],
    fen:'8/8/8/8/8/4k3/2P5/7K b - - 0 1', color:'b', objective:'draw',
    goal:'Hold a draw with Black. Get your king in front of the pawn and look for a chance to capture it.',
  },
];

export function endgameExample(technique) {
  const chess = new Chess(technique.demo);
  return [{ fen:chess.fen(), note:technique.description }, ...technique.steps.map(([san,note]) => {
    const move = chess.move(san);
    return { fen:chess.fen(), move, note };
  })];
}

export function endgameStatus(technique, session) {
  const won = session.result === (technique.color === 'w' ? '1-0' : '0-1');
  const drawn = session.result === '1/2-1/2';
  const promotion = session.moves.find(move => move.promotion && move.color === technique.color);
  const reply = session.moves.find(move => move.before === promotion?.after);
  const promotedSafely = promotion && (won || reply && !(reply.captured && reply.to === promotion.to));
  const achieved = {
    mate:won,
    draw:drawn,
    promotion:promotedSafely && (!session.ending || won),
  };
  if (achieved[technique.objective]) return 'complete';
  if (session.ending) return 'retry';
  return 'playing';
}

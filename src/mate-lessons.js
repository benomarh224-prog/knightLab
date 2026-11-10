import puzzles from'./mate-puzzles.json'with{type:'json'};import{Chess}from'chess.js';
export const MATE_REFERENCE='24 original ROQVYN study positions. Every legal first move was tested with chess.js; each position has exactly one immediate checkmate. These are constructed exercises, not historical games or Stockfish rating estimates.';
const groups={'back-rank':'Back-rank mates','queen-net':'Queen and king',teamwork:'Piece teamwork'};
const names={q:'queen',r:'rook',b:'bishop',n:'knight'};
export function mateRecap(puzzle){
 const board=new Chess(puzzle.fen),side=board.turn(),enemy=board.board().flat().find(p=>p?.type==='k'&&p.color!==side),move=board.move({from:puzzle.solution.slice(0,2),to:puzzle.solution.slice(2,4),promotion:puzzle.solution[4]});
 if(!board.isCheckmate())throw Error('Invalid mate exercise: '+puzzle.id);
 const fact=`${move.san} gives checkmate. The ${names[move.piece]} moves from ${move.from} to ${move.to}${move.captured?' and captures the '+names[move.captured]:''}.`;
 if(puzzle.group==='back-rank')return fact+' The king’s pawns occupy its forward escape squares. The rook controls the back rank.';
 if(puzzle.group==='queen-net')return fact+' The queen gives check while the king supports the mating net. Check the escape squares before choosing a queen move.';
 const support=board.board().flat().find(p=>p?.color===side&&['b','n'].includes(p.type)),escape=enemy.square[0]+(side==='w'?'7':'2');
 return fact+` Your ${names[support.type]} on ${support.square} controls ${escape}, while the rook checks along the back rank.`;
}
export const MATE_LESSONS=puzzles.map(p=>({id:p.id,course:'Mate in One',title:({'back-rank':'Seal the back rank.','queen-net':'Build a queen net.',teamwork:'Let the pieces work together.'})[p.group],unit:groups[p.group],tag:groups[p.group],fen:p.fen,moves:[p.san],practiceColor:p.fen.split(' ')[1],
 subtitle:'Find a checkmate in one move. Check the king’s escape squares.',source:MATE_REFERENCE,takeaway:mateRecap(p),notes:[mateRecap(p)],
 concepts:[{title:'Check is not enough.',text:'A mating move checks the king and leaves no legal reply. Check whether the king can move, the checking piece can be captured, or the check can be blocked.'}],
 hints:['Look for a checking move that removes every legal reply.'],
 study:{title:({'back-rank':'Seal the back rank.','queen-net':'Build a queen net.',teamwork:'Let the pieces work together.'})[p.group],start:0,coach:'One move. No reply.',prompt:'Find a checkmate in one move. Check the king’s escape squares.',goals:['Find a legal immediate checkmate.',mateRecap(p)]}
}));

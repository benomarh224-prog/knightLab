import puzzles from'./mate-puzzles.json'with{type:'json'};import{Chess}from'chess.js';
export const MATE_REFERENCE=`${puzzles.length} original ROQVYN study positions. Every legal first move was tested with chess.js; each position has exactly one immediate checkmate. These are constructed exercises, not historical games or Stockfish rating estimates.`;
export const MATE_GROUPS={'back-rank':'Back-rank mates','queen-net':'Queen and king',teamwork:'Piece teamwork','pawn-mate':'Pawn finishes','bishop-mate':'Bishop finishes','knight-mate':'Knight nets','rook-net':'Rook and king','queen-capture':'Queen captures','promotion-mate':'Promotion finishes'};
const titles={'back-rank':'Seal the back rank.','queen-net':'Build a queen net.',teamwork:'Let the pieces work together.','pawn-mate':'Find the pawn check.','bishop-mate':'Finish on a diagonal.','knight-mate':'Jump into the mating net.','rook-net':'Close the last escape.','queen-capture':'Capture and give mate.','promotion-mate':'Choose the right promotion.'};
const names={q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn',k:'king'};
export function mateRecap(puzzle){
 const board=new Chess(puzzle.fen),side=board.turn(),enemy=board.board().flat().find(p=>p?.type==='k'&&p.color!==side),move=board.move({from:puzzle.solution.slice(0,2),to:puzzle.solution.slice(2,4),promotion:puzzle.solution[4]});
 if(!board.isCheckmate())throw Error('Invalid mate exercise: '+puzzle.id);
 const fact=`${move.san} gives checkmate. The ${names[move.piece]} moves from ${move.from} to ${move.to}${move.captured?' and captures the '+names[move.captured]:''}${move.promotion?' and promotes to a '+names[move.promotion]:''}.`;
 if(puzzle.group==='back-rank')return fact+' The king’s pawns occupy its forward escape squares. The rook controls the back rank.';
 if(puzzle.group==='queen-net')return fact+' The queen gives check while the king supports the mating net. Check the escape squares before choosing a queen move.';
 if(puzzle.group==='teamwork'){
  const support=board.board().flat().find(p=>p?.color===side&&['b','n'].includes(p.type)),escape=enemy.square[0]+(side==='w'?'7':'2');
  return fact+` Your ${names[support.type]} on ${support.square} controls ${escape}, while the rook checks along the back rank.`;
 }
 const idea={'pawn-mate':'Pawns give check diagonally. The bishop and king close the escape squares.','bishop-mate':'The bishop checks diagonally. The rook, knight and king cover the remaining exits.','knight-mate':'A knight check cannot be blocked. The king’s own pieces occupy its escape squares.','rook-net':'The rook checks along a straight line while your king restricts the other king.','queen-capture':'The capture gives check and removes the defending piece. Check every escape rather than capturing material alone.','promotion-mate':'Check every promotion choice. In this position only this promotion gives immediate checkmate.'}[puzzle.group];
 return fact+' '+idea+' The final position has no legal reply.';
}
export const MATE_LESSONS=puzzles.map(p=>({id:p.id,course:'Mate in One',title:titles[p.group],unit:MATE_GROUPS[p.group],tag:MATE_GROUPS[p.group],fen:p.fen,moves:[p.san],practiceColor:p.fen.split(' ')[1],
 subtitle:'Find a checkmate in one move. Check the king’s escape squares.',source:MATE_REFERENCE,takeaway:mateRecap(p),notes:[mateRecap(p)],
 concepts:[{title:'Check is not enough.',text:'A mating move checks the king and leaves no legal reply. Check whether the king can move, the checking piece can be captured, or the check can be blocked.'}],
 hints:['Look for a checking move that removes every legal reply.'],
 study:{title:titles[p.group],start:0,coach:'One move. No reply.',prompt:'Find a checkmate in one move. Check the king’s escape squares.',goals:['Find a legal immediate checkmate.',mateRecap(p)]}
}));

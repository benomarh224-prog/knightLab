import puzzles from './calculation-puzzles.json' with {type:'json'};
import {Chess} from 'chess.js';

export const CALCULATION_LEVELS={challenging:'Challenging',advanced:'Advanced',expert:'Expert'};
export const CALCULATION_GROUPS={
  deflection:{name:'Attraction & deflection',title:'Calculate the decoy.',idea:'A defender may have more than one job. Compare forcing moves that draw it away, and calculate the recapture.'},
  defenders:{name:'Removing defenders',title:'Break the defense.',idea:'Identify what protects the target. Calculate captures, interference and clearance before committing to an exchange.'},
  quiet:{name:'Quiet resources',title:'Find the quiet resource.',idea:'Do not stop after checking the forcing moves. Compare quiet moves that improve your position or restrict the opponent.'},
  forks:{name:'Double & discovered attacks',title:'Connect the threats.',idea:'Look for a move that changes two threats at once. Include discovered attacks and the opponent’s strongest reply in your calculation.'},
  pins:{name:'Pins, skewers & x-rays',title:'Read the line of attack.',idea:'Look along ranks, files and diagonals. Check what would become exposed if a blocking piece moved or were exchanged.'},
  sacrifice:{name:'Sacrifices & initiative',title:'Calculate the sacrifice.',idea:'A sacrifice needs a concrete continuation. Check the opponent’s captures and defensive resources before evaluating the result.'},
  mate:{name:'Long mating attacks',title:'Complete the mating attack.',idea:'Calculate the king’s escape squares after each check. A checking sequence must also survive captures and blocks.'},
  promotion:{name:'Promotion races',title:'Calculate the pawn race.',idea:'Count moves to promotion and check forcing replies on every turn. Consider checks, captures and underpromotion when relevant.'},
  endgame:{name:'Endgame calculation',title:'Find the endgame resource.',idea:'Calculate precisely with the remaining pieces. Check king activity, pawn races and tactical replies rather than counting material alone.'},
  defense:{name:'Defensive resources',title:'Find the defensive resource.',idea:'Identify the opponent’s immediate threat. Compare active defenses and exchanges, then check that the resulting position holds together.'},
};
export const CALCULATION_REFERENCE=`${puzzles.length} distinct real-game puzzles from the Lichess puzzle database (CC0, export dated 9 November 2026). Source puzzle ratings ${Math.min(...puzzles.map(p=>p.rating))}–${Math.max(...puzzles.map(p=>p.rating))}; these are puzzle ratings, not player ratings. Lichess supplies the selected solution lines. ROQVYN additionally checked legality, the first move and the final position with Stockfish 19 lite single; achieved starting-position depths ${Math.min(...puzzles.map(p=>p.verification.root.depth))}–${Math.max(...puzzles.map(p=>p.verification.root.depth))}.`;
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const side=color=>color==='w'?'White':'Black';

function makeLesson(puzzle){
  const group=CALCULATION_GROUPS[puzzle.group],board=new Chess(puzzle.fen),solver=board.turn();
  const moves=puzzle.moves.map(san=>board.move(san)),decisions=moves.filter(move=>move.color===solver).length;
  const instruction=`${side(solver)} to move. Find ${decisions} of your moves against the selected replies.`;
  const notes=moves.map(move=>`${move.color===solver?'Your move':'Opponent’s reply'}: ${move.san}. ${side(move.color)} ${move.captured?'captures the '+names[move.captured]+' on '+move.to:'moves the '+names[move.piece]+' from '+move.from+' to '+move.to}${move.promotion?', promoting to a '+names[move.promotion]:''}${move.san.endsWith('#')?', giving checkmate':move.san.endsWith('+')?', giving check':''}.`);
  const finish=puzzle.verification.finish;
  const outcome=board.isCheckmate()?`The selected line ends in checkmate after ${decisions} of your moves.`:finish.mate?`At the end of this line, Stockfish still finds a forced mate for ${side(finish.mate>0?'w':'b')} (depth ${finish.depth}).`:`The final position was checked at depth ${finish.depth}. Replay the exchanges and compare the resulting position with the start.`;
  const recap=`${group.idea} ${outcome}`;
  return {id:puzzle.id,course:'Calculation Lab',title:group.title,unit:group.name,level:puzzle.level,tag:CALCULATION_LEVELS[puzzle.level],fen:puzzle.fen,moves:puzzle.moves,practiceColor:solver,
    subtitle:instruction,source:`Lichess puzzle ${puzzle.puzzleId} · Puzzle rating ${puzzle.rating} · https://lichess.org/training/${puzzle.puzzleId} · Game: ${puzzle.gameUrl}. ${CALCULATION_REFERENCE}`,
    takeaway:recap,notes,hints:[group.idea],concepts:[{title:group.title,text:group.idea}],
    study:{title:group.title,start:0,coach:group.title,prompt:instruction,goals:[`Calculate all ${decisions} of your moves.`,recap]},
    puzzle:{id:puzzle.puzzleId,rating:puzzle.rating,decisions,group:puzzle.group,url:`https://lichess.org/training/${puzzle.puzzleId}`},
  };
}
export const CALCULATION_LESSONS=puzzles.map(makeLesson);

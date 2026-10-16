import positions from './tactical-positions.json' with {type:'json'};
export const TACTICAL_REFERENCE='Exercises adapted from the provided Improve Your Tactical Vision by Niclas Huschenbeth. ROQVYN explanations are original. Lines follow selected published continuations; replies are study examples, not a claim that every response is forced or uniquely best.';
export const TACTICAL_LEVELS=['beginner','intermediate','advanced'];
export const levelName=value=>value.charAt(0).toUpperCase()+value.slice(1);
const pieceNames={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
function explain(move){
  const side=move.color==='w'?'White':'Black';
  const action=move.isKingsideCastle()?'castles kingside':move.isQueensideCastle()?'castles queenside':`moves the ${pieceNames[move.piece]} from ${move.from} to ${move.to}`;
  const capture=move.captured?` and captures ${move.captured==='p'?'a pawn':`the ${pieceNames[move.captured]}`}`:'';
  const promotion=move.promotion?`, promoting to a ${pieceNames[move.promotion]}`:'';
  const check=move.san.includes('#')?' This is checkmate.':move.san.includes('+')?' This gives check, so the king’s safety must be addressed.':'';
  return `${move.san}: ${side} ${action}${capture}${promotion}.${check} Compare this selected continuation with the position before the move.`;
}
export const TACTICAL_LESSONS=positions.map(position=>{
  const level=levelName(position.level),number=String(position.number).padStart(2,'0'),side=position.fen.split(' ')[1],sideName=side==='w'?'White':'Black';
  return {...position,course:'Tactical Vision',practiceColor:side,title:`${level} exercise ${number}`,tag:level,
    subtitle:`You play ${sideName}. Calculate the idea before moving.`,
    notes:moves=>moves.map(explain),
    source:`${level} exercise ${position.number}; PDF diagram page ${position.page}, solution page ${position.solutionPage}`,
    takeaway:'Check the material and the opponent’s threats. Compare forcing candidates, calculate the replies, assess the result, then check your line once more before committing.',
    study:{title:`${level} · Exercise ${number}.`,start:0,coach:'Find the forcing idea.',prompt:`You play ${sideName}. Check the opponent’s threats, then compare checks, captures, and direct attacks.`,goals:['Compare checks, captures, and direct threats','Calculate an opponent’s reply before moving']},
  };
});

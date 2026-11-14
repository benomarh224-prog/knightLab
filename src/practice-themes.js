import { Chess } from 'chess.js';
import { tacticalFact } from './tactical-facts.js';

const groups = {
  mate: {
    label:'Mate in one',
    prompt:'Find a checkmate in one move.',
    explanation:'Cover the escape squares, then check with the rook. The king has no legal reply.',
    positions:[
      ['8/8/8/8/8/2K5/R7/2k5 w - - 0 1','a2a1'],
      ['8/8/8/8/8/5K2/7R/5k2 w - - 0 1','h2h1'],
    ],
  },
  fork: {
    label:'Checking knight fork',
    prompt:'Use a knight check to attack the king and a major piece at the same time.',
    explanation:'The knight checks and attacks a second piece. The king must answer the check before the knight can take its other target.',
    positions:[
      ['8/8/7k/8/3N3q/8/1P6/K7 w - - 0 1','d4f5'],
      ['7k/6p1/8/R3n3/8/K7/8/8 b - - 0 1','e5c4'],
    ],
  },
  capture: {
    label:'Undefended major pieces',
    prompt:'Capture an undefended rook or queen.',
    explanation:'Check whether the opponent can recapture on the landing square before you take the piece.',
    positions:[
      ['7k/8/8/4r3/8/2B5/8/7K w - - 0 1','c3e5'],
      ['7k/8/8/3q4/8/8/3R3K/8 w - - 0 1','d2d5'],
    ],
  },
  promotion: {
    label:'Safe queen promotion',
    prompt:'Promote the pawn to a queen and check that it cannot be captured.',
    explanation:'The pawn reaches the last rank. Check the position after promotion to make sure your new queen survives.',
    positions:[
      ['8/3P3k/3K4/8/8/8/8/8 w - - 0 1','d7d8q'],
      ['8/4P1k1/4K3/8/8/8/8/8 w - - 0 1','e7e8q'],
    ],
  },
};

const uciPattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
export function practiceTheme(fen, solution) {
  if (!uciPattern.test(solution)) return null;
  try {
    const board = new Chess(fen);
    const move = board.move({ from:solution.slice(0,2), to:solution.slice(2,4), promotion:solution[4] });
    if (board.isCheckmate()) return 'mate';
    const capturable = board.moves({ verbose:true }).some(reply=>reply.captured && reply.to === move.to);
    if (move.promotion === 'q' && !board.isGameOver() && !capturable) return 'promotion';
    if (move.piece === 'n' && board.isCheck() && tacticalFact(move)?.kind === 'fork') {
      const forcesCapture = board.moves({ verbose:true }).every(reply => {
        board.move(reply.san);
        const targetsMajor = board.moves({ square:move.to, verbose:true }).some(next=>['q','r'].includes(next.captured));
        board.undo();
        return targetsMajor;
      });
      if (forcesCapture) return 'fork';
    }
    return ['q','r'].includes(move.captured) && !capturable ? 'capture' : null;
  } catch { return null; }
}

const positionKey = fen => fen?.split(' ').slice(0,4).join(' ');
export function relatedPractice(theme, exclude = '') {
  if (!Object.hasOwn(groups,theme)) return null;
  const group = groups[theme];
  const pair = group.positions.find(([fen,solution]) => positionKey(fen) !== positionKey(exclude) && practiceTheme(fen,solution) === theme);
  if (!pair) return null;
  const [fen,solution] = pair;
  const board = new Chess(fen), color = board.turn();
  const move = board.move({ from:solution.slice(0,2), to:solution.slice(2,4), promotion:solution[4] });
  return { fen, color, solution, bestSAN:move.san, moveNumber:'1', source:'followup',
    theme, title:group.label, prompt:group.prompt, reviewNote:group.explanation };
}

export function practiceThemeLabel(theme) {
  return Object.hasOwn(groups,theme) ? groups[theme].label : null;
}

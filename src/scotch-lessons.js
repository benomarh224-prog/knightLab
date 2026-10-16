// Selected continuations from the user-supplied public-domain booklet.
// Teaching text and questions are original Knightlab adaptations. Sample replies
// illustrate plans; they are neither forced nor claims of engine-best play.
export const SCOTCH_REFERENCE='Based on Dr. David Regis, Four opening systems to start with, Exeter Chess Club, summary edition, printed pp. 6–9 and 43, supplied as Scotch Gambit Opening Repertoire. The booklet identifies itself as public domain. Knightlab explanations and questions are original adaptations. Historical examples illustrate ideas and may include inaccurate replies; other legal moves can also be good.';
const base=['e4','e5','Nf3','Nc6','d4','exd4','Bc4'];
const accepted=[...base,'Bc5','c3','dxc3'];
const forcing=[...accepted,'Bxf7+','Kxf7','Qd5+','Kf8','Qxc5+','Qe7','Qxc3','Qxe4+','Be3','d6','O-O'];
const develop=[...accepted,'Nxc3','d6','Bg5','f6','Bh4','Nh6','O-O'];
const space=[...base,'Bc5','c3','Nf6','e5','Qe7','O-O','Ng8','cxd4','Bb6','d5'];
const rook=[...base,'Bc5','c3','Nf6','O-O','Nxe4','cxd4','Be7','d5','Nb8','Re1'];
const declined=[...base,'Bc5','c3','d3','b4','Bb6','Qb3','Qf6','O-O'];
const bishopCheck=[...base,'Bb4+','c3','dxc3','O-O','Qf6','e5','Qe7','a3','cxb2','Bxb2','Bc5','Nc3','d6','Nd5','Qd8','exd6','Bxd6','Bxg7','Bg4','Re1+','Nge7','Nf6#'];
const twoKnights=[...base,'Nf6','O-O','Nxe4','Re1','d5','Bxd5','Qxd5','Nc3','Qa5','Nxe4','Be6','Bd2'];
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const common=[
  'White takes space in the center and opens the f1-bishop’s diagonal.',
  'Black claims central space in reply.',
  'The knight develops toward the center and attacks e5.',
  'Black develops the knight and defends e5.',
  'The d-pawn challenges e5 and opens central lines.',
  'Black exchanges the e-pawn for White’s d-pawn.',
  'The bishop develops to c4 instead of immediately recovering the pawn. This is the Scotch Gambit.',
];
function describe(move){
  const side=move.color==='w'?'White':'Black';
  if(move.isKingsideCastle())return `${side} castles kingside. The king leaves the center and the rook comes to f${move.color==='w'?'1':'8'}.`;
  return `${side} ${move.captured?`captures the ${names[move.captured]} on ${move.to} with the ${names[move.piece]}`:`moves the ${names[move.piece]} from ${move.from} to ${move.to}`}.${move.san.includes('#')?' This is checkmate.':move.san.includes('+')?' The move gives check.':''}`;
}
function lesson({id,title,unit,moves,start,pages,coach,prompt,intro,rules,takeaway,focus={},question,options,answer,explanation}){
  return {id,title,unit,tag:unit,course:'Scotch Gambit',practiceColor:'w',moves,subtitle:prompt,takeaway,
    source:`David Regis, Four opening systems to start with, printed ${pages}`,
    notes:verbose=>verbose.map((move,i)=>focus[i+1]||(i<7?common[i]:describe(move))),
    guide:{intro,rules},quiz:{question,options,answer,explanation},
    study:{title,start,coach,prompt,goals:rules}};
}
const foundations='1 · The gambit idea',plans='2 · Development & the center',replies='3 · Meet Black’s replies';
export const SCOTCH_LESSONS=[
  lesson({id:'scotch-first-moves',title:'Meet the Scotch Gambit.',unit:foundations,moves:base,start:4,pages:'p. 8',
    coach:'Open the center, then develop.',prompt:'You play White. Challenge e5 with your d-pawn, then develop the bishop toward f7 after Black captures.',
    intro:['The Scotch Gambit begins 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4. White prioritizes development over an immediate pawn recapture.','The bishop on c4 points toward f7. That gives you a direction for your play, but an attack still needs enough active pieces.'],
    rules:['Challenge the center with d4','Develop Bc4 before deciding how to recover the pawn'],
    takeaway:'The extra pawn is a cost you accept for activity. Develop quickly, keep your king safe, and calculate before sacrificing more.',
    question:'Which move defines the Scotch Gambit after 3…exd4?',options:['4.Bc4, developing the bishop','4.Qxd4, recovering the pawn with the queen','4.a3, waiting on the queenside'],answer:0,
    explanation:'Bc4 develops with pressure toward f7 while temporarily leaving Black’s pawn on d4.'}),
  lesson({id:'scotch-c3-break',title:'Offer a pawn for open lines.',unit:foundations,moves:accepted,start:8,pages:'p. 8',
    coach:'Challenge the advanced pawn.',prompt:'Black has developed …Bc5. Play the c-pawn move that challenges d4 and opens the b1-knight’s route to c3.',
    intro:['After 4…Bc5, the move 5.c3 challenges the pawn on d4. If Black captures, White can develop a knight with the recapture.','Black can also decline the offer or develop with …Nf6. The lesson follows …dxc3 so you can understand what the gambit changes.'],
    rules:['Use c3 to challenge d4','Compare development with the material you give up'],
    focus:{9:'The c-pawn challenges d4. After …dxc3, the b1-knight can recapture on c3 and develop.',10:'Black accepts the c-pawn. White now has a choice between developing with Nxc3 and a forcing Bxf7+ continuation.'},
    takeaway:'A gambit needs a concrete benefit such as development or open lines. Giving up a pawn alone does not create a winning attack.',
    question:'What is one point of c3 after …Bc5?',options:['It immediately checkmates Black','It challenges d4 and prepares a developing recapture','It forces Black to move the queen'],answer:1,
    explanation:'If Black plays …dxc3, Nxc3 develops the queenside knight while removing that pawn.'}),
  lesson({id:'scotch-check-and-recover',title:'Use checks to recover material.',unit:foundations,moves:forcing.slice(0,15),start:10,pages:'pp. 8–9',
    coach:'Calculate the checks before capturing.',prompt:'After …dxc3, try the bishop check on f7. Follow the sample king replies, then use your queen to capture the bishop on c5 with check.',
    intro:['Bxf7+ offers the bishop temporarily. If Black accepts with …Kxf7, Qd5+ attacks the king and the bishop on c5.','This exercise follows Harding–Dashkevich. The sample king reply is part of the study line, not a claim that every defense is forced.'],
    rules:['Look for a check that also attacks another target','Calculate the opponent’s replies before a sacrifice'],
    focus:{11:'Bxf7+ removes the f7-pawn and checks the king. Calculate the queen follow-up before offering the bishop.',12:'The sample accepts with …Kxf7. Black has lost castling rights, but White still needs a concrete continuation.',13:'Qd5+ checks the king on f7 and attacks the bishop on c5.',14:'The king retreats to f8 in the example. Other legal defenses are not evaluated by this exercise.',15:'Qxc5+ recovers the bishop with check. White has exchanged bishops and disturbed Black’s king.'},
    takeaway:'A useful forcing move can attack two targets. Check the whole continuation instead of assuming a sacrifice works because it gives check.',
    question:'What does Qd5+ attack after Bxf7+ Kxf7?',options:['Only the pawn on b7','The king on f7 and bishop on c5','Both rooks'],answer:1,
    explanation:'The queen checks along d5–e6–f7 and attacks the bishop one square away on c5.'}),
  lesson({id:'scotch-knight-development',title:'Choose development over an immediate refund.',unit:plans,moves:develop,start:10,pages:'pp. 8–9',
    coach:'Develop, then secure the king.',prompt:'Use the b1-knight to recapture on c3. In this sample line, develop the c1-bishop, retreat it when attacked, and castle.',
    intro:['Nxc3 removes Black’s advanced pawn and develops your second knight. White remains a pawn down, so active development matters.','The sample continues …d6, Bg5, …f6, Bh4, …Nh6 and O-O. These moves illustrate development and king safety rather than a forced win.'],
    rules:['Recapture with a developing piece when it fits the position','Respond to attacks on your pieces and prepare castling'],
    focus:{11:'Nxc3 brings the queenside knight into play and removes the pawn on c3.',13:'Bg5 develops the last bishop and attacks the queen along g5–f6–e7–d8.',14:'…f6 blocks the bishop’s line and attacks it.',15:'Bh4 saves the bishop while keeping it active.',17:'Castling gets the king out of the center. White has developed both knights and both bishops.'},
    takeaway:'Compensation for a pawn is something you must use. Finish development and keep looking at the opponent’s threats.',
    question:'After Nxc3 in the accepted gambit, what should White remember?',options:['The attack wins automatically','White may ignore king safety','White is a pawn down and must use the active development'],answer:2,
    explanation:'Nxc3 develops a piece, but it does not recover every pawn White has invested.'}),
  lesson({id:'scotch-central-space',title:'Gain space with a threat.',unit:plans,moves:space,start:10,pages:'p. 6, Morphy–Cunningham',
    coach:'Attack the knight with your central pawn.',prompt:'Black has played …Nf6. Advance e4 with a threat, castle in the sample continuation, then build your center with cxd4 and d5.',
    intro:['When Black develops …Nf6, e5 gains space and attacks that knight. The position can also be reached through an Italian move order.','Morphy’s example shows a central pawn advance supporting development. Black’s queen move and knight retreat are illustrative replies, not unavoidable consequences.'],
    rules:['Make central advances with a concrete purpose','Keep development and king safety alongside your space advantage'],
    focus:{11:'e5 attacks the knight on f6 and gains central space.',13:'White castles instead of spending another turn moving an undeveloped piece twice.',15:'cxd4 removes Black’s advanced pawn and creates connected pawns on d4 and e5.',17:'d5 gains more space and attacks the knight on c6.'},
    takeaway:'Central space is useful when it limits enemy pieces and supports your own development. Do not neglect your king while advancing pawns.',
    question:'What immediate threat does e5 create against a knight on f6?',options:['The pawn attacks the knight','The pawn attacks the rook on a8','The pawn gives check to the king on e8'],answer:0,
    explanation:'A White pawn on e5 attacks d6 and f6, so the f6-knight is attacked.'}),
  lesson({id:'scotch-castle-and-rook',title:'Bring the rook into the game.',unit:plans,moves:rook,start:10,pages:'p. 6, Stein–Langeweg',
    coach:'Connect king safety with activity.',prompt:'Castle first. After the sample capture on e4, recapture on d4, advance d5 against the knight, and bring the rook to e1.',
    intro:['Castling also activates a rook. In open positions, that rook may be useful on a central file.','In Stein–Langeweg, …Nxe4 leads to a sharp continuation. Follow the selected line to see how cxd4, d5 and Re1 work together; Black has alternatives.'],
    rules:['Use castling to connect king safety and rook activity','Recheck open files after central pawn exchanges'],
    focus:{11:'Castling places the king on g1 and rook on f1.',13:'cxd4 removes the d4-pawn while restoring a central pawn.',15:'d5 attacks the c6-knight. The sample retreats it to b8.',17:'Re1 pressures the knight on e4 along the open e-file. The bishop on e7 also stands between that knight and Black’s king, so the knight is not absolutely pinned.'},
    takeaway:'A gambit attack needs pieces joining the action. Castling and a central rook can matter more than another speculative sacrifice.',
    question:'Which central file does White’s rook use after Re1?',options:['The b-file','The e-file','The g-file'],answer:1,
    explanation:'The rook on e1 pressures the knight on e4. Black’s bishop on e7 is another blocker before the king on e8.'}),
  lesson({id:'scotch-gambit-declined',title:'Keep a plan when the offer is declined.',unit:replies,moves:declined,start:10,pages:'p. 9, Sveshnikov–Petrosian',
    coach:'Develop with threats, then castle.',prompt:'Black pushed the pawn to d3 instead of capturing c3. In this sample, gain time on the bishop with b4, develop the queen to b3, then castle.',
    intro:['Black can decline the c3 offer with …d3. White should reassess the position rather than keep trying to play the accepted line.','The selected game uses b4 to attack the bishop, followed by Qb3 to develop the queen and reinforce the c4-bishop. These are sample plans, not a forced sequence for Black.'],
    rules:['Recognize when the pawn structure changes','Recalculate threats instead of following a memorized branch'],
    focus:{11:'b4 attacks the bishop on c5 and gains queenside space.',13:'Qb3 reinforces the bishop on c4. The queen shares its diagonal toward f7, but the bishop currently blocks the queen’s own line.',15:'Castling safeguards the king before further play. The black pawn on d3 still needs attention.'},
    takeaway:'A repertoire should teach decisions as well as moves. When the gambit is declined, identify the new targets and continue developing.',
    question:'After …d3, should you assume Black’s pawn is still on c3?',options:['Yes, every gambit has the same structure','No, reassess the new pawn placement','Ignore all pawn moves'],answer:1,
    explanation:'The pawn stayed on the d-file. The structure differs from …dxc3, so White’s plans and captures must be checked again.'}),
  lesson({id:'scotch-bishop-check',title:'Answer the early bishop check.',unit:replies,moves:bishopCheck.slice(0,17),start:8,pages:'p. 9, Staunton–Brodie',
    coach:'Block the check and prepare king safety.',prompt:'Black checked with …Bb4+. Block with c3. Follow the historical example: castle, attack the queen with e5, then challenge the bishop with a3.',
    intro:['Against 4…Bb4+, c3 blocks the diagonal to your king. If Black captures on c3, White can consider castling once the check has ended.','Staunton–Brodie is a tactical example with cooperative replies. Its attacking finish does not mean every early bishop check loses by force.'],
    rules:['Resolve a check before continuing your plan','Verify the king’s path is safe before castling'],
    focus:{9:'c3 interrupts the b4–c3–d2–e1 checking diagonal.',10:'…dxc3 removes the blocker, but the black pawn on c3 now blocks its own bishop’s checking line.',11:'White can castle: the king is no longer in check and the castling squares are safe in this position.',13:'e5 attacks the queen on f6 and gains time.',15:'a3 attacks the bishop on b4. The sample continues with Black capturing the b2-pawn.',17:'Bxb2 captures the advanced pawn and develops the c1-bishop onto the long diagonal.'},
    takeaway:'Answer a check concretely. A changed blocker can make castling legal, but you must check attacks on the king’s route every time.',
    question:'Why can White castle after c3 dxc3 in this exact position?',options:['Castling is allowed while in check','The pawn on c3 blocks Black’s bishop, and the king’s route is safe','The bishop on b4 has disappeared'],answer:1,
    explanation:'Black’s own pawn on c3 blocks the checking diagonal. White must still satisfy all the usual castling rules.'}),
  lesson({id:'scotch-forcing-finish',title:'Coordinate the rook and knight.',unit:replies,moves:bishopCheck,start:24,pages:'p. 9, Staunton–Brodie',
    coach:'Follow the checking line to the finish.',prompt:'In the historical game, capture g7 with the bishop. After Black’s sample reply, bring the rook to e1 with check, then find the knight mate.',
    intro:['An attack succeeds when the pieces work together. Here the bishop on g7 controls f8, while the rook on e1 controls the e-file.','This exercise starts late in the Staunton–Brodie example. It demonstrates a specific mating pattern, not the expected outcome of every Scotch Gambit.'],
    rules:['Check how each piece covers the king’s escape squares','Calculate the reply to your first check before choosing it'],
    focus:{25:'Bxg7 captures the g7-pawn. From g7 the bishop controls f8.',27:'Re1+ checks along the open e-file. The sample blocks with …Nge7.',28:'The knight from g8 blocks on e7. It is pinned to the king by the rook on e1.',29:'Nf6# checks the king on e8. The e7-knight cannot capture because moving it would expose the rook’s check; the bishop on g7 covers f8.'},
    takeaway:'Look beyond the checking piece. Pins and escape-square control often explain why the final check is mate.',
    question:'Why can the knight on e7 not capture the mating knight on f6?',options:['Knights cannot capture knights','It is pinned to the king by the rook on e1','It has already moved once'],answer:1,
    explanation:'Moving the e7-knight would expose Black’s king on e8 to the rook on e1, so that capture is illegal.'}),
  lesson({id:'scotch-two-knights',title:'Respect the counterplay after …Nf6.',unit:replies,moves:twoKnights,start:16,pages:'p. 7 and p. 9',
    coach:'Recover the knight, then develop safely.',prompt:'Black’s queen has retreated to a5. Recover the knight on e4, then develop your bishop to d2 after …Be6 instead of grabbing the pawn on d4.',
    intro:['After 4…Nf6, the opening can transpose into a Two Knights position. Learn the new threats rather than assuming the …Bc5 branch still applies.','The supplied example warns against Nxd4 after …Be6: …Nxd4 captures that knight, while an automatic Qxd4 would allow …Qxe1 mate. The booklet suggests Bd2 instead.'],
    rules:['Check your opponent’s threats before another capture','Use development to avoid tactical traps'],
    focus:{17:'Nxe4 captures Black’s advanced knight. White has recovered a piece, but must keep calculating.',18:'…Be6 develops the bishop. The pawn on d4 is tempting, but a careless knight capture can expose tactical problems.',19:'Bd2 develops the c1-bishop. The bishop attacks the queen on a5 along d2–c3–b4–a5 and helps White avoid the sample Nxd4 tactic.'},
    takeaway:'Gambit play requires thinking for both sides. A tempting pawn is less important than your king’s safety and the opponent’s mating threats.',
    question:'After …Be6, what is the practical lesson of the booklet’s Nxd4 warning?',options:['Collect every available pawn','Stop checking the opponent’s threats','Check tactical replies and finish development'],answer:2,
    explanation:'Moving the f3-knight to d4 removes a defender of e1. After …Nxd4, an automatic Qxd4 allows …Qxe1 mate.'}),
];

// Selected lines from the supplied First Steps: 1 e4 e5 excerpt by John Emms.
// ROQVYN's prompts and explanations are original. These are study examples,
// including deliberately weak replies, rather than a forced opening repertoire.
export const OPEN_GAMES_REFERENCE='Based on the supplied First Steps: 1 e4 e5 excerpt by John Emms (Everyman Chess), printed pages 6–21. ROQVYN teaching text is original. Selected examples include weaker replies to illustrate ideas; other legal moves may also be good. This course covers the supplied introduction and Italian Game extract, not the full book.';
const italian=['e4','e5','Nf3','Nc6','Bc4','Bc5','d3','Nf6'];
const queenAttack=['e4','e5','Qh5','Nc6','Bc4','g6','Qf3','Nf6','g4','Nd4','Qd1','d5','exd5','Bxg4','Ne2','Nf3+','Kf1','Bh3#'];
const f7Exchange=[...italian,'Ng5','O-O','Nxf7','Rxf7','Bxf7+','Kxf7'];
const kingAttack=[...f7Exchange,'O-O','d6','Nc3','Bg4','Qe1','Nd4','Qd2','Qd7','Re1','Bh3','b3','Bxg2','Kxg2','Qg4+','Kf1','Qh3+','Kg1','Nf3+','Kh1','Qxh2#'];
const pinLine=[...italian,'Nc3','d6','O-O','Bg4','Bg5','Nd4','Nd5','c6','Nxf6+','gxf6','Bh4','Nxf3+','gxf3','Bh3','Re1','Rg8+'];
const deflection=[...pinLine,'Bg3','h5','Kh1','h4','Bxh4','Bg2+','Kg1','Bxf3+'];
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const common={
  e4:'White takes central space and opens a diagonal for the f1-bishop.',
  e5:'Black matches the central claim and opens the f8-bishop’s diagonal.',
  Nf3:'White develops a knight while attacking the pawn on e5.',
  Nc6:'Black develops a knight and adds a defender to e5.',
  Bc4:'White activates the bishop on the diagonal toward f7.',
  Bc5:'Black activates the bishop before placing the g8-knight on f6.',
  d3:'White reinforces e4 and clears a path for the c1-bishop.',
  Nf6:'Black brings another piece toward the center and attacks e4.',
};
function describe(move){
  const side=move.color==='w'?'White':'Black';
  if(move.isKingsideCastle())return `${side} castles kingside, moving the king and rook in one turn.`;
  const action=move.captured?`captures the ${names[move.captured]} on ${move.to} with the ${names[move.piece]}`:`moves the ${names[move.piece]} from ${move.from} to ${move.to}`;
  return `${side} ${action}.${move.san.includes('#')?' This is checkmate.':move.san.includes('+')?' The move gives check.':''}`;
}
function lesson({id,title,tag,pages,moves,start,coach,prompt,goals,takeaway,focus={},color='b'}){
  return {id,title,tag,moves,course:'Italian Game',practiceColor:color,
    subtitle:prompt,source:`John Emms, First Steps: 1 e4 e5; printed ${pages}`,
    notes:verbose=>verbose.map((move,index)=>focus[index+1]||((index<8&&common[move.san])?common[move.san]:describe(move))),
    takeaway,study:{title,start,coach,prompt,goals}};
}
export const OPEN_GAMES_LESSONS=[
  lesson({id:'italian-development',title:'Develop with a threat.',tag:'Italian Game',pages:'pp. 11–12',moves:italian.slice(0,5),start:2,color:'w',
    coach:'Bring your pieces into play.',prompt:'You play White. Develop the kingside knight with a threat, then choose an active square for the bishop.',
    goals:['Develop while attacking a central pawn','Recognize the Italian bishop on c4'],
    takeaway:'Start with central space and useful development. The Italian setup brings the knight and bishop into play without exposing the queen.'}),
  lesson({id:'stop-scholar-mate',title:'Stop the early mate.',tag:'Defend actively',pages:'pp. 7–8',moves:queenAttack.slice(0,8),start:5,
    coach:'Defend and gain time.',prompt:'White’s queen and bishop both point at f7. Find a pawn move that interrupts the queen’s diagonal and attacks her.',
    goals:['Recognize the queen-and-bishop attack on f7','Answer threats with moves that also develop or gain time'],
    focus:{6:'The g-pawn blocks the h5–f7 diagonal and attacks the queen on h5.',7:'White keeps the queen aimed at f7 from f3.',8:'The knight develops to f6 and interrupts the queen’s route along the f-file.'},
    takeaway:'Deal with the immediate threat, then develop. A move can protect your king and improve your position at the same time.'}),
  lesson({id:'queen-tempos',title:'Turn defense into activity.',tag:'Development & threats',pages:'pp. 8–9',moves:queenAttack.slice(0,14),start:9,
    coach:'Attack the exposed queen.',prompt:'White has played g4 instead of developing. Find a knight move that attacks the queen on f3 and threatens a fork on c2.',
    goals:['Use an advanced knight to create two threats','Open a bishop’s diagonal with a central pawn move'],
    focus:{10:'The knight on d4 attacks the queen on f3 and threatens to capture on c2 with check, forking king and rook.',11:'The queen returns to d1 and protects c2. White has spent several turns moving the same piece.',12:'The d-pawn attacks the c4-bishop and opens the c8-bishop’s diagonal toward g4.',13:'White captures the d5-pawn, but the newly opened bishop diagonal remains.',14:'The bishop captures on g4, develops, and attacks the queen on d1 along g4–f3–e2–d1.'},
    takeaway:'When your opponent loses time with the queen, look for development with threats. Check what a pawn move uncovers behind it.'}),
  lesson({id:'bishop-knight-mate',title:'Finish with two pieces.',tag:'Mate in two',pages:'pp. 9–10',moves:queenAttack,start:15,
    coach:'Calculate the checks.',prompt:'You play Black. White blocked your bishop with Ne2. Find a knight check, calculate the king’s reply, then finish with the bishop.',
    goals:['Calculate a two-move mating sequence','Coordinate a bishop and knight around the king'],
    focus:{16:'The knight jumps to f3 with check. The white king must move to f1 in this position.',17:'The king steps to f1; now check the diagonal leading toward that square.',18:'The bishop goes to h3 and checks along h3–g2–f1. White has no legal escape or block: checkmate.'},
    takeaway:'Do not stop calculating after the first check. Picture the forced reply and test whether your other pieces can deliver the finish.'}),
  lesson({id:'bishop-first',title:'Bishop first, then knight.',tag:'Italian move order',pages:'pp. 12–13',moves:italian,start:5,
    coach:'Choose your development order.',prompt:'You play Black in the Italian Game. Bring the f8-bishop to an active square before developing the g8-knight.',
    goals:['Recognize the …Bc5 Italian setup','Connect development order with control of g5'],
    focus:{6:'The bishop develops to c5. With the knight still on g8, the queen on d8 can reach g5 along the diagonal.',7:'White supports the center with d3 and opens the c1-bishop’s diagonal.',8:'Black now develops the knight to f6. The f8-square is clear, so kingside castling is available.'},
    takeaway:'Move order matters. In this Italian setup, developing the bishop first prepares castling before White’s knight attack on f7.'}),
  lesson({id:'castle-against-ng5',title:'Castle against the f7 attack.',tag:'King safety',pages:'p. 14',moves:f7Exchange,start:9,
    coach:'Bring the rook to the defense.',prompt:'White’s knight has reached g5 and joins the bishop’s attack on f7. Find the king-safety move that also adds a defender.',
    goals:['Use castling to defend f7 with the rook','Compare piece activity after an exchange'],
    focus:{10:'Castling places the rook on f8, where it defends f7. Black meets the threat while moving the king to safety.',11:'White captures on f7. This sample continues with the exchange; White is not forced to make it.',12:'The rook captures the knight on f7.',13:'The bishop captures the rook with check.',14:'The king recaptures the bishop. White traded two active minor pieces for a rook and pawn; Black still has all four minor pieces.'},
    takeaway:'Count the pieces and judge their activity. A rook and pawn do not automatically compensate for two minor pieces in an opening position.'}),
  lesson({id:'open-king-lines',title:'Open lines toward the king.',tag:'Forcing continuation',pages:'pp. 16–17',moves:kingAttack,start:25,
    coach:'Calculate the bishop sacrifice.',prompt:'In this sample game, White missed the threat after …Bh3. Calculate the capture on g2 and the checks that follow the king’s recapture.',
    goals:['Trace open queen and bishop diagonals','Follow checks through to a mating position'],
    focus:{26:'The bishop takes the pawn on g2, removing part of White’s king shelter. This lesson follows the sample king recapture.',27:'The king accepts the bishop. This is the published example, not a claim that every reply must be this move.',28:'The queen comes to g4 with check along the g-file.',29:'The king retreats to f1.',30:'The queen checks from h3 along h3–g2–f1.',31:'The king returns to g1.',32:'The knight checks from f3 and supports the queen’s approach to h2.',33:'The king moves into the corner.',34:'The queen captures on h2 with mate. The knight on f3 protects h2, preventing the king from capturing the queen.'},
    takeaway:'Check how attackers support one another. Here the knight both gives check and protects the square where the queen delivers mate.'}),
  lesson({id:'pressure-the-pin',title:'Add pressure to the pin.',tag:'Relative pin',pages:'pp. 17–19',moves:pinLine.slice(0,14),start:11,
    coach:'Pin the defender, then attack it.',prompt:'White has castled. Pin the f3-knight to the queen, then bring another attacker onto that knight after White’s reply.',
    goals:['Identify a knight pinned to its queen','Use a second attacker against a pinned piece'],
    focus:{12:'The bishop pins the f3-knight to the queen on d1 along g4–f3–e2–d1.',13:'White mirrors the bishop development, pinning the f6-knight to the queen.',14:'The c6-knight jumps to d4 and adds another attack on f3. The lesson illustrates why White should consider the pin before copying Black’s moves.'},
    takeaway:'A pin becomes more useful when you add pressure to its target. Check both players’ threats before making a symmetrical reply.'}),
  lesson({id:'use-open-file',title:'Activate the open file.',tag:'Rook activity',pages:'p. 19',moves:pinLine,start:15,
    coach:'Use the central pawn to gain time.',prompt:'White has copied your knight jump with Nd5. Attack that knight with a pawn, then follow how the exchanges open the g-file.',
    goals:['Connect exchanges with changes in pawn cover','Activate a rook on an open file'],
    focus:{16:'The c-pawn attacks the knight on d5, asking White to decide where it belongs.',17:'White exchanges the knight on f6 with check.',18:'The g-pawn recaptures on f6, clearing g7.',19:'The bishop retreats to h4.',20:'Black exchanges the pinned knight on f3 with check.',21:'White’s g-pawn recaptures on f3. Both g-pawns have left the g-file.',22:'The bishop moves to h3, attacking the rook on f1.',23:'The rook moves to e1.',24:'The h8-rook reaches g8 and checks the king along the newly opened file.'},
    takeaway:'After exchanges, recheck every open file and diagonal. The same structural change can be dangerous for one king and useful for the other side’s rook.'}),
  lesson({id:'deflect-the-blocker',title:'Remove the blocker.',tag:'Pin & deflection',pages:'pp. 20–21',moves:deflection,start:25,
    coach:'Challenge the pinned bishop.',prompt:'White blocked the g-file check with Bg3. Advance your h-pawn to prepare an attack on that bishop, then calculate the discovered check.',
    goals:['Recognize a piece pinned to its king','Use deflection to uncover a rook check'],
    focus:{26:'The h-pawn prepares …h4, attacking the bishop on g3 while it blocks the rook’s line to the king.',27:'White moves the king to h1, breaking the absolute pin.',28:'Black pushes h4 anyway. This example aims to draw the bishop away from g3.',29:'The bishop captures on h4 and leaves the g-file.',30:'The other bishop checks from g2 along the diagonal to h1.',31:'The king returns to g1.',32:'The bishop takes the pawn on f3, uncovering the rook’s check on the g-file. From f3 the bishop also attacks the queen on d1.'},
    takeaway:'Identify the piece that blocks your attack. A pawn can draw that defender away and allow a different piece to uncover a rook check.'}),
];

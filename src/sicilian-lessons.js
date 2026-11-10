const courseTitle = 'Sicilian Defense';

export const SICILIAN_REFERENCE = 'Opening positions and selected study lines are drawn from the supplied excerpt of Modernized: The Open Sicilian by Zhanibek Amanov and Kostya Kavutskiy, Metropolitan Chess Publishing. ROQVYN’s explanations and questions are original. Each exercise follows a selected legal line.';

const open = ['e4', 'c5', 'Nf3'];
const d6 = [...open, 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'];
const e6 = [...open, 'e6', 'd4', 'cxd4', 'Nxd4'];
const nc6 = [...open, 'Nc6', 'd4', 'cxd4', 'Nxd4'];
const najdorf = [...d6, 'a6', 'h3'];
const adams = [...najdorf, 'e6', 'g4'];
const taimanov = [...e6, 'Nc6', 'Nc3', 'Qc7', 'g3'];

const basics = '1 · Open Sicilian & Najdorf';
const earlyE6 = '2 · Early …e6 systems';
const otherBranches = '3 · Classical, Dragons & …e5';
const pieceNames = {p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen', k:'king'};

function describe(move) {
  const side = move.color === 'w' ? 'White' : 'Black';
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    return `${side} castles ${move.isKingsideCastle() ? 'kingside' : 'queenside'}, moving the king and rook.`;
  }
  const action = move.captured
    ? `captures the ${pieceNames[move.captured]} on ${move.to} with the ${pieceNames[move.piece]}`
    : `moves the ${pieceNames[move.piece]} from ${move.from} to ${move.to}`;
  return `${side} ${action}.`;
}

function lesson({id, title, unit, moves, start, pages, concept, prompt, notes, takeaway, quiz}) {
  return {
    id, title, unit, tag:unit, moves, takeaway, quiz,
    course:courseTitle,
    practiceColor:'w',
    subtitle:prompt,
    source:`Modernized: The Open Sicilian, printed ${pages}.`,
    concepts:[{title, text:concept}],
    notes:played => played.map((move, index) => notes[index + 1] || describe(move)),
    study:{title, start, coach:title, prompt}
  };
}

export const SICILIAN_LESSONS = [
  lesson({
    id:'sicilian-open-center', title:'Open the center against …c5', unit:basics,
    moves:d6.slice(0, 7), start:4, pages:'pp. 7, 549',
    concept:'Black’s c-pawn attacks d4 from the side. White can offer a central exchange, then use the recapture to put a knight on d4.',
    prompt:'Offer an exchange with the d-pawn, then recapture with your developed knight.',
    notes:{2:'The c-pawn controls d4 and keeps Black’s e-pawn available.', 5:'The d-pawn challenges the c5-pawn and opens the c1-bishop’s diagonal.', 7:'Nxd4 restores material and brings the knight into the center.'},
    takeaway:'The Open Sicilian starts with a central exchange. Black trades the c-pawn for White’s d-pawn and keeps both central pawns. White gets a developed knight on d4.',
    quiz:{question:'What does White gain by recapturing with Nxd4?', options:['An extra pawn', 'A developed knight in the center', 'An immediate attack on the queen'], answer:1, explanation:'The capture restores equal material and places a knight on an active central square.'}
  }),
  lesson({
    id:'sicilian-adams-attack', title:'Najdorf: Prepare the g-pawn advance', unit:basics,
    moves:najdorf, start:10, pages:'p. 9',
    concept:'The Najdorf begins with 5…a6. The Adams Attack uses a quiet rook-pawn move to prepare g4 while waiting to see how Black sets up.',
    prompt:'Black has played …a6. Prepare to advance your g-pawn by giving g4 pawn support.',
    notes:{10:'The a6-pawn controls b5, where a White knight or bishop might otherwise land.', 11:'The pawn on h3 supports g4. White can decide when to push after seeing Black’s reply.'},
    takeaway:'Use h3 to prepare g4 in this branch. Watch for Black’s central break before committing more kingside pawns.',
    quiz:{question:'Which square does the pawn on h3 support?', options:['g4', 'f4', 'h4'], answer:0, explanation:'White pawns attack diagonally toward the eighth rank. From h3, the pawn attacks g4.'}
  }),
  lesson({
    id:'sicilian-najdorf-e6', title:'Najdorf: Develop behind the pawn advance', unit:basics,
    moves:[...adams, 'b5', 'Bg2', 'Bb7', 'O-O'], start:12, pages:'pp. 10, 549',
    concept:'After …e6, White can gain kingside space with g4. When Black expands with …b5, White can develop the bishop behind the g-pawn and castle.',
    prompt:'Gain space with the g-pawn. Against the sample …b5 and …Bb7, develop your kingside bishop and castle.',
    notes:{13:'g4 gains space and vacates g2 for the bishop.', 14:'Black gains queenside space and clears b7 for the bishop.', 15:'Bg2 develops the bishop on the long diagonal and clears f1 for castling.', 17:'Castling brings the king to g1 before White considers another pawn push.'},
    takeaway:'The pawn advance gives White space and a route for the bishop. Black has counterplay on the queenside and in the center, so finish development.',
    quiz:{question:'Why is Bg2 useful after g4?', options:['It prevents Black from moving any pawn', 'It clears b1 for the rook', 'It develops the bishop and clears f1 for castling'], answer:2, explanation:'The g-pawn has left g2. Moving the bishop from f1 to g2 opens the king’s route to g1.'}
  }),
  lesson({
    id:'sicilian-najdorf-central-break', title:'Najdorf: Respond to …d5 in the center', unit:basics,
    moves:[...adams, 'd5', 'exd5', 'Nxd5', 'Nde2'], start:14, pages:'pp. 11, 549',
    concept:'Black can challenge the center while White is expanding on the wing. After the exchange on d5, the d4-knight can retreat to a square that also defends the c3-knight.',
    prompt:'Capture the d5-pawn with your e-pawn. After …Nxd5, retreat the d4-knight toward the kingside so it protects c3.',
    notes:{14:'…d5 challenges e4 and gives Black central play while the g-pawn is advanced.', 15:'exd5 resolves the immediate pawn tension.', 16:'The f6-knight recaptures and now attacks the knight on c3.', 17:'Nde2 takes the d4-knight to e2, where it protects c3 and can recapture there.'},
    takeaway:'A wing plan depends on the center. After a central break, check which of your pieces became targets and which can defend each other.',
    quiz:{question:'After Nde2, which White knight guards c3?', options:['The knight on e2', 'The knight on c3', 'Neither knight'], answer:0, explanation:'The knight on e2 attacks c3, so it can recapture if Black takes the c3-knight.'}
  }),
  lesson({
    id:'sicilian-najdorf-e5', title:'Najdorf: Keep the plan after …e5', unit:basics,
    moves:[...najdorf, 'e5', 'Nde2', 'Be7', 'g4', 'Be6', 'Bg2'], start:12, pages:'p. 550',
    concept:'The e5-pawn attacks the knight on d4. White can save that knight first and keep the option of developing the bishop through g2.',
    prompt:'Retreat the attacked knight toward the kingside so it guards c3. Then clear g2 and develop your bishop there.',
    notes:{12:'The e5-pawn attacks d4 and f4.', 13:'Nde2 saves the d4-knight and keeps the c3-knight in the center.', 15:'g4 frees g2 and gains space after Black develops the bishop.', 17:'Bg2 develops the f1-bishop. White can now consider castling.'},
    takeaway:'The same kingside setup can arise in a different order. Answer the threat to d4 before advancing the g-pawn.',
    quiz:{question:'Why should White attend to the d4-knight after …e5?', options:['It has pinned Black’s king', 'Black’s e5-pawn attacks it', 'It is blocking White’s rook'], answer:1, explanation:'A black pawn on e5 attacks d4, so the knight needs attention before White plays another wing move.'}
  }),
  lesson({
    id:'sicilian-kan', title:'Kan: Check the queenside before developing', unit:earlyE6,
    moves:[...e6, 'a6', 'Nc3', 'b5', 'a3', 'Bb7', 'g3', 'Nf6', 'Bg2'], start:10, pages:'p. 552',
    concept:'The Kan uses an early …a6 and can gain space with …b5. White can put a pawn in control of b4 before preparing a kingside fianchetto.',
    prompt:'Use your a-pawn to control b4. Then prepare and develop the f1-bishop on the long diagonal.',
    notes:{8:'The Kan setup uses …a6 while Black’s knights are still on their starting squares.', 11:'a3 controls b4, giving White a possible capture if Black advances the b-pawn.', 13:'g3 vacates g2 for the bishop and keeps the g-pawn closer to the king than g4 would.', 15:'Bg2 completes the fianchetto. Check what is blocking the diagonal before counting its targets.'},
    takeaway:'Locate Black’s next pawn advance before committing to your development plan. Here a3 addresses b4 and g3 prepares Bg2.',
    quiz:{question:'Which square does a3 help White control?', options:['b4', 'd4', 'b2'], answer:0, explanation:'The white a3-pawn attacks b4. An advance to b4 may therefore be met by a capture.'}
  }),
  lesson({
    id:'sicilian-taimanov', title:'Taimanov: Build the g2 setup', unit:earlyE6,
    moves:[...taimanov, 'a6', 'Bg2', 'Nf6', 'O-O'], start:10, pages:'p. 553',
    concept:'Black develops the queenside knight and puts the queen on c7. White’s g3, Bg2 and castling form a setup against the selected …a6 and …Nf6 sequence.',
    prompt:'Prepare the fianchetto, develop the bishop to the long diagonal, then get the king to safety.',
    notes:{10:'Black’s queen develops to c7, where it can become a target for a knight on b5.', 11:'g3 prepares Bg2.', 12:'…a6 controls b5, reducing the scope for the immediate knight attack on c7.', 13:'Bg2 develops the f1-bishop and clears the path to castle.', 15:'Castling secures the king and brings the rook into play.'},
    takeaway:'A setup is a plan, not a script. If Black chooses a different move order, check for a useful tempo before completing it.',
    quiz:{question:'What does White’s g3 prepare in this line?', options:['Queenside castling', 'A bishop on g2', 'A knight on g3'], answer:1, explanation:'The pawn leaves g2 so the f1-bishop can develop there.'}
  }),
  lesson({
    id:'sicilian-taimanov-queen-tempo', title:'Taimanov: Attack the queen with tempo', unit:earlyE6,
    moves:[...taimanov, 'Nf6', 'Ndb5'], start:12, pages:'p. 553',
    concept:'If Black plays …Nf6 before …a6, b5 is available. Both White knights can go there, but moving the d4-knight keeps the c3-knight defending e4.',
    prompt:'Attack the queen on c7 with a knight while keeping the other knight defending e4.',
    notes:{12:'The f6-knight develops with an attack on e4. Black has not played …a6.', 13:'Ndb5 attacks the queen on c7 and keeps the c3-knight’s defense of e4.'},
    takeaway:'When two pieces can land on the same square, compare what they leave behind. Moving the d4-knight preserves the defense of e4.',
    quiz:{question:'Why does the study use Ndb5 instead of Ncb5?', options:['Only the d4-knight can move to b5', 'The c3-knight needs to stay and guard e4', 'Ncb5 would give check'], answer:1, explanation:'Both moves are legal here. The knight on c3 defends e4, so moving the d4-knight keeps that defense.'}
  }),
  lesson({
    id:'sicilian-four-knights', title:'Four Knights: Question the bishop pin', unit:earlyE6,
    moves:[...e6, 'Nf6', 'Nc3', 'Nc6', 'Ndb5', 'Bb4', 'a3', 'Bxc3+', 'Nxc3'], start:10, pages:'p. 560',
    concept:'With all four knights developed, Ndb5 creates pressure on d6. In the selected reply …Bb4, Black pins the other knight to White’s king.',
    prompt:'Use your d4-knight to put pressure on d6. After …Bb4, attack the bishop, then recapture on c3 with your other knight.',
    notes:{11:'The knight on b5 attacks d6 and leaves the c3-knight defending e4.', 12:'The bishop pins the knight on c3 along the diagonal to e1.', 13:'a3 attacks the bishop on b4.', 14:'…Bxc3+ removes the pinned knight and opens the diagonal to the king.', 15:'The b5-knight captures on c3, blocks the check, and restores material.'},
    takeaway:'Track how a pin becomes a check after a capture. In this line the b5-knight can return to c3 and answer that check.',
    quiz:{question:'Which piece can capture the checking bishop after …Bxc3+ in the study line?', options:['The knight on b5', 'The rook on a1', 'The bishop on c1'], answer:0, explanation:'The b5-knight jumps to c3, captures the bishop, and removes the check.'}
  }),
  lesson({
    id:'sicilian-classical', title:'Classical: Point the bishop toward f7', unit:otherBranches,
    moves:[...d6, 'Nc6', 'Bc4', 'e6', 'Be3'], start:10, pages:'p. 555',
    concept:'In the Classical setup, Black has developed both knights. Bc4 puts a bishop on the diagonal toward f7, which Black can interrupt with …e6.',
    prompt:'Develop the f1-bishop toward f7. After …e6 blocks the diagonal, develop the other bishop to support d4.',
    notes:{10:'…Nc6 develops the second knight and attacks the white knight on d4.', 11:'Bc4 places the bishop on the c4–f7 diagonal.', 12:'…e6 blocks the bishop’s direct attack on f7.', 13:'Be3 develops the c1-bishop and adds a defender to d4.'},
    takeaway:'Development can create a threat, but the opponent can change the geometry. After …e6, keep developing instead of assuming f7 is still attacked.',
    quiz:{question:'What changes after …e6?', options:['Black’s pawn blocks the bishop’s direct line to f7', 'Black’s king is in check', 'White’s c4-bishop can no longer move'], answer:0, explanation:'The e6-pawn stands between the c4-bishop and f7 on the same diagonal.'}
  }),
  lesson({
    id:'sicilian-dragon', title:'Dragon: Prepare opposite-side castling', unit:otherBranches,
    moves:[...d6, 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'O-O-O'], start:10, pages:'p. 556',
    concept:'In this Yugoslav Attack setup, White develops the c1-bishop and moves the queen out of d1 to clear queenside castling. The f-pawn reinforces e4.',
    prompt:'Develop the c1-bishop to e3, reinforce e4 with a pawn, clear d1 with your queen, then castle queenside.',
    notes:{11:'Be3 develops the bishop and clears c1.', 12:'Black’s bishop takes the long diagonal from g7.', 13:'f3 adds pawn support to e4 and controls g4.', 15:'Qd2 clears d1 and backs up the bishop on e3.', 17:'White’s king goes to c1 and the a1-rook to d1. Black can seek counterplay on the queenside.'},
    takeaway:'Before committing to an attack, check both kings and the open files. In the Dragon, the side where you castle changes which pawn advances are risky.',
    quiz:{question:'Which two pieces leave c1 and d1 in the selected setup?', options:['The rook and knight', 'The king and knight', 'The bishop and queen'], answer:2, explanation:'Be3 clears c1 and Qd2 clears d1. The b1-knight has already developed to c3.'}
  }),
  lesson({
    id:'sicilian-accelerated-dragon', title:'Accelerated Dragon: Control d5 early', unit:otherBranches,
    moves:[...nc6, 'g6', 'c4', 'Nf6', 'Nc3', 'd6', 'Be2'], start:8, pages:'p. 557',
    concept:'In this move order Black plays …g6 with the d-pawn still on d7. White can place pawns on c4 and e4 to increase control of d5 before developing the b1-knight.',
    prompt:'Add a second pawn that controls d5. Then develop your queenside knight and kingside bishop in the study line.',
    notes:{8:'…g6 prepares Bg7 while leaving the option of a direct …d5 if the position allows.', 9:'c4 joins e4 in controlling d5 and leaves c3 available for the knight.', 11:'Nc3 develops the knight and adds another piece that attacks d5.', 13:'Be2 develops the bishop and clears the way for kingside castling.'},
    takeaway:'The Maróczy Bind makes the …d5 break harder to arrange. The key timing is c4 before the b1-knight occupies c3.',
    quiz:{question:'Which two white pawns control d5 in the Maróczy Bind?', options:['a4 and c4', 'c4 and e4', 'e4 and g4'], answer:1, explanation:'The c4-pawn attacks d5 from one side and the e4-pawn attacks it from the other.'}
  }),
  lesson({
    id:'sicilian-sveshnikov', title:'Sveshnikov: Find a home on d5', unit:otherBranches,
    moves:[...nc6, 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5'], start:10, pages:'p. 558',
    concept:'Black gains time on the d4-knight with …e5. White can use b5 to pressure d6, then look for a square on d5 that Black’s central pawns cannot attack directly.',
    prompt:'Move the attacked knight to b5. Develop your bishop to pressure f6, retreat the b5-knight when attacked, then occupy d5 with your other knight.',
    notes:{10:'…e5 attacks the d4-knight and passes up direct pawn control of d5.', 11:'Ndb5 saves the knight and puts pressure on d6.', 13:'Bg5 puts pressure on the f6-knight and lines the bishop up with the queen on d8.', 15:'Na3 saves the b5-knight from the a6-pawn.', 17:'The c3-knight occupies d5. Black can still contest it with pieces.'},
    takeaway:'Black gains space and activity while conceding d5. Before occupying that square, check which pieces can challenge the knight there.',
    quiz:{question:'Which knight reaches d5 after …b5 in this line?', options:['The knight on c3', 'The knight on a3', 'The knight on f6'], answer:0, explanation:'The c3-knight can jump to d5. The a3-knight needs another route back into the game.'}
  }),
  lesson({
    id:'sicilian-kalashnikov', title:'Kalashnikov: Use the earlier move order', unit:otherBranches,
    moves:[...nc6, 'e5', 'Nb5', 'd6', 'c4'], start:8, pages:'p. 559',
    concept:'The Kalashnikov uses …e5 before Black develops the g8-knight to f6. White’s b1-knight has not developed yet, so the c-pawn can advance to c4.',
    prompt:'Save the attacked knight on b5. After …d6, advance the pawn that gives you more control of d5.',
    notes:{8:'…e5 attacks d4 before Black plays …Nf6.', 9:'Nb5 retreats from the attack and eyes d6.', 10:'…d6 protects the e5-pawn.', 11:'c4 strengthens d5 while leaving c3 free for the b1-knight later.'},
    takeaway:'Compare move orders by looking at the pieces still at home. In this branch White can play c4 before committing the b1-knight to c3.',
    quiz:{question:'What makes the Kalashnikov move order different here?', options:['Black plays …g6 before exchanging on d4', 'White has already castled', 'Black plays …e5 before …Nf6'], answer:2, explanation:'The black g8-knight is still at home when …e5 attacks White’s knight on d4.'}
  })
];

const courseTitle = 'Sicilian Defense';

export const SICILIAN_REFERENCE = 'Opening positions and selected study lines are drawn from the supplied excerpt of Modernized: The Open Sicilian by Zhanibek Amanov and Kostya Kavutskiy, Metropolitan Chess Publishing. ROQVYN’s explanations and questions are original. Each exercise follows a selected legal line.';

const open = ['e4', 'c5', 'Nf3'];
const d6 = [...open, 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'];
const e6 = [...open, 'e6', 'd4', 'cxd4', 'Nxd4'];
const nc6 = [...open, 'Nc6', 'd4', 'cxd4', 'Nxd4'];
const najdorf = [...d6, 'a6', 'h3'];
const adams = [...najdorf, 'e6', 'g4'];
const taimanov = [...e6, 'Nc6', 'Nc3', 'Qc7', 'g3'];
const najdorfCastle = [...adams, 'b5', 'Bg2', 'Bb7', 'O-O'];
const taimanovCastle = [...taimanov, 'a6', 'Bg2', 'Nf6', 'O-O'];
const fourKnightsExchange = [...e6, 'Nf6', 'Nc3', 'Nc6', 'Ndb5', 'Bb4', 'a3', 'Bxc3+', 'Nxc3'];
const dragonCastle = [...d6, 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'O-O-O'];
const sveshnikovOutpost = [...nc6, 'Nf6', 'Nc3', 'e5', 'Ndb5', 'd6', 'Bg5', 'a6', 'Na3', 'b5', 'Nd5'];
const kalashnikovBind = [...nc6, 'e5', 'Nb5', 'd6', 'c4'];

const basics = '1 · Open Sicilian & Najdorf';
const earlyE6 = '2 · Early …e6 systems';
const otherBranches = '3 · Classical, Dragons & …e5';
const najdorfDecisions = '4 · Najdorf & Scheveningen decisions';
const e6Decisions = '5 · Tactics in early …e6 lines';
const dragonDecisions = '6 · Classical & Dragon decisions';
const moveOrders = '7 · …e5 and early …a6 move orders';
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
    moves:najdorfCastle, start:12, pages:'pp. 10, 549',
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
    moves:taimanovCastle, start:10, pages:'p. 553',
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
    moves:fourKnightsExchange, start:10, pages:'p. 560',
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
    moves:dragonCastle, start:10, pages:'p. 556',
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
    moves:sveshnikovOutpost, start:10, pages:'p. 558',
    concept:'Black gains time on the d4-knight with …e5. White can use b5 to pressure d6, then look for a square on d5 that Black’s central pawns cannot attack directly.',
    prompt:'Move the attacked knight to b5. Develop your bishop to pressure f6, retreat the b5-knight when attacked, then occupy d5 with your other knight.',
    notes:{10:'…e5 attacks the d4-knight and passes up direct pawn control of d5.', 11:'Ndb5 saves the knight and puts pressure on d6.', 13:'Bg5 puts pressure on the f6-knight and lines the bishop up with the queen on d8.', 15:'Na3 saves the b5-knight from the a6-pawn.', 17:'The c3-knight occupies d5. Black can still contest it with pieces.'},
    takeaway:'Black gains space and activity while conceding d5. Before occupying that square, check which pieces can challenge the knight there.',
    quiz:{question:'Which knight reaches d5 after …b5 in this line?', options:['The knight on c3', 'The knight on a3', 'The knight on f6'], answer:0, explanation:'The c3-knight can jump to d5. The a3-knight needs another route back into the game.'}
  }),
  lesson({
    id:'sicilian-kalashnikov', title:'Kalashnikov: Use the earlier move order', unit:otherBranches,
    moves:kalashnikovBind, start:8, pages:'p. 559',
    concept:'The Kalashnikov uses …e5 before Black develops the g8-knight to f6. White’s b1-knight has not developed yet, so the c-pawn can advance to c4.',
    prompt:'Save the attacked knight on b5. After …d6, advance the pawn that gives you more control of d5.',
    notes:{8:'…e5 attacks d4 before Black plays …Nf6.', 9:'Nb5 retreats from the attack and eyes d6.', 10:'…d6 protects the e5-pawn.', 11:'c4 strengthens d5 while leaving c3 free for the b1-knight later.'},
    takeaway:'Compare move orders by looking at the pieces still at home. In this branch White can play c4 before committing the b1-knight to c3.',
    quiz:{question:'What makes the Kalashnikov move order different here?', options:['Black plays …g6 before exchanging on d4', 'White has already castled', 'Black plays …e5 before …Nf6'], answer:2, explanation:'The black g8-knight is still at home when …e5 attacks White’s knight on d4.'}
  }),
  lesson({
    id:'sicilian-najdorf-g5-tempo', title:'Najdorf: Gain time on the f6-knight', unit:najdorfDecisions,
    moves:[...najdorfCastle, 'Qc7', 'g5'], start:18, pages:'p. 549',
    concept:'With the bishop developed and the king castled, White can consider moving the g-pawn again. On g5 it attacks the knight that guards d5 and e4.',
    prompt:'Find a pawn advance that attacks the knight on f6.',
    notes:{18:'Black’s queen develops to c7 while the f6-knight remains on its square.', 19:'g5 attacks f6. Check where the knight can retreat before advancing any other pawn.'},
    takeaway:'The same pawn can gain space on one move and time on the next. Here the point of g5 is the direct attack on f6.',
    quiz:{question:'What does g5 immediately attack?', options:['The knight on f6', 'The queen on c7', 'The bishop on b7'], answer:0, explanation:'The g5-pawn attacks f6 diagonally. Black can respond to the threat.'}
  }),
  lesson({
    id:'sicilian-najdorf-f4', title:'Najdorf: Build central support after …h6', unit:najdorfDecisions,
    moves:[...adams, 'h6', 'Bg2', 'Nc6', 'f4', 'Bd7', 'Be3'], start:16, pages:'p. 549',
    concept:'Black’s h6-pawn controls g5. With the kingside bishop already developed, White can use the f-pawn to reinforce g5 and control e5 before bringing out the other bishop.',
    prompt:'Advance the f-pawn so it controls e5 and g5. After …Bd7, develop your c1-bishop to reinforce d4.',
    notes:{14:'…h6 gives Black pawn control of g5.', 17:'The f4-pawn attacks e5 and g5.', 19:'Be3 develops the c1-bishop and protects the knight on d4.'},
    takeaway:'When the opponent contests a square on the wing, bring more support into play. A useful pawn move can also strengthen your center.',
    quiz:{question:'Which central square does f4 control?', options:['e4', 'd5', 'e5'], answer:2, explanation:'The f4-pawn attacks both e5 and g5, one diagonal on either side.'}
  }),
  lesson({
    id:'sicilian-najdorf-support-g5', title:'Najdorf: Support the advanced g-pawn', unit:najdorfDecisions,
    moves:[...adams, 'Be7', 'g5', 'Nfd7', 'h4', 'b5', 'a3'], start:16, pages:'p. 549',
    concept:'After g5 drives the knight to d7, the h-pawn can support g5. If Black follows with …b5, a3 adds control of b4 on the opposite wing.',
    prompt:'Use a pawn to defend g5. When Black plays …b5, use your a-pawn to control b4.',
    notes:{16:'The f6-knight retreats to d7 in this continuation.', 17:'h4 gives the pawn on g5 direct pawn support.', 19:'a3 controls b4, where Black’s pawn could otherwise advance.'},
    takeaway:'A kingside plan does not stop Black from playing on the queenside. Check your opponent’s next pawn advance before making another threat.',
    quiz:{question:'Which pawn guards g5 after h4?', options:['The f2-pawn', 'The h4-pawn', 'The e4-pawn'], answer:1, explanation:'The pawn on h4 attacks g5. This adds a defender to the advanced g-pawn.'}
  }),
  lesson({
    id:'sicilian-najdorf-queen-on-f6', title:'Najdorf: Use d5 to attack the queen', unit:najdorfDecisions,
    moves:[...najdorf, 'e5', 'Nde2', 'h5', 'Bg5', 'Be6', 'Bxf6', 'Qxf6', 'Nd5'], start:14, pages:'p. 550',
    concept:'After …h5, White can pressure the f6-knight with the c1-bishop. A queen recapture on f6 gives the c3-knight a target from d5.',
    prompt:'Develop your c1-bishop so it attacks f6. In the study line, trade on f6, then attack the recapturing queen with a knight.',
    notes:{15:'Bg5 attacks the knight on f6, which sits in front of the queen on d8.', 17:'Bxf6 removes that knight.', 18:'The queen recaptures on f6 in the study line.', 19:'Nd5 brings the c3-knight to a central square with an attack on the queen.'},
    takeaway:'Calculate the square a piece will land on after a recapture. Here a queen on f6 can be attacked with a developing tempo.',
    quiz:{question:'After …Qxf6, from which square does the c3-knight attack the queen in the study line?', options:['b5', 'd1', 'd5'], answer:2, explanation:'The knight jumps from c3 to d5. From d5 it attacks f6.'}
  }),
  lesson({
    id:'sicilian-scheveningen-keres', title:'Scheveningen: Time the Keres Attack', unit:najdorfDecisions,
    moves:[...d6, 'e6', 'g4', 'Nc6', 'g5', 'Nd7', 'Be3'], start:10, pages:'p. 551',
    concept:'The Scheveningen has black pawns on d6 and e6. When Black plays 5…e6 immediately, White can consider g4 without spending a move on h3 first.',
    prompt:'Start the Keres Attack with the g-pawn. After …Nc6, attack the f6-knight, then develop your c1-bishop to support d4.',
    notes:{10:'Black plays …e6 before …a6, creating the Scheveningen pawn structure.', 11:'g4 starts the Keres Attack directly.', 13:'g5 attacks the f6-knight.', 15:'Be3 develops the bishop and gives the d4-knight extra support.'},
    takeaway:'Recognize the move order. Here the plan begins with g4 on move six, while the Adams Attack lessons begin with h3 against 5…a6.',
    quiz:{question:'Which black move directly precedes 6.g4 in this line?', options:['5…g6', '5…e6', '5…a6'], answer:1, explanation:'The selected line starts the Keres Attack immediately after 5…e6 creates pawns on d6 and e6.'}
  }),
  lesson({
    id:'sicilian-kan-bishop-pin', title:'Kan: Break the pin before castling', unit:e6Decisions,
    moves:[...e6, 'a6', 'Nc3', 'Qc7', 'g3', 'Bb4', 'Bd2', 'Nf6', 'Bg2', 'Nc6', 'Nb3'], start:12, pages:'p. 552',
    concept:'The bishop on b4 pins the c3-knight to the king. White can develop the c1-bishop between that knight and the king, then complete the kingside fianchetto.',
    prompt:'Break the pin with your c1-bishop. After developing your f1-bishop to g2, retreat the d4-knight to b3.',
    notes:{12:'…Bb4 pins the c3-knight along b4–c3–d2–e1.', 13:'Bd2 puts a second piece on the diagonal. The c3-knight can now leave without exposing its king.', 15:'Bg2 adds a defender to the e4-pawn.', 17:'Nb3 takes the d4-knight out of the c6-knight’s attack.'},
    takeaway:'A pin can be broken by adding a blocker. Once the king is screened by the bishop on d2, the c3-knight is free to move.',
    quiz:{question:'Which square must the bishop occupy to break the absolute pin?', options:['d2', 'e3', 'f4'], answer:0, explanation:'On d2 it stands between the knight on c3 and White’s king on e1.'}
  }),
  lesson({
    id:'sicilian-taimanov-counterattack-queen', title:'Taimanov: Counterattack the queen', unit:e6Decisions,
    moves:[...taimanovCastle, 'Nxd4', 'Qxd4', 'Bc5', 'Bf4'], start:16, pages:'p. 553',
    concept:'After the queen recaptures on d4, …Bc5 attacks it. White can develop the c1-bishop with a counterattack on Black’s queen, so taking on d4 would allow a queen capture in return.',
    prompt:'Recapture on d4. When the bishop attacks your queen, develop your c1-bishop so it attacks Black’s queen.',
    notes:{17:'Qxd4 restores the exchanged knight.', 18:'The bishop on c5 attacks the queen on d4.', 19:'Bf4 attacks c7 along f4–e5–d6–c7. White’s queen is still attacked.'},
    takeaway:'Look for a counterattack before retreating. Calculate both captures before leaving your queen under attack.',
    quiz:{question:'After Bf4, which two pieces are under attack?', options:['Both kings', 'Both queens', 'Both rooks'], answer:1, explanation:'The bishop on c5 attacks d4, and the bishop on f4 attacks c7. The queens occupy those squares.'}
  }),
  lesson({
    id:'sicilian-taimanov-e5-tempo', title:'Taimanov: Attack the defender before recapturing', unit:e6Decisions,
    moves:[...taimanovCastle, 'Be7', 'Re1', 'Nxd4', 'e5'], start:18, pages:'p. 553',
    concept:'Black’s c6-knight has captured on d4. Before taking it back, White can advance the e-pawn with an attack on the other knight, supported by the rook on e1.',
    prompt:'Find the pawn move that attacks the f6-knight before you recapture on d4.',
    notes:{17:'Re1 places the rook behind the e-pawn.', 18:'The c6-knight captures the knight on d4.', 19:'e5 attacks the f6-knight. The rook on e1 supports the pawn along the e-file.'},
    takeaway:'After a capture, consider moves with tempo before recapturing. In this position e5 introduces a threat to the other knight.',
    quiz:{question:'Which black piece does e5 attack?', options:['The queen on c7', 'The bishop on e7', 'The knight on f6'], answer:2, explanation:'The e5-pawn attacks f6 diagonally. The d4-knight can be addressed after checking the reply.'}
  }),
  lesson({
    id:'sicilian-four-knights-isolated-pawn', title:'Four Knights: Recognize an isolated pawn', unit:e6Decisions,
    moves:[...fourKnightsExchange, 'd5', 'exd5', 'exd5', 'Bd3'], start:16, pages:'p. 560',
    concept:'Black plays …d5 after the exchange on c3. If both e-pawns capture onto d5 in turn, Black ends up with an isolated d-pawn because its c- and e-files have no black pawns.',
    prompt:'Exchange your e-pawn on d5. After Black’s pawn recaptures, develop the f1-bishop toward h7.',
    notes:{16:'…d5 challenges White’s e4-pawn.', 17:'exd5 takes the central pawn.', 18:'Black’s e-pawn recaptures on d5 and becomes isolated.', 19:'Bd3 develops the f1-bishop toward h7 and clears f1 for castling.'},
    takeaway:'Read the pawn structure again after exchanges. An isolated pawn can be a target, but its owner may gain active piece play.',
    quiz:{question:'Why is Black’s pawn on d5 isolated after …exd5?', options:['No black pawn remains on either neighboring file', 'The d-pawn cannot move forward', 'The black queen cannot defend it'], answer:0, explanation:'An isolated pawn has no friendly pawns on neighboring files. Black’s c-pawn was traded and the e-pawn moved to d5.'}
  }),
  lesson({
    id:'sicilian-classical-queen-on-b6', title:'Classical: Meet the queen’s double attack', unit:dragonDecisions,
    moves:[...d6, 'Nc6', 'Bc4', 'Qb6', 'Nb3', 'a6', 'O-O', 'e6', 'a4', 'Qc7', 'a5'], start:12, pages:'p. 555',
    concept:'The queen on b6 attacks both the d4-knight and b2. White can move the knight to b3, where it blocks the queen’s line to b2 and is supported by pawns.',
    prompt:'Move the d4-knight to block the queen’s line to b2. Castle after …a6. Then use the a-pawn to gain space on the queenside.',
    notes:{12:'…Qb6 attacks d4 diagonally and b2 along the b-file.', 13:'Nb3 moves the knight out of the diagonal and blocks the line to b2.', 15:'Castling takes the king out of the center.', 19:'a5 gains space and controls b6, the square the queen previously occupied.'},
    takeaway:'One move can answer two threats. Nb3 saves the attacked knight and puts a defended piece between Black’s queen and b2.',
    quiz:{question:'How does Nb3 protect b2 in this position?', options:['The knight attacks b2', 'The knight blocks the b-file', 'The knight checks the king'], answer:1, explanation:'The knight on b3 blocks the queen’s straight line from b6 to the b2-pawn.'}
  }),
  lesson({
    id:'sicilian-classical-central-e5', title:'Classical: Strike before the wing expands', unit:dragonDecisions,
    moves:[...d6, 'Nc6', 'Bc4', 'e6', 'Be3', 'a6', 'Bb3', 'Na5', 'f4', 'b5', 'e5'], start:18, pages:'p. 555',
    concept:'Black has spent time expanding on the queenside. White’s f4-pawn supports a central e5 push that attacks the f6-knight and increases the tension against d6.',
    prompt:'Use the e-pawn to attack the f6-knight. Check which pawn is supporting the advance.',
    notes:{17:'f4 gives the future e5 advance pawn support.', 18:'Black gains queenside space with …b5.', 19:'e5 attacks f6 and d6, with the f4-pawn supporting e5.'},
    takeaway:'When Black spends time on a wing, check whether you can open the center with tempo. Here the advance has a concrete target.',
    quiz:{question:'What supports the white pawn on e5 after it advances?', options:['The b2-pawn', 'The f4-pawn', 'The h2-pawn'], answer:1, explanation:'From f4 the pawn attacks e5, so it supports the push and can recapture there.'}
  }),
  lesson({
    id:'sicilian-dragon-king-off-c-file', title:'Dragon: Move the king off the c-file', unit:dragonDecisions,
    moves:[...dragonCastle, 'Nxd4', 'Bxd4', 'Be6', 'Kb1'], start:20, pages:'p. 556',
    concept:'Black can use the c-file because its c-pawn has already been traded. With White castled queenside, stepping from c1 to b1 keeps the king off that file before pressure builds.',
    prompt:'Move your king one square off the c-file while keeping it behind its queenside pawns.',
    notes:{20:'…Be6 develops the c8-bishop, leaving c8 available for a rook.', 21:'Kb1 moves the king away from the c-file. The c2-pawn can still be a target.'},
    takeaway:'After opposite-side castling, look for the file the opponent can use. A quiet king move can reduce the force of a later attack.',
    quiz:{question:'Why is the c-file useful to Black here?', options:['Black still has a pawn on c7', 'White’s king is already on g1', 'Black has no c-pawn to block its rook'], answer:2, explanation:'White’s c2-pawn still occupies the file. Black can put a rook on c8 and pressure that pawn because its own c-pawn was traded.'}
  }),
  lesson({
    id:'sicilian-dragon-open-g-file', title:'Dragon: Open a file for the rook', unit:dragonDecisions,
    moves:[...dragonCastle, 'Bd7', 'g4', 'Rc8', 'h4', 'h5', 'gxh5', 'Nxh5', 'Rg1'], start:22, pages:'p. 556',
    concept:'Black meets the kingside pawns with …h5. White can capture with the g-pawn, letting the black knight recapture while clearing the g-file for a rook.',
    prompt:'Exchange your g-pawn on h5. After …Nxh5, put the h1-rook on the file the g-pawn just left.',
    notes:{22:'Black’s h-pawn challenges the pawn on g4.', 23:'gxh5 moves White’s g-pawn off the g-file.', 24:'The f6-knight recaptures on h5.', 25:'Rg1 attacks the g6-pawn along the half-open file.'},
    takeaway:'Before trading pawns, identify which rook can use the line you are opening. White’s rook reaches g1, while Black can look for counterplay on the c-file.',
    quiz:{question:'What is the rook’s immediate target after Rg1?', options:['The g6-pawn', 'The c2-pawn', 'The h5-knight'], answer:0, explanation:'The rook sees straight up the g-file to g6. The pawn there still blocks the rest of the file.'}
  }),
  lesson({
    id:'sicilian-accelerated-dragon-knight-exchange', title:'Accelerated Dragon: Calculate the knight exchanges', unit:dragonDecisions,
    moves:[...nc6, 'g6', 'c4', 'Bg7', 'Be3', 'Nf6', 'Nc3', 'Ng4', 'Qxg4', 'Nxd4', 'Qd1', 'Ne6', 'Rc1'], start:14, pages:'p. 557',
    concept:'The g4-knight can be captured along the d1–g4 diagonal. Calculate Black’s capture on d4 as well, then bring the queen back and develop the rook behind the c-pawn.',
    prompt:'Capture the knight on g4 with your queen. After …Nxd4, return the queen to d1. After …Ne6, bring the a1-rook to c1.',
    notes:{15:'The queen takes the g4-knight along a clear diagonal.', 16:'Black’s c6-knight captures White’s d4-knight, restoring the material balance.', 17:'Qd1 returns the queen to a square where it can help defend the position.', 19:'Rc1 puts the rook behind the c4-pawn.'},
    takeaway:'Count both captures in a sequence. The queen capture on g4 and the knight capture on d4 trade one knight from each side.',
    quiz:{question:'What is the net material effect of Qxg4 Nxd4?', options:['White wins two knights', 'One knight is traded from each side', 'Black wins a queen'], answer:1, explanation:'White’s queen takes Black’s g4-knight, then Black’s other knight takes White’s d4-knight.'}
  }),
  lesson({
    id:'sicilian-sveshnikov-secure-d5', title:'Sveshnikov: Secure the outpost with a pawn', unit:moveOrders,
    moves:[...sveshnikovOutpost, 'Be7', 'Bxf6', 'Bxf6', 'c4', 'b4', 'Nc2'], start:18, pages:'p. 558',
    concept:'With the knight already on d5, White can trade off the f6-knight that attacks it. The c-pawn is then free to advance and support d5, while Black can chase the other knight with …b4.',
    prompt:'Remove the f6-knight with your bishop, then support d5 with the c-pawn. When …b4 attacks the a3-knight, bring it back toward the center.',
    notes:{19:'Bxf6 exchanges the knight that attacks d5.', 21:'c4 gives the d5-knight direct pawn support.', 22:'…b4 attacks the knight on a3.', 23:'Nc2 saves the a3-knight and keeps the outpost on d5.'},
    takeaway:'An outpost gets stronger when an enemy defender disappears and a pawn can support it. Check the other side of the board while consolidating it.',
    quiz:{question:'Which pawn directly supports the knight after c4?', options:['The c4-pawn', 'The b2-pawn', 'The f2-pawn'], answer:0, explanation:'The c4-pawn attacks d5. White’s e4-pawn also controls that square.'}
  }),
  lesson({
    id:'sicilian-kalashnikov-castle', title:'Kalashnikov: Keep the bind and castle', unit:moveOrders,
    moves:[...kalashnikovBind, 'Be7', 'N1c3', 'a6', 'Na3', 'Nf6', 'Be2', 'O-O', 'O-O'], start:14, pages:'p. 559',
    concept:'The a6-pawn attacks the advanced b5-knight. White can retreat it while keeping both pawns that control d5, then develop the f1-bishop and castle.',
    prompt:'Retreat the attacked knight toward the edge of the board. Then develop the f1-bishop to e2 and castle kingside.',
    notes:{14:'…a6 attacks the knight on b5.', 15:'Na3 saves the knight while leaving the c4- and e4-pawns in place.', 17:'Be2 clears f1 for castling.', 19:'Kingside castling gets the king out of the center.'},
    takeaway:'Preserve your useful pawn structure when a piece is chased. After finding a safe square for the knight, complete development.',
    quiz:{question:'Which square do the c4- and e4-pawns still control after Na3?', options:['c5', 'd5', 'e5'], answer:1, explanation:'Both pawns attack d5 diagonally. Retreating the knight does not change their control of that square.'}
  }),
  lesson({
    id:'sicilian-lowenthal-knight-check', title:'Löwenthal: Use a check before the retreat', unit:moveOrders,
    moves:[...nc6, 'e5', 'Nb5', 'a6', 'Nd6+', 'Bxd6', 'Qxd6'], start:10, pages:'p. 559',
    concept:'In the Löwenthal line Black plays …a6 while the d-pawn is still on d7. This leaves d6 empty, so the attacked b5-knight can jump there with check.',
    prompt:'Find a knight check from b5. When Black captures the knight with a bishop, recapture with your queen.',
    notes:{10:'The a6-pawn attacks b5 while Black’s pawn remains on d7.', 11:'Nd6+ checks the king on e8.', 12:'The f8-bishop captures the checking knight along f8–e7–d6.', 13:'The queen recaptures on d6. White has traded a knight for a bishop and kept both bishops.'},
    takeaway:'A piece under attack does not have to retreat immediately. Look for checks and useful exchanges before deciding where it should go.',
    quiz:{question:'What does White gain from the selected exchange?', options:['An extra rook', 'A forced checkmate', 'The bishop pair'], answer:2, explanation:'White trades a knight for Black’s f8-bishop and keeps both of its own bishops.'}
  }),
  lesson({
    id:'sicilian-okelly-central-space', title:'O’Kelly: Claim space against …b5', unit:moveOrders,
    moves:[...open, 'a6', 'Nc3', 'e6', 'd4', 'b5', 'd5', 'Bb7', 'Be2'], start:8, pages:'p. 561',
    concept:'In this early …a6 move order, Black plays …b5 before exchanging on d4. White can step past the c5-pawn with d5 and challenge the pawn on e6.',
    prompt:'Advance your d-pawn one square to gain central space. After …Bb7, develop your f1-bishop toward castling.',
    notes:{8:'Black gains queenside space with …b5 while the c5-pawn still attacks d4.', 9:'d5 steps away from the c5-pawn’s attack and challenges e6.', 11:'Be2 develops the f1-bishop and prepares castling.'},
    takeaway:'When Black delays the central exchange, recalculate the pawn structure. White can consider advancing instead of expecting a recapture on d4.',
    quiz:{question:'Which pawn does White’s d5-pawn attack?', options:['The b5-pawn', 'The d7-pawn', 'The e6-pawn'], answer:2, explanation:'From d5 the pawn attacks c6 and e6. Black’s pawn occupies e6 and can also capture d5.'}
  })
];

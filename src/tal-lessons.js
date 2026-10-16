import positions from './tal-positions.json' with {type:'json'};

export const TAL_REFERENCE='Study positions from the supplied Attack with Mikhail Tal by Mikhail Tal and Iakov Damsky. Knightlab explanations and questions are original. Each exercise follows a selected game or analysis line, not a claim that all replies are forced or that every alternative is wrong. PDF page numbers refer to the supplied scan.';
const teaching={
 'draw-the-king-out':{
  title:'Invite the king into the open.',tag:'King safety',unit:'1 · Expose the king',coach:'Look beyond the captured knight.',
  prompt:'White to move. Examine the knight capture on f7, then find the queen check after the king accepts.',
  concepts:[['Development buys attacking time','Black’s king is still on e8. White has a rook on the open e-file and an active knight. Look for a sacrifice that makes those pieces useful immediately.'],['Calculate the acceptance','After a sacrifice, visualize the new king square before choosing your next move. Here the queen can enter with check; winning back the piece is not the immediate goal.']],
  rules:['Inspect the king’s escape squares before sacrificing','Connect a sacrifice to a concrete follow-up','A selected reply is one study branch, not the only legal defense'],
  notes:['The knight takes f7, removing a pawn from the king’s shelter and offering itself to the king.','Black accepts the knight. The king leaves e8 and can no longer castle.','The queen reaches h5 with check along h5–g6–f7. White gains a forcing move to sustain the attack.','The king moves to e7. White has exposed the king, but the attack still needs accurate continuation.'],
  question:'What is White mainly buying with Nxf7?',options:['An exposed king and time for an attack','An immediate forced checkmate on f7','A safe extra knight'],answer:0,
  reason:'The knight is given up to draw the king onto f7. Qh5+ then gains time. The resulting attack must still be calculated.',
  takeaway:'Before giving up material, identify both the exposed king square and your next forcing move.'
 },
 'remove-the-f7-shield':{
  title:'Open a route for the rook.',tag:'Central files',unit:'1 · Expose the king',coach:'Make the d-file count.',
  prompt:'White to move. Draw the king to f7, exchange the knight on f6, then bring the d1-rook forward.',
  concepts:[['One sacrifice can clear several routes','The f7-pawn shields the king. After Nxf7 and Kxf7, the bishop on h4 can remove the knight on f6 and change the central geometry.'],['Activate the next attacker','An exposed king is useful only if your other pieces can reach it. Rd5 brings the rook into the position with an attack on the queen at a5.']],
  rules:['Recount defenders after every exchange','Look for rook activity along an open file','A tempo against the queen can help mobilize another attacker'],
  notes:['The knight takes f7, offering itself to bring the king away from e8.','The king accepts on f7 and becomes a potential target in the center.','The h4-bishop captures the f6-knight, exchanging an active defender.','Black’s e7-bishop recaptures on f6. The balance of central defenders changes again.','The d1-rook reaches d5 and attacks the queen on a5 along the fifth rank.'],
  question:'Why is Rd5 useful after the exchanges?',options:['It checkmates the king immediately','It activates the rook while attacking the queen','It wins Black’s rook on g8 at once'],answer:1,
  reason:'From d5 the rook attacks the queen on a5. This brings another piece into play with a concrete threat.',
  takeaway:'Follow an opening sacrifice by bringing another piece into the attack with tempo.'
 },
 'strike-at-e6':{
  title:'Turn a pawn advance into a target.',tag:'Diagonal access',unit:'2 · Bring reinforcements',coach:'Open the h5–e8 diagonal.',
  prompt:'White to move. Sacrifice the d4-knight on e6, then use the queen and bishop to enter the weakened position.',
  concepts:[['A pawn move cannot be taken back','Black’s g-pawn has advanced and White has captured it with the f-pawn. The diagonal from h5 toward e8 is now available.'],['Give the attack a second piece','After the queen check, Bb5 develops the bishop onto a diagonal toward d7. The point is coordination, not repeated checks by one piece alone.']],
  rules:['Notice diagonals opened by pawn exchanges','Calculate the pawn recapture before sacrificing','Bring a second attacker toward the exposed king'],
  notes:['The d4-knight takes the e6-pawn, inviting Black to move the f7-pawn away from the king.','Black accepts with the f-pawn. The h5–e8 diagonal is clear.','The queen checks from h5 along the newly opened diagonal.','Black moves the king to f8 and forfeits castling.','The bishop develops to b5, aiming through c6 at the knight on d7.'],
  question:'Which change makes Qh5+ possible?',options:['A rook has reached h5','Black’s queen has been captured','The g-pawn has left g7 and the f-pawn has left f7'],answer:2,
  reason:'The line h5–g6–f7–e8 is clear after the pawn movements. The queen can check the king on e8.',
  takeaway:'When a pawn shield changes, retrace the diagonals to the king before choosing your candidate move.'
 },
 'bring-the-rook-with-tempo':{
  title:'Castle into the attack.',tag:'Rook coordination',unit:'2 · Bring reinforcements',coach:'Connect king safety and rook activity.',
  prompt:'White to move. Follow the f7 sacrifice, bring the bishop to e6 with check, and castle before activating both rooks.',
  concepts:[['Check which pieces are missing from the attack','The knight on e5, bishop on h3 and queen on g3 are active. The h1-rook still needs a route into play, while White’s king remains on e1.'],['Castling can be an attacking move','In this line, castling protects the king and brings a rook to f1. The d1-rook then captures on d7, and the newly activated rook follows it onto the d-file.']],
  rules:['Do not forget your own king during an attack','Castling changes two pieces in one turn','After a sacrifice, look for a second wave of attackers'],
  notes:['The knight captures f7 and offers itself to draw the king forward.','The king accepts on f7.','The h3-bishop takes e6 with check along e6–f7.','The king returns to f8, but it cannot restore its castling rights.','White castles. The king is safer and the h1-rook becomes active on f1.','Black’s queen moves to c8, keeping contact with d7 along the diagonal.','The d1-rook captures the knight on d7. White keeps the central files open at a material cost.','The f6-knight recaptures on d7.','The other rook moves from f1 to d1, continuing pressure along the open file.'],
  question:'What does White gain from castling here?',options:['King safety and activation of the h1-rook','An automatic check on the black king','Permission to move twice on the next turn'],answer:0,
  reason:'Castling brings the king to g1 and rook to f1. That rook can later use the open d-file.',
  takeaway:'An attack becomes stronger when a useful developing move also improves your own king’s safety.'
 },
 'break-through-the-center':{
  title:'Release your pieces with a pawn break.',tag:'Pawn breakthrough',unit:'1 · Open the routes',coach:'Use the center to open a diagonal.',
  prompt:'White to move. Recapture on e4, advance the g-pawn, then open the center with d5 and bring the queen into the attack.',
  concepts:[['A central break changes more than one file','Black has just captured on e4. White can recapture with the bishop, then use the mobile d-pawn to free the c3-knight and queen.'],['Calculate the geometry after exchanges','After d5 and ...exd5, Nxd5 clears c3. The queen can then move from d2 to c3 and give check along the diagonal toward g7.']],
  rules:['Compare which pieces gain scope after a pawn break','Recalculate diagonals after every exchange','Use active pieces before the opponent finishes reorganizing'],
  notes:['The bishop recaptures on e4 and attacks the rook on a8 along the diagonal.','Black’s rook moves to b8.','The g-pawn advances to g5, gaining space and challenging Black’s shelter.','Black closes the immediate pawn contact with ...h5.','The d-pawn breaks through to d5, challenging e6 and opening central routes.','Black exchanges the e6-pawn for the pawn on d5.','The knight recaptures on d5 and clears c3 for the queen.','Black develops the d7-knight to c5.','The queen moves to c3 with check along c3–d4–e5–f6–g7.','The king retreats to h7. White’s central break has turned into direct king pressure.'],
  question:'Why can the queen use c3 near the end of the line?',options:['Queens may jump over knights','The c3-knight has moved to d5','Black has removed White’s queen'],answer:1,
  reason:'Nxd5 clears c3. With the e6-pawn also gone, Qc3+ uses the diagonal toward the king.',
  takeaway:'Choose a pawn break by the routes it opens for your pieces, not only by the pawn it attacks.'
 },
 'cut-off-the-defenders':{
  title:'Build a barrier between the armies.',tag:'Positional sacrifice',unit:'1 · Open the routes',coach:'Judge the defenders that can actually arrive.',
  prompt:'White to move. Play the knight sacrifice on d5, then recapture with the e-pawn and inspect the new pawn barrier.',
  concepts:[['A defender can exist but still be too far away','Several black pieces are concentrated on the queenside. Their ability to help the king depends on clear routes through the center.'],['A sacrifice can restrict the opponent','After Nd5, ...exd5 and exd5, White’s pawns control important central squares, including e5 and e6. The compensation is positional attacking access, not an immediate mate.']],
  rules:['Count available defenders rather than all enemy pieces','Pawn control can close routes without occupying them','A positional sacrifice needs a continuing plan'],
  notes:['The knight jumps to d5, offering itself to alter Black’s central pawn structure.','Black accepts the knight with the e6-pawn.','The e4-pawn recaptures on d5. White’s pawns on d5 and f4 control e6 and e5, restricting central routes.'],
  question:'What is the main purpose of Nd5 in this study?',options:['To force checkmate in one move','To win the black queen immediately','To use a new pawn structure to restrict Black’s defenders'],answer:2,
  reason:'The exchange produces central pawn control that makes it harder for Black’s queenside pieces to join the defense.',
  takeaway:'After a sacrifice, assess which routes have opened for you and which routes have closed for the opponent.'
 },
 'use-the-long-diagonal':{
  title:'Invade along the long diagonal.',tag:'Queen and rook',unit:'2 · Aim the attackers',coach:'See the path from a1 to h8.',
  prompt:'White to move. Black’s bishop has just taken c5. Use Qf6, bring the rook to d8, then find the queen check.',
  concepts:[['A long diagonal is an invasion route','White’s queen and bishop can use the dark squares around the black king. Black’s bishop has left e7 to capture on c5, changing the defense.'],['Deflect before delivering the check','The rook’s entry on d8 asks Black to deal with a new problem. After ...Qe7 in the study line, the queen can reach h8 with check, supported by the bishop on e5.']],
  rules:['Trace a complete route to the king','Coordinate queen entries with bishop support','A quiet rook move can prepare the decisive check'],
  notes:['The queen reaches f6 on the long dark-square diagonal, approaching the king.','Black’s rook moves from f8 to g8.','The rook invades d8 along the open d-file, attacking the bishop on c8.','Black’s queen moves to e7 in the selected continuation.','The queen reaches h8 with check. The bishop on e5 supports h8 along the long diagonal.'],
  question:'Which piece supports the queen on h8?',options:['The bishop on e5','The rook on a1','The pawn on b2'],answer:0,
  reason:'The bishop on e5 controls f6, g7 and h8. Queen and bishop cooperate on the same diagonal.',
  takeaway:'Before entering near the king, identify the piece that supports your invasion square.'
 },
 'build-an-attacking-outpost':{
  title:'Move the knight where it matters.',tag:'Attacking outpost',unit:'2 · Aim the attackers',coach:'Turn a distant knight into a kingside attacker.',
  prompt:'White to move. Reroute the knight through d8, exchange the rooks on a4, and establish the knight on e6.',
  concepts:[['An advanced square is not automatically useful','The c6-knight is far forward but not yet working with the kingside pieces. A good attacking square must influence the area where the attack will happen.'],['Pay attention to the route','Nd8 makes Ne6 possible. The d5-pawn supports a knight on e6, which attacks g7 and controls squares near Black’s king.']],
  rules:['Choose an outpost by its targets and support','Check the opponent’s counterplay during a reroute','Coordinate the queen with the relocated knight'],
  notes:['The knight goes to d8, preparing to enter e6 on the next knight move.','Black pushes the b-pawn to b4, creating queenside counterplay.','The rook captures Black’s rook on a4 before the queen recaptures.','Black’s queen takes the rook on a4.','The knight reaches e6, protected by the pawn on d5 and attacking the bishop on g7.','Black’s queen moves to a3.','The queen goes to f2, aiming along the f-file and supporting the kingside attack.'],
  question:'What makes e6 more useful than c6 for this attack?',options:['A knight on e6 cannot ever be captured','It has pawn support and attacks the kingside defenders','It allows the knight to move like a bishop'],answer:1,
  reason:'The d5-pawn protects e6. From e6 the knight attacks g7 and can cooperate with the kingside pieces.',
  takeaway:'A useful outpost combines security, concrete targets and cooperation with the rest of your pieces.'
 },
 'remove-the-dark-square-bishop':{
  title:'Exchange the key defender.',tag:'Defender removal',unit:'1 · Identify the defender',coach:'Notice which bishop protects the dark squares.',
  prompt:'White to move. Capture the bishop on e5, exchange on d8, then develop the c1-bishop with check.',
  concepts:[['Identify the piece holding the position together','Black’s bishop on e5 attacks White’s queen, but it also protects dark squares around the king. Removing that bishop changes which squares White can use.'],['Count the whole exchange','Qxe5 is followed by ...dxe5 and Rxd8+. The rook captures Black’s queen. Evaluate the full sequence rather than stopping when White’s queen disappears.']],
  rules:['Trace every capture through to the end','A defender’s value depends on the squares it protects','After exchanges, look for a new square for your own bishop'],
  notes:['The queen captures the dark-square bishop on e5, deliberately allowing a pawn recapture.','Black’s d6-pawn takes the queen. The d-file is now clear.','The rook captures Black’s queen on d8 with check, completing the queen exchange.','Black’s king takes the rook on d8.','The c1-bishop develops to g5 with check along g5–f6–e7–d8.','The king returns to e8.','The bishop reaches f6, using dark squares that Black’s exchanged bishop can no longer contest.'],
  question:'Why should Qxe5 not be judged after just ...dxe5?',options:['White is allowed an extra turn','The game ends whenever a queen is captured','Rxd8+ captures Black’s queen in the continuation'],answer:2,
  reason:'The combination includes the capture on d8. Stopping the calculation after losing White’s queen gives an incomplete material count.',
  takeaway:'When sacrificing to remove a defender, count the complete exchange and then reassess the weakened squares.'
 },
 'open-the-g-file':{
  title:'Turn a pawn hook into an open file.',tag:'Pawn shield',unit:'2 · Break through',coach:'You play Black: use the h3 hook.',
  prompt:'Black to move. White has just played h3. Offer the bishop on h3, then bring the queen and rook toward the king.',
  concepts:[['An advanced pawn can become a capture target','The h3-pawn can be attacked by the bishop on g4. If White recaptures with the g-pawn, the g-file opens toward the king.'],['Use the open route immediately','The rook on e5 can swing to g5 with check. The queen then reaches c6 with another check along the diagonal to h1.']],
  rules:['Look for pawn hooks near a castled king','Calculate which file opens after a pawn recapture','Connect a sacrifice with a rook lift or queen entry'],
  notes:['The bishop captures h3, inviting White to move the g2-pawn away from the king.','White accepts with the g-pawn, opening the g-file.','The queen moves to d7, preparing to join the attack.','White retreats the e2-bishop to f1.','The rook swings from e5 to g5 with check down the open g-file.','White’s king escapes to h1.','The queen moves to c6 with check along c6–d5–e4–f3–g2–h1.'],
  question:'Why can ...Rg5+ check the white king?',options:['The g2-pawn has moved to h3, opening the file','A rook can jump over the g2-pawn','Black’s queen has captured the king'],answer:0,
  reason:'After gxh3 the g-file has no white pawn blocking the rook. The rook on g5 attacks the king on g1.',
  takeaway:'Before accepting a piece near your king, inspect the file and diagonal that your recapturing pawn will abandon.'
 },
 'distract-the-queen':{
  title:'Create a second threat on the back rank.',tag:'Deflection',unit:'1 · Identify the defender',coach:'A rook entry can be stronger than a recapture.',
  prompt:'White to move. Exchange on b5, then place the other rook on d8 and study how the queen joins the attack.',
  concepts:[['Start with the opponent’s immediate threats','Black has an active rook on b5 and bishop on d4. White can exchange that rook, but must calculate the bishop’s capture on e3 as well.'],['Keep looking after material is offered','In the book’s analysis, Rd8 places a rook on the back rank instead of trying to restore every piece immediately. After ...Qxb5, Qd6 coordinates with that rook and threatens to enter on f8.']],
  rules:['Calculate the opponent’s active captures','Look for back-rank threats when the king has little room','Distinguish an analysed opportunity from the moves actually played'],
  notes:['White’s b1-rook captures the black rook on b5.','Black’s bishop captures the bishop on e3, creating an active threat of its own.','The remaining rook enters d8, threatening to capture on f8 with pressure on the king.','Black’s queen captures the offered rook on b5 in the analysed line.','The queen goes to d6, coordinating with the rook on d8 and threatening Qxf8+.'],
  question:'What should you calculate before accepting the rook on b5?',options:['Only how many pawns remain on the queenside','The back-rank threats from Rd8 and Qd6','Whether castling can be played twice'],answer:1,
  reason:'The offered rook is only part of the position. White’s other rook and queen can create threats against f8 and the king.',
  takeaway:'When material is offered, search for the opponent’s next threat before counting your profit.'
 },
 'deflect-the-f7-defender':{
  title:'Attack what the rook stops defending.',tag:'Deflection and fork',unit:'2 · Break through',coach:'Check the rook’s old job.',
  prompt:'White to move. Reposition the queen and d4-knight, then use two knight checks to win access to d7.',
  concepts:[['A defensive move can abandon another duty','Black’s f8-rook helps protect f7. When it moves to e8 in the study line, it changes which tactical resources are available to White.'],['Calculate the second knight check','After Nf5 and ...Bf8, Nh6+ draws the g-pawn away. Nf6+ then attacks the king and rook together, before White captures the d7-pawn.']],
  rules:['Compare a defender’s old duties with its new square','Check forcing moves from both knights','A sacrifice should produce a concrete threat after the recapture'],
  notes:['The queen retreats to f3, reorganizing while keeping pressure on the center.','Black’s f8-rook goes to e8, leaving its old defensive position.','The d4-knight reaches f5 and aims at h6 and e7.','The bishop retreats from e7 to f8, trying to reinforce the king.','The f5-knight checks from h6, offering itself to the g-pawn.','Black accepts with the g7-pawn. The pawn shelter changes again.','The other knight checks from f6 and forks the rook on e8.','Black’s king moves to h8.','The d1-rook captures d7, invading the seventh rank while the knight keeps pressure on e8.'],
  question:'What does the knight on f6 attack after Nf6+?',options:['Only an undefended pawn on a7','The king on g8 and the rook on e8','Both white rooks'],answer:1,
  reason:'From f6 the knight attacks g8 and e8. Black must answer the check while the rook is also threatened.',
  takeaway:'After a defender changes squares, look for a forcing move that exploits its old task and its new exposure.'
 },
};
export const TAL_COURSE_INFO=[
 {id:'talcenter',title:'Hunt the Uncastled King',path:'/learn/tal-king-in-the-center/',order:1,kicker:'Expose the king',description:'Turn a lead in activity into a direct attack. Practice sacrifices on f7 and e6, forcing queen checks, and rook coordination.',benefits:['Four game positions, one clear plan at a time','Understand what each sacrifice opens','Connect the first check to the next attacker'],art:'king'},
 {id:'talinitiative',title:'Build the Initiative',path:'/learn/tal-build-the-initiative/',order:2,kicker:'Coordinate the attack',description:'Learn how central breaks, pawn barriers, diagonals and knight outposts bring your whole army into the attack.',benefits:['Open routes with a well-timed pawn break','Restrict the opponent’s reinforcements','Create an outpost that attacks useful targets'],art:'knight'},
 {id:'taldefense',title:'Break the King’s Defenses',path:'/learn/tal-break-the-defenses/',order:3,kicker:'Remove the obstacles',description:'Identify the key defender, open the pawn shield, and calculate deflections before committing to a sacrifice.',benefits:['Remove a bishop that holds the position together','Practice a kingside attack as Black','Find back-rank threats and knight forks'],art:'rook'},
];
export const TAL_LESSONS=positions.map(position=>{
 const t=teaching[position.id];
 if(!t||t.notes.length!==position.moves.length)throw new Error(`Missing Tal teaching notes: ${position.id}`);
 const course=TAL_COURSE_INFO.find(c=>c.id===position.course);
 return {...position,courseId:position.course,title:t.title,tag:t.tag,unit:t.unit,course:course.title,subtitle:t.prompt,
  concepts:t.concepts.map(([title,text])=>({title,text})),guide:{rules:t.rules},
  notes:()=>t.notes,takeaway:t.takeaway,
  quiz:{question:t.question,options:t.options,answer:t.answer,explanation:t.reason},
  study:{title:t.title,start:0,coach:t.coach,prompt:t.prompt,goals:t.rules.slice(0,2)},
  source:`${position.game}. Attack with Mikhail Tal, printed p. ${position.printed}; supplied PDF ${position.pages.length>1?'pages':'page'} ${position.pages.join(', ')}.`,
 };
});

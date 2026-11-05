# Coaching with Show me

The shared analysis coach now leads with three short answers: what the move
changes, the opponent's immediate reply, and a genuinely different improvement
when the existing classification supports one. The evaluation, engine candidate,
full explanation, takeaway and full legal lines remain in **Learn more**.
Move classes, accuracy calculations, review depth, lessons and saved progress
are unchanged.

Explanations use legal chess.js moves and the existing Stockfish evidence. New
observable ideas include open files, passed pawns, king activity in pawn endings
and a newly added defender. The latter is described only after validating an
actual enemy capture and legal recapture by the moved piece. A capture in a
later continuation is labelled later. Queen exchanges keep their order and
report the material exchanged. Sparse evidence receives a short, conservative
explanation rather than an invented cause.

## One board, temporary demonstration

`createCoachDemo` in `src/coach-demo.js` is a reusable, data-driven controller.
It validates every supplied ply before replacing an active session, then shows
up to four plies for **Show me** (one is enough for an immediate mate). Full-line
buttons support manual navigation through the existing six-ply evidence.

The same board displays these frames without writing original game history,
evaluations or an explored branch. Coaching context stays anchored to the
original decision. For a weaker move, the default demonstration begins after
that move and shows the opponent's reply. A matching best move is shown from
before the move. Other sound moves show the move actually played followed by
the validated reply, rather than silently substituting a different candidate.

There is one temporary arrow for the next move and one primary sound when a
displayed legal move changes. No sound plays at initialization. The existing
Back/Next controls step the demonstration; Pause, Play, Replay and Done control
its lifecycle. Generation guards discard cancelled timers. Reduced motion starts
with manual stepping, and backgrounding, dialogs and board interaction pause
playback. Done restores the exact previous review or branch and its review-run
state. Escape from demonstration controls also finishes and restores focus.

Tapping or dragging a piece transfers the shown position into the existing
inline analysis with its legal history; piece selection itself starts no
engine. The learner can play either side and Undo normally. Original PGN and
review evidence remain intact. No separate board or persistent mode button was
added.

The transient instruction area has a stable height across steps. It appears
above the mobile board and beside the desktop board. Focus mode uses the same
controller. Demonstration positions without engine evaluations show an unknown
value and neutral bar, rather than an old or invented evaluation.

## Verification

Focused tests cover ordering, invalid continuations, stale timers, pause/replay,
silent initialization, unique move-sound events, capture, castling, en passant,
promotion, checkmate, pawn endings, legal defensive recaptures and manual takeover.
The existing coach, accuracy, Brilliant and move-validation regressions remain.

Browser checks use real retained Stockfish evidence for the Opera sacrifice and
queen exchange, plus freshly computed depth-18-or-better evidence for a forced
mate, pawn ending, promotion and castling. They exercise PGN import, Short
explanation → Show me → Next/Back → Done, auto playback, pause/replay,
tap/drag takeover during search, Undo, route cancellation, Focus, keyboard
activation/focus restoration and reduced motion.

Layouts are checked at 360, 390 and 430 pixels, 844×390 landscape and 1280×720
desktop. Board geometry remains square with no horizontal overflow. On short
screens normal document scrolling remains available; no navigation overlay
covers squares. Mobile checks are browser emulation, not a physical iPhone or
iOS Safari. Local scripts, real search evidence and screenshots are under
`.sites-local/verification/coach-demo/` (ignored).

These explanations describe observed features and a searched continuation.
They do not guarantee a forced outcome where the evidence does not prove one,
or claim to expose Stockfish's internal reasoning.

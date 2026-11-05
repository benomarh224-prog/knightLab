# Analysis quality and coherent engine evidence

Deep review is now the default: full-strength Stockfish 19 Lite, two principal
variations, target depth 18. An explicitly saved quality preference is retained.
Standard targets depth 16. Fast preview remains available, visibly provisional.
The Lichess accuracy formula and move-classification thresholds are unchanged.

Opening the floating coach requests depth 20 for the positions immediately
before and after the selected move. Navigation while the coach is open updates
that request. The same serial review queue handles these searches; it does not
start a second worker. Pausing cancels both review and inspection. A run attempts
each request once, so an underpowered device cannot enter an infinite retry.

Searches have time ceilings (initially 6 seconds for depth 16 and 20 seconds for
depths 18/20).
Reaching the time limit does not count as reaching the depth. Resume doubles the
budget, capped at 80 seconds. Deeper existing evidence is never downgraded.
The transposition table is reused between positions in the same game.

## Matching move, score and continuation

UCI can finish during a partially reported MultiPV iteration. Previously the
last primary score could be combined with a different final bestmove. The
adapter now groups exact scores by depth and PV index, selects evidence whose
first move matches the reported bestmove, and prefers a completed primary and
alternative pair from the same iteration. It validates the main continuation
with chess.js from the exact root FEN. Missing matching evidence is an actionable
retry error, never a fabricated score/PV pair. Reduced-skill Play exposes four
candidates so the deliberately weaker chosen move retains its own score and PV.

Reference: [official Stockfish UCI documentation](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html)
(MultiPV, Skill Level, position history and depth/movetime limits).

## Exploration and persistence

Free analysis targets depth 18 for the selected move's before/after positions.
It deepens shallow scores rather than treating any finite result as sufficient.
An idle initialized worker survives accepted moves and navigation. A new move
interrupting an active search disposes of that search; run and snapshot checks
prevent stale writes. Selection stays silent and movement remains legal while
searching. Errors dispose of the failed worker and allow a fresh retry.

The existing review-cache key, PGN/mode identity and lesson-progress keys are
preserved. Newly coherent evidence stores searchVersion 2 and its root FEN.
Earlier cached scores remain visible but are marked legacy and re-reviewed
before they can count as completed accuracy evidence. Terminal outcomes remain
valid. No lesson progress is reset.

## Limits

Depth is a search criterion, not a guarantee of perfect chess or agreement with
Chess.com. More search uses more device time and energy. The coach remains a
conservative explanation of legal continuations and observable board features;
it does not claim to expose Stockfish's internal reasoning. Whole-game accuracy
still uses independently evaluated positions, so deeper evidence can change it.
No server analysis, cloud engine, tablebase or paid service was introduced.

## Verification (2026-11-05)

- 275 Node tests passed, including real Stockfish searches at all four Play
  difficulty levels, forced mate, repetition, cancellation, coherent MultiPV
  evidence, stale results, cache migration and independent accuracy regressions.
- Cold browser Opera Game review: 34/34 positions, 33/33 moves, all non-terminal
  evidence at depth 18; approximately 76–80 seconds on the test machine. No
  further retry was needed with the final budget. This is a local measurement,
  not a performance promise for other devices or games.
- Coach inspection reached depth 20 for both positions around 10.Nxb5. Its
  recommendation matched its validated PV. Free analysis played the engine
  idea and a reply, retaining depth-18-or-better evidence. Reload and Resume
  retained the completed review.
- Browser layouts checked at 360, 390, 430, 844×390 and 1280×720: square board,
  no horizontal overflow. Floating-coach Escape, focus restoration and Enter
  activation passed. Human e4 received legal engine replies at Beginner,
  Casual, Challenging and Strong without runtime exceptions.
- UI binding/CSS validation: 405 unique IDs, no missing bindings or warnings.

Artifacts and repeatable browser scripts are in the ignored local directory
`.sites-local/verification/strong-analysis/` and `.sites-local/strong-*.mjs`.
The browser was an isolated installed Chromium-family executable with mobile
viewport emulation. No physical iPhone, iOS Safari or Firefox was tested.

# Brilliant move classification — 2026-11-05

ROQVYN now exposes Brilliant (!!) as a distinct category in piece badges, the compact/floating coach, move tables and legends, key moments, White/Black statistics and combined totals. It is recomputed from retained engine evidence, so existing review storage does not need migration. Accuracy formulas and the pre-existing Best/Great/Good/error thresholds are unchanged.

## Independent rule

This conservative heuristic is inspired by the general idea of a sound piece sacrifice, described in [Chess.com's public classification documentation](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc). It is not a reproduction of Chess.com's proprietary, rating-sensitive classifier, and matching its labels is not promised.

All gates must pass:

- A legally replayed knight, bishop, rook or queen move, matching the engine's first choice. The supplied before/after FENs and mover must match exactly. The mover has more than one legal option.
- Both evaluations have depth at least 16, finite scores and validated legal PVs. Mate scores must also agree with their White-normalized sign and bounded mate representation. Before and after PVs must begin with their reported best move, and include at least three plies or reach checkmate/stalemate earlier. Only the first 12 PV plies are used.
- At most 30cp evaluation loss from the mover's perspective, no worse than -50cp afterward, and no reported forced mate against the mover. This gates the new label; existing classifications remain unchanged when it fails.
- A same-depth second candidate exists, trails by at least 50cp and evaluates below +300cp for the mover. This avoids rewarding a gratuitous sacrifice when the alternative is already decisively winning.
- The opponent can legally capture the moved piece. Pinned attackers and illegal king captures do not count. A bounded static exchange calculation on that square, including initial capture gain, legal recaptures and promotions by recapturing pawns, still shows at least 100cp of material conceded. Equal exchanges and poisoned captures therefore fail. The search is capped at 10 recapture plies and 256 nodes; exhausted searches are unknown and do not award Brilliant.
- Pawn moves, promotions, castling and immediate checkmates are excluded. The current rule focuses on the moved piece; indirect sacrifices of a different piece and delayed offers can be missed.

Static exchange evidence is not represented as a Stockfish continuation. The coach distinguishes a legal acceptance from the engine's actual reply, and says when an acceptance is the opponent's only legal reply. Clicking a continuation reuses matching position evidence until its path diverges, avoiding needless searches and a temporary loss of the verdict.

Fast/Standard review may not reach the evidence depth. Deep review targets 18 and is recommended for checking sacrifices. Insufficient evidence retains the existing ordinary verdict; it does not invent a Brilliant award. Deeper review may change an earlier classification.

## Verification

- Full suite: 270 tests pass. Added regressions cover knight/rook/queen sacrifices; Black's normalized perspective; forced mates; equal trades, free queen captures, pinned attackers and poisoned recaptures; shallow/missing/illegal PVs; already-winning alternatives; cache invalidation; saved evidence; disjoint counts; unchanged accuracy; coherent coaching and matching continuation evidence reuse.
- Real Stockfish 19 Lite, two PVs, target depth 18: Opera 16.Qb8+ receives Brilliant (queen sacrifice, legal Nxb8, mate retained). The same measured run leaves 10.Nxb5 as Best (62cp before/after variation) and 13.Rxd7 as Great (the second candidate is already +5.42). The rules were not relaxed to turn these into Brilliant. Raw evidence is retained in ignored .sites-local/verification/brilliant/engine-evidence.json.
- Fresh end-to-end review without preloaded evaluations completed all 33 moves at depth 18 in about 65 seconds, produced one Brilliant (16.Qb8+), and rendered complete per-player statistics. No browser exceptions. This verifies the normal review flow in addition to the saved-evidence tests.
- Production build and UI binding validation pass: 405 unique static IDs, zero missing bindings, zero CSS parse warnings. git diff --check passes.
- Isolated Chromium at 360x740, 390x844, 430x844, short landscape 844x390 and desktop 1280x720: teal !! badge and matching coach verdict, legal playback, navigation/reload persistence, separate White/Black counts and combined totals, no horizontal overflow and no browser exceptions. Used actual saved engine evidence from the measured searches, not manually awarded labels. Incomplete game accuracy remains Pending.

Real iPhone/Safari was not available. The rule is intentionally conservative and can miss sound sacrifices; the fixed material values and bounded local exchange are approximations, not a proof of a forced tactical win.

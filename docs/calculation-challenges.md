# Hard calculation challenges — 10 November 2026

The featured set of 120 mate-in-one studies was too easy and repetitive. The
featured homepage, Train and learning-catalog entries now open **Calculation
Lab**, a set of 120 distinct real-game puzzles. Earlier studies remain available
under **Optional mate warm-ups**, with their IDs, completion key, drafts and
positions unchanged. The new course uses `knightlab-calculation-course-v1` and
`/learn/calculation/`; completing the warm-ups cannot complete the new course.

## Content and evidence

- 40 Challenging (source puzzle ratings 1900–2099), 40 Advanced (2100–2299),
  40 Expert (2300–2699). Actual selected ratings: **1906–2690**. These are Lichess
  **puzzle** ratings, not player ratings or independently calibrated ROQVYN ratings.
- 60 White positions, 60 Black positions; 120 different source games. Piece/side
  canonicalization also excludes file mirrors and color-swapped rotations.
- Ten themes, 12 positions each: attraction/deflection, removing defenders, quiet
  resources, double/discovered attacks, pins/skewers/x-rays, sacrifices, longer
  mating attacks, promotion, endgame calculation and defense.
- Each requires 3–6 solver moves: **77 require 3, 31 require 4, 8 require 5, 4
  require 6**. None has a legal immediate checkmate or a source mate-in-two tag.
- Lichess source requirements: popularity ≥80, at least 100 plays, rating deviation
  ≤90. Minimum piece count 12, or 6 for endgames and promotion positions.

Source: [official Lichess puzzle export](https://database.lichess.org/#puzzles),
dated 9 November 2026, retrieved 10 November. It is dedicated to the public domain
under **CC0-1.0**, including commercial use and modification. Original IDs, setup
moves, source FENs, themes and game URLs remain in `src/calculation-puzzles.json`.
The export's first UCI move is the opponent's setup move; it is applied before
building each learner's starting position. It is not a learner solution move.

The official source documents Stockfish NNUE generation at 40 million nodes.
Additional local checks used the project's pinned **Stockfish 19 lite single**:
the root best move must match the selected first move; compare the second candidate
where available; check the line is legal; evaluate the final position or prove its
terminal result. Root searches targeted depth 19, with a bounded four-second search
and minimum achieved depth 16. Actual depths: **99 at 19, 15 at 18, 4 at 17 and 2
at 16**. Nonterminal final-position searches targeted 18, minimum 14. The course
source disclosure reports achieved depths; it does not claim every search reached
19 or that every opponent reply is forced. These are selected source continuations.

## Integration

The shared LessonPlayer handles the new course: immediate practice, automatic
opponent replies, progressive hints, retry, alternatives, free exploration, complete
solution replay and saved partial progress. No quiz or timer was added. Source
ratings and detailed references remain in the existing disclosure. Difficulty
controls now derive their labels from each course's metadata, with one delegated
handler and stable focus during repainting. Existing Tactical Vision levels and
daily-session selection are preserved.

Curated data SHA-256 (LF source representation):
`796ac72dc3460a609140e4b32b0189fb1b9cb67424155f116e039d645c847d08`.
The importer streams only enough of the official Zstandard export to collect 480
candidate records; the verifier selected 120 after checking 131. Candidate caches
stay ignored in `.sites-local/`. Rebuild with Node 24 and the pinned dependencies:

```sh
node scripts/import-calculation-puzzles.mjs
node scripts/build-calculation-puzzles.mjs
npm test
npm run build
```

The live database changes, so rerunning the import may select a different set.
The checked-in records and their verification evidence define this release.

## Verification

**387 tests passed**, including seven new focused checks covering uniqueness,
balances, source setup, legal SAN/UCI and engine variations, all 120 complete
multi-move solves, every replay ply, reloads, hints, off-target versus illegal
feedback, legacy progress isolation, dynamic level controls and route/catalog
integration. Production build succeeds. Local HTTP checks verify the new and
legacy course routes, Train, bundle and cover asset.

Browser Use is disabled in the current Work environment. No new browser layout,
emulation or real-iPhone checks were performed for this content update. Existing
shared board and layout CSS were preserved. Automated focus checks use a DOM test
double and are not a substitute for an actual keyboard/browser session.

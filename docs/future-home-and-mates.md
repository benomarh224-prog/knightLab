# Future home and 24 new mate exercises

The homepage is rebuilt around one typeface (the existing DM Sans), a charcoal hero, a single mint accent, and a chamfer motif taken from the new knight sculpture. It keeps the ROQVYN wordmark and existing light/dark preferences. The generated knight is decorative; game pieces and board colors remain unchanged.

The four-choice learning index changes one real course preview and destination: Beginners, Openings, Tactical Vision or Mate in One. Train exposes the new course directly. Saved daily practice and Continue learning remain real, and the Opera replay is available through a native disclosure instead of occupying the first screen. The homepage measures about three desktop screens, with no added FAQ or duplicate closing banner.

## New exercises

`/learn/mate-in-one/` uses the existing shared lesson player, hints, checkmate dialog, legal free play, replay, completion, and saved drafts. Its 24 original constructed positions are grouped into eight back-rank mates, eight queen-and-king nets, and eight piece-teamwork mates. White and Black each have 12 positions. There are no invented rating equivalents or quizzes.

`scripts/build-mate-puzzles.mjs` deterministically constructs the positions. Every legal first move is played and checked with chess.js; each position has exactly one immediate checkmate. The tests independently repeat that verification and validate the supporting piece's stated attack in the teamwork recaps. This is exhaustive mate-in-one verification, not an attribution to Stockfish or a claim about deeper winning chances.

Existing course IDs, lesson signatures and storage keys are preserved. The new course uses its own `knightlab-mate-course-v1` key. Catalog additions are rendered from course metadata so future courses can use the same system. Progress labels now derive “exercises” or “lessons” from course metadata.

## Verification

- `npm run build`: passed; the new route is generated in `dist/learn/mate-in-one/`.
- **370/370 tests passed**, including all existing course, progress, review and Board Lab checks, plus exhaustive mate validation, shared-player progress/feedback and catalog isolation.
- **47 browser assertions passed**: four course-preview selections, direct entry to the new exercise board, legal off-target feedback, a destination-free first hint, checkmate/free-play choice, reload persistence, solution replay, representative solutions and solver orientation for all three groups and both colors, Tactics/Train discovery, the five-frame Opera sample, Analyze entry, reduced motion and no browser exceptions.
- Light/dark layouts at **360×800, 390×844, 430×932, 844×390, 1280×720 and 1440×900**: no horizontal overflow or homepage targets below 44px.
- **11 additional layout assertions passed** after the final typography fix: two-line headline after fonts load at all six sizes; square new-lesson board with navigation clear of all squares at five sizes. The existing phone lesson controls sit above the board in the coach area; desktop controls sit below it.
- Final design inspector at 1440, 768 and 390px: **0 failures**, with all six screenshot outputs inspected. Two warnings remain: ten inherited/responsive type sizes and no video. A single font and real interactive course selector provide the hierarchy; unrelated footage would add loading and distraction.
- Tests used Chrome on Windows with emulated mobile viewports, **not real iPhone, Safari, Android or Edge testing**. No full depth-19 review or every pre-existing course completion was rerun in the browser; those systems retain their existing regression coverage.

Screenshots: [desktop](screenshots/future-home/desktop.jpg), [phone](screenshots/future-home/mobile.jpg), [dark phone](screenshots/future-home/mobile-dark.png), [new exercise](screenshots/future-home/mate-mobile.png).

## Design and imagery

Direction: **One motif**, seed **1261807095**. The initial folder-stack hero was redrawn because five overlapping tabs/colors conflicted with the user's simplicity request. The replacement's shaped stage holds the new knight render; the actual game UI remains in the optional sample. The brand's DM Sans replaces the old home display serif. The live element is the actual course selector; no marketing statistics or customer proof were invented.

The built-in ImageGen asset is saved at `src/assets/roqvyn-knight-future.png`; its final prompt is recorded in [the asset ledger](../src/assets/README.md). No CLI image generation was used. Existing supplied/generated course covers retain their prior credits. The SVG course cover is original code. No replacement sample content is required.

Final visual critique: design 7.5, usability 8.5, creativity 7, content 8 → **7.8/10**. The knight motif is shared by the chess category, so creativity is capped at 7; this is not a claim of exclusive imagery or an award. Remaining limits are reused course-cover styles and a small number of secondary inherited type sizes.

## Publication

The user explicitly approved publication of this reviewed redesign and the 24 new exercises on 2026-11-10. Publish to the existing Sites project and GitHub/Vercel targets, preserving their audience and settings. Verified source baselines: Sites `8ec900b127e3d459345a9d18b4f3ec44919b11a4`, GitHub `df4a8c63da309001f220d49a418e88cc1c2a2067`. The deployment response and post-publication checks establish the actual release status.

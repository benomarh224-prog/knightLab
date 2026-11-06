# Calm study workspace — 2026-11-05

## Changes

- Analysis accepts both sides on the existing board. Removed the return-to-game button. The ordinary move strip includes the original prefix plus the explored continuation. Back to the branch root exits exploration; Next follows the original game. Independent Undo stays inside the branch. Original PGN and review evidence remain unchanged. Merely selecting a piece retains the current move coach and does not launch an engine.
- Position analysis is labelled separately from game-review progress. Variation tools stay collapsed unless requested, a promotion needs a choice, or an engine error needs recovery.
- Added one shared lesson Coach dialog for every current and future lesson. Mobile practice tools and the existing Learn more disclosure move into that dialog; their handlers and saved progress are retained. On desktop, practice guidance stays adjacent to the board, with full explanations available through Coach.
- Hint opens the coach without scrolling the document to a separate explanation. Hint text is not duplicated beneath the board. Escape, outside click, close and Continue on the board dismiss the dialog. Focus returns to its opener, or Coach when the last hint has disabled its opener.
- Mobile lessons keep one instruction above a square board, controls beside its bottom edge, and equal Previous/Continue columns in document flow. The coach never participates in board sizing. Short screens scroll normally.
- Stone page ground #F4F3F1, white panels, charcoal #24272B controls/header, quiet blue study feedback. ROQVYN logo, supplied course illustrations, forest/ivory chessboard, piece artwork and semantic chess verdict colours are retained. Shared theme applies to Home, Learn, Analysis, Training and Play.

## Verification

- Full Node test suite: **258 passing**, including five new regressions for original-prefix navigation, retaining/replaying a branch across its root, custom-FEN score alignment, live lesson-tool relocation, and coach dismissal/focus fallback.
- Build succeeds. UI binding check: 404 unique IDs, zero missing bindings, zero CSS parsing warnings. git diff --check passes.
- Isolated Chromium browser with mobile viewport/touch emulation: 360x740, 390x844, 430x844, short landscape 844x390, and short desktop 1280x600. Every tested board has 64 clickable squares, square geometry, zero horizontal overflow, and no fixed lesson footer overlap. Dialog bounds remain within the viewport.
- Complete pawn lesson: guided example → independent exercise → progressive hints/Coach/More → legal off-target feedback → correct capture → Check → Continue. Saved completion survives reload.
- Every current course: Coach, Hint, close without changing the position, accepted legal study move, no overflow. Beginners e4; French e6; Tactics Ng6+; Italian Nf3; Scotch d4; Tal courses Nxf7, Bxe4, Qxe5. Additional endgame practice: opposition Ke5.
- Sample review → original first position → both-side free continuation → Back to the root → Next resumes the original game. Original game remains available through More → Game moves. No browser exceptions.
- Screenshots/results are in ignored .sites-local/verification/calm. Design before/after capture in .sites-local/taste-refine. Automated style inspection confirms removal of gradient header/button shadows and improved phone margins; it still flags existing course-state icons, the preserved serif/monospace typography, hidden-page microcopy and a false no-title result despite the visible lesson h1. These are not reported as a passing design audit.

## Limits

Browser testing uses an isolated installed Chromium with emulation, not a physical iPhone or Safari. This change has no server/API/schema migration: lesson progress stays in the existing browser storage, and Stockfish runs locally. No accuracy formulas, move-classification thresholds, chess rules, completion requirements or audio assets changed.

# ROQVYN learning and analysis reliability

Implemented and verified locally on 7 November 2026. The public site was inspected first. Publication of this verified version was explicitly authorized in the follow-up request.

## Lesson replay

- Completed exercises have a direct **Replay** action beside the board. It plays every solution ply, including the opponent's replies, with Pause and manual Previous/Next controls.
- Reviewing uses a separate saved cursor. It never replaces the learner's practice position, earned completion, answers or hints. Reload resumes the review position without starting playback or audio.
- Navigation, manual moves and leaving the course stop playback. A checkmate dialog is triggered by an accepted move, rather than reopening when a solved position is revisited or replayed.
- Disabled placeholder move buttons are hidden during practice; full move navigation remains available during review.

Shared implementation: `src/lesson-player.js`, `src/lesson-ui.js`, `src/lesson-checkmate.js`, and the existing autoplay controller. This applies to all current course activities and future lessons using LessonPlayer.

## Coaching and exercise organization

- `src/tactical-facts.js` validates the move against its exact FEN before identifying observable double attacks, absolute pins, discovered checks, promotions or mate. It does not claim that an attack guarantees a material win.
- `src/lesson-insight.js` separates the move played from the selected legal study reply. Practice does not reveal the learner's next unsolved move. Completed lines are clickable in the coach and synchronized with the board.
- A study continuation is explicitly labelled as selected legal moves; it is not presented as proof that every reply is forced. Existing authored lesson explanations remain in Learn more.
- Legal alternatives receive neutral objective feedback. A **Compare with Stockfish** action requests deeper evidence when needed, with loading and retry states. Provisional searches are not cached as verified explanations. Workers are disposed after success, failure or cancellation.
- Tactical exercises are grouped by verified motifs, with descriptive titles and move counts. Existing Beginner/Intermediate/Advanced levels remain. Shorter lines come first within each topic and level; this is an ordering heuristic, not a new rating estimate.
- Raw lesson content, IDs, progress keys and lesson signatures are unchanged. Display metadata and ordering are derived separately, so saved drafts and completed lessons remain valid.

## Review access, loading and layout

- **Summary & accuracy** is directly accessible from the mobile board and from visible desktop tabs. White/Black performance, combined totals and provisional states retain their existing meaning and scoring method.
- Initial Stockfish loading has an explicit status. Failed analysis has a visible Retry action on the board and in the review panel, retaining evidence already calculated. Fully cached reviews do not initialize a worker.
- Mobile course drawer titles now remain visible after moving the outline into its dialog. Controls retain at least 44px touch surfaces, readable text and normal page scrolling.
- The analysis status area reserves a consistent footprint for loading, progress and retry. View shortcuts sit in their own row, apart from player names. The starting-position move label no longer duplicates “Start”.
- Build output now loads one minified CSS bundle instead of the individual stylesheet links, preserving their cascade order. Current source CSS is about 360 KB; the generated bundle is about 321 KB before compression. No latency improvement is claimed from unmeasured timings.

## Verification

`npm run build`: passed. `npm test`: **352 passed, 0 failed**. `git diff --check`: passed.

New regression checks cover all 212 current lessons' legal solution plies, separate replay/practice persistence, autoplay including opponent replies, verified tactical facts, spoiler-safe response ordering, curriculum ordering without signature changes, worker disposal and a meaningful retry budget. Existing same-move recommendation, Opera queen-exchange order, accuracy/perspective/mate, legal chess moves and completion tests also pass.

Isolated Chromium browser tests against the running local build:

| Flow | Result |
| --- | --- |
| Beginner rook movement → legal off-target move → correct move → Check → saved completion | Passed; off-target attempt does not launch Stockfish automatically |
| Optional alternative comparison | Passed with real Stockfish at depth 16; Ra2 stays a legal alternative, Rxa5 is explained as the lesson choice, and Kf7 is distinguished from the later pawn capture |
| French Defense foundations; Scotch Gambit opening sequence | Passed; legal completion, replies, reload, review and clickable coach continuation |
| Tactical Vision beginner-03, seven plies ending in mate | Passed; all plies replay, final state, Pause, Back/Next, no repeated mate interception |
| Beginner king-and-pawn endgame support-your-pawn | Passed; board exercise, Check, saved completion and review |
| Tactics outline | Passed; visible grouped titles, progressive line length within levels |
| Analyze → labelled Opera sample → real Stockfish fast preview → Summary | Passed; 33/33 moves reviewed, separate White/Black accuracy, explicitly provisional |
| Invalid PGN | Rejected with a visible validation error |
| Simulated first worker-load failure → Retry → real Stockfish mate review | Passed; actual depth 19 reached, mate-safe statistics, reload retains complete evidence without a new worker |
| Keyboard | Lesson board navigation remains covered by the suite; browser verified continuation focus, Enter on mobile Summary, desktop ArrowLeft/Right tabs, Escape/focus restoration for More menus |
| Board Lab | Both existing modes passed in light/dark at six viewports, including five-round sessions, legal route checks, drag/tap, Undo, hints, timed memory, reload, keyboard, reduced motion and viewport-safe menus |

Lesson and analysis layout checks: **360×740, 390×844, 430×844, 844×390 and 1280×720**. Additional visual inspection at **1440×900**. Automatic full-solution playback was separately tested at 360/390/430px and desktop. Board Lab additionally covered 1440×900 in both themes. All inspected boards stayed square with 64 squares, no horizontal overflow and no navigation overlay on squares. Short landscape screens use normal vertical scrolling. No uncaught browser errors were recorded.

Visual inspector: no hard failures. Remaining stylistic warnings concern existing control borders, game status symbols and the intentionally shorter adjacent coach panel; the board is not padded with empty teaching content to equalize the columns. Disabled mobile navigation text was darkened for readability.

## Screenshots and reproducible local evidence

Artifacts are stored under `.sites-local/verification/reliability/`:

- `final/results.json`: complete flow checks and layout measurements.
- `final/footer-layouts.json`: final check against the actual lesson footer bounds at five viewport sizes.
- `final/analysis-390.jpg`, `final/analysis-1280.jpg`, `final/sample-summary.jpg`: mobile/desktop review and accuracy.
- `final/tactics-groups.jpg`, `final/tactics-beginner-03-review.jpg`: course outline and clickable solution evidence.
- `final/analysis-retry.jpg`: simulated failure with visible Retry.
- `final/alternative.json`, `final/alternative-stockfish.jpg`: actual optional engine comparison; also verifies practice placeholders stay hidden while review navigation remains available.
- `final/desktop-lesson.jpg`: final 1280×720 lesson layout.
- `replay/results.json`: automatic playback and 44px control measurements at four widths.
- `taste/`: visual-inspector report and full-page lesson images.

Board Lab evidence is in `.sites-local/verification/board-lab/production/verification.json`; despite that legacy folder name, this run targeted **http://127.0.0.1:4203**, not production. Local browser scripts: `.sites-local/reliability-final.mjs`, `.sites-local/replay-phase.mjs`, `.sites-local/reliability-alternative.mjs`, `.sites-local/lab-verify.mjs`. They use the installed CDP helper from the design-taste skill.

## Limits and publication

- Mobile results are **browser viewport emulation on Windows**, not tests on a physical iPhone. iOS Safari and Edge were not tested in this audit.
- Opera was completed in Fast preview. A full depth-19 Opera review was not run; actual depth-19 engine verification used the small mate game. The default remains depth 19, with existing time ceilings and honest provisional states.
- All current published course activities are board practice. Text-only and demonstration activity types have synthetic model coverage in the existing suite, but no current course instance to test in the browser.
- Coaching derived from legal lesson data describes the selected line; it does not prove the move optimal. Alternative quality claims require the optional verified Stockfish comparison.
- Source upload was initially blocked by automatic approval review because the audit/implementation request did not explicitly authorize the Sites export. The user subsequently authorized publication of the verified changes. This release preserves the existing Sites audience and Vercel production destination.

# Board-first lesson workspace

All registered courses share `LessonPlayer`, `lesson-ui.js`, `lesson-coach.js`, `lesson-attempt-feedback.js` and `lesson-workspace.css`. This extends the existing ROQVYN mark, typography, light/dark palettes, rules and saved progress rather than creating separate course pages.

## Entry and progression

Activities open directly on their validated position, alongside a short instruction. Coordinate warmups already contain a real board and remain the first beginner experience. Reading stays accessible in More and Learn more. Text-only lessons keep their reading flow; demonstrations use their supplied line. No quiz or board exercise is invented.

Partial snapshots retain the same keys, content signatures and completion arrays. `presentationRevision: 1` migrates only an old introductory landing state to practice; it does not reset moves, hints, orientation, reading position, questions or completion. Explicit reading review in the new presentation stays saved. Required reading, every required board activity and supplied questions still gate continuation.

The 28 existing beginner IDs are reordered by `BEGINNER_SEQUENCE`: coordinates, clear piece routes, pawn captures/blockers, check and special rules, straightforward captures/mates, forks and coordinated plans, then longer endings. Stored progress remains keyed by ID. Every solution now has an immediate recap using the actual final move note and the lesson/activity’s own takeaway, even before its question. Multiple activities get independent recaps. Undo, review and exploration do not reveal the solution prematurely or revoke earned completion.

## Coach and controls

Desktop keeps the same live coach content adjacent to the board. Mobile practice has one 170px coach card immediately above the board: a state heading, two lines of instruction/feedback and equal Previous/Continue actions. Hints, legal-alternative feedback and the actual solution recap replace that text without growing the card. Details opens the complete teaching in a bounded, modeless dialog with Close, Escape, outside dismissal and focus restoration. It never changes page padding or scroll position. Hints and off-solution moves do not open it automatically. Full explanations remain readable inside Details; the complete summary text is also available to assistive technology. Focus uses the same live content without cloning handlers.

The real navigation nodes move into the mobile card rather than duplicating completion logic. Compact action labels retain the full accessible label and completion help. Other stages keep their navigation in normal flow. The old changing practice status and instruction rows are folded into the card on mobile. Desktop reserves their line heights. Solution recaps belong to the adjacent/full coach, so they no longer insert a growing block below the board. Lesson pages disable browser scroll anchoring to avoid height changes elsewhere pulling the position. Board dimensions still use the existing width/viewport limit, independent of feedback length.

Difficulty buttons occupy full-width 44px rows, so Intermediate cannot split into a narrow column. Other controls outside the 8×8 board have at least 44px targets. Board cells divide the available width equally. Previous and Continue share equal grid columns, stretch to the same row height and remain in document flow.

## Legal alternatives

chess.js first distinguishes illegal moves from legal moves outside the selected continuation. Objective-specific feedback is limited to verified board facts: a pawn push does not capture, a legal check escape makes the king safe, a check is not necessarily mate, and a different mate can be valid. A legal alternative gets no error sound or automatic mistake/blunder classification. The selected exercise remains unchanged; Explore this move deliberately starts the existing saved free-exploration branch.

A separate cancellable Stockfish comparison searches before/after positions at requested depth 16, with bounded search time. It verifies evidence roots, legal immediate PV moves, observed depth (at least 14), mate/terminal facts and White’s evaluation perspective. Only the immediate reply is described; future captures are never attributed to it. Mate scores never become pawn losses. Same-move engine preferences are explicitly acknowledged. Unavailable/shallow evidence gives a neutral unavailable result, not invented coaching. New attempts, resets and lesson changes cancel stale work. Main game-review formulas and classification thresholds are unchanged.

## Artwork and license

The shared `pieceSvg()` renderer now uses all 12 Maestro BW vectors throughout lessons, demonstrations, analysis, training and Play. Original SVG files are pinned to Kadagaden revision `b035b0cc6a68e9fb99c872c8fe073c3ae3eba8a0` with SHA-256 hashes. Bundling keeps painting synchronous. Per-instance gradient IDs prevent cross-piece references, including several boards on one page. The paths remain unchanged; a 46-unit viewport gives a balanced fit.

Kadagaden’s BW adaptation is CC BY 4.0, while the original Maestro artwork by sadsnake1 is CC BY-NC-SA 4.0 per Lichess’s COPYING.md. The original noncommercial/share-alike restrictions remain; this is used on the current free noncommercial educational site. Commercial use needs separate permission or a different set. Both license texts, attribution and source hashes ship in `assets/pieces/maestro-bw/`, linked through the site’s third-party notices.

## Verification

- 326 Node regression checks, including every current lesson’s legal completion, restored progress, board-first migration, beginner recaps, future demonstration/text-only data, White/Black engine perspective, invalid PV/root/depth rejection, mate handling, cancellation and isolated SVG gradients. New coach checks cover feedback taking precedence over an old hint, recap without bypassing Check, accessible compact labels, unchanged live regions and Details without scrolling/resizing.
- Browser: all eight course families plus a beginner endgame at 360×740, 390×844, 430×844, 844×390, 1280×720 and 1440×900 (54 combinations). Square boards, all 64 lesson squares, no horizontal overflow, adjacent desktop coach and no duplicate gradient IDs.
- The reported bishop-capture completion originally moved the board down 34px at 390×844. The above-board card reduces that measured movement to 0px, including the board’s document coordinates, dimensions and scroll offset. Solve/undo, all three hint levels and Details opening/closing are checked at the six viewports. Long text is disclosed explicitly instead of resizing the workspace.
- Actual board moves with coaching visible, coordinate practice, complete beginner board → Check → saved completion/reload, French Black sequence, a tactics puzzle and king-and-pawn ending.
- Real Stockfish evidence for legal c5 in the independent pawn-capture exercise: depth 16, cxb5 preferred, c5 evaluated as +0.00 from White’s view, immediate reply Kf7. The legal push was not called a mistake; exploration and the original exercise both remained usable.
- Light/dark screenshots and desktop Focus checked. Earlier workspace results are under ignored `.sites-local/verification/lesson-workspace/`; the stable-card reproduction and verification are under `.sites-local/verification/stable-coach/`.
- Mobile testing uses an isolated Chromium-family browser with viewport emulation, not a physical iPhone or Safari. There are no current text-only/demonstration-only course pages; their shared data/logic cases are tested in Node.

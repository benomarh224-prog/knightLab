# Knightlab

Learning now includes graduated hints, independent practice, a browser-local practice-review list, exact last-lesson resume, a collapsed course map and completion recaps across all courses. See [the shared player and learning companion documentation](docs/lesson-player.md).

An English chess game review app. Enter a public Chess.com username, select recent completed standard games, and analyze positions with a locally bundled Stockfish 19 Lite WebAssembly worker. No password or API key is required.

Features: recent game library, time-control filters, older archives, PGN import/export, interactive replay, board orientation, best-move arrows, evaluation chart, move classifications, player-specific summary, and pausable standard/deep reviews. Analysis stays on the device and is cached in memory during the visit. The last username is stored in browser localStorage.

The home page opens with a dedicated hero, Chess.com username search, a sample game, and an opening-course introduction. Search results appear at `/games/`; selecting a game opens `/analysis/`. The analysis board, compact coach, Focus mode, move ribbon, and review controls retain their separate workspace. Stockfish only runs when analysis or Play needs it and stops when navigating to another page. The last reviewed game and cursor can be resumed from Analysis.

`/learn/` introduces the first interactive course, the French Defense, at `/learn/french-defense/`. Eight lessons cover the foundations, Advance, Exchange, Tarrasch, Classical/Steinitz, Winawer, McCutcheon, and an active-development model position. Watch steps through legal moves with original explanations. Practice asks for Black's moves in a selected study line, applies White's replies automatically, offers explicit hints, and preserves the position after a different legal attempt. Completing a lesson saves its practiced status in localStorage. Lesson selections have shareable query parameters. A visited study line can open in the main analysis workspace. The supplied excerpt of Cyrus Lakdawala's *First Steps: The French* informs the move examples; the PDF and its page images are not redistributed.

All public routes have generated directory index files, so direct visits and refreshes work with static hosting. App, stylesheet, icon, license, and engine URLs are rooted at the site origin. Navigation uses the History API and browser Back/Forward; the mobile header keeps secondary destinations in its menu.

The home page uses a reference-inspired forest-green, ivory, and lime academy design: cinematic generated chess photography, serif headings, light activity cards, and a mountain learning path. Its filters select actual opening, reviewed-mistake practice, or play activities. The French opening question provides immediate feedback without claiming engine rankings. The path progress reflects completed French exercises. Search remains available in the hero disclosure and analysis CTA. Layout and palette overrides are scoped to the home page. ImageGen asset paths and prompt briefs are documented in `src/assets/README.md`.

All courses now use the data-driven shared LessonPlayer described in [docs/lesson-player.md](docs/lesson-player.md). Learn presents one idea, Try preserves the interactive exercise, and Check appears only for supplied knowledge questions after the required board work.

`src/academy.css` unifies the remaining interface with the lesson design: ivory surfaces, forest-green navigation, serif headings, lime actions, green chessboards, and readable secondary text. It covers the game library, course catalog, analysis and coach, summaries, search/import/help dialogs, Play, mistake practice, and Focus. Board sizing, compact coaching heights, mobile playback placement, legal exploration, and engine logic retain their existing behavior. Move badges preserve distinct semantic colors. The course catalog reuses the generated French cover image while its original local preview stays hidden.

## Tactical Vision learning course

`/learn/tactical-vision/` contains all 144 exercises from the user-provided *Improve Your Tactical Vision* workbook by Niclas Huschenbeth: 48 Beginner, 48 Intermediate, and 48 Advanced. The course catalog and homepage training card open this course. Difficulty tabs filter the sidebar, and each exercise has a shareable `?lesson=beginner-01`-style URL. Course progress is independent of French Defense and is stored as `knightlab-tactical-course-v1`.

The diagram positions were transcribed into FENs and checked against every selected main solution with strict chess.js move validation. PDF page 29's resource order differs from its visual exercise order and was reconciled with the rendered labels. The source diagram/solution page references remain in the exercise data. Diagrams do not provide castling or en passant metadata; those rights are left unset. The original PDF and its board images are not published. Book prose is not copied: coaching consists of original training guidance and move-by-move descriptions grounded in the legal moves. Published lines can contain illustrative or weaker defensive replies; the UI presents them as selected study continuations, not uniquely forced engine solutions.

The shared lesson player supports custom starting positions, either side to move, automatic opponent replies, hints, an explicit Queen/Rook/Bishop/Knight promotion picker, replay, and importing a played continuation into analysis. Source FEN and move number survive PGN export. A different legal answer preserves the exercise and is described as a different continuation. The course is static and requires no new service or API key.

## Deploy from GitHub to Vercel

Import this repository into Vercel using the **Other** framework preset, the repository root, **npm ci** as the install command, **npm run build** as the build command, and **dist** as the output directory. Use Node.js 22 or newer. The checked-in `vercel.json` supplies the build settings. No environment variables or secrets are required for the app. Once the repository is connected, pushes to the production branch can deploy automatically.

The app includes the bundled Stockfish worker, WebAssembly file, opening database, and licenses in its static build. Chess.com game requests and analysis continue to run in the browser.

## Development commands

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm test
npm run dev
```

Open http://127.0.0.1:4173. To use another port: `node scripts/serve.mjs 4174`.

The build copies the unmodified Stockfish lite single-threaded JS and WASM files to `dist/engine`, bundles app code, and includes library licenses. The production app is static; no server or account database is needed. The preview server is for development only.

## Analysis method

Accuracy percentages have been removed entirely, including published Chess.com references and local calculation. The review shows engine position evaluations, move classifications, coaching, and game summaries.

The move coach replays up to six legal plies of Stockfish's recommended alternative from before the selected move and its continuation after the move. It describes evidenced captures, checks, mate, castling, promotions, attacks, and development; it distinguishes sound sacrifices from automatically losing material. Positional losses without a clear tactical explanation are stated conservatively. The coaching is derived locally from board features and engine lines, without an external language model or API key. Try the engine's idea starts a continuation on the main board from before the selected move, plays the legal recommended move, and preserves the original review position. Coach content updates when the selected move or its evaluations change.

All boards share an original Staunton-inspired SVG piece set, with ivory and obsidian palettes, sculpted bases, curved highlights, dimensional gradients, and contact shadows. Each SVG uses unique paint IDs so multiple boards can render together. Pieces stay decorative and do not intercept square controls or move-rating badges.

Play & Explore opens from the Play navigation button with a new game against Stockfish, and includes both-side free play in its settings. Explore moves works directly on the main analysis board. Settings choose both-side free play or automatic Stockfish replies, White or Black, and a new or current starting position. Tap a piece and a legal destination; castling, en passant, and explicit promotions follow chess.js rules. Computer mode locks the engine's side, makes its replies automatically, and Undo Turn removes both the reply and the player's move. Free play undoes one move and offers a manual engine reply. Restart, reset, flip, and PGN export are included. Mate and draws stop play, including repetitions within the session. Each position receives a 650 ms Stockfish evaluation from White's perspective. Old engine requests are cancelled when play, settings, or the dialog change. Play pauses an ongoing review and resumes it on close, preserving the original PGN and playback position. Play sessions last until the dialog closes.

Focus Mode opens the existing replay board in a full-viewport dialog, with the opening name, players, evaluation bar, move badges, arrows, sound controls, and large navigation buttons. The board fills the available width rather than shrinking with viewport height. On mobile, compact opening and player rows leave more room for the board, and Try Another Move sits below playback controls. Short screens scroll vertically. Escape or Exit Focus restores the board to its original layout without changing the selected move. It works without the browser Fullscreen API.

Key Moments shows up to three of the largest reviewed inaccuracies, mistakes, and blunders, with standout moves and checkmates when space remains. Click a moment to replay that move on the main board. Moments cover both sides and update as review progresses.

Practice My Mistakes builds exercises from reviewed errors with legal Stockfish alternatives. Connected accounts practice their own moves; demo and imported games include both players. A separate board starts before the error, faces the side to move, and hides the recommendation until a correct answer or an explicit reveal. Select a piece and destination, optionally use a piece hint, and choose a promotion when needed. The exercise asks for Stockfish's first choice from that review, so other legal moves are described as alternatives rather than automatically called mistakes. Solved and revealed positions are counted separately. Practice pauses an ongoing review and resumes it on close, preserves the main game position, and resets when switching games. Practice results last for the current session.

An Opening card shows the selected game's name, variation, and ECO code. It matches the deepest named position in a bundled snapshot of the CC0 Lichess opening database, including transpositions, and provides the played opening line plus a button to jump to that position. Explicit PGN Opening/Variation tags are preserved; validated Chess.com opening URLs provide a fallback. Custom starting positions without metadata are labeled unrecognized. Recognition runs locally and does not require Stockfish or an extra API request. Refresh the dataset explicitly with `node scripts/update-openings.mjs`; regular builds use the checked-in snapshot.

The Opening card stays above the board on all screen sizes, with its name and ECO always visible. Details expand on tap; jumping to the opening position collapses them and displays the board. Switching games updates the card and closes its details.

Standard review is the default at 650 ms per position; Deep review targets depth 18, with a 20-second first-pass limit and retries of 40 then up to 80 seconds for unfinished positions. Review progress shows depth-qualified positions in Deep mode and never marks an unfinished search complete. The engine receives the starting FEN and preceding legal moves to preserve repetition context. Threefold repetitions are recognized as drawn positions. Stockfish compares two candidate moves (MultiPV 2). Scores are normalized to White. Move quality uses evaluation loss from the mover’s perspective: good under 50 centipawns, inaccuracy 50–99, mistake 100–199, blunder 200 or more. A move matching the engine’s first choice is marked best. It is marked great when it also loses no more than 30 centipawns and beats the second candidate by at least 100 centipawns at the same completed search depth of at least 8. The best/great summary combines both categories. These are approximate independent ratings, not Chess.com accuracy. Mate evaluations are capped at ±10000 centipawns; the chart is capped at ±5 pawns. Scores may change at greater search depth.

The selected move’s rating appears as a circular badge above the upper corner of the moved piece’s destination square. Rating glyphs use SVG for consistent rendering, with white double question marks on red for blunders. Tap, focus, or hover the badge to see its full label. Badges follow the piece when the board is flipped, including captures, castling, and promotion; edge positions keep badges inside the board, and unrated moves have no badge. Playback has large Back/Next controls, separate first/last controls, and a separate row for board tools. The insight card explains the selected move, while the board arrow shows the recommendation for the position currently displayed. Connected account counts cover that player; PGNs and demo games count both sides.

Move navigation and legal practice attempts play original procedural wooden-piece sounds through Web Audio, with a distinct capture sound. Audio starts only after user interaction, remains silent during engine updates, and can be muted through the Sound control. The preference is saved in localStorage. No audio files, remote downloads, or microphone access are required. Unsupported audio does not interrupt chess navigation.

## Data and licenses

Official public API: https://www.chess.com/news/view/published-data-api. Requests are sequential. Public archives can lag behind live games and require a network connection. Only completed standard chess games are supported.

Chess.js: BSD-2-Clause. Stockfish.js/Stockfish: GPL-3.0. The engine is an unmodified separate worker/module. See the built license and third-party notice files for source links and attribution. The fonts are served by Google Fonts with system fallbacks. Knightlab is independent of Chess.com.

Explore moves enables legal piece selection on the main analysis board: tap then tap a highlighted destination, or drag on desktop. A separate AnalysisLine retains the original game and its full pre-position history, including repetitions. Back/Next revisit explored moves; a new move after rewinding discards the abandoned continuation. Promotions require a choice. Stockfish evaluates the current continuation and its preceding position; Play engine move applies its suggested move. Reset line returns to the branching position, and Back to game restores the original playback position and resumes a previously running review. Engine searches are cancelled and stale results rejected on edits, navigation, reset or game switching. The coach uses the explored move and its actual before/after scores. Try the engine’s idea now creates an inline continuation from before the selected move.

Threats are enabled by default, but only one leading new threat is highlighted. Compare potential legal captures with the position before the selected move, keep attacks introduced by the mover, and prioritize check, unrecapturable captures, unfavorable exchanges, then defended attacks. The previous highlight disappears on the next move; an unrelated move does not keep an old attack glowing. Imported starting positions show only the leading current threat. The map excludes illegal pinned captures and handles en passant and king recapture protection. Tap the single marked square for the attacker, explanation, and an orange arrow. This is a current-attack explanation, not a prediction of forced material loss.

The move coach is always visible in a compact card above the chessboard, following the shared player row. Its move rating, notation and two-line explanation update with playback. Details expands the full engine explanation in normal document flow; it never overlays any board square. Coach navigation shortcuts reveal this same card. Focus Mode preserves the same above-board arrangement.

Focus mode sits beside the opening. Explain, Explore, Sound and Best arrow launch buttons stay hidden; sound and on-board engine arrows retain their behavior. The coach can still start an inline engine continuation.

Large Back/Next controls remain below the board. Advancing collapses optional long details and keeps the compact coach and board together on mobile. First/last position, Flip and Threats are available in the Board actions (⋯) disclosure beside the move caption. The old floating popup and its duplicate playback footer are retired.

The refined review uses a forest/ivory palette, a light coach card with move-quality accents and a compact engine-choice line. Repeated Coach tabs are hidden because the note is always visible. The evaluation bar is horizontal above the full-width board, labels signed scores from White’s perspective and keeps that perspective when the board flips. Large playback controls and a prominent Next button remain beneath the board. Expanded coaching stays in normal page flow.

The compact coach combines its rating, notation and Details button in one header. Engine’s choice appears in the compact card only when it differs from the played move. The opening is a collapsed chip, and the game library is collapsed initially. My games and completed username searches open the library; choosing a game collapses it again. Focus mode stays visible beside the opening, and Back/Next remain the only primary playback buttons.

Playback now animates adjacent legal moves in both directions, including both castling pieces. It skips game changes, board flips, position jumps and reduced-motion preferences. A single horizontal move ribbon replaces the old move caption; it follows the selected move, shows reviewed quality dots and allows direct jumps. Inline exploration retains its own continuation navigation.

The compact coach uses short, position-specific explanations from legal engine lines. Its engine recommendation is a button that opens the existing inline analysis at the position before the selected move; Back to game restores the original game. No unsupported material win is inferred from a capture alone.

Review progress is stored locally in the browser for the eight most recently reviewed games: PGN, basic public game metadata, original-game cursor and board orientation. Reloading restores the last game and its cursor, and selecting a previously reviewed game restores its own position. Engine scores are recalculated after reload. Blocked/corrupt/full storage fails gracefully and does not block analysis. Exploratory variations are not saved over the original game.

The midnight color theme uses navy surfaces, periwinkle controls and pale blue/slate board squares. Board geometry is based only on available width: eight explicit equal rows and columns, a square wrapper, no viewport-height caps and no size changes based on coach verdict or explanation length. All board sections refuse flex shrinking. Compact coaching keeps a two-line summary; expanded details scroll within a bounded card.

In inline exploration, the small Exploring / Back to game bar shares the opening header row. The move ribbon now follows the explored continuation as well as the original game. Back/Next sit immediately after the board. Optional engine/retry/reset controls live in a native Variation tools disclosure below playback; promotions and analysis errors reveal the controls automatically. Navigation does not scroll a hidden move table.

Outside Focus mode on mobile, Back/Next now stay in a fixed dock above the main navigation, with extra page-bottom spacing so content remains reachable. The dock is visible only with the Board view; Focus retains its own normal controls. Normal playback no longer scrolls the page back to the board heading.

The compact coach reserves a constant 94-pixel card with one header row and a two-line brief. A different engine recommendation shares the brief row instead of adding height. Briefs are limited to 96 characters at a word boundary, with full explanations available under Details. Ribbon chips display standard SAN only (Nf3, O-O, Qxh7#); accessible names and tooltips retain move numbers and ratings.

The mobile review now uses a single compact layout instead of two fixed bottom bars. Workspace navigation (Analysis, My games, Play) is available from the top-header menu with Escape/outside-click dismissal. Player names, ECO opening disclosure, Focus and board actions share one context row. The coach reserves 74 pixels on mobile. Opening details still reveal the full opening name and line.

Previous/Next are large 52-pixel arrow buttons in the same row as the move ribbon, in normal page flow. No playback or workspace navigation bar overlays the chessboard. The normal mobile board uses the smaller viewport height (svh when supported) minus a stable 278-pixel interface budget, independent of coach text and engine recommendations; short landscape screens remain scrollable. Focus retains its own playback layout.

Visual polish keeps the mobile layout dimensions unchanged: the board has a fine rim and soft shadow, the coach uses a small knight mascot with its existing verdict glyph, controls share consistent edges and press feedback, and the selected move chip has a clear inset marker. Move notation and numerical scores use system monospace/tabular figures. Previous move-square highlights fade out briefly after navigation without adding extra threat highlights.

Search and engine activity use small busy indicators instead of changing the review layout. Search exposes aria-busy, and the review progress track exposes progressbar values. Reduced-motion preferences disable the new fades, pulses, spinners and button transitions. All full coach explanations and existing controls remain available.

## Mobile lesson workspace

Every lesson uses the same responsive player: a single column with title, short instruction, then board on mobile; a course sidebar, prominent board and adjacent practice panel on desktop. Lessons opens a native mobile drawer. Navigation remains in document flow with safe-area spacing, so it cannot cover lesson content. See [lesson player documentation and verification](docs/lesson-player.md).

## Italian Game

`/learn/open-games/` adds 10 short lessons based on the supplied John Emms extract (printed pages 6–21). It covers Italian development, defending the early queen attack, gaining time against the queen, a bishop-and-knight mate, bishop-first move order, castling against Ng5, a sample king attack, pressure on a pin, the open g-file, and deflection. Each starts at a focused decision with the preceding opening preserved for replay and PGN export. The first exercise plays White; the rest play Black with automatic White replies. Progress is independent under `knightlab-open-games-course-v1`, and `?lesson=stop-scholar-mate` selects an individual lesson.

Teaching text is original. Source move sequences are strictly checked with chess.js. We use only topics and worked continuations present in the supplied extract; the unfinished last exercise is excluded. Illustrative weak replies are identified as study examples, not forced engine lines. No original PDF, diagram images, or book paragraphs are published. The new course cover is an original SVG composed from Knightlab’s piece artwork in the legal Italian position after 3...Bc5.

## Learning categories

The Learn catalog defaults to Openings, grouping French Defense and Italian Game together. Tactical Vision is under Tactics. The homepage Openings activity opens this category, while existing direct course routes and saved progress remain available.

## Responsive navigation

A shared forest-green header now serves every route. Desktop navigation groups Home, Learn, My games, Analyze and Play in a pill with a highlighted current page, plus Find games and import/guide tools. Below 1021px the same navigation nodes move into a native modal bottom sheet, preserving handlers and game count. The sheet includes descriptions, Find games, Import PGN and Quick guide actions, supports native Escape/backdrop dismissal and returns the same controls to the header on resize. It closes before destination handlers run, allowing search, play and import dialogs to take focus normally. Header controls remain at least 44px on phones, and reduced motion is respected.

Mobile navigation rows explicitly use horizontal flex direction and a shared 68px height, overriding the legacy bottom-navigation column style. Hamburger lines have equal width. Opening-course cards now use the supplied Italian Game and French Defense artwork unchanged, fitted without cropping the embedded headings.

## Chess for Beginners

`/learn/chess-for-beginners/` is a 28-lesson course under Learn → Beginners, inspired by the supplied Chess Fundamentals. Four units cover board/pieces (10 lessons), special rules and king safety (6), first tactical/opening plans (6), and simple endings (6). Each has two original teaching paragraphs, three rules, a three-choice understanding question with explanatory feedback, and a legal board exercise. Theory opens on a new beginner lesson and can be collapsed with Try on the board. The coach remains above the mobile board.

A new lesson is recorded complete only when both the board exercise and concept question are completed, in either order. Already completed lessons remain navigable. French, Italian and Tactical Vision keep their existing behavior and storage keys. Beginner progress uses `knightlab-beginner-course-v1`; the homepage Start your journey, Fundamentals milestone and progress bar now lead here. Catalog back links preserve the appropriate category.

Most positions and all teaching/check questions are original practice adaptations. The pawn breakthrough credits book Example 24 (printed p. 51); the rook demonstration credits Example 1 (printed pp. 21–22), with practice focused on its last four White moves. The supplied edition contains transcription errors, so the course uses strictly legal moves and clear standard-rule explanations rather than copying malformed lines. This beginner path is a selection of fundamentals, not a reproduction of all 212 PDF pages or its advanced games. The original PDF and its diagrams are not published. The beginner cover reuses Knightlab’s existing ivory king-and-pawn artwork.

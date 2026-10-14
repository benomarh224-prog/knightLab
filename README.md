# Knightlab

An English chess game review app. Enter a public Chess.com username, select recent completed standard games, and analyze positions with a locally bundled Stockfish 19 Lite WebAssembly worker. No password or API key is required.

Features: recent game library, time-control filters, older archives, PGN import/export, interactive replay, board orientation, best-move arrows, evaluation chart, move classifications, player-specific summary, and pausable standard/deep reviews. Analysis stays on the device and is cached in memory during the visit. The last username is stored in browser localStorage.

The workspace opens directly on a large analysis board, with Moves, Coach and Summary in an adjacent panel on desktop. There is no promotional hero or step-by-step landing section. On phones, sticky Board / Coach / Moves / Summary tabs switch views without scrolling past the board; selecting a move returns to the board with its position preserved. A bottom navigation bar opens Analysis, My games and Play. Find games opens a compact username search dialog. Results remain below the analysis; selecting a game returns to the board. Opening details are collapsed above the board on all screen sizes.

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

Threats are enabled by default and can be toggled. The map checks potential legal captures for either side after a hypothetical pass (with en passant restricted to the actual turn), excluding king captures. Pinned pieces that cannot legally capture do not trigger a warning. Red marks check or a capture without an immediate legal recapture; amber marks defended attacks or potentially unfavorable exchanges. Tap a marked square to see the attacker, capture/defense explanation and an orange dashed arrow. These show current attacks, not a forced material-loss prediction or a full tactical search. Where a king cannot recapture because another enemy piece guards the destination, the explanation names that guard. En passant marks the captured pawn’s square and explains its distinct capture destination. Mint best-move arrows have a contrasting outline, a fixed-size head, aligned coordinates and L-shaped knight routes.

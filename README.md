# Knightlab

An English chess game review app. Enter a public Chess.com username, select recent completed standard games, and analyze positions with a locally bundled Stockfish 19 Lite WebAssembly worker. No password or API key is required.

Features: recent game library, time-control filters, older archives, PGN import/export, interactive replay, board orientation, best-move arrows, evaluation chart, move classifications, player-specific summary, and pausable precise/quick/deep reviews. Analysis stays on the device and is cached in memory during the visit. The last username is stored in browser localStorage.

The workspace uses a full-width header and a game collection below the board and analysis. Username search scrolls to the collection; selecting a card opens that match in the analysis above. Cards show opponent, rating when available, time control, date, player color, result, and selected state. The collection displays 12 games per page, preserves the correct game indices across filters, and provides a separate action to load older monthly archives. On smaller screens the grid becomes one column. After connecting an account, the introductory content contracts to keep the review prominent.

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

Knightlab accuracy is independent for every game, including PGNs and games without Chess.com scores. It implements the published Lichess accuracy model: White-normalized centipawns are clamped to ±1000 and mapped to Win% using 100 / (1 + exp(-0.00368208 * cp)); mover loss maps to clamp(103.1668100711649 * exp(-0.04354415386753951 * loss) - 3.166924740191411 + 1, 0, 100), with nonpositive loss scoring 100. Matching an engine choice does not bypass this calculation. Game accuracy averages a volatility-weighted mean and a harmonic mean, with a zero move score giving a zero harmonic mean. Sliding windows have floor(plies/10) size clamped to [2,8], and population standard deviations clamped to [0.5,12]. Early moves use the first full window. We evaluate the actual starting FEN rather than assuming an initial +0.15, preserving custom positions and Black-to-move PGNs. See https://lichess.org/page/accuracy and the linked published source (AccuracyPercent.scala revision 2e653ad1e2b9fad31b4a092394019ef8fafdedb8). This independent implementation is based on that model; it does not promise the same scores as another site or predict a particular player’s real-world chances.

The move coach replays up to six legal plies of Stockfish's recommended alternative from before the selected move and its continuation after the move. It describes evidenced captures, checks, mate, castling, promotions, attacks, and development; it distinguishes sound sacrifices from automatically losing material. Positional losses without a clear tactical explanation are stated conservatively. The coaching is derived locally from board features and engine lines, without an external language model or API key. Try the engine's idea opens a separate free-play board from before the selected move, plays the legal recommended move, and preserves the original review position. Coach content updates when the selected move or its evaluations change.

All boards share an original Staunton-inspired SVG piece set, with ivory and obsidian palettes, sculpted bases, curved highlights, dimensional gradients, and contact shadows. Each SVG uses unique paint IDs so multiple boards can render together. Pieces stay decorative and do not intercept square controls or move-rating badges.

Play & Explore opens from the Play navigation button with a new game against Stockfish, or from Try Another Move with the selected analysis position in free play. Settings choose both-side free play or automatic Stockfish replies, White or Black, and a new or current starting position. Tap a piece and a legal destination; castling, en passant, and explicit promotions follow chess.js rules. Computer mode locks the engine's side, makes its replies automatically, and Undo Turn removes both the reply and the player's move. Free play undoes one move and offers a manual engine reply. Restart, reset, flip, and PGN export are included. Mate and draws stop play, including repetitions within the session. Each position receives a 650 ms Stockfish evaluation from White's perspective. Old engine requests are cancelled when play, settings, or the dialog change. Play pauses an ongoing review and resumes it on close, preserving the original PGN and playback position. Play sessions last until the dialog closes.

Focus Mode opens the existing replay board in a full-viewport dialog, with the opening name, players, evaluation bar, move badges, arrows, sound controls, and large navigation buttons. The board fills the available width rather than shrinking with viewport height. On mobile, compact opening and player rows leave more room for the board, and Try Another Move sits below playback controls. Short screens scroll vertically. Escape or Exit Focus restores the board to its original layout without changing the selected move. It works without the browser Fullscreen API.

Key Moments shows up to three of the largest reviewed inaccuracies, mistakes, and blunders, with standout moves and checkmates when space remains. Click a moment to replay that move on the main board. Moments cover both sides and update as review progresses.

Practice My Mistakes builds exercises from reviewed errors with legal Stockfish alternatives. Connected accounts practice their own moves; demo and imported games include both players. A separate board starts before the error, faces the side to move, and hides the recommendation until a correct answer or an explicit reveal. Select a piece and destination, optionally use a piece hint, and choose a promotion when needed. The exercise asks for Stockfish's first choice from that review, so other legal moves are described as alternatives rather than automatically called mistakes. Solved and revealed positions are counted separately. Practice pauses an ongoing review and resumes it on close, preserves the main game position, and resets when switching games. Practice results last for the current session.

An Opening card shows the selected game's name, variation, and ECO code. It matches the deepest named position in a bundled snapshot of the CC0 Lichess opening database, including transpositions, and provides the played opening line plus a button to jump to that position. Explicit PGN Opening/Variation tags are preserved; validated Chess.com opening URLs provide a fallback. Custom starting positions without metadata are labeled unrecognized. Recognition runs locally and does not require Stockfish or an extra API request. Refresh the dataset explicitly with `node scripts/update-openings.mjs`; regular builds use the checked-in snapshot.

On phones and tablets, the same Opening card moves above the board with its name and ECO always visible, and stays at the top while scrolling within the board card. Details expand on tap; jumping to the opening position collapses them again so the board stays in view. Switching games updates the card and closes mobile details. On desktop the card returns to the review panel and starts expanded.

Precise review is the default: depth 18 with MultiPV 2, clearing the hash before each position for consistent search conditions. The engine receives the original starting FEN and all preceding legal moves, preserving repetition and fifty-move context instead of analyzing an isolated FEN. Threefold repetitions are recognized as drawn positions. The first pass allows 20 seconds per position; searches that stop below depth 18 stay pending and Deepen remaining retries only unfinished positions with 40 then up to 80 seconds each. Scores are withheld until every game position is present and reaches depth 18 or is terminal, including on slow devices. Actual move coverage and minimum depth are shown. Pausing/resuming preserves checked positions in a separate per-quality cache. Quick review uses 140 ms per position; deep review uses 650 ms. Both are explicitly exploratory estimates and still require a complete game before showing accuracy. Improve accuracy switches either to Precise review. Optional Chess.com published accuracy is kept as a clearly separate reference; it never alters the independent score. Stockfish compares two candidate moves (MultiPV 2). Scores are normalized to White. Move quality uses evaluation loss from the mover’s perspective: good under 50 centipawns, inaccuracy 50–99, mistake 100–199, blunder 200 or more. A move matching the engine’s first choice is marked best. It is marked great when it also loses no more than 30 centipawns and beats the second candidate by at least 100 centipawns at the same completed search depth of at least 8. The best/great summary combines both categories. These are approximate independent ratings, not Chess.com accuracy. Mate evaluations are capped at ±10000 centipawns; the chart is capped at ±5 pawns. Scores may change at greater search depth.

The selected move’s rating appears as a circular badge above the upper corner of the moved piece’s destination square. Rating glyphs use SVG for consistent rendering, with white double question marks on red for blunders. Tap, focus, or hover the badge to see its full label. Badges follow the piece when the board is flipped, including captures, castling, and promotion; edge positions keep badges inside the board, and unrated moves have no badge. Playback has large Back/Next controls, separate first/last controls, and a separate row for board tools. The insight card explains the selected move, while the board arrow shows the recommendation for the position currently displayed. Connected account counts cover that player; PGNs and demo games count both sides.

Move navigation and legal practice attempts play original procedural wooden-piece sounds through Web Audio, with a distinct capture sound. Audio starts only after user interaction, remains silent during engine updates, and can be muted through the Sound control. The preference is saved in localStorage. No audio files, remote downloads, or microphone access are required. Unsupported audio does not interrupt chess navigation.

## Data and licenses

Official public API: https://www.chess.com/news/view/published-data-api. Requests are sequential. Public archives can lag behind live games and require a network connection. Only completed standard chess games are supported.

Chess.js: BSD-2-Clause. Stockfish.js/Stockfish: GPL-3.0. The engine is an unmodified separate worker/module. See the built license and third-party notice files for source links and attribution. The fonts are served by Google Fonts with system fallbacks. Knightlab is independent of Chess.com.

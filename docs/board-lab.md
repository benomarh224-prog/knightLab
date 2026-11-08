# Board Lab

An original board-puzzle workspace at `/train/board-lab/`, linked from Train.
It shares ROQVYN's stone board, Maestro SVG pieces, theme tokens, menus, sounds
and 150ms piece animation. It does not start Stockfish or change lesson, daily
training, analysis or play state.

## Two types of puzzle

- **Board memory:** study a sparse position, hide the pieces, then identify the
  requested piece's square. The target's color/type is unique in that position.
  Beginner/intermediate/advanced use 3/5/7 pieces. Expert has 12 pieces and asks
  for three distinct pieces in sequence; the round completes only after all
  three recalls. Hints advance independently for each question.
  Learners can hide early or turn Timer off for untimed study.
  Hints reveal a file, then a rank. Showing the position records a studied solution.
- **Knight trail:** move only the White knight to a marked target, using empty
  landing squares not attacked by Black. Other pieces remain fixed; this is
  explicitly a route drill, not an alternating chess game. Any valid route is
  accepted. Breadth-first search calculates a shortest safe route; hints recalculate
  from the current square, and multiple shortest routes can earn a clean solve.
  Expert routes require 8–10 safe hops and hide automatic landing dots; an explicit
  Hint remains available. Difficulty comes from the position and route length,
  rather than an invented rating.

The original 162 puzzles and their IDs/FENs are unchanged. The additive Expert
library has 24 memory positions and 19 knight trails: 205 puzzles in total,
across four levels. `scripts/build-board-puzzles.mjs` regenerates the
committed data from the original generators. Regression checks independently
validate target uniqueness, quiet king positions, knight steps, attack geometry,
reachability and advertised shortest distances across the entire library.

## Progress and results

Each session has five distinct puzzles. New sessions avoid the previous five.
Modes and levels retain separate unfinished sessions and best clean-solve counts
in browser-local storage, under `roqvyn-board-lab-v1:*`. Corrupt or unavailable
storage still allows a playable local session. Existing storage keys are untouched.

A clean solve means no hint, wrong attempt, reveal or Undo; a knight trail must
also use a shortest safe route. With Timer on, the solution must arrive before
the deadline. Retrying the same round retains its assistance history and cannot
earn a clean solve. Other solved rounds count as solved with practice.
Revealed answers count as studied, never as solved. Totals always sum to five;
there is no invented accuracy, Elo or comparative ranking.

## Timed challenges

| Level | Memory study | Recall deadline | Knight trail deadline |
| --- | ---: | ---: | ---: |
| Beginner | 8 s | 45 s | 90 s |
| Intermediate | 6 s | 35 s | 75 s |
| Advanced | 4 s | 25 s | 60 s |
| Expert | 8 s | 35 s for all three recalls | 90 s |

Expert allows more time for its denser position/longer route; its underlying task
is substantially harder. A Solve clock begins after the memory study ends, or
when a route is revealed. Timed positions are concealed before Start and during
Pause, preventing extra study with a stopped clock. An expired timer never
advances or records a solve automatically: the learner can continue practicing,
reveal the solution, or retry from More. It cannot earn a clean timed solve.
Pause, Retry, Timer on/off and existing board tools share the More menu.

Both clocks pause when leaving the page, hiding the tab or reloading. A resumed
round requires an explicit action. Existing v1 drafts retain their puzzle,
path, counters, results and best; a previously untimed in-progress answer/route
receives a full new solve budget and resumes paused. Partial Expert recall and
remaining time are saved. Old mode/level keys and course/daily data are preserved.
Timers repaint their text only; prompts and
feedback use a reserved instruction area, keeping board geometry stable.

## Responsive and accessible behavior

Desktop places the concise instruction panel beside a prominent board; mobile
places the same panel above it, including Hint and Show solution. Secondary tools
use the shared viewport-aware More menu with Escape, outside-click dismissal and
focus restoration. Board size uses width and the stable viewport height, with
normal vertical scrolling on short screens. No fixed content overlays or CSS zoom.

Controls are at least 44px. Squares use a roving tab stop and arrow-key navigation;
Enter/Space activates them. Hidden-memory squares expose no piece/answer names to
assistive technology. Timers are quiet and can be disabled. Animations honor reduced
motion; feedback is conveyed in words as well as color. A route supports both tap
and pointer drag through the shared board controller.

## Verification

- Pure tests cover all original puzzles, alternate safe routes, feedback,
  scoring, reveal behavior, timers, partial persistence, isolated modes/levels,
  unavailable storage and invalid saved routes.
- Additional challenge tests cover every Expert recall/shortest path, deadlines,
  concealed paused positions, multi-question completion, honest timeout/retry
  scoring, untimed preferences, corrupt recall prefixes and legacy v1 migration.
- Browser checks complete five-round memory and route sessions; test drag/tap,
  hints, Undo, timers, reload, keyboard access, More menus, flip, coordinates,
  reduced motion and absence of engine searches.
- Light/dark layouts checked at 360x740, 390x844, 430x844, 844x390, 1280x720 and
  1440x900. Checks measure square geometry, all 64 cells, unchanged board position
  after feedback, readable prompts, 44px controls and horizontal overflow.
- Isolated Chromium on Windows with emulated viewport sizes. No physical iPhone
  or iOS Safari was available. Evidence lives in the ignored
  `.sites-local/verification/board-lab/` directory.

Design review: retained palette/type, `true-black-flat`, seed 1173058382. The
screen's job is solving an actual visual puzzle, so its board is the main surface.
The inspector's hidden-SPA-view findings are excluded. Its unequal panel-height
warning is intentional: the short adjacent instruction panel stays short instead
of stretching into an empty board-height card.

### Timed Expert update verification

`npm run build` and all 365 tests pass. A comparison against the prior committed
JSON confirms all 162 existing puzzle records remain byte-for-byte equivalent
after parsing. The new Expert positions are generated locally; no external
puzzle service or engine is required at runtime.

The running interface was checked in both themes at six viewport sizes above,
including the actual longest new route. Checks cover all three recall questions,
partial-answer reload, explicit pause/resume, concealed paused positions, expiry,
continuing after timeout, retry, persistent untimed preference, five-round
completion, unchanged course/daily progress, menu keyboard access, 44px controls,
64 square cells, readable feedback and no horizontal overflow. The expiry check
uses a controlled saved draft with 650 ms remaining and the real browser timer;
pure tests exercise the full configured deadlines. No browser exceptions or
Stockfish workers were observed. This is Windows Chromium viewport emulation,
not a physical iPhone/iOS Safari or Android test.

Current screenshots and measurements:
`.sites-local/verification/puzzle-challenge/`. The same existing palette and
typography were retained (`true-black-flat`, seed 1118936661); the board stays
the main surface, with a quiet fixed-width clock in the existing instruction
panel. The board height budget now reserves room for its controls on laptops
and phones, with normal vertical scrolling on very short screens.

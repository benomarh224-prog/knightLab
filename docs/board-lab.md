# Board Lab

An original board-puzzle workspace at `/train/board-lab/`, linked from Train.
It shares ROQVYN's stone board, Maestro SVG pieces, theme tokens, menus, sounds
and 150ms piece animation. It does not start Stockfish or change lesson, daily
training, analysis or play state.

## Two types of puzzle

- **Board memory:** study a sparse position, hide the pieces, then identify the
  requested piece's square. The target's color/type is unique in that position.
  Beginner/intermediate/advanced use 3/5/7 pieces and 8/6/4 second countdowns.
  Learners can hide early or turn the countdown off. There is no answer deadline.
  Hints reveal a file, then a rank. Showing the position records a studied solution.
- **Knight trail:** move only the White knight to a marked target, using empty
  landing squares not attacked by Black. Other pieces remain fixed; this is
  explicitly a route drill, not an alternating chess game. Any valid route is
  accepted. Breadth-first search calculates a shortest safe route; hints recalculate
  from the current square, and multiple shortest routes can earn a clean solve.

The original library has 162 puzzles: 87 memory positions and 75 knight routes,
spread over three levels. `scripts/build-board-puzzles.mjs` regenerates the
committed data from the original generators. Regression checks independently
validate target uniqueness, quiet king positions, knight steps, attack geometry,
reachability and advertised shortest distances across the entire library.

## Progress and results

Each session has five distinct puzzles. New sessions avoid the previous five.
Modes and levels retain separate unfinished sessions and best clean-solve counts
in browser-local storage, under `roqvyn-board-lab-v1:*`. Corrupt or unavailable
storage still allows a playable local session. Existing storage keys are untouched.

A clean solve means no hint, wrong attempt, reveal or Undo; a knight trail must
also use a shortest safe route. Other solved rounds count as solved with practice.
Revealed answers count as studied, never as solved. Totals always sum to five;
there is no invented accuracy, Elo or comparative ranking.

Countdowns pause when leaving the page, hiding the tab or reloading. A resumed
round requires an explicit action. Timers repaint their text only; prompts and
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

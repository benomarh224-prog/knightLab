# Daily training and dark-mode readability

`/train/` starts with a compact daily session; Home and Learn also link to it.
The same theme tokens and existing ROQVYN typography are used throughout.

## Session rules

- Three exercises, estimated at about ten minutes. This is an estimate, not a timer.
- Revisit a pending lesson exercise, or practice the next fundamentals exercise.
- Solve a tactical sequence at the selected level. The default follows completed
  course and daily exercises; learners can choose a level before starting.
- Practice a reviewed-game mistake if sufficient evidence exists. Otherwise,
  practice an opening exercise. No public sample is presented as a personal game.
- Personal exercises require before/after evidence for the matching positions at
  depth 19 (or an actual terminal position). Missing or provisional evidence is
  excluded rather than promoted to a stronger analysis quality.

Plans use the local calendar date, remain stable once started, and retain up to
35 days of browser-local history. Opening the plan never earns completion.
Solving the actual exercise does; revealing a personal solution does not.
Successfully practiced tasks are considered when choosing tomorrow's exercises,
independently of the full lesson's quiz requirements. Completed tasks remain
available for review. No account, background notification or cloud sync is added.

## Shared chess behavior and saved work

Course exercises use `LessonPlayer`, its complete legal sequence, existing hints,
alternative feedback, promotion flow, board controls, animation and exploration.
Daily sessions use a separate draft key, so ordinary lesson positions and hints
are preserved. The existing course completion requirements still apply.
Clean daily retries resolve a pending review; attempts using help remain in the
review queue. Personal mistakes reuse the existing `PracticeSession` dialog.

## Readability

The library's legacy hard-coded light-theme colors were overriding inherited
dark text colors. Opponent names, game metadata, dates, review links, profile
information and outcome labels now use the shared theme tokens. Library metadata
is 14px; names are 16px. Hover and selected states keep their readable text.

## Verification

- Regression coverage: calendar rollover, stable plans, level choice, legal
  promotion, invalid tasks, personal evidence quality and position identity,
  course/daily draft isolation, hints, sequence validation, quiz requirements,
  duplicate completion, browser reload and unavailable storage.
- Browser flow: all three tasks solved with native browser inputs; legal
  off-objective attempts and hints do not complete the task; daily completion
  survives reload; ordinary lesson entry remains separate.
- Personal-mistake browser flow uses controlled PGN/evaluation fixtures. Reveal
  does not count; a correct retry counts once; Escape restores focus.
- Game-library screenshots use controlled public-API responses to exercise the
  real win/loss/draw card rendering without relying on changing remote archives.
- Dark/light layout checks at 360x740, 390x844, 430x844, 844x390, 1280x720 and
  1440x900: no horizontal overflow, 44px controls, readable text, square boards.
  Fixed library and daily text were measured at a minimum 4.5:1 contrast.
- Isolated Chromium browser emulation on Windows; no physical iPhone or iOS Safari
  test. Screenshots and detailed browser results are in the ignored
  `.sites-local/verification/daily/` directory.

Design review kept the existing palette and type (`true-black-flat`, seed
495634235, adapted to the established brand). The primary job is starting or
resuming today's session. Its actual three exercises and earned progress are the
data; no invented streaks, ratings or performance percentages are displayed.
The generic inspector's hidden-view tiny-text, first-h1 and font-count findings
are excluded: this SPA retains its other views in the document. The active
training h1, visible text, touch targets and contrast were checked directly in
the running interface. The existing typefaces are preserved.

# Adaptive daily training — 10 November 2026

Daily training now uses the learner's observed practice rather than only selecting
the next unfinished exercise. It reuses the existing three-task session, course
boards and reviewed-game practice dialog. No new training screen, rating, quiz or
timer is introduced.

## Selection and difficulty

`training.adaptive` course metadata supplies the ordered difficulty bands. Tactical
Vision contributes Beginner, Intermediate and Advanced; Calculation Lab contributes
Challenging, Advanced and Expert. The two Advanced bands are labeled with their
course names. Session options offer Automatic or an explicit starting band.

The scheduler records full board solutions, with separate counts for hints, legal
alternatives and solution review. Two different exercise solves without assistance
at the current band advance one band. A supported solution selects a lower band
and, where available, a different position on the same verified lesson theme. A
normal course solution above the current band can establish that higher starting
band; an assisted attempt starts one band below the sampled exercise.

Illegal taps and choosing a promotion piece do not reduce the band. A legal
off-solution move is recorded as a retry, without claiming it is a chess mistake.
Same-exercise, same-calendar-day replays cannot erase earlier help or farm band
increases. Solution playback and free play cannot create independent solves.

Only unopened future daily tasks may change after a measured result. Opened tasks,
their drafts, done IDs and the board being played remain stable. The session still
contains at most three tasks. Reviewed-game tasks retain their validated engine
alternatives; existing review-quality requirements remain unchanged.

## Spaced review and recap

Hints, legal alternatives or viewing the solution schedule the exercise for review
two local calendar days later, including when it is left unfinished. An independent
review expands the interval from 2 to 4, then 8, 16 and at most 30 days. A new
independent exercise starts with a seven-day interval. Due work is prioritized in
the next newly created daily session. Dates use local calendar arithmetic at noon,
so daylight-saving changes do not turn a two-day interval into one or three dates.

Reviewed-game Hint and Reveal actions also schedule a retry. Revealing a solution
does not complete the daily task. Correct answers report actual help and retry
counts to the same scheduler.

The Train page shows a compact recap after a solved task and at session completion:
independent solves, supported solves, an evidenced improvement where available,
the next theme to revisit and the next difficulty. Old results with no measurement
are labeled unmeasured. These are practice observations, not Elo estimates,
accuracy percentages or a claim of mastery.

## Storage and compatibility

The new browser-local profile uses `roqvyn-adaptive-training-v1`. Existing course
completion arrays, learning memory and `roqvyn-daily-training-v1` stay in place.
Lesson signatures and chess data are unchanged. New optional draft fields preserve
help evidence across reloads. An older partial draft without those measurements is
not assumed to have been solved independently.

Started legacy sessions remain intact; all their existing tasks are treated as
opened. Repeated completion callbacks are idempotent. Invalid signatures and stale
tasks are excluded from review scheduling. Blocked storage still permits an
in-memory session. Profile reads refresh saved state, and validated metadata and
seen-ID sets are cached to avoid rebuilding the whole history per candidate.

## Verification

- **403 automated tests passed**, including 16 new model/UI integration tests.
- Covered live three-task adaptation, normal lesson evidence, hints, alternatives,
  illegal moves, promotion selection, solution review, entire multi-move solutions,
  replay protection, legacy drafts, legacy daily results, reloads, blocked/corrupt
  storage, reviewed-game scheduling, day rollover and a daylight-saving boundary.
- DOM-based UI checks exercise actual difficulty selection and solve handlers,
  recap rendering, completed-task review and reload persistence.
- A newly computed recommendation cannot replace the visibly selected exercise
  during a click from either the Train list or the homepage preview.
- Production build succeeds. Local HTTP checks return 200 for Train, Calculation
  Lab, JavaScript and CSS, with the scheduler and recap present.
- Existing board layout and navigation remain shared. New recap text uses theme
  tokens, normal document flow and wrapping text; existing 44px controls are reused.

Browser Use remains disabled in the current Work environment. No new visual browser,
360/390/430px emulation, real-iPhone or screen-reader verification was performed.
DOM test doubles and HTTP checks are not represented as real-device testing.

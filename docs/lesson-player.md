# Shared lesson experience

All 190 current lessons use `LessonPlayer` (`src/lesson-player.js`), rendered by `src/lesson-ui.js`. The existing `learning-ui.js` entry point re-exports the shared UI. Course progress/catalog rendering is separate in `learning-progress.js`. No course ID selects stages or completion rules.

## Existing lessons

The adapter reads the existing lesson's guide introduction or subtitle for Learn, its FEN/moves/practice color and study start for Try, and its supplied quiz for Check. It does not alter the course content or selected continuations. A concept is shown individually. Rules, goals, move explanations, source references and the tactical calculation routine remain under Learn more; identical repeated sentences appear once.

All current lessons contain practice: 28 beginner lessons (including six endgames), eight French Defense lessons, ten Italian Game lessons, and 144 tactics exercises. Only the 28 beginner lessons supply knowledge questions. They continue to require both the board exercise and correct quiz answer. The remaining courses require their original board exercise. Learn is reviewable but is not added as a new completion requirement for these legacy lessons.

## Future lesson data

Existing records need no conversion. Structured lessons can instead supply:

```js
{
  id: 'two-positions', title: 'Compare the centers',
  concepts: [
    { title: 'Central space', text: 'One short idea.' },
    { title: 'Counterplay', text: 'A second idea.' }
  ],
  activities: [
    { kind: 'practice', fen: '...', moves: ['...'],
      practiceColor: 'w', startPly: 0, instruction: 'One clear task.',
      notes: ['Explanation of the first move.'] },
    { kind: 'demonstration', fen: '...', moves: ['...'],
      notes: ['Explanation of the demonstrated move.'] }
  ],
  questions: [
    { question: 'A supplied question?', options: ['A', 'B'],
      answer: 0, explanation: 'Why the answer follows.' }
  ]
}
```

`activities` also accepts the alias `exercises`. Every position keeps independent practice, replay and completion state. Practice supports opening sequences, puzzles, piece movement and endgames through the same strict chess.js rules. Notes may be an array or a function of verbose moves, as in existing courses.

Omit absent stages or supply empty arrays: `concepts: []` skips Learn; absent activities and moves means no board; absent questions means no Check. A text-only lesson completes through its reading steps. A demonstration completes when its supplied line reaches the final position; a static demonstration with no moves uses an acknowledgement. Set `completion: 'acknowledge'` on a demonstration for an explicit finish button. An activity or question can declare `required: false`; `completion: { learn: true }` explicitly requires reading. Empty practice activities and unsupported activity kinds are rejected rather than silently creating an exercise. No quiz is generated.

## State and accessibility

Existing `knightlab-*-course-v1` completion arrays stay unchanged. Versioned partial snapshots use `<course-key>:lesson-player-v1:<lesson-id>`. They retain concepts read, active stage/position/question, exact practice progress, hint count, answers, orientation, separate replay cursor and exercise completion. Stage switches do not call practice reset. Correct moves are replayed through the original validator during restoration. A content signature invalidates obsolete drafts without discarding legacy completion. Corrupt, unavailable or full storage fails gracefully.

Completed stages remain accessible. Check is unavailable until required board activities are solved, unless the lesson was already completed. Retrying an exercise does not revoke earned completion. Wrong legal alternatives leave the position unchanged and remain distinguished from illegal moves. Promotion always requires an explicit piece choice.

Stage/concept/question changes focus the named stage heading and bring the stage controls into view. The board retains roving arrow-key navigation and Enter/Space activation. The Lessons dialog focuses the active lesson, supports Escape, restores the trigger focus and closes on desktop resize. Native disclosures support keyboard use. Body copy is 16px, mobile headings 24px, and controls outside the board have a 44px minimum height. Board squares divide the available board width into eight equal cells.

## Responsive layout

Mobile practice is title → short instruction → square board → board controls → optional practice tools. Detailed content follows under Learn more. The board depends only on available width. There is no viewport-height cap, CSS zoom, page scale, browser-zoom restriction, fixed lesson footer or height-based board shrinking. Short screens scroll normally. Bottom navigation stays in normal document flow and has iPhone safe-area padding. Desktop uses a separate course-navigation column with a prominent board and adjacent practice panel.

## Verification, 15 October 2026

`npm test`: 136 passing tests. New model tests solve all 190 catalog lessons, enforce original completion requirements, restore partial and completed progress, preserve legacy completion keys, reject illegal/different moves, and exercise castling, explicit promotions and en passant. Structured fixtures cover multiple positions/questions, optional requirements, text-only reading, moving/static demonstrations, corruption and blocked storage.

Browser testing used the deployed Vercel site through the supported browser tool:

- Beginner `knight-jumps`: all stages; knight moved entirely with arrow keys and Enter; wrong/correct quiz answers; Next gated until correct; completion and Check stage restored after reload.
- Italian `italian-development`: Nf3, automatic ...Nc6, stage changes and partial reload, then Bc4 completion; no invented Check stage.
- French `advance`: focused starting position and ...c5 completion; no invented Check stage.
- Tactics `beginner-01`: rejected illegal Nh5 and different legal Nxf5; Ng6+, automatic ...Kg7, hint and Nxe7 completion; Lessons dialog active focus and Escape restoration.
- Endgame `support-your-pawn`: Kd5, automatic ...Kd7, partial reload, e4, then the supplied knowledge check.
- 360×844, 390×844 and 430×844: square board, no horizontal page overflow, all visible controls outside board at least 44px high. Desktop 1440×1000: sidebar, 651px square board and adjacent tools. Short landscape 844×390: width-based board, normal vertical scrolling, expanded details and reachable footer without overlap. Also tested 360×740 and 430×932 during exercises.
- Build, DOM ID bindings, authored CSS parsing and deployment checks passed. No browser console errors were observed in the tested lessons.

No text-only or demonstration-only lessons exist in the current catalog, so these were tested with model fixtures, not as published course pages. Safe-area CSS is present; a physical iPhone/Safari run was not available. Browser viewport checks emulate dimensions and do not claim physical-device testing.

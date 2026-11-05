# A simpler ROQVYN interface

The established logo, stone/charcoal palette, serif headings and chess artwork
are retained. The update reduces the number of competing entry points and
places secondary tools behind one disclosure for their context.

## Navigation and Home

Desktop navigation has four primary destinations: Learn, Analyze, Train and
Play. The logo links Home; My games remains available in More. Mobile uses the
same live controls in a compact native dialog, with secondary tools behind More
options. Find games remains in the shared header. Menus support Escape, native
focus restoration and outside-sheet dismissal, with bounded scrolling on short
screens.

Home keeps its existing hero and two actions, Learn chess and Analyze a game.
Three existing course previews replace the repeated topic filters, five large
cards, four-step journey and duplicate import/sample links. A compact Continue
learning row appears only when a real saved learning visit exists. Import and
the sample remain in Analyze; Play and Train remain in navigation. The original
Tal collection artwork is retained behind About attacking chess in Learn.

## Learning, analysis entry and training

One labelled native Topic selector replaces four category buttons with counts.
Options come from the course registry, and selection still uses the existing
URL and browser-storage preferences. All eight current courses remain available.
Smaller course rows show the title, short description, real progress and a clear
course action before a large image can push it below the screen. Course maps
and practice review remain available below the catalogue. Saved continuation
links are compact and still return to the exact lesson.

Lessons share one More menu that moves between the lesson heading and board
controls according to the current stage. Stage review, coordinate practice,
restart, board flipping, Focus, review lines and exploration retain their actual
controls and handlers. Generic or duplicated concept headings are hidden;
distinct concept titles, teaching content and all required completion steps
remain. Hint and Undo remain by the board.

Analyze's four entry actions use compact rows. Train shows its useful actions
first; empty game/side selectors and disabled mistake actions are hidden until
a reviewed game is available. White, Black and both-side training is unchanged.
No lesson, engine search, accuracy formula, move threshold, sound preference or
saved progress format was changed.

## Verification

286 Node tests pass, including the existing engine, chess rules, accuracy,
coaching, course content and progress tests. New checks cover topic counts and
navigation backdrop behavior. The old Tal discovery test now verifies its
current Topic entry rather than a removed Home filter.

Running-browser checks cover all course categories and their persisted selection,
PGN validation, mobile/menu keyboard access, saved progress after reload, a full
beginner Learn → Try → Hint → Check → Continue flow, and a French opening's
automatic reply and legal completion with Black at the bottom. Play, My games
through More, the analysis coach, Show me, free-board takeover, drag and Undo
remain verified.

Home, Learn, Analyze and Train are checked at 360, 390, 430, 844×390 and 1280×720.
There is no horizontal overflow; short menus scroll internally. Analysis checks
also hit-test all 64 squares. Mobile checks use an isolated browser with viewport
emulation, not a physical iPhone or iOS Safari.

The design inspector was run. Its generic SPA probe also inspects hidden routes
and closed disclosures, so its no-title/tiny-text findings include inactive
screens. The active Learn h1 and visible controls were checked directly in the
browser. Muted catalogue/map contrast was strengthened. Screenshots, flow checks
and source data are retained in `.sites-local/verification/simple-interface/`.

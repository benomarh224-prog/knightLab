# Coach-first analysis

The shared analysis coach now has a persistent 132px summary: verdict and move, two lines of the existing evidence-based teaching, Show me, and Details. It sits above the mobile board and alongside the desktop board. It reuses the current coach report and validated demonstration handler; it adds no chess judgments. Full explanations stay in the accessible floating Details panel. Repeated selection-only renders do not rewrite the live explanation.

The Board / Moves / Summary tab strips are hidden. Their existing functions are available through the board's More menu as Game moves, Game summary and Back to board. Mobile secondary views get a compact Analysis return action and the same More menu. Back, the move strip, Next and a 44px More action share one row directly below the board. Existing quality, opening, Focus, sound and playback controls remain available. Focus closes back to the visible More action rather than a hidden menu item.

Show me replaces the summary in the same 132px slot. The 36px engine-progress slot stays reserved while its contents are hidden. Starting or finishing a demonstration therefore does not pull the board upward. Score/coach text updates retain the fixed evaluation geometry described in `workspace-stability.md`.

## Returning from a variation

The previous implementation extended a branch backward across its root, causing Next to replay the experiment instead of continuing the reviewed game. The ordinary Back action now exits exploration when it reaches a root belonging to that game. The original ply, PGN, evaluation array, review quality and resume state are retained. Next follows the original game. A root at the initial position and custom-FEN games follow the same rule. A coach continuation taken over inside an alternative also returns to the saved original review anchor. Selecting a piece without making a move still permits normal backward navigation. First position also exits the branch.

Variation-tools Undo deliberately remains inside the branch for trying another move. Reset, legal alternative moves, underpromotion, both-side exploration and demonstration takeover remain unchanged. Outstanding engine work is cancelled on exit; delayed branch results cannot alter the resumed game. No additional return-mode button or storage migration is needed.

## Stone boards

`board-surface.css` supplies the same colors in Analysis, Lessons, Training, Play and future boards: light `#D6DCE3`, dark `#7C8B9D`, border `#465568`. Last moves, selection and legal targets use subdued blue-gray accents. Coordinate contrast, capture rings, check feedback, licensed Maestro vectors, 150ms motion and reduced-motion handling are preserved.

## Verification

- 318 Node checks pass, including automatic return at a branch root, original next-move preservation, custom-FEN roots, cancelled asynchronous work and Show me's existing validated handler.
- Browser layouts: 360×740, 390×844, 430×844, 844×390, 1280×720 and 1440×900. All 64 squares are hit-testable, boards stay square, menus stay bounded, old tabs are hidden, and no horizontal overflow or duplicate IDs occur.
- Native legal alternative d4/d5 from an e4/e5 game, Back twice, original Nf3 via Next, reload/resume, independent Undo, Show me/Done without board movement, Focus/Details/Escape, More menu navigation and focus restoration, dark/light modes and a beginner lesson solution.
- Artifacts: ignored `.sites-local/verification/coach-first/`. Browser checks use isolated Chromium-family emulation on Windows, not a physical iPhone or Safari.

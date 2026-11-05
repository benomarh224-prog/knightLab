# Appearance

Dark mode is in desktop **More → Dark mode** and mobile **menu → More options → Dark mode**. Both controls are native buttons with switch semantics and synchronized On/Off states. They support keyboard activation and the existing menus retain Escape, outside dismissal and focus restoration.

`theme.js` owns preference handling; `theme-init.js` is a small independent, blocking bootstrap before stylesheets, so the stored preference applies without waiting for the chess app or engine. First visits follow `prefers-color-scheme`, including live OS changes. An explicit selection is stored under `roqvyn-theme` and overrides the OS on later visits. Storage failures allow session changes; storage events synchronize tabs. No existing progress, review, audio or game data is migrated or changed.

`calm-theme.css` supplies shared surface, text and control tokens. `dark-theme.css` replaces those tokens and adapts older course, dialog and review surfaces. Board square colors, piece artwork, photos and chess classification meanings retain their palettes. Theme changes do not render the board, restart the engine or affect lesson completion. Reduced-motion preferences disable the switch animation.

## Verification

- 291 Node regression tests pass, including system preference, explicit preference, cross-tab synchronization, blocked storage, independent first-paint initialization and preservation of other storage keys.
- Isolated Chromium-family browser: 25 page/viewport combinations across 360×740, 390×844, 430×844, 844×390 and 1280×720. No horizontal overflow; all 64 lesson squares remain reachable. Screenshots are retained in the ignored `.sites-local/verification/dark-mode/` directory.
- Native mobile and desktop switch activation, Enter/Space, synchronized switch states, persistence across reload/routes, live emulated OS changes and explicit override checked in the running interface.
- Legal beginner rook exercise → Check → Continue succeeds. Toggling preserves the exact lesson/review FEN, piece markup, board size, square colors, lesson stage and saved progress.
- Visually checked Home, catalogue, lesson Learn/Try, Hint, More, desktop course list, Play settings/board, sound/import dialogs, reviewed sample board, floating coach, move list and completed statistics. Targeted computed-color checks found no remaining low-contrast text in those checked views.
- Mobile sizes and system preferences are browser emulation. Physical iPhone and Safari are not available for this verification.

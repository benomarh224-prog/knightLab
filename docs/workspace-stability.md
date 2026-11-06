# Evaluation and workspace stability

The horizontal evaluation track owns a fixed 20px row. Its fill spans the track and animates with `scaleX`, rather than changing layout width. Its score is absolutely positioned, uses tabular figures and cannot wrap or contribute intrinsic size. Pending, centipawn, forced-mate and completed-position labels use the same geometry. The existing White-perspective advantage mapping is unchanged; accuracy and classification formulas are untouched. Reduced-motion preferences disable the transition.

Analysis progress keeps a 36px slot, including during free analysis. Its status and percentage have separate grid columns. Long status text truncates visually, remains in the DOM and has a full title. The persistent move-coach summary keeps a 132px slot; verdict, notation and explanation updates cannot resize it. Full teaching is in Details. Analysis excludes browser scroll anchoring. All these reservations use normal flow; they do not introduce overlays or scale the page.

A separate desktop jump was observed during move navigation: `scrollIntoView` on the selected move cell also moved the window by 14px. `keepMoveInList` now adjusts only the move list's own bounded `scrollTop`. The board, document and sticky header are not scrolled by automatic move navigation. Explicit user actions to enter analysis or another section still scroll intentionally.

Play reserves a 68px score/status row. Its pending label uses a smaller readable font in a fixed score column, so “Thinking…” cannot overlap the turn text. PGN `?` name placeholders display White/Black while real names remain intact. ROQVYN is now plain text in the shared header and footer, with no logo image tile; navigation and saved progress keys are unchanged.

## Verification

- 314 Node checks pass, including the unchanged evaluation mapping, pending/mate painting, bounded move-list scrolling, PGN names, legal chess moves, lesson completion and restored progress.
- Six browser layouts: 360×740, 390×844, 430×844, 844×390, 1280×720 and 1440×900. Live Stockfish updates and four long-status/large-score/mate stress states keep the same board coordinates, dimensions and scroll offset.
- Native imported free-analysis move followed by an asynchronous depth-18 result; lesson solution; Play human move and actual engine reply with evaluation enabled. No browser console errors, horizontal overflow or logo images in the shared branding.
- Light/dark screenshots and machine-readable results: ignored `.sites-local/verification/eval-stability/`. Stress states are UI fixtures; real engine scores are recorded separately.
- Chromium-family viewport emulation on Windows. No physical iPhone or Safari testing was available; the original score-only shift was not reproduced in that browser, so the fixed track/slots and compositor-only animation explicitly remove the layout-sensitive behavior across browsers.

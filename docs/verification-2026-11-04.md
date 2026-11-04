# ROQVYN usability and accuracy verification

Verified against a locally served production build on 2026-11-04.

## Checks

- `npm run build` passed.
- `npm test`: 248 passed, 0 failed. Seven new scoring/menu regressions supplement the existing 241 checks.
- UI binding validation: 395 unique element IDs, 0 missing bindings, 0 CSS parse warnings.
- `git diff --check` passed.
- A visible-text audit found no remaining informational text under 11px in the mobile analysis view, excluding chess coordinates and SVG artwork.

## Running browser flows

Viewport/touch emulation: 360×740, 390×844, 430×844 and 844×390. Short desktop: 1280×600. An isolated temporary browser profile was used; the user's normal browser was not accessed.

- Analyze → Opera sample → real Stockfish review completes → Summary shows separate White and Black percentages, reviewed counts, quality and method. Percentages derive from the engine run and can vary across search runs.
- Every analysis, lesson and Play board had 64 squares, square geometry, no horizontal page overflow, and every square's center hit its own board square. Short landscape required a further fix: scrolling now reserves both the sticky header and the analysis tabs.
- Analysis tabs and Details measure 44px high and 14px text; Next remains 52px. Before: 30px / 10px and 28px / 10px respectively.
- Analysis and lesson More panels stay entirely within the viewport at every width. Short landscape constrains panel height and scrolls the menu internally. Outside click, keyboard ArrowDown, Escape and focus restoration passed.
- Lesson guided example → Next idea → Try → Hint → More → correct cxb5 → Check → correct answer → Continue to the rook lesson. Previous / Continue remain in normal document flow. Existing saved-progress and move-validation tests pass.
- Play expanded settings → Challenging difficulty → Done / Back to board, at all four emulated sizes. Selected difficulty persists while collapsing. Escape collapses settings while leaving Play open.
- Invalid PGN is rejected with visible feedback while the import dialog stays usable; input text is 16px. The test uses real browser input dispatch.
- No browser JavaScript exceptions in these flows.

## Artifacts

The checkout-local `.sites-local/verification/2026-11-04/` folder contains the JSON measurements, test output and screenshots: `analysis-360.jpg`, `analysis-390.jpg`, `analysis-430.jpg`, `analysis-menu-844.jpg`, `summary-390.jpg`, `lesson-390.jpg`, `lesson-menu-390.jpg`, `lesson-check-390.jpg`, `play-settings-390.jpg`, `play-390.jpg`, `import-validation-390.jpg` and `desktop-1280x600.jpg`. Baseline: `before-analysis-390.jpg` and `baseline.json`.

## Limitations

These are desktop-browser emulations, not physical-iPhone tests. Real Safari, software-keyboard viewport changes and hardware safe-area insets were unavailable. Safe-area padding and 16px inputs are retained, but cannot establish physical-device behavior. The frontend style inspector has inherited brand/style findings and hidden-screen false positives; it is not treated as a clean accessibility certification. Focus, live hit testing, visual screenshots and relevant user flows were verified separately.

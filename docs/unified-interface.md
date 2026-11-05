# Shared interface and quieter analysis — 2026-11-05

## Changes

- Added shared interface tokens for stone page backgrounds, white panels, charcoal actions, muted text, blue feedback, 8px controls and 12px cards. Existing calm-theme styling now uses those shared tokens. Applied the same treatment to Home, Learn, Train, Games, Analysis, Lessons, Play, search/import/audio dialogs, navigation and secondary menus.
- Normalized button spacing, heights and corner shapes; kept primary/secondary/disabled/selected states distinct. Header Find games now matches on every page. Mobile category selections have a visible charcoal active state.
- Moved the existing live opening card into Analysis More → Opening details. ECO codes and long opening names no longer occupy the player row. Opening names, ECO codes, the study line and Show opening position remain available. The same node and handlers work in Focus mode.
- Kept player names together and More aligned on the right. Gave the PGN export menu action a readable label. Replaced the Coach diagonal-arrow text with an SVG to avoid emoji presentation on phones.
- Removed decorative hero kicker/benefit repetition and hid redundant course-card marketing bullets. Lesson content, progress, completion requirements and chess functionality are unchanged. Shortened the board status to the side to move.
- Fixed the Train/Analyze entry headings that had been laid out as three narrow flex columns. Training selects now use their container width instead of the legacy global select-width cap.

## Verification

- Production build succeeds; 259 Node tests pass. UI validation: 404 unique static IDs, zero missing bindings and zero CSS parsing warnings. git diff --check passes.
- Isolated Chromium browser: 360x740, 390x844, 430x844, 844x390 and 1280x720. Home, Learn, Analyze entry, Train and Games all have the same computed page colour, header button colour, 8px radius and 44px touch height, with no horizontal overflow.
- Every tested analysis board remains square with 64 clickable squares. Opening metadata is absent from the visible toolbar and accessible inside More; menu bounds and Escape/focus restoration pass. Show opening position and opening details in Focus remain functional.
- Floating coach stays open across move navigation. Play difficulty/settings and lesson Try → Hint → Coach dismiss preserve their behavior; lesson navigation remains in document flow. No browser exceptions.
- Before/after screenshots and raw browser measurements are in ignored .sites-local/verification/unified.

## Limits

Phone checks use browser emulation, not a real iPhone/Safari. Course illustrations, ROQVYN logo, chessboard/piece colours and semantic verdict/threat/check colours are intentionally retained. No engine parameters, accuracy calculations, classification thresholds, audio or storage formats changed.

# Classic board, dry audio and responsive review

## Visuals and audio

The active shared piece renderer now uses Colin M. L. Burnett's classic vectors (GPL-2.0-or-later), with originals, license and source hashes under `src/assets/pieces/classic/`. These are openly licensed assets, not Chess.com's proprietary pieces. The original drawings are unchanged; the inline SVG viewport is framed at `2 2 41 41`. The board uses the familiar cream/green pairing `#EEEED2` and `#769656` across Analysis, Lessons, Training and Play. ROQVYN branding is preserved.

Analysis has a neutral white coach panel, quieter tabs, visible review progress, and equal Back / Next controls around a single move label on mobile. The full move list remains in Moves. The duplicated marketing footer is hidden only in the analysis workspace. A legacy `!important` two-column rule was the cause of the uneven playback row; removing it allows the real three-column layout to take effect. All controls remain in document flow.

Seven new original dry taps replace the longer recorded impacts. Ordinary moves last 85ms, captures 110ms, and castle is one cohesive two-hit clip. Check, promotion, completion and incorrect-attempt feedback remain distinct. Rebuild with `node scripts/prepare-classic-audio.mjs`; `wood-audio.js` provides the same deterministic source for fallback playback. Assets are dedicated to CC0. The shared accepted-move priority, gesture unlock, deduplication and saved mute/volume are unchanged.

## Analysis behavior

- Fast review (140ms per position) is the default. Standard (650ms) and Deep (depth 18) remain selectable, including while a run is active. The last selected mode persists; fast results are explicitly labelled estimates. No accuracy formula or classification threshold changed.
- The current move's before/after positions are reviewed first, followed by its reply and remaining missing positions. Navigation can change that priority while reviewing. Each run attempts a missing position once, so an unfinished Deep search cannot cause an infinite retry loop.
- Fast evidence now survives reload, isolated from Standard / Deep caches. Scores are saved periodically and on completion, rather than only when a review is paused.
- Repeated move classification, SAN conversion, coaching and threat calculations reuse validated results. Cache keys include evaluation inputs; a deeper search or changed continuation invalidates them. Cached maps are bounded or keyed weakly by parsed move objects.
- Piece selection no longer starts an engine. A legally accepted variation move starts its search; free movement remains available during search or after an engine error. The unused HTML-native draggable flag was removed, leaving the shared pointer-based drag handler authoritative.

## Measurements and verification

Isolated local Chromium browser, 390×844 viewport, Opera sample (33 plies), cold temporary profiles. Baseline Standard review: 22.575s. New Fast review: 5.161s. This wall-clock improvement includes the deliberately lighter Fast search; it is not a claim of equal analysis depth. Median synchronous move-button handler cost fell from 48.9ms to 7.9ms when revisiting evaluated positions. Initial uncached navigation remains more expensive. These are local measurements, not guaranteed phone timings.

`npm test`: 253 passing checks. New regressions cover selection-driven scheduling, precise-run termination, cached-evidence invalidation and Fast cache persistence. Existing legality, mate coaching, progress, promotion, castling, audio priority and retry checks remain passing. UI validation reports 395 unique IDs, no missing bindings and no CSS parse warnings.

Running-interface checks passed at 360×740, 390×844, 430×844 and 844×390: every board remains square, all 64 square centers hit their own square, no horizontal overflow, bounded More menus and keyboard dismissal, lesson Learn / Try / Hint / Check / Continue, Play settings and invalid PGN feedback. Back and Next each measure 80×48px. An actual browser pointer drag captured the knight on b5 with c6xb5. Focus mode retained 64 clickable squares and equal controls. The first drag simulation omitted the pressed-button state; correcting the input distinguished the test error from application behavior.

Artifacts are local under `.sites-local/verification/classic/`: `before.json`, `after.json`, mobile screenshots, `focus-390.jpg`, browser results and test output. The browser was isolated; the user's normal tabs were not used. iOS Safari, a physical touchscreen and physical-speaker listening were unavailable. Audio sample properties and routing are tested; perceived sound quality remains a listening preference.

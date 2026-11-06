# Review accuracy and mobile workspaces

## Scoring contract

Accuracy is computed from the existing Stockfish position evaluations, normalized to White by the engine adapter. Each adjacent pair belongs to the actual mover in the parsed PGN, including a Black-to-move custom FEN. This is independent of board orientation and the connected username.

The calculation follows [Lichess's documentation](https://lichess.org/page/accuracy), checked 2026-11-04, and its linked implementation:

- [AccuracyPercent.scala](https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala): precise move formula, including the upstream +1 uncertainty bonus; window size is floor(plies/10), clamped to 2–8; repeated initial windows align the rolling volatility with every move; standard deviations are clamped to 0.5–12; game accuracy is the mean of volatility-weighted accuracy and harmonic-mean accuracy, separately for each color.
- [scalachess eval.scala](https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/eval.scala): logistic winning chances with coefficient 0.00368208 and a ±1000cp ceiling. A forced mate uses the corresponding bounded winning-chance endpoint. The existing engine's signed cp disambiguates terminal mate-zero; mate distances are not converted to pawn losses.
- [scalalib Maths.scala](https://github.com/lichess-org/scalalib/blob/master/lila/src/main/scala/Maths.scala): population standard deviation and a floor of 1 inside harmonic-mean reciprocals, including zero-accuracy moves.

This is a local mathematical implementation of the documented method, using ROQVYN's evaluated initial position rather than inventing a 50% starting value for imported positions. It does not promise identical results to Lichess's server analysis or Chess.com. Engine version, search time/depth and platform formulas differ. The UI names the method, engine, selected search quality and observed depths.

Incomplete, sparse or insufficient-depth evidence never yields a final percentage: both percentages remain Pending until every required position has a usable evaluation. A side with no moves is Unavailable. Precise mode requires depth 19; older depth-18 evidence is retained as provisional. Terminal positions count without requiring an artificial search depth.

Move-classification thresholds are unchanged. The legacy `summarize` model remains compatible with saved reviews and training. Visible pawn-loss averages now exclude any move touching a mate evaluation and state the denominator. Mate transitions have their own count; move tooltips use explicit forced-mate language. Combined totals are labelled separately. Accuracy is whole-game performance; the board's evaluation is the current position.

## Shared interaction changes

- `viewport-menu.js` owns viewport placement, bounded height, internal menu scrolling, outside dismissal, Escape and focus restoration for analysis and lesson More controls. Native popovers place these above sticky chrome and open dialogs. The fallback uses fixed positioning. Settings and lesson state are not recreated when a menu opens.
- `usability.css` is the last workspace stylesheet: control targets ≥44px, readable labels, mobile input fonts of 16px, normal-flow lesson navigation and responsive square boards. Chess-square dimensions follow the available board width; the existing compact piece badge retains its separate 44px transparent hit area instead of obscuring the piece.
- Play keeps its existing difficulty, color, starting-position, sound and evaluation controls. Expanded settings have a sticky collapse summary on phones and a Done / Back to board action. Escape closes settings before closing Play.

## Verification

The isolated browser exercises are in the checkout-local `.sites-local/verify-nov.mjs`; output and screenshots are in `.sites-local/verification/2026-11-04/`. They use the installed browser through the frontend skill's CDP helper, in a new temporary profile, without accessing the user's browser.

The baseline measured mobile analysis tabs at 30px high / 10px text and coach Details at 28px / 10px. Updated controls measure 44px / 14px. Coverage includes 360×740, 390×844, 430×844, short landscape 844×390, legal lesson capture and Check / Continue, all 64 board squares, menu bounds, outside-click and Escape dismissal, keyboard focus, sample review through completed Summary, Play difficulty / return / Escape, and invalid PGN feedback. The screenshots also show the two separate player accuracy values and the scoring disclosure.

Regression tests cover both perspectives, custom Black starts, bounded cp and mate signs, terminal mate-zero for either winner, retained and lost mates, missing and shallow analysis, sliding windows and harmonic/volatility aggregation. Existing rules, coaching, lessons, saved progress and audio suites are run unchanged.

These are browser viewport/touch emulation checks, not tests on a physical iPhone. Real iOS Safari, browser keyboard resizing and device safe-area insets require a physical-device follow-up. The generic design inspector also reports inherited brand/style preferences and hidden-screen false positives; visible control measurements and complete user flows are checked separately.

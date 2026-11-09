# Product-first homepage refinement

The homepage now shows a real chess position and explanation in its first screen. The existing five-move Opera sample, its legal frame data, keyboard navigation and full-review destination are reused. The hero's two actions open Beginners and the existing Analyze entry.

Course entries now share a balanced three-column shelf on desktop and compact image/text rows on phones. The cinematic artwork moves to Board Lab, alongside its two real modes and library-derived figures. Daily training continues to show the saved plan and earned completion state. Four native keyboard-accessible disclosures replace the long open FAQ. The duplicated closing banner becomes a single short invitation.

The ROQVYN wordmark, theme colors, typography, piece assets, chess rules, lessons, review engine and storage formats are preserved. No dependency or external artwork was added. The hero no longer downloads a priority decorative image.

At 1440×900 the page measures **3.4 screens**, down from **4.9**. At 360×800, 390×844 and 430×932, the entire sample board and its navigation fit in the initial viewport in local Chrome emulation. Short landscape screens use normal document scrolling. Every caption uses a reserved area; the castling explanation was shortened after a 360px check caught text extending toward the board.

## Verification

- Build and **367 unit/regression tests** passed. The sample test additionally checks White's king on c1 and rook on d1, grounding the shortened castling caption in the actual position.
- **45 browser assertions** covered replay order, Enter activation, beginner/opening/tactics/Board Lab routes, saved daily-plan parity and reload persistence, lesson resume, analysis entry/sample, search dialog, menu Escape/focus restoration, reduced motion, 44px targets and no horizontal overflow.
- **46 focused browser assertions** covered the final light/dark layouts at 360×800, 390×844, 430×932, 844×390, 1280×720 and 1440×900; all five captions staying clear of the board without shifting it; collapsed FAQ defaults; Enter opening a real answer; and touch input advancing the sample. No browser exceptions were observed.
- Visual inspection at 1440, 768 and 390px: **0 failures**. All six screenshot outputs were inspected. Warnings remain for no video and limited decorative motion. The real user-controlled replay and reduced-motion support are preferable to an unrelated video or automatic board playback.
- Chrome on Windows with emulated mobile sizes, **not a real iPhone/Safari/Android test**. This scoped homepage change does not retest every course completion or a full deep review.

Screenshots: [desktop](screenshots/homepage-refinement/desktop.jpg), [mobile](screenshots/homepage-refinement/mobile.jpg), [dark mobile](screenshots/homepage-refinement/mobile-dark.png).

The existing field-guide direction and seed 1119808422 were retained. The hero was adapted from a photographic seam to a real text/specimen pair because the product's legal replay is stronger evidence than another decorative photograph. The specimen retains the application's own board and quiet controls, with responsive stacking rather than viewport-pinned panels.

## Publication status

The initial packaging/publication action was paused by automatic approval review. The user subsequently explicitly approved publishing this reviewed refinement to the existing Sites and GitHub/Vercel targets. Preserve the Sites owner-private audience and the public `knightlab.vercel.app` domain. The source baselines before this release were GitHub `b89900c0cc161c04a54f91420929c2b9e1d5ad5e` and Sites `3113eab0f8551cd624b36319d27d50eed86e307f`.

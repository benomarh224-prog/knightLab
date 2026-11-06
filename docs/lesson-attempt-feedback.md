# Lesson feedback and controls

Every lesson uses the same move-feedback controller and the existing chess/lesson validator. Illegal moves receive a brief red ring and cross on the attempted destination. Legal moves outside the exercise objective receive an amber question marker and the existing objective-specific explanation, without a mistake/blunder judgment. Accepted moves, promotion choices and legal free play do not receive error cues.

The marker is a pointer-transparent, accessibility-hidden overlay outside the board's replaced tile DOM. It does not translate or resize the board. It aligns with either board orientation and scales with the squares. Each user attempt starts one 480ms opacity pulse, then the marker clears after 1100ms. Render-only updates and asynchronous Stockfish replies cannot restart it. A newer attempt replaces the previous one; selection, Hint, Undo, reset, flipping and lesson/stage changes clear stale feedback. Reduced-motion mode keeps a static marker with no animation. The existing polite live coach text explains the result once.

The fixed 170px mobile coach now uses the site's light/dark surface and action tokens. State accents distinguish illegal moves, objective feedback and completion. The lesson navigation remains two equal 44px actions in the same reserved card. The board's tool row has explicit columns for Undo, move notation, Hint/Explore/Lesson and a 44px More disclosure. The full Return to study position label remains accessible; its visible text is the compact Lesson. No course data, legal rules, depth-19 analysis, saved progress or completion gates change.

Free-play stalemate has its own neutral coach heading and factual explanation: no legal moves while the king is not in check. It directs the learner to Undo rather than treating the ending as an illegal move or automatically revoking completion.

## Verification

- 326 Node checks pass. New regressions cover illegal versus legal objective feedback, accepted-move exclusion, reduced motion, board orientation, rerender deduplication and replacement/timeout races.
- Native browser interactions at 360×740, 390×844, 430×844, 844×390, 1280×720 and 1440×900: square boards, no horizontal overflow, marker alignment, pointer passthrough, unchanged board coordinates/scroll, 44px controls without overlap, bounded More menu, Escape and focus restoration.
- The exact Advanced 03 sequence from the screenshot: Qg1+, Kxg1, c1=Q+, Kf2, Qf1+, then free-play Kxf1 and stalemate. Promotion, completion, compact Lesson, Undo and return to the exercise remain functional.
- Independent pawn capture: legal c5 gets amber rule feedback and a real asynchronous Stockfish explanation without replaying the effect; cxb5 completes practice and Check works. Hint clears a reduced-motion static marker. Dark and light screenshots were inspected.
- Artifacts: ignored `.sites-local/verification/lesson-feedback/`. This is Chromium-family viewport emulation on Windows; no physical iPhone or Safari testing was available.

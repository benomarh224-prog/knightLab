# Responsive depth-19 review

The selected decision now gets a short, visibly preliminary preview before the
full search. Moving to an unreviewed decision interrupts unrelated background
work cooperatively, previews the new selection, and prioritizes its full search.
The same worker stays alive during navigation. No additional engines or network
services are required.

`review-plan.js` reuses the existing review scheduler and quality policy. Preview
searches use one PV, depth at most 12, and a 120 ms ceiling. Full Deep searches
still request two PVs at actual depth 19; Standard still targets 16. Quick mode
retains its existing behavior. A clean hash starts the full pass once, avoiding
preview bounds slowing later MultiPV searches; subsequent full searches retain
their shared hash. This tradeoff is supported by local before/after measurements.
Stockfish documents the cost of additional PVs in its
[official performance notes](https://official-stockfish.github.io/docs/stockfish-wiki/Useful-data.html).

The live coach labels previews explicitly. Preview evidence cannot complete
Deep review or produce final whole-game accuracy. Timed-out searches remain
provisional, with the existing pause/resume and longer-search retry available.
Accuracy formulas and move-classification thresholds are unchanged. Full paired
PV evidence remains available to Great and Brilliant classifications. A partial
interrupted search cannot replace paired evidence of the same depth.

Existing review evidence, exact PGN/mode cache keys, review positions and lesson
progress remain compatible. Reloading a completed cached review starts no
Stockfish worker or searches.

## Measurements

Actual Opera Game analysis, fresh isolated Windows Chromium profile, 390×844
viewport emulation, no CPU throttling, same machine:

| Observation | Before | Final implementation |
| --- | ---: | ---: |
| First selected-move explanation | 4.457 s | 0.408 s, labelled Preview |
| Complete review at actual depth 19 | 83.950 s | 80.183 s |
| Final reviewed moves | 33/33 | 33/33 |
| Search commands | 33 | 36, including three brief previews |
| Uncaught browser errors | 0 | 0 |

The main improvement is early feedback and responsive navigation. A single run
does not establish a reliable reduction in total engine compute time. A full
depth-19 game review still takes substantial time, particularly on phones and
in difficult positions. Experiments that recomputed second lines separately
were rejected because they increased completion time and left checks pending.

## Verification

- `npm run build` succeeds; `npm test`: 356/356 passing.
- Regression checks cover bounded previews, unchanged full-depth/two-PV searches,
  navigation priorities, interruption/retry, cached evidence, legacy/shallow
  quality gates, timeouts, Standard/Quick behavior and a real Stockfish worker.
- Running-interface checks cover preliminary labels, pending accuracy,
  navigation during an active search, pause/reload/resume, completed-cache reuse,
  preserved lesson progress, Summary, keyboard navigation and coach focus.
- Boards checked at 360×740, 390×844, 430×844, 844×390 and 1280×720: square boards,
  64 squares, no horizontal overflow or navigation covering squares, and main
  touch targets at least 44×44 px.
- A real forced-mate PGN is reviewed through completion; mate statistics remain
  bounded and separate from pawn-loss averages.

Evidence and screenshots are local in
`.sites-local/verification/analysis-speed/`. These are browser-emulation checks,
not physical-device results. Real iPhone/iOS Safari, Android and Edge were not
tested.

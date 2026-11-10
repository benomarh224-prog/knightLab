# Compact course outline and 120 mate exercises

The long course outline created the reported blank page: at 1440×820 its list was 1838px tall, the document reached 2191px, and scrolling to exercise 24 put the board's top at −1089px. The shared outline now shows one selected teaching group and three or five rows at a time, with labelled previous/more controls and the true range. It follows the active lesson on direct links and lesson changes, while ordinary board renders preserve the group/page being browsed. All existing courses use it. There is no nested scrolling on the desktop outline.

Selecting a lesson reveals its heading below the sticky header. On phones the same outline stays inside Lessons; Escape/Close returns focus without scrolling the board. Selecting an exercise places focus on its title instead. Group labels use a full-width native 44px select. Existing chess rules, solver orientation, board sizes, hints, replay, free exploration and completion requirements remain unchanged.

## Added exercises

Mate in One grows from 24 to **120 positions**, with **60 White and 60 Black**. The original 24 IDs, FENs and solutions are unchanged, and the existing storage key is retained. Old completions stay earned; the 96 additions begin unsolved. Counts on Home, Train and the course catalog reflect the larger collection.

The six added groups each contain 16 positions: pawn finishes, bishop finishes, knight nets, rook-and-king nets, queen captures and promotion finishes. Together with back-rank mates, queen-and-king nets and piece teamwork, there are nine groups. They are original constructed studies, including paired opposite-color rotations, rather than historical games or 120 different tactical themes. No rating estimates are claimed.

The deterministic generator tests every legal first move and rejects positions with more than one immediate checkmate, including alternate promotion choices. Independent regression tests repeat that exhaustive check for all 120 positions, check both kings' initial safety, verify the checking piece and the stated supporting attacks, and freeze the original 24 records with a compatibility hash. Each exercise uses the shared player and a concrete legal-move recap.

## Verification

- Build passed. **377/377 tests passed**; the focused outline/mate/layout checks also passed.
- **64 browser assertions passed**: original saved progress, all nine group selectors, keyboard paging, deep links, lesson focus below the header, two representative solves from every added group, hints, promotion choice, checkmate dialogue, saved completion after reload, and complete promotion replay.
- Light/dark layouts at 360×800, 390×844, 430×932, 844×390, 1280×640 and 1440×820 had square boards, no footer overlap, no horizontal overflow and at most five outline rows. Mobile Lessons controls met 44px targets and Escape restored focus and scroll position. Representative beginner and French Defense boards still opened correctly.
- After the final select-width fix, **seven more browser assertions passed** across the six sizes and the renamed Queen captures group. The document measured 984px at 1440×820, rather than 2191px before. No browser exceptions were recorded.
- Screenshots were reviewed before and after. The general design inspector measured 2.4 → 1.2 desktop screens. Its raw report retains two failures (it selects the hidden first h1 in this multi-page DOM and reports small text from hidden analysis UI) and two inherited warnings (font counts and unequal board/coach panel heights). This is not reported as a clean inspector pass; the visible lesson and interactive controls were checked separately in the running browser.
- Testing used Chromium on Windows with viewport emulation, **not a real iPhone, Safari or Edge**. All 120 solutions were validated programmatically; 12 new solutions were additionally completed through the browser. No deeper Stockfish scoring or engine changes were made.

Screenshots: [desktop](screenshots/compact-exercises/desktop.png), [phone](screenshots/compact-exercises/phone.png).

This is a focused refinement of the existing ROQVYN lesson workspace, retaining its palette, type and chess pieces. Visual critique: design 7, usability 8, creativity 6, content 8. The reusable course picker fixes the actual scrolling failure; no new decorative assets, libraries or unrelated layout changes were added.

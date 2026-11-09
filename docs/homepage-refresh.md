# Homepage refresh

Reworked the existing homepage around three useful destinations: learn chess, review a game, and practice. Existing lessons, chess rules, review scoring and storage keys are unchanged.

- A split hero uses the existing ROQVYN artwork, wordmark, fonts and theme colors. Learn opens Beginners; Analyze opens the existing PGN/public-game entry.
- A varied course shelf gives Beginners the lead and links directly to opening courses and Tactical Vision.
- A small, replayable Opera Game sample demonstrates five consecutive legal moves. Back/Next updates both the board and the explanation; the board does not move when the caption changes. The full sample opens the existing review.
- Board Lab has a dedicated section. Puzzle totals and Expert route lengths are derived from the actual library (205 puzzles, 43 Expert, 8–10-hop Expert trails).
- Daily training shows the actual saved three-task plan and completed tasks, using the existing controller. The Continue learning banner still resumes the last lesson.
- Four concise answers explain beginner entry, game import, provisional analysis and optional timers.
- Styles are scoped to the home route, support light/dark themes and reduced motion, and retain readable body text and 44px controls.

The sample board is created only when Home is first visited. It does not start a Stockfish worker or play move sounds. All supplied/generated artwork and existing SVG piece credits are retained; no external media or dependency was added.

## Verification

- `npm run build`: passed.
- `npm test`: **367/367 passed**, including two new regression checks for the legal sample sequence and library-derived puzzle figures.
- Local Chrome browser run: **45 passing assertions**, including sample Back/Next and Enter, beginner/tactics/openings routes, Board Lab, real daily-plan parity, saved progress and theme after reload, analysis entry, full Opera sample, username search dialog, menu Escape/focus restoration and reduced motion.
- Light and dark layouts at **360×800, 390×844, 430×932, 844×390, 1280×720 and 1440×900**: no horizontal overflow; square sample board; hero image visible; homepage touch targets at least 44px. The board retains the same top position through all five sample captions at 390px.
- No uncaught browser exceptions observed.
- Automated visual inspection at 1440, 768 and 390px: **0 failures, 2 warnings**. All seven resulting screenshots were inspected. Remaining warnings are no video and ten inherited/responsive type sizes. The real interactive sample is more useful here than unrelated footage; navigation and chart/control typography retain the existing app scale.
- Tests used isolated Chrome on Windows with emulated mobile viewports, not a real iPhone, Safari or Android device. This change did not retest completion of every course or a full depth-19 review; it leaves those systems unchanged.

Screenshots: [desktop](screenshots/homepage-refresh/desktop.jpg), [mobile](screenshots/homepage-refresh/mobile.jpg), [dark mobile full page](screenshots/homepage-refresh/mobile-dark-full.png). These show local QA, not a published deployment.

## Design review

Direction seed **1119808422**, borrowed-category field guide, retaining the existing palette and type. ROQVYN's real positions and daily exercises are the guide's plates and entries. The showcase slot was adapted to one square board because five carousel panels would invent content; the daily slot uses the actual three-task itinerary; four open questions replace overlapping cards. Existing artwork was reused deliberately instead of introducing unrelated photography.

ROUND 1

Seen in one second: large headline, with an accidental empty right half.
Idea: a practical field guide to the site's actual lessons, positions and practice plan.
Live thing: the five-move legal Opera sample.
Layout words by section: hero=seam / courses=shelf / review=plate / lab=field / daily=itinerary / questions=reading / close=invitation.
Scores: design 5.5 · usability 7 · creativity 7 · content 8 → overall 6.5.
Caps applied: inspector failures cap overall at 6.0; effective score **6.0**.
Top three problems:
1. Desktop/tablet hero image had zero height (desktop-fold). Reset inherited hero alignment, gap and padding; stretch the artwork.
2. Footer credits had low contrast (tablet-page-01). Set explicit inverse text/link colors.
3. Giant footer wordmark repeated the closing statement (desktop-page-02). Restore a compact wordmark with one closing action.

ROUND 2

Seen in one second: the ivory knight and a two-line invitation to learn.
Idea and live thing: retained, with actual current practice visible further down the page.
Layout words by section: seam / shelf / plate / field / itinerary / reading / invitation.
Scores: design 6.5 · usability 8 · creativity 7 · content 8 → overall **7.2**.
Caps applied: existing generated/supplied artwork is not four original photographs; the photograph rubric caps design at 6.5. The page is an improvement in navigation and content, not a claim of award-level originality.
Top remaining observations:
1. Course imagery is inherited cinematic artwork; coherent with the existing brand but not exclusive documentary photography (desktop-page-01).
2. Mobile necessarily adds vertical length to hold useful sections (mobile-page-01); no fixed overlays or nested scrolling were introduced.
3. A few inherited navigation type sizes remain (tablet-fold); preserving working app navigation is preferable to expanding this homepage task into a sitewide restyle.

## Publication status

The initial source export was paused by automatic approval review. The user subsequently explicitly authorized publishing this reviewed version to Sites and the GitHub/Vercel production path. Preserve the existing Sites owner-private audience and the existing public `knightlab.vercel.app` deployment target.

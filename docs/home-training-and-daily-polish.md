# Training choices and daily practice

The homepage's training section now offers three clear destinations: Mate in One, Board Lab and reviewed mistakes. Short copy, a single mint choice and neutral surfaces replace the large mint text block. Counts still come from the existing libraries. Reviewed mistakes opens its actual section with keyboard focus, rather than leaving the visitor at the top of the daily plan. A guarded animation-frame callback prevents stale scrolling after fast navigation away.

Daily practice uses the existing saved daily-session model. Its real completion count and progress bar sit above three directly actionable rows. The primary action starts the next pending exercise, continues an existing session, or opens the completed plan for review. Completed rows remain accessible. Repeated “To practice” labels are removed; tactics titles now match the verified presentation used by the destination lesson. No exercise IDs, daily selection rules, storage keys or completion requirements change.

SVG arrows replace the homepage's diagonal Unicode arrows, which rendered as colored emoji in the supplied phone screenshots. The hero, course selector, theme preferences and Opera sample retain their behavior and branding. There are no new dependencies or image assets.

## Verification

- Build passed; **380/380 automated tests passed**, including new pending/resumed/completed presentation checks, task identity, saved-text escaping and descriptive tactical titles.
- **28 browser assertions passed**. The main daily action opened a real lesson; its board exercise was solved through the interface, the actual daily task was marked complete, and Home showed 1/3 with Continue after reload. Completed and pending rows both opened their own task. A separately seeded completed-day UI fixture verified 3/3 and Review. All three training destinations, keyboard activation, the Opera sample and reduced motion worked without browser exceptions.
- **12 final layout/contrast assertions passed** at 360×800, 390×844, 430×932, 844×390, 1280×640 and 1440×900 in light and dark. Controls were at least 44px; headings stayed within two lines; no horizontal overflow occurred. Sampled secondary labels had a minimum contrast of 4.90:1 in light and 8.42:1 in dark.
- At 390px, training measured **580px rather than 674px**, and daily practice **675px rather than 826px**. Detailed labels remain 14px and body text 16px.
- **Three additional browser checks passed** after the navigation guard: direct reviewed-mistake focus, no stale scrolling on a fast return home, and direct daily-lesson entry.
- The final design inspector reported **0 failures, 2 warnings** at 1440/768/390px. Its `icon-cards` check was explicitly allowed because its detector counts any small SVG inside peer cards; these are trailing navigation arrows, not decorative icons above content. Unneeded card rules/outlines were removed. Remaining warnings concern inherited responsive type sizes and the absence of video. No footage is needed for these working training controls.
- All six final inspector screenshots and focused light/dark section screenshots were reviewed. The visual direction continues the existing knight/mint homepage; no new direction or imagery was introduced. Critique: design 7.5, usability 8.5, creativity 7, content 8. The main improvement is clearer choices and a working daily plan with less vertical bulk.

Testing used Chromium on Windows with emulated mobile widths, **not a real iPhone or Safari**. The completed-day 3/3 screenshot state was a UI fixture; the first daily task was completed through real board interaction.

Screenshots: [phone training](screenshots/home-training/phone-training.png), [phone daily plan](screenshots/home-training/phone-daily.png), [desktop training](screenshots/home-training/desktop-training.png), [desktop daily plan](screenshots/home-training/desktop-daily.png).

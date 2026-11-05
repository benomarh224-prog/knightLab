# Floating analysis coach — 2026-11-05

The mobile coach was being constrained by several legacy fixed-height card and line-clamp rules. The board now has a compact Coach launcher containing only the current verdict and move. The existing, single live coach panel opens in a modeless floating popover, with a fixed-position fallback for browsers without Popover support. No analysis content is cloned or rewritten.

The floating panel has a draggable heading, a 44px close action, one scrollable explanation region, and its own Back/Next actions. The header and navigation occupy separate grid rows, so they cannot overlap the scrollable content. Text has no max-height or line clamp. Move navigation updates the open panel and preserves the explored branch. The board's geometry is unchanged by opening or closing it. The floating panel intentionally covers part of the page; it can be dragged or dismissed to access the underlying squares.

Escape closes the coach and restores focus to its launcher. An open More menu receives Escape first. The popover is hosted inside the Focus dialog when needed, preserving modal accessibility. Another modal retains its own Escape handling. Changing games or workspace layout closes the old floating panel.

## Verification

- 259 Node tests pass. Coach regressions cover live content, navigation, focus restoration, Focus hosting, Escape isolation, and viewport/drag clamping.
- Build succeeds; UI validation reports 404 unique static element IDs, zero missing bindings, zero CSS parsing warnings. git diff --check passes.
- Running isolated Chromium tested at 360x740, 390x844, 430x844, 844x390 and 1280x600. Popover bounds remain inside the viewport; the complete explanation can be scrolled to its final note; header/footer do not cover the explanation; opening/closing does not change board dimensions.
- Back/Next keeps the popover open and updates its move. Dragging, keyboard Escape, focus restoration, and Focus mode pass. No browser exceptions.
- Screenshots and raw results: ignored .sites-local/verification/floating-coach.

Real iPhone/Safari and a browser without native Popover support were not available for physical browser verification. Existing chess rules, review calculations, lessons, progress, sound and branding are unchanged.

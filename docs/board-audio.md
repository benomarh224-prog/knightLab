# Shared board and audio

`board-surface.css` is loaded after the existing application styles. It owns square colors, piece sizing, coordinates, selection, legal targets, capture rings, check, frames and dragging across Analysis, Lessons, Training and Play. `finishBoard` derives capture targets and check from the same chess.js position used to validate moves. New boards should call it after rendering and use `enableBoardDrag` with their existing legal-move handlers. Tap and keyboard handlers remain authoritative.

The original Chessnut SVG drawings and licenses are retained. `piece-frames.js` trims only transparent viewBox margins, preserving full strokes and similar proportions for both colors. Movement uses the shared 150ms animation and is disabled for reduced-motion preferences.

One `MoveSounds` instance serves the whole application. Render an accepted legal move before calling `playSound(move)`. Initialization, imports, reset, engine evaluation updates and animation completion must not call it. Explicit navigation has a unique event ID; repeated callbacks for that ID are silent. Lesson animation emits only when a validated frame is displayed. Autoplay goes through the same navigation path and can be paused with the board's temporary Pause button.

Primary sound priority is promotion, game completion, check, capture, castle, ordinary move. Incorrect exercise feedback is separate and does not sound like an accepted move. The seven small local WAV assets derive from Kenney Impact Sounds (CC0); provenance and source hashes are in `src/assets/audio/`. Optional regeneration uses `scripts/prepare-chess-audio.py`. No audio library or asset-generation dependency is required at runtime or during a normal build. A quiet procedural wood/felt fallback handles unavailable samples.

AudioContext is created/resumed from a trusted pointer or keyboard gesture. Preloading fetches samples without creating a context. Blocked audio fails silently without queuing stale moves. Sound and volume are saved in `roqvyn-audio-v1`; the earlier `knightlab-sound` preference is respected. Default volume is 45%, with a gentle gain curve. Sound settings are accessible from each workspace's secondary menu.

## Verification — 2026-10-20

- Full Node suite: 241 passed, 0 failed, including real Stockfish replies and legal special moves. Focused checks cover sound priority, illegal/stale moves, duplicate callbacks, gesture restrictions, missing assets, mute/volume persistence, sample bounds, drag cancellation, capture/check indicators, reduced-motion lesson frames and autoplay cancellation.
- Production build and UI bindings passed: 395 unique IDs, no missing bindings or CSS parse warnings. `git diff --check` passed.
- Isolated headless Microsoft Edge executable, Chromium 155.0.4283.62: browser flows completed without page errors. The user's open browser/game was not used.
- Lessons: guided pawn demonstration, legal off-target attempt, correct capture and completion at 360×740, 390×760, 430×844, 1280×600 and 844×390. Short landscape uses normal page scrolling; navigation does not overlay the board.
- Analysis: sample-game autoplay advanced one ply, paused, and remained paused after 900ms. Custom legal positions verified castling, capture rings, capture, keyboard movement, explicit promotion and the checked king highlight. Promotion was exercised at 390×844; reduced motion at 1280×650.
- Play: human e4 followed by a real Stockfish e5 reply at 1280×700. Mobile free play completed Fool's Mate at 390×844, with all squares visible and check highlighted.
- Training: imported/reviewed Fool's Mate, generated a personal mistake exercise, requested a hint and revealed its legal solution at 1280×720.
- Mobile sound dialog: keyboard-adjusted volume to 1%, muted, reloaded, and confirmed both preferences remained saved. AudioContext reached `running` after a user gesture in real browser flows.

Physical iPhone/iOS Safari and physical touchscreen dragging were unavailable. Headless Edge mutes speaker output: selection, scheduling, decoding and asset properties were verified, but a human listening comparison was not performed. Screenshots and browser evidence were inspected during verification; no user browser state is published.

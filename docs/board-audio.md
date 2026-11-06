# Shared board and audio

`board-surface.css` is loaded after the existing application styles. It owns square colors, piece sizing, coordinates, selection, legal targets, capture rings, check, frames and dragging across Analysis, Lessons, Training and Play. `finishBoard` derives capture targets and check from the same chess.js position used to validate moves. New boards should call it after rendering and use `enableBoardDrag` with their existing legal-move handlers. Tap and keyboard handlers remain authoritative.

The default is now Maestro BW, using the shared inline renderer and scoped gradient IDs. See `lesson-workspace.md` and `src/assets/pieces/maestro-bw/NOTICE.txt` for its original and adaptation licenses. The Cburnett and Chessnut assets remain licensed legacy files. Movement uses the shared 150ms animation and is disabled for reduced-motion preferences.

One `MoveSounds` instance serves the whole application. Render an accepted legal move before calling `playSound(move)`. Initialization, imports, reset, engine evaluation updates and animation completion must not call it. Explicit navigation has a unique event ID; repeated callbacks for that ID are silent. Lesson animation emits only when a validated frame is displayed. Autoplay goes through the same navigation path and can be paused with the board's temporary Pause button.

Primary sound priority is promotion, game completion, check, capture, castle, ordinary move. Incorrect exercise feedback is separate and does not sound like an accepted move. The current seven local WAVs use actual CC0 chess recordings by mh2o and Alnotreally: a crisp piece landing with a little wooden body. The old oscillators and synthetic pitched tones are removed. Generate them with `node scripts/prepare-foley-audio.mjs` (the previous classic command is a compatibility alias). `wood-audio.js` uses the same embedded recording cores as the synchronous fallback, so an early move never falls back to the old synthesized tone. No audio library or new build/runtime dependency is required.

AudioContext is created/resumed from a trusted pointer or keyboard gesture. Preloading fetches versioned `?v=foley-3` samples without creating a context, bypassing cached older clips. Blocked audio fails silently without queuing stale moves. Sound and volume are saved in `roqvyn-audio-v1`; the earlier `knightlab-sound` preference is respected. Default volume remains 45%, with a gentle gain curve. Sound settings are accessible from each workspace's secondary menu. Its explicit Test sound button auditions the normal move clip, honors mute/volume and never changes game state or consumes a move’s deduplication identity.

## Recorded sound update — 2026-11-06

- Source pages: https://freesound.org/people/mh2o/sounds/351518/ and https://freesound.org/people/Alnotreally/sounds/801349/. Both identify their recordings as CC0. Public HQ previews were excerpted, mixed to mono, high/low-pass filtered, faded, normalized and resampled. Source hashes, precise excerpts and processed core WAVs are in `src/assets/audio/recordings/`; output hashes and attribution are in SOURCES.json and NOTICE.txt. No Chess.com or Chessigma audio files are used.
- Ordinary move: 105ms; capture: 160ms with more body; castling: 220ms with two quiet placements. Check, promotion, completion and incorrect-attempt cues share the same restrained recording family. No clip exceeds 16 KB; no synthesized notes or pitch shifts are used.
- 303 Node regression tests pass. Additional checks verify every fallback PCM sample matches the distributed WAV exactly, source/output hashes, preview behavior and versioned preloading. Existing legal-move validation, event priorities, deduplication and persistence checks remain.
- An isolated Chromium-family browser decoded the actual clips at 48kHz and observed one AudioBufferSource start per accepted normal/capture/castle/check/promotion/mate move. Imports and lesson initialization stayed silent. Illegal exercise feedback, legal off-solution silence, an actual Stockfish reply and paused autoplay were checked.
- Test sound, 44px targets, mute and 31% volume persistence were checked at 360/390/430px and 1280px desktop. No browser errors occurred. Evidence is in ignored `.sites-local/verification/recorded-audio/`.
- These are browser emulation and audio scheduling/decoding checks, not a physical iPhone/Safari or speaker listening test. The in-product Test sound control lets the user audition the result on their own speakers.

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

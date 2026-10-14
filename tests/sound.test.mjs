import test from 'node:test';
import assert from 'node:assert/strict';
import { MoveSounds, navigationSoundMove, woodenSamples } from '../src/sound.js';
import { parseGame } from '../src/game.js';

test('move and capture clips are finite, distinct, audible, and fade to silence without clipping', () => {
  const move = woodenSamples(48000), capture = woodenSamples(48000, true);
  assert.notDeepEqual(move, capture);
  for (const samples of [move, capture]) {
    assert.ok(samples.every(Number.isFinite));
    assert.ok(Math.max(...samples.map(Math.abs)) < 1);
    const rms = segment => Math.sqrt(segment.reduce((sum, value) => sum + value * value, 0) / segment.length);
    assert.ok(rms(samples.slice(0, 2400)) > .04);
    assert.ok(rms(samples.slice(-480)) < .002);
    assert.equal(samples[0], 0);
  }
});

test('playback sounds match the actual move for forward, backward, and jump navigation', () => {
  const { moves } = parseGame('1. e4 d5 2. exd5 *');
  assert.equal(navigationSoundMove(moves, 0, 1), moves[0]);
  assert.equal(navigationSoundMove(moves, 2, 3).captured, 'p');
  assert.equal(navigationSoundMove(moves, 3, 2), moves[2]);
  assert.equal(navigationSoundMove(moves, 2, 0), moves[1]);
  assert.equal(navigationSoundMove(moves, 0, 3), moves[2]);
  assert.equal(navigationSoundMove(moves, 2, 2), null);
});

function audioContext() {
  const audio = { state: 'suspended', sampleRate: 48000, destination: {}, sources: [], resumes: 0, buffers: 0,
    resume() { this.state = 'running'; this.resumes++; return Promise.resolve(); },
    close() { this.state = 'closed'; return Promise.resolve(); },
    createBuffer() { this.buffers++; return { copyToChannel() {} }; },
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; },
    createBufferSource() { const source = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; this.onended?.(); } }; this.sources.push(source); return source; },
  };
  return audio;
}

test('audio is lazy, resumes for a user move, caches clips, and mutes existing playback', () => {
  const audio = audioContext(); let creates = 0;
  const player = new MoveSounds({ enabled: false, createContext: () => { creates++; return audio; } });
  assert.equal(player.play({ flags: 'n' }), false);
  assert.equal(creates, 0);
  player.setEnabled(true);
  assert.equal(player.play({ flags: 'n' }), true);
  assert.equal(creates, 1);
  assert.equal(audio.resumes, 1);
  player.play({ flags: 'n' });
  assert.equal(audio.buffers, 1);
  player.play({ flags: 'e', captured: 'p' });
  assert.equal(audio.buffers, 2);
  player.setEnabled(false);
  assert.ok(audio.sources.every(source => source.stopped));
  assert.equal(player.play({ flags: 'n' }), false);
  player.destroy();
  assert.equal(audio.state, 'closed');
});

test('unsupported audio and audio errors do not break board navigation', () => {
  const states = [];
  const missing = new MoveSounds({ createContext: () => null, onState: state => states.push(state) });
  assert.equal(missing.play({ flags: 'n' }), false);
  const broken = new MoveSounds({ createContext: () => { throw new Error('Audio blocked'); }, onState: state => states.push(state) });
  assert.equal(broken.play({ flags: 'n' }), false);
  assert.deepEqual(states, ['unavailable', 'unavailable']);
});

// Original procedural wooden-piece sounds; no remote assets or autoplay.
export function woodenSamples(sampleRate, capture = false) {
  const samples = new Float32Array(Math.ceil(sampleRate * .14));
  let seed = capture ? 48271 : 17389;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    seed = (seed * 16807) % 2147483647;
    const noise = seed / 1073741823.5 - 1;
    const hit = time => time < 0 ? 0 : Math.min(1, time / .0008) * (
      .42 * Math.sin(2 * Math.PI * (capture ? 420 : 580) * time) * Math.exp(-58 * time) +
      .24 * Math.sin(2 * Math.PI * 1370 * time) * Math.exp(-91 * time) +
      .13 * Math.sin(2 * Math.PI * 2860 * time) * Math.exp(-145 * time) +
      .24 * noise * Math.exp(-110 * time));
    samples[i] = .7 * (hit(t) + (capture ? .45 * hit(t - .027) : 0));
  }
  return samples;
}

export function navigationSoundMove(moves, previous, next) {
  if (previous === next) return null;
  return moves[(next < previous ? previous : next) - 1] || null;
}

export class MoveSounds {
  constructor({ enabled = true, createContext = null, onState = () => {} } = {}) {
    this.enabled = enabled; this.context = null; this.buffers = new Map(); this.voices = new Set(); this.onState = onState;
    this.createContext = createContext || (() => {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      return Audio ? new Audio({ latencyHint: 'interactive' }) : null;
    });
  }
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.stop();
  }
  play(move) {
    if (!this.enabled || !move) return false;
    try {
      if (!this.context) {
        this.context = this.createContext();
        if (!this.context) { this.onState('unavailable'); return false; }
        this.context.onstatechange = () => this.onState(this.context.state);
      }
      const context = this.context;
      // Resume synchronously within the tap/keyboard event for iOS and Safari.
      if (context.state === 'suspended') context.resume().catch(() => this.onState('unavailable'));
      const kind = move.captured || /[ce]/.test(move.flags || '') ? 'capture' : 'move';
      if (!this.buffers.has(kind)) {
        const samples = woodenSamples(context.sampleRate, kind === 'capture');
        const buffer = context.createBuffer(1, samples.length, context.sampleRate);
        buffer.copyToChannel(samples, 0); this.buffers.set(kind, buffer);
      }
      const source = context.createBufferSource(), volume = context.createGain();
      source.buffer = this.buffers.get(kind); volume.gain.value = .58;
      source.connect(volume); volume.connect(context.destination);
      source.onended = () => { source.disconnect(); volume.disconnect(); this.voices.delete(source); };
      if (this.voices.size >= 4) this.voices.values().next().value.stop();
      this.voices.add(source); source.start(); this.onState(context.state); return true;
    } catch { this.onState('unavailable'); return false; }
  }
  stop() { for (const source of this.voices) { try { source.stop(); } catch {} } this.voices.clear(); }
  destroy() {
    this.stop();
    if (this.context) { this.context.onstatechange = null; this.context.close().catch(() => {}); }
    this.context = null; this.buffers.clear();
  }
}

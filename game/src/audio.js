// audio.js — the tavern's sounds, synthesised with WebAudio: no audio files.
// One job: a blip for every beat of the duel (play, clash, chain, win, loss).

let audioCtx = null;

export function ensureAudio() {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freq, seconds, type, gainValue, when = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + when;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  } catch {
    // Silence is a valid fallback: the game never depends on sound.
  }
}

export function playCardSound() {
  tone(520, 0.09, 'triangle', 0.16);
  tone(780, 0.12, 'triangle', 0.12, 0.05);
}

export function clashWinSound() {
  tone(392, 0.1, 'square', 0.1);
  tone(523, 0.1, 'square', 0.1, 0.08);
  tone(784, 0.18, 'square', 0.12, 0.16);
}

export function clashLoseSound() {
  tone(220, 0.16, 'sawtooth', 0.1);
  tone(165, 0.22, 'sawtooth', 0.1, 0.1);
}

export function chainUpSound(chain) {
  const base = 440 + chain * 60;
  tone(base, 0.1, 'sine', 0.14);
  tone(base * 1.5, 0.14, 'sine', 0.1, 0.06);
}

export function surgeSound() {
  tone(330, 0.1, 'sine', 0.14);
  tone(495, 0.1, 'sine', 0.14, 0.07);
  tone(660, 0.2, 'sine', 0.16, 0.14);
}

export function victorySound() {
  [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.14, i * 0.11));
  tone(1319, 0.4, 'triangle', 0.12, 0.48);
}

export function defeatSound() {
  [392, 330, 262, 196].forEach((freq, i) => tone(freq, 0.26, 'sawtooth', 0.08, i * 0.14));
}

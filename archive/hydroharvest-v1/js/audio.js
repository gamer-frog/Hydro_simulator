// WebAudio synth SFX — no assets needed.
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { try { ac(); } catch (e) {} }

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone(freq, dur = 0.15, type = 'sine', gain = 0.18, when = 0, slideTo = null) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(dur = 0.2, gain = 0.15, when = 0, lowpass = 1200) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = lowpass;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

export const sfx = {
  click()   { tone(660, 0.06, 'square', 0.08); },
  hover()   { tone(880, 0.03, 'sine', 0.04); },
  plant()   { tone(320, 0.12, 'sine', 0.2); tone(520, 0.18, 'sine', 0.18, 0.09); },
  water()   { noise(0.45, 0.22, 0, 900); tone(500, 0.3, 'sine', 0.08, 0.05, 900); },
  dose()    { tone(740, 0.1, 'triangle', 0.16); tone(988, 0.16, 'triangle', 0.16, 0.1); },
  spray()   { noise(0.35, 0.25, 0, 2400); },
  harvest() { tone(523, 0.12, 'triangle', 0.2); tone(659, 0.12, 'triangle', 0.2, 0.08); tone(784, 0.2, 'triangle', 0.2, 0.16); },
  cash()    { tone(988, 0.09, 'square', 0.12); tone(1319, 0.22, 'square', 0.12, 0.07); noise(0.08, 0.08, 0.02, 4000); },
  error()   { tone(160, 0.22, 'sawtooth', 0.14, 0, 110); },
  success() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.16, i * 0.09)); },
  build()   { tone(196, 0.14, 'square', 0.16); noise(0.12, 0.18, 0.1, 1500); tone(392, 0.2, 'square', 0.14, 0.22); },
  blip()    { tone(1200, 0.05, 'sine', 0.07); },
  sleep()   { [784, 659, 523].forEach((f, i) => tone(f, 0.4, 'sine', 0.12, i * 0.22)); },
  pest()    { tone(2200, 0.08, 'square', 0.05); tone(2200, 0.08, 'square', 0.05, 0.18); },
};

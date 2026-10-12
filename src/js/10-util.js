// ================================================================
//  小道具：補間・保存・効果音
// ================================================================
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const Ease = {
  linear: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outBack: t => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  inQuad: t => t * t,
};
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const $ = id => document.getElementById(id);

const store = {
  key: k => 'sns-daifugo:' + k,
  get(k, d) {
    try {
      let v = localStorage.getItem(this.key(k));
      // 設定と音だけは前の版（大富豪興亡記）から引き継ぐ
      if (v == null && (k === 'settings' || k === 'sound' || k === 'taught')) v = localStorage.getItem('daifugo-chronicle:' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(this.key(k), JSON.stringify(v)); } catch (e) { /* 保存できなくても遊べる */ }
  },
};

// ---------- 補間（Promise で待てる） ----------
let renderRequested = true;
function requestRender() { renderRequested = true; }
const Tween = {
  list: [],
  add(duration, update, easeFn) {
    return new Promise(resolve => {
      if (!(duration > 0)) { update(1, 1); resolve(); requestRender(); return; }
      this.list.push({ t0: performance.now(), duration, update, ease: easeFn || Ease.inOutCubic, resolve });
      requestRender();
    });
  },
  step(now) {
    if (!this.list.length) return false;
    const keep = [];
    for (const tw of this.list) {
      const t = clamp((now - tw.t0) / tw.duration, 0, 1);
      tw.update(tw.ease(t), t);
      if (t >= 1) tw.resolve(); else keep.push(tw);
    }
    this.list = keep;
    return true;
  },
  // 実行中を即終了（「見届ける」用）
  flush() {
    const l = this.list; this.list = [];
    for (const tw of l) { tw.update(1, 1); tw.resolve(); }
  },
};

// ---------- 効果音（WebAudio で合成） ----------
const Sound = {
  ctx: null,
  master: null,
  noise: null,
  enabled: true,
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  },
  noiseBurst(t, { type = 'bandpass', freq = 2000, q = 1, peak = 0.4, a = 0.003, dec = 0.08, freqEnd = null }) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + a + dec);
    const g = c.createGain(); this.env(g, t, a, peak, dec);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.8); src.stop(t + a + dec + 0.05);
  },
  tone(t, { freq = 440, type = 'sine', peak = 0.2, a = 0.005, dec = 0.3, freqEnd = null, detune = 0 }) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + a + dec);
    const g = c.createGain(); this.env(g, t, a, peak, dec);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + a + dec + 0.05);
  },
  play(name) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    const r = Math.random();
    switch (name) {
      case 'flick': this.noiseBurst(t, { freq: 2600 + r * 900, q: 0.9, peak: 0.22, dec: 0.07 }); break;
      case 'deal': this.noiseBurst(t, { freq: 3200 + r * 800, q: 1.2, peak: 0.12, dec: 0.045 }); break;
      case 'place':
        this.noiseBurst(t, { type: 'lowpass', freq: 1700 + r * 400, q: 0.7, peak: 0.42, dec: 0.06 });
        this.tone(t, { freq: 150 + r * 30, peak: 0.12, dec: 0.06 });
        break;
      case 'sweep': this.noiseBurst(t, { freq: 1800, q: 0.6, peak: 0.16, a: 0.05, dec: 0.28, freqEnd: 700 }); break;
      case 'shuffle':
        for (let i = 0; i < 16; i++) this.noiseBurst(t + i * 0.032 + Math.random() * 0.01, { freq: 2800 + Math.random() * 1200, q: 1.4, peak: 0.08 + Math.random() * 0.05, dec: 0.03 });
        break;
      case 'select': this.tone(t, { freq: 1500 + r * 100, type: 'triangle', peak: 0.05, dec: 0.04 }); break;
      case 'pass': this.tone(t, { freq: 520, type: 'triangle', peak: 0.05, dec: 0.12, freqEnd: 400 }); break;
      case 'stamp':
        this.tone(t, { freq: 130, peak: 0.55, a: 0.004, dec: 0.28, freqEnd: 52 });
        this.noiseBurst(t, { type: 'lowpass', freq: 900, q: 0.5, peak: 0.45, dec: 0.12 });
        break;
      case 'slash':
        this.noiseBurst(t, { type: 'bandpass', freq: 7000, q: 1.5, peak: 0.35, a: 0.01, dec: 0.22, freqEnd: 900 });
        break;
      case 'gong': {
        const base = 98;
        [[1, 0.32, 3.2], [2.02, 0.16, 2.4], [2.74, 0.12, 2.0], [4.07, 0.07, 1.4], [5.41, 0.05, 1.1]].forEach(([m, p, d]) => {
          this.tone(t, { freq: base * m, peak: p, a: 0.01, dec: d });
          this.tone(t, { freq: base * m, peak: p * 0.5, a: 0.01, dec: d, detune: 7 });
        });
        this.noiseBurst(t, { type: 'lowpass', freq: 400, q: 0.4, peak: 0.3, a: 0.02, dec: 0.6 });
        break;
      }
      case 'chime':
        [[1318.5, 0.10, 1.2], [1975.5, 0.06, 0.9], [2637, 0.04, 0.7]].forEach(([f, p, d], i) => this.tone(t + i * 0.09, { freq: f, peak: p, dec: d }));
        break;
      case 'thud': this.tone(t, { freq: 90, peak: 0.4, dec: 0.4, freqEnd: 40 }); break;
      case 'turn': this.tone(t, { freq: 880, type: 'sine', peak: 0.06, dec: 0.18 }); this.tone(t + 0.08, { freq: 1174.7, type: 'sine', peak: 0.05, dec: 0.22 }); break;
      case 'clink':
        this.tone(t, { freq: 2350 + r * 200, type: 'sine', peak: 0.07, dec: 0.22 });
        this.tone(t, { freq: 3720 + r * 300, type: 'sine', peak: 0.04, dec: 0.16 });
        this.noiseBurst(t, { type: 'highpass', freq: 5000, q: 0.7, peak: 0.12, dec: 0.03 });
        break;
      case 'flip': this.tone(t, { freq: 1900 + r * 150, type: 'triangle', peak: 0.05, dec: 0.12, freqEnd: 2500 }); break;
      case 'chain':
        for (let i = 0; i < 9; i++) this.noiseBurst(t + i * 0.035 + Math.random() * 0.012, { type: 'bandpass', freq: 4200 + Math.random() * 1800, q: 3, peak: 0.09 + Math.random() * 0.05, dec: 0.025 });
        break;
      case 'lock':
        this.tone(t, { freq: 180, peak: 0.3, dec: 0.12, freqEnd: 90 });
        this.noiseBurst(t + 0.01, { type: 'bandpass', freq: 2600, q: 2, peak: 0.3, dec: 0.04 });
        this.noiseBurst(t + 0.07, { type: 'bandpass', freq: 3400, q: 2.5, peak: 0.22, dec: 0.03 });
        break;
      case 'unlock':
        this.noiseBurst(t, { type: 'bandpass', freq: 3000, q: 2.5, peak: 0.2, dec: 0.03 });
        this.tone(t + 0.02, { freq: 900, type: 'triangle', peak: 0.06, dec: 0.1, freqEnd: 1400 });
        break;
      case 'reverse':
        this.tone(t, { freq: 1320, type: 'triangle', peak: 0.07, dec: 0.16, freqEnd: 520 });
        this.tone(t + 0.16, { freq: 520, type: 'triangle', peak: 0.07, dec: 0.18, freqEnd: 1320 });
        break;
      case 'viral':
        this.noiseBurst(t, { type: 'bandpass', freq: 600, q: 0.8, peak: 0.22, a: 0.08, dec: 0.22, freqEnd: 6000 });
        this.tone(t + 0.12, { freq: 880, type: 'square', peak: 0.05, dec: 0.12, freqEnd: 1760 });
        this.tone(t + 0.2, { freq: 1760, type: 'sine', peak: 0.08, dec: 0.4 });
        break;
      case 'counter':
        this.tone(t, { freq: 1568, type: 'sine', peak: 0.1, dec: 0.5 });
        this.tone(t + 0.06, { freq: 2093, type: 'sine', peak: 0.07, dec: 0.45 });
        break;
      case 'glitch':
        for (let i = 0; i < 7; i++) {
          const tt = t + i * 0.045 + Math.random() * 0.02;
          this.tone(tt, { freq: 200 + Math.random() * 1600, type: 'square', peak: 0.035, a: 0.002, dec: 0.03 });
          if (i % 2) this.noiseBurst(tt, { type: 'highpass', freq: 3000, q: 0.5, peak: 0.08, dec: 0.025 });
        }
        break;
      case 'update':
        [[660, 0], [880, 0.1], [1320, 0.2]].forEach(([f, d]) => this.tone(t + d, { freq: f, type: 'sine', peak: 0.08, dec: 0.22 }));
        this.noiseBurst(t + 0.32, { type: 'lowpass', freq: 500, q: 0.4, peak: 0.25, a: 0.02, dec: 0.5 });
        this.tone(t + 0.32, { freq: 98, peak: 0.3, a: 0.01, dec: 1.4 });
        break;
      case 'dm':
        this.tone(t, { freq: 1568, type: 'sine', peak: 0.035, dec: 0.08 });
        this.tone(t + 0.065, { freq: 2349, type: 'sine', peak: 0.03, dec: 0.14 });
        break;
      case 'mgr':       // マネージャーからの業務チャット
        this.tone(t, { freq: 784, type: 'triangle', peak: 0.06, dec: 0.08 });
        this.tone(t + 0.09, { freq: 587.3, type: 'triangle', peak: 0.06, dec: 0.14 });
        break;
      case 'ominous':   // 運営からの不穏な連絡・卒業の危機
        this.tone(t, { freq: 196, type: 'sine', peak: 0.16, a: 0.02, dec: 1.1 });
        this.tone(t, { freq: 207.7, type: 'sine', peak: 0.1, a: 0.02, dec: 1.1 });
        this.tone(t + 0.3, { freq: 146.8, type: 'triangle', peak: 0.1, a: 0.02, dec: 1.4 });
        this.noiseBurst(t, { type: 'lowpass', freq: 300, q: 0.4, peak: 0.18, a: 0.05, dec: 0.8 });
        break;
      case 'notify':
        this.tone(t, { freq: 988, type: 'sine', peak: 0.05, dec: 0.12 });
        this.tone(t + 0.07, { freq: 1480, type: 'sine', peak: 0.045, dec: 0.16 });
        break;
    }
  },
};

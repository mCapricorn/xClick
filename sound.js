function createXClickSound() {
  let ctx = null;
  let master = null;

  const ensureCtx = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    return ctx;
  };

  // A tiny synth voice: osc → gain envelope → master
  const tone = ({ type = 'sine', f0 = 440, f1 = null, t = 0, dur = 0.15, vol = 1, curve = 'exp' }) => {
    const c = ensureCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    const t0 = c.currentTime + t;
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    if (curve === 'exp') {
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    } else {
      g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    }
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  };

  // Short noise burst (for glitch / scanline texture)
  const noise = ({ t = 0, dur = 0.08, vol = 0.6, hp = 1500 }) => {
    const c = ensureCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = hp;
    const g = c.createGain();
    const t0 = c.currentTime + t;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t0);
  };

  const variants = {
    like: [
      () => {
        tone({ type: 'sine', f0: 720, f1: 1440, dur: 0.16, vol: 0.9 });
        tone({ type: 'sine', f0: 1440, f1: 2160, t: 0.02, dur: 0.12, vol: 0.25 });
      },
      () => {
        tone({ type: 'triangle', f0: 540, f1: 1180, dur: 0.12, vol: 0.75 });
        tone({ type: 'triangle', f0: 810, f1: 1620, t: 0.04, dur: 0.18, vol: 0.22 });
      }
    ],
    follow: [
      () => {
        tone({ type: 'square', f0: 660, dur: 0.07, vol: 0.35 });
        tone({ type: 'square', f0: 990, t: 0.08, dur: 0.12, vol: 0.3 });
      },
      () => {
        tone({ type: 'sawtooth', f0: 520, dur: 0.06, vol: 0.22 });
        tone({ type: 'sine', f0: 780, t: 0.05, dur: 0.11, vol: 0.24 });
        tone({ type: 'sine', f0: 1040, t: 0.11, dur: 0.13, vol: 0.2 });
      }
    ],
    reply: [
      () => {
        noise({ dur: 0.07, vol: 0.5, hp: 2000 });
        tone({ type: 'sine', f0: 180, f1: 60, t: 0.03, dur: 0.18, vol: 0.7 });
      },
      () => {
        noise({ dur: 0.05, vol: 0.35, hp: 2600 });
        noise({ t: 0.03, dur: 0.04, vol: 0.25, hp: 3200 });
        tone({ type: 'triangle', f0: 220, f1: 90, t: 0.02, dur: 0.16, vol: 0.45 });
      }
    ],
    draftStart: [
      () => tone({ f0: 480, f1: 640, dur: .08, vol: .27 }),
      () => tone({ type: 'triangle', f0: 420, f1: 630, dur: .08, vol: .24 })
    ],
    draftInsert: [
      () => tone({ f0: 760, f1: 600, dur: .10, vol: .26 }),
      () => tone({ type: 'triangle', f0: 680, f1: 510, dur: .09, vol: .22 })
    ],
    comment: [
      () => {
        tone({ f0: 587, dur: 0.095, vol: 0.55 });
        tone({ f0: 880, t: 0.10, dur: 0.24, vol: 0.48 });
      },
      () => {
        tone({ type: 'triangle', f0: 523, dur: 0.075, vol: 0.48 });
        tone({ type: 'triangle', f0: 659, t: 0.085, dur: 0.08, vol: 0.43 });
        tone({ f0: 784, t: 0.175, dur: 0.22, vol: 0.48 });
      }
    ]
  };

  const rotation = Object.fromEntries(Object.keys(variants).map(kind => [kind, 0]));
  const play = (kind, mode, volume) => {
    if (volume <= 0) return;
    try {
      const list = variants[kind] || [];
      if (!list.length) return;
      if (!ensureCtx()) return;
      master.gain.value = volume;
      let index = 0;
      if (mode === 'alt') index = 1;
      if (mode === 'rotate') {
        index = rotation[kind];
        rotation[kind] = (index + 1) % list.length;
      }
      list[index]();
    } catch (_) { /* never break FX if audio fails */ }
  };

  const unlock = () => {
    try {
      const c = ensureCtx();
      if (c && c.state === 'suspended') {
        const pending = c.resume();
        if (pending && typeof pending.catch === 'function') pending.catch(() => {});
      }
    } catch (_) { /* audio unlock is best-effort */ }
  };

  return { play, unlock };
}

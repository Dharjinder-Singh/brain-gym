// Brain Gym game: "Colour Eye" (id 'colour').
// A colour flashes full-bleed for 3 seconds. Rebuild it from memory with hue, saturation and
// brightness sliders. Scored with CIEDE2000, the colour-science standard for "how different do
// these two colours look?".
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure colour engine (no DOM). Exported for node tests.
  // ---------------------------------------------------------------------------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  // h in degrees [0,360), s and v in [0,1] -> 8-bit [r,g,b].
  function hsvToRgb(h, s, v) {
    const hh = (((h % 360) + 360) % 360) / 60;
    const c = v * s;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hh < 1) [r, g, b] = [c, x, 0];
    else if (hh < 2) [r, g, b] = [x, c, 0];
    else if (hh < 3) [r, g, b] = [0, c, x];
    else if (hh < 4) [r, g, b] = [0, x, c];
    else if (hh < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = v - c;
    return [r, g, b].map((k) => Math.round((k + m) * 255));
  }
  const hex = (rgb) => '#' + rgb.map((k) => k.toString(16).padStart(2, '0')).join('');

  // sRGB (8-bit) -> linear -> XYZ (D65, 2°) -> CIELAB.
  const lin = (c) => {
    const k = c / 255;
    return k <= 0.04045 ? k / 12.92 : Math.pow((k + 0.055) / 1.055, 2.4);
  };
  const WHITE = [0.95047, 1.0, 1.08883];
  function rgbToXyz([r8, g8, b8]) {
    const r = lin(r8), g = lin(g8), b = lin(b8);
    return [
      0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
      0.2126729 * r + 0.7151522 * g + 0.072175 * b,
      0.0193339 * r + 0.119192 * g + 0.9503041 * b,
    ];
  }
  const EPS = Math.pow(6 / 29, 3);
  const f = (t) => (t > EPS ? Math.cbrt(t) : t / (3 * Math.pow(6 / 29, 2)) + 4 / 29);
  function xyzToLab([x, y, z]) {
    const fx = f(x / WHITE[0]), fy = f(y / WHITE[1]), fz = f(z / WHITE[2]);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  const rgbToLab = (rgb) => xyzToLab(rgbToXyz(rgb));

  // CIEDE2000 (Sharma, Wu & Dalal 2005), kL = kC = kH = 1.
  function deltaE00([L1, a1, b1], [L2, a2, b2]) {
    const C1 = Math.hypot(a1, b1);
    const C2 = Math.hypot(a2, b2);
    const Cb7 = Math.pow((C1 + C2) / 2, 7);
    const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + Math.pow(25, 7))));
    const a1p = (1 + G) * a1;
    const a2p = (1 + G) * a2;
    const C1p = Math.hypot(a1p, b1);
    const C2p = Math.hypot(a2p, b2);
    const hue = (b, a) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) * DEG + 360) % 360);
    const h1p = hue(b1, a1p);
    const h2p = hue(b2, a2p);
    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    let dhp = 0;
    if (C1p * C2p !== 0) {
      dhp = h2p - h1p;
      if (dhp > 180) dhp -= 360;
      else if (dhp < -180) dhp += 360;
    }
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * RAD);
    const Lbp = (L1 + L2) / 2;
    const Cbp = (C1p + C2p) / 2;
    let hbp;
    if (C1p * C2p === 0) hbp = h1p + h2p;
    else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hbp = (h1p + h2p + 360) / 2;
    else hbp = (h1p + h2p - 360) / 2;
    const T = 1 - 0.17 * Math.cos((hbp - 30) * RAD) + 0.24 * Math.cos(2 * hbp * RAD)
      + 0.32 * Math.cos((3 * hbp + 6) * RAD) - 0.2 * Math.cos((4 * hbp - 63) * RAD);
    const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
    const Cbp7 = Math.pow(Cbp, 7);
    const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
    const L50 = Math.pow(Lbp - 50, 2);
    const SL = 1 + (0.015 * L50) / Math.sqrt(20 + L50);
    const SC = 1 + 0.045 * Cbp;
    const SH = 1 + 0.015 * Cbp * T;
    const RT = -Math.sin(2 * dTheta * RAD) * Rc;
    const l = dLp / SL, c = dCp / SC, h = dHp / SH;
    return Math.sqrt(l * l + c * c + h * h + RT * c * h);
  }

  // 10 = identical. ΔE 2 ≈ 9.3, ΔE 10 ≈ 6.7, ΔE 30+ = 0. Rounded to one decimal.
  const roundScore = (dE) => Math.round(Math.max(0, 10 - dE / 3) * 10) / 10;

  // ---- Daily colours (HSB, integer degrees and percents so every target is reachable) ----
  const KINDS = {
    vivid: { label: 'Vivid', s: [65, 100], v: [75, 100] },
    pastel: { label: 'Pastel', s: [18, 40], v: [86, 100] },
    dark: { label: 'Deep & dark', s: [45, 90], v: [22, 45] },
    boss: { label: 'Boss: nearly grey', s: [4, 12], v: [35, 80] },
  };
  const ROUND_KINDS = ['vivid', 'vivid', 'pastel', 'dark', 'boss'];
  const span = ([a, b], rand) => a + Math.floor(rand() * (b - a + 1));

  function genTargets(rand) {
    let lastHue = null;
    return ROUND_KINDS.map((kind) => {
      const K = KINDS[kind];
      // Each colour lands at least 70° of hue away from the one before it.
      let h = Math.floor(rand() * 360);
      if (lastHue !== null) h = (lastHue + 70 + Math.floor(rand() * 221)) % 360;
      lastHue = h;
      return { kind, h, s: span(K.s, rand), v: span(K.v, rand) };
    });
  }

  // ---- Fun names: adjective by round type, noun by the colour's hue family ----
  const ADJ = {
    vivid: ['Electric', 'Loud', 'Turbo', 'Sparkly', 'Brave', 'Zesty', 'Cheeky', 'Bouncy'],
    pastel: ['Sleepy', 'Whispering', 'Dreamy', 'Fluffy', 'Gentle', 'Cosy', 'Shy', 'Sunday'],
    dark: ['Midnight', 'Moody', 'Secret', 'Velvet', 'Stormy', 'Haunted', 'Brooding', 'Sneaky'],
    boss: ['Foggy', 'Sneaky', 'Ghostly', 'Rainy', 'Dusty', 'Mysterious', 'Quiet', 'Tricky'],
  };
  const NOUN = {
    red: ['Tomato', 'Cherry', 'Lobster', 'Ladybird', 'Chilli', 'Fire Truck'],
    orange: ['Mango', 'Tangerine', 'Pumpkin', 'Fox', 'Apricot', 'Goldfish'],
    brown: ['Cocoa', 'Chestnut', 'Toffee', 'Acorn', 'Teddy', 'Biscuit'],
    yellow: ['Banana', 'Lemon', 'Sunflower', 'Duckling', 'Custard', 'Taxi'],
    green: ['Lime', 'Frog', 'Pickle', 'Avocado', 'Fern', 'Pea'],
    teal: ['Lagoon', 'Mint', 'Peacock', 'Glacier', 'Mermaid', 'Jade'],
    blue: ['Ocean', 'Blueberry', 'Denim', 'Whale', 'Sapphire', 'Sky'],
    purple: ['Grape', 'Plum', 'Violet', 'Wizard', 'Lavender', 'Aubergine'],
    pink: ['Flamingo', 'Bubblegum', 'Candyfloss', 'Peony', 'Raspberry', 'Piglet'],
    grey: ['Pebble', 'Pigeon', 'Concrete', 'Elephant', 'Drizzle', 'Robot'],
  };
  function family(t) {
    if (t.kind === 'boss' || t.s < 12) return 'grey';
    const h = t.h;
    if (h >= 15 && h < 50 && t.v < 55) return 'brown';
    if (h < 12 || h >= 345) return 'red';
    if (h < 40) return 'orange';
    if (h < 66) return 'yellow';
    if (h < 160) return 'green';
    if (h < 196) return 'teal';
    if (h < 256) return 'blue';
    if (h < 295) return 'purple';
    return 'pink';
  }
  const nameFor = (t, rand) => `${ADJ[t.kind][Math.floor(rand() * ADJ[t.kind].length)]} ${NOUN[family(t)][Math.floor(rand() * 6)]}`;

  // ---- "Which way were you off?" in plain words ----
  // Lab hue-angle buckets (sRGB red ≈ 40°, yellow ≈ 102°, green ≈ 136°, cyan ≈ 197°, blue ≈ 306°).
  function hueWord(h) {
    const a = ((h % 360) + 360) % 360;
    if (a < 25 || a >= 345) return 'pink';
    if (a < 55) return 'red';
    if (a < 80) return 'orange';
    if (a < 115) return 'yellow';
    if (a < 170) return 'green';
    if (a < 230) return 'teal';
    if (a < 315) return 'blue';
    return 'purple';
  }
  function amount(x) {
    const m = Math.abs(x);
    if (m < 1.5) return null;
    if (m < 4) return 'slightly';
    if (m < 8) return 'a bit';
    if (m < 16) return '';
    return 'way';
  }
  // Returns e.g. "A bit too blue, slightly too dark" (biggest error first, max two).
  // Each part is scaled by its CIEDE2000 weight (SL, SC, SH) so the words match the score.
  function describeOff(labT, labY) {
    const parts = [];
    const dL = labY[0] - labT[0];
    const L50 = Math.pow((labT[0] + labY[0]) / 2 - 50, 2);
    parts.push({ m: dL / (1 + (0.015 * L50) / Math.sqrt(20 + L50)), word: dL > 0 ? 'light' : 'dark' });
    const Ct = Math.hypot(labT[1], labT[2]);
    const Cy = Math.hypot(labY[1], labY[2]);
    const SC = 1 + 0.045 * ((Ct + Cy) / 2);
    const SH = 1 + 0.015 * ((Ct + Cy) / 2);
    if (Ct < 16) {
      // Near-grey target: opponent axes read best ("too yellow", "too blue").
      const da = labY[1] - labT[1];
      const db = labY[2] - labT[2];
      parts.push({ m: da / SC, word: da > 0 ? 'red' : 'green' });
      parts.push({ m: db / SC, word: db > 0 ? 'yellow' : 'blue' });
    } else {
      const ht = Math.atan2(labT[2], labT[1]) * DEG;
      const hy = Math.atan2(labY[2], labY[1]) * DEG;
      let dh = hy - ht;
      while (dh > 180) dh -= 360;
      while (dh < -180) dh += 360;
      const dH = 2 * Math.sqrt(Ct * Cy) * Math.sin((dh / 2) * RAD);
      parts.push({ m: dH / SH, word: hueWord(ht + Math.sign(dh) * 30) });
      const dC = Cy - Ct;
      parts.push({ m: dC / SC, word: dC > 0 ? 'vivid' : 'dull' });
    }
    const words = parts
      .filter((p) => amount(p.m) !== null)
      .sort((a, b) => Math.abs(b.m) - Math.abs(a.m))
      .slice(0, 2)
      .map((p) => `${amount(p.m)} too ${p.word}`.trim());
    if (!words.length) return 'Spot on. Nothing to fix!';
    const s = words.join(', ');
    return s[0].toUpperCase() + s.slice(1);
  }

  // Nearest emoji square for the share strip.
  const EMOJI = [
    ['🟥', [221, 46, 68]], ['🟧', [244, 144, 12]], ['🟨', [253, 203, 88]], ['🟩', [120, 177, 89]],
    ['🟦', [85, 172, 238]], ['🟪', [170, 142, 214]], ['🟫', [193, 105, 79]], ['⬛', [49, 55, 61]], ['⬜', [230, 231, 232]],
  ].map(([e, rgb]) => [e, rgbToLab(rgb)]);
  function emojiFor(rgb) {
    const lab = rgbToLab(rgb);
    let best = EMOJI[0];
    let bd = Infinity;
    EMOJI.forEach((row) => {
      const d = deltaE00(lab, row[1]);
      if (d < bd) { bd = d; best = row; }
    });
    return best[0];
  }

  const engine = {
    hsvToRgb, hex, rgbToXyz, xyzToLab, rgbToLab, deltaE00, roundScore, genTargets, nameFor, family,
    describeOff, hueWord, emojiFor, KINDS, ROUND_KINDS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const ROUNDS = 5;
  const RING = 2 * Math.PI * 26;
  const verdict = (s) =>
    s >= 9.5 ? 'Perfect eye! 🤩' : s >= 9 ? 'Basically perfect' : s >= 8 ? 'Great match' : s >= 6.5 ? 'Close!'
      : s >= 4 ? 'Same neighbourhood' : 'A whole other colour 😅';

  BG.registerGame({
    id: 'colour',
    name: 'Colour Eye',
    emoji: '🎨',
    skill: 'Seeing and remembering colour',
    category: 'cool',
    tagline: 'One look. Three seconds. Now paint it back from memory.',
    howTo: [
      'A colour fills the screen for 3 seconds, then vanishes.',
      'Rebuild it with the hue, saturation and brightness sliders, then tap Lock it (or Enter).',
      'Each round scores out of 10. Colours get sneakier: vivid, pastel, dark, then a near-grey boss.',
    ],
    science:
      'When people adjusted a photo of a banana until it looked pure grey, they pushed it slightly blue: their memory of yellow bananas was changing what they saw (Hansen et al., Nature Neuroscience 2006). Colour memory is a reconstruction, so checking it against the real thing keeps it sharp.',
    scienceUrl: 'https://www.nature.com/articles/nn1794',
    minutes: 2,
    maxScore: 500,

    mount(root, ctx) {
      const targets = genTargets(ctx.rand);
      targets.forEach((t) => {
        t.rgb = hsvToRgb(t.h, t.s / 100, t.v / 100);
        t.name = nameFor(t, ctx.rand);
      });
      const starts = targets.map(() => ({ h: Math.floor(ctx.rand() * 360), s: 50, v: 50 }));
      const results = [];
      let round = 0;
      let phase = 'intro'; // intro | flash | adjust | reveal | done
      let hardcore = false;
      let raf = 0;
      let ended = false;
      const timeouts = new Set();
      const later = (fn, ms) => {
        const id = setTimeout(() => { timeouts.delete(id); if (ctx.alive && !ended) fn(); }, ms);
        timeouts.add(id);
      };
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      root.innerHTML = '';
      const app = BG.el('<div class="g-colour-app"></div>');
      root.appendChild(app);

      const head = (txt) => `<div class="g-colour-top"><span class="label">${txt}</span></div>`;
      const roundLabel = () => `Round ${round + 1} of ${ROUNDS} · ${KINDS[targets[round].kind].label}`;

      // ---------- Phase 1: get ready ----------
      function intro() {
        if (!ctx.alive || ended) return;
        phase = 'intro';
        ctx.setProgress(round + 1, ROUNDS);
        const t = targets[round];
        const boss = t.kind === 'boss';
        const practiceChoice = ctx.mode === 'practice' && round === 0;
        if (practiceChoice) hardcore = ctx.store.get('hardcore', false);
        app.innerHTML = `
          ${head(roundLabel())}
          <div class="g-colour-ready panel${boss ? ' is-boss' : ''}">
            <span class="g-colour-ready-num">${boss ? '👾' : round + 1}</span>
            <h2 class="g-colour-ready-title">${boss ? 'Boss colour' : KINDS[t.kind].label}</h2>
            <p class="g-colour-ready-sub">${boss ? 'Almost grey. Which way does it lean?' : round === 0 ? 'Stare hard. It vanishes fast.' : 'Ready when you are.'}</p>
            ${practiceChoice ? `
              <div class="g-colour-mode" role="radiogroup" aria-label="Flash length">
                <button class="g-colour-mode-btn" role="radio" data-hc="0">👀 Normal<small>3 s flash</small></button>
                <button class="g-colour-mode-btn" role="radio" data-hc="1">🔥 Hardcore<small>1 s flash</small></button>
              </div>` : ''}
          </div>
          <button class="btn btn--primary btn--block g-colour-go">Show me the colour</button>`;
        const go = app.querySelector('.g-colour-go');
        const modeBtns = app.querySelectorAll('.g-colour-mode-btn');
        const syncMode = () => modeBtns.forEach((b) => {
          const on = (b.dataset.hc === '1') === hardcore;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-checked', String(on));
        });
        syncMode();
        modeBtns.forEach((b) => b.addEventListener('click', () => {
          hardcore = b.dataset.hc === '1';
          ctx.store.set('hardcore', hardcore);
          BG.fx.sound('pick');
          syncMode();
        }));
        go.addEventListener('click', flash);
        go.focus({ preventScroll: true });
      }

      // ---------- Phase 2: the flash ----------
      function flash() {
        if (!ctx.alive || ended || phase !== 'intro') return;
        phase = 'flash';
        const t = targets[round];
        const ms = hardcore ? 1000 : 3000;
        app.innerHTML = `
          ${head(roundLabel())}
          <div class="g-colour-flash" style="background:${hex(t.rgb)}" role="img" aria-label="Colour to remember">
            <div class="g-colour-ring" aria-hidden="true">
              <svg viewBox="0 0 60 60"><circle class="g-colour-ring-bg" cx="30" cy="30" r="26"/><circle class="g-colour-ring-fg" cx="30" cy="30" r="26" stroke-dasharray="${RING.toFixed(2)}" stroke-dashoffset="0"/></svg>
              <span class="g-colour-ring-num">${Math.ceil(ms / 1000)}</span>
            </div>
            <span class="g-colour-flash-tag">Remember me!</span>
          </div>`;
        const fg = app.querySelector('.g-colour-ring-fg');
        const num = app.querySelector('.g-colour-ring-num');
        BG.fx.sound('pop');
        const t0 = performance.now();
        let lastSec = Math.ceil(ms / 1000);
        const step = (now) => {
          if (!ctx.alive || ended) return;
          const left = Math.max(0, ms - (now - t0));
          fg.setAttribute('stroke-dashoffset', (RING * (1 - left / ms)).toFixed(2));
          const sec = Math.ceil(left / 1000);
          if (sec !== lastSec && sec > 0) { lastSec = sec; num.textContent = sec; BG.fx.sound('tick'); }
          if (left <= 0) { raf = 0; adjust(); return; }
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      }

      // ---------- Phase 3: rebuild it ----------
      let cur = null;
      let touched = false;
      let lockBtn = null;

      function adjust() {
        if (!ctx.alive || ended) return;
        phase = 'adjust';
        cur = { ...starts[round] };
        touched = false;
        app.innerHTML = `
          ${head(roundLabel())}
          <div class="g-colour-preview" role="img" aria-label="Your colour"><span class="g-colour-preview-tag chip">Yours</span></div>
          <div class="g-colour-sliders">
            ${slider('h', 'Hue', 359)}
            ${slider('s', 'Saturation', 100)}
            ${slider('v', 'Brightness', 100)}
          </div>
          <button class="btn btn--primary btn--block g-colour-lock" disabled>🔒 Lock it</button>
          <p class="g-colour-hint muted">Drag the sliders, or focus one and use the arrow keys (Shift for big steps).</p>`;
        lockBtn = app.querySelector('.g-colour-lock');
        lockBtn.addEventListener('click', lock);
        app.querySelectorAll('.g-colour-slider').forEach(bindSlider);
        paint();
        const first = app.querySelector('.g-colour-slider');
        if (first && matchMedia('(hover: hover)').matches) first.focus({ preventScroll: true });
      }

      function slider(key, label, max) {
        return `
          <div class="g-colour-field">
            <div class="g-colour-field-row"><span class="label">${label}</span><span class="g-colour-val" data-val="${key}"></span></div>
            <div class="g-colour-slider" data-key="${key}" data-max="${max}" role="slider" tabindex="0"
              aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}">
              <span class="g-colour-thumb"></span>
            </div>
          </div>`;
      }

      function setVal(key, v) {
        const max = key === 'h' ? 359 : 100;
        const nv = clamp(Math.round(v), 0, max);
        if (nv === cur[key]) return;
        cur[key] = nv;
        if (!touched) { touched = true; lockBtn.disabled = false; }
        paint();
      }

      function bindSlider(el) {
        const key = el.dataset.key;
        const max = Number(el.dataset.max);
        const fromX = (x) => {
          const r = el.getBoundingClientRect();
          const thumb = el.querySelector('.g-colour-thumb').offsetWidth || 44;
          return ((x - r.left - thumb / 2) / Math.max(1, r.width - thumb)) * max;
        };
        let dragging = false;
        el.addEventListener('pointerdown', (e) => {
          if (phase !== 'adjust') return;
          dragging = true;
          try { el.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
          el.focus({ preventScroll: true });
          el.classList.add('is-drag');
          setVal(key, fromX(e.clientX));
          e.preventDefault();
        });
        el.addEventListener('pointermove', (e) => { if (dragging && phase === 'adjust') setVal(key, fromX(e.clientX)); });
        const stop = () => { if (dragging) { dragging = false; el.classList.remove('is-drag'); BG.fx.sound('tap'); } };
        el.addEventListener('pointerup', stop);
        el.addEventListener('pointercancel', stop);
        el.addEventListener('keydown', (e) => {
          if (phase !== 'adjust') return;
          const big = e.shiftKey ? 10 : 1;
          let d = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d = big;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d = -big;
          else if (e.key === 'PageUp') d = 10;
          else if (e.key === 'PageDown') d = -10;
          if (d !== null) {
            e.preventDefault();
            // Hue wraps around the colour wheel; the others stop at the ends.
            if (key === 'h') { cur.h = (cur.h + d + 360) % 360; touched = true; lockBtn.disabled = false; paint(); }
            else setVal(key, cur[key] + d);
          } else if (e.key === 'Home') { e.preventDefault(); setVal(key, 0); }
          else if (e.key === 'End') { e.preventDefault(); setVal(key, max); }
        });
      }

      // Live preview and slider tracks. The swatches are the one place raw colours are used.
      function paint() {
        const { h, s, v } = cur;
        const rgb = hsvToRgb(h, s / 100, v / 100);
        const col = hex(rgb);
        app.querySelector('.g-colour-preview').style.background = col;
        const stops = [0, 60, 120, 180, 240, 300, 360].map((x) => hex(hsvToRgb(x, 1, 1))).join(',');
        const tracks = {
          h: `linear-gradient(90deg,${stops})`,
          s: `linear-gradient(90deg,${hex(hsvToRgb(h, 0, v / 100))},${hex(hsvToRgb(h, 1, v / 100))})`,
          v: `linear-gradient(90deg,#000000,${hex(hsvToRgb(h, s / 100, 1))})`,
        };
        const thumbs = { h: hex(hsvToRgb(h, 1, 1)), s: col, v: col };
        const text = { h: `${h}°`, s: `${s}%`, v: `${v}%` };
        app.querySelectorAll('.g-colour-slider').forEach((el) => {
          const k = el.dataset.key;
          const max = Number(el.dataset.max);
          el.style.background = tracks[k];
          el.style.setProperty('--p', String(cur[k] / max));
          el.querySelector('.g-colour-thumb').style.background = thumbs[k];
          el.setAttribute('aria-valuenow', String(cur[k]));
          el.setAttribute('aria-valuetext', text[k]);
        });
        app.querySelectorAll('[data-val]').forEach((el) => { el.textContent = text[el.dataset.val]; });
      }

      // ---------- Phase 4: reveal ----------
      function lock() {
        if (phase !== 'adjust' || !touched || !ctx.alive || ended) return;
        phase = 'reveal';
        BG.fx.haptic();
        const t = targets[round];
        const mine = hsvToRgb(cur.h, cur.s / 100, cur.v / 100);
        const labT = rgbToLab(t.rgb);
        const labY = rgbToLab(mine);
        const dE = deltaE00(labT, labY);
        const score = roundScore(dE);
        const off = describeOff(labT, labY);
        results.push({ t, mine, dE, score });
        const last = round === ROUNDS - 1;
        app.innerHTML = `
          ${head(roundLabel())}
          <div class="g-colour-split${reduced ? '' : ' is-anim'}">
            <div class="g-colour-half" style="background:${hex(t.rgb)}"><span class="chip g-colour-half-tag">Target</span></div>
            <div class="g-colour-half g-colour-half--you" style="background:${hex(mine)}"><span class="chip g-colour-half-tag">Yours</span></div>
          </div>
          <div class="card g-colour-result">
            <p class="g-colour-name">“${BG.esc(t.name)}”</p>
            <div class="g-colour-score-row">
              <span class="big-num g-colour-score${score >= 9 ? ' is-great' : score < 4 ? ' is-low' : ''}">${score.toFixed(1)}<small>/10</small></span>
              <span class="g-colour-verdict">${verdict(score)}</span>
            </div>
            <p class="g-colour-off">${BG.esc(off)}</p>
            <p class="g-colour-de muted">ΔE₀₀ ${dE.toFixed(1)} · ${hex(t.rgb)} vs ${hex(mine)}</p>
          </div>
          <button class="btn btn--primary btn--block g-colour-next">${last ? 'See today’s palette 🎨' : 'Next colour →'}</button>`;
        const scoreEl = app.querySelector('.g-colour-score');
        ctx.addScore(Math.round(score * 10), scoreEl);
        BG.fx.pop(scoreEl);
        if (score >= 9.5) { BG.fx.sound('win'); BG.fx.confetti(); }
        else if (score >= 8) BG.fx.sound('good');
        else if (score >= 4) BG.fx.sound('pop');
        else { BG.fx.sound('bad'); BG.fx.shake(scoreEl); }
        const next = app.querySelector('.g-colour-next');
        next.addEventListener('click', advance);
        later(() => next.focus({ preventScroll: true }), 50);
      }

      function advance() {
        if (phase !== 'reveal' || !ctx.alive || ended) return;
        round++;
        if (round < ROUNDS) intro();
        else palette();
      }

      // ---------- Phase 5: today's palette ----------
      function palette() {
        phase = 'done';
        const total = Math.round(results.reduce((a, r) => a + r.score, 0) * 10) / 10;
        const best = Math.max(...results.map((r) => r.score));
        const prevBest = ctx.store.get('best', 0);
        if (total > prevBest) ctx.store.set('best', total);
        app.innerHTML = `
          ${head(ctx.mode === 'daily' ? 'Today’s palette' : 'Your palette')}
          <div class="g-colour-pal">
            ${results.map((r, i) => `
              <div class="g-colour-pal-col" style="--i:${i}">
                <div class="g-colour-pal-sw" style="background:${hex(r.t.rgb)}" title="${BG.esc(r.t.name)}"></div>
                <div class="g-colour-pal-sw g-colour-pal-sw--you" style="background:${hex(r.mine)}"></div>
                <span class="g-colour-pal-score${r.score === best ? ' is-best' : ''}">${r.score.toFixed(1)}</span>
              </div>`).join('')}
          </div>
          <p class="g-colour-pal-key muted"><span>Top: targets</span><span>Bottom: yours</span></p>
          <div class="card g-colour-total">
            <span class="label">Total</span>
            <span class="big-num g-colour-total-num">${total.toFixed(1)}<small>/50</small></span>
            ${total > prevBest && prevBest > 0 ? '<span class="chip chip--gold">New best!</span>' : ''}
          </div>
          <div class="g-colour-end-actions">
            <button class="btn btn--ghost g-colour-share">📋 Copy palette</button>
            <button class="btn btn--primary g-colour-finish">Finish</button>
          </div>`;
        BG.fx.sound(total >= 40 ? 'win' : 'good');
        if (total >= 45) BG.fx.confetti();
        const summary = `Colour Eye ${total.toFixed(1)}/50 · best round ${best.toFixed(1)} 🎨`;
        const stats = {
          total,
          best,
          rounds: results.map((r) => r.score),
          avgDeltaE: Math.round((results.reduce((a, r) => a + r.dE, 0) / results.length) * 10) / 10,
          hardcore,
        };
        app.querySelector('.g-colour-share').addEventListener('click', async () => {
          const text = [
            `Colour Eye 🎨 ${ctx.mode === 'daily' ? `#${ctx.day}` : 'practice'}${hardcore ? ' 🔥' : ''}: ${total.toFixed(1)}/50`,
            results.map((r) => emojiFor(r.t.rgb)).join(''),
            results.map((r) => emojiFor(r.mine)).join(''),
            results.map((r) => r.score.toFixed(1)).join(' · '),
          ].join('\n');
          try {
            await navigator.clipboard.writeText(text);
            BG.fx.toast('Palette copied!');
          } catch {
            BG.fx.toast('Copy not available here');
          }
          BG.track('colour_share', { total });
        });
        const fin = app.querySelector('.g-colour-finish');
        fin.addEventListener('click', () => {
          if (!ctx.alive) return;
          ended = true;
          ctx.finish({ summary, stats });
        });
        fin.focus({ preventScroll: true });
      }

      // Enter = the main action of each phase (unless a button already handles it natively).
      const onKey = (e) => {
        if (e.key !== 'Enter' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && e.target.closest && e.target.closest('button')) return;
        if (phase === 'intro') { e.preventDefault(); flash(); }
        else if (phase === 'adjust') { e.preventDefault(); lock(); }
        else if (phase === 'reveal') { e.preventDefault(); advance(); }
      };
      document.addEventListener('keydown', onKey);
      ctx.onDestroy(() => {
        ended = true;
        document.removeEventListener('keydown', onKey);
        if (raf) cancelAnimationFrame(raf);
        timeouts.forEach(clearTimeout);
        timeouts.clear();
      });

      intro();
    },
  });
})();

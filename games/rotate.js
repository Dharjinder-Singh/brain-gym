// Brain Gym game: "Spin Doctor" (id 'rotate').
// Shepard–Metzler mental rotation: is the right shape the SAME object turned, or its MIRROR image?
// Wrong answers get a "show me" animation that turns the right shape into line with the left one.
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure engine (no DOM). Exported for node tests at the bottom of this block.
  // Matrices are row-major arrays of 9 numbers; screen space is x right, y up, z toward viewer.
  // ---------------------------------------------------------------------------
  const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const MIRROR = [-1, 0, 0, 0, 1, 0, 0, 0, 1]; // reflect object x
  const FLIP_SCREEN = [-1, 0, 0, 0, 1, 0, 0, 0, 1]; // reflect screen x (same numbers, different space)
  const DEG = Math.PI / 180;

  function mul(A, B) {
    const C = new Array(9);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
      }
    }
    return C;
  }
  const tr = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const app = (M, v) => [
    M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
    M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
    M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
  ];
  const det = (M) =>
    M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * M[7] - M[4] * M[6]);
  const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };

  // The 24 proper rotations of the cube: signed permutation matrices with det +1. ROTS[0] = identity.
  const ROTS = (() => {
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const out = [];
    perms.forEach((p) => {
      for (let s = 0; s < 8; s++) {
        const M = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 3; i++) M[i * 3 + p[i]] = s & (1 << i) ? -1 : 1;
        if (det(M) === 1) out.push(M);
      }
    });
    return out;
  })();
  const isIdentity = (M) => M.every((v, i) => v === I3[i]);

  const applyCells = (M, cells) => cells.map((c) => app(M, c).map((v) => Math.round(v) + 0));

  function normKey(cells) {
    const mn = [Infinity, Infinity, Infinity];
    cells.forEach((c) => { for (let k = 0; k < 3; k++) mn[k] = Math.min(mn[k], c[k]); });
    return cells
      .map((c) => [c[0] - mn[0], c[1] - mn[1], c[2] - mn[2]])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
      .map((c) => c.join(','))
      .join(';');
  }

  // Same canonical form <=> one shape can be rotated (not reflected) onto the other.
  function canonical(cells) {
    let best = null;
    ROTS.forEach((R) => {
      const k = normKey(applyCells(R, cells));
      if (best === null || k < best) best = k;
    });
    return best;
  }
  const mirrorCells = (cells) => applyCells(MIRROR, cells);
  const isChiral = (cells) => canonical(cells) !== canonical(mirrorCells(cells));

  // Shepard–Metzler chain: arms of straight cubes, each bend at a right angle, using all 3 axes.
  const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  function splitLengths(steps, arms, rand) {
    const lens = new Array(arms).fill(2);
    for (let left = steps - arms * 2; left > 0; left--) lens[Math.floor(rand() * arms)]++;
    return lens;
  }
  function genShape(nCubes, rand) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const arms = nCubes >= 9 && rand() < 0.75 ? 4 : 3;
      const lens = splitLengths(nCubes - 1, arms, rand);
      let pos = [0, 0, 0];
      const cells = [pos];
      const seen = new Set(['0,0,0']);
      let prev = null;
      const used = new Set();
      let ok = true;
      for (let a = 0; a < arms && ok; a++) {
        const choices = AXES.filter((d) => !prev || d.every((v, i) => v * prev[i] === 0));
        const d = choices[Math.floor(rand() * choices.length)];
        used.add(d.findIndex((v) => v !== 0));
        for (let s = 0; s < lens[a]; s++) {
          pos = [pos[0] + d[0], pos[1] + d[1], pos[2] + d[2]];
          const key = pos.join(',');
          // Open chain: a new cube may only touch the cube before it (no blobs or loops).
          const touches = AXES.some((n) => {
            const k2 = [pos[0] + n[0], pos[1] + n[1], pos[2] + n[2]].join(',');
            return seen.has(k2) && k2 !== cells[cells.length - 1].join(',');
          });
          if (seen.has(key) || touches) { ok = false; break; }
          seen.add(key);
          cells.push(pos);
        }
        prev = d;
      }
      if (!ok || used.size < 3) continue;
      if (!isChiral(cells)) continue;
      return cells;
    }
    // Fallback: a known chiral 10-cube chain.
    return [[0,0,0],[1,0,0],[2,0,0],[2,1,0],[2,2,0],[2,3,0],[2,3,1],[2,3,2],[1,3,2],[0,3,2]];
  }

  // Centroid and bounding radius (rotation-invariant, so the shape never leaves its box).
  function frame(cells) {
    const c = [0, 0, 0];
    cells.forEach((p) => { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; });
    c[0] /= cells.length; c[1] /= cells.length; c[2] /= cells.length;
    let r = 0;
    cells.forEach((p) => { r = Math.max(r, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])); });
    return { c, r: r + 0.87 };
  }

  // A shape is readable if no two cubes project (almost) on top of each other.
  function readable(cells, Q) {
    const { c } = frame(cells);
    const pts = cells.map((p) => app(Q, [p[0] - c[0], p[1] - c[1], p[2] - c[2]]));
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 0.5) return false;
      }
    }
    return true;
  }

  const LEVELS = [
    { name: 'Flat spin', blurb: 'It turns in the picture, like a dial.', cubes: [8, 9], until: 22 },
    { name: 'Turntable', blurb: 'Now it spins around the vertical axis.', cubes: [9, 10], until: 52 },
    { name: 'Free tumble', blurb: 'Any turn in 3D. Trust your mind\'s eye.', cubes: [10, 10], until: 90 },
  ];
  const PLANE_ANGLES = [45, 90, 135, 180, 225, 270, 315];
  const PER_LEVEL = 40;

  function viewMatrix(rand) {
    const yaw = (28 + rand() * 14 + 90 * Math.floor(rand() * 4)) * DEG;
    const tilt = (22 + rand() * 12) * DEG;
    return mul(rotX(tilt), rotY(yaw));
  }

  function genTrial(level, rand) {
    const L = LEVELS[level];
    const n = L.cubes[0] + Math.floor(rand() * (L.cubes[1] - L.cubes[0] + 1));
    const shape = genShape(n, rand);
    const mirror = rand() < 0.5;
    const cellsR = mirror ? mirrorCells(shape) : shape;
    for (let attempt = 0; attempt < 60; attempt++) {
      const V = viewMatrix(rand);
      const R0 = ROTS[Math.floor(rand() * 24)];
      const QL = mul(V, R0);
      let QR;
      let rel = null; // lattice rotation applied to the right shape (levels 2–3)
      let angle = 0; // picture-plane angle (level 1)
      // QR is always a proper rotation. For mirror trials it is applied to the mirrored cells,
      // and is chosen so the reflection fits the level: a flip in the picture plane (L1),
      // a flip across a vertical plane (L2), or any reflection (L3).
      if (level === 0) {
        angle = PLANE_ANGLES[Math.floor(rand() * PLANE_ANGLES.length)];
        QR = mirror ? mul(rotZ(angle * DEG), mul(FLIP_SCREEN, mul(QL, MIRROR))) : mul(rotZ(angle * DEG), QL);
      } else if (level === 1) {
        const k = 1 + Math.floor(rand() * 3);
        rel = ROTS.find((M) => M.every((v, i) => Math.abs(v - Math.round(rotY(k * 90 * DEG)[i])) < 1e-9));
        QR = mirror ? mul(V, mul(rel, mul(MIRROR, mul(R0, MIRROR)))) : mul(V, mul(rel, R0));
      } else {
        rel = ROTS[1 + Math.floor(rand() * 23)];
        QR = mul(V, mul(rel, R0));
      }
      if (!readable(shape, QL) || !readable(cellsR, QR)) continue;
      return { level, shape, cellsR, mirror, QL, QR, R0, rel, angle };
    }
    return null;
  }

  // Fixed per-seed sequence: PER_LEVEL trials for each level, generated up front.
  function genTrials(rand) {
    return LEVELS.map((_, lv) => {
      const list = [];
      while (list.length < PER_LEVEL) {
        const t = genTrial(lv, rand);
        if (t) list.push(t);
      }
      return list;
    });
  }

  // Where the right shape should end up in the "show me" animation:
  // SAME -> the left orientation; MIRROR -> the left shape flipped left-to-right on screen.
  const targetQ = (t) => (t.mirror ? mul(FLIP_SCREEN, mul(t.QL, MIRROR)) : t.QL);

  // Quaternions for smooth rotation between two orientations.
  function matToQuat(m) {
    const tr0 = m[0] + m[4] + m[8];
    let w, x, y, z;
    if (tr0 > 0) {
      const s = Math.sqrt(tr0 + 1) * 2;
      w = s / 4; x = (m[7] - m[5]) / s; y = (m[2] - m[6]) / s; z = (m[3] - m[1]) / s;
    } else if (m[0] > m[4] && m[0] > m[8]) {
      const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
      w = (m[7] - m[5]) / s; x = s / 4; y = (m[1] + m[3]) / s; z = (m[2] + m[6]) / s;
    } else if (m[4] > m[8]) {
      const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
      w = (m[2] - m[6]) / s; x = (m[1] + m[3]) / s; y = s / 4; z = (m[5] + m[7]) / s;
    } else {
      const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
      w = (m[3] - m[1]) / s; x = (m[2] + m[6]) / s; y = (m[5] + m[7]) / s; z = s / 4;
    }
    return [w, x, y, z];
  }
  function quatToMat([w, x, y, z]) {
    return [
      1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
      2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
      2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
    ];
  }
  function slerp(a, b, t) {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map((v) => -v); d = -d; }
    if (d > 0.9995) {
      const q = a.map((v, i) => v + (b[i] - v) * t);
      const n = Math.hypot(...q);
      return q.map((v) => v / n);
    }
    const th = Math.acos(d);
    const s = Math.sin(th);
    const wa = Math.sin((1 - t) * th) / s;
    const wb = Math.sin(t * th) / s;
    return a.map((v, i) => v * wa + b[i] * wb);
  }

  // Painter's algorithm: every exposed cube face, projected, sorted back to front by cube depth.
  const FACE_DIRS = AXES;
  function faces(cells, Q, fr) {
    const set = new Set(cells.map((c) => c.join(',')));
    const cubes = cells.map((cell) => {
      const p = [cell[0] - fr.c[0], cell[1] - fr.c[1], cell[2] - fr.c[2]];
      return { cell, z: app(Q, p)[2], p };
    });
    cubes.sort((a, b) => a.z - b.z);
    const out = [];
    cubes.forEach(({ cell, p }) => {
      FACE_DIRS.forEach((d) => {
        if (set.has([cell[0] + d[0], cell[1] + d[1], cell[2] + d[2]].join(','))) return;
        const n = app(Q, d);
        if (n[2] <= 1e-6) return;
        const k = d.findIndex((v) => v !== 0);
        const a = (k + 1) % 3;
        const b = (k + 2) % 3;
        const corner = (sa, sb) => {
          const v = p.slice();
          v[k] += d[k] * 0.5;
          v[a] += sa * 0.5;
          v[b] += sb * 0.5;
          return app(Q, v);
        };
        out.push({ n, pts: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)] });
      });
    });
    return out;
  }

  const engine = {
    ROTS, LEVELS, mul, tr, app, det, canonical, mirrorCells, isChiral, genShape, genTrial, genTrials,
    targetQ, matToQuat, quatToMat, slerp, faces, frame, applyCells, isIdentity, MIRROR,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Colours: derived from CSS tokens at runtime (works in light and dark mode).
  // ---------------------------------------------------------------------------
  function parseColor(str) {
    const s = String(str || '').trim();
    let m = s.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      let h = m[1];
      if (h.length <= 4) h = h.split('').map((x) => x + x).join('');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) return m[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number);
    return null;
  }
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn;
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h;
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }
  const hsl = (h, s, l) => `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`;

  function readPalette(el) {
    const cs = getComputedStyle(el);
    const base = parseColor(cs.getPropertyValue('--blue')) || parseColor(cs.color) || [60, 110, 220];
    const [h, s, l] = rgbToHsl(base);
    return { h, s: Math.min(0.85, s), l };
  }

  // Light from upper left, slightly toward the viewer.
  const LIGHT = (() => { const v = [-0.45, 0.8, 0.55]; const n = Math.hypot(...v); return v.map((x) => x / n); })();

  function svgShape(cells, Q, fr, pal) {
    const out = [];
    const edge = hsl(pal.h, pal.s, 0.14);
    faces(cells, Q, fr).forEach(({ n, pts }) => {
      const t = Math.max(0, Math.min(1, 0.5 + 0.5 * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])));
      const l = Math.max(0.2, Math.min(0.9, pal.l + (t - 0.55) * 0.5));
      const d = pts.map((p) => `${p[0].toFixed(3)},${(-p[1]).toFixed(3)}`).join(' ');
      out.push(`<polygon points="${d}" fill="${hsl(pal.h, pal.s, l)}" stroke="${edge}"/>`);
    });
    return out.join('');
  }

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const SECONDS = 90;
  const BASE = 10;
  const FAST = 5;
  const FAST_MS = 3000;
  const BLIND_MS = 450; // faster than anyone can actually look: base points only
  const SHOW_MS = 1500;
  const MISS = -10;
  const mult = (streak) => 1 + 0.1 * Math.min(streak, 5); // x1.0 → x1.5 after 5 in a row

  BG.registerGame({
    id: 'rotate',
    name: 'Spin Doctor',
    emoji: '🧊',
    skill: 'Spatial thinking',
    category: 'cool',
    tagline: 'Same shape, just turned? Or its sneaky mirror twin?',
    howTo: [
      'Two block shapes. Is the right one the left one turned around, or its mirror image?',
      'Tap Same or Mirror (keys S / M or ← / →). Under 3s earns a speed bonus.',
      'Streaks multiply your points; a wrong call costs 20 and shows you why.',
      '90 seconds, three levels of spin.',
    ],
    science:
      'A meta-analysis of 217 studies found spatial skills are trainable (average effect g = 0.47), and the gains lasted and transferred to untrained spatial tasks (Uttal et al., Psychological Bulletin 2013).',
    scienceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22663761/',
    minutes: 2,
    maxScore: 550,

    mount(root, ctx) {
      const trials = genTrials(ctx.rand);
      const used = [0, 0, 0];
      const stats = { shapes: 0, correct: 0, accuracy: 0, avgSec: 0, bestStreak: 0, level: 1 };
      let rtSum = 0;
      let level = -1;
      let trial = null;
      let fr = null;
      let frR = null;
      let pal = null;
      let shownAt = 0;
      let accepting = false;
      let streak = 0;
      let ended = false;
      let raf = 0;
      let timer = null;
      let finishTimer = 0;
      const timeouts = new Set();
      const later = (fn, ms) => {
        const id = setTimeout(() => { timeouts.delete(id); if (ctx.alive && !ended) fn(); }, ms);
        timeouts.add(id);
      };

      root.innerHTML = '';
      const wrap = BG.el(`
        <div class="g-rotate">
          <div class="g-rotate-top">
            <span class="label g-rotate-level"></span>
            <span class="chip chip--gold g-rotate-streak" aria-live="polite">×1.0</span>
          </div>
          <div class="g-rotate-timer"></div>
          <div class="g-rotate-stage">
            <div class="g-rotate-card g-rotate-left">
              <span class="g-rotate-tag">A</span>
              <svg class="g-rotate-svg" aria-label="Shape A" role="img"></svg>
            </div>
            <div class="g-rotate-mirrorline" aria-hidden="true"></div>
            <div class="g-rotate-card g-rotate-right">
              <span class="g-rotate-tag">B</span>
              <svg class="g-rotate-svg" aria-label="Shape B" role="img"></svg>
            </div>
            <div class="g-rotate-banner" hidden></div>
          </div>
          <p class="g-rotate-msg">Is B the same shape as A, just turned?</p>
          <div class="g-rotate-actions">
            <button class="btn g-rotate-btn g-rotate-same" data-ans="same">
              <span class="g-rotate-ico" aria-hidden="true">🔄</span> Same <kbd>S</kbd>
            </button>
            <button class="btn g-rotate-btn g-rotate-mirror" data-ans="mirror">
              <span class="g-rotate-ico" aria-hidden="true">🪞</span> Mirror <kbd>M</kbd>
            </button>
          </div>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const levelEl = $('.g-rotate-level');
      const streakEl = $('.g-rotate-streak');
      const stage = $('.g-rotate-stage');
      const leftCard = $('.g-rotate-left');
      const rightCard = $('.g-rotate-right');
      const svgL = leftCard.querySelector('svg');
      const svgR = rightCard.querySelector('svg');
      const banner = $('.g-rotate-banner');
      const msgEl = $('.g-rotate-msg');
      const btnSame = $('.g-rotate-same');
      const btnMirror = $('.g-rotate-mirror');
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      const say = (text, kind = '') => {
        msgEl.textContent = text;
        msgEl.className = `g-rotate-msg${kind ? ` g-rotate-msg--${kind}` : ''}`;
      };
      const setButtons = (on) => {
        btnSame.disabled = !on;
        btnMirror.disabled = !on;
      };
      const drawRight = (Q) => { svgR.innerHTML = svgShape(trial.cellsR, Q, frR, pal); };

      function updateStreak() {
        const m = mult(streak);
        streakEl.textContent = streak >= 2 ? `🔥 ${streak} · ×${m.toFixed(1)}` : `×${m.toFixed(1)}`;
        streakEl.classList.toggle('is-hot', streak >= 5);
      }

      function showTrial() {
        if (!ctx.alive || ended) return;
        const t = trial;
        fr = frame(t.shape);
        frR = frame(t.cellsR);
        pal = readPalette(wrap);
        const vb = `${-fr.r} ${-fr.r} ${2 * fr.r} ${2 * fr.r}`;
        svgL.setAttribute('viewBox', vb);
        svgR.setAttribute('viewBox', vb);
        svgL.innerHTML = svgShape(t.shape, t.QL, fr, pal);
        drawRight(t.QR);
        stage.classList.remove('is-same', 'is-mirror', 'is-right', 'is-wrong');
        rightCard.classList.remove('g-rotate-in');
        void rightCard.offsetWidth;
        rightCard.classList.add('g-rotate-in');
        say(level === 0 && stats.shapes < 2 ? 'Is B the same shape as A, just turned?' : '');
        shownAt = performance.now();
        accepting = true;
        setButtons(true);
      }

      function levelFor(sec) {
        return LEVELS.findIndex((L) => sec < L.until) === -1 ? 2 : LEVELS.findIndex((L) => sec < L.until);
      }

      function next() {
        if (!ctx.alive || ended) return;
        const lv = levelFor(timer ? timer.elapsed() : 0);
        if (lv !== level) {
          level = lv;
          stats.level = lv + 1;
          ctx.setProgress(lv + 1, 3);
          levelEl.textContent = `Level ${lv + 1} · ${LEVELS[lv].name}`;
          trial = trials[lv][used[lv]++ % trials[lv].length];
          banner.innerHTML = `<b>Level ${lv + 1}</b><span>${BG.esc(LEVELS[lv].name)}</span><small>${BG.esc(LEVELS[lv].blurb)}</small>`;
          banner.hidden = false;
          BG.fx.pop(banner);
          if (lv > 0) BG.fx.sound('pop');
          svgL.innerHTML = '';
          svgR.innerHTML = '';
          accepting = false;
          setButtons(false);
          if (lv === 0) startTimer();
          later(() => { banner.hidden = true; showTrial(); }, lv === 0 ? 1100 : 900);
          return;
        }
        trial = trials[lv][used[lv]++ % trials[lv].length];
        showTrial();
      }

      function animateTo(fromQ, toQ, ms, done) {
        const qa = matToQuat(fromQ);
        const qb = matToQuat(toQ);
        if (reduced) { drawRight(toQ); done(); return; }
        const t0 = performance.now();
        const step = (now) => {
          if (!ctx.alive || ended) return;
          const x = Math.min(1, (now - t0) / ms);
          const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
          drawRight(quatToMat(slerp(qa, qb, e)));
          if (x < 1) raf = requestAnimationFrame(step);
          else { raf = 0; done(); }
        };
        raf = requestAnimationFrame(step);
      }

      function answer(choice, btn) {
        if (!accepting || !ctx.alive || ended) return;
        accepting = false;
        setButtons(false);
        const rt = performance.now() - shownAt;
        const correct = (choice === 'mirror') === trial.mirror;
        stats.shapes++;
        rtSum += rt;
        BG.fx.haptic();
        if (correct) {
          const blind = rt < BLIND_MS;
          const m = blind ? 1 : mult(streak);
          const fast = !blind && rt < FAST_MS;
          const pts = Math.round((BASE + (fast ? FAST : 0)) * m);
          streak++;
          stats.correct++;
          stats.bestStreak = Math.max(stats.bestStreak, streak);
          ctx.addScore(pts, btn);
          BG.fx.sound(streak > 0 && streak % 5 === 0 ? 'win' : 'good');
          stage.classList.add('is-right');
          say(blind ? '🎲 Lucky guess? Look first for bonuses.' : fast ? `⚡ ${(rt / 1000).toFixed(1)}s, speedy!` : `✓ ${trial.mirror ? 'Mirror twin' : 'Same shape'}`, 'good');
          updateStreak();
          if (streak >= 5 && streak % 5 === 0) BG.fx.pop(streakEl);
          later(next, 380);
          return;
        }
        // Wrong: buzz, then the teaching moment.
        streak = 0;
        updateStreak();
        ctx.addScore(MISS, btn);
        BG.fx.sound('bad');
        BG.fx.shake(btn);
        stage.classList.add('is-wrong');
        say(trial.mirror ? 'Watch: turning B can\'t match A…' : 'Watch B turn into line with A…', 'bad');
        animateTo(trial.QR, targetQ(trial), SHOW_MS, () => {
          if (!ctx.alive || ended) return;
          stage.classList.remove('is-wrong');
          if (trial.mirror) {
            stage.classList.add('is-mirror');
            say('🪞 It\'s a mirror image: the best turn only flips it.', 'teach');
          } else {
            stage.classList.add('is-same');
            say('🔄 Same shape, just turned!', 'teach');
          }
          later(next, 850);
        });
      }

      function startTimer() {
        timer = BG.timerBar($('.g-rotate-timer'), SECONDS);
        timer.done.then(() => {
          if (!ctx.alive || ended) return;
          end();
        });
      }

      function end() {
        if (ended) return;
        ended = true;
        accepting = false;
        setButtons(false);
        if (raf) cancelAnimationFrame(raf);
        timeouts.forEach(clearTimeout);
        timeouts.clear();
        stats.accuracy = stats.shapes ? Math.round((stats.correct / stats.shapes) * 100) : 0;
        stats.avgSec = stats.shapes ? Math.round(rtSum / stats.shapes / 100) / 10 : 0;
        const best = ctx.store.get('best', 0);
        if (stats.correct > best) ctx.store.set('best', stats.correct);
        const good = stats.shapes >= 10 && stats.accuracy >= 80;
        BG.fx.sound(good ? 'win' : 'lose');
        if (good) BG.fx.confetti();
        say(`⏱ Time! ${stats.correct} of ${stats.shapes} right.`, 'good');
        const summary = stats.shapes
          ? `${stats.shapes} shape${stats.shapes === 1 ? '' : 's'}, ${stats.accuracy}% right, ${stats.avgSec.toFixed(1)}s avg 🧊`
          : 'No shapes spun this time 🧊';
        finishTimer = setTimeout(() => {
          if (ctx.alive) ctx.finish({ summary, stats: { ...stats } });
        }, 900);
      }

      wrap.querySelector('.g-rotate-actions').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ans]');
        if (btn) answer(btn.dataset.ans, btn);
      });
      const onKey = (e) => {
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key;
        if (k === 's' || k === 'S' || k === 'ArrowLeft') { e.preventDefault(); answer('same', btnSame); }
        else if (k === 'm' || k === 'M' || k === 'ArrowRight') { e.preventDefault(); answer('mirror', btnMirror); }
      };
      document.addEventListener('keydown', onKey);
      ctx.onDestroy(() => {
        ended = true;
        document.removeEventListener('keydown', onKey);
        if (raf) cancelAnimationFrame(raf);
        timeouts.forEach(clearTimeout);
        timeouts.clear();
        if (timer) timer.stop();
        clearTimeout(finishTimer);
      });

      setButtons(false);
      updateStreak();
      next();
    },
  });
})();

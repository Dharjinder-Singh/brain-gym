// Chart Crimes: the chart detective. Each case is a chart (drawn by a tiny SVG renderer)
// plus a dramatic headline. Decide if the headline is fair, bet on it, name the crime,
// then watch the chart morph into its honest version.
(() => {
  'use strict';

  const TOTAL = 5;
  const CRIMES_PER_DAY = 4; // + 1 honest chart
  const CRIME_IDS = ['truncated', 'cherry', 'dual', 'pie', 'picto', 'intervals', 'cumulative', 'nounits', 'causation'];
  // Never offer both of a pair as options: they look alike on the chart.
  const CONFLICTS = { truncated: ['nounits'], nounits: ['truncated'], dual: ['causation'], causation: ['dual'] };
  const W = 300;
  const H = 210;

  // ---------- small helpers (no BG dependency, so node can test the engine) ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
  const rint = (min, max, rand) => min + Math.floor(rand() * (max - min + 1));
  const rr = (min, max, rand) => min + rand() * (max - min);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // Values ≥ 100 are whole numbers; small values keep one decimal.
  const rv = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);
  function fmt(v) {
    if (Math.abs(v) >= 100) return Math.round(v).toLocaleString('en-US');
    return String(Math.round(v * 10) / 10);
  }
  function fmtTick(v) {
    if (Math.abs(v) >= 10000) return `${Math.round(v / 100) / 10}k`;
    return fmt(v);
  }
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));

  function niceStep(span, n) {
    const raw = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    return [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw - 1e-12) * mag;
  }
  function ticks(lo, hi, n = 4) {
    if (!(hi > lo)) return [lo];
    const step = niceStep(hi - lo, n);
    const out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
    return out;
  }
  // Round up to a tidy axis maximum with a little headroom.
  function niceMax(v) {
    const step = niceStep(v * 1.08, 4);
    return Math.ceil((v * 1.08) / step) * step;
  }
  function corr(a, b) {
    const n = a.length;
    const ma = a.reduce((s, x) => s + x, 0) / n;
    const mb = b.reduce((s, x) => s + x, 0) / n;
    let sab = 0;
    let saa = 0;
    let sbb = 0;
    for (let i = 0; i < n; i++) {
      sab += (a[i] - ma) * (b[i] - mb);
      saa += (a[i] - ma) ** 2;
      sbb += (b[i] - mb) ** 2;
    }
    return sab / Math.sqrt(saa * sbb || 1);
  }
  const evenXs = (n) => Array.from({ length: n }, (_, i) => i);

  function xyView(o) {
    const n = o.vals.length;
    return Object.assign(
      {
        type: 'xy', kind: 'bar', xs: evenXs(n), vals2: null, xDom: [0, n - 1], yDom: [0, niceMax(Math.max(...o.vals))],
        y2Dom: null, yLabels: 1, y2Show: 0, L: 46, R: 12, unit: '', unit2: '', grow: 1, legend: null,
      },
      o
    );
  }

  // A series moving from v0 to vl, with in-between points kept strictly between the two.
  function between(v0, vl, n, rand, wiggle = 0.3) {
    const out = [v0];
    for (let i = 1; i < n - 1; i++) {
      const f = clamp(i / (n - 1) + (rand() - 0.5) * wiggle, 0.06, 0.94);
      out.push(rv(v0 + (vl - v0) * f));
    }
    out.push(vl);
    return out;
  }

  // ---------- case generators ----------
  // Each returns { crime, theme, title, headline, lesson, view (as shown), honest (the morph target), facts }
  const GEN = {};

  GEN.truncated = (th, C, rand) => {
    const n = 6;
    const s = rint(0, th.labels.length - n, rand);
    const v0 = rv(rr(th.base[0], th.base[1], rand));
    const vl = rv(v0 * (1 + rr(0.02, 0.045, rand)));
    const vals = between(v0, vl, n, rand);
    const range = vl - v0;
    const lo = range >= 5 ? Math.floor(v0 - range * 0.3) : Math.floor((v0 - range * 0.3) * 10) / 10;
    const hi = rv(vl + range * 0.15);
    const vis = (vl - lo) / (v0 - lo);
    const pct = ((vl / v0 - 1) * 100).toFixed(1);
    const labels = th.labels.slice(s, s + n);
    const base = { kind: 'bar', vals, labels, unit: th.unit };
    return {
      title: cap(th.what),
      headline: fill(pick(C.headlines, rand), { WHAT: th.WHAT }),
      lesson: fill(C.lesson, { lo: fmt(lo), pct, vis: vis.toFixed(1) }),
      view: xyView(Object.assign({}, base, { yDom: [lo, hi] })),
      honest: xyView(base),
      facts: { lo, v0, vl, vis, trueRatio: vl / v0 },
    };
  };

  GEN.nounits = (th, C, rand) => {
    const n = 7;
    const s = rint(0, th.labels.length - n, rand);
    const v0 = rv(rr(th.base[0], th.base[1], rand));
    const vl = rv(v0 * (1 - rr(0.02, 0.045, rand)));
    const vals = between(v0, vl, n, rand);
    const range = v0 - vl;
    const lo = range >= 5 ? Math.floor(vl - range * 0.25) : Math.floor((vl - range * 0.25) * 10) / 10;
    const hi = rv(v0 + range * 0.1);
    const vis = (v0 - lo) / (vl - lo);
    const pct = ((1 - vl / v0) * 100).toFixed(1);
    const base = { kind: 'line', vals, labels: th.labels.slice(s, s + n), unit: th.unit };
    return {
      title: cap(th.what),
      headline: fill(pick(C.headlines, rand), { WHAT: th.WHAT }),
      lesson: fill(C.lesson, { pct }),
      view: xyView(Object.assign({}, base, { yDom: [lo, hi], yLabels: 0 })),
      honest: xyView(base),
      facts: { lo, v0, vl, vis, trueRatio: v0 / vl },
    };
  };

  GEN.cherry = (th, C, rand) => {
    const n = 12;
    const win = 4;
    const S = rv(rr(th.base[0], th.base[1], rand));
    const f = rr(0.15, 0.3, rand);
    const w = rr(0.15, 0.3, rand);
    const E = rv(S * (1 - f));
    const T = rv(E / (1 + w));
    const vals = [S];
    for (let i = 1; i < n - win; i++) {
      const base = S + (T - S) * (i / (n - win));
      vals.push(rv(Math.max(T * 1.03, base + (rand() - 0.5) * 0.08 * S)));
    }
    vals.push(T);
    for (let i = 1; i < win; i++) {
      const prev = vals[vals.length - 1];
      const target = T + (E - T) * (i / (win - 1));
      const v = i === win - 1 ? E : rv(clamp(target + (rand() - 0.5) * 0.04 * T, prev + (E - T) * 0.1, E - (E - T) * 0.1));
      vals.push(v);
    }
    const base = { kind: 'line', vals, labels: th.labels.slice(0, n), unit: th.unit };
    const wStart = n - win;
    const view = xyView(Object.assign({}, base, { xDom: [wStart, n - 1], yDom: [0, niceMax(Math.max(...vals.slice(wStart)))] }));
    return {
      title: cap(th.what),
      headline: fill(pick(C.headlines, rand), { WHAT: th.WHAT }),
      lesson: fill(C.lesson, { win, n, what: th.what, wpct: Math.round((E / T - 1) * 100), fpct: Math.round((1 - E / S) * 100) }),
      view,
      honest: xyView(base),
      facts: { wStart, windowRise: E / T - 1, fullChange: E / S - 1 },
    };
  };

  GEN.dual = (th, C, rand) => {
    const n = 8;
    const P = th.partner;
    const shape = () => between(0, 1, n, () => rand(), 0.16).map((x) => clamp(x, 0, 1));
    const s1 = shape();
    const s2 = shape();
    const A0 = rv(rr(th.base[0], th.base[1], rand));
    const B0 = rv(rr(P.base[0], P.base[1], rand));
    const aP = rr(0.02, 0.05, rand);
    const bP = rr(1.0, 2.0, rand);
    const A = s1.map((x, i) => (i === 0 ? A0 : rv(A0 * (1 + aP * x))));
    const B = s2.map((x, i) => (i === 0 ? B0 : rv(B0 * (1 + bP * x))));
    const pad = (arr) => {
      const mn = Math.min(...arr);
      const mx = Math.max(...arr);
      const p = (mx - mn) * 0.15;
      return [rv(mn - p), rv(mx + p)];
    };
    const labels = th.labels.slice(0, n);
    const legendCrime = [{ cls: 'a', name: `${cap(th.what)} (left axis)` }, { cls: 'b', name: `${cap(P.what)} (right axis)` }];
    const view = xyView({ kind: 'line', vals: A, vals2: B, labels, unit: th.unitShort, unit2: P.unit, yDom: pad(A), y2Dom: pad(B), y2Show: 1, R: 46, legend: legendCrime });
    const iA = A.map((v) => Math.round((v / A0) * 1000) / 10);
    const iB = B.map((v) => Math.round((v / B0) * 1000) / 10);
    const top = niceMax(Math.max(...iB));
    const honest = xyView({
      kind: 'line', vals: iA, vals2: iB, labels, unit: 'index, first value = 100', unit2: '', yDom: [0, top], y2Dom: [0, top], y2Show: 0, R: 12,
      legend: [{ cls: 'a', name: cap(th.what) }, { cls: 'b', name: cap(P.what) }],
    });
    const apct = ((A[n - 1] / A0 - 1) * 100).toFixed(1);
    const bpct = Math.round((B[n - 1] / B0 - 1) * 100);
    const norm = (arr, d) => arr.map((v) => (v - d[0]) / (d[1] - d[0]));
    return {
      title: `${cap(th.what)} vs ${P.what}`,
      headline: fill(pick(C.headlines, rand), { WHAT: th.WHAT, PARTNER: P.WHAT }),
      lesson: fill(C.lesson, { what: th.what, partner: P.what, apct, bpct }),
      view,
      honest,
      facts: { apct: +apct, bpct, pixelCorr: corr(norm(A, view.yDom), norm(B, view.y2Dom)) },
    };
  };

  GEN.intervals = (th, C, rand) => {
    const gaps = pick([[1, 1, 2, 4, 6, 8], [1, 1, 2, 3, 5, 10], [1, 1, 2, 3, 6, 6], [1, 1, 1, 4, 5, 9], [1, 1, 2, 4, 4, 8]], rand);
    const y0 = rint(2000, 2002, rand);
    const years = [y0];
    gaps.forEach((g) => years.push(years[years.length - 1] + g));
    const span = years[years.length - 1] - y0;
    const v0 = rv(rr(th.base[0], th.base[1], rand) * 0.7);
    const g = rr(0.8, 1.4, rand);
    const vals = years.map((y, i) => (i === 0 ? v0 : rv(v0 * (1 + (g * (y - y0)) / span) * (1 + (rand() - 0.5) * 0.01))));
    const n = years.length;
    const labels = years.map(String);
    const unit = `${th.unit} (yearly average)`;
    return {
      title: `${cap(th.what)} by year`,
      headline: fill(pick(C.headlines, rand), { WHAT: th.WHAT }),
      lesson: fill(C.lesson, { bigGap: Math.max(...gaps) }),
      view: xyView({ kind: 'line', vals, labels, unit }),
      honest: xyView({ kind: 'line', vals, labels, unit, xs: years.map((y) => ((y - y0) / span) * (n - 1)) }),
      facts: { years, gaps },
    };
  };

  GEN.cumulative = (th, C, rand) => {
    const n = 8;
    const s = rint(0, th.labels.length - n, rand);
    const p0 = rv(rr(th.base[0], th.base[1], rand));
    const pl = rv(p0 * (1 - rr(0.25, 0.45, rand)));
    const per = between(p0, pl, n, rand, 0.35);
    const cum = [];
    let run = 0;
    per.forEach((v) => {
      run += v;
      cum.push(rv(run));
    });
    const labels = th.labels.slice(s, s + n);
    return {
      title: cap(th.what),
      headline: fill(pick(C.headlines, rand), { WHAT: th.WHAT, PERIOD: th.period.toUpperCase() }),
      lesson: fill(C.lesson, { what: th.what, period: th.period, first: fmt(p0), last: fmt(pl) }),
      view: xyView({ kind: 'bar', vals: cum, labels, unit: `total ${th.unitShort} so far` }),
      honest: xyView({ kind: 'bar', vals: per, labels, unit: th.unit }),
      facts: { per, cum },
    };
  };

  GEN.causation = (th, C, rand) => {
    const K = th.cause;
    const n = 12;
    const phase = rand() * Math.PI * 2;
    const c = Array.from({ length: n }, (_, i) => 0.5 + 0.5 * Math.sin((i / n) * Math.PI * 2 + phase));
    const xs = c.map((v) => rv(K.xBase[0] + (K.xBase[1] - K.xBase[0]) * clamp(v + (rand() - 0.5) * 0.16, 0, 1)));
    const ys = c.map((v) => rv(K.yBase[0] + (K.yBase[1] - K.yBase[0]) * clamp(v + (rand() - 0.5) * 0.16, 0, 1)));
    const hot = c.map((v) => (v > 0.55 ? 1 : 0));
    const base = { type: 'scatter', xs, ys, hot, xDom: [0, niceMax(Math.max(...xs))], yDom: [0, niceMax(Math.max(...ys))], xName: K.x, yName: K.y, hidden: K.hidden, period: th.period };
    return {
      title: `${K.y} vs ${K.x}, one dot per ${th.period}`,
      headline: K.headline,
      lesson: K.lesson,
      view: Object.assign({}, base, { hotOp: 0 }),
      honest: Object.assign({}, base, { hotOp: 1 }),
      facts: { r: corr(xs, ys) },
    };
  };

  // Survey shares (sorted high → low) for the pie cases.
  function pieShares(rand, multi) {
    if (multi) {
      for (;;) {
        const s = [rint(40, 56, rand), rint(28, 39, rand), rint(16, 27, rand), rint(8, 15, rand)];
        const sum = s.reduce((a, b) => a + b, 0);
        if (sum >= 115 && sum <= 140) return s;
      }
    }
    for (;;) {
      const s = [rint(34, 48, rand), rint(22, 30, rand), rint(12, 20, rand)];
      const last = 100 - s[0] - s[1] - s[2];
      if (last >= 5 && last < s[2]) return s.concat(last);
    }
  }

  GEN.pie = (th, C, rand) => {
    const shares = pieShares(rand, true);
    const cats = shuffle(th.pie.cats, rand);
    const slices = cats.map((label, i) => ({ label, pct: shares[i] }));
    const sum = shares.reduce((a, b) => a + b, 0);
    return {
      title: th.pie.title,
      headline: fill(pick(C.headlines, rand), { TOP: cats[0].toUpperCase(), SECOND: cats[1].toUpperCase(), sum2: shares[0] + shares[1] }),
      lesson: fill(C.lesson, { sum }),
      view: { type: 'pie', slices },
      honest: xyView({ kind: 'bar', vals: shares, labels: cats, unit: '% who picked it (several allowed)', yDom: [0, 100], cats: 1 }),
      facts: { sum },
    };
  };

  function pictoCase(th, rand, r, crime) {
    const a = rv(rr(th.base[0], th.base[1], rand));
    const b = rv(a * r);
    const ratio = b / a;
    const base = { type: 'picto', a, b, icon: th.icon, labels: ['Last year', 'This year'], unit: th.unit, sideA: 1 };
    return {
      ratio,
      view: Object.assign({}, base, { sideB: crime ? ratio : Math.sqrt(ratio) }),
      honest: Object.assign({}, base, { sideB: Math.sqrt(ratio) }),
    };
  }

  GEN.picto = (th, C, rand) => {
    const p = pictoCase(th, rand, rr(1.45, 1.8, rand), true);
    return {
      title: `${cap(th.what)}: last year vs this year`,
      headline: fill(pick(C.headlines, rand), { WHAT: th.WHAT }),
      lesson: fill(C.lesson, { ratio: p.ratio.toFixed(1), area: (p.ratio * p.ratio).toFixed(1) }),
      view: p.view,
      honest: p.honest,
      facts: { ratio: p.ratio },
    };
  };

  function honestCase(th, D, rand) {
    const HN = D.honest;
    const kind = pick(['bar', 'line', 'pie', 'picto'], rand);
    if (kind === 'pie') {
      const shares = pieShares(rand, false);
      const cats = shuffle(th.pie.cats, rand);
      const v = { type: 'pie', slices: cats.map((label, i) => ({ label, pct: shares[i] })) };
      return { title: th.pie.title, headline: `${cats[0]} comes out on top with ${shares[0]}%`, lesson: HN.pieLesson, view: v, honest: v, facts: { sum: 100 } };
    }
    if (kind === 'picto') {
      const r = rand() < 0.4 ? rr(2.1, 2.5, rand) : rr(1.2, 1.8, rand);
      const p = pictoCase(th, rand, r, false);
      const headline = p.ratio > 2 ? `${th.WHAT} MORE THAN DOUBLE!` : `${cap(th.what)} up ${Math.round((p.ratio - 1) * 100)}% on last year`;
      return { title: `${cap(th.what)}: last year vs this year`, headline, lesson: fill(HN.pictoLesson, { ratio: p.ratio.toFixed(1) }), view: p.honest, honest: p.honest, facts: { ratio: p.ratio } };
    }
    const n = kind === 'bar' ? 6 : 8;
    const s = rint(0, th.labels.length - n, rand);
    const v0 = rv(rr(th.base[0], th.base[1], rand));
    const g = rand() < 0.3 ? -rr(0.15, 0.35, rand) : rr(0.12, 0.9, rand);
    const vl = rv(v0 * (1 + g));
    const vals = between(v0, vl, n, rand);
    const labels = th.labels.slice(s, s + n);
    const pct = Math.round(Math.abs(vl / v0 - 1) * 100);
    let headline;
    if (vl < v0) headline = `${cap(th.what)} down ${pct}% from ${labels[0]} to ${labels[n - 1]}`;
    else if (pct >= 50) headline = `${th.WHAT} UP ${pct}%: A REAL BOOM!`;
    else headline = `${cap(th.what)} up ${pct}% from ${labels[0]} to ${labels[n - 1]}`;
    const v = xyView({ kind, vals, labels, unit: th.unit });
    return { title: cap(th.what), headline, lesson: pick(HN.lesson, rand), view: v, honest: v, facts: { v0, vl, pct } };
  }

  function genCase(crime, th, D, rand) {
    const c = crime === 'honest' ? honestCase(th, D, rand) : GEN[crime](th, D.crimes[crime], rand);
    return Object.assign(c, { crime, theme: th.id, themeEmoji: th.emoji, who: th.who, source: th.source });
  }

  // Daily: crimes come from a fixed round-robin stream, 4 consecutive per day, so a day never
  // repeats a crime and every crime comes back every 2–3 days. Data and themes vary per seed.
  function chooseCrimes(day, mode, rand) {
    if (mode === 'daily') {
      const order = shuffle(CRIME_IDS, rng(hash('charts-crime-order')));
      const d = Math.max(0, day - 1);
      const out = [];
      for (let j = 0; j < CRIMES_PER_DAY; j++) out.push(order[(d * CRIMES_PER_DAY + j) % order.length]);
      return out;
    }
    return shuffle(CRIME_IDS, rand).slice(0, CRIMES_PER_DAY);
  }

  function buildCases(D, day, mode, rand) {
    const crimes = chooseCrimes(day, mode, rand).concat('honest');
    const themes = shuffle(D.themes, rand);
    const order = shuffle(crimes, rand);
    return order.map((crime, i) => genCase(crime, themes[i % themes.length], D, rand));
  }

  // Six evidence cards: the answer plus five others (never a look-alike pair).
  function crimeOptions(answer, rand) {
    const banned = CONFLICTS[answer] || [];
    const others = shuffle(CRIME_IDS.filter((c) => c !== answer && !banned.includes(c)), rand);
    const picked = answer === 'honest' ? others.slice(0, 6) : others.slice(0, 5).concat(answer);
    return shuffle(picked, rand);
  }

  // ---------- SVG renderer ----------
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function lerpView(a, b, t) {
    const out = {};
    Object.keys(b).forEach((k) => {
      const va = a[k];
      const vb = b[k];
      if (typeof vb === 'number' && typeof va === 'number') out[k] = va + (vb - va) * t;
      else if (Array.isArray(vb) && Array.isArray(va) && va.length === vb.length)
        out[k] = vb.map((x, i) => (typeof x === 'number' && typeof va[i] === 'number' ? va[i] + (x - va[i]) * t : t < 0.5 ? va[i] : x));
      else out[k] = t < 0.5 && va !== undefined ? va : vb;
    });
    return out;
  }

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const n1 = (v) => Math.round(v * 10) / 10;

  function renderXY(v, uid) {
    const T = 24;
    const B = v.cats ? 36 : 28;
    const L = v.L;
    const R = v.R;
    const pw = W - L - R;
    const ph = H - T - B;
    const [x0, x1] = v.xDom;
    const slot = pw / (Math.max(1e-6, x1 - x0) + 1);
    const X = (x) => L + (x - x0 + 0.5) * slot;
    const [lo, hi] = v.yDom;
    const Y = (y) => T + ph - ((y - lo) / (hi - lo || 1)) * ph;
    const d2 = v.y2Dom || v.yDom;
    const Y2 = (y) => T + ph - ((y - d2[0]) / (d2[1] - d2[0] || 1)) * ph;
    const g = v.grow;
    const parts = [];
    const op = n1(v.yLabels);
    parts.push(`<defs><clipPath id="${uid}"><rect x="${n1(L)}" y="${T - 8}" width="${n1(pw)}" height="${n1(ph + 8)}"/></clipPath></defs>`);
    // grid + left ticks
    ticks(lo, hi, 4).forEach((t) => {
      const y = n1(Y(t));
      parts.push(`<line class="ch-grid" x1="${n1(L)}" x2="${n1(W - R)}" y1="${y}" y2="${y}" opacity="${op}"/>`);
      parts.push(`<text class="ch-tick ch-tick--a" x="${n1(L - 5)}" y="${y + 4}" text-anchor="end" opacity="${op}">${fmtTick(t)}</text>`);
    });
    if (v.unit) parts.push(`<text class="ch-unit" x="2" y="12" opacity="${op}">${esc(v.unit)}</text>`);
    if (v.y2Dom && v.y2Show > 0.01) {
      ticks(d2[0], d2[1], 4).forEach((t) => {
        parts.push(`<text class="ch-tick ch-tick--b" x="${n1(W - R + 5)}" y="${n1(Y2(t)) + 4}" opacity="${n1(v.y2Show)}">${fmtTick(t)}</text>`);
      });
      if (v.unit2) parts.push(`<text class="ch-unit ch-unit--b" x="${W - 2}" y="12" text-anchor="end" opacity="${n1(v.y2Show)}">${esc(v.unit2)}</text>`);
    }
    // marks
    const marks = [];
    const n = v.vals.length;
    if (v.kind === 'bar') {
      const bw = Math.min(30, slot * 0.62);
      for (let i = 0; i < n; i++) {
        const val = lo + (v.vals[i] - lo) * g;
        const top = Y(Math.max(val, lo));
        const h = Math.max(0, Y(lo) - top);
        marks.push(`<rect class="ch-bar" x="${n1(X(v.xs[i]) - bw / 2)}" y="${n1(top)}" width="${n1(bw)}" height="${n1(h)}" rx="3"/>`);
      }
    } else {
      const line = (vals, Yf, cls) => {
        const pts = vals.map((val, i) => [n1(X(v.xs[i])), n1(Yf(lo + (val - lo) * g))]);
        marks.push(`<path class="ch-line ch-line--${cls}" d="M${pts.map((p) => p.join(' ')).join(' L')}"/>`);
        pts.forEach((p) => marks.push(`<circle class="ch-dot ch-dot--${cls}" cx="${p[0]}" cy="${p[1]}" r="3.6"/>`));
      };
      if (v.vals2) line(v.vals2, Y2, 'b');
      line(v.vals, Y, 'a');
    }
    parts.push(`<g clip-path="url(#${uid})">${marks.join('')}</g>`);
    // baseline
    parts.push(`<line class="ch-axis" x1="${n1(L)}" x2="${n1(W - R)}" y1="${n1(T + ph)}" y2="${n1(T + ph)}" opacity="${op}"/>`);
    // x labels, skipping any that would collide
    let last = -1e9;
    for (let i = 0; i < n; i++) {
      const x = X(v.xs[i]);
      if (x < L - 2 || x > W - R + 2) continue;
      const lab = String(v.labels[i]);
      if (v.cats && lab.includes(' ')) {
        const [w1, ...rest] = lab.split(' ');
        parts.push(`<text class="ch-tick" x="${n1(x)}" y="${H - 20}" text-anchor="middle"><tspan>${esc(w1)}</tspan><tspan x="${n1(x)}" dy="13">${esc(rest.join(' '))}</tspan></text>`);
        continue;
      }
      const wdt = lab.length * 7 + 6;
      if (x - last < wdt) continue;
      last = x;
      parts.push(`<text class="ch-tick" x="${n1(x)}" y="${v.cats ? H - 20 : H - 8}" text-anchor="middle">${esc(lab)}</text>`);
    }
    return parts.join('');
  }

  function renderScatter(v) {
    const T = 24;
    const B = 38;
    const L = 46;
    const R = 12;
    const pw = W - L - R;
    const ph = H - T - B;
    const X = (x) => L + ((x - v.xDom[0]) / (v.xDom[1] - v.xDom[0])) * pw;
    const Y = (y) => T + ph - ((y - v.yDom[0]) / (v.yDom[1] - v.yDom[0])) * ph;
    const parts = [];
    ticks(v.yDom[0], v.yDom[1], 4).forEach((t) => {
      const y = n1(Y(t));
      parts.push(`<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`);
      parts.push(`<text class="ch-tick" x="${L - 5}" y="${y + 4}" text-anchor="end">${fmtTick(t)}</text>`);
    });
    let last = -1e9;
    ticks(v.xDom[0], v.xDom[1], 4).forEach((t) => {
      const x = n1(X(t));
      const lab = fmtTick(t);
      if (x - last < lab.length * 7 + 8) return;
      last = x;
      parts.push(`<text class="ch-tick" x="${x}" y="${T + ph + 15}" text-anchor="middle">${lab}</text>`);
    });
    parts.push(`<line class="ch-axis" x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}"/>`);
    parts.push(`<line class="ch-axis" x1="${L}" x2="${L}" y1="${T}" y2="${T + ph}"/>`);
    parts.push(`<text class="ch-unit" x="2" y="12">↑ ${esc(v.yName)}</text>`);
    parts.push(`<text class="ch-unit" x="${W - R}" y="${H - 4}" text-anchor="end">${esc(v.xName)} →</text>`);
    v.xs.forEach((x, i) => {
      const cx = n1(X(x));
      const cy = n1(Y(v.ys[i]));
      parts.push(`<circle class="ch-pt" cx="${cx}" cy="${cy}" r="5.5"/>`);
      if (v.hot[i]) parts.push(`<circle class="ch-pt ch-pt--hot" cx="${cx}" cy="${cy}" r="${n1(5.5 + 1.5 * v.hotOp)}" opacity="${n1(v.hotOp)}"/>`);
    });
    return parts.join('');
  }

  function renderPie(v) {
    const cx = 150;
    const cy = 108;
    const r = 80;
    const total = v.slices.reduce((s, x) => s + x.pct, 0) || 1;
    let a = -Math.PI / 2;
    const parts = [];
    const labels = [];
    v.slices.forEach((s, i) => {
      const da = (s.pct / total) * Math.PI * 2;
      const a2 = a + da;
      const large = da > Math.PI ? 1 : 0;
      const p = (ang, rad) => `${n1(cx + rad * Math.cos(ang))} ${n1(cy + rad * Math.sin(ang))}`;
      parts.push(`<path class="ch-slice ch-slice--${i}" d="M${cx} ${cy} L${p(a, r)} A${r} ${r} 0 ${large} 1 ${p(a2, r)} Z"/>`);
      const mid = a + da / 2;
      const lx = cx + (r + 16) * Math.cos(mid);
      const ly = cy + (r + 16) * Math.sin(mid);
      labels.push(`<text class="ch-pie-label" x="${n1(lx)}" y="${n1(ly + 4)}" text-anchor="${Math.cos(mid) > 0.25 ? 'start' : Math.cos(mid) < -0.25 ? 'end' : 'middle'}">${s.pct}%</text>`);
      a = a2;
    });
    return parts.join('') + labels.join('');
  }

  function renderPicto(v) {
    const base = 150;
    const cols = [[80, v.a, v.sideA, v.labels[0]], [215, v.b, v.sideB, v.labels[1]]];
    const parts = [`<text class="ch-unit" x="2" y="12">${esc(v.unit)}</text>`];
    parts.push(`<line class="ch-axis" x1="20" x2="${W - 20}" y1="${base + 4}" y2="${base + 4}"/>`);
    cols.forEach(([x, val, side, lab]) => {
      const size = 44 * side;
      parts.push(`<text class="ch-icon" x="${x}" y="${n1(base - size * 0.12)}" text-anchor="middle" font-size="${n1(size)}">${v.icon}</text>`);
      parts.push(`<text class="ch-picto-val" x="${x}" y="${base + 24}" text-anchor="middle">${fmt(val)}</text>`);
      parts.push(`<text class="ch-tick" x="${x}" y="${base + 42}" text-anchor="middle">${esc(lab)}</text>`);
    });
    return parts.join('');
  }

  function renderView(v, uid) {
    if (v.type === 'xy') return renderXY(v, uid);
    if (v.type === 'scatter') return renderScatter(v);
    if (v.type === 'pie') return renderPie(v);
    return renderPicto(v);
  }

  function legendHTML(v) {
    if (v.type === 'pie') return v.slices.map((s, i) => `<span class="ch-key"><i class="ch-sw ch-sw--${i}"></i>${esc(s.label)} <b>${s.pct}%</b></span>`).join('');
    if (v.type === 'scatter')
      return `<span class="ch-key"><i class="ch-sw ch-sw--pt"></i>one dot = one ${esc(v.period)}</span>${v.hotOp > 0.5 ? `<span class="ch-key ch-key--hot"><i class="ch-sw ch-sw--hot"></i>Hidden factor: ${esc(v.hidden)}</span>` : ''}`;
    if (v.type === 'xy' && v.legend) return v.legend.map((k) => `<span class="ch-key"><i class="ch-sw ch-sw--${k.cls}"></i>${esc(k.name)}</span>`).join('');
    return '';
  }

  const engine = { CRIME_IDS, CONFLICTS, TOTAL, GEN, genCase, honestCase, buildCases, chooseCrimes, crimeOptions, renderView, lerpView, legendHTML, corr, ticks, niceMax, rng, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------- the game ----------
  const BET_KEYS = ['guess', 'likely', 'sure'];
  const LINES = {
    busted: ['Busted! 🚔', 'Case closed. 🕵️', 'Nailed it! 🔍', 'Elementary. 🔎'],
    honestOk: ['Honest chart, trusted ✅', 'Good call: clean chart ✅', 'Fair and square ✅'],
    honestMissed: ['That chart was innocent 🙃', 'False alarm: it plays fair 🙃'],
    slipped: ['The crime slipped past you 🫣', 'Fooled by the chart 🫣'],
    wrongCrime: ['Right suspicion, wrong crime 🤏', 'Shady, yes, but a different crime 🤏'],
  };

  BG.registerGame({
    id: 'charts',
    name: 'Chart Crimes',
    emoji: '📊',
    skill: 'Reading charts critically',
    category: 'life',
    tagline: 'Every chart tells a story. Some of them are lying.',
    howTo: [
      'Each case is a chart with a dramatic headline.',
      'Is the headline fair? Call it and bet on it.',
      'If it\'s a chart crime, tap the trick it used.',
      'Watch the chart morph into the honest version.',
    ],
    science:
      'In crowd-sourced experiments, bar charts with y-axes not starting at zero made the same differences look bigger, and the effect persisted even when the design explicitly signalled the truncation (Correll, Bertini & Franconeri, CHI 2020).',
    scienceUrl: 'https://arxiv.org/abs/1907.02035',
    minutes: 4,
    maxScore: TOTAL * (80 + 40),

    mount(root, ctx) {
      const D = window.BG_DATA_CHARTS;
      const uidBase = `chclip${(ctx.seed >>> 0).toString(36)}`;
      let uidN = 0;

      // ---------- timers & cleanup ----------
      const timers = new Set();
      let raf = 0;
      const later = (fn, ms) => {
        const id = setTimeout(() => {
          timers.delete(id);
          fn();
        }, ms);
        timers.add(id);
        return id;
      };
      const wait = (ms) => new Promise((res) => later(res, ms));
      const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const hasKeys = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

      let phase = 'idle'; // fair | bet | crime | morph | reveal | end
      let onKeyAction = null;

      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey) return;
        if (phase === 'bet') {
          const n = Number(e.key);
          const sheet = document.querySelector('.bet-sheet');
          if (sheet && n >= 1 && n <= 3) {
            const b = sheet.querySelector(`[data-bet="${BET_KEYS[n - 1]}"]`);
            if (b) {
              e.preventDefault();
              b.click();
            }
          }
          return;
        }
        if (onKeyAction && onKeyAction(e)) e.preventDefault();
      }
      document.addEventListener('keydown', onKey);
      ctx.onDestroy(() => {
        timers.forEach(clearTimeout);
        timers.clear();
        cancelAnimationFrame(raf);
        document.removeEventListener('keydown', onKey);
        phase = 'end';
      });

      if (!D || !D.themes || !D.crimes) {
        root.innerHTML = '<p class="muted">The evidence locker is empty (content file missing). Please refresh.</p>';
        return;
      }

      // ---------- DOM ----------
      const wrap = BG.el(`
        <div class="ch-wrap">
          <div class="ch-board" aria-label="Crime board">
            <span class="ch-board-title">Crime board</span>
            <div class="ch-slots">${Array.from({ length: TOTAL }, (_, i) => `<div class="ch-slot" data-i="${i}"><span>${i + 1}</span></div>`).join('')}</div>
          </div>
          <div class="ch-stage"></div>
        </div>`);
      root.appendChild(wrap);
      const stage = wrap.querySelector('.ch-stage');
      const slots = Array.from(wrap.querySelectorAll('.ch-slot'));

      function crimeMeta(id) {
        return id === 'honest' ? { emoji: D.honest.emoji, name: D.honest.name, short: 'Honest' } : D.crimes[id];
      }

      function draw(svg, legend, v, uid) {
        svg.innerHTML = renderView(v, uid);
        if (legend) legend.innerHTML = legendHTML(v);
      }

      // Animate a view change. Same chart type: tween every number. Different type: fade, then grow.
      function morph(svg, legend, from, to, uid) {
        return new Promise((resolve) => {
          if (reduced) {
            draw(svg, legend, to, uid);
            resolve();
            return;
          }
          const same = from.type === to.type;
          const dur = same ? 1500 : 1300;
          const t0 = performance.now();
          let legendDone = false;
          const frame = (now) => {
            if (!ctx.alive) return resolve();
            const k = Math.min(1, (now - t0) / dur);
            if (same) {
              const v = lerpView(from, to, ease(k));
              svg.innerHTML = renderView(v, uid);
              if (!legendDone && k >= 0.5) {
                legendDone = true;
                if (legend) legend.innerHTML = legendHTML(to);
              }
            } else if (k < 0.3) {
              svg.innerHTML = `<g opacity="${(1 - k / 0.3).toFixed(2)}">${renderView(from, uid)}</g>`;
            } else {
              const g = ease((k - 0.3) / 0.7);
              svg.innerHTML = renderView(Object.assign({}, to, { grow: g }), uid);
              if (!legendDone) {
                legendDone = true;
                if (legend) legend.innerHTML = legendHTML(to);
              }
            }
            if (k < 1) raf = requestAnimationFrame(frame);
            else {
              draw(svg, legend, to, uid);
              resolve();
            }
          };
          raf = requestAnimationFrame(frame);
        });
      }

      function pin(i, c, fullyRight) {
        const m = crimeMeta(c.crime);
        const slot = slots[i];
        slot.innerHTML = `
          <div class="ch-note ${fullyRight ? 'is-right' : 'is-wrong'}" style="--tilt:${((i % 2 ? 1 : -1) * (2 + (i % 3))).toFixed(0)}deg">
            <i class="ch-pin"></i>
            <span class="ch-note-emoji" aria-hidden="true">${m.emoji}</span>
            <span class="ch-note-name">${BG.esc(m.short || m.name)}</span>
            <span class="ch-note-mark">${fullyRight ? '✔' : '✘'}</span>
          </div>`;
        slot.classList.add('is-filled');
        slot.setAttribute('aria-label', `Case ${i + 1}: ${m.name}, ${fullyRight ? 'solved' : 'missed'}`);
      }

      const results = [];

      async function playCase(i, c) {
        ctx.setProgress(i + 1, TOTAL);
        const uid = `${uidBase}_${uidN++}`;
        stage.innerHTML = `
          <article class="card ch-case">
            <div class="ch-case-top">
              <span class="label">Case #${i + 1}</span>
              <span class="chip chip--blue">${c.themeEmoji} ${BG.esc(c.who)}</span>
            </div>
            <h3 class="ch-headline">${BG.esc(c.headline)}</h3>
            <p class="ch-title">${BG.esc(c.title)}</p>
            <div class="ch-chart"><svg class="ch-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${BG.esc(c.title)}"></svg></div>
            <div class="ch-legend"></div>
            <p class="ch-source">Source: ${BG.esc(c.source)} (fictional)</p>
          </article>
          <div class="ch-ask"></div>`;
        const card = stage.querySelector('.ch-case');
        const svg = stage.querySelector('.ch-svg');
        const legend = stage.querySelector('.ch-legend');
        const ask = stage.querySelector('.ch-ask');
        draw(svg, legend, c.view, uid);
        BG.fx.sound('pop');
        try {
          wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* old browsers */
        }

        // ----- step 1: fair or not? -----
        phase = 'fair';
        ask.innerHTML = `
          <p class="ch-q">Is the headline fair?</p>
          <div class="ch-verdicts">
            <button class="ch-vbtn ch-vbtn--fair" data-v="fair"><span aria-hidden="true">👍</span> Fair${hasKeys ? ' <kbd>1</kbd>' : ''}</button>
            <button class="ch-vbtn ch-vbtn--crime" data-v="crime"><span aria-hidden="true">🚨</span> Chart crime!${hasKeys ? ' <kbd>2</kbd>' : ''}</button>
          </div>`;
        const said = await new Promise((res) => {
          ask.addEventListener('click', (e) => {
            const b = e.target.closest('[data-v]');
            if (b) res(b.dataset.v);
          });
          onKeyAction = (e) => {
            if (e.key === '1' || e.key.toLowerCase() === 'f') return res('fair'), true;
            if (e.key === '2' || e.key.toLowerCase() === 'c') return res('crime'), true;
            return false;
          };
        });
        onKeyAction = null;
        if (!ctx.alive) return;
        BG.fx.sound('pick');
        BG.fx.haptic();
        ask.querySelectorAll('.ch-vbtn').forEach((b) => {
          b.disabled = true;
          b.classList.toggle('is-picked', b.dataset.v === said);
        });
        phase = 'bet';
        const bet = await ctx.bet(said === 'fair' ? 'How sure is it fair?' : 'How sure is it a crime?');
        if (!ctx.alive) return;

        // ----- step 2: name the crime -----
        let named = null;
        if (said === 'crime') {
          phase = 'crime';
          const opts = crimeOptions(c.crime, ctx.rand);
          ask.innerHTML = `
            <p class="ch-q">Name the crime 🔍</p>
            <div class="ch-opts" role="group" aria-label="Chart crimes">
              ${opts.map((id, k) => {
                const m = D.crimes[id];
                return `<button class="ch-opt" data-c="${id}" title="${BG.esc(m.name)}">
                  ${hasKeys ? `<span class="ch-opt-key">${k + 1}</span>` : ''}
                  <span class="ch-opt-emoji" aria-hidden="true">${m.emoji}</span>
                  <span class="ch-opt-name">${BG.esc(m.short)}</span>
                </button>`;
              }).join('')}
            </div>`;
          BG.fx.sound('pop');
          named = await new Promise((res) => {
            ask.addEventListener('click', (e) => {
              const b = e.target.closest('[data-c]');
              if (b) res(b.dataset.c);
            });
            onKeyAction = (e) => {
              const k = Number(e.key);
              if (k >= 1 && k <= opts.length) return res(opts[k - 1]), true;
              return false;
            };
          });
          onKeyAction = null;
          if (!ctx.alive) return;
          BG.fx.sound('pick');
          BG.fx.haptic(30);
          ask.querySelectorAll('.ch-opt').forEach((b) => {
            b.disabled = true;
            b.classList.toggle('is-picked', b.dataset.c === named);
            if (b.dataset.c === c.crime) b.classList.add('is-answer');
            else if (b.dataset.c === named) b.classList.add('is-wrong');
          });
        }

        // ----- step 3: reveal + morph -----
        phase = 'morph';
        const isHonest = c.crime === 'honest';
        const callRight = (said === 'fair') === isHonest;
        const crimeRight = isHonest ? said === 'fair' : named === c.crime;
        if (!isHonest) {
          const tag = BG.el(`<span class="ch-evidence">${D.crimes[c.crime].emoji} Fixing the chart…</span>`);
          card.appendChild(tag);
          await wait(reduced ? 0 : 350);
          if (!ctx.alive) return;
          BG.fx.sound('tick');
          await morph(svg, legend, c.view, c.honest, uid);
          if (!ctx.alive) return;
          tag.remove();
        }
        // CASE CLOSED stamp
        const stamp = BG.el(`<span class="ch-stamp ${callRight && crimeRight ? 'ch-stamp--ok' : ''}">CASE CLOSED</span>`);
        card.appendChild(stamp);
        BG.fx.sound('pop');
        BG.fx.haptic(40);
        later(() => BG.fx.sound(callRight && crimeRight ? 'good' : 'bad'), 160);
        if (callRight && crimeRight) BG.fx.pop(card);
        else BG.fx.shake(card);

        const m = crimeMeta(c.crime);
        let title;
        if (isHonest) title = BG.pick(callRight ? LINES.honestOk : LINES.honestMissed, ctx.rand);
        else if (!callRight) title = BG.pick(LINES.slipped, ctx.rand);
        else title = BG.pick(crimeRight ? LINES.busted : LINES.wrongCrime, ctx.rand);
        const youSaid =
          !isHonest && named && !crimeRight
            ? `<p class="ch-yousaid muted">You said ${D.crimes[named].emoji} ${BG.esc(D.crimes[named].name)}.</p>`
            : '';
        ask.innerHTML = `
          <div class="card ch-verdict ${callRight && crimeRight ? 'ch-verdict--ok' : 'ch-verdict--bad'}">
            <h3 class="ch-vtitle">${BG.esc(title)}</h3>
            <p class="ch-answer"><span class="label">${isHonest ? 'Verdict' : 'The crime'}</span><span class="ch-answer-name">${m.emoji} ${BG.esc(m.name)}</span></p>
            ${youSaid}
            <p class="ch-lesson">${BG.esc(c.lesson)}</p>
            <div class="ch-points"></div>
          </div>
          <button class="btn btn--primary btn--block ch-next" disabled>${i + 1 < TOTAL ? 'Next case →' : 'Close the file 🗂️'}</button>`;
        const verdict = ask.querySelector('.ch-verdict');
        const pointsEl = ask.querySelector('.ch-points');
        const nextBtn = ask.querySelector('.ch-next');
        try {
          verdict.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }

        const chips = [];
        if (callRight) {
          ctx.addScore(40, stamp);
          chips.push(`<span class="chip chip--ok">+40 ${isHonest ? 'trusted' : 'spotted'}</span>`);
        }
        await wait(450);
        if (!ctx.alive) return;
        const delta = ctx.settleBet(bet, callRight, verdict);
        ctx.addScore(delta);
        const b = BG.BETS[bet];
        chips.push(`<span class="chip ${delta > 0 ? 'chip--ok' : delta < 0 ? '' : 'chip--blue'}">${b ? b.emoji : ''} bet ${delta > 0 ? '+' : ''}${delta}</span>`);
        if (crimeRight) {
          await wait(350);
          if (!ctx.alive) return;
          ctx.addScore(40, pointsEl);
          chips.push(`<span class="chip chip--ok">+40 ${isHonest ? 'no crime' : 'crime named'}</span>`);
        }
        pointsEl.innerHTML = chips.join('');

        pin(i, c, callRight && crimeRight);
        BG.fx.sound('tap');
        results.push({ crime: c.crime, callRight, crimeRight });
        const st = ctx.store.get('byCrime', {});
        const row = st[c.crime] || { n: 0, right: 0 };
        row.n += 1;
        if (callRight && crimeRight) row.right += 1;
        st[c.crime] = row;
        ctx.store.set('byCrime', st);
        BG.track('charts_case', { crime: c.crime, theme: c.theme, said, named, callRight, crimeRight, bet });

        phase = 'reveal';
        nextBtn.disabled = false;
        nextBtn.focus({ preventScroll: true });
        await new Promise((res) => {
          nextBtn.addEventListener('click', res, { once: true });
          onKeyAction = (e) => {
            if (e.key === 'Enter' && document.activeElement !== nextBtn) return res(), true;
            return false;
          };
        });
        onKeyAction = null;
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      async function run() {
        const cases = buildCases(D, ctx.day, ctx.mode, ctx.rand);
        for (let i = 0; i < cases.length; i++) {
          await playCase(i, cases[i]);
          if (!ctx.alive) return;
        }
        phase = 'end';
        const crimes = results.filter((r) => r.crime !== 'honest');
        const honest = results.filter((r) => r.crime === 'honest');
        const busted = crimes.filter((r) => r.callRight && r.crimeRight).length;
        const flagged = crimes.filter((r) => r.callRight).length;
        const trusted = honest.filter((r) => r.callRight).length;
        const perfect = busted === crimes.length && trusted === honest.length;
        const missed = crimes.filter((r) => !(r.callRight && r.crimeRight)).map((r) => D.crimes[r.crime]);
        const line = perfect
          ? 'Every crime busted, every honest chart trusted. The data police salute you.'
          : busted >= 3
          ? 'Sharp work, detective. A couple of tricks still need a closer look.'
          : busted >= 1
          ? 'Some crimes busted. Check axes, time windows and units, and the rest will crack.'
          : 'The charts got away this time. Tomorrow, the axis starts at zero.';
        stage.innerHTML = `
          <div class="card ch-end">
            <div class="ch-end-emoji" aria-hidden="true">${perfect ? '🏆' : '🗂️'}</div>
            <p class="big-num ch-end-score">${busted}/${crimes.length} busted</p>
            <p class="ch-end-line">${BG.esc(line)}</p>
            ${missed.length ? `<p class="ch-end-missed"><span class="label">Study these</span>${missed.map((m) => `<span class="chip chip--warn">${m.emoji} ${BG.esc(m.short)}</span>`).join('')}</p>` : ''}
          </div>`;
        wrap.querySelector('.ch-board').classList.add('is-done');
        BG.fx.pop(stage.querySelector('.ch-end'));
        if (perfect) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else BG.fx.sound(busted >= 2 ? 'good' : 'lose');
        await wait(2400);
        if (!ctx.alive) return;
        const trustLine = trusted === honest.length ? `trusted ${trusted} honest chart${trusted === 1 ? '' : 's'}` : `trusted ${trusted}/${honest.length} honest chart${honest.length === 1 ? '' : 's'}`;
        ctx.finish({
          summary: `Busted ${busted}/${crimes.length} chart crimes, ${trustLine} 📊`,
          stats: { busted, crimes: crimes.length, flagged, trusted, honest: honest.length, missed: missed.map((m) => m.short).join(', ') || 'none' },
        });
      }

      run();
    },
  });
})();

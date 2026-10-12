// Brain Gym game: "Who Did What?" (id 'logic').
// Procedurally generated logic-grid mysteries. Every case is checked by brute force to have exactly
// one solution, and by a step-by-step deducer to be solvable without guessing.
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure puzzle engine (no DOM). Exported for node tests at the bottom.
  // ---------------------------------------------------------------------------
  const PC = -1; // the "person" category in clue references

  // Daily: a 3×2 warm-up, then a 4×3 main case.
  const LEVELS = [
    { n: 3, k: 2, base: 100, minClues: 4, maxClues: 6, maxSame: 2, maxDirect: 1 },
    { n: 4, k: 3, base: 200, minClues: 7, maxClues: 12, maxSame: 2, maxDirect: 1 },
  ];
  const TYPE_W = { diff: 3, same: 1, next: 1.6, less: 1.1, or: 0.8 };

  const N_WORD = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];

  function permutations(n) {
    const out = [];
    const a = Array.from({ length: n }, (_, i) => i);
    (function rec(i) {
      if (i === n) return out.push(a.slice());
      for (let j = i; j < n; j++) {
        [a[i], a[j]] = [a[j], a[i]];
        rec(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
    })(0);
    return out;
  }

  // Every possible assignment, flattened: VAL[r*S + c*n + p] = value of person p in category c,
  // INV[r*S + c*n + v] = person holding value v in category c.
  const spaces = {};
  function space(n, k) {
    const key = `${n}x${k}`;
    if (spaces[key]) return spaces[key];
    const perms = permutations(n);
    const P = perms.length;
    let total = 1;
    for (let c = 0; c < k; c++) total *= P;
    const S = k * n;
    const VAL = new Int8Array(total * S);
    const INV = new Int8Array(total * S);
    for (let r = 0; r < total; r++) {
      let x = r;
      for (let c = 0; c < k; c++) {
        const perm = perms[x % P];
        x = Math.floor(x / P);
        for (let p = 0; p < n; p++) {
          VAL[r * S + c * n + p] = perm[p];
          INV[r * S + c * n + perm[p]] = p;
        }
      }
    }
    const all = new Int32Array(total);
    for (let r = 0; r < total; r++) all[r] = r;
    spaces[key] = { n, k, S, total, VAL, INV, all };
    return spaces[key];
  }

  // ---------- clues ----------
  function personGetter(sp, ref) {
    if (ref.c === PC) {
      const v = ref.v;
      return () => v;
    }
    const { INV, S, n } = sp;
    const off = ref.c * n + ref.v;
    return (r) => INV[r * S + off];
  }

  function compile(sp, clue) {
    const { VAL, S, n } = sp;
    const pa = personGetter(sp, clue.a);
    const pb = personGetter(sp, clue.b);
    switch (clue.t) {
      case 'same':
        return (r) => pa(r) === pb(r);
      case 'diff':
        return (r) => pa(r) !== pb(r);
      case 'next': {
        const o = clue.o * n;
        return (r) => VAL[r * S + o + pa(r)] === VAL[r * S + o + pb(r)] + 1;
      }
      case 'less': {
        const o = clue.o * n;
        return (r) => VAL[r * S + o + pa(r)] < VAL[r * S + o + pb(r)];
      }
      case 'or': {
        const pc = personGetter(sp, clue.alt);
        return (r) => {
          const x = pa(r);
          return x === pb(r) || x === pc(r);
        };
      }
      default:
        return () => true;
    }
  }

  const refKey = (r) => `${r.c}:${r.v}`;
  function clueKey(c) {
    const ab = [refKey(c.a), refKey(c.b)];
    if (c.t === 'same' || c.t === 'diff') ab.sort();
    if (c.t === 'or') return `or|${refKey(c.a)}|${[refKey(c.b), refKey(c.alt)].sort().join('|')}`;
    return `${c.t}|${c.o == null ? '' : c.o}|${ab.join('|')}`;
  }

  // Value of person p in category c (c may be PC).
  const valOf = (sol, n, c, p) => (c === PC ? p : sol[c * n + p]);
  const refFor = (sol, n, c, p) => ({ c, v: valOf(sol, n, c, p) });

  // A random clue of type t that is TRUE for the solution `sol`.
  function makeClue(t, sol, n, k, ordered, rand) {
    const cats = [PC];
    for (let c = 0; c < k; c++) cats.push(c);
    const twoCats = () => {
      const s = shuffle(cats, rand);
      return [s[0], s[1]];
    };
    const p = Math.floor(rand() * n);
    if (t === 'same') {
      const [c1, c2] = twoCats();
      return { t, a: refFor(sol, n, c1, p), b: refFor(sol, n, c2, p) };
    }
    if (t === 'diff') {
      let q = Math.floor(rand() * (n - 1));
      if (q >= p) q++;
      const [c1, c2] = twoCats();
      return { t, a: refFor(sol, n, c1, p), b: refFor(sol, n, c2, q) };
    }
    if (t === 'next' || t === 'less') {
      if (!ordered.length) return null;
      const o = pick(ordered, rand);
      const pairs = [];
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
          const va = sol[o * n + a];
          const vb = sol[o * n + b];
          if (t === 'next' ? va === vb + 1 : va < vb) pairs.push([a, b]);
        }
      }
      const [a, b] = pick(pairs, rand);
      const others = cats.filter((c) => c !== o);
      return { t, o, a: refFor(sol, n, pick(others, rand), a), b: refFor(sol, n, pick(others, rand), b) };
    }
    if (t === 'or') {
      const [cr, d] = twoCats();
      const v = valOf(sol, n, d, p);
      let w = Math.floor(rand() * (n - 1));
      if (w >= v) w++;
      const two = rand() < 0.5 ? [v, w] : [w, v];
      return { t, a: refFor(sol, n, cr, p), b: { c: d, v: two[0] }, alt: { c: d, v: two[1] } };
    }
    return null;
  }

  const isDirect = (c) => c.t === 'same' && (c.a.c === PC || c.b.c === PC);

  // Count rows of `list` satisfying all tests, stopping at `limit`.
  function countSat(list, tests, limit) {
    let count = 0;
    outer: for (let i = 0; i < list.length; i++) {
      const r = list[i];
      for (let j = 0; j < tests.length; j++) if (!tests[j](r)) continue outer;
      if (++count >= limit) break;
    }
    return count;
  }

  function filterRows(list, test) {
    const out = [];
    for (let i = 0; i < list.length; i++) if (test(list[i])) out.push(list[i]);
    return out;
  }

  // Per (category, person) bitmask of values still possible across `rows`.
  function maskOf(sp, rows) {
    const { VAL, S } = sp;
    const m = new Uint8Array(S);
    for (let i = 0; i < rows.length; i++) {
      const o = rows[i] * S;
      for (let j = 0; j < S; j++) m[j] |= 1 << VAL[o + j];
    }
    return m;
  }

  function rowsForKnowledge(sp, K) {
    const { VAL, S, all } = sp;
    const out = [];
    outer: for (let i = 0; i < all.length; i++) {
      const o = all[i] * S;
      for (let j = 0; j < S; j++) if (!(K[j] & (1 << VAL[o + j]))) continue outer;
      out.push(all[i]);
    }
    return out;
  }

  const sameMask = (a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  };

  function* subsets(m, size) {
    const idx = Array.from({ length: size }, (_, i) => i);
    if (size > m) return;
    while (true) {
      yield idx.slice();
      let i = size - 1;
      while (i >= 0 && idx[i] === m - size + i) i--;
      if (i < 0) return;
      idx[i]++;
      for (let j = i + 1; j < size; j++) idx[j] = idx[j - 1] + 1;
    }
  }

  // Human-style check: starting from knowledge K (per-person masks), repeatedly combine at most
  // `maxSize` clues with what is already known. Returns the number of rounds, or -1 if stuck.
  function deductionRounds(sp, tests, maxSize = 3) {
    let K = new Uint8Array(sp.S).fill((1 << sp.n) - 1);
    for (let round = 1; round <= 40; round++) {
      const base = rowsForKnowledge(sp, K);
      if (base.length === 1) return round - 1;
      const bm = maskOf(sp, base);
      let next = bm.slice();
      let progress = false;
      const singles = tests.map((t) => filterRows(base, t));
      for (let size = 1; size <= maxSize && !progress; size++) {
        for (const sub of subsets(tests.length, size)) {
          let rows = singles[sub[0]];
          for (let s = 1; s < sub.length && rows.length; s++) rows = filterRows(rows, tests[sub[s]]);
          const m = maskOf(sp, rows);
          for (let j = 0; j < m.length; j++) next[j] &= m[j];
        }
        progress = !sameMask(next, bm);
      }
      if (!progress) return -1;
      K = next;
    }
    return -1;
  }

  // One hint: the smallest set of clues that, with knowledge K, rules something new out.
  // Returns { clues: [i…], m: newMask, bm: baseMask } or null.
  function deduceStep(sp, tests, K, maxSize = 3) {
    const base = rowsForKnowledge(sp, K);
    if (base.length <= 1) return null;
    const bm = maskOf(sp, base);
    const singles = tests.map((t) => filterRows(base, t));
    // Prefer the smallest clue set that pins down a full match; otherwise the smallest that rules
    // anything out.
    let firstNeg = null;
    for (let size = 1; size <= maxSize; size++) {
      for (const sub of subsets(tests.length, size)) {
        let rows = singles[sub[0]];
        for (let s = 1; s < sub.length && rows.length; s++) rows = filterRows(rows, tests[sub[s]]);
        const m = maskOf(sp, rows);
        if (sameMask(m, bm)) continue;
        let pos = 0;
        for (let j = 0; j < m.length; j++) if (bm[j] !== m[j] && (m[j] & (m[j] - 1)) === 0) pos++;
        if (pos) return { clues: sub, m, bm, pos };
        if (!firstNeg) firstNeg = { clues: sub, m, bm, pos: 0 };
      }
    }
    return firstNeg;
  }

  function chooseItems(cat, n, rand) {
    const items = cat.items;
    if (cat.ordered) {
      const start = Math.floor(rand() * (items.length - n + 1));
      return items.slice(start, start + n);
    }
    const idx = shuffle(items.map((_, i) => i), rand).slice(0, n).sort((a, b) => a - b);
    return idx.map((i) => items[i]);
  }

  function chooseNames(names, n, rand) {
    const out = [];
    const initials = new Set();
    for (const nm of shuffle(names, rand)) {
      if (initials.has(nm[0])) continue;
      initials.add(nm[0]);
      out.push(nm);
      if (out.length === n) break;
    }
    return out.sort();
  }

  // Build one case. data = BG_DATA_LOGIC, theme = one of data.themes.
  function generate(levelIndex, rand, data, theme) {
    const L = LEVELS[levelIndex];
    const { n, k } = L;
    const sp = space(n, k);
    let fallback = null;
    for (let attempt = 0; attempt < 80; attempt++) {
      // Categories: the main case always includes the ordered one (if any) for ordering clues.
      let cats = shuffle(theme.cats, rand).slice(0, k);
      if (k === theme.cats.length) cats = theme.cats.slice();
      const ordered = [];
      cats.forEach((c, i) => c.ordered && ordered.push(i));
      const names = chooseNames(data.names, n, rand);
      const items = cats.map((c) => chooseItems(c, n, rand));
      const solRow = Math.floor(rand() * sp.total);
      const sol = sp.VAL.slice(solRow * sp.S, solRow * sp.S + sp.S);

      // Greedy: add true clues that cut the candidate set until one solution is left.
      const clues = [];
      const keys = new Set();
      let cands = sp.all;
      let same = 0;
      let direct = 0;
      let ors = 0;
      for (let tries = 0; tries < 600 && cands.length > 1; tries++) {
        const types = Object.keys(TYPE_W).filter(
          (t) => (t !== 'next' && t !== 'less') || ordered.length,
        );
        let total = 0;
        types.forEach((t) => (total += TYPE_W[t]));
        let x = rand() * total;
        let t = types[types.length - 1];
        for (const tt of types) {
          x -= TYPE_W[tt];
          if (x < 0) {
            t = tt;
            break;
          }
        }
        const clue = makeClue(t, sol, n, k, ordered, rand);
        if (!clue) continue;
        if (t === 'same' && (same >= L.maxSame || (isDirect(clue) && direct >= L.maxDirect))) continue;
        if (t === 'or' && ors >= 1) continue;
        const key = clueKey(clue);
        if (keys.has(key)) continue;
        const test = compile(sp, clue);
        const next = filterRows(cands, test);
        if (next.length === cands.length) continue;
        // Keep the warm-up gentle; avoid one clue collapsing most of the main case.
        if (levelIndex > 0 && clues.length < 3 && next.length * 6 < cands.length && t !== 'diff') continue;
        keys.add(key);
        clue.test = test;
        clues.push(clue);
        cands = next;
        if (t === 'same') same++;
        if (isDirect(clue)) direct++;
        if (t === 'or') ors++;
      }
      if (cands.length !== 1) continue;

      // Tighten: drop clues that are not needed for uniqueness.
      let kept = clues.slice();
      const removed = [];
      for (const c of shuffle(clues, rand)) {
        const rest = kept.filter((x) => x !== c);
        if (countSat(sp.all, rest.map((x) => x.test), 2) === 1) {
          kept = rest;
          removed.push(c);
        }
      }
      // Pad short sets back up with removed clues (non-positive first): gentler, never ambiguous.
      removed.sort((a, b) => (a.t === 'same') - (b.t === 'same'));
      while (kept.length < L.minClues && removed.length) kept.push(removed.shift());
      if (kept.length < L.minClues || kept.length > L.maxClues) continue;

      kept = shuffle(kept, rand);
      const tests = kept.map((c) => c.test);
      const rounds = deductionRounds(sp, tests, 3);
      const puz = { level: levelIndex, n, k, theme, cats, names, items, sol, solRow, clues: kept, rounds, attempts: attempt + 1 };
      if (rounds < 0) {
        if (!fallback) fallback = puz;
        continue;
      }
      // The main case should take more than one sweep of the clues.
      if (levelIndex > 0 && rounds < 2 && attempt < 60) {
        if (!fallback) fallback = puz;
        continue;
      }
      return puz;
    }
    return fallback;
  }

  // ---------- text ----------
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fill = (tpl, v) => tpl.replace('{v}', v);

  function itemName(puz, ref) {
    return ref.c === PC ? puz.names[ref.v] : puz.items[ref.c][ref.v].n;
  }
  function subj(puz, ref) {
    return ref.c === PC ? puz.names[ref.v] : fill(puz.cats[ref.c].who, itemName(puz, ref));
  }
  function pred(puz, ref) {
    return ref.c === PC ? `is ${puz.names[ref.v]}` : fill(puz.cats[ref.c].pred, itemName(puz, ref));
  }
  function neg(puz, ref) {
    return ref.c === PC ? `isn't ${puz.names[ref.v]}` : fill(puz.cats[ref.c].neg, itemName(puz, ref));
  }
  function orPred(puz, b, alt) {
    const A = itemName(puz, b);
    const B = itemName(puz, alt);
    if (b.c === PC) return `is ${A} or ${B}`;
    const cat = puz.cats[b.c];
    return cat.or ? cat.or.replace('{a}', A).replace('{b}', B) : fill(cat.pred, `${A} or ${B}`);
  }

  function clueText(puz, clue) {
    let { a, b } = clue;
    switch (clue.t) {
      case 'same':
        if (b.c === PC) [a, b] = [b, a];
        return `${cap(subj(puz, a))} ${pred(puz, b)}.`;
      case 'diff':
        if (b.c === PC) [a, b] = [b, a];
        if (a.c !== PC && (a.v + b.v + a.c) % 2 === 0) {
          return `${cap(subj(puz, a))} and ${subj(puz, b)} are different people.`;
        }
        return `${cap(subj(puz, a))} ${neg(puz, b)}.`;
      case 'next':
        return `${cap(subj(puz, a))} ${puz.cats[clue.o].next} ${subj(puz, b)}.`;
      case 'less':
        return `${cap(subj(puz, a))} ${puz.cats[clue.o].before} ${subj(puz, b)}.`;
      case 'or':
        return `${cap(subj(puz, a))} ${orPred(puz, clue.b, clue.alt)}.`;
      default:
        return '';
    }
  }

  function factText(puz, c, p, v, positive) {
    const ref = { c, v };
    return `${puz.names[p]} ${positive ? pred(puz, ref) : neg(puz, ref)}`;
  }

  function introText(puz) {
    const nouns = puz.cats.map((c) => c.noun);
    const list = nouns.length === 2 ? nouns.join(' and ') : `${nouns.slice(0, -1).join(', ')} and ${nouns[nouns.length - 1]}`;
    return `${puz.theme.setup.replace('{N}', N_WORD[puz.n])} Each had a different ${list}. Who had what?`;
  }

  const engine = {
    PC, LEVELS, space, compile, makeClue, generate, deductionRounds, deduceStep, rowsForKnowledge,
    maskOf, countSat, clueText, factText, introText, clueKey,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const HINT_AT = 60;
  const HINT_COST = 30;
  const CHECK_COST = 10;
  const SPEED_MAX = 50;
  const SPEED_SECS = 300;
  const CASES = LEVELS.length;
  const MARK = ['', '✗', '✓'];

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const speedBonus = (s) => Math.round(SPEED_MAX * Math.max(0, 1 - s / SPEED_SECS));

  BG.registerGame({
    id: 'logic',
    name: 'Who Did What?',
    emoji: '🧩',
    skill: 'Step-by-step deduction',
    category: 'brain',
    tagline: 'A handful of clues. One answer. Chain them together, Detective.',
    howTo: [
      'Read the clues, then tap squares in the grid: once for ✗ (ruled out), twice for ✓ (that\'s the match).',
      'Tap a clue to cross it off once you\'ve used it.',
      'Fill every ✓, then Check. The first check is free; each extra one costs 10.',
      'Hints unlock after 60s and cost 30. Two cases: a warm-up and the main mystery.',
    ],
    science:
      'Students who let GPT-4 do their maths practice scored 17% lower once it was taken away (Bastani et al., PNAS 2025). Keeping a reasoning skill means practising it yourself, and these puzzles make you hold several clues in mind and chain them: exactly the part we hand off to AI.',
    scienceUrl: 'https://www.pnas.org/doi/10.1073/pnas.2422633122',
    minutes: 6,
    maxScore: LEVELS.reduce((s, L) => s + L.base + SPEED_MAX, 0),

    mount(root, ctx) {
      const data = window.BG_DATA_LOGIC;
      const stats = { solved: 0, hints: 0, wrongChecks: 0, seconds: 0 };
      // Two different themes for the two cases.
      const themes = BG.shuffle(data.themes, ctx.rand).slice(0, CASES);

      let cIndex = 0;
      let puz = null;
      let sp = null;
      let tests = [];
      let marks = []; // marks[c][p][v] = 0 blank | 1 ✗ | 2 ✓
      let wrong = new Set(); // "c:p" flagged by the last check
      let struck = new Set();
      let hinted = []; // facts revealed by hints: {c, p, v, pos}
      let history = [];
      let tab = 0;
      let checks = 0;
      let hints = 0;
      let solved = false;
      let startAt = 0;
      let msgTimer = null;
      let glowTimer = null;
      let interval = null;
      let finished = false;
      let totalSecs = 0;

      root.innerHTML = '';
      const wrap = BG.el(`
        <div class="g-logic">
          <div class="g-logic-top">
            <span class="label g-logic-round"></span>
            <span class="chip chip--blue g-logic-clock" aria-label="Elapsed time">⏱ 0:00</span>
          </div>
          <div class="card g-logic-story">
            <p class="g-logic-title"></p>
            <p class="g-logic-intro"></p>
          </div>
          <div class="card g-logic-clues">
            <div class="g-logic-clues-head"><span class="label">Clues</span><span class="g-logic-clues-tip muted">tap to cross off</span></div>
            <ol class="g-logic-cluelist"></ol>
          </div>
          <div class="panel g-logic-board">
            <div class="g-logic-tabs" role="tablist" aria-label="Category"></div>
            <div class="g-logic-grid" role="grid"></div>
            <p class="g-logic-legend">Tap: <b>✗</b> rule out → <b>✓</b> match → clear</p>
            <div class="g-logic-stamp" aria-hidden="true">Case<br>closed</div>
          </div>
          <div class="g-logic-summary" aria-label="Your answers"></div>
          <p class="g-logic-msg" aria-live="polite"></p>
          <div class="g-logic-actions">
            <button class="btn btn--ghost btn--sm g-logic-undo">↶ Undo</button>
            <button class="btn btn--ghost btn--sm g-logic-hint" disabled></button>
            <button class="btn btn--primary btn--sm g-logic-check">Check ✔</button>
          </div>
          <div class="g-logic-done" hidden></div>
        </div>`);
      root.appendChild(wrap);

      const $ = (s) => wrap.querySelector(s);
      const roundEl = $('.g-logic-round');
      const clockEl = $('.g-logic-clock');
      const titleEl = $('.g-logic-title');
      const introEl = $('.g-logic-intro');
      const clueList = $('.g-logic-cluelist');
      const tabsEl = $('.g-logic-tabs');
      const gridEl = $('.g-logic-grid');
      const boardEl = $('.g-logic-board');
      const summaryEl = $('.g-logic-summary');
      const msgEl = $('.g-logic-msg');
      const actionsEl = $('.g-logic-actions');
      const undoBtn = $('.g-logic-undo');
      const hintBtn = $('.g-logic-hint');
      const checkBtn = $('.g-logic-check');
      const doneEl = $('.g-logic-done');

      // ---------- messages ----------
      function say(text, kind = '', sticky = false) {
        msgEl.textContent = text;
        msgEl.className = `g-logic-msg${kind ? ` g-logic-msg--${kind}` : ''}`;
        clearTimeout(msgTimer);
        if (!sticky && text) {
          msgTimer = setTimeout(() => {
            if (ctx.alive && msgEl.textContent === text) say('');
          }, 3200);
        }
      }

      const elapsed = () => (performance.now() - startAt) / 1000;

      // ---------- state helpers ----------
      const tick1 = (c, p) => marks[c][p].indexOf(2);
      const filledCount = () => {
        let f = 0;
        for (let c = 0; c < puz.k; c++) for (let p = 0; p < puz.n; p++) if (tick1(c, p) >= 0) f++;
        return f;
      };
      const snapshot = () => JSON.stringify(marks);
      function pushHistory() {
        history.push(snapshot());
        if (history.length > 200) history.shift();
      }

      // Place a ✓ and clear any other ✓ in the same row or column of that category.
      function placeTick(c, p, v) {
        for (let q = 0; q < puz.n; q++) if (q !== p && marks[c][q][v] === 2) marks[c][q][v] = 0;
        for (let w = 0; w < puz.n; w++) if (w !== v && marks[c][p][w] === 2) marks[c][p][w] = 0;
        marks[c][p][v] = 2;
      }

      // ---------- rendering ----------
      function renderClues() {
        clueList.innerHTML = '';
        puz.clues.forEach((cl, i) => {
          const li = BG.el(`<li><button class="g-logic-clue" data-i="${i}" aria-pressed="false"><span class="g-logic-clue-n">${i + 1}</span><span class="g-logic-clue-t"></span></button></li>`);
          li.querySelector('.g-logic-clue-t').textContent = clueText(puz, cl);
          clueList.appendChild(li);
        });
      }

      function renderTabs() {
        tabsEl.innerHTML = '';
        puz.cats.forEach((cat, c) => {
          let bad = 0;
          let filled = 0;
          for (let p = 0; p < puz.n; p++) {
            if (wrong.has(`${c}:${p}`)) bad++;
            if (tick1(c, p) >= 0) filled++;
          }
          const b = BG.el(`<button class="g-logic-tab${c === tab ? ' is-on' : ''}" role="tab" aria-selected="${c === tab}" data-tab="${c}">
              <span class="g-logic-tab-e" aria-hidden="true">${cat.emoji}</span>
              <span class="g-logic-tab-l"></span>
              <span class="g-logic-tab-n${filled === puz.n ? ' is-full' : ''}">${filled}/${puz.n}</span>
              ${bad ? `<span class="g-logic-tab-bad" aria-label="${bad} wrong">${bad}</span>` : ''}
            </button>`);
          b.querySelector('.g-logic-tab-l').textContent = cat.label;
          tabsEl.appendChild(b);
        });
      }

      function renderGrid() {
        const c = tab;
        const n = puz.n;
        gridEl.style.setProperty('--n', n);
        const rowTick = [];
        const colTick = [];
        for (let p = 0; p < n; p++) {
          const v = tick1(c, p);
          rowTick[p] = v;
          if (v >= 0) colTick[v] = p;
        }
        let html = '<div class="g-logic-corner" role="columnheader"></div>';
        puz.items[c].forEach((it) => {
          html += `<div class="g-logic-colh" role="columnheader">${BG.esc(it.s)}</div>`;
        });
        for (let p = 0; p < n; p++) {
          html += `<div class="g-logic-rowh" role="rowheader">${BG.esc(puz.names[p])}</div>`;
          for (let v = 0; v < n; v++) {
            const m = marks[c][p][v];
            const implied = m === 0 && ((rowTick[p] >= 0 && rowTick[p] !== v) || (colTick[v] != null && colTick[v] !== p));
            const cls = ['g-logic-cell'];
            if (m === 1) cls.push('is-x');
            if (m === 2) cls.push('is-tick');
            if (implied) cls.push('is-implied');
            if (m === 2 && wrong.has(`${c}:${p}`)) cls.push('is-wrong');
            if (solved) cls.push('is-locked');
            const state = m === 2 ? 'match' : m === 1 ? 'ruled out' : 'blank';
            html += `<button class="${cls.join(' ')}" role="gridcell" data-p="${p}" data-v="${v}" aria-label="${BG.esc(`${puz.names[p]}, ${puz.items[c][v].n}: ${state}`)}">${implied ? '·' : MARK[m]}</button>`;
          }
        }
        gridEl.innerHTML = html;
      }

      function renderSummary() {
        summaryEl.innerHTML = '';
        for (let p = 0; p < puz.n; p++) {
          const row = BG.el(`<div class="g-logic-sumrow"><span class="g-logic-sumname"></span><span class="g-logic-sumchips"></span></div>`);
          row.querySelector('.g-logic-sumname').textContent = puz.names[p];
          const chips = row.querySelector('.g-logic-sumchips');
          puz.cats.forEach((cat, c) => {
            const v = tick1(c, p);
            const bad = v >= 0 && wrong.has(`${c}:${p}`);
            const chip = BG.el(`<button class="g-logic-sumchip${v < 0 ? ' is-empty' : ''}${bad ? ' is-wrong' : ''}${solved ? ' is-solved' : ''}" data-tab="${c}"></button>`);
            chip.textContent = `${cat.emoji} ${v >= 0 ? puz.items[c][v].s : '?'}`;
            chip.setAttribute('aria-label', `${puz.names[p]}, ${cat.label}: ${v >= 0 ? puz.items[c][v].n : 'unknown'}`);
            chips.appendChild(chip);
          });
          summaryEl.appendChild(row);
        }
      }

      function renderButtons() {
        undoBtn.disabled = !history.length || solved;
        const f = filledCount();
        const need = puz.n * puz.k;
        checkBtn.textContent = f === need ? (checks ? `Check ✔ −${CHECK_COST}` : 'Check ✔') : `Check ${f}/${need}`;
        checkBtn.classList.toggle('is-ready', f === need);
      }

      function render() {
        renderTabs();
        renderGrid();
        renderSummary();
        renderButtons();
      }

      // ---------- flow ----------
      function startCase() {
        const t0 = performance.now();
        puz = generate(cIndex, ctx.rand, data, themes[cIndex]);
        sp = space(puz.n, puz.k);
        tests = puz.clues.map((cl) => compile(sp, cl));
        BG.track('logic_case', { case: cIndex + 1, clues: puz.clues.length, ms: Math.round(performance.now() - t0) });
        marks = puz.cats.map(() => Array.from({ length: puz.n }, () => new Array(puz.n).fill(0)));
        wrong = new Set();
        struck = new Set();
        hinted = [];
        history = [];
        tab = 0;
        checks = 0;
        hints = 0;
        solved = false;
        startAt = performance.now();
        ctx.setProgress(cIndex + 1, CASES);
        roundEl.textContent = cIndex === 0 ? `Case 1 of ${CASES} · warm-up` : `Case ${cIndex + 1} of ${CASES} · the main mystery`;
        titleEl.textContent = `${puz.theme.emoji} ${puz.theme.title}`;
        introEl.textContent = introText(puz);
        boardEl.classList.remove('is-solved');
        doneEl.hidden = true;
        doneEl.innerHTML = '';
        actionsEl.hidden = false;
        renderClues();
        render();
        BG.fx.pop(wrap.querySelector('.g-logic-story'));
        say(cIndex === 0 ? 'Start with the clue that rules out the most.' : 'Bigger case. Cross off clues as you use them.', '', true);
        tick();
        wrap.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }

      function tick() {
        if (!ctx.alive || !puz || solved) return;
        const s = elapsed();
        clockEl.textContent = `⏱ ${fmt(s)}`;
        if (s < HINT_AT) {
          hintBtn.disabled = true;
          hintBtn.textContent = `🔒 Hint ${Math.ceil(HINT_AT - s)}s`;
        } else {
          if (hintBtn.disabled) BG.fx.pop(hintBtn);
          hintBtn.disabled = false;
          hintBtn.textContent = `💡 Hint −${HINT_COST}`;
        }
      }

      function tapCell(btn) {
        if (solved) return;
        const p = Number(btn.dataset.p);
        const v = Number(btn.dataset.v);
        const c = tab;
        pushHistory();
        const m = (marks[c][p][v] + 1) % 3;
        if (m === 2) placeTick(c, p, v);
        else marks[c][p][v] = m;
        wrong.delete(`${c}:${p}`);
        BG.fx.sound(m === 2 ? 'pick' : 'tap');
        BG.fx.haptic(m === 2 ? 14 : 8);
        render();
        const el = gridEl.querySelector(`[data-p="${p}"][data-v="${v}"]`);
        if (el && m) BG.fx.pop(el);
        if (m === 2 && tick1(c, p) === v) {
          // Nudge to the next category once this one is complete.
          let full = true;
          for (let q = 0; q < puz.n; q++) if (tick1(c, q) < 0) full = false;
          if (full && filledCount() < puz.n * puz.k) say(`${puz.cats[c].label} done. Try another tab.`, '');
          else if (filledCount() === puz.n * puz.k) say('All filled in. Hit Check when you\'re sure.', 'good', true);
        }
      }

      function undo() {
        if (solved || !history.length) return;
        marks = JSON.parse(history.pop());
        BG.fx.sound('tap');
        render();
      }

      function toggleClue(btn) {
        const i = Number(btn.dataset.i);
        if (struck.has(i)) struck.delete(i);
        else struck.add(i);
        btn.classList.toggle('is-struck', struck.has(i));
        btn.setAttribute('aria-pressed', String(struck.has(i)));
        BG.fx.sound('tap');
        BG.fx.haptic(6);
      }

      function setTab(c) {
        if (c === tab || c < 0 || c >= puz.k) return;
        tab = c;
        BG.fx.sound('tap');
        render();
      }

      function check() {
        if (solved) return;
        const need = puz.n * puz.k;
        const f = filledCount();
        if (f < need) {
          BG.fx.shake(checkBtn);
          BG.fx.sound('bad');
          say(`Give everyone a ✓ in every tab first (${need - f} to go).`, 'bad');
          return;
        }
        checks++;
        if (checks > 1) ctx.addScore(-CHECK_COST, checkBtn);
        wrong = new Set();
        for (let c = 0; c < puz.k; c++) {
          for (let p = 0; p < puz.n; p++) if (tick1(c, p) !== puz.sol[c * puz.n + p]) wrong.add(`${c}:${p}`);
        }
        if (!wrong.size) {
          win();
          return;
        }
        stats.wrongChecks++;
        BG.fx.sound('bad');
        BG.fx.haptic(30);
        // Show a tab that has a mistake.
        if (![...wrong].some((w) => w.startsWith(`${tab}:`))) tab = Number([...wrong][0].split(':')[0]);
        render();
        gridEl.querySelectorAll('.is-wrong').forEach((el) => BG.fx.shake(el));
        summaryEl.querySelectorAll('.is-wrong').forEach((el) => BG.fx.shake(el));
        say(`${wrong.size} answer${wrong.size > 1 ? 's don\'t' : ' doesn\'t'} fit. Fix the red ones${checks === 1 ? ' (next check costs 10)' : ''}.`, 'bad', true);
      }

      // Knowledge for hints: facts revealed so far plus the player's correct ✓ marks.
      function knowledge() {
        const n = puz.n;
        const K = new Uint8Array(puz.k * n).fill((1 << n) - 1);
        for (let c = 0; c < puz.k; c++) {
          for (let p = 0; p < n; p++) {
            const v = tick1(c, p);
            if (v >= 0 && v === puz.sol[c * n + p]) K[c * n + p] = 1 << v;
          }
        }
        hinted.forEach((h) => {
          const j = h.c * n + h.p;
          if (h.pos) K[j] = 1 << h.v;
          else K[j] &= ~(1 << h.v);
        });
        return K;
      }

      function hint() {
        if (solved || elapsed() < HINT_AT) return;
        const n = puz.n;
        const K = knowledge();
        const step = deduceStep(sp, tests, K, 3);
        let fact = null;
        let text = '';
        if (step) {
          // Prefer a new ✓; otherwise a ✗ the player hasn't marked yet.
          const pos = [];
          const negs = [];
          for (let j = 0; j < step.m.length; j++) {
            if (step.m[j] === step.bm[j]) continue;
            const c = Math.floor(j / n);
            const p = j % n;
            const m = step.m[j];
            if ((m & (m - 1)) === 0) pos.push({ c, p, v: Math.log2(m), pos: true });
            for (let v = 0; v < n; v++) {
              if (step.bm[j] & ~m & (1 << v)) negs.push({ c, p, v, pos: false, marked: marks[c][p][v] === 1 });
            }
          }
          fact = pos.find((f) => tick1(f.c, f.p) !== f.v) || negs.find((f) => !f.marked) || pos[0] || negs[0];
          const nums = step.clues.map((i) => `Clue ${i + 1}`).join(' + ');
          text = `${nums} → ${factText(puz, fact.c, fact.p, fact.v, fact.pos)}.`;
          highlightClues(step.clues);
        }
        if (!fact) {
          // Fallback: reveal a match the player doesn't have yet.
          for (let c = 0; c < puz.k && !fact; c++) {
            for (let p = 0; p < n && !fact; p++) {
              const v = puz.sol[c * n + p];
              if (tick1(c, p) !== v) fact = { c, p, v, pos: true };
            }
          }
          if (!fact) return;
          text = `Case notes → ${factText(puz, fact.c, fact.p, fact.v, true)}.`;
        }
        hints++;
        stats.hints++;
        ctx.addScore(-HINT_COST, hintBtn);
        BG.fx.sound('pop');
        pushHistory();
        hinted.push(fact);
        if (fact.pos) placeTick(fact.c, fact.p, fact.v);
        else marks[fact.c][fact.p][fact.v] = 1;
        wrong.delete(`${fact.c}:${fact.p}`);
        tab = fact.c;
        render();
        const el = gridEl.querySelector(`[data-p="${fact.p}"][data-v="${fact.v}"]`);
        if (el) BG.fx.anim(el, 'g-logic-hinted');
        say(`💡 ${text}`, 'hint', true);
        BG.track('logic_hint', { case: cIndex + 1, t: Math.round(elapsed()) });
      }

      function highlightClues(idx) {
        clueList.querySelectorAll('.g-logic-clue').forEach((b) => b.classList.toggle('is-hint', idx.includes(Number(b.dataset.i))));
        clearTimeout(glowTimer);
        glowTimer = setTimeout(() => {
          if (ctx.alive) clueList.querySelectorAll('.is-hint').forEach((b) => b.classList.remove('is-hint'));
        }, 6000);
      }

      async function win() {
        solved = true;
        const t = elapsed();
        totalSecs += t;
        stats.solved++;
        const L = LEVELS[cIndex];
        wrong = new Set();
        render();
        clearTimeout(glowTimer);
        clueList.querySelectorAll('.is-hint').forEach((b) => b.classList.remove('is-hint'));
        boardEl.classList.add('is-solved');
        clockEl.textContent = `⏱ ${fmt(t)}`;
        hintBtn.disabled = true;
        BG.fx.sound('win');
        BG.fx.haptic(40);
        BG.fx.confetti();
        say(`Case closed in ${fmt(t)}! 🔎`, 'good', true);
        const speed = speedBonus(t);
        const lines = [['Solved', L.base, 'ok']];
        if (speed > 0) lines.push(['Speed', speed, 'blue']);

        await BG.sleep(900);
        if (!ctx.alive) return;
        actionsEl.hidden = true;
        doneEl.hidden = false;
        const last = cIndex === CASES - 1;
        const penalties = [];
        if (hints) penalties.push(`${hints} hint${hints > 1 ? 's' : ''} −${hints * HINT_COST}`);
        if (checks > 1) penalties.push(`extra checks −${(checks - 1) * CHECK_COST}`);
        doneEl.innerHTML = `
          <div class="card g-logic-card">
            <div class="g-logic-chips"></div>
            <p class="g-logic-note"></p>
            <button class="btn btn--primary btn--block g-logic-next">${last ? 'See results' : 'Next case →'}</button>
          </div>`;
        doneEl.querySelector('.g-logic-note').textContent = penalties.length
          ? `Already counted: ${penalties.join(', ')}.`
          : checks === 1 && !hints
            ? 'Solo solve, first check. Sharp. 🧠'
            : 'Solved without a single hint.';
        const chips = doneEl.querySelector('.g-logic-chips');
        for (const [label, pts, kind] of lines) {
          const chip = BG.el(`<span class="chip chip--${kind} g-logic-chip">${label} +${pts}</span>`);
          chips.appendChild(chip);
          BG.fx.pop(chip);
          ctx.addScore(pts, chip);
          await BG.sleep(380);
          if (!ctx.alive) return;
        }
        const next = doneEl.querySelector('.g-logic-next');
        next.addEventListener('click', advance);
        next.focus({ preventScroll: true });
        doneEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }

      function advance() {
        if (!ctx.alive || finished) return;
        BG.fx.sound('tap');
        if (cIndex < CASES - 1) {
          cIndex++;
          startCase();
          return;
        }
        finished = true;
        clearInterval(interval);
        stats.seconds = Math.round(totalSecs);
        const hintWord = stats.hints === 0 ? 'no hints' : `${stats.hints} hint${stats.hints > 1 ? 's' : ''}`;
        ctx.finish({
          summary: `Solved ${stats.solved}/${CASES} in ${fmt(totalSecs)}, ${hintWord} 🧩`,
          stats: { solved: stats.solved, seconds: stats.seconds, hints: stats.hints, wrongChecks: stats.wrongChecks },
        });
      }

      // ---------- events ----------
      gridEl.addEventListener('click', (e) => {
        const b = e.target.closest('.g-logic-cell');
        if (b) tapCell(b);
      });
      tabsEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (b) setTab(Number(b.dataset.tab));
      });
      summaryEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-tab]');
        if (b) setTab(Number(b.dataset.tab));
      });
      clueList.addEventListener('click', (e) => {
        const b = e.target.closest('.g-logic-clue');
        if (b) toggleClue(b);
      });
      undoBtn.addEventListener('click', undo);
      hintBtn.addEventListener('click', hint);
      checkBtn.addEventListener('click', check);

      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || !root.isConnected || !puz) return;
        if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
        if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          undo();
        } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= puz.k) {
          setTab(Number(e.key) - 1);
        }
      }
      document.addEventListener('keydown', onKey);

      interval = setInterval(tick, 250);
      ctx.onDestroy(() => {
        clearInterval(interval);
        clearTimeout(msgTimer);
        clearTimeout(glowTimer);
        document.removeEventListener('keydown', onKey);
      });

      startCase();
    },
  });
})();

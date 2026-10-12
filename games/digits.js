// Brain Gym game: "Make the Number" (id 'digits').
// Merge number tiles with + − × ÷ to hit the target. The hint stays locked for a while:
// the point is to keep struggling a little longer before reaching for help.
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure puzzle engine (no DOM). Exported for node tests at the bottom.
  // ---------------------------------------------------------------------------
  const LARGE = [25, 50, 75, 100];
  const MAX_VAL = 999;
  const OPS = ['+', '-', '*', '/'];
  const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  // P1 → P3 escalate in numbers, target size and minimum steps needed.
  const LEVELS = [
    { n: 4, large: 0, use: [4], min: 20, max: 99, minSteps: 2 },
    { n: 5, large: 0, use: [4, 5], min: 40, max: 399, minSteps: 3 },
    { n: 6, large: 2, use: [5, 6], min: 101, max: 999, minSteps: 3 },
  ];

  // a is the first tile, b the second. Returns result or an error reason.
  function apply(a, op, b) {
    if (op === '+') return { r: a + b };
    if (op === '*') return { r: a * b };
    if (op === '-') {
      if (a - b <= 0) return { err: a === b ? 'That makes zero' : 'No negatives, big number first' };
      return { r: a - b };
    }
    if (op === '/') {
      if (a % b !== 0) return { err: `${a} ÷ ${b} isn't a whole number` };
      return { r: a / b };
    }
    return { err: '?' };
  }

  // All useful results for a pair with a >= b (skips no-op ×1 / ÷1).
  function pairResults(a, b) {
    const out = [[a + b, '+']];
    if (a > b) out.push([a - b, '-']);
    if (b > 1) {
      out.push([a * b, '*']);
      if (a % b === 0) out.push([a / b, '/']);
    }
    return out;
  }

  function without(arr, i, j, r) {
    const next = [];
    for (let k = 0; k < arr.length; k++) if (k !== i && k !== j) next.push(arr[k]);
    next.push(r);
    return next.sort((x, y) => y - x);
  }

  // Can `target` be reached within `depth` merges?
  function reachWithin(arr, target, depth) {
    if (arr.includes(target)) return true;
    if (depth === 0 || arr.length < 2) return false;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = Math.max(arr[i], arr[j]);
        const b = Math.min(arr[i], arr[j]);
        for (const [r] of pairResults(a, b)) {
          if (reachWithin(without(arr, i, j, r), target, depth - 1)) return true;
        }
      }
    }
    return false;
  }

  // Iterative-deepening DFS with memo of dead states, so the first answer found uses
  // the fewest merges. Returns {steps: [{a, op, b, r}] | null, aborted, nodes}.
  // `aborted` is set if the node budget ran out (result unknown, not "unsolvable").
  function solve(values, target, maxNodes = 300000) {
    const dead = new Map(); // state -> deepest depth already proven dead
    let nodes = 0;
    const res = { steps: null, aborted: false, nodes: 0 };
    function rec(arr, depth) {
      if (arr.includes(target)) return [];
      if (arr.length < 2 || depth === 0) return null;
      const key = arr.join(',');
      if ((dead.get(key) || 0) >= depth) return null;
      if (++nodes > maxNodes) {
        res.aborted = true;
        return null;
      }
      for (let i = 0; i < arr.length; i++) {
        if (i > 0 && arr[i] === arr[i - 1]) continue; // skip duplicate first picks
        for (let j = i + 1; j < arr.length; j++) {
          if (j > i + 1 && arr[j] === arr[j - 1]) continue;
          const a = arr[i];
          const b = arr[j];
          for (const [r, op] of pairResults(a, b)) {
            if (r > 99999) continue;
            const sub = rec(without(arr, i, j, r), depth - 1);
            if (sub) return [{ a, op, b, r }].concat(sub);
            if (res.aborted) return null;
          }
        }
      }
      dead.set(key, depth);
      return null;
    }
    const start = values.slice().sort((x, y) => y - x);
    for (let d = 0; d < start.length && !res.steps && !res.aborted; d++) res.steps = rec(start, d);
    res.nodes = nodes;
    return res;
  }

  function pickNumbers(level, rand) {
    const nums = [];
    const count = {};
    const nLarge = level.large ? (rand() < 0.5 ? 1 : 2) : 0;
    const large = LARGE.slice();
    for (let k = 0; k < nLarge; k++) nums.push(large.splice(Math.floor(rand() * large.length), 1)[0]);
    while (nums.length < level.n) {
      const v = 1 + Math.floor(rand() * 10);
      const c = count[v] || 0;
      if (c >= (v === 1 ? 1 : 2)) continue;
      count[v] = c + 1;
      nums.push(v);
    }
    return nums;
  }

  // Build a random valid expression from k of the numbers.
  function build(nums, k, rand) {
    const pool = nums.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const work = pool.slice(0, k);
    const steps = [];
    while (work.length > 1) {
      const i = Math.floor(rand() * work.length);
      let j = Math.floor(rand() * (work.length - 1));
      if (j >= i) j++;
      const a = Math.max(work[i], work[j]);
      const b = Math.min(work[i], work[j]);
      const weights = { '+': 2, '-': 1, '*': 2.5, '/': 3 };
      const cands = pairResults(a, b).filter(([r]) => r > 0 && r <= MAX_VAL);
      if (!cands.length) return null;
      let total = 0;
      cands.forEach(([, op]) => (total += weights[op]));
      let x = rand() * total;
      let pick = cands[cands.length - 1];
      for (const c of cands) {
        x -= weights[c[1]];
        if (x < 0) {
          pick = c;
          break;
        }
      }
      const [r, op] = pick;
      [i, j].sort((p, q) => q - p).forEach((idx) => work.splice(idx, 1));
      work.push(r);
      steps.push({ a, op, b, r });
    }
    return { target: work[0], steps };
  }

  const FALLBACK = [
    { nums: [2, 3, 5, 7], target: 38 },
    { nums: [3, 4, 6, 8, 9], target: 213 },
    { nums: [75, 25, 3, 6, 7, 9], target: 863 },
  ];

  function generatePuzzle(levelIndex, rand) {
    const level = LEVELS[levelIndex];
    for (let attempt = 0; attempt < 400; attempt++) {
      const nums = pickNumbers(level, rand);
      const k = level.use[Math.floor(rand() * level.use.length)];
      const built = build(nums, k, rand);
      if (!built) continue;
      const t = built.target;
      if (t < level.min || t > level.max || nums.includes(t)) continue;
      const sorted = nums.slice().sort((x, y) => y - x);
      // Not trivially reachable: needs at least `minSteps` merges.
      if (reachWithin(sorted, t, level.minSteps - 1)) continue;
      const check = solve(nums, t, 200000);
      if (!check.steps && !check.aborted) continue; // never expected: built is a proof
      return { nums, target: t, solution: check.steps || built.steps, attempts: attempt + 1 };
    }
    const fb = FALLBACK[levelIndex];
    return { nums: fb.nums.slice(), target: fb.target, solution: solve(fb.nums, fb.target).steps, attempts: -1 };
  }

  const engine = { apply, solve, reachWithin, generatePuzzle, LEVELS, FALLBACK };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const HINT_AT = 45;
  const SKIP_AT = 120;
  const GRIT_AFTER = 45;
  const HINT_COST = 40;
  const PUZZLES = 3;

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const speedBonus = (s) => Math.round(40 * Math.max(0, 1 - s / 90));

  BG.registerGame({
    id: 'digits',
    name: 'Make the Number',
    emoji: '🔢',
    skill: 'Sticking with hard problems',
    tagline: 'No hints. Not yet. Your brain does the heavy lifting.',
    howTo: [
      'Tap a number, tap + − × ÷, tap another number: they merge.',
      'Make any tile equal the target. Whole numbers only, no negatives.',
      'The hint stays locked for 45s and costs 40 points.',
      'Solve it alone after a real struggle for a 💪 grit bonus.',
    ],
    science:
      'After about 10 minutes of AI help, people solved fewer problems on their own and gave up more often (Liu et al., 2026).',
    scienceUrl: 'https://arxiv.org/abs/2604.04721',
    minutes: 4,
    maxScore: 420,

    mount(root, ctx) {
      const stats = { solved: 0, hints: 0, grit: 0, skipped: 0 };
      let pIndex = 0;
      let puzzle = null;
      let tiles = []; // [{id, v, made}]
      let history = [];
      let steps = [];
      let selId = null;
      let op = null;
      let busy = false;
      let solved = false;
      let hintUsed = false;
      let startAt = 0;
      let lastNudge = -1;
      let msgTimer = null;
      let nextId = 1;
      let interval = null;

      root.innerHTML = '';
      const wrap = BG.el(`
        <div class="g-digits">
          <div class="g-digits-top">
            <span class="label g-digits-round"></span>
            <span class="chip chip--blue g-digits-clock" aria-label="Elapsed time">⏱ 0:00</span>
          </div>
          <div class="g-digits-targetbox">
            <span class="label">Make</span>
            <div class="g-digits-target big-num" aria-live="polite"></div>
          </div>
          <div class="panel g-digits-board">
            <div class="g-digits-tiles" role="group" aria-label="Number tiles"></div>
            <div class="g-digits-steps" aria-label="Your steps"></div>
          </div>
          <div class="g-digits-ops" role="group" aria-label="Operators">
            ${OPS.map((o) => `<button class="g-digits-op" data-op="${o}" aria-label="${{ '+': 'plus', '-': 'minus', '*': 'times', '/': 'divide' }[o]}">${SYM[o]}</button>`).join('')}
          </div>
          <p class="g-digits-msg" aria-live="polite"></p>
          <div class="g-digits-actions">
            <button class="btn btn--ghost btn--sm g-digits-undo" aria-label="Undo">↶ Undo</button>
            <button class="btn btn--ghost btn--sm g-digits-reset" aria-label="Reset">⟲ Reset</button>
            <button class="btn btn--ghost btn--sm g-digits-hint" disabled></button>
            <button class="btn btn--ghost btn--sm g-digits-skip" hidden>Skip ⏭</button>
          </div>
          <div class="g-digits-done" hidden></div>
        </div>`);
      root.appendChild(wrap);

      const $ = (s) => wrap.querySelector(s);
      const roundEl = $('.g-digits-round');
      const clockEl = $('.g-digits-clock');
      const targetEl = $('.g-digits-target');
      const tilesEl = $('.g-digits-tiles');
      const stepsEl = $('.g-digits-steps');
      const opsEl = $('.g-digits-ops');
      const msgEl = $('.g-digits-msg');
      const hintBtn = $('.g-digits-hint');
      const skipBtn = $('.g-digits-skip');
      const undoBtn = $('.g-digits-undo');
      const resetBtn = $('.g-digits-reset');
      const doneEl = $('.g-digits-done');
      const actionsEl = $('.g-digits-actions');
      const boardEl = $('.g-digits-board');

      // ---------- messages ----------
      function say(text, kind = '', sticky = false) {
        msgEl.textContent = text;
        msgEl.className = `g-digits-msg${kind ? ` g-digits-msg--${kind}` : ''}`;
        clearTimeout(msgTimer);
        if (!sticky && text) {
          msgTimer = setTimeout(() => {
            if (ctx.alive && msgEl.textContent === text) say(defaultMsg(), '', true);
          }, 2600);
        }
      }
      function defaultMsg() {
        if (hintUsed && puzzle.hintText) return puzzle.hintText;
        if (selId == null) return 'Tap a number to start.';
        if (!op) return 'Now pick + − × ÷';
        return 'Now tap a second number.';
      }

      // ---------- rendering with FLIP ----------
      function tileEl(t) {
        const digits = String(t.v).length;
        const el = BG.el(`<button class="g-digits-tile${t.made ? ' g-digits-tile--made' : ''} g-digits-tile--d${Math.min(digits, 4)}" data-id="${t.id}"></button>`);
        el.textContent = t.v;
        el.setAttribute('aria-label', `Number ${t.v}`);
        return el;
      }

      function render(bornIds = []) {
        const first = new Map();
        tilesEl.querySelectorAll('.g-digits-tile').forEach((el) => first.set(el.dataset.id, el.getBoundingClientRect()));
        const existing = new Map();
        tilesEl.querySelectorAll('.g-digits-tile').forEach((el) => existing.set(el.dataset.id, el));
        const frag = document.createDocumentFragment();
        tiles.forEach((t) => {
          const el = existing.get(String(t.id)) || tileEl(t);
          existing.delete(String(t.id));
          el.classList.toggle('is-selected', t.id === selId);
          el.classList.remove('is-hint');
          frag.appendChild(el);
        });
        existing.forEach((el) => el.remove());
        tilesEl.appendChild(frag);
        tilesEl.style.setProperty('--cols', tiles.length <= 4 ? tiles.length : 3);
        // FLIP the survivors, pop the newborns
        tilesEl.querySelectorAll('.g-digits-tile').forEach((el) => {
          const r0 = first.get(el.dataset.id);
          if (bornIds.includes(Number(el.dataset.id)) || !r0) {
            BG.fx.anim(el, 'g-digits-born');
            return;
          }
          const r1 = el.getBoundingClientRect();
          const dx = r0.left - r1.left;
          const dy = r0.top - r1.top;
          if (!dx && !dy) return;
          el.style.transition = 'none';
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          void el.offsetWidth;
          el.style.transition = '';
          el.style.transform = '';
        });
        stepsEl.innerHTML = steps
          .map((s) => `<span class="g-digits-step">${s.a} ${SYM[s.op]} ${s.b} = <b>${s.r}</b></span>`)
          .join('');
        undoBtn.disabled = !history.length || solved;
        resetBtn.disabled = !history.length || solved;
        renderOps();
      }

      function renderOps() {
        opsEl.querySelectorAll('.g-digits-op').forEach((b) => {
          b.classList.toggle('is-on', b.dataset.op === op);
          b.classList.remove('is-hint');
        });
        tilesEl.querySelectorAll('.g-digits-tile').forEach((el) => el.classList.toggle('is-selected', Number(el.dataset.id) === selId));
      }

      // ---------- puzzle flow ----------
      function startPuzzle() {
        puzzle = generatePuzzle(pIndex, ctx.rand);
        puzzle.hintText = '';
        tiles = puzzle.nums.map((v) => ({ id: nextId++, v, made: false }));
        history = [];
        steps = [];
        selId = null;
        op = null;
        solved = false;
        hintUsed = false;
        lastNudge = -1;
        busy = false;
        startAt = performance.now();
        ctx.setProgress(pIndex + 1, PUZZLES);
        roundEl.textContent = `Puzzle ${pIndex + 1} of ${PUZZLES} · ${puzzle.nums.length} numbers`;
        targetEl.textContent = puzzle.target;
        BG.fx.pop(targetEl);
        doneEl.hidden = true;
        doneEl.innerHTML = '';
        opsEl.hidden = false;
        actionsEl.hidden = false;
        boardEl.classList.remove('is-solved');
        skipBtn.hidden = true;
        tilesEl.innerHTML = '';
        render(tiles.map((t) => t.id));
        say(pIndex === 0 ? 'Tap a number, an operator, then another number.' : 'Fresh numbers. Same brain. Go.', '', true);
        tick();
      }

      const elapsed = () => (performance.now() - startAt) / 1000;

      function tick() {
        if (!ctx.alive || !puzzle || solved) return;
        const s = elapsed();
        clockEl.textContent = `⏱ ${fmt(s)}`;
        if (hintUsed) {
          hintBtn.disabled = true;
          hintBtn.textContent = '💡 Hint used';
        } else if (s < HINT_AT) {
          hintBtn.disabled = true;
          hintBtn.textContent = `🔒 Hint in ${Math.ceil(HINT_AT - s)}s`;
        } else {
          if (hintBtn.disabled) BG.fx.pop(hintBtn);
          hintBtn.disabled = false;
          hintBtn.textContent = `💡 Hint −${HINT_COST}`;
        }
        if (s >= SKIP_AT && skipBtn.hidden) {
          skipBtn.hidden = false;
          BG.fx.pop(skipBtn);
        }
        nudge(s);
      }

      // Encouraging lines while stuck. Each fires once per puzzle.
      const NUDGES = [
        [25, () => `Struggle = growth. Hint in ${Math.max(0, Math.ceil(HINT_AT - elapsed()))}s… or not 😉`],
        [HINT_AT + 1, () => 'Hint is open. Solve it without and the 💪 grit bonus is yours.'],
        [75, () => 'This is the part that builds the muscle. Try working backwards from the target.'],
        [100, () => 'Skip unlocks at 2:00. You are probably one idea away.'],
      ];
      function nudge(s) {
        for (let k = NUDGES.length - 1; k >= 0; k--) {
          if (s >= NUDGES[k][0]) {
            if (lastNudge < k) {
              lastNudge = k;
              if (!hintUsed) say(NUDGES[k][1](), 'nudge', true);
            }
            return;
          }
        }
      }

      function snapshot() {
        return { tiles: tiles.map((t) => ({ ...t })), steps: steps.slice() };
      }

      function selectTile(id, el) {
        if (busy || solved) return;
        BG.fx.sound('tap');
        BG.fx.haptic(8);
        if (selId == null) {
          selId = id;
          op = null;
          renderOps();
          say(defaultMsg(), '', true);
          return;
        }
        if (selId === id) {
          selId = null;
          op = null;
          renderOps();
          say(defaultMsg(), '', true);
          return;
        }
        if (!op) {
          selId = id; // switch selection
          renderOps();
          say(defaultMsg(), '', true);
          return;
        }
        merge(selId, op, id, el);
      }

      function chooseOp(o) {
        if (busy || solved) return;
        const btn = opsEl.querySelector(`[data-op="${o === '-' ? '-' : o}"]`);
        if (selId == null) {
          BG.fx.shake(btn);
          say('Pick a number first', 'bad');
          return;
        }
        BG.fx.sound('pick');
        BG.fx.haptic(8);
        op = op === o ? null : o;
        renderOps();
        if (op) BG.fx.pop(btn);
        say(defaultMsg(), '', true);
      }

      async function merge(aId, o, bId, bEl) {
        const A = tiles.find((t) => t.id === aId);
        const B = tiles.find((t) => t.id === bId);
        const aEl = tilesEl.querySelector(`[data-id="${aId}"]`);
        const res = apply(A.v, o, B.v);
        if (res.err) {
          BG.fx.sound('bad');
          BG.fx.haptic(30);
          BG.fx.shake(bEl);
          BG.fx.shake(aEl);
          say(res.err, 'bad');
          return;
        }
        busy = true;
        history.push(snapshot());
        // fly A into B
        const ra = aEl.getBoundingClientRect();
        const rb = bEl.getBoundingClientRect();
        aEl.classList.add('is-flying');
        aEl.style.transform = `translate(${rb.left - ra.left}px, ${rb.top - ra.top}px) scale(.6)`;
        aEl.style.opacity = '0';
        bEl.classList.add('is-catching');
        await BG.sleep(220);
        if (!ctx.alive) return;
        const made = { id: nextId++, v: res.r, made: true };
        const bi = tiles.indexOf(B);
        tiles[bi] = made;
        tiles = tiles.filter((t) => t !== A);
        steps.push({ a: A.v, op: o, b: B.v, r: res.r });
        selId = null;
        op = null;
        render([made.id]);
        BG.fx.sound('pop');
        BG.fx.haptic(14);
        busy = false;
        if (res.r === puzzle.target) {
          win(made.id);
        } else if (tiles.length === 1) {
          say('Dead end. Undo (⌫) or reset and try another route.', 'bad', true);
        } else {
          say(defaultMsg(), '', true);
          if (hintUsed && puzzle.hintText) say(puzzle.hintText, 'hint', true);
        }
      }

      function undo() {
        if (busy || solved || !history.length) return;
        const snap = history.pop();
        const before = new Set(tiles.map((t) => t.id));
        tiles = snap.tiles;
        steps = snap.steps;
        selId = null;
        op = null;
        BG.fx.sound('tap');
        render(tiles.filter((t) => !before.has(t.id)).map((t) => t.id));
        say(defaultMsg(), '', true);
      }

      function reset() {
        if (busy || solved || !history.length) return;
        const snap = history[0];
        history = [];
        const before = new Set(tiles.map((t) => t.id));
        tiles = snap.tiles;
        steps = [];
        selId = null;
        op = null;
        BG.fx.sound('tap');
        render(tiles.filter((t) => !before.has(t.id)).map((t) => t.id));
        say('Clean slate.', '', false);
      }

      function hint() {
        if (busy || solved || hintUsed || elapsed() < HINT_AT) return;
        hintUsed = true;
        stats.hints++;
        BG.fx.sound('pick');
        const cur = tiles.map((t) => t.v);
        const r = solve(cur, puzzle.target, 150000);
        let step;
        let fromStart = false;
        if (r.steps && r.steps.length) step = r.steps[0];
        else {
          step = puzzle.solution[0];
          fromStart = true;
        }
        const text = `💡 ${fromStart ? 'From the start (reset first): ' : 'First step: '}${step.a} ${SYM[step.op]} ${step.b} = ${step.r}`;
        puzzle.hintText = text;
        say(text, 'hint', true);
        if (!fromStart) {
          const ta = tiles.find((t) => t.v === step.a);
          const tb = tiles.find((t) => t.v === step.b && t !== ta);
          [ta, tb].forEach((t) => {
            const el = t && tilesEl.querySelector(`[data-id="${t.id}"]`);
            if (el) el.classList.add('is-hint');
          });
          const ob = opsEl.querySelector(`[data-op="${step.op}"]`);
          if (ob) ob.classList.add('is-hint');
        }
        tick();
        BG.track('digits_hint', { puzzle: pIndex + 1, t: Math.round(elapsed()) });
      }

      async function win(tileId) {
        solved = true;
        const t = elapsed();
        stats.solved++;
        const el = tilesEl.querySelector(`[data-id="${tileId}"]`);
        if (el) el.classList.add('is-win');
        boardEl.classList.add('is-solved');
        BG.fx.sound('win');
        BG.fx.haptic(40);
        const last = pIndex === PUZZLES - 1;
        if (last) BG.fx.confetti();
        say(`Solved in ${fmt(t)}!`, 'good', true);
        clockEl.textContent = `⏱ ${fmt(t)}`;
        undoBtn.disabled = true;
        resetBtn.disabled = true;

        const speed = speedBonus(t);
        const grit = !hintUsed && t > GRIT_AFTER;
        if (grit) stats.grit++;
        const lines = [['Solved', 100, 'ok']];
        if (speed > 0) lines.push(['Speed', speed, 'blue']);
        if (grit) lines.push(['💪 Grit', 25, 'gold']);
        if (hintUsed) lines.push(['Hint', -HINT_COST, 'warn']);

        await BG.sleep(450);
        if (!ctx.alive) return;
        opsEl.hidden = true;
        actionsEl.hidden = true;
        doneEl.hidden = false;
        doneEl.innerHTML = `
          <div class="card g-digits-card">
            <div class="g-digits-chips"></div>
            ${grit ? '<div class="g-digits-badge">💪 Grit bonus +25</div>' : ''}
            <p class="g-digits-note">${grit ? 'You stuck with it past the point most people reach for help.' : hintUsed ? 'Next time, give it ten more seconds before the hint.' : t <= 20 ? 'Lightning. 🔥' : 'Solo solve. Nice.'}</p>
            <button class="btn btn--primary btn--block g-digits-next">${last ? 'See results' : 'Next puzzle →'}</button>
          </div>`;
        const chips = doneEl.querySelector('.g-digits-chips');
        for (const [label, pts, kind] of lines) {
          const chip = BG.el(`<span class="chip chip--${kind} g-digits-chip">${label} ${pts > 0 ? '+' : '−'}${Math.abs(pts)}</span>`);
          chips.appendChild(chip);
          BG.fx.pop(chip);
          ctx.addScore(pts, chip);
          if (label.includes('Grit')) {
            const badge = doneEl.querySelector('.g-digits-badge');
            if (badge) badge.classList.add('is-in');
            BG.fx.sound('good');
          }
          await BG.sleep(380);
          if (!ctx.alive) return;
        }
        const next = doneEl.querySelector('.g-digits-next');
        next.addEventListener('click', advance);
        next.focus({ preventScroll: true });
      }

      function skip() {
        if (busy || solved || elapsed() < SKIP_AT) return;
        solved = true;
        stats.skipped++;
        BG.fx.sound('lose');
        const sol = puzzle.solution.map((s) => `${s.a} ${SYM[s.op]} ${s.b} = ${s.r}`).join(' → ');
        say('', '', true);
        opsEl.hidden = true;
        actionsEl.hidden = true;
        doneEl.hidden = false;
        doneEl.innerHTML = `
          <div class="card g-digits-card">
            <p class="label">One way to do it</p>
            <p class="g-digits-sol">${BG.esc(sol)}</p>
            <p class="g-digits-note">0 points this time. Two minutes of real effort still counts for your brain.</p>
            <button class="btn btn--primary btn--block g-digits-next">${pIndex === PUZZLES - 1 ? 'See results' : 'Next puzzle →'}</button>
          </div>`;
        const next = doneEl.querySelector('.g-digits-next');
        next.addEventListener('click', advance);
        next.focus({ preventScroll: true });
      }

      let finished = false;
      function advance() {
        if (!ctx.alive || finished) return;
        BG.fx.sound('tap');
        if (pIndex < PUZZLES - 1) {
          pIndex++;
          startPuzzle();
          return;
        }
        finished = true;
        clearInterval(interval);
        const hintWord = stats.hints === 0 ? 'zero hints 💪' : `${stats.hints} hint${stats.hints > 1 ? 's' : ''}`;
        ctx.finish({
          summary: `Solved ${stats.solved}/${PUZZLES}, ${hintWord}`,
          stats: { solved: stats.solved, hints: stats.hints, grit: stats.grit },
        });
      }

      // ---------- events ----------
      tilesEl.addEventListener('click', (e) => {
        const el = e.target.closest('.g-digits-tile');
        if (el) selectTile(Number(el.dataset.id), el);
      });
      opsEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-op]');
        if (b) chooseOp(b.dataset.op);
      });
      undoBtn.addEventListener('click', undo);
      resetBtn.addEventListener('click', reset);
      hintBtn.addEventListener('click', hint);
      skipBtn.addEventListener('click', skip);

      const KEYOPS = { '+': '+', '-': '-', '*': '*', x: '*', X: '*', '/': '/' };
      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (!root.isConnected) return;
        if (KEYOPS[e.key]) {
          e.preventDefault();
          chooseOp(KEYOPS[e.key]);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          undo();
        } else if (e.key === 'Escape') {
          selId = null;
          op = null;
          renderOps();
        }
      }
      document.addEventListener('keydown', onKey);

      interval = setInterval(tick, 250);
      ctx.onDestroy(() => {
        clearInterval(interval);
        clearTimeout(msgTimer);
        document.removeEventListener('keydown', onKey);
      });

      startPuzzle();
    },
  });
})();

// Brain Gym game: "Split the Bill" (id 'bill').
// Restaurant rush: receipts print out, you settle them in your head on a big number pad.
// Every problem is generated so the answer is an exact whole number (or a valid HH:MM time).
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure engine (no DOM). Exported for node tests at the bottom.
  // ---------------------------------------------------------------------------
  const ri = (a, b, rand) => a + Math.floor(rand() * (b - a + 1));
  const pk = (arr, rand) => arr[Math.floor(rand() * arr.length)];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // Random multiple of `step` in [lo, hi].
  const mult = (lo, hi, step, rand) => step * ri(Math.ceil(lo / step), Math.floor(hi / step), rand);
  // Smallest bill that makes pct% a whole number of rupees.
  const stepFor = (pct) => 100 / gcd(pct, 100);

  // Indian digit grouping: 1,23,456
  function group(n) {
    const s = String(Math.abs(n));
    if (s.length <= 3) return (n < 0 ? '-' : '') + s;
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    const parts = [];
    while (rest.length > 2) {
      parts.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) parts.unshift(rest);
    return (n < 0 ? '-' : '') + parts.join(',') + ',' + last3;
  }
  const rs = (n) => `₹${group(n)}`;
  const hhmm = (m) => {
    const x = ((m % 1440) + 1440) % 1440;
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  };
  const dur = (m) => (m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`);
  // Integer thousandths → decimal string without float noise: 1250 → "1.25"
  const dec = (milli) => {
    const i = Math.floor(milli / 1000);
    const f = milli % 1000;
    return f ? `${group(i)}.${String(f).padStart(3, '0').replace(/0+$/, '')}` : group(i);
  };

  const KINDS = ['split', 'tip', 'change', 'gst', 'fuel', 'time', 'convert', 'chain', 'pctof'];

  const TIPS = {
    split: '÷4 = halve twice. ÷5 = double, then ÷10. ÷6 = halve, then ÷3.',
    tip: '10% → move the decimal. 5% → half of that. 20% → double it. 15% = 10% + 5%.',
    change: 'Count up from the price: to the next ten, the next hundred, then the note.',
    gst: '18% = 20% − 2%. 12% = 10% + 2%. 5% = half of 10%. 28% = 30% − 2%.',
    fuel: 'Litres = km ÷ km/L. Then litres × price: 4 × ₹105 = 400 + 20.',
    time: 'Add hours, then minutes. 60+ min? Carry an hour. Past 24:00? Subtract 24.',
    convert: 'kilo = 1,000: km → m, kg → g, L → ml. Move the decimal 3 places.',
    chain: 'One step at a time. Say each new number in your head before the next.',
    pctof: 'Part ÷ whole × 100. Simplify first: 45/180 = 1/4 = 25%.',
  };

  const GEN = {
    split(L, rand) {
      const n = pk([[2, 4, 5], [3, 4, 5, 6], [3, 6, 7, 8], [6, 7, 8, 9, 12]][L], rand);
      const per = [mult(50, 500, 10, rand), mult(60, 600, 5, rand), ri(80, 800, rand), ri(120, 999, rand)][L];
      const total = per * n;
      return {
        key: `split:${total}:${n}`,
        title: pk(['🍕 Pizza night', '🍛 Biryani run', '🎳 Bowling', '🎂 Birthday dinner', '🍿 Movie night', '☕ Café hangout', '🍜 Noodle bar', '🚕 Shared cab'], rand),
        lines: [['Total', rs(total)], ['People', String(n)]],
        ask: `Split it ${n} ways. Each pays?`,
        pre: '₹',
        ans: per,
        p: { total, n },
      };
    },
    tip(L, rand) {
      const pct = pk([[10], [10, 20, 5], [5, 15, 20], [5, 15, 20, 25]][L], rand);
      const step = stepFor(pct);
      const bill = [mult(200, 1500, 10, rand), mult(200, 2500, step, rand), mult(400, 4000, step, rand), mult(800, 6000, step, rand)][L];
      const withTotal = L >= 2 && rand() < 0.5;
      const tip = (bill * pct) / 100;
      return {
        key: `tip:${bill}:${pct}:${withTotal ? 1 : 0}`,
        title: pk(['🍽️ Dinner for two', '🍔 Burger joint', '🥘 Thali house', '🍣 Sushi spot', '🥞 Brunch'], rand),
        lines: [['Bill', rs(bill)], ['Tip', `${pct}%`]],
        ask: withTotal ? `Add a ${pct}% tip. Total to pay?` : `Leave a ${pct}% tip. How much?`,
        pre: '₹',
        ans: withTotal ? bill + tip : tip,
        p: { bill, pct, withTotal },
      };
    },
    change(L, rand) {
      let note;
      let items;
      if (L === 0) {
        note = 500;
        items = [mult(60, 480, 10, rand)];
      } else if (L === 1) {
        note = pk([500, 1000], rand);
        items = [mult(note * 0.2, note - 15, 5, rand)];
      } else if (L === 2) {
        note = pk([1000, 2000], rand);
        items = [ri(note * 0.3, note - 11, rand)];
      } else {
        note = 2000;
        const a = ri(150, 900, rand);
        items = [a, ri(150, 1990 - a, rand)];
      }
      const names = ['Groceries', 'Snacks'];
      return {
        key: `change:${note}:${items.join('+')}`,
        title: pk(['🛒 Kirana store', '💊 Pharmacy', '📚 Bookshop', '🧺 Supermarket'], rand),
        lines: items.map((v, i) => [items.length > 1 ? names[i] : 'Total', rs(v)]).concat([['Paid with', rs(note)]]),
        ask: 'Your change?',
        pre: '₹',
        ans: note - items.reduce((s, v) => s + v, 0),
        p: { note, items },
      };
    },
    gst(L, rand) {
      const rate = pk([[18, 5], [5, 12, 18], [5, 12, 18, 28], [12, 18, 28]][L], rand);
      const step = stepFor(rate);
      const base = [mult(100, 1000, 100, rand), mult(100, 2000, step, rand), mult(200, 3000, step, rand), mult(500, 5000, step, rand)][L];
      const incl = L >= 2 && rand() < 0.5;
      const tax = (base * rate) / 100;
      return {
        key: `gst:${base}:${rate}:${incl ? 1 : 0}`,
        title: pk(['📱 Phone case', '🎧 Earphones', '👟 Sneakers', '🧴 Skincare', '🎮 Controller', '⌚ Watch strap'], rand),
        lines: [['Price', rs(base)], ['GST', `${rate}%`]],
        ask: incl ? `Price + ${rate}% GST. Total?` : `${rate}% GST on this. How much tax?`,
        pre: '₹',
        ans: incl ? base + tax : tax,
        p: { base, rate, incl },
      };
    },
    fuel(L, rand) {
      const kmpl = pk([[10, 20, 25], [12, 15, 16, 20], [12, 14, 15, 16, 18], [13, 14, 16, 17, 18, 22]][L], rand);
      const litres = [ri(2, 4, rand), ri(2, 6, rand), ri(3, 9, rand), ri(4, 10, rand)][L];
      const price = L === 0 ? 100 : L === 1 ? pk([95, 96, 98, 102, 104, 105], rand) : ri(94, 109, rand);
      const round = L === 3 && (kmpl * litres) % 2 === 0 && rand() < 0.5;
      const km = (kmpl * litres) / (round ? 2 : 1);
      return {
        key: `fuel:${km}:${kmpl}:${price}:${round ? 1 : 0}`,
        title: pk(['🚗 Road trip', '🛵 Scooter ride', '🚙 Weekend drive'], rand),
        lines: [['Distance', `${km} km${round ? ' each way' : ''}`], ['Mileage', `${kmpl} km/L`], ['Petrol', `${rs(price)}/L`]],
        ask: round ? 'Fuel cost there and back?' : 'Fuel cost for the trip?',
        pre: '₹',
        ans: litres * price,
        p: { km, kmpl, price, round },
      };
    },
    time(L, rand) {
      let dep;
      let d;
      if (L === 0) {
        dep = ri(5, 19, rand) * 60 + pk([0, 30], rand);
        d = ri(1, 3, rand) * 60 + pk([0, 30], rand);
      } else if (L === 1) {
        dep = ri(5, 21, rand) * 60 + 5 * ri(0, 11, rand);
        d = ri(1, 5, rand) * 60 + 5 * ri(1, 11, rand);
      } else {
        dep = ri(0, 23, rand) * 60 + 5 * ri(0, 11, rand);
        d = ri(2, L === 2 ? 9 : 13, rand) * 60 + 5 * ri(1, 11, rand);
      }
      const reverse = L === 3 && rand() < 0.5;
      if (reverse) {
        const end = ri(14, 23, rand) * 60 + 5 * ri(0, 11, rand);
        const run = ri(1, 3, rand) * 60 + 5 * ri(1, 11, rand);
        return {
          key: `timeR:${end}:${run}`,
          title: pk(['🎬 Movie night', '🏏 Cricket match', '🎤 Concert'], rand),
          lines: [['Runtime', dur(run)], ['Ends at', hhmm(end)]],
          ask: 'When did it start? (24-hour)',
          mode: 'time',
          tip: 'Count back: hours first, then minutes. Short on minutes? Borrow an hour.',
          ans: (end - run + 1440) % 1440,
          p: { end, run, reverse: true },
        };
      }
      return {
        key: `time:${dep}:${d}`,
        title: pk(['🚆 Train', '🚌 Overnight bus', '🚗 Long drive', '⛴️ Ferry'], rand),
        lines: [['Leaves', hhmm(dep)], ['Journey', dur(d)]],
        ask: 'Arrives at? (24-hour)',
        mode: 'time',
        ans: (dep + d) % 1440,
        p: { dep, d, reverse: false },
      };
    },
    convert(L, rand) {
      const [big, small, title] = pk([['km', 'm', '🏃 Morning run'], ['kg', 'g', '🥔 Veg market'], ['L', 'ml', '🥤 Juice stall']], rand);
      if (L === 3) {
        // mixed sum or difference, answer in the small unit
        const a = 100 * ri(12, 60, rand);
        const b = 10 * ri(5, 95, rand);
        const minus = rand() < 0.5;
        return {
          key: `convS:${big}:${a}:${b}:${minus ? 1 : 0}`,
          title,
          lines: [[minus ? 'Start with' : 'First', `${dec(a)} ${big}`], [minus ? 'Use up' : 'Plus', `${group(b)} ${small}`]],
          ask: `${minus ? 'Left over' : 'Altogether'}, in ${small}?`,
          suf: small,
          ans: minus ? a - b : a + b,
          p: { a, b, minus, up: false },
        };
      }
      const up = L >= 1 && rand() < 0.35; // small → big, whole answer
      if (up) {
        const v = ri(2, L === 1 ? 20 : 75, rand);
        return {
          key: `convU:${big}:${v}`,
          title,
          lines: [['Amount', `${group(v * 1000)} ${small}`]],
          ask: `How many ${big}?`,
          suf: big,
          ans: v,
          p: { milli: v * 1000, up: true },
        };
      }
      const milli = [100 * ri(11, 99, rand), 10 * ri(101, 999, rand), ri(101, 9999, rand)][L];
      return {
        key: `conv:${big}:${milli}`,
        title,
        lines: [['Amount', `${dec(milli)} ${big}`]],
        ask: `How many ${small}?`,
        suf: small,
        ans: milli,
        p: { milli, up: false },
      };
    },
    chain(L, rand) {
      const steps = L + 2;
      for (;;) {
        const start = [ri(6, 40, rand), ri(10, 60, rand), ri(12, 99, rand), ri(15, 150, rand)][L];
        const ops = [];
        let v = start;
        for (let i = 0; i < steps; i++) {
          const half = v % 2 === 0 && (v > 400 || rand() < 0.5);
          ops.push(half ? 'h' : 'd');
          v = half ? v / 2 : v * 2;
        }
        if (v === start || (L > 0 && (!ops.includes('h') || !ops.includes('d')))) continue;
        const [unit, title] = pk([['g', '🍪 Recipe scaling'], ['ml', '🍹 Party punch'], ['', '🧠 Double & half']], rand);
        return {
          key: `chain:${start}:${ops.join('')}`,
          title,
          lines: [['Start', `${group(start)}${unit ? ' ' + unit : ''}`], ['Then', ops.map((o) => (o === 'h' ? 'half' : 'double')).join(', ')]],
          ask: 'Where do you end up?',
          suf: unit,
          ans: v,
          p: { start, ops },
        };
      }
    },
    pctof(L, rand) {
      const pct = pk([[10, 25, 50], [5, 20, 25, 75, 10], [15, 40, 60, 75, 30], [12, 35, 45, 65, 80, 90]][L], rand);
      const whole = mult([20, 40, 60, 100][L], [400, 800, 1200, 2000][L], stepFor(pct), rand);
      const part = (whole * pct) / 100;
      const ctxs = [
        ['📝 Test score', [['Marks', `${group(part)} / ${group(whole)}`]], 'What percent did you score?'],
        ['🛍️ Sale tag', [['Was', rs(whole)], ['You save', rs(part)]], 'The discount is what %?'],
        ['📶 Data pack', [['Pack', `${group(whole)} MB`], ['Used', `${group(part)} MB`]], 'What percent is used?'],
      ];
      const [title, lines, ask] = pk(whole > 300 ? ctxs.slice(1) : ctxs, rand);
      return { key: `pctof:${part}:${whole}`, title, lines, ask, suf: '%', ans: pct, p: { part, whole } };
    },
  };

  function makeProblem(kind, L, rand) {
    const pr = GEN[kind](L, rand);
    pr.kind = kind;
    pr.level = L;
    pr.mode = pr.mode || 'num';
    pr.pre = pr.pre || '';
    pr.suf = pr.suf || '';
    pr.tip = pr.tip || TIPS[kind];
    pr.show = pr.mode === 'time' ? hhmm(pr.ans) : `${pr.pre}${group(pr.ans)}${pr.suf ? (pr.suf === '%' ? '%' : ' ' + pr.suf) : ''}`;
    return pr;
  }

  const LEVELS = 4;
  const PER_TIER = 30;

  // Four tiers of problems (one per difficulty level); no key repeats across the whole game.
  function generateGame(rand, perTier = PER_TIER) {
    const used = new Set();
    const tiers = [];
    for (let L = 0; L < LEVELS; L++) {
      const tier = [];
      let order = [];
      let last = null;
      while (tier.length < perTier) {
        if (!order.length) {
          order = shuffle(KINDS, rand);
          if (order[0] === last) order.push(order.shift());
        }
        const kind = order.shift();
        let pr = null;
        for (let t = 0; t < 60 && !pr; t++) {
          const cand = makeProblem(kind, L, rand);
          if (!used.has(cand.key)) pr = cand;
        }
        if (!pr) continue;
        used.add(pr.key);
        tier.push(pr);
        last = kind;
      }
      tiers.push(tier);
    }
    return tiers;
  }

  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Typed digits → value. Time mode: "940" or "0940" → minutes; null if not a real time.
  function parseAnswer(digits, mode) {
    if (!digits) return null;
    if (mode === 'time') {
      if (digits.length < 3) return null;
      const s = digits.padStart(4, '0');
      const h = Number(s.slice(0, 2));
      const m = Number(s.slice(2));
      if (h > 23 || m > 59) return null;
      return h * 60 + m;
    }
    return Number(digits);
  }

  const engine = { generateGame, makeProblem, parseAnswer, group, hhmm, dec, KINDS, LEVELS, TIPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const SECONDS = 60;
  const FIRST = 30;
  const RETRY = 15;
  const FAST = 10;
  const FAST_S = 5;
  const SKIP_COST = 3;
  const UP_EVERY = 3;

  BG.registerGame({
    id: 'bill',
    name: 'Split the Bill',
    emoji: '🧾',
    skill: 'Everyday mental maths',
    category: 'life',
    tagline: 'Receipts keep printing. 60 seconds. No calculator.',
    howTo: [
      'A receipt prints: split it, tip it, add GST, count change, time a train…',
      'Type the answer on the pad (or your keyboard) and hit ✓. Every answer is a whole number.',
      '+30 first try, +10 if under 5s. Miss? One retry for +15. Skip costs 3 seconds.',
      'Every 3 bills settled, the rush gets harder.',
    ],
    science:
      'In four studies, more numerate people drew more precise meaning from numbers and were less swayed by how the same numbers were framed, an effect not explained by general intelligence (Peters et al., Psychological Science 2006).',
    scienceUrl: 'https://doi.org/10.1111/j.1467-9280.2006.01720.x',
    minutes: 1,
    maxScore: 600,

    mount(root, ctx) {
      const tiers = generateGame(ctx.rand);
      const ptr = [0, 0, 0, 0];
      const log = []; // {title, res: 'ok'|'half'|'miss'|'skip', pts}
      let level = 0;
      let correct = 0;
      let streak = 0;
      let bestStreak = 0;
      let cur = null;
      let input = '';
      let tries = 0;
      let shownAt = 0;
      let state = 'idle'; // 'play' | 'reveal' | 'busy' | 'over'
      let lastKind = null;
      let billNo = 0;
      const timeouts = new Set();
      const later = (fn, ms) => {
        const t = setTimeout(() => {
          timeouts.delete(t);
          if (ctx.alive) fn();
        }, ms);
        timeouts.add(t);
        return t;
      };
      let revealTimer = null;
      let holdTip = false;

      root.innerHTML = '';
      const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
      const wrap = BG.el(`
        <div class="g-bill">
          <div class="g-bill-top">
            <span class="chip chip--blue g-bill-count">🧾 0 settled</span>
            <span class="chip g-bill-level">Level 1</span>
            <span class="chip chip--gold g-bill-combo" aria-live="polite">🔥 ×0</span>
          </div>
          <div class="g-bill-timer" aria-hidden="true">
            <div class="g-bill-track"><div class="g-bill-tbar"></div></div>
            <span class="g-bill-secs">${SECONDS}s</span>
          </div>
          <div class="g-bill-printer">
            <div class="g-bill-slot" aria-hidden="true"></div>
            <div class="g-bill-paper" aria-live="polite"></div>
          </div>
          <div class="g-bill-row">
            <div class="g-bill-display" role="status" aria-label="Your answer"></div>
            <button class="btn btn--ghost btn--sm g-bill-skip" aria-label="Skip, costs 3 seconds">Skip<small>−${SKIP_COST}s</small></button>
          </div>
          <p class="g-bill-tip" aria-live="polite"></p>
          <div class="g-bill-pad" role="group" aria-label="Number pad">
            ${KEYS.map((k) => `<button class="g-bill-key${k === 'ok' ? ' g-bill-key--ok' : k === 'del' ? ' g-bill-key--del' : ''}" data-k="${k}" aria-label="${k === 'ok' ? 'Submit' : k === 'del' ? 'Delete' : k}">${k === 'ok' ? '✓' : k === 'del' ? '⌫' : k}</button>`).join('')}
          </div>
          <div class="g-bill-end" hidden></div>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const countEl = $('.g-bill-count');
      const levelEl = $('.g-bill-level');
      const comboEl = $('.g-bill-combo');
      const tbar = $('.g-bill-tbar');
      const secsEl = $('.g-bill-secs');
      const paperEl = $('.g-bill-paper');
      const dispEl = $('.g-bill-display');
      const skipBtn = $('.g-bill-skip');
      const tipEl = $('.g-bill-tip');
      const padEl = $('.g-bill-pad');
      const okKey = padEl.querySelector('[data-k="ok"]');
      const endEl = $('.g-bill-end');
      ctx.setProgress(1, LEVELS);

      // ---------- timer (rebuilt on skip so the 3s penalty shows on the bar) ----------
      let deadline = performance.now() + SECONDS * 1000;
      let timer = null;
      let tGen = 0;
      function startBar() {
        const rem = Math.max(0.05, (deadline - performance.now()) / 1000);
        if (timer) {
          timer.stop();
          timer.el.remove();
        }
        tbar.style.width = `${(rem / SECONDS) * 100}%`;
        const gen = ++tGen;
        timer = BG.timerBar(tbar, rem, {
          onTick: (s) => {
            secsEl.textContent = `${s}s`;
            secsEl.classList.toggle('is-warn', s <= 5);
          },
        });
        timer.done.then(() => {
          if (ctx.alive && gen === tGen) endGame();
        });
      }
      const timeLeft = () => (deadline - performance.now()) / 1000;

      ctx.onDestroy(() => {
        tGen++;
        if (timer) timer.stop();
        timeouts.forEach(clearTimeout);
        timeouts.clear();
        document.removeEventListener('keydown', onKey);
      });

      // ---------- rendering ----------
      function receiptHTML(pr) {
        return `
          <div class="g-bill-rc">
            <div class="g-bill-rhead"><span>${BG.esc(pr.title)}</span><span class="g-bill-rno">#${String(billNo).padStart(3, '0')}</span></div>
            ${pr.lines.map(([k, v]) => `<div class="g-bill-rline"><span>${BG.esc(k)}</span><i aria-hidden="true"></i><b>${BG.esc(v)}</b></div>`).join('')}
            <div class="g-bill-rask">${BG.esc(pr.ask)}</div>
            <div class="g-bill-stamp" aria-hidden="true"></div>
          </div>`;
      }

      function renderInput() {
        if (!cur) return;
        let val;
        if (cur.mode === 'time') {
          const d = input.padEnd(4, '–');
          val = `<span class="g-bill-val${input ? '' : ' is-empty'}">${d.slice(0, 2)}:${d.slice(2)}</span>`;
        } else {
          val = `<span class="g-bill-val${input ? '' : ' is-empty'}">${input ? group(Number(input)) : '?'}</span>`;
        }
        const suf = cur.suf ? `<span class="g-bill-unit">${BG.esc(cur.suf)}</span>` : '';
        const pre = cur.pre ? `<span class="g-bill-unit">${BG.esc(cur.pre)}</span>` : '';
        const retry = tries === 1 ? `<span class="g-bill-retry">Retry · +${RETRY}</span>` : '';
        dispEl.innerHTML = retry + pre + val + suf;
        dispEl.classList.toggle('is-time', cur.mode === 'time');
      }

      function setTip(text, kind = '') {
        tipEl.textContent = text;
        tipEl.className = `g-bill-tip${kind ? ` g-bill-tip--${kind}` : ''}`;
      }

      function draw() {
        const tier = tiers[level];
        let i = ptr[level];
        if (i >= tier.length) return null;
        // Avoid the same kind twice in a row (e.g. across a level change).
        for (let j = i; j < Math.min(tier.length, i + 4); j++) {
          if (tier[j].kind !== lastKind) {
            [tier[i], tier[j]] = [tier[j], tier[i]];
            break;
          }
        }
        ptr[level] = i + 1;
        return tier[i];
      }

      function next() {
        if (!ctx.alive || state === 'over') return;
        clearTimeout(revealTimer);
        if (timeLeft() <= 0) {
          endGame();
          return;
        }
        cur = draw();
        if (!cur) {
          endGame();
          return;
        }
        lastKind = cur.kind;
        billNo++;
        input = '';
        tries = 0;
        okKey.textContent = '✓';
        okKey.setAttribute('aria-label', 'Submit');
        paperEl.innerHTML = receiptHTML(cur);
        const rc = paperEl.firstElementChild;
        BG.fx.anim(rc, 'g-bill-print');
        BG.fx.sound('tick');
        later(() => BG.fx.sound('tick'), 90);
        later(() => BG.fx.sound('tick'), 180);
        renderInput();
        if (billNo === 1) setTip('Type the answer, then ✓. Keyboard works too.');
        else if (holdTip) holdTip = false;
        else setTip('');
        shownAt = performance.now();
        state = 'play';
      }

      function press(k) {
        if (state === 'reveal' && k === 'ok') {
          next();
          return;
        }
        if (state !== 'play') return;
        const btn = padEl.querySelector(`[data-k="${k}"]`);
        if (btn) BG.fx.anim(btn, 'g-bill-hit');
        if (k === 'ok') {
          submit();
          return;
        }
        BG.fx.sound('tap');
        BG.fx.haptic(6);
        if (k === 'del') input = input.slice(0, -1);
        else {
          const max = cur.mode === 'time' ? 4 : 6;
          if (input.length >= max) {
            BG.fx.shake(dispEl);
            return;
          }
          if (input === '' && k === '0' && cur.mode !== 'time') return; // no leading zeros
          input += k;
        }
        renderInput();
      }

      function updateChips() {
        countEl.textContent = `🧾 ${correct} settled`;
        comboEl.textContent = `🔥 ×${streak}`;
        comboEl.classList.toggle('is-hot', streak >= 3);
        levelEl.textContent = `Level ${level + 1}`;
      }

      function submit() {
        const v = parseAnswer(input, cur.mode);
        if (v == null) {
          BG.fx.shake(dispEl);
          BG.fx.sound('bad');
          setTip(cur.mode === 'time' ? 'Type a real time, like 0940 for 09:40.' : 'Type a number first.', 'bad');
          return;
        }
        const t = (performance.now() - shownAt) / 1000;
        const rc = paperEl.firstElementChild;
        if (v === cur.ans) {
          state = 'busy';
          const first = tries === 0;
          const fast = first && t < FAST_S;
          const pts = (first ? FIRST : RETRY) + (fast ? FAST : 0);
          correct++;
          streak++;
          bestStreak = Math.max(bestStreak, streak);
          log.push({ title: cur.title, res: first ? 'ok' : 'half', pts });
          ctx.addScore(pts, dispEl);
          BG.fx.sound('good');
          BG.fx.haptic(14);
          dispEl.classList.add('is-good');
          const stamp = rc.querySelector('.g-bill-stamp');
          stamp.textContent = first ? 'PAID ✓' : 'PAID ½';
          stamp.classList.add('is-on');
          setTip(fast ? '⚡ Lightning fast! +10' : streak >= 3 ? `🔥 ${streak} in a row!` : '', 'good');
          const newLevel = Math.min(LEVELS - 1, Math.floor(correct / UP_EVERY));
          if (newLevel > level) {
            level = newLevel;
            ctx.setProgress(level + 1, LEVELS);
            BG.fx.pop(levelEl);
            BG.fx.toast(level === LEVELS - 1 ? '🔥 Peak rush hour! Max difficulty.' : `🍽️ Rush hour! Level ${level + 1}`);
            later(() => BG.fx.sound('pop'), 200);
          }
          updateChips();
          if (streak >= 2) BG.fx.pop(comboEl);
          later(() => {
            rc.classList.add('g-bill-tear');
            dispEl.classList.remove('is-good');
          }, 380);
          later(next, 640);
          return;
        }
        // wrong
        tries++;
        streak = 0;
        updateChips();
        BG.fx.sound('bad');
        BG.fx.haptic(30);
        BG.fx.shake(dispEl);
        BG.fx.shake(rc);
        if (tries === 1) {
          input = '';
          renderInput();
          setTip(`💡 ${cur.tip}`, 'hint');
          return;
        }
        state = 'reveal';
        log.push({ title: cur.title, res: 'miss', pts: 0 });
        dispEl.innerHTML = `<span class="g-bill-val g-bill-val--ans">${BG.esc(cur.show)}</span>`;
        dispEl.classList.add('is-bad');
        setTip(`💡 ${cur.tip}`, 'hint');
        okKey.textContent = '→';
        okKey.setAttribute('aria-label', 'Next bill');
        revealTimer = later(() => {
          dispEl.classList.remove('is-bad');
          if (state === 'reveal') next();
        }, 2600);
        later(() => dispEl.classList.remove('is-bad'), 2500);
      }

      function skip() {
        if (state !== 'play') return;
        state = 'busy';
        streak = 0;
        log.push({ title: cur.title, res: 'skip', pts: 0 });
        updateChips();
        BG.fx.sound('pop');
        BG.fx.float(secsEl, `−${SKIP_COST}s`, 'bad');
        deadline -= SKIP_COST * 1000;
        if (timeLeft() <= 0) {
          endGame();
          return;
        }
        startBar();
        const rc = paperEl.firstElementChild;
        if (rc) rc.classList.add('g-bill-tear');
        setTip(`Skipped. It was ${cur.show}.`);
        holdTip = true;
        later(next, 280);
      }

      // ---------- end ----------
      async function endGame() {
        if (state === 'over') return;
        state = 'over';
        tGen++;
        if (timer) timer.stop();
        clearTimeout(revealTimer);
        const answered = log.filter((l) => l.res !== 'skip').length;
        const pct = answered ? Math.round((correct / answered) * 100) : 0;
        const best = ctx.store.get('best', 0);
        if (correct > best) ctx.store.set('best', correct);
        ctx.setProgress(LEVELS + 1, LEVELS);
        ['.g-bill-top', '.g-bill-timer', '.g-bill-printer', '.g-bill-row', '.g-bill-pad'].forEach((s) => ($(s).hidden = true));
        setTip('');
        tipEl.hidden = true;
        endEl.hidden = false;
        const mark = { ok: '✓', half: '½', miss: '✗', skip: '⏭' };
        endEl.innerHTML = `
          <div class="g-bill-rc g-bill-final g-bill-print">
            <div class="g-bill-fhead">🧾 SHIFT OVER<br><span>Brain Gym Café · 60s rush</span></div>
            <div class="g-bill-flines" role="list"></div>
            <div class="g-bill-ftot" hidden>
              <div><span>Bills settled</span><b>${correct}</b></div>
              <div><span>Accuracy</span><b>${pct}%</b></div>
              <div><span>Best streak</span><b>${bestStreak}</b></div>
              <div><span>Personal best</span><b>${Math.max(best, correct)}${correct > best && correct > 0 ? ' 🏆' : ''}</b></div>
            </div>
          </div>
          <button class="btn btn--primary btn--block g-bill-fin" hidden>See results</button>`;
        const linesEl = endEl.querySelector('.g-bill-flines');
        BG.fx.sound('win');
        if (!log.length) linesEl.innerHTML = '<div class="g-bill-fline"><span></span><span>No bills settled. The rush won this time.</span><b></b></div>';
        for (const l of log) {
          const row = BG.el(`<div class="g-bill-fline is-${l.res}" role="listitem"><span>${mark[l.res]}</span><span class="g-bill-fname"></span><b>${l.pts ? `+${l.pts}` : '—'}</b></div>`);
          row.querySelector('.g-bill-fname').textContent = l.title;
          linesEl.appendChild(row);
          BG.fx.sound('tick');
          await BG.sleep(110);
          if (!ctx.alive) return;
        }
        const tot = endEl.querySelector('.g-bill-ftot');
        tot.hidden = false;
        BG.fx.pop(tot);
        if (correct >= 8 && pct >= 85) BG.fx.confetti();
        BG.fx.sound(pct >= 70 ? 'good' : 'pop');
        const fin = endEl.querySelector('.g-bill-fin');
        fin.hidden = false;
        fin.addEventListener('click', () => finish(pct, answered), { once: true });
        fin.focus({ preventScroll: true });
      }

      let finished = false;
      function finish(pct, answered) {
        if (!ctx.alive || finished) return;
        finished = true;
        ctx.finish({
          summary: correct ? `Settled ${correct} bill${correct === 1 ? '' : 's'} in 60s, ${pct}% right 🧾` : 'The rush won this round 🧾 Try again!',
          stats: { settled: correct, answered, accuracy: pct, bestStreak, skipped: log.filter((l) => l.res === 'skip').length, level: level + 1 },
        });
      }

      // ---------- events ----------
      padEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-k]');
        if (b) press(b.dataset.k);
      });
      skipBtn.addEventListener('click', skip);

      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || !root.isConnected || state === 'over') return;
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === 'Backspace') press('del');
        else if (e.key === 'Enter') press('ok');
        else if (e.key === 's' || e.key === 'S') skip();
        else return;
        e.preventDefault();
      }
      document.addEventListener('keydown', onKey);

      startBar();
      next();
    },
  });
})();

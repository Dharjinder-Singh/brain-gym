// Brain Gym game: "1000 People" (id 'odds').
// Everyday risk puzzles. Make a gut guess, then watch a town of 1000 split into a
// frequency tree and see the real answer counted out in whole people.
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure scenario engine (no DOM). Exposed as def.makeRounds for node tests.
  // All counts are whole numbers out of 1000; the answer is computed from them.
  // ---------------------------------------------------------------------------
  const TOWN = 1000;
  const BASES = [1, 2, 5, 10, 20]; // % of the town who "have it"
  const PRIORS = [20, 25, 30, 40, 50]; // % for the "already likely" twist
  const SENS = [70, 75, 80, 85, 90, 95, 98, 99];
  const FPRS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

  // The one rounding rule used everywhere: whole percent, halves round up.
  const pct = (yes, all) => Math.round((100 * yes) / all);
  const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  const exact = (a, p) => (a * p) % 100 === 0; // a × p% is a whole number

  // Every (base, sensitivity, false-positive) combo whose counts are whole people.
  function combos(bases, twice) {
    const out = [];
    bases.forEach((b) => {
      const S = (TOWN * b) / 100;
      const H = TOWN - S;
      SENS.forEach((s) => {
        if (!exact(S, s)) return;
        const TP = (S * s) / 100;
        FPRS.forEach((f) => {
          if (!exact(H, f)) return;
          const FP = (H * f) / 100;
          if (TP < 1 || FP < 1) return;
          const c = { b, s, f, S, H, TP, FN: S - TP, FP, TN: H - FP, truth: pct(TP, TP + FP) };
          if (twice) {
            if (!exact(TP, s) || !exact(FP, f)) return;
            c.TP2 = (TP * s) / 100;
            c.FP2 = (FP * f) / 100;
            if (c.TP2 < 1 || c.FP2 < 1) return;
            c.single = c.truth;
            c.truth = pct(c.TP2, c.TP2 + c.FP2);
          }
          out.push(c);
        });
      });
    });
    return out;
  }
  const POOL = {
    counts: combos([1, 2, 5, 10], false).filter((c) => c.truth >= 5 && c.truth <= 80),
    rate: combos(BASES, false).filter((c) => c.truth >= 3 && c.truth <= 60),
    twice: combos(BASES, true).filter((c) => c.truth >= 10 && c.truth <= 97),
    prior: combos(PRIORS, false).filter((c) => c.truth >= 40 && c.truth <= 97),
  };

  function makeRel(data, rand) {
    const story = BG.pick(data.rel, rand);
    const effects = data.effects.filter((e) => e.dir === story.dir);
    const eff = BG.pick(effects, rand);
    const bs = [];
    for (let b = 2; b <= 30; b++) {
      if ((b * eff.num) % eff.den !== 0) continue;
      const d = (b * eff.num) / eff.den;
      if (d >= 1 && d <= 60) bs.push(b);
    }
    const b = BG.pick(bs, rand);
    const d = (b * eff.num) / eff.den;
    const after = b + story.dir * d;
    return {
      kind: 'rel', story, eff, b, d, after, truth: d, unit: 'people',
      text: fill(story.text, { verb: eff.verb, b }),
      ask: story.q,
    };
  }

  function makeTest(kind, story, c, name) {
    const v = Object.assign({ name }, c);
    let text;
    if (kind === 'counts') text = `${fill(story.cnt, v)} ${fill(story.hit, v)}`;
    else if (kind === 'prior') text = `${fill(story.prior, v)} ${fill(story.hit, v)}`;
    else if (kind === 'twice') text = `${fill(story.pct, v)} ${fill(story.twice, v)}`;
    else text = `${fill(story.pct, v)} ${fill(story.hit, v)}`;
    const posAll = kind === 'twice' ? c.TP2 + c.FP2 : c.TP + c.FP;
    const tp = kind === 'twice' ? c.TP2 : c.TP;
    return { kind, story, c, name, text, ask: fill(story.q, v), truth: pct(tp, posAll), tp, fp: posAll - tp, unit: '%' };
  }

  // Four rounds: counts given → percentages → relative risk → a twist.
  function makeRounds(data, rand) {
    const stories = BG.shuffle(data.stories, rand);
    const names = BG.shuffle(data.names, rand);
    const r4 = rand() < 0.5 ? 'twice' : 'prior';
    return [
      makeTest('counts', stories[0], BG.pick(POOL.counts, rand), names[0]),
      makeTest('rate', stories[1], BG.pick(POOL.rate, rand), names[1]),
      makeRel(data, rand),
      makeTest(r4, stories[2], BG.pick(POOL[r4], rand), names[2]),
    ];
  }

  const KIND_LABEL = { counts: 'Warm-up: counted for you', rate: 'Base-rate trap', rel: 'Headline maths', twice: 'Plot twist: test again', prior: 'Plot twist: likely already' };
  const MAX_PER_ROUND = 140;
  const closeness = (g, t) => Math.max(0, 100 - 2 * Math.abs(g - t));

  function takeaway(r) {
    if (r.kind === 'rel') {
      const v = r.eff.verb.charAt(0).toUpperCase() + r.eff.verb.slice(1);
      return `"${v} your risk" sounds huge. Out of 1000 people it's ${r.d}: from ${r.b} to ${r.after}. Always ask: out of how many?`;
    }
    if (r.kind === 'twice') {
      return `A second independent positive moved the odds from ${r.c.single}% to ${r.truth}%. One flag is a hint; two is evidence.`;
    }
    if (r.kind === 'prior') {
      return `Same kind of test, very different answer: when it was likely to begin with, a positive means a lot more. Starting odds matter as much as the test.`;
    }
    if (r.kind === 'counts') {
      return r.truth < 50
        ? 'Counted out, it\'s easy: most positives came from the huge crowd who didn\'t have it.'
        : 'With whole people the maths is easy: true positives ÷ all positives.';
    }
    return r.truth < 50
      ? 'A positive test for something rare is usually a false alarm.'
      : 'When the thing is common enough, a positive test is far more trustworthy.';
  }

  // ---------------------------------------------------------------------------
  // Town canvas: 40 × 25 tiny icons, states animate with a staggered pop.
  // ---------------------------------------------------------------------------
  const COLS = 40;
  const ROWS = 25;
  const STYLE = {
    base: ['ink3', 0.42],
    dim: ['ink3', 0.13],
    bad: ['bad', 1],
    badDim: ['bad', 0.28],
    warn: ['warn', 1],
    warnDim: ['warn', 0.28],
    ok: ['ok', 1],
  };

  function makeTown(canvas, onCleanup) {
    const dots = Array.from({ length: TOWN }, () => ({ s: 'base', p: 'base', t: 0 }));
    const g = canvas.getContext('2d');
    let colors = {};
    let cell = 8;
    let raf = 0;
    let animEnd = 0;
    let icon = 'person';
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    function readColors() {
      const cs = getComputedStyle(canvas);
      const v = (n) => cs.getPropertyValue(n).trim() || '#888';
      colors = { ink3: v('--ink-3'), bad: v('--bad'), warn: v('--warn'), ok: v('--ok') };
    }
    function resize() {
      const w = canvas.parentElement.clientWidth;
      if (!w) return;
      cell = w / COLS;
      const h = cell * ROWS;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function shape(cx, cy, k) {
      const c = cell * k;
      if (icon === 'person') {
        g.beginPath();
        g.arc(cx, cy - c * 0.17, c * 0.16, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(cx, cy + c * 0.36, c * 0.28, c * 0.3, 0, Math.PI, 0);
        g.fill();
      } else {
        const s = c * 0.62;
        g.fillRect(cx - s / 2, cy - s / 2, s, s);
      }
    }
    function draw() {
      raf = 0;
      const now = performance.now();
      g.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < TOWN; i++) {
        const d = dots[i];
        const live = now >= d.t;
        const st = STYLE[live ? d.s : d.p] || STYLE.base;
        let k = 1;
        if (live && now - d.t < 260 && d.s !== d.p) k = 1 + 0.75 * Math.sin((Math.PI * (now - d.t)) / 260);
        g.globalAlpha = st[1];
        g.fillStyle = colors[st[0]];
        shape((i % COLS + 0.5) * cell, (Math.floor(i / COLS) + 0.5) * cell, k);
      }
      g.globalAlpha = 1;
      if (now < animEnd) raf = requestAnimationFrame(draw);
    }
    function kick() {
      if (!raf) raf = requestAnimationFrame(draw);
    }

    readColors();
    const ro = window.ResizeObserver ? new ResizeObserver(() => resize()) : null;
    if (ro) ro.observe(canvas.parentElement);
    const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
    const onTheme = () => {
      readColors();
      draw();
    };
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);
    const mo = window.MutationObserver ? new MutationObserver(onTheme) : null;
    if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    onCleanup(() => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (mo) mo.disconnect();
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
    });
    resize();

    return {
      setIcon(v) {
        icon = v;
        draw();
      },
      // Set each index in `ids` to `state`, popping in over `spread` ms.
      set(ids, state, spread = 700, instant = false) {
        const now = performance.now();
        const n = ids.length;
        const span = instant || reduce ? 0 : spread;
        ids.forEach((id, j) => {
          const d = dots[id];
          d.p = now >= d.t ? d.s : d.p;
          d.s = state;
          d.t = now + (n > 1 ? (span * j) / (n - 1) : 0);
        });
        animEnd = Math.max(animEnd, now + span + 300);
        kick();
      },
      reset(state = 'base') {
        dots.forEach((d) => {
          d.s = state;
          d.p = state;
          d.t = 0;
        });
        animEnd = 0;
        draw();
      },
      finishNow() {
        dots.forEach((d) => {
          d.p = d.s;
          d.t = 0;
        });
        animEnd = 0;
        draw();
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Tree diagram (HTML). Nodes reveal by step.
  // ---------------------------------------------------------------------------
  function treeHTML(node) {
    const kids = node.kids && node.kids.length
      ? `<div class="od-kids od-kids--${node.kids.length}">${node.kids.map((k) => `<div class="od-branch">${treeHTML(k)}</div>`).join('')}</div>`
      : '';
    return `<div class="od-tn od-tn--${node.kind || 'plain'}${node.hl ? ' od-tn--hl' : ''}" data-step="${node.step}">
        <span class="od-tn-n">${node.n}</span><span class="od-tn-l">${BG.esc(node.label)}</span>
      </div>${kids}`;
  }

  function buildPlan(r) {
    if (r.kind === 'rel') {
      return {
        tree: {
          n: TOWN, label: 'people', step: 0,
          kids: [
            { n: r.b, label: r.story.dir < 0 ? 'without it' : 'normally', kind: 'bad', step: 1 },
            { n: r.after, label: r.story.dir < 0 ? 'with it' : 'with it', kind: r.story.dir < 0 ? 'ok' : 'warn', step: 2, hl: true },
          ],
        },
      };
    }
    const st = r.story;
    const c = r.c;
    const tpNode = { n: c.TP, label: st.pos, kind: 'bad', step: 2, hl: r.kind !== 'twice' };
    const fpNode = { n: c.FP, label: st.pos, kind: 'warn', step: 3, hl: r.kind !== 'twice' };
    if (r.kind === 'twice') {
      tpNode.kids = [{ n: c.TP2, label: 'again', kind: 'bad', step: 4, hl: true }];
      fpNode.kids = [{ n: c.FP2, label: 'again', kind: 'warn', step: 4, hl: true }];
    }
    return {
      tree: {
        n: TOWN, label: st.unit, step: 0,
        kids: [
          { n: c.S, label: st.yes, kind: 'bad', step: 1, kids: [tpNode, { n: c.FN, label: st.neg, kind: 'mute', step: 2 }] },
          { n: c.H, label: st.no, kind: 'mute', step: 1, kids: [fpNode, { n: c.TN, label: st.neg, kind: 'mute', step: 3 }] },
        ],
      },
    };
  }

  BG.registerGame({
    id: 'odds',
    name: '1000 People',
    emoji: '👥',
    skill: 'Understanding risk',
    category: 'life',
    tagline: 'Percentages lie to your gut. People don\'t. Count the town.',
    howTo: [
      'Read an everyday risk puzzle: a test, a scanner, a scary headline.',
      'Slide to your gut guess and bet on how close you are.',
      'Watch a town of 1000 split up and count the real answer.',
      'Closer guesses score more. Within 10 points wins the bet.',
    ],
    science:
      'Given natural frequencies ("10 out of 1000") instead of probabilities, physicians solving a screening problem went from 1 in 24 correct to 16 in 24, and frequency trees helped medical students a lot (Hoffrage et al., 2015).',
    scienceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4604268',
    minutes: 4,
    maxScore: 4 * MAX_PER_ROUND,
    makeRounds,
    pct,

    mount(root, ctx) {
      const data = window.BG_DATA_ODDS;
      const wrap = BG.el('<div class="od"></div>');
      root.appendChild(wrap);
      if (!data || !data.stories) {
        wrap.innerHTML = '<p class="muted">The town data is missing. Please refresh.</p>';
        return;
      }
      const rounds = makeRounds(data, ctx.rand);
      const TOTAL = rounds.length;

      // ---------- timers & cleanup ----------
      const timers = new Set();
      const later = (fn, ms) => {
        const id = setTimeout(() => {
          timers.delete(id);
          fn();
        }, ms);
        timers.add(id);
        return id;
      };
      const wait = (ms) => new Promise((res) => later(res, ms));
      let skipping = false;
      let skipNow = null;
      const swait = (ms) =>
        skipping
          ? Promise.resolve()
          : new Promise((res) => {
              const id = later(() => {
                skipNow = null;
                res();
              }, ms);
              skipNow = () => {
                clearTimeout(id);
                timers.delete(id);
                skipNow = null;
                res();
              };
            });
      const cleanups = [];
      let phase = 'idle'; // guess | bet | anim | reveal | end
      let resolveNext = null;

      wrap.innerHTML = `
        <div class="od-meta">
          <span class="label od-round"></span>
          <span class="chip chip--blue od-kind"></span>
        </div>
        <div class="card od-q">
          <span class="label od-topic"></span>
          <p class="od-text"></p>
          <p class="od-ask"></p>
        </div>
        <div class="panel od-town">
          <div class="od-canvas-wrap"><canvas class="od-canvas" role="img" aria-label="A town of 1000"></canvas></div>
          <p class="od-caption" aria-live="polite"></p>
        </div>
        <div class="card od-guess">
          <div class="od-guess-top">
            <span class="label od-guess-label">Your gut guess</span>
            <span class="big-num od-val">50%</span>
          </div>
          <div class="od-slider-row">
            <button class="icon-btn od-step" data-d="-1" aria-label="Guess lower">−</button>
            <input class="od-range" type="range" min="0" max="100" step="1" value="50">
            <button class="icon-btn od-step" data-d="1" aria-label="Guess higher">+</button>
          </div>
          <div class="od-scale" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          <button class="btn btn--primary btn--block od-lock">Lock in my guess 🔒</button>
        </div>
        <div class="od-tree" hidden></div>
        <div class="od-reveal" hidden></div>`;
      const $ = (s) => wrap.querySelector(s);
      const roundEl = $('.od-round');
      const kindEl = $('.od-kind');
      const qCard = $('.od-q');
      const topicEl = $('.od-topic');
      const textEl = $('.od-text');
      const askEl = $('.od-ask');
      const townEl = $('.od-town');
      const captionEl = $('.od-caption');
      const guessEl = $('.od-guess');
      const guessLabel = $('.od-guess-label');
      const valEl = $('.od-val');
      const range = $('.od-range');
      const lockBtn = $('.od-lock');
      const treeEl = $('.od-tree');
      const revealEl = $('.od-reveal');
      const town = makeTown($('.od-canvas'), (fn) => cleanups.push(fn));

      let unit = '%';
      let resolveGuess = null;
      const fmt = (v) => (unit === '%' ? `${v}%` : `${v}`);
      function setVal(v) {
        v = Math.max(0, Math.min(100, Math.round(v)));
        range.value = String(v);
        range.style.setProperty('--p', `${v}%`);
        valEl.textContent = fmt(v);
        range.setAttribute('aria-valuetext', unit === '%' ? `${v} percent` : `${v} people`);
      }
      range.addEventListener('input', () => {
        setVal(Number(range.value));
        BG.fx.sound('tick');
      });
      guessEl.addEventListener('click', (e) => {
        const b = e.target.closest('.od-step');
        if (!b || phase !== 'guess') return;
        setVal(Number(range.value) + Number(b.dataset.d));
        BG.fx.sound('tap');
        BG.fx.haptic();
      });
      lockBtn.addEventListener('click', () => {
        if (phase !== 'guess' || !resolveGuess) return;
        BG.fx.haptic(25);
        resolveGuess(Number(range.value));
      });
      // Tap the town (or anywhere) to skip the animation.
      wrap.addEventListener('click', (e) => {
        if (phase !== 'anim' || e.target.closest('button')) return;
        skipping = true;
        town.finishNow();
        if (skipNow) skipNow();
      });

      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey) return;
        const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
        if (phase === 'bet') {
          const n = Number(e.key);
          const sheet = document.querySelector('.bet-sheet');
          if (sheet && n >= 1 && n <= 3) {
            const b = sheet.querySelector(`[data-bet="${['guess', 'likely', 'sure'][n - 1]}"]`);
            if (b) {
              e.preventDefault();
              b.click();
            }
          }
        } else if (phase === 'guess' && e.key === 'Enter' && !onButton) {
          e.preventDefault();
          lockBtn.click();
        } else if (phase === 'anim' && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          skipping = true;
          town.finishNow();
          if (skipNow) skipNow();
        } else if (phase === 'reveal' && e.key === 'Enter' && !onButton && resolveNext) {
          e.preventDefault();
          resolveNext();
        }
      }
      document.addEventListener('keydown', onKey);
      ctx.onDestroy(() => {
        timers.forEach(clearTimeout);
        timers.clear();
        document.removeEventListener('keydown', onKey);
        cleanups.splice(0).forEach((fn) => fn());
        phase = 'end';
      });

      const scrollTo = (el) => {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
      };
      function showStep(step) {
        treeEl.querySelectorAll(`.od-tn[data-step="${step}"]`).forEach((n) => {
          n.classList.add('is-on');
          const k = n.nextElementSibling;
          if (k && k.classList.contains('od-kids')) k.classList.add('is-open');
        });
        // Open the branch lines leading to this step's nodes.
        treeEl.querySelectorAll('.od-kids').forEach((k) => {
          if (k.querySelector(`:scope > .od-branch > .od-tn[data-step="${step}"]`)) k.classList.add('is-on');
        });
      }
      function say(text) {
        captionEl.textContent = text;
        BG.fx.anim(captionEl, 'od-cap-in');
      }

      // ---------- the frequency-tree animation ----------
      async function animate(r) {
        const order = BG.shuffle(Array.from({ length: TOWN }, (_, i) => i), ctx.rand);
        treeEl.innerHTML = `<div class="od-tree-in">${treeHTML(buildPlan(r).tree)}</div>`;
        treeEl.hidden = false;
        showStep(0);
        const beat = async (ms) => {
          await swait(ms);
          return ctx.alive;
        };

        if (r.kind === 'rel') {
          const sick = order.slice(0, r.b);
          say(`Here are 1000 people. Watch the ${r.story.what}.`);
          if (!(await beat(700))) return false;
          town.set(sick, 'bad', 600, skipping);
          showStep(1);
          BG.fx.sound('pop');
          say(r.story.dir < 0 ? `Without it: ${r.b} in 1000.` : `Normally: ${r.b} in 1000.`);
          if (!(await beat(1500))) return false;
          if (r.story.dir < 0) {
            town.set(sick.slice(0, r.d), 'ok', 500, skipping);
            say(`With it: ${r.after}. Only ${r.d} ${r.d === 1 ? 'person is' : 'people are'} spared.`);
          } else {
            town.set(order.slice(r.b, r.b + r.d), 'warn', 500, skipping);
            say(`With it: ${r.after}. That's ${r.d} extra ${r.d === 1 ? 'person' : 'people'}.`);
          }
          showStep(2);
          BG.fx.sound('pop');
          if (!(await beat(1400))) return false;
          return true;
        }

        const c = r.c;
        const st = r.story;
        const sick = order.slice(0, c.S);
        const well = order.slice(c.S);
        const tp = sick.slice(0, c.TP);
        const fn = sick.slice(c.TP);
        const fp = well.slice(0, c.FP);
        const tn = well.slice(c.FP);
        say(`A town of 1000 ${st.unit}.`);
        if (!(await beat(700))) return false;

        town.set(sick, 'bad', 600, skipping);
        town.set(well, 'dim', 600, skipping);
        showStep(1);
        BG.fx.sound('pop');
        say(`${c.S} ${st.yes} (red). ${c.H} ${st.no}.`);
        if (!(await beat(1600))) return false;

        town.set(fn, 'badDim', 300, skipping);
        showStep(2);
        BG.fx.sound('tick');
        say(`Of the ${c.S}, the test catches ${c.TP}.`);
        if (!(await beat(1500))) return false;

        town.set(fp, 'warn', 900, skipping);
        showStep(3);
        BG.fx.sound('pop');
        say(`But of the ${c.H}, it also flags ${c.FP} by mistake (amber).`);
        if (!(await beat(1900))) return false;

        if (r.kind === 'twice') {
          town.set(tp.slice(c.TP2), 'badDim', 300, skipping);
          town.set(fp.slice(c.FP2), 'warnDim', 500, skipping);
          showStep(4);
          BG.fx.sound('pop');
          say(`Second test: ${c.TP2} of the ${c.TP} stay flagged, but only ${c.FP2} of the ${c.FP} false alarms do.`);
          if (!(await beat(2000))) return false;
        }
        void tn;
        return true;
      }

      // ---------- a round ----------
      const results = [];
      async function playRound(i) {
        const r = rounds[i];
        ctx.setProgress(i + 1, TOTAL);
        phase = 'idle';
        skipping = false;
        unit = r.unit;
        roundEl.textContent = `Round ${i + 1} of ${TOTAL}`;
        kindEl.textContent = KIND_LABEL[r.kind];
        topicEl.textContent = `${r.story.emoji} ${r.story.topic}`;
        textEl.textContent = r.text;
        askEl.textContent = r.ask;
        treeEl.hidden = true;
        treeEl.innerHTML = '';
        revealEl.hidden = true;
        revealEl.innerHTML = '';
        town.setIcon(r.kind === 'rel' ? 'person' : r.story.icon);
        town.reset('base');
        captionEl.textContent = r.kind === 'rel' ? 'A town of 1000 people.' : `A town of 1000 ${r.story.unit}.`;
        guessLabel.textContent = r.unit === '%' ? 'Your gut guess (chance)' : 'Your gut guess (people out of 1000)';
        guessEl.hidden = false;
        guessEl.classList.remove('is-locked');
        range.disabled = false;
        lockBtn.disabled = false;
        guessEl.querySelectorAll('.od-step').forEach((b) => (b.disabled = false));
        setVal(r.unit === '%' ? 50 : 20);
        BG.fx.pop(qCard);

        phase = 'guess';
        const guess = await new Promise((res) => (resolveGuess = res));
        resolveGuess = null;
        if (!ctx.alive) return;
        guessEl.classList.add('is-locked');
        range.disabled = true;
        lockBtn.disabled = true;
        guessEl.querySelectorAll('.od-step').forEach((b) => (b.disabled = true));
        BG.fx.sound('pick');

        phase = 'bet';
        const bet = await ctx.bet(`Within 10 of the truth with ${fmt(guess)}?`);
        if (!ctx.alive) return;

        phase = 'anim';
        guessEl.hidden = true;
        scrollTo(townEl);
        const ok = await animate(r);
        if (!ok || !ctx.alive) return;
        skipping = false;

        // ---------- reveal ----------
        phase = 'reveal';
        const truth = r.truth;
        const miss = Math.abs(guess - truth);
        const within = miss <= 10;
        let eq;
        if (r.kind === 'rel') {
          eq = r.story.dir < 0
            ? `${r.b} − ${r.after} = <b>${r.d}</b> fewer`
            : `${r.after} − ${r.b} = <b>${r.d}</b> extra`;
        } else {
          const exactly = (100 * r.tp) % (r.tp + r.fp) === 0;
          eq = `${r.tp} ÷ (${r.tp} + ${r.fp}) ${exactly ? '=' : '≈'} <b>${truth}%</b>`;
        }
        const room = r.kind === 'rel'
          ? ''
          : `<div class="od-room">
              <span class="label">Everyone ${BG.esc(r.kind === 'twice' ? 'flagged twice' : `with "${r.story.pos}"`)}: ${r.tp + r.fp}</span>
              <div class="od-room-dots" aria-hidden="true">${'<i class="od-d od-d--bad"></i>'.repeat(r.tp)}${'<i class="od-d od-d--warn"></i>'.repeat(r.fp)}</div>
              <span class="od-room-key"><i class="od-d od-d--bad"></i> ${r.tp} real <i class="od-d od-d--warn"></i> ${r.fp} false alarm${r.fp === 1 ? '' : 's'}</span>
            </div>`;
        const pos = (v) => `${Math.max(0, Math.min(100, v))}%`;
        revealEl.innerHTML = `
          <div class="card od-verdict ${within ? 'od-verdict--ok' : 'od-verdict--bad'}">
            ${room}
            <p class="od-eq">${eq}</p>
            <div class="od-compare" aria-label="Your guess ${fmt(guess)}, answer ${fmt(truth)}">
              <div class="od-track"></div>
              <span class="od-mark od-mark--you" style="left:${pos(guess)}"><span>You ${fmt(guess)}</span></span>
              <span class="od-mark od-mark--truth" style="left:${pos(truth)}"><span>Answer ${fmt(truth)}</span></span>
            </div>
            <h3 class="od-title">${miss === 0 ? '🎯 Bullseye!' : within ? `👍 Off by ${miss}` : `😮 Off by ${miss}`}</h3>
            <p class="od-take">💡 ${BG.esc(takeaway(r))}</p>
            <div class="od-points"></div>
          </div>
          <button class="btn btn--primary btn--block od-next">${i + 1 < TOTAL ? 'Next puzzle →' : 'See results 🏁'}</button>`;
        revealEl.hidden = false;
        const verdict = revealEl.querySelector('.od-verdict');
        const pointsEl = revealEl.querySelector('.od-points');
        const nextBtn = revealEl.querySelector('.od-next');
        nextBtn.disabled = true;
        BG.fx.pop(verdict);
        BG.fx.sound(within ? 'good' : 'bad');
        if (!within) BG.fx.shake(revealEl.querySelector('.od-compare'));
        scrollTo(revealEl);

        const pts = closeness(guess, truth);
        if (pts > 0) ctx.addScore(pts, revealEl.querySelector('.od-mark--truth'));
        pointsEl.innerHTML = `<span class="chip ${pts >= 80 ? 'chip--ok' : pts > 0 ? 'chip--blue' : ''}">+${pts} closeness</span>`;
        await wait(450);
        if (!ctx.alive) return;
        const delta = ctx.settleBet(bet, within, verdict);
        ctx.addScore(delta);
        const b = BG.BETS[bet];
        pointsEl.insertAdjacentHTML(
          'beforeend',
          `<span class="chip ${delta > 0 ? 'chip--ok' : delta < 0 ? '' : 'chip--blue'}">${b ? b.emoji : ''} bet ${delta > 0 ? '+' : ''}${delta}</span>`
        );
        results.push({ guess, truth, miss, within, unit: r.unit });
        BG.track('odds_round', { kind: r.kind, story: r.story.id, guess, truth, bet });

        nextBtn.disabled = false;
        nextBtn.focus({ preventScroll: true });
        await new Promise((res) => {
          resolveNext = res;
          nextBtn.addEventListener('click', res, { once: true });
        });
        resolveNext = null;
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      async function run() {
        for (let i = 0; i < TOTAL; i++) {
          await playRound(i);
          if (!ctx.alive) return;
        }
        phase = 'end';
        const avg = Math.round(results.reduce((s, x) => s + x.miss, 0) / results.length);
        const hits = results.filter((x) => x.within).length;
        const best = ctx.store.get('bestAvg', null);
        if (best == null || avg < best) ctx.store.set('bestAvg', avg);
        treeEl.hidden = true;
        guessEl.hidden = true;
        town.reset('base');
        revealEl.innerHTML = `
          <div class="card od-end">
            <h3 class="od-title">${hits === TOTAL ? '🏆 Gut and maths in sync!' : avg <= 15 ? '👥 Sharp instincts' : '👥 The town surprised you'}</h3>
            <ul class="od-list">${results.map((x, k) => `
              <li><span class="label">R${k + 1}</span> You ${fmt2(x.guess, x.unit)} · Answer ${fmt2(x.truth, x.unit)}
              <span class="chip ${x.within ? 'chip--ok' : ''}">${x.miss === 0 ? '🎯' : `off ${x.miss}`}</span></li>`).join('')}
            </ul>
            <p class="od-take">Average miss: <b>${avg}</b> points${best != null ? ` · previous best ${best}` : ''}</p>
          </div>`;
        revealEl.hidden = false;
        say(hits === TOTAL ? 'The whole town applauds. 🎉' : 'Next time, picture the 1000 first.');
        if (hits === TOTAL) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else {
          BG.fx.sound(hits >= 2 ? 'good' : 'lose');
        }
        BG.fx.pop(revealEl.firstElementChild);
        scrollTo(revealEl);
        await wait(1800);
        if (!ctx.alive) return;
        ctx.finish({
          summary: `Gut vs maths: average miss ${avg} point${avg === 1 ? '' : 's'} 👥`,
          stats: { avgMiss: avg, within10: hits, rounds: TOTAL },
        });
      }
      const fmt2 = (v, u) => (u === '%' ? `${v}%` : `${v}`);

      run();
    },
  });
})();

// Brain Gym game: "Inner Clock" (id 'clock').
// Three mini-rounds on sensing time: stop a hidden stopwatch, keep a silent beat,
// and estimate how long a real mini task will take you (the planning fallacy).
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure scoring + content helpers (no DOM). Exported for node tests.
  // ---------------------------------------------------------------------------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const DIAL = 20; // seconds per revolution of the stopwatch face
  const TRIAL_MAX = 60;
  const RHYTHM_MAX = 100;
  const PLAN_MAX = 100;
  const COUNT_IN = 4;
  const SILENT_BEATS = 10;

  // Round 1: 60 points for a perfect stop, minus 25 per second of error.
  const trialScore = (errSec) => Math.max(0, Math.round(TRIAL_MAX - 25 * Math.abs(errSec)));

  // Four targets per day, one from each band, so the stretch grows: 3–5, 6–8, 9–11, 12–15 s.
  const BANDS = [[3, 5], [6, 8], [9, 11], [12, 15]];
  const targetsFor = (rand) => BANDS.map(([a, b]) => a + Math.floor(rand() * (b - a + 1)));

  // Round 2: match each tap to the nearest hidden beat. Each silent beat keeps its closest tap;
  // an unanswered beat costs half an interval, and so does every extra tap (no spamming).
  function rhythmScore(taps, t0, iv, first = COUNT_IN, n = SILENT_BEATS) {
    const offsets = new Array(n).fill(null);
    let extras = 0;
    taps.forEach((t) => {
      const k = Math.round((t - t0) / iv);
      if (k < first || k >= first + n) return;
      const i = k - first;
      const off = t - (t0 + k * iv);
      if (offsets[i] === null) offsets[i] = off;
      else {
        extras++;
        if (Math.abs(off) < Math.abs(offsets[i])) offsets[i] = off;
      }
    });
    const half = iv / 2;
    let sum = extras * half;
    let signed = 0;
    let hits = 0;
    offsets.forEach((o) => {
      if (o === null) sum += half;
      else {
        sum += Math.abs(o);
        signed += o;
        hits++;
      }
    });
    const mae = sum / (n + extras);
    // 15 ms or better = 100; 250 ms or worse = 0.
    const score = Math.round(RHYTHM_MAX * clamp(1 - (mae - 15) / 235, 0, 1));
    return { mae, signed: hits ? signed / hits : 0, hits, extras, offsets, score };
  }

  // Round 3: % error is relative to the estimate ("guessed 20s, took 31s" = 55% over).
  const planPct = (est, actual) => ((actual - est) / est) * 100;
  const planScore = (est, actual) => Math.max(0, Math.round(PLAN_MAX - 2.5 * Math.abs(planPct(est, actual))));

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  // Turns an average % error into a plain-language padding tip.
  function biasAdvice(bias) {
    const b = Math.round(bias);
    const a = Math.abs(b);
    if (a < 8) return 'you\'re well calibrated, keep it up';
    const FRACS = [[10, 'a tenth'], [20, 'a fifth'], [25, 'a quarter'], [33, 'a third'], [50, 'half'], [67, 'two thirds'], [100, 'double']];
    let best = null;
    FRACS.forEach(([p, word]) => {
      if (Math.abs(p - a) <= Math.max(3, p * 0.12) && (!best || Math.abs(p - a) < Math.abs(best[0] - a))) best = [p, word];
    });
    if (b > 0) {
      if (best && best[1] === 'double') return 'double your estimates';
      return best ? `pad your estimates by ${best[1]}` : `pad your estimates by about ${a}%`;
    }
    // Overestimating: actual = est × (1 + b), so trim by |b|.
    return best && best[1] !== 'double' ? `trim your estimates by ${best[1]}` : `trim your estimates by about ${Math.min(a, 90)}%`;
  }
  const fmtPct = (p) => `${p >= 0 ? '+' : '−'}${Math.abs(Math.round(p))}%`;

  const TITLES = [
    [0.15, 'Time Lord', '👑'],
    [0.35, 'Chronomaster', '🎩'],
    [0.7, 'Swiss Watch', '⌚'],
    [1.2, 'Pendulum', '🕰️'],
    [2, 'Sundial', '☀️'],
    [Infinity, 'Cuckoo Clock', '🐦'],
  ];
  const titleFor = (avgErr) => {
    const t = TITLES.find(([lim]) => avgErr <= lim);
    return { name: t[1], emoji: t[2] };
  };

  // Plan-it tasks. All content is generated from the seeded RNG.
  const ANIMALS = ['cat', 'dog', 'owl', 'fox', 'bee', 'cow', 'pig', 'yak', 'eel', 'ant', 'hen', 'emu', 'elk', 'ape', 'gnu'];
  const THINGS = ['cup', 'pen', 'map', 'box', 'hat', 'sun', 'key', 'jar', 'bus', 'fan', 'mug', 'rug', 'pot', 'cap', 'bag',
    'net', 'lid', 'car', 'pin', 'oar', 'saw', 'hut', 'toy', 'van', 'cot', 'bell', 'drum', 'sock', 'lamp', 'fork'];
  const SNACKS = ['🍩', '🥯', '🧇', '🥨', '🥠', '🍘', '🥮', '🍪'];
  const TASKS = ['sort', 'cookies', 'animals'];

  function makeTask(kind, rand) {
    if (kind === 'sort') {
      const nums = new Set();
      while (nums.size < 12) nums.add(1 + Math.floor(rand() * 99));
      const values = [...nums];
      return {
        kind, mode: 'order', cols: 4, total: 12,
        title: 'Sort the tiles',
        ask: 'Tap all 12 number tiles in order, from smallest to largest.',
        items: values.map((v) => ({ label: String(v), value: v })),
        order: values.slice().sort((a, b) => a - b),
      };
    }
    if (kind === 'cookies') {
      const cells = 42;
      const spots = new Set();
      while (spots.size < 6) spots.add(Math.floor(rand() * cells));
      const decoys = SNACKS.filter((s) => s !== '🍪');
      return {
        kind, mode: 'set', cols: 6, total: 6,
        title: 'Cookie hunt',
        ask: 'Find and tap all 6 hidden 🍪 cookies in the snack pile.',
        items: Array.from({ length: cells }, (_, i) =>
          spots.has(i) ? { label: '🍪', target: true } : { label: decoys[Math.floor(rand() * decoys.length)], target: false }),
      };
    }
    const shuffle = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const pickA = shuffle(ANIMALS).slice(0, 8).map((w) => ({ label: w, target: true }));
    const pickT = shuffle(THINGS).slice(0, 16).map((w) => ({ label: w, target: false }));
    return {
      kind: 'animals', mode: 'set', cols: 4, total: 8,
      title: 'Animal spotter',
      ask: 'Tap all 8 words that name an animal.',
      items: shuffle(pickA.concat(pickT)),
    };
  }

  const engine = { trialScore, targetsFor, rhythmScore, planPct, planScore, biasAdvice, titleFor, makeTask, fmtPct, TASKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Stopwatch SVG
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const pt = (r, s) => {
    const a = (s / DIAL) * Math.PI * 2;
    return [r * Math.sin(a), -r * Math.cos(a)];
  };
  const f1 = (n) => n.toFixed(2);
  function arcD(r, s0, s1) {
    let a = clamp(Math.min(s0, s1), 0, DIAL - 0.01);
    let b = clamp(Math.max(s0, s1), 0, DIAL - 0.01);
    if (b - a < 0.005) b = a + 0.005;
    const [x0, y0] = pt(r, a);
    const [x1, y1] = pt(r, b);
    const large = (b - a) / DIAL > 0.5 ? 1 : 0;
    return `M${f1(x0)} ${f1(y0)} A${r} ${r} 0 ${large} 1 ${f1(x1)} ${f1(y1)}`;
  }
  function watchSVG() {
    let ticks = '';
    for (let i = 0; i < DIAL * 2; i++) {
      const s = i / 2;
      const major = i % 2 === 0;
      const big = i % 10 === 0;
      const [x0, y0] = pt(big ? 76 : major ? 82 : 86, s);
      const [x1, y1] = pt(92, s);
      ticks += `<line class="g-clock-tick${big ? ' is-big' : major ? ' is-major' : ''}" x1="${f1(x0)}" y1="${f1(y0)}" x2="${f1(x1)}" y2="${f1(y1)}"/>`;
    }
    let nums = '';
    [0, 5, 10, 15].forEach((s) => {
      const [x, y] = pt(62, s);
      nums += `<text class="g-clock-num" x="${f1(x)}" y="${f1(y + 6)}">${s === 0 ? DIAL : s}</text>`;
    });
    return `
      <svg class="g-clock-svg" viewBox="-112 -132 224 246" role="img" aria-label="Stopwatch">
        <rect class="g-clock-crown" x="-14" y="-131" width="28" height="14" rx="5"/>
        <rect class="g-clock-stem" x="-6" y="-119" width="12" height="14" rx="2"/>
        <circle class="g-clock-rim" r="106"/>
        <circle class="g-clock-face" r="97"/>
        ${ticks}${nums}
        <path class="g-clock-truearc" d="" fill="none"/>
        <path class="g-clock-errarc" d="" fill="none"/>
        <g class="g-clock-target" hidden><path d="M0 -93 L-7 -106 L7 -106 Z"/></g>
        <g class="g-clock-hand"><line x1="0" y1="14" x2="0" y2="-84"/><circle r="7"/></g>
        <g class="g-clock-ghost" hidden><line x1="0" y1="0" x2="0" y2="-84"/></g>
        <text class="g-clock-digital" x="0" y="48">0.00</text>
        <text class="g-clock-monkey" x="0" y="-18">🙈</text>
      </svg>`;
  }

  // ---------------------------------------------------------------------------
  // Game
  // ---------------------------------------------------------------------------
  BG.registerGame({
    id: 'clock',
    name: 'Inner Clock',
    emoji: '⏳',
    skill: 'Sensing and planning time',
    category: 'cool',
    tagline: 'Your gut has a clock. Is it fast, slow, or a Time Lord?',
    howTo: [
      'Feel the seconds: start the stopwatch, it hides after 1s, stop it on the target.',
      'Rhythm keeper: 4 beats play, then go silent. Keep tapping on the beat.',
      'Plan it: guess how long a mini task will take you, then do it.',
      'Tap, Space or Enter to start, stop and tap.',
    ],
    science:
      'Students predicted they\'d finish their thesis in about 34 days; it took about 56 (Buehler, Griffin & Ross, JPSP 1994: the "planning fallacy"). Practice with feedback helps you notice your personal bias.',
    scienceUrl: 'https://doi.org/10.1037/0022-3514.67.3.366',
    minutes: 4,
    maxScore: 4 * TRIAL_MAX + RHYTHM_MAX + PLAN_MAX,

    mount(root, ctx) {
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const targets = targetsFor(ctx.rand);
      const beatMs = 600 + 50 * Math.floor(ctx.rand() * 7); // 600–900 ms (67–100 bpm)
      const taskKind = ctx.mode === 'daily' ? TASKS[(ctx.day - 1) % TASKS.length] : TASKS[Math.floor(ctx.rand() * TASKS.length)];
      const task = makeTask(taskKind, ctx.rand);

      const errors = []; // round 1 signed errors (s)
      const stats = { avgOffSec: 0, trials: [], rhythmMs: null, rhythmScore: 0, estimate: 0, actual: 0, planPct: 0, planBias: 0, title: '' };
      let primary = null; // what Space / Enter does right now
      let ended = false;
      const timeouts = new Set();
      const rafs = new Set();
      const later = (fn, ms) => {
        const id = setTimeout(() => {
          timeouts.delete(id);
          if (ctx.alive && !ended) fn();
        }, ms);
        timeouts.add(id);
        return id;
      };
      const cancelLater = (id) => {
        clearTimeout(id);
        timeouts.delete(id);
      };
      const loop = (fn) => {
        const h = { id: 0, on: true };
        const step = (now) => {
          if (!h.on || !ctx.alive || ended) return;
          if (fn(now) === false) { h.on = false; rafs.delete(h); return; }
          h.id = requestAnimationFrame(step);
        };
        h.id = requestAnimationFrame(step);
        rafs.add(h);
        return () => { h.on = false; cancelAnimationFrame(h.id); rafs.delete(h); };
      };

      root.innerHTML = '';
      const wrap = BG.el(`
        <div class="g-clock">
          <div class="g-clock-top">
            <span class="label g-clock-round"></span>
            <span class="chip chip--gold g-clock-title" aria-live="polite">🎓 Apprentice</span>
          </div>
          <div class="g-clock-body"></div>
        </div>`);
      root.appendChild(wrap);
      const roundEl = wrap.querySelector('.g-clock-round');
      const titleEl = wrap.querySelector('.g-clock-title');
      const body = wrap.querySelector('.g-clock-body');

      const tap = () => { BG.fx.sound('tap'); BG.fx.haptic(); };
      const press = (btn, fn) => {
        // pointerdown for timing precision; keyboard goes through `primary`.
        btn.addEventListener('pointerdown', (e) => {
          if (e.button !== undefined && e.button !== 0) return;
          e.preventDefault();
          fn(performance.now());
        });
      };
      const setRound = (n, name) => {
        ctx.setProgress(n, 3);
        roundEl.textContent = `Round ${n} of 3 · ${name}`;
      };
      const updateTitle = () => {
        if (!errors.length) return;
        const t = titleFor(avg(errors.map(Math.abs)));
        const text = `${t.emoji} ${t.name}`;
        if (titleEl.textContent !== text) {
          titleEl.textContent = text;
          BG.fx.pop(titleEl);
        }
        stats.title = t.name;
      };

      function intro(n, name, emoji, blurb, btnText, go) {
        setRound(n, name);
        body.innerHTML = `
          <div class="g-clock-intro card">
            <div class="g-clock-intro-emoji" aria-hidden="true">${emoji}</div>
            <h2 class="g-clock-intro-name">${BG.esc(name)}</h2>
            <p class="g-clock-intro-blurb">${blurb}</p>
            <button class="btn btn--primary btn--block g-clock-big">${BG.esc(btnText)}</button>
          </div>`;
        BG.fx.pop(body.firstElementChild);
        const btn = body.querySelector('button');
        let used = false;
        const fire = () => {
          if (used) return;
          used = true;
          tap();
          go();
        };
        btn.addEventListener('click', fire);
        primary = fire;
      }

      // ------------------------------------------------------------------ Round 1
      function roundOne(i) {
        if (!ctx.alive || ended) return;
        if (i >= targets.length) {
          primary = null;
          intro(2, 'Rhythm keeper', '🥁',
            `A beat plays <b>4 times</b>, then goes silent. Keep tapping on the beat for <b>10 more beats</b>.`,
            'I\'m ready', roundTwo);
          return;
        }
        const target = targets[i];
        setRound(1, 'Feel the seconds');
        body.innerHTML = `
          <div class="g-clock-r1">
            <div class="g-clock-pips" aria-hidden="true">${targets.map((_, k) => `<span class="${k < i ? 'is-done' : k === i ? 'is-now' : ''}"></span>`).join('')}</div>
            <p class="g-clock-ask">Stop the clock at exactly <b>${target} seconds</b></p>
            <div class="g-clock-watch">${watchSVG()}</div>
            <p class="g-clock-msg" aria-live="polite">The clock hides after 1 second. Trust your gut.</p>
            <button class="btn btn--primary btn--block g-clock-big g-clock-go">▶ Start</button>
          </div>`;
        const svg = body.querySelector('.g-clock-svg');
        const watch = body.querySelector('.g-clock-watch');
        const hand = svg.querySelector('.g-clock-hand');
        const ghost = svg.querySelector('.g-clock-ghost');
        const digital = svg.querySelector('.g-clock-digital');
        const trueArc = svg.querySelector('.g-clock-truearc');
        const errArc = svg.querySelector('.g-clock-errarc');
        const targetMark = svg.querySelector('.g-clock-target');
        const msg = body.querySelector('.g-clock-msg');
        const btn = body.querySelector('.g-clock-go');
        const setHand = (s) => hand.setAttribute('transform', `rotate(${((s / DIAL) * 360).toFixed(2)})`);
        targetMark.setAttribute('transform', `rotate(${(target / DIAL) * 360})`);
        targetMark.removeAttribute('hidden');

        let state = 'ready';
        let t0 = 0;
        let stopLoop = null;
        let autoId = 0;

        const start = (now) => {
          if (state !== 'ready') return;
          state = 'running';
          t0 = now;
          BG.fx.sound('pick');
          BG.fx.haptic();
          btn.textContent = '■ Stop';
          btn.classList.add('is-stop');
          msg.textContent = `Stop at ${target}s…`;
          svg.classList.add('is-running');
          let hidden = false;
          stopLoop = loop((t) => {
            const s = (t - t0) / 1000;
            if (!hidden) {
              setHand(s);
              digital.textContent = s.toFixed(2);
              if (s >= 1) {
                hidden = true;
                svg.classList.add('is-hidden');
                msg.textContent = '🙈 Clock hidden. Count it in your head…';
              }
              return true;
            }
            return s < 1.8 ? (setHand(s), true) : false; // keep moving while it fades
          });
          autoId = later(() => stop(performance.now(), true), (target * 2 + 5) * 1000);
        };

        const stop = (now, timedOut = false) => {
          if (state !== 'running') return;
          state = 'done';
          if (stopLoop) stopLoop();
          if (!timedOut) cancelLater(autoId);
          const elapsed = (now - t0) / 1000;
          const err = elapsed - target;
          errors.push(err);
          stats.trials.push(Math.round(err * 100) / 100);
          const pts = trialScore(err);
          BG.fx.sound('pick');
          BG.fx.haptic(20);
          svg.classList.remove('is-hidden', 'is-running');
          svg.classList.add('is-reveal');
          digital.textContent = elapsed.toFixed(2);
          btn.disabled = true;
          btn.classList.remove('is-stop');
          btn.textContent = '…';
          const a = Math.abs(err);
          const kind = a <= 0.25 ? 'ok' : a <= 1 ? 'warn' : 'bad';
          const finishReveal = () => {
            if (!ctx.alive || ended) return;
            setHand(elapsed);
            trueArc.setAttribute('d', arcD(88, 0, target));
            errArc.setAttribute('d', arcD(88, target, elapsed));
            errArc.setAttribute('class', `g-clock-errarc is-${kind}`);
            ghost.setAttribute('transform', `rotate(${(target / DIAL) * 360})`);
            ghost.removeAttribute('hidden');
            const label = a < 0.005 ? 'Dead on!' : `${err > 0 ? '+' : '−'}${a.toFixed(2)}s ${err > 0 ? 'late' : 'early'}`;
            msg.innerHTML = `<span class="g-clock-off g-clock-off--${kind}">${timedOut ? '⌛ Time ran out · ' : ''}${label}</span>`;
            if (pts > 0) ctx.addScore(pts, watch);
            else BG.fx.float(watch, '+0', 'info');
            if (a <= 0.1) {
              BG.fx.sound('win');
              BG.fx.confetti();
              BG.fx.pop(watch);
            } else if (a <= 1) BG.fx.sound('good');
            else {
              BG.fx.sound('bad');
              BG.fx.shake(watch);
            }
            updateTitle();
            btn.disabled = false;
            btn.textContent = i + 1 < targets.length ? 'Next ▶' : 'On to round 2 ▶';
            state = 'next';
          };
          if (reduced) finishReveal();
          else {
            // Sweep the hand from 0 to where you stopped, then show the arcs.
            const sweepMs = 650;
            const s0 = performance.now();
            loop((t) => {
              const x = Math.min(1, (t - s0) / sweepMs);
              const e = 1 - Math.pow(1 - x, 3);
              setHand(Math.min(elapsed, DIAL * 1.5) * e);
              if (x < 1) return true;
              finishReveal();
              return false;
            });
          }
        };

        const next = () => {
          if (state !== 'next') return;
          state = 'gone';
          tap();
          roundOne(i + 1);
        };

        const act = (now) => {
          if (state === 'ready') start(now);
          else if (state === 'running') stop(now);
          else if (state === 'next') next();
        };
        press(btn, act);
        primary = act;
      }

      // ------------------------------------------------------------------ Round 2
      function roundTwo() {
        if (!ctx.alive || ended) return;
        setRound(2, 'Rhythm keeper');
        const bpm = Math.round(60000 / beatMs);
        body.innerHTML = `
          <div class="g-clock-r2">
            <p class="g-clock-ask">Keep the beat · <b>${bpm} bpm</b></p>
            <div class="g-clock-beats" aria-hidden="true">${Array.from({ length: COUNT_IN + SILENT_BEATS }, (_, k) =>
              `<span class="${k < COUNT_IN ? 'is-count' : ''}"></span>`).join('')}</div>
            <button class="g-clock-pad" aria-label="Tap on the beat"><span class="g-clock-pad-txt">Get ready</span></button>
            <p class="g-clock-msg" aria-live="polite">Listen and watch the first 4 beats…</p>
          </div>`;
        const pad = body.querySelector('.g-clock-pad');
        const padTxt = body.querySelector('.g-clock-pad-txt');
        const msg = body.querySelector('.g-clock-msg');
        const dots = [...body.querySelectorAll('.g-clock-beats span')];
        const taps = [];
        const t0 = performance.now() + 900;
        const total = COUNT_IN + SILENT_BEATS;
        let k = 0;
        let silent = false;
        let done = false;
        let scored = 0;

        const onTap = (now) => {
          if (done) return;
          taps.push(now);
          BG.fx.anim(pad, 'g-clock-hit');
          BG.fx.haptic(8);
          if (now > t0 + (COUNT_IN - 0.5) * beatMs) {
            scored++;
            padTxt.textContent = `${scored}`;
            if (dots[COUNT_IN + scored - 1]) dots[COUNT_IN + scored - 1].classList.add('is-tap');
          }
        };
        press(pad, onTap);
        primary = onTap;

        loop((now) => {
          while (k < total && now >= t0 + k * beatMs) {
            if (k < COUNT_IN) {
              BG.fx.sound('tick');
              BG.fx.anim(pad, 'g-clock-pulse');
              padTxt.textContent = String(k + 1);
            }
            if (k < COUNT_IN) dots[k].classList.add('is-past');
            k++;
          }
          if (!silent && now >= t0 + (COUNT_IN - 0.5) * beatMs) {
            silent = true;
            pad.classList.add('is-silent');
            if (!scored) padTxt.textContent = 'TAP';
            msg.textContent = '🔇 Silent now. Keep tapping on the beat!';
          }
          if (now > t0 + (total - 0.5) * beatMs + 60) {
            done = true;
            primary = null;
            showRhythm(taps, t0);
            return false;
          }
          return true;
        });
      }

      function showRhythm(taps, t0) {
        const r = rhythmScore(taps, t0, beatMs);
        stats.rhythmMs = Math.round(r.mae);
        stats.rhythmScore = r.score;
        const half = beatMs / 2;
        const W = 300;
        const H = 70;
        const step = W / SILENT_BEATS;
        let marks = '';
        r.offsets.forEach((o, i) => {
          const cx = step * (i + 0.5);
          marks += `<line class="g-clock-tl-beat" x1="${cx}" y1="8" x2="${cx}" y2="${H - 8}"/>`;
          if (o === null) marks += `<text class="g-clock-tl-miss" x="${cx}" y="${H / 2 + 5}">×</text>`;
          else {
            const x = cx + clamp(o / half, -1, 1) * (step / 2 - 3);
            const a = Math.abs(o);
            marks += `<circle class="g-clock-tl-tap is-${a <= 40 ? 'ok' : a <= 110 ? 'warn' : 'bad'}" cx="${x.toFixed(1)}" cy="${H / 2}" r="6"/>`;
          }
        });
        const sign = r.signed;
        const tendency = r.hits < 3 ? 'Tap through all 10 silent beats next time.'
          : Math.abs(sign) < 20 ? 'No drift: your inner metronome is steady. 🎯'
            : sign < 0 ? `You rushed: about ${Math.round(-sign)} ms early on average.`
              : `You dragged: about ${Math.round(sign)} ms late on average.`;
        body.querySelector('.g-clock-r2').insertAdjacentHTML('beforeend', `
          <div class="g-clock-tl card">
            <span class="label">Hidden beats vs your taps</span>
            <svg viewBox="0 0 ${W} ${H}" class="g-clock-tl-svg" role="img" aria-label="Your taps compared with the hidden beat">
              <line class="g-clock-tl-axis" x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}"/>${marks}
            </svg>
            <div class="g-clock-tl-legend"><span>◀ early</span><span>late ▶</span></div>
            <p class="g-clock-tl-sum"><b>${Math.round(r.mae)} ms</b> off on average · ${r.hits}/10 beats hit${r.extras ? ` · ${r.extras} extra tap${r.extras === 1 ? '' : 's'}` : ''}</p>
            <p class="muted g-clock-tl-tip">${tendency}</p>
          </div>
          <button class="btn btn--primary btn--block g-clock-big g-clock-next">On to round 3 ▶</button>`);
        const pad = body.querySelector('.g-clock-pad');
        pad.disabled = true;
        pad.classList.add('is-over');
        body.querySelector('.g-clock-pad-txt').textContent = `${r.score}`;
        const tl = body.querySelector('.g-clock-tl');
        if (r.score > 0) ctx.addScore(r.score, tl);
        else BG.fx.float(tl, '+0', 'info');
        BG.fx.sound(r.score >= 80 ? 'win' : r.score >= 40 ? 'good' : 'bad');
        if (r.score >= 90) BG.fx.confetti();
        const nextBtn = body.querySelector('.g-clock-next');
        let used = false;
        const go = () => {
          if (used) return;
          used = true;
          tap();
          primary = null;
          roundThreeIntro();
        };
        nextBtn.addEventListener('click', go);
        primary = go;
        tl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
      }

      // ------------------------------------------------------------------ Round 3
      function boardHTML(active) {
        return `<div class="g-clock-board g-clock-board--${task.kind}${active ? '' : ' is-preview'}" style="--cols:${task.cols}">${
          task.items.map((it, idx) => `<button class="g-clock-cell" data-i="${idx}" ${active ? '' : 'tabindex="-1" aria-hidden="true"'}>${BG.esc(it.label)}</button>`).join('')
        }</div>`;
      }

      function roundThreeIntro() {
        if (!ctx.alive || ended) return;
        setRound(3, 'Plan it');
        const hist = ctx.store.get('planHistory', []);
        body.innerHTML = `
          <div class="g-clock-r3">
            <p class="g-clock-ask"><b>${BG.esc(task.title)}</b> · ${BG.esc(task.ask)}</p>
            <div class="g-clock-preview">${boardHTML(false)}<span class="g-clock-peek">👀 Sneak peek</span></div>
            <div class="g-clock-est card">
              <label class="g-clock-est-q" for="g-clock-range">How many seconds will it take you?</label>
              <div class="g-clock-est-num"><span class="big-num g-clock-est-val">20</span><span class="muted">s</span></div>
              <input id="g-clock-range" class="g-clock-range" type="range" min="5" max="90" step="1" value="20">
              <div class="g-clock-est-scale muted"><span>5s</span><span>90s</span></div>
              ${hist.length ? `<p class="g-clock-est-hint muted">Your planning bias so far: <b>${fmtPct(avg(hist))}</b></p>` : ''}
            </div>
            <button class="btn btn--primary btn--block g-clock-big g-clock-lock">🔒 Lock it in &amp; start</button>
          </div>`;
        const range = body.querySelector('.g-clock-range');
        const val = body.querySelector('.g-clock-est-val');
        range.addEventListener('input', () => { val.textContent = range.value; });
        let used = false;
        const go = () => {
          if (used) return;
          used = true;
          BG.fx.sound('pick');
          BG.fx.haptic();
          playTask(Number(range.value));
        };
        body.querySelector('.g-clock-lock').addEventListener('click', go);
        primary = go;
      }

      function playTask(estimate) {
        if (!ctx.alive || ended) return;
        primary = null;
        body.innerHTML = `
          <div class="g-clock-r3">
            <p class="g-clock-ask">${BG.esc(task.ask)}</p>
            <div class="g-clock-status">
              <span class="chip chip--blue">You said ${estimate}s</span>
              <span class="g-clock-hiddenclock">🙈 timer hidden</span>
              <span class="chip g-clock-count">0 / ${task.total}</span>
            </div>
            ${boardHTML(true)}
          </div>`;
        const countEl = body.querySelector('.g-clock-count');
        const board = body.querySelector('.g-clock-board');
        const t0 = performance.now();
        let found = 0;
        let finished = false;
        const cap = later(() => complete(performance.now()), 180000);

        const complete = (now) => {
          if (finished) return;
          finished = true;
          cancelLater(cap);
          showPlan(estimate, (now - t0) / 1000);
        };

        board.addEventListener('click', (e) => {
          const cell = e.target.closest('.g-clock-cell');
          if (!cell || finished || cell.classList.contains('is-found')) return;
          const now = performance.now();
          const item = task.items[Number(cell.dataset.i)];
          const right = task.mode === 'order' ? item.value === task.order[found] : item.target;
          if (!right) {
            BG.fx.sound('bad');
            BG.fx.shake(cell);
            return;
          }
          found++;
          cell.classList.add('is-found');
          if (task.mode === 'order') cell.dataset.n = found;
          countEl.textContent = `${found} / ${task.total}`;
          BG.fx.sound('pop');
          BG.fx.haptic(8);
          if (found >= task.total) {
            BG.fx.sound('good');
            complete(now);
          }
        });
      }

      function showPlan(estimate, actual) {
        if (!ctx.alive || ended) return;
        const pct = planPct(estimate, actual);
        const pts = planScore(estimate, actual);
        const hist = ctx.store.get('planHistory', []);
        hist.push(Math.round(pct));
        while (hist.length > 20) hist.shift();
        ctx.store.set('planHistory', hist);
        const bias = avg(hist);
        Object.assign(stats, {
          estimate, actual: Math.round(actual * 10) / 10, planPct: Math.round(pct), planBias: Math.round(bias), planScore: pts,
        });
        const shown = actual < 10 ? actual.toFixed(1) : Math.round(actual);
        const a = Math.abs(pct);
        const verdict = a < 5 ? 'spot on! 🎯'
          : pct > 0 ? `${Math.round(a)}% over. Most people underestimate!`
            : `${Math.round(a)}% under. You played it safe.`;
        const maxV = Math.max(estimate, actual);
        const bar = (v) => `${Math.max(4, (v / maxV) * 100).toFixed(1)}%`;
        body.innerHTML = `
          <div class="g-clock-r3">
            <div class="g-clock-plan card">
              <span class="label">Your plan vs reality</span>
              <div class="g-clock-bar"><span class="g-clock-bar-k">Guess</span><span class="g-clock-bar-track"><span class="g-clock-bar-fill is-est" style="width:${bar(estimate)}"></span></span><b>${estimate}s</b></div>
              <div class="g-clock-bar"><span class="g-clock-bar-k">Took</span><span class="g-clock-bar-track"><span class="g-clock-bar-fill is-act" style="width:${bar(actual)}"></span></span><b>${shown}s</b></div>
              <p class="g-clock-plan-line">You estimated <b>${estimate}s</b>, took <b>${shown}s</b> — ${verdict}</p>
            </div>
            <div class="g-clock-bias card">
              <span class="label">Your planning bias${hist.length > 1 ? ` · ${hist.length} tasks` : ' · first task'}</span>
              <p class="g-clock-bias-line"><b class="g-clock-bias-num ${bias > 8 ? 'is-over' : bias < -8 ? 'is-under' : 'is-ok'}">${fmtPct(bias)}</b> → ${BG.esc(biasAdvice(bias))}</p>
              <p class="muted g-clock-bias-note">Play again on other days to see your real pattern. Practice with feedback helps you notice your personal bias.</p>
            </div>
            <button class="btn btn--primary btn--block g-clock-big g-clock-done">See my results ⏳</button>
          </div>`;
        const plan = body.querySelector('.g-clock-plan');
        BG.fx.pop(plan);
        if (pts > 0) ctx.addScore(pts, plan);
        else BG.fx.float(plan, '+0', 'info');
        BG.fx.sound(pts >= 80 ? 'win' : pts >= 40 ? 'good' : 'bad');
        if (pts >= 90) BG.fx.confetti();
        let used = false;
        const go = () => {
          if (used) return;
          used = true;
          tap();
          end();
        };
        body.querySelector('.g-clock-done').addEventListener('click', go);
        primary = go;
      }

      function end() {
        if (ended) return;
        primary = null;
        const off = avg(errors.map(Math.abs));
        stats.avgOffSec = Math.round(off * 100) / 100;
        updateTitle();
        const best = ctx.store.get('bestOff', null);
        if (errors.length && (best === null || off < best)) ctx.store.set('bestOff', stats.avgOffSec);
        ended = true;
        const summary = `Off by ${off.toFixed(1)}s on average · planning bias ${fmtPct(stats.planBias)} ⏳`;
        ctx.finish({ summary, stats: { ...stats } });
      }

      const onKey = (e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || !primary) return;
        const t = e.target;
        if (t && t.nodeType === 1 && t !== document.body && t !== document.documentElement && !root.contains(t)) return; // e.g. the shell's own buttons
        e.preventDefault();
        primary(performance.now());
      };
      document.addEventListener('keydown', onKey);

      ctx.onDestroy(() => {
        ended = true;
        primary = null;
        document.removeEventListener('keydown', onKey);
        timeouts.forEach(clearTimeout);
        timeouts.clear();
        rafs.forEach((h) => { h.on = false; cancelAnimationFrame(h.id); });
        rafs.clear();
      });

      intro(1, 'Feel the seconds', '⏱️',
        'Start the stopwatch, and it <b>hides after 1 second</b>. Stop it exactly on the target. 4 tries, 3 to 15 seconds.',
        'Let\'s go', () => roundOne(0));
    },
  });
})();

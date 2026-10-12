// Brain Gym game: "90% Sure" (id 'range').
// Ten numeric questions. Stretch a net between two poles so you're 90% sure the true
// value (a fish 🐟) lands inside. Tight nets score more, but the real goal is calibration:
// catch about 9 of 10. Catching all 10 means your nets were too wide; 6 means too narrow.
(() => {
  'use strict';

  const ROUNDS = 10;
  const SECONDS = 35;
  const MAX_PTS = 40;
  const MIN_PTS = 5;

  // ---------------------------------------------------------------------------
  // Pure helpers (no DOM). Exported for node tests at the bottom.
  // ---------------------------------------------------------------------------
  const clean = (v) => Number(Number(v).toPrecision(12));
  const roundSig = (v, n) => (v === 0 ? 0 : clean(Number(v.toPrecision(n))));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // A board maps values on [min, max] to positions t on [0, 1]; log boards span 3 decades.
  function makeBoard(q) {
    const log = !!q.log && q.min > 0;
    const lo = log ? Math.log10(q.min) : q.min;
    const hi = log ? Math.log10(q.max) : q.max;
    const span = q.max - q.min;
    let step = Math.pow(10, Math.floor(Math.log10(span / 200)));
    if (!log && Number.isInteger(q.answer)) step = Math.max(1, step);
    step = clean(step);
    return {
      log,
      min: q.min,
      max: q.max,
      step,
      toT(v) {
        const x = log ? Math.log10(Math.max(v, q.min)) : v;
        return clamp((x - lo) / (hi - lo), 0, 1);
      },
      fromT(t) {
        const x = lo + clamp(t, 0, 1) * (hi - lo);
        return log ? Math.pow(10, x) : x;
      },
      // Snap a dragged value to something readable.
      snap(v) {
        const s = log ? roundSig(v, 2) : clean(Math.round(v / step) * step);
        return clamp(s, q.min, q.max);
      },
      // Typed values keep more precision.
      fine(v) {
        return clamp(roundSig(v, 5), q.min, q.max);
      },
    };
  }

  // Share of the board the net covers, scaled so a log board's points follow
  // 40 × (1 − log10(high/low) / 4) exactly (a 3-decade board: 0.75 × share = log10(h/l) / 4).
  function netWidth(board, low, high) {
    return 0.75 * Math.max(0, board.toT(high) - board.toT(low));
  }

  function pointsFor(board, low, high) {
    return Math.max(MIN_PTS, Math.round(MAX_PTS * (1 - netWidth(board, low, high))));
  }

  const caught = (q, low, high) => q.answer >= low && q.answer <= high;

  function calibrationBonus(n) {
    if (n === 9) return 100;
    if (n === 8 || n === 10) return 60;
    if (n === 7) return 30;
    return 0;
  }

  function dailySet(order, day, size = ROUNDS) {
    if (!order.length) return [];
    const start = (((day - 1) * size) % order.length + order.length) % order.length;
    const out = [];
    for (let k = 0; k < Math.min(size, order.length); k++) out.push(order[(start + k) % order.length]);
    return out;
  }

  function parseNum(str, isYear) {
    let s = String(str).trim().toLowerCase().replace(/[−–]/g, '-').replace(/[,\s_]/g, '');
    let bc = false;
    if (isYear && /(bce|bc)$/.test(s)) {
      bc = true;
      s = s.replace(/(bce|bc)$/, '');
    }
    if (isYear) s = s.replace(/(ce|ad)$/, '').replace(/^(ad|ce)/, '');
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    const v = parseFloat(s);
    return bc ? -Math.abs(v) : v;
  }

  const engine = { makeBoard, netWidth, pointsFor, caught, calibrationBonus, dailySet, parseNum };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const POOL = ((window.BG_DATA_RANGE && window.BG_DATA_RANGE.questions) || []).filter(
    (q) => q && typeof q.answer === 'number' && q.min < q.answer && q.answer < q.max,
  );
  const DAILY_ORDER = BG.shuffle(POOL, BG.rng(BG.hash('range-daily-v1')));

  const isYear = (q) => q.unit === 'year';
  const TIGHT_UNITS = ['%', '°', '×'];

  function fmtNum(v) {
    const s = Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 3 });
    return v < 0 ? `−${s}` : s;
  }
  function fmtPlain(v, q) {
    if (isYear(q)) return v < 0 ? `${-v} BC` : v < 1000 ? `AD ${v}` : String(v);
    return fmtNum(v);
  }
  function fmtVal(v, q) {
    const n = fmtPlain(v, q);
    if (isYear(q) || !q.unit) return n;
    return TIGHT_UNITS.includes(q.unit) ? `${n}${q.unit}` : `${n} ${q.unit}`;
  }
  function unitLabel(q) {
    if (isYear(q)) return 'Answer: a year';
    if (!q.unit) return 'Answer: a number';
    return `Answer in ${q.unit}`;
  }
  function netWord(pts) {
    if (pts >= 34) return 'Razor-thin net';
    if (pts >= 26) return 'Snug net';
    if (pts >= 16) return 'Roomy net';
    return 'Giant net';
  }

  function verdict(n) {
    if (n === 10) return {
      line: 'Every fish caught, but your nets were too wide: you\'re underconfident. Tighten them up and you\'ll score more.',
      summary: 'Caught 10/10 fish, nets a bit too wide 🎣',
      kind: 'warn',
    };
    if (n === 9) return {
      line: 'Perfectly calibrated 🎯 When you said 90%, you meant 90%.',
      summary: 'Caught 9/10 fish, perfectly calibrated 🎯',
      kind: 'ok',
    };
    if (n === 8) return {
      line: 'So close! A touch overconfident: widen your nets a little.',
      summary: 'Caught 8/10 fish, nearly calibrated',
      kind: 'ok',
    };
    if (n === 7) return {
      line: 'You\'re overconfident: widen your nets.',
      summary: 'Caught 7/10 fish, nets too narrow',
      kind: 'warn',
    };
    return {
      line: 'You\'re overconfident: widen your nets. Most people\'s "90% sure" only catches 4 to 6 of 10, so you\'re in good company.',
      summary: `Caught ${n}/10 fish, nets too narrow`,
      kind: 'bad',
    };
  }

  BG.registerGame({
    id: 'range',
    name: '90% Sure',
    emoji: '🎯',
    skill: 'Knowing what you don\'t know',
    category: 'brain',
    tagline: 'Cast a net so you\'re 90% sure the answer swims in. Not 100. Not 60.',
    howTo: [
      'Each question has a number answer. Drag the two poles (or type) to stretch your net.',
      'Make it wide enough that you\'re 90% sure the truth lands inside.',
      'Caught fish score more when the net is tight. Missed fish score 0.',
      'Aim to catch 9 of 10: that earns the big calibration bonus.',
    ],
    science:
      'Most people\'s "90% sure" ranges hold the truth only 40–60% of the time. Feedback training fixes it: in a large forecasting tournament, training plus teamwork cut overconfidence to about 1% (Moore et al., Management Science 2017).',
    scienceUrl: 'https://dlab.sauder.ubc.ca/sjdm/journal/14/141223/jdm141223.html',
    minutes: 4,
    maxScore: ROUNDS * MAX_PTS + 100,

    mount(root, ctx) {
      const questions =
        ctx.mode === 'daily' ? dailySet(DAILY_ORDER, ctx.day) : BG.shuffle(POOL, ctx.rand).slice(0, ROUNDS);
      const total = questions.length;
      const log = []; // {q, low, high, hit, pts}
      let idx = 0;
      let q = null;
      let board = null;
      let low = 0;
      let high = 0;
      let phase = 'aim'; // 'aim' | 'reveal' | 'done'
      let timer = null;
      let drag = null; // {which, pointerId}
      let finished = false;

      root.innerHTML = '';
      const wrap = BG.el(`
        <div class="g-range">
          <div class="g-range-top">
            <span class="label g-range-round"></span>
            <span class="chip chip--blue g-range-tally" aria-live="polite"></span>
          </div>
          <p class="g-range-aim">🎯 Aim to catch <b>9 of 10</b>. All 10 means your nets were too wide; 6 means too narrow.</p>
          <div class="g-range-timer"></div>
          <div class="card g-range-qcard">
            <p class="g-range-q"></p>
            <span class="chip chip--gold g-range-unit"></span>
          </div>
          <div class="panel g-range-pond">
            <div class="g-range-stage">
              <div class="g-range-rail">
                <div class="g-range-water" aria-hidden="true"></div>
                <div class="g-range-net" aria-hidden="true"></div>
                <div class="g-range-truth" aria-hidden="true" hidden></div>
                <span class="g-range-fish" aria-hidden="true">🐟</span>
                <span class="g-range-splash" aria-hidden="true">💦</span>
                <div class="g-range-handle g-range-handle--lo" data-h="lo" role="slider" tabindex="0" aria-label="Low end of your net"><span class="g-range-knob">◀</span></div>
                <div class="g-range-handle g-range-handle--hi" data-h="hi" role="slider" tabindex="0" aria-label="High end of your net"><span class="g-range-knob">▶</span></div>
              </div>
            </div>
            <div class="g-range-axis" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
          <div class="g-range-inputs">
            <label class="g-range-field">
              <span class="label">Low</span>
              <input class="g-range-in g-range-in--lo" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="Low end of your net">
            </label>
            <span class="g-range-to" aria-hidden="true">to</span>
            <label class="g-range-field">
              <span class="label">High</span>
              <input class="g-range-in g-range-in--hi" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="High end of your net">
            </label>
          </div>
          <div class="g-range-worth">
            <span class="g-range-worthtext"></span>
            <div class="g-range-meter" aria-hidden="true"><div class="g-range-meterfill"></div></div>
          </div>
          <button class="btn btn--primary btn--block g-range-cast">Cast the net 🎣</button>
          <div class="g-range-result" aria-live="polite" hidden></div>
          <div class="g-range-end" hidden></div>
        </div>`);
      root.appendChild(wrap);

      const $ = (s) => wrap.querySelector(s);
      const roundEl = $('.g-range-round');
      const tallyEl = $('.g-range-tally');
      const aimEl = $('.g-range-aim');
      const timerHost = $('.g-range-timer');
      const qcard = $('.g-range-qcard');
      const qEl = $('.g-range-q');
      const unitEl = $('.g-range-unit');
      const pond = $('.g-range-pond');
      const rail = $('.g-range-rail');
      const net = $('.g-range-net');
      const truth = $('.g-range-truth');
      const fish = $('.g-range-fish');
      const splash = $('.g-range-splash');
      const hLo = $('.g-range-handle--lo');
      const hHi = $('.g-range-handle--hi');
      const axis = wrap.querySelectorAll('.g-range-axis span');
      const inLo = $('.g-range-in--lo');
      const inHi = $('.g-range-in--hi');
      const inputsEl = $('.g-range-inputs');
      const worthEl = $('.g-range-worth');
      const worthText = $('.g-range-worthtext');
      const meterFill = $('.g-range-meterfill');
      const castBtn = $('.g-range-cast');
      const resultEl = $('.g-range-result');
      const endEl = $('.g-range-end');

      const hitCount = () => log.filter((r) => r.hit).length;

      function renderTally() {
        tallyEl.textContent = `🐟 Caught ${hitCount()} / ${log.length}`;
      }

      // ---------- net rendering ----------
      function render() {
        const tl = board.toT(low);
        const th = board.toT(high);
        hLo.style.left = `${tl * 100}%`;
        hHi.style.left = `${th * 100}%`;
        net.style.left = `${tl * 100}%`;
        net.style.width = `${Math.max(0, th - tl) * 100}%`;
        // Keep the low knob reachable when both sit at the right edge.
        hLo.classList.toggle('is-top', tl > 0.5 && th - tl < 0.08);
        [[hLo, low], [hHi, high]].forEach(([h, v]) => {
          h.setAttribute('aria-valuemin', String(board.min));
          h.setAttribute('aria-valuemax', String(board.max));
          h.setAttribute('aria-valuenow', String(v));
          h.setAttribute('aria-valuetext', fmtVal(v, q));
        });
        if (document.activeElement !== inLo) inLo.value = fmtPlain(low, q);
        if (document.activeElement !== inHi) inHi.value = fmtPlain(high, q);
        const pts = pointsFor(board, low, high);
        worthText.innerHTML = `${netWord(pts)} · if caught <b>+${pts}</b>`;
        meterFill.style.transform = `scaleX(${pts / MAX_PTS})`;
      }

      function setValue(which, v) {
        if (phase !== 'aim' || !Number.isFinite(v)) return;
        if (which === 'lo') low = Math.min(v, high);
        else high = Math.max(v, low);
        render();
      }

      // ---------- pointer (touch + mouse) ----------
      function tFromEvent(e) {
        const r = rail.getBoundingClientRect();
        return clamp((e.clientX - r.left) / r.width, 0, 1);
      }
      function onDown(e) {
        if (phase !== 'aim' || (e.button != null && e.button > 0)) return;
        const t = tFromEvent(e);
        const handle = e.target.closest('.g-range-handle');
        let which;
        if (handle) which = handle.dataset.h;
        else {
          const tl = board.toT(low);
          const th = board.toT(high);
          const dl = Math.abs(t - tl);
          const dh = Math.abs(t - th);
          which = dl < dh ? 'lo' : dh < dl ? 'hi' : t < tl ? 'lo' : 'hi';
        }
        e.preventDefault();
        drag = { which, id: e.pointerId };
        try {
          rail.setPointerCapture(e.pointerId);
        } catch {
          /* capture unsupported */
        }
        (which === 'lo' ? hLo : hHi).focus({ preventScroll: true });
        rail.classList.add('is-dragging');
        BG.fx.sound('tap');
        BG.fx.haptic(6);
        setValue(which, board.snap(board.fromT(t)));
      }
      function onMove(e) {
        if (!drag || e.pointerId !== drag.id) return;
        e.preventDefault();
        setValue(drag.which, board.snap(board.fromT(tFromEvent(e))));
      }
      function onUp(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        rail.classList.remove('is-dragging');
        try {
          rail.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
      }
      rail.addEventListener('pointerdown', onDown);
      rail.addEventListener('pointermove', onMove);
      rail.addEventListener('pointerup', onUp);
      rail.addEventListener('pointercancel', onUp);

      // ---------- keyboard ----------
      function nudge(which, dir, big) {
        const cur = which === 'lo' ? low : high;
        let next = cur;
        if (!board.log) {
          next = clamp(cur + dir * board.step * (big ? 10 : 1), board.min, board.max);
          next = Math.round(next / board.step) * board.step;
          next = Number(next.toPrecision(12));
        } else {
          const t0 = board.toT(cur);
          const dt = big ? 0.05 : 0.004;
          for (let k = 1; k <= 60 && next === cur; k++) {
            const tt = t0 + dir * dt * k;
            if (tt < 0 || tt > 1) {
              next = dir < 0 ? board.min : board.max;
              break;
            }
            next = board.snap(board.fromT(tt));
          }
        }
        setValue(which, next);
      }
      function onHandleKey(e) {
        if (phase !== 'aim') return;
        const which = e.currentTarget.dataset.h;
        const big = e.shiftKey || e.key === 'PageUp' || e.key === 'PageDown';
        if (['ArrowRight', 'ArrowUp', 'PageUp'].includes(e.key)) nudge(which, 1, big);
        else if (['ArrowLeft', 'ArrowDown', 'PageDown'].includes(e.key)) nudge(which, -1, big);
        else if (e.key === 'Home') setValue(which, which === 'lo' ? board.min : low);
        else if (e.key === 'End') setValue(which, which === 'hi' ? board.max : high);
        else if (e.key === 'Enter') {
          cast(false);
        } else return;
        e.preventDefault();
      }
      hLo.addEventListener('keydown', onHandleKey);
      hHi.addEventListener('keydown', onHandleKey);

      // ---------- typed values ----------
      function commitInput(input, which) {
        const v = parseNum(input.value, isYear(q));
        if (Number.isFinite(v)) {
          const clamped = board.fine(v);
          if (clamped !== v) BG.fx.toast(`This board runs from ${fmtVal(board.min, q)} to ${fmtVal(board.max, q)}`);
          if (which === 'lo' && clamped > high) {
            high = clamped;
            low = clamped;
            render();
          } else if (which === 'hi' && clamped < low) {
            low = clamped;
            high = clamped;
            render();
          } else setValue(which, clamped);
        } else {
          BG.fx.shake(input);
        }
        input.value = fmtPlain(which === 'lo' ? low : high, q);
      }
      [[inLo, 'lo'], [inHi, 'hi']].forEach(([input, which]) => {
        input.addEventListener('change', () => phase === 'aim' && commitInput(input, which));
        input.addEventListener('focus', () => input.select());
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (phase === 'aim') commitInput(input, which);
            input.blur();
          }
        });
      });

      castBtn.addEventListener('click', () => cast(false));

      // ---------- round flow ----------
      function startRound() {
        q = questions[idx];
        board = makeBoard(q);
        phase = 'aim';
        ctx.setProgress(idx + 1, total);
        roundEl.textContent = `Fish ${idx + 1} of ${total}`;
        renderTally();
        qEl.textContent = q.q;
        unitEl.textContent = unitLabel(q);
        BG.fx.pop(qcard);
        // Start with a medium net in the middle of the board.
        low = board.snap(board.fromT(0.32));
        high = board.snap(board.fromT(0.68));
        if (high <= low) high = board.snap(board.fromT(0.75));
        axis[0].textContent = fmtPlain(board.min, q);
        axis[1].textContent = fmtPlain(board.snap(board.fromT(0.5)), q);
        axis[2].textContent = fmtPlain(board.max, q);
        pond.classList.remove('is-caught', 'is-missed');
        rail.classList.remove('is-locked');
        fish.className = 'g-range-fish';
        fish.style.left = '';
        splash.className = 'g-range-splash';
        truth.hidden = true;
        resultEl.hidden = true;
        resultEl.innerHTML = '';
        [inLo, inHi].forEach((i) => (i.disabled = false));
        inputsEl.hidden = false;
        worthEl.hidden = false;
        castBtn.hidden = false;
        castBtn.disabled = false;
        render();
        if (timer) timer.stop();
        timerHost.innerHTML = '';
        timer = BG.timerBar(timerHost, SECONDS);
        const myIdx = idx;
        timer.done.then(() => {
          if (!ctx.alive || phase !== 'aim' || idx !== myIdx) return;
          BG.fx.toast('Time! Your net was cast where it was.');
          cast(true);
        });
      }

      async function cast(timedOut) {
        if (phase !== 'aim') return;
        // Pick up anything still typed in a box.
        if (document.activeElement === inLo) commitInput(inLo, 'lo');
        if (document.activeElement === inHi) commitInput(inHi, 'hi');
        phase = 'reveal';
        if (timer) timer.stop();
        castBtn.disabled = true;
        [inLo, inHi].forEach((i) => (i.disabled = true));
        rail.classList.add('is-locked');
        BG.fx.sound('pick');
        BG.fx.haptic(10);

        const hit = caught(q, low, high);
        const pts = hit ? pointsFor(board, low, high) : 0;
        const row = { q, low, high, hit, pts, timedOut };
        log.push(row);

        const tA = board.toT(q.answer);
        fish.style.left = `${tA * 100}%`;
        truth.style.left = `${tA * 100}%`;
        splash.style.left = `${tA * 100}%`;
        await BG.sleep(120);
        if (!ctx.alive) return;
        fish.classList.add('is-drop');
        await BG.sleep(620);
        if (!ctx.alive) return;
        truth.hidden = false;
        BG.fx.anim(splash, 'is-on');
        if (hit) {
          fish.classList.add('is-caught');
          pond.classList.add('is-caught');
          BG.fx.pop(net);
          BG.fx.sound('good');
          BG.fx.haptic(24);
          ctx.addScore(pts, fish);
        } else {
          fish.classList.add(q.answer < low ? 'is-away-left' : 'is-away-right');
          pond.classList.add('is-missed');
          BG.fx.shake(net);
          BG.fx.sound('bad');
          BG.fx.haptic(30);
          BG.fx.float(fish, 'Got away!', 'bad');
        }
        renderTally();
        BG.fx.pop(tallyEl);

        await BG.sleep(450);
        if (!ctx.alive) return;
        showResult(row);
      }

      function showResult(row) {
        const last = idx === total - 1;
        const miss = row.hit
          ? ''
          : row.q.answer < row.low
            ? 'The truth was below your net.'
            : 'The truth was above your net.';
        inputsEl.hidden = true;
        worthEl.hidden = true;
        castBtn.hidden = true;
        resultEl.hidden = false;
        resultEl.innerHTML = `
          <div class="card g-range-res g-range-res--${row.hit ? 'ok' : 'bad'}">
            <p class="g-range-verdict">${row.hit ? `Caught! +${row.pts}` : 'It got away… +0'}</p>
            <p class="g-range-truthline">Truth: <b>${BG.esc(fmtVal(row.q.answer, row.q))}</b></p>
            <p class="g-range-yours">Your net: ${BG.esc(fmtVal(row.low, row.q))} to ${BG.esc(fmtVal(row.high, row.q))}${row.timedOut ? ' (time ran out)' : ''}${miss ? `. ${miss}` : ''}</p>
            ${row.q.source ? `<p class="g-range-src">Source: ${BG.esc(row.q.source)}</p>` : ''}
            <button class="btn btn--primary btn--block g-range-next">${last ? 'See your net report' : 'Next fish →'}</button>
          </div>`;
        const next = resultEl.querySelector('.g-range-next');
        next.addEventListener('click', advance);
        next.focus({ preventScroll: true });
      }

      function advance() {
        if (!ctx.alive || phase !== 'reveal') return;
        BG.fx.sound('tap');
        if (idx < total - 1) {
          idx++;
          if (idx === 1) aimEl.classList.add('is-small');
          startRound();
          wrap.scrollIntoView({ block: 'start', behavior: 'smooth' });
          return;
        }
        showEnd();
      }

      // ---------- net report ----------
      async function showEnd() {
        phase = 'done';
        const n = hitCount();
        const bonus = total === ROUNDS ? calibrationBonus(n) : 0;
        const v = verdict(n);
        const totals = ctx.store.get('totals', { games: 0, caught: 0, asked: 0 });
        totals.games += 1;
        totals.caught += n;
        totals.asked += total;
        ctx.store.set('totals', totals);
        BG.track('range_done', { caught: n, mode: ctx.mode });

        if (timer) timer.stop();
        Array.from(wrap.children).forEach((c) => {
          if (c !== endEl) c.hidden = true;
        });
        endEl.hidden = false;
        const dots = log
          .map((r, i) => `<span class="g-range-dot ${r.hit ? 'is-hit' : 'is-miss'}" style="--i:${i}" title="${r.hit ? 'Caught' : 'Missed'}">${r.hit ? '🐟' : '·'}</span>`)
          .join('');
        const rows = log
          .map(
            (r) => `
            <li class="g-range-row ${r.hit ? 'is-hit' : 'is-miss'}">
              <span class="g-range-rowmark" aria-label="${r.hit ? 'Caught' : 'Missed'}">${r.hit ? '✓' : '✗'}</span>
              <div class="g-range-rowbody">
                <p class="g-range-rowq">${BG.esc(r.q.q)}</p>
                <p class="g-range-rowvals">Net ${BG.esc(fmtVal(r.low, r.q))} to ${BG.esc(fmtVal(r.high, r.q))} · Truth <b>${BG.esc(fmtVal(r.q.answer, r.q))}</b></p>
              </div>
              <span class="g-range-rowpts">${r.hit ? `+${r.pts}` : '0'}</span>
            </li>`,
          )
          .join('');
        const pct = totals.asked ? Math.round((totals.caught / totals.asked) * 100) : 0;
        endEl.innerHTML = `
          <div class="card g-range-endcard">
            <p class="label">Net report</p>
            <div class="g-range-big"><span class="big-num">${n}</span><span class="g-range-of">/ ${total} caught</span></div>
            <div class="g-range-dots" aria-hidden="true">${dots}</div>
            <div class="g-range-calib" aria-hidden="true">
              <span class="g-range-calibzone"></span>
              <span class="g-range-calibpin" style="left:${(n / total) * 100}%"></span>
            </div>
            <div class="g-range-caliblabels" aria-hidden="true"><span>0 · too narrow</span><span>10 · too wide</span></div>
            <div class="g-range-bonus"></div>
            <p class="g-range-verdictline g-range-verdictline--${v.kind}">${BG.esc(v.line)}</p>
            ${totals.games > 1 ? `<p class="g-range-alltime muted">All-time: ${totals.caught} of ${totals.asked} fish (${pct}%). Target: 90%.</p>` : ''}
          </div>
          <ol class="g-range-report">${rows}</ol>
          <button class="btn btn--primary btn--block g-range-finish">See results</button>`;
        BG.fx.sound(n >= 8 && n <= 10 ? 'win' : 'lose');
        if (n === 9) BG.fx.confetti();

        const bonusEl = endEl.querySelector('.g-range-bonus');
        await BG.sleep(500);
        if (!ctx.alive) return;
        const chip = BG.el(
          `<span class="chip ${bonus ? 'chip--gold' : 'chip--warn'} g-range-bonuschip">${bonus ? `Calibration bonus +${bonus}` : 'No calibration bonus this time'}</span>`,
        );
        bonusEl.appendChild(chip);
        BG.fx.pop(chip);
        if (bonus) {
          ctx.addScore(bonus, chip);
          BG.fx.sound('good');
        }

        const fin = endEl.querySelector('.g-range-finish');
        fin.addEventListener('click', () => {
          if (finished || !ctx.alive) return;
          finished = true;
          ctx.finish({ summary: v.summary, stats: { caught: n } });
        });
        fin.focus({ preventScroll: true });
      }

      ctx.onDestroy(() => {
        if (timer) timer.stop();
        drag = null;
      });

      if (!total) {
        wrap.innerHTML = '<p class="g-range-aim">No questions loaded.</p>';
        return;
      }
      startRound();
    },
  });
})();

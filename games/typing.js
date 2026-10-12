// Brain Gym game: "Type Dojo" (id 'typing').
// Three drills (warm-up keys, word rain, sprint) and a personal belt ladder earned by
// net WPM at 95%+ accuracy. Works with physical keyboards and on-screen keyboards
// (reads the input's value diff, never relies on keydown alone).
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure engine (no DOM). Exported for node tests at the bottom.
  // ---------------------------------------------------------------------------
  const BELTS = [
    { key: 'white', name: 'White', wpm: 20 },
    { key: 'yellow', name: 'Yellow', wpm: 30 },
    { key: 'orange', name: 'Orange', wpm: 40 },
    { key: 'green', name: 'Green', wpm: 50 },
    { key: 'blue', name: 'Blue', wpm: 60 },
    { key: 'brown', name: 'Brown', wpm: 70 },
    { key: 'black', name: 'Black', wpm: 80 },
  ];
  const QUAL_ACC = 0.95;
  const MIN_QUAL_KEYS = 40;
  const HOME = 'asdfghjkl';

  // Smart punctuation from mobile keyboards → plain ASCII.
  const normText = (s) =>
    String(s)
      .replace(/[‘’ʼ`´]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/[   ]/g, ' ');

  // Words per minute: a "word" is 5 characters.
  const wpm = (chars, ms) => (ms > 0 ? chars / 5 / (ms / 60000) : 0);
  const accuracy = (ok, total) => (total > 0 ? ok / total : 0);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  const warmPoints = (acc, keys) => Math.round(100 * clamp(acc, 0, 1) * Math.min(1, keys / 40));
  const rainPoints = (zapped) => zapped * 10;
  const sprintPoints = (net, acc) => Math.round(Math.min(300, Math.max(0, net) * 3) * clamp(acc, 0, 1) ** 2);

  // A typing session over one target text. Mistakes must be fixed (backspace) before moving on:
  // at most `maxErrRun` characters may be typed past the first wrong one.
  function makeTyper(target, { caseInsensitive = false, maxErrRun = 6 } = {}) {
    const eq = (a, b) => (caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b);
    const words = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(target))) {
      let end = m.index + m[0].length;
      const coreEnd = end;
      while (end < target.length && target[end] === ' ') end++;
      words.push({ s: m.index, core: coreEnd, e: end });
    }
    const t = {
      target,
      typed: '',
      keys: 0,
      okKeys: 0,
      erred: new Set(), // positions where a fresh mistake was made
      badIndex(str = t.typed) {
        for (let i = 0; i < str.length; i++) if (i >= target.length || !eq(str[i], target[i])) return i;
        return -1;
      },
      correctLen() {
        const b = t.badIndex();
        return b === -1 ? t.typed.length : b;
      },
      done() {
        return t.typed.length === target.length && t.badIndex() === -1;
      },
      // Characters of words typed correctly with no mistake along the way (net WPM numerator).
      netChars() {
        const ok = t.correctLen();
        let n = 0;
        for (const w of words) {
          if (ok < w.core) break;
          let dirty = false;
          for (let i = w.s; i < w.e; i++) if (t.erred.has(i)) dirty = true;
          if (dirty) continue;
          n += ok >= w.e ? w.e - w.s : w.core - w.s;
        }
        return n;
      },
      // Feed the input's full new value. Works out what was added/removed from the diff.
      apply(raw) {
        const value = normText(raw);
        let p = 0;
        while (p < t.typed.length && p < value.length && t.typed[p] === value[p]) p++;
        let typed = t.typed.slice(0, p);
        let bad = t.badIndex(typed);
        const events = [];
        let blocked = false;
        for (const ch of value.slice(p)) {
          const pos = typed.length;
          if (pos >= target.length) {
            blocked = true;
            break;
          }
          if (bad !== -1 && pos - bad >= maxErrRun) {
            blocked = true;
            break;
          }
          const counted = bad === -1; // keys typed after an unfixed mistake still count as wrong
          const ok = counted && eq(ch, target[pos]);
          t.keys++;
          if (ok) t.okKeys++;
          else {
            if (counted) {
              t.erred.add(pos);
              bad = pos;
            }
          }
          events.push({ pos, ch, expected: target[pos], ok, counted });
          typed += ch;
        }
        t.typed = typed;
        return { value: typed, events, blocked, done: t.done() };
      },
    };
    return t;
  }

  // Belt from best qualifying WPM. idx −1 = no belt yet.
  function beltInfo(best) {
    let idx = -1;
    BELTS.forEach((b, i) => {
      if (best >= b.wpm) idx = i;
    });
    const belt = idx >= 0 ? BELTS[idx] : null;
    const next = BELTS[idx + 1] || null;
    const from = belt ? belt.wpm : 0;
    const pct = next ? clamp(Math.floor(((best - from) / (next.wpm - from)) * 100), 0, 99) : 100;
    return { idx, belt, next, pct };
  }
  const qualifies = (net, acc, keys) => acc >= QUAL_ACC && keys >= MIN_QUAL_KEYS;

  // stats: {key: {n, err}} → weakest keys (needs at least one error and some data).
  function weakKeys(stats, count = 3) {
    return Object.entries(stats || {})
      .filter(([k, v]) => /^[a-z]$/.test(k) && v && v.err > 0 && v.n >= 3)
      .map(([k, v]) => ({ key: k, n: v.n, err: v.err, rate: v.err / v.n, score: (v.err + 0.5) / (v.n + 5) }))
      .sort((a, b) => b.score - a.score || b.err - a.err)
      .slice(0, count);
  }

  function mergeStats(into, add) {
    const out = Object.assign({}, into || {});
    Object.entries(add || {}).forEach(([k, v]) => {
      const row = Object.assign({ n: 0, err: 0 }, out[k]);
      row.n += v.n;
      row.err += v.err;
      // Let old history fade so improvement shows up.
      if (row.n > 120) {
        row.n = Math.round(row.n / 2);
        row.err = Math.round(row.err / 2);
      }
      out[k] = row;
    });
    return out;
  }

  // Warm-up stream: letter clusters + real words that drill the focus keys.
  function buildWarmup(focus, words, rand, len = 170) {
    const keys = focus && focus.length ? focus.slice(0, 4) : null;
    const pickC = (s) => s[Math.floor(rand() * s.length)];
    const pool = keys
      ? words.filter((w) => w.length >= 3 && w.length <= 6 && keys.some((k) => w.includes(k)))
      : words.filter((w) => w.length >= 2 && /^[asdfghjkl]+$/.test(w));
    const items = [];
    let size = 0;
    let i = 0;
    while (size < len) {
      let item;
      if (i % 3 === 2 && pool.length) item = pickC(pool);
      else {
        const n = 3 + Math.floor(rand() * 3);
        let s = '';
        for (let j = 0; j < n; j++) s += keys && rand() < 0.6 ? pickC(keys) : pickC(HOME);
        if (keys && !keys.some((k) => s.includes(k))) s = pickC(keys) + s.slice(1);
        item = s;
      }
      if (items[items.length - 1] === item) continue;
      items.push(item);
      size += item.length + 1;
      i++;
    }
    return items.join(' ');
  }

  // Word rain timeline: spawns get denser and falls get faster.
  const RAIN_WORDS = 20;
  const RAIN_SECS = 60;
  const spawnTimes = (n = RAIN_WORDS) => Array.from({ length: n }, (_, i) => 1.2 + 53.5 * (i / (n - 1)) ** 0.75);
  const fallSecs = (t) => 9 - 5 * clamp(t / RAIN_SECS, 0, 1);
  const lenBand = (t) => (t < 15 ? [3, 4] : t < 35 ? [3, 6] : [4, 9]);

  // Daily sprint passages: 2 per day from a fixed shuffle, so 60 passages = no repeat for 30 days.
  function dailyPassageIndex(day, k, n, order) {
    return order[(2 * (Math.max(1, day) - 1) + k) % n];
  }

  const engine = {
    BELTS, wpm, accuracy, warmPoints, rainPoints, sprintPoints, makeTyper, beltInfo, qualifies,
    weakKeys, mergeStats, buildWarmup, spawnTimes, fallSecs, dailyPassageIndex, normText,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const WARM_SECS = 30;
  const SPRINT_SECS = 45;
  const DRILLS = [
    { id: 'warm', emoji: '🔥', name: 'Warm-up keys', secs: WARM_SECS, blurb: 'Type the letter stream. It targets your weakest keys. Accuracy is everything here.' },
    { id: 'rain', emoji: '🌧️', name: 'Word rain', secs: RAIN_SECS, blurb: 'Words fall from the sky. Type one to zap it before it hits the ground. 3 lives!' },
    { id: 'sprint', emoji: '⚡', name: 'Sprint', secs: SPRINT_SECS, blurb: 'Type the passage. Red letters must be fixed with Backspace before you move on.' },
  ];

  BG.registerGame({
    id: 'typing',
    name: 'Type Dojo',
    emoji: '⌨️',
    skill: 'Fast, accurate typing',
    category: 'cool',
    tagline: 'Three drills, three minutes. Earn your way from white belt to black belt.',
    howTo: [
      'Warm-up keys (30s): a letter stream aimed at your weakest keys.',
      'Word rain (60s): type falling words to zap them. 3 lives.',
      'Sprint (45s): type a passage. Fix red letters with Backspace.',
      'Belts are earned by Sprint WPM at 95%+ accuracy: 20, 30, 40… up to 80 for black.',
    ],
    science:
      'In a study of 30 typists, speed depended less on formal touch typing than on keeping the hands still and always using the same finger for each key. Accuracy and consistency mattered most (Feit, Weir & Oulasvirta, CHI 2016).',
    scienceUrl: 'https://userinterfaces.aalto.fi/how-we-type/',
    minutes: 3,
    maxScore: 600,

    mount(root, ctx) {
      const data = window.BG_DATA_TYPING || { words: [], passages: [] };
      const WORDS = data.words.length ? data.words : ['type', 'dojo', 'keys', 'fast', 'calm'];
      const PASSAGES = data.passages.length ? data.passages : ['Keep your hands still and use the same finger for each key.'];
      const touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

      // ---------- cleanup plumbing ----------
      const timeouts = new Set();
      let rafId = 0;
      let timer = null;
      let docKey = null;
      const later = (fn, ms) => {
        const t = setTimeout(() => {
          timeouts.delete(t);
          if (ctx.alive) fn();
        }, ms);
        timeouts.add(t);
        return t;
      };
      const sleep = (ms) => new Promise((r) => later(r, ms));
      ctx.onDestroy(() => {
        timeouts.forEach(clearTimeout);
        timeouts.clear();
        cancelAnimationFrame(rafId);
        if (timer) timer.stop();
        if (docKey) document.removeEventListener('keydown', docKey);
      });

      // ---------- persistent state ----------
      const storedStats = ctx.store.get('keys', {});
      const bestBefore = ctx.store.get('best', 0);
      const sessionStats = {};
      const recordKey = (expected, ok) => {
        const k = String(expected || '').toLowerCase();
        if (!/^[a-z]$/.test(k)) return;
        const row = sessionStats[k] || (sessionStats[k] = { n: 0, err: 0 });
        row.n++;
        if (!ok) row.err++;
      };
      const results = { warm: null, rain: null, sprint: null };

      // ---------- layout ----------
      const beltNow = beltInfo(bestBefore);
      root.innerHTML = '';
      const wrap = BG.el(`
        <div class="g-typing">
          <div class="g-typing-top">
            <span class="chip g-typing-beltchip"></span>
            <span class="chip chip--blue g-typing-drillchip"></span>
          </div>
          <p class="g-typing-note" ${touchOnly ? '' : 'hidden'}>📱 Best on a laptop — the mobile version trains your thumbs!</p>
          <div class="g-typing-timer"></div>
          <div class="g-typing-stage" aria-live="polite"></div>
          <div class="g-typing-inrow">
            <input class="g-typing-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off"
              spellcheck="false" enterkeyhint="go" inputmode="text" aria-label="Type here" placeholder="Tap here to type">
          </div>
          <p class="g-typing-hint"></p>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const stage = $('.g-typing-stage');
      const input = $('.g-typing-input');
      const hint = $('.g-typing-hint');
      const timerHost = $('.g-typing-timer');
      const beltChip = $('.g-typing-beltchip');
      const drillChip = $('.g-typing-drillchip');
      const setBeltChip = (info) => {
        beltChip.className = `chip g-typing-beltchip g-typing-belt--${info.belt ? info.belt.key : 'none'}`;
        beltChip.innerHTML = `<span class="g-typing-beltdot" aria-hidden="true"></span>${info.belt ? `${info.belt.name} belt` : 'No belt yet'}`;
      };
      setBeltChip(beltNow);

      // One input for the whole game. Handlers swap per drill.
      let onInput = null;
      let onEnter = null;
      const focusInput = () => {
        try {
          input.focus({ preventScroll: true });
        } catch {
          input.focus();
        }
      };
      input.addEventListener('input', () => {
        if (onInput) onInput();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (onEnter) onEnter();
        }
      });
      input.addEventListener('paste', (e) => e.preventDefault());
      input.addEventListener('drop', (e) => e.preventDefault());
      input.addEventListener('blur', () => {
        if (onInput) wrap.classList.add('is-blurred');
      });
      input.addEventListener('focus', () => wrap.classList.remove('is-blurred'));
      stage.addEventListener('pointerdown', (e) => {
        if (onInput && !e.target.closest('button')) {
          e.preventDefault();
          focusInput();
        }
      });

      let lastErrSound = 0;
      const errFx = () => {
        const now = performance.now();
        if (now - lastErrSound > 120) {
          lastErrSound = now;
          BG.fx.sound('tick');
        }
        BG.fx.haptic(10);
      };

      // ---------- flow ----------
      async function run() {
        for (let i = 0; i < DRILLS.length; i++) {
          const d = DRILLS[i];
          ctx.setProgress(i + 1, DRILLS.length);
          drillChip.textContent = `${d.emoji} ${i + 1}/3 ${d.name}`;
          await intro(d, i);
          if (!ctx.alive) return;
          await countdown();
          if (!ctx.alive) return;
          if (d.id === 'warm') results.warm = await typingDrill('warm');
          else if (d.id === 'rain') results.rain = await rainDrill();
          else results.sprint = await typingDrill('sprint');
          if (!ctx.alive) return;
          await sleep(500);
          if (!ctx.alive) return;
        }
        ending();
      }

      function intro(d, i) {
        return new Promise((resolve) => {
          onInput = null;
          onEnter = null;
          input.value = '';
          hint.textContent = touchOnly ? '' : 'Press Enter to start';
          const extra =
            d.id === 'warm'
              ? (() => {
                const weak = weakKeys(storedStats, 4);
                return weak.length
                  ? `<p class="g-typing-focus">Today's focus: ${weak.map((w) => `<kbd class="g-typing-key">${BG.esc(w.key)}</kbd>`).join('')}</p>`
                  : '<p class="g-typing-focus">First visit: home row. Rest your fingers on <kbd class="g-typing-key">f</kbd><kbd class="g-typing-key">j</kbd> (feel the bumps).</p>';
              })()
              : d.id === 'sprint'
                ? `<p class="g-typing-focus">${beltNow.next ? `Next: <b>${beltNow.next.name} belt</b> at ${beltNow.next.wpm} WPM, 95%+ accuracy` : 'Black belt. Defend your title!'}</p>`
                : '<p class="g-typing-focus">+10 per word. It gets faster…</p>';
          stage.innerHTML = `
            <div class="card g-typing-intro">
              <div class="g-typing-intro-emoji" aria-hidden="true">${d.emoji}</div>
              <div class="label">Drill ${i + 1} of 3 · ${d.secs}s</div>
              <h3 class="g-typing-intro-name">${BG.esc(d.name)}</h3>
              <p class="g-typing-intro-blurb">${BG.esc(d.blurb)}</p>
              ${extra}
              <button class="btn btn--primary btn--block g-typing-go">Start ${BG.esc(d.name)}</button>
            </div>`;
          BG.fx.pop(stage.firstElementChild);
          const go = () => {
            if (docKey) document.removeEventListener('keydown', docKey);
            docKey = null;
            focusInput(); // inside the user gesture so mobile keyboards open
            BG.fx.sound('pick');
            resolve();
          };
          stage.querySelector('.g-typing-go').addEventListener('click', go, { once: true });
          docKey = (e) => {
            if (e.key === 'Enter' && !e.repeat && root.isConnected) {
              e.preventDefault();
              go();
            }
          };
          document.addEventListener('keydown', docKey);
        });
      }

      async function countdown() {
        input.value = '';
        hint.textContent = '';
        const el = BG.el('<div class="g-typing-count" aria-live="assertive"></div>');
        stage.innerHTML = '';
        stage.appendChild(el);
        for (const s of ['3', '2', '1', 'Go!']) {
          el.textContent = s;
          BG.fx.anim(el, 'g-typing-countpop');
          BG.fx.sound(s === 'Go!' ? 'pop' : 'tick');
          await sleep(s === 'Go!' ? 300 : 450);
          if (!ctx.alive) return;
        }
        focusInput();
      }

      function startTimer(secs) {
        timerHost.innerHTML = '';
        timer = BG.timerBar(timerHost, secs);
        const t = timer;
        const start = performance.now();
        // Wall-clock guard as well: the rAF bar pauses in background tabs.
        const done = Promise.race([t.done, new Promise((r) => later(r, secs * 1000 + 400))]);
        return { done, elapsed: () => (performance.now() - start) / 1000, stop: () => t.stop() };
      }

      // ---------- Warm-up + Sprint ----------
      function typingDrill(kind) {
        return new Promise((resolve) => {
          const secs = kind === 'warm' ? WARM_SECS : SPRINT_SECS;
          const focus = weakKeys(storedStats, 4).map((w) => w.key);
          let passageK = 0;
          const order = BG.shuffle(PASSAGES.map((_, i) => i), BG.rng(BG.hash('typing-sprint')));
          const used = new Set();
          const nextText = () => {
            if (kind === 'warm') return buildWarmup(focus, WORDS, ctx.rand);
            let idx;
            if (ctx.mode === 'daily' && passageK < 2) idx = dailyPassageIndex(ctx.day, passageK, PASSAGES.length, order);
            else {
              do idx = Math.floor(ctx.rand() * PASSAGES.length);
              while (used.has(idx) && used.size < PASSAGES.length);
            }
            used.add(idx);
            passageK++;
            return PASSAGES[idx];
          };

          stage.innerHTML = `
            <div class="g-typing-board">
              ${kind === 'warm' ? `<p class="g-typing-sub">${focus.length ? `Focus keys: ${focus.map((k) => `<kbd class="g-typing-key g-typing-key--sm">${BG.esc(k)}</kbd>`).join('')}` : 'Home row: a s d f · j k l'}</p>` : ''}
              <div class="panel g-typing-box"><div class="g-typing-text" aria-hidden="true"></div></div>
              <div class="g-typing-live">
                <div class="g-typing-stat"><b class="big-num g-typing-wpm">—</b><span class="label">WPM</span></div>
                <div class="g-typing-stat"><b class="big-num g-typing-acc">—</b><span class="label">Accuracy</span></div>
                <div class="g-typing-stat"><b class="big-num g-typing-done">0</b><span class="label">${kind === 'warm' ? 'Keys' : 'Words'}</span></div>
              </div>
            </div>`;
          const box = stage.querySelector('.g-typing-box');
          const textEl = stage.querySelector('.g-typing-text');
          const wpmEl = stage.querySelector('.g-typing-wpm');
          const accEl = stage.querySelector('.g-typing-acc');
          const doneEl = stage.querySelector('.g-typing-done');
          hint.textContent = 'Red letters? Backspace to fix them.';

          const tot = { keys: 0, ok: 0, net: 0, words: 0, texts: 0 };
          let firstAt = 0;
          let typer = null;
          let spans = [];
          let classes = [];
          let lastTop = -1;

          function load(text) {
            typer = makeTyper(text, { caseInsensitive: touchOnly });
            textEl.innerHTML = text.split('').map((c) => `<span>${BG.esc(c)}</span>`).join('');
            spans = Array.from(textEl.children);
            classes = spans.map(() => '');
            input.value = '';
            lastTop = -1;
            box.scrollTop = 0;
            paint();
          }
          function paint() {
            const n = typer.typed.length;
            const bad = typer.badIndex();
            for (let i = 0; i < spans.length; i++) {
              const c = i < n ? (bad === -1 || i < bad ? 'is-ok' : 'is-bad') : i === n ? 'is-cur' : '';
              if (classes[i] !== c) {
                classes[i] = c;
                spans[i].className = c;
              }
            }
            const cur = spans[Math.min(n, spans.length - 1)];
            if (cur && cur.offsetTop !== lastTop) {
              lastTop = cur.offsetTop;
              box.scrollTop = Math.max(0, cur.offsetTop - box.clientHeight / 3);
            }
          }
          const liveTotals = () => ({
            keys: tot.keys + typer.keys,
            ok: tot.ok + typer.okKeys,
            net: tot.net + typer.netChars(),
          });

          load(nextText());
          onEnter = null;
          onInput = () => {
            const r = typer.apply(input.value);
            if (input.value !== r.value) input.value = r.value;
            for (const ev of r.events) {
              if (!firstAt) firstAt = performance.now();
              if (ev.counted) recordKey(ev.expected, ev.ok);
              if (!ev.ok && ev.counted) errFx();
            }
            if (r.blocked && typer.badIndex() !== -1) {
              BG.fx.shake(box);
              hint.textContent = 'Fix the red letters first (Backspace).';
            }
            paint();
            if (r.done) {
              tot.keys += typer.keys;
              tot.ok += typer.okKeys;
              tot.net += typer.netChars();
              tot.texts++;
              BG.fx.sound('good');
              BG.fx.pop(box);
              if (kind === 'sprint') BG.fx.float(box, 'Passage done! Next one…', 'info');
              load(nextText());
            }
          };

          const clock = startTimer(secs);
          let lastLive = 0;
          const loop = (now) => {
            if (!ctx.alive) return;
            if (now - lastLive > 250) {
              lastLive = now;
              const L = liveTotals();
              const ms = firstAt ? now - firstAt : 0;
              wpmEl.textContent = ms > 2000 ? Math.round(wpm(L.net, ms)) : '—';
              accEl.textContent = L.keys ? `${Math.round(accuracy(L.ok, L.keys) * 100)}%` : '—';
              doneEl.textContent = kind === 'warm' ? L.ok : Math.round(L.net / 5);
              accEl.parentElement.classList.toggle('is-low', L.keys > 10 && accuracy(L.ok, L.keys) < QUAL_ACC);
            }
            rafId = requestAnimationFrame(loop);
          };
          rafId = requestAnimationFrame(loop);

          clock.done.then(() => {
            if (!ctx.alive) return;
            clock.stop();
            cancelAnimationFrame(rafId);
            onInput = null;
            timerHost.innerHTML = '';
            const L = liveTotals();
            const endAt = performance.now();
            const ms = firstAt ? Math.max(10000, endAt - firstAt) : secs * 1000;
            const acc = accuracy(L.ok, L.keys);
            const res = {
              keys: L.keys,
              ok: L.ok,
              acc,
              net: Math.round(wpm(L.net, ms)),
              gross: Math.round(wpm(L.keys, ms)),
              texts: tot.texts,
            };
            input.blur();
            if (kind === 'warm') {
              res.points = warmPoints(acc, L.keys);
              BG.fx.sound(acc >= 0.95 ? 'good' : 'pop');
              stage.innerHTML = `<div class="g-typing-done-card card"><div class="label">Warm-up done</div>
                <div class="g-typing-done-big big-num">${L.keys ? Math.round(acc * 100) : 0}%</div><div class="muted">accuracy over ${L.keys} keys</div></div>`;
              if (res.points) ctx.addScore(res.points, stage.firstElementChild);
            } else {
              res.points = sprintPoints(res.net, acc);
              BG.fx.sound('win');
              stage.innerHTML = `<div class="g-typing-done-card card"><div class="label">Sprint done</div>
                <div class="g-typing-done-big big-num">${res.net} <small>WPM</small></div><div class="muted">${Math.round(acc * 100)}% accuracy · ${res.gross} gross WPM</div></div>`;
              if (res.points) ctx.addScore(res.points, stage.firstElementChild);
            }
            BG.fx.pop(stage.firstElementChild);
            later(() => resolve(res), 1100);
          });
        });
      }

      // ---------- Word rain ----------
      function rainDrill() {
        return new Promise((resolve) => {
          stage.innerHTML = `
            <div class="g-typing-rainwrap">
              <div class="g-typing-rainbar">
                <span class="g-typing-lives" aria-label="3 lives">${'<span class="g-typing-heart">❤️</span>'.repeat(3)}</span>
                <span class="chip chip--gold g-typing-combo">Zapped 0</span>
              </div>
              <div class="g-typing-sky" aria-hidden="true"><div class="g-typing-ground"></div></div>
            </div>`;
          const sky = stage.querySelector('.g-typing-sky');
          const hearts = Array.from(stage.querySelectorAll('.g-typing-heart'));
          const comboEl = stage.querySelector('.g-typing-combo');
          const livesEl = stage.querySelector('.g-typing-lives');
          hint.textContent = touchOnly ? 'Type a word, then tap Go / space if it does not zap.' : 'Type a word to zap it. Space or Enter clears a typo.';

          const times = spawnTimes();
          const air = [];
          const usedWords = new Set();
          let spawned = 0;
          let lives = 3;
          let zapped = 0;
          let missed = 0;
          let streak = 0;
          let bestStreak = 0;
          let ended = false;
          const start = performance.now();
          const clock = startTimer(RAIN_SECS);

          function pickWord(t) {
            const [lo, hi] = lenBand(t);
            const onScreen = new Set(air.map((w) => w.text));
            const firsts = new Set(air.map((w) => w.text[0]));
            let cand = WORDS.filter((w) => w.length >= lo && w.length <= hi && !usedWords.has(w) && !onScreen.has(w));
            const fresh = cand.filter((w) => !firsts.has(w[0]));
            if (fresh.length) cand = fresh;
            if (!cand.length) cand = WORDS.filter((w) => !onScreen.has(w));
            const w = cand[Math.floor(ctx.rand() * cand.length)];
            usedWords.add(w);
            return w;
          }

          function spawn(t) {
            const text = pickWord(t);
            const el = BG.el('<div class="g-typing-drop"><span class="g-typing-drop-hit"></span><span class="g-typing-drop-rest"></span></div>');
            el.querySelector('.g-typing-drop-rest').textContent = text;
            sky.appendChild(el);
            const W = sky.clientWidth;
            const w = el.offsetWidth;
            el.style.left = `${Math.round(6 + ctx.rand() * Math.max(0, W - w - 12))}px`;
            air.push({ text, el, born: performance.now(), dur: fallSecs(t) * 1000, y: 0 });
            spawned++;
          }

          function highlight(v) {
            air.forEach((w) => {
              const on = v && w.text.startsWith(v);
              w.el.classList.toggle('is-target', !!on);
              const hit = on ? v.length : 0;
              if (w.hit !== hit) {
                w.hit = hit;
                w.el.firstChild.textContent = w.text.slice(0, hit);
                w.el.lastChild.textContent = w.text.slice(hit);
              }
            });
          }

          function zap(w) {
            const i = air.indexOf(w);
            if (i < 0) return;
            air.splice(i, 1);
            zapped++;
            streak++;
            bestStreak = Math.max(bestStreak, streak);
            ctx.addScore(10, w.el);
            BG.fx.sound('pop');
            if (streak >= 3 && streak % 3 === 0) later(() => BG.fx.sound('good'), 60);
            BG.fx.haptic(12);
            comboEl.textContent = streak >= 3 ? `🔥 Streak ${streak} · Zapped ${zapped}` : `Zapped ${zapped}`;
            BG.fx.pop(comboEl);
            w.el.classList.add('is-zap');
            if (!reduced) {
              const x = w.el.offsetLeft + w.el.offsetWidth / 2;
              const y = w.y + w.el.offsetHeight / 2;
              for (let k = 0; k < 8; k++) {
                const a = (k / 8) * Math.PI * 2;
                const s = BG.el('<span class="g-typing-spark"></span>');
                s.style.left = `${x}px`;
                s.style.top = `${y}px`;
                s.style.setProperty('--dx', `${Math.round(Math.cos(a) * 42)}px`);
                s.style.setProperty('--dy', `${Math.round(Math.sin(a) * 42)}px`);
                sky.appendChild(s);
                later(() => s.remove(), 600);
              }
            }
            later(() => w.el.remove(), 380);
          }

          function ground(w) {
            const i = air.indexOf(w);
            if (i < 0) return;
            air.splice(i, 1);
            missed++;
            streak = 0;
            lives--;
            comboEl.textContent = `Zapped ${zapped}`;
            const h = hearts[lives];
            if (h) h.classList.add('is-lost');
            livesEl.setAttribute('aria-label', `${lives} lives`);
            BG.fx.sound('bad');
            BG.fx.haptic(30);
            BG.fx.shake(sky);
            w.el.classList.add('is-splat');
            later(() => w.el.remove(), 450);
            if (lives <= 0) end('lives');
          }

          function submit(v) {
            const w = v && air.filter((x) => x.text === v).sort((a, b) => b.y - a.y)[0];
            if (w) zap(w);
            else if (v) {
              streak = 0;
              BG.fx.shake(input);
              errFx();
            }
            input.value = '';
            highlight('');
          }

          onEnter = () => submit(normText(input.value).trim().toLowerCase());
          onInput = () => {
            const raw = normText(input.value).toLowerCase();
            if (/\s$/.test(raw)) {
              submit(raw.trim());
              return;
            }
            const v = raw.trim();
            if (raw !== v) input.value = v;
            const match = air.filter((x) => x.text === v).sort((a, b) => b.y - a.y)[0];
            // Zap on exact match unless a longer word on screen starts the same way ("car" vs "card").
            if (match && !air.some((x) => x.text !== v && x.text.startsWith(v))) {
              submit(v);
              return;
            }
            if (v && !air.some((x) => x.text.startsWith(v))) input.classList.add('is-miss');
            else input.classList.remove('is-miss');
            highlight(v);
          };

          const loop = (now) => {
            if (!ctx.alive || ended) return;
            const t = (now - start) / 1000;
            while (spawned < times.length && t >= times[spawned]) spawn(t);
            const H = sky.clientHeight;
            for (const w of air.slice()) {
              const p = (now - w.born) / w.dur;
              const maxY = H - w.el.offsetHeight - 10;
              w.y = Math.min(maxY, p * maxY);
              w.el.style.transform = `translateY(${w.y}px)`;
              if (p >= 1) ground(w);
              if (ended) return;
            }
            if (spawned >= times.length && !air.length) {
              end('clear');
              return;
            }
            rafId = requestAnimationFrame(loop);
          };
          rafId = requestAnimationFrame(loop);
          clock.done.then(() => end('time'));

          function end(why) {
            if (ended || !ctx.alive) return;
            ended = true;
            cancelAnimationFrame(rafId);
            clock.stop();
            onInput = null;
            onEnter = null;
            input.value = '';
            input.classList.remove('is-miss');
            input.blur();
            timerHost.innerHTML = '';
            air.forEach((w) => w.el.classList.add('is-fade'));
            const msg = why === 'lives' ? 'Out of lives!' : why === 'clear' ? 'Sky cleared! 🌈' : 'Time!';
            BG.fx.sound(why === 'lives' ? 'lose' : 'win');
            const card = BG.el(`<div class="g-typing-rainover card"><div class="label">${msg}</div>
              <div class="g-typing-done-big big-num">${zapped}</div><div class="muted">words zapped · best streak ${bestStreak}</div></div>`);
            sky.appendChild(card);
            BG.fx.pop(card);
            later(() => resolve({ zapped, missed, bestStreak, points: rainPoints(zapped) }), 1300);
          }
        });
      }

      // ---------- Ending ----------
      function ending() {
        timerHost.innerHTML = '';
        hint.textContent = '';
        onInput = null;
        onEnter = null;
        wrap.querySelector('.g-typing-inrow').hidden = true;
        drillChip.textContent = '🥋 Dojo report';
        ctx.setProgress(DRILLS.length + 1, DRILLS.length);

        const sp = results.sprint || { net: 0, acc: 0, keys: 0, gross: 0, points: 0 };
        const wm = results.warm || { acc: 0, keys: 0, points: 0 };
        const rn = results.rain || { zapped: 0, points: 0 };
        const qual = qualifies(sp.net, sp.acc, sp.keys);
        const best = qual ? Math.max(bestBefore, sp.net) : bestBefore;
        const before = beltInfo(bestBefore);
        const after = beltInfo(best);
        const newBelt = after.idx > before.idx;

        // Persist.
        const merged = mergeStats(storedStats, sessionStats);
        ctx.store.set('keys', merged);
        ctx.store.set('best', best);
        const hist = ctx.store.get('history', []);
        hist.push({ day: ctx.day, net: sp.net, acc: Math.round(sp.acc * 100) });
        ctx.store.set('history', hist.slice(-30));
        setBeltChip(after);

        const weak = weakKeys(mergeStats({}, sessionStats), 3);
        const accPct = Math.round(sp.acc * 100);
        const beltName = after.belt ? `${after.belt.name} belt` : 'No belt yet';
        const progressTxt = after.next
          ? `${after.pct}% to ${after.next.name} belt`
          : 'Black belt. Master of the dojo!';
        const tipLine = !sp.keys
          ? 'Type a few words in the Sprint to start your belt journey.'
          : qual
            ? 'Tip: keep your hands still and use the same finger for each key, every time.'
            : `Belts need 95% accuracy (you had ${accPct}%). Slow down a touch, and the speed follows.`;

        stage.innerHTML = `
          <div class="g-typing-end">
            <div class="card g-typing-beltcard g-typing-belt--${after.belt ? after.belt.key : 'none'}">
              ${newBelt ? '<div class="chip chip--gold g-typing-newbelt">🥋 New belt earned!</div>' : ''}
              <div class="g-typing-beltart" aria-hidden="true"><span class="g-typing-knot"></span></div>
              <div class="g-typing-beltname">${BG.esc(beltName)}</div>
              <div class="g-typing-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${after.pct}" aria-label="${BG.esc(progressTxt)}">
                <div class="g-typing-progfill g-typing-belt--${after.next ? after.next.key : 'black'}"></div>
              </div>
              <div class="g-typing-progtxt">${BG.esc(progressTxt)}</div>
              <div class="muted g-typing-best">Best qualifying sprint: ${best} WPM</div>
            </div>
            <div class="card g-typing-lines">
              <div class="g-typing-line"><span>🔥 Warm-up · ${Math.round(wm.acc * 100)}% accuracy</span><b>+${wm.points}</b></div>
              <div class="g-typing-line"><span>🌧️ Word rain · ${rn.zapped} zapped</span><b>+${rn.points}</b></div>
              <div class="g-typing-line"><span>⚡ Sprint · ${sp.net} WPM at ${accPct}%</span><b>+${sp.points}</b></div>
            </div>
            <div class="card g-typing-weak">
              <div class="label">Your 3 weakest keys today</div>
              ${weak.length
                ? `<div class="g-typing-keys">${weak.map((w) => `<div class="g-typing-wk"><kbd class="g-typing-key g-typing-key--lg">${BG.esc(w.key)}</kbd><span>${Math.round(w.rate * 100)}% miss</span></div>`).join('')}</div>
                   <p class="muted g-typing-small">Tomorrow's warm-up will drill these.</p>`
                : '<p class="g-typing-small">No weak keys today. Clean hands! 🧼</p>'}
            </div>
            <p class="g-typing-tip">${BG.esc(tipLine)}</p>
            <button class="btn btn--primary btn--block g-typing-fin">See results</button>
          </div>`;
        const fill = stage.querySelector('.g-typing-progfill');
        fill.style.transform = 'scaleX(0)';
        later(() => (fill.style.transform = `scaleX(${after.pct / 100})`), 80);
        if (newBelt) {
          BG.fx.confetti();
          BG.fx.sound('win');
          BG.fx.pop(stage.querySelector('.g-typing-beltcard'));
        } else BG.fx.sound('good');

        const fin = stage.querySelector('.g-typing-fin');
        let finished = false;
        const finish = () => {
          if (!ctx.alive || finished) return;
          finished = true;
          ctx.finish({
            summary: `${sp.net} WPM at ${accPct}% · ${after.belt ? `${after.belt.name} belt` : 'White belt in training'} ⌨️`,
            stats: {
              wpm: sp.net,
              grossWpm: sp.gross,
              accuracy: accPct,
              warmAccuracy: Math.round(wm.acc * 100),
              zapped: rn.zapped,
              belt: after.belt ? after.belt.key : 'none',
              newBelt,
              weakKeys: weak.map((w) => w.key).join(''),
            },
          });
        };
        fin.addEventListener('click', finish, { once: true });
        fin.focus({ preventScroll: true });
      }

      run();
    },
  });
})();

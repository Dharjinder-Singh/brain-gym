// Brain Gym: Memory Palace (palace). Learn the method of loci by play.
// Place today's list along a fixed 10-stop route through a cartoon home,
// walk the route to recall it, then jump to random rooms to prove random access.
(() => {
  'use strict';

  const MIN_N = 6;
  const MAX_N = 10;
  const GRID = 12;
  const PTS_WALK = 30;
  const PTS_JUMP = 40;
  const JUMPS = 3;
  const AUTO_SECONDS = 5;

  const THEMES = [
    { id: 'shop', label: '🛒 Shopping list', cats: ['food'] },
    { id: 'errand', label: '🧳 Errands & packing', cats: ['home', 'tool', 'wear', 'fun'] },
    { id: 'random', label: '🎲 Random words', cats: null },
  ];

  const RIGHT_LINES = ['Spot on! ✨', 'Room remembered!', 'Palace power! 🏰', 'Nailed it!', 'Crystal clear!', 'Right where you left it!'];
  const WRONG_LINES = ['Not quite…', 'The image faded…', 'Ghost of an item 👻', 'Oops, wrong room stuff!'];

  // ---------- Pure helpers ----------
  const VOWEL = /^[aeiou]/i;
  const A_EXCEPT = /^(uni|use|usu|eu|one)/i;
  const AN_EXCEPT = /^(hour|honest|heir)/i;
  const article = (word) => {
    const w = String(word || '').replace(/^[^A-Za-z]+/, '');
    if (AN_EXCEPT.test(w)) return 'an';
    if (A_EXCEPT.test(w)) return 'a';
    return VOWEL.test(w) ? 'an' : 'a';
  };
  const sayOf = (item) => item.say || item.name.toLowerCase();
  const placeName = (l) => (l.name === l.name.toUpperCase() ? l.name : l.name.toLowerCase());

  // Fill a vivid template. Returns safe HTML: item rendered as <b>emoji words</b>.
  function vividHTML(tpl, item) {
    const MARK = '\u0001';
    const say = sayOf(item);
    let s = tpl.replace('{item}', MARK);
    s = s.replace(/\{(a|A)\}(\s+)(\S+)/g, (m, which, sp, next) => {
      const art = article(next === MARK || next.startsWith(MARK) ? say : next);
      return (which === 'A' ? art[0].toUpperCase() + art.slice(1) : art) + sp + next;
    });
    return BG.esc(s).replace(MARK, `<b class="pl-hl">${BG.esc(item.emoji)}&nbsp;${BG.esc(say)}</b>`);
  }

  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  BG.registerGame({
    id: 'palace',
    name: 'Memory Palace',
    emoji: '🏰',
    skill: 'Memorising anything',
    category: 'cool',
    tagline: 'Hide a list around your home. Walk through it. Never forget a list again.',
    howTo: [
      'Each item gets a spot on a fixed route through your home. Picture it BIG and weird.',
      'Walk the route and pick what was waiting at each spot.',
      'Bonus: jump to random rooms. The route never changes, so you get better every day.',
      'Score 90%+ and tomorrow’s list grows (6 → 10 items).',
    ],
    science:
      'After 6 weeks of memory-palace training, ordinary people more than doubled their word-list recall, most of the gain lasted 4 months, and their brain wiring shifted towards that of memory champions (Dresler et al., Neuron 2017).',
    scienceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5439266/',
    minutes: 4,
    maxScore: MAX_N * PTS_WALK + JUMPS * PTS_JUMP,

    mount(root, ctx) {
      const D = window.BG_DATA_PALACE;
      const wrap = BG.el('<div class="pl"></div>');
      root.appendChild(wrap);
      if (!D || !D.loci || D.loci.length < MAX_N || !D.items || D.items.length < 40) {
        wrap.innerHTML = '<p class="muted">The palace is still being built. Try again later.</p>';
        ctx.finish({ summary: 'Palace closed for repairs 🏗️', stats: { correct: 0, total: 0 } });
        return;
      }

      const daily = ctx.mode === 'daily';
      const rand = ctx.rand;
      const level = Math.min(MAX_N, Math.max(MIN_N, Math.round(Number(ctx.store.get('level', MIN_N)) || MIN_N)));
      const N = level;

      // ---- Today's list (deterministic per day in daily mode via ctx.rand) ----
      const theme = daily ? THEMES[(ctx.day - 1) % THEMES.length] : BG.pick(THEMES, rand);
      const pool = D.items.filter((it) => !theme.cats || theme.cats.includes(it.category));
      const mixed = BG.shuffle(pool, rand);
      const chosen = mixed.slice(0, N);
      const distractors = mixed.slice(N, GRID);
      const loci = D.loci.slice(0, MAX_N);
      const stops = chosen.map((item, i) => {
        const locus = loci[i];
        const tpls = (D.vivid && D.vivid[locus.id]) || ['{A} {item} is at the ' + locus.name.toLowerCase() + '.'];
        return { i, locus, item, tpl: BG.pick(tpls, rand), pose: BG.randInt(0, 3, rand) };
      });
      const gridItems = BG.shuffle(chosen.concat(distractors), rand);
      const jumpOrder = BG.shuffle(stops.map((s) => s.i), rand).slice(0, JUMPS);
      const walkOk = [];

      const finePointer = (() => {
        try {
          return matchMedia('(hover: hover) and (pointer: fine)').matches;
        } catch {
          return false;
        }
      })();

      // ---- Cleanup plumbing ----
      let keyHandler = null;
      let autoTimer = null;
      const setKeys = (fn) => {
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = fn;
        if (fn) document.addEventListener('keydown', fn);
      };
      const stopAuto = () => {
        if (autoTimer) autoTimer.stop();
        autoTimer = null;
      };
      ctx.onDestroy(() => {
        stopAuto();
        setKeys(null);
      });
      const wait = async (ms) => {
        await BG.sleep(ms);
        return ctx.alive;
      };
      const line = (arr) => arr[Math.floor(rand() * arr.length)];

      // ---- The house map (route snakes: top row L→R, bottom row R→L) ----
      function houseHTML() {
        const tiles = loci
          .map((l, i) => {
            const row = i < 5 ? 1 : 2;
            const col = i < 5 ? i + 1 : 10 - i;
            const off = i >= N ? ' is-off' : '';
            return `<div class="pl-tile${off}" data-i="${i}" style="grid-row:${row};grid-column:${col}">
                <span class="pl-tile-n">${i + 1}</span>
                <span class="pl-tile-e" aria-hidden="true">${l.emoji}</span>
                <span class="pl-tile-item" aria-hidden="true"></span>
                <span class="pl-sr">${BG.esc(l.name)}</span>
              </div>`;
          })
          .join('');
        return `<div class="pl-house" aria-label="Your palace: a route of ${MAX_N} stops">
            <div class="pl-roof" aria-hidden="true"><span class="pl-chimney"></span><span class="pl-flag">🏰</span></div>
            <div class="pl-floor">
              <div class="pl-route" aria-hidden="true"></div>
              ${tiles}
            </div>
          </div>`;
      }
      const tileOf = (i) => wrap.querySelector(`.pl-tile[data-i="${i}"]`);
      function setCurrent(i) {
        wrap.querySelectorAll('.pl-tile.is-cur').forEach((t) => t.classList.remove('is-cur'));
        const t = tileOf(i);
        if (t) {
          t.classList.add('is-cur');
          BG.fx.pop(t);
        }
      }
      function markTile(i, emoji, state) {
        const t = tileOf(i);
        if (!t) return;
        t.classList.remove('is-ok', 'is-bad', 'is-seen');
        if (state) t.classList.add(state);
        t.querySelector('.pl-tile-item').textContent = emoji || '';
      }
      function clearTiles() {
        wrap.querySelectorAll('.pl-tile').forEach((t) => {
          t.classList.remove('is-ok', 'is-bad', 'is-seen', 'is-cur');
          t.querySelector('.pl-tile-item').textContent = '';
        });
      }

      function sparkle(anchor) {
        if (!anchor) return;
        const box = BG.el('<div class="pl-sparkles" aria-hidden="true"></div>');
        const bits = ['✨', '⭐', '✨', '💫', '✨', '⭐', '✨', '💫'];
        bits.forEach((b, k) => {
          const a = (k / bits.length) * Math.PI * 2 + 0.3;
          const r = 56 + (k % 3) * 14;
          const s = BG.el(`<span>${b}</span>`);
          s.style.setProperty('--dx', `${Math.round(Math.cos(a) * r)}px`);
          s.style.setProperty('--dy', `${Math.round(Math.sin(a) * r)}px`);
          s.style.setProperty('--d', `${k * 25}ms`);
          box.appendChild(s);
        });
        anchor.appendChild(box);
        setTimeout(() => box.remove(), 1000);
      }

      // ================= Tutorial (first play only) =================
      async function tutorial() {
        wrap.innerHTML = `
          <div class="pl-screen">
            <div class="pl-head"><span class="label">Welcome to your palace</span><span class="chip chip--blue">First visit</span></div>
            ${houseHTML()}
            <div class="card pl-tut">
              <h3 class="pl-h">This is your memory palace 🏰</h3>
              <p class="pl-p">The same 10 stops, in the same order, every day. Memory champions use exactly this trick.</p>
              <ol class="pl-steps">
                <li><span class="pl-step-n">1</span><span><b>Picture it BIG and weird.</b> Giant, gross, noisy, funny.</span></li>
                <li><span class="pl-step-n">2</span><span><b>Make it interact with the place.</b> It smashes, squishes, sits on it.</span></li>
                <li><span class="pl-step-n">3</span><span><b>Walk the route.</b> Front door to window, and look at each spot.</span></li>
              </ol>
              <button class="btn btn--primary btn--block pl-go" type="button">Enter the palace 🚪</button>
            </div>
          </div>`;
        // Tour the route once so the order sinks in.
        const tour = (async () => {
          for (let i = 0; i < MAX_N; i++) {
            if (!(await wait(160)) || !wrap.querySelector('.pl-tut')) return;
            setCurrent(i);
          }
        })();
        const btn = wrap.querySelector('.pl-go');
        await new Promise((resolve) => {
          btn.addEventListener('click', resolve, { once: true });
          setKeys((e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              resolve();
            }
          });
        });
        setKeys(null);
        tour.catch(() => {});
        if (!ctx.alive) return false;
        BG.fx.sound('pick');
        ctx.store.set('tutorialDone', true);
        return true;
      }

      // ================= Phase 1: PLACE =================
      async function placePhase() {
        ctx.setProgress(1, 3);
        let auto = !!ctx.store.get('auto', false);
        wrap.innerHTML = `
          <div class="pl-screen">
            <div class="pl-head">
              <span class="label">Phase 1 · Place</span>
              <span class="chip chip--gold">${BG.esc(theme.label)} · ${N} items</span>
            </div>
            ${houseHTML()}
            <div class="pl-scene card" aria-live="polite">
              <div class="pl-stage"></div>
              <p class="pl-cap label"></p>
              <p class="pl-vivid"></p>
            </div>
            <div class="pl-timer"></div>
            <div class="pl-controls">
              <button class="icon-btn pl-prev" type="button" aria-label="Previous item">←</button>
              <button class="btn btn--primary pl-next" type="button">Next →</button>
              <button class="pl-auto" type="button" aria-pressed="${auto}">⏱ Auto</button>
            </div>
            <p class="pl-tip muted">Close your eyes for a second and <b>see</b> it.</p>
          </div>`;
        const stage = wrap.querySelector('.pl-stage');
        const cap = wrap.querySelector('.pl-cap');
        const vivid = wrap.querySelector('.pl-vivid');
        const timerBox = wrap.querySelector('.pl-timer');
        const prev = wrap.querySelector('.pl-prev');
        const next = wrap.querySelector('.pl-next');
        const autoBtn = wrap.querySelector('.pl-auto');
        let idx = 0;
        let seen = 0;
        const t0 = performance.now();

        let step = null; // resolver for the current item's wait
        const go = (d) => {
          if (step) step(d);
        };
        prev.addEventListener('click', () => go(-1));
        next.addEventListener('click', () => go(1));
        autoBtn.addEventListener('click', () => {
          auto = !auto;
          autoBtn.setAttribute('aria-pressed', String(auto));
          ctx.store.set('auto', auto);
          BG.fx.sound('tap');
          if (auto) startAuto();
          else {
            stopAuto();
            timerBox.innerHTML = '';
          }
        });
        setKeys((e) => {
          // A focused button already handles Enter/Space natively.
          const onBtn = e.target && e.target.closest && e.target.closest('button, input');
          if ((e.key === 'Enter' || e.key === ' ') && onBtn) return;
          if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            go(1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(-1);
          }
        });
        function startAuto() {
          stopAuto();
          timerBox.innerHTML = '';
          autoTimer = BG.timerBar(timerBox, AUTO_SECONDS, { warnAt: 0 });
          const mine = autoTimer;
          autoTimer.done.then(() => {
            if (ctx.alive && mine === autoTimer) go(1);
          });
        }

        while (ctx.alive && idx < N) {
          const s = stops[idx];
          seen = Math.max(seen, idx + 1);
          setCurrent(idx);
          markTile(idx, s.item.emoji, 'is-seen');
          stage.innerHTML = `
            <span class="pl-locus" aria-hidden="true">${s.locus.emoji}</span>
            <span class="pl-item pl-pose-${s.pose}" aria-hidden="true">${s.item.emoji}</span>`;
          cap.textContent = `Stop ${idx + 1} of ${N} · ${s.locus.emoji} ${s.locus.name}`;
          vivid.innerHTML = vividHTML(s.tpl, s.item);
          BG.fx.pop(stage.querySelector('.pl-item'));
          BG.fx.sound('pop');
          prev.disabled = idx === 0;
          next.textContent = idx === N - 1 ? 'Start the walk 🚶' : 'Next →';
          if (auto) startAuto();

          const d = await new Promise((r) => (step = r));
          step = null;
          stopAuto();
          if (!ctx.alive) return false;
          BG.fx.sound('tap');
          BG.fx.haptic(8);
          idx = Math.max(0, idx + d);
        }
        setKeys(null);
        timerBox.innerHTML = '';
        BG.track('palace_place', { n: N, seconds: Math.round((performance.now() - t0) / 1000), auto });
        return ctx.alive;
      }

      // ================= Phases 2 & 3: answer a stop =================
      function buildAskScreen(phaseLabel, chip) {
        wrap.innerHTML = `
          <div class="pl-screen">
            <div class="pl-head">
              <span class="label">${BG.esc(phaseLabel)}</span>
              <span class="chip chip--gold">${BG.esc(chip)}</span>
            </div>
            ${houseHTML()}
            <div class="pl-scene card pl-scene--ask">
              <div class="pl-stage"></div>
              <h3 class="pl-q"></h3>
              <p class="pl-react" aria-live="polite"></p>
            </div>
            ${finePointer ? '<input class="pl-type" type="text" autocomplete="off" spellcheck="false" placeholder="Type it, then Enter… (or click)" aria-label="Type the item">' : ''}
            <div class="pl-grid" role="group" aria-label="Pick the item"></div>
          </div>`;
        const grid = wrap.querySelector('.pl-grid');
        const btns = gridItems.map((it) => {
          const b = BG.el(`<button class="pl-opt" type="button" data-id="${BG.esc(it.id)}">
              <span class="pl-opt-e" aria-hidden="true">${it.emoji}</span>
              <span class="pl-opt-n">${BG.esc(it.name)}</span>
            </button>`);
          grid.appendChild(b);
          return b;
        });
        return { btns, input: wrap.querySelector('.pl-type') };
      }

      async function askStop(screen, s, { pts, question }) {
        const { btns, input } = screen;
        const stage = wrap.querySelector('.pl-stage');
        const qEl = wrap.querySelector('.pl-q');
        const react = wrap.querySelector('.pl-react');
        setCurrent(s.i);
        stage.innerHTML = `
          <span class="pl-locus" aria-hidden="true">${s.locus.emoji}</span>
          <span class="pl-item pl-item--q" aria-hidden="true">❓</span>`;
        qEl.textContent = question;
        react.textContent = '';
        react.className = 'pl-react';
        btns.forEach((b) => {
          b.disabled = false;
          b.classList.remove('is-right', 'is-wrong', 'is-answer', 'is-match', 'is-nomatch');
        });
        BG.fx.pop(qEl);

        const pickedId = await new Promise((resolve) => {
          btns.forEach((b) => (b.onclick = () => resolve(b.dataset.id)));
          if (input) {
            input.value = '';
            input.disabled = false;
            const matches = () => {
              const q = norm(input.value);
              if (!q) return [];
              const starts = [];
              const has = [];
              gridItems.forEach((it) => {
                const words = [norm(it.name), norm(sayOf(it))];
                if (words.some((w) => w.startsWith(q) || w.split(' ').some((x) => x.startsWith(q)))) starts.push(it.id);
                else if (words.some((w) => w.includes(q))) has.push(it.id);
              });
              return starts.concat(has);
            };
            input.oninput = () => {
              const m = matches();
              const q = input.value.trim();
              btns.forEach((b) => {
                const hit = m.indexOf(b.dataset.id);
                b.classList.toggle('is-match', !!q && hit === 0);
                b.classList.toggle('is-nomatch', !!q && hit < 0);
              });
            };
            input.onkeydown = (e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const m = matches();
              if (m.length) resolve(m[0]);
              else BG.fx.shake(input);
            };
            input.focus({ preventScroll: true });
          }
        });
        if (!ctx.alive) return false;
        btns.forEach((b) => {
          b.disabled = true;
          b.onclick = null;
          b.classList.remove('is-match', 'is-nomatch');
        });
        if (input) {
          input.oninput = null;
          input.onkeydown = null;
          input.disabled = true;
        }

        const correct = pickedId === s.item.id;
        const pickedBtn = btns.find((b) => b.dataset.id === pickedId);
        const rightBtn = btns.find((b) => b.dataset.id === s.item.id);
        const itemEl = stage.querySelector('.pl-item');
        BG.fx.haptic();
        if (correct) {
          itemEl.className = `pl-item pl-pose-${s.pose}`;
          itemEl.textContent = s.item.emoji;
          BG.fx.pop(itemEl);
          sparkle(stage);
          rightBtn.classList.add('is-right');
          BG.fx.sound('good');
          ctx.addScore(pts, rightBtn);
          react.textContent = line(RIGHT_LINES);
          react.classList.add('is-good');
          markTile(s.i, s.item.emoji, 'is-ok');
        } else {
          itemEl.className = 'pl-item pl-item--ghost';
          itemEl.textContent = s.item.emoji;
          if (pickedBtn) {
            pickedBtn.classList.add('is-wrong');
            BG.fx.shake(pickedBtn);
          }
          rightBtn.classList.add('is-answer');
          BG.fx.sound('bad');
          react.innerHTML = `${BG.esc(line(WRONG_LINES))} It was the <b>${BG.esc(s.item.emoji)} ${BG.esc(sayOf(s.item))}</b>.`;
          react.classList.add('is-bad');
          markTile(s.i, s.item.emoji, 'is-bad');
        }
        await wait(correct ? 850 : 1900);
        return correct;
      }

      // ================= Phase 2: WALK =================
      async function walkPhase() {
        ctx.setProgress(2, 3);
        const screen = buildAskScreen('Phase 2 · Walk the route', `+${PTS_WALK} each`);
        clearTiles();
        let right = 0;
        for (let k = 0; k < N; k++) {
          const s = stops[k];
          const ok = await askStop(screen, s, {
            pts: PTS_WALK,
            question: `Stop ${k + 1}/${N}: what’s at the ${s.locus.emoji} ${placeName(s.locus)}?`,
          });
          if (!ctx.alive) return -1;
          walkOk[k] = ok;
          if (ok) right++;
        }
        return right;
      }

      // ================= Phase 3: JUMP (random access) =================
      async function jumpPhase() {
        ctx.setProgress(3, 3);
        wrap.innerHTML = `
          <div class="pl-screen pl-interlude">
            <div class="pl-big" aria-hidden="true">🔀</div>
            <h3 class="pl-h">Random access!</h3>
            <p class="pl-p">A list in your head only plays from the start. A palace lets you <b>teleport</b> to any room. Prove it: ${JUMPS} random rooms, +${PTS_JUMP} each.</p>
            <button class="btn btn--primary btn--block pl-go" type="button">Teleport 🌀</button>
          </div>`;
        BG.fx.sound('pop');
        const btn = wrap.querySelector('.pl-go');
        btn.focus({ preventScroll: true });
        await new Promise((resolve) => btn.addEventListener('click', resolve, { once: true }));
        if (!ctx.alive) return -1;
        BG.fx.sound('pick');

        const screen = buildAskScreen('Bonus · Random access', `+${PTS_JUMP} each`);
        clearTiles();
        let right = 0;
        for (let k = 0; k < jumpOrder.length; k++) {
          const s = stops[jumpOrder[k]];
          const ok = await askStop(screen, s, {
            pts: PTS_JUMP,
            question: `Jump ${k + 1}/${JUMPS}: what was on the ${s.locus.emoji} ${placeName(s.locus)}?`,
          });
          if (!ctx.alive) return -1;
          if (ok) right++;
        }
        return right;
      }

      // ================= Recap =================
      async function recap(walkRight, jumpRight) {
        const total = N + JUMPS;
        const correct = walkRight + jumpRight;
        const pct = correct / total;
        const next = pct >= 0.9 ? Math.min(MAX_N, level + 1) : pct < 0.5 ? Math.max(MIN_N, level - 1) : level;
        ctx.store.set('level', next);
        const best = Math.max(Number(ctx.store.get('best', 0)) || 0, walkRight);
        ctx.store.set('best', best);
        const plays = (Number(ctx.store.get('plays', 0)) || 0) + 1;
        ctx.store.set('plays', plays);

        const perfect = correct === total;
        const verdict = perfect
          ? 'Flawless palace! 🏆'
          : pct >= 0.9
            ? 'Memory champion vibes! 🧠'
            : pct >= 0.5
              ? 'Solid walk. Make the images weirder!'
              : 'Tough one. Go bigger, louder, sillier next time.';
        const lvlMsg =
          next > level
            ? `⬆️ Level up! Next list: ${next} items`
            : next < level
              ? `⬇️ Next list: ${next} items (warm-up)`
              : level === MAX_N && pct >= 0.9
                ? '👑 Max level: 10 items'
                : `Next list: ${next} items (90%+ to grow)`;

        wrap.innerHTML = `
          <div class="pl-screen">
            <div class="pl-head"><span class="label">Your palace today</span><span class="chip ${next > level ? 'chip--ok' : next < level ? 'chip--warn' : 'chip--blue'}"></span></div>
            ${houseHTML()}
            <div class="card pl-recap">
              <h3 class="pl-h"></h3>
              <div class="pl-stats">
                <div><span class="big-num">${walkRight}/${N}</span><span class="label">In order</span></div>
                <div><span class="big-num">${jumpRight}/${JUMPS}</span><span class="label">Random jumps</span></div>
              </div>
              <ol class="pl-list"></ol>
              <button class="btn btn--primary btn--block pl-go" type="button">Finish 🏰</button>
            </div>
          </div>`;
        wrap.querySelector('.pl-head .chip').textContent = lvlMsg;
        wrap.querySelector('.pl-recap .pl-h').textContent = verdict;
        const list = wrap.querySelector('.pl-list');
        stops.forEach((s) => {
          const ok = !!walkOk[s.i];
          const li = BG.el(`<li class="${ok ? 'is-ok' : 'is-bad'}"><span class="pl-li-l"></span><span class="pl-li-i"></span></li>`);
          li.querySelector('.pl-li-l').textContent = `${s.locus.emoji} ${s.locus.name}`;
          li.querySelector('.pl-li-i').textContent = `${s.item.emoji} ${s.item.name} ${ok ? '✓' : '✗'}`;
          list.appendChild(li);
          markTile(s.i, s.item.emoji, ok ? 'is-ok' : 'is-bad');
        });
        if (perfect) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else if (pct >= 0.5) BG.fx.sound('win');
        else BG.fx.sound('lose');

        BG.track('palace_done', { n: N, walk: walkRight, jump: jumpRight, level, next, theme: theme.id });
        const btn = wrap.querySelector('.pl-go');
        await new Promise((resolve) => {
          btn.addEventListener('click', resolve, { once: true });
          setKeys((e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              resolve();
            }
          });
        });
        setKeys(null);
        if (!ctx.alive) return;
        const lvlText = next === level && level === MAX_N ? `level ${level} 👑` : `level ${level} → ${next}`;
        ctx.finish({
          summary: `Recalled ${walkRight}/${N} in order, ${lvlText} 🏰`,
          stats: { correct, total, inOrder: walkRight, items: N, jumps: jumpRight, level, nextLevel: next, theme: theme.id },
        });
      }

      async function run() {
        if (!ctx.store.get('tutorialDone', false)) {
          if (!(await tutorial())) return;
        }
        if (!(await placePhase())) return;
        const walkRight = await walkPhase();
        if (walkRight < 0 || !ctx.alive) return;
        const jumpRight = await jumpPhase();
        if (jumpRight < 0 || !ctx.alive) return;
        await recap(walkRight, jumpRight);
      }

      run();
    },
  });
})();

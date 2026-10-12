// Name It: the emotion detective. Read a tiny scene, pick the most precise feeling word,
// then put a family of feelings in order of intensity, then (optionally) name your own.
// Based on "emotional granularity": people who name feelings precisely tend to cope better.
(() => {
  'use strict';

  const A_ROUNDS = 5;
  const PTS_A = 50;
  const PTS_B = 100;
  const STEPS = A_ROUNDS + 2; // 5 cases + ladder + mood check
  const MOOD_SECS = 15;
  const BET_KEYS = ['guess', 'likely', 'sure'];
  const TONES = ['accent', 'blue', 'ok', 'gold', 'warn'];

  const TAGS = {
    school: '🏫 School', work: '💼 Work', family: '🏠 Family', friends: '👯 Friends', traffic: '🚗 On the move',
    exams: '📝 Exams', cricket: '🏏 Cricket', sport: '🏃 Sport', festival: '🎉 Festival', chat: '💬 Group chat',
    travel: '✈️ Travel', home: '🛋️ Home', life: '🌍 Everyday',
  };

  // Vocabulary Level grows with lifetime correct answers (stored per device).
  const LEVELS = [
    [0, 'Feelings Rookie', '🌱'],
    [10, 'Word Finder', '🔎'],
    [25, 'Mood Mapper', '🗺️'],
    [50, 'Emotion Detective', '🕵️'],
    [100, 'Feelings Linguist', '🎓'],
    [200, 'Granularity Guru', '🫶'],
  ];

  const LINES = {
    right: ['Nailed it! 🎯', 'Precisely put. 🫶', 'That\'s the word. ✨', 'Feelings detective strikes again 🔍', 'Spot on. 🎯'],
    wrong: ['Close, but not quite the word 🤏', 'Near miss: there\'s a sharper word 🤏', 'Right ballpark, wrong word 🤏'],
  };

  function levelFor(n) {
    let i = 0;
    LEVELS.forEach(([min], k) => {
      if (n >= min) i = k;
    });
    const [min, name, emoji] = LEVELS[i];
    const next = LEVELS[i + 1] ? LEVELS[i + 1][0] : null;
    return { i, min, name, emoji, next };
  }

  // ---------- Content selection ----------
  // Daily: all vignettes are laid out in one fixed stream (seeded shuffle, then grouped so each
  // block of 5 has 5 different answer words). Day d takes block d, so nothing repeats until the
  // whole stream has been used (91 vignettes ≈ 18 days).
  function buildStream(vigs) {
    const pool = BG.shuffle(vigs, BG.rng(BG.hash('feels-vignettes')));
    const out = [];
    while (pool.length) {
      const block = [];
      for (let k = 0; k < A_ROUNDS && pool.length; k++) {
        let j = pool.findIndex((v) => !block.some((b) => b[3] === v[3]));
        if (j < 0) j = 0;
        block.push(pool.splice(j, 1)[0]);
      }
      out.push(...block);
    }
    return out;
  }

  function chooseDaily(data, day) {
    const stream = buildStream(data.vignettes);
    const d = Math.max(0, day - 1);
    const picked = [];
    for (let j = 0; j < A_ROUNDS; j++) picked.push(stream[(d * A_ROUNDS + j) % stream.length]);
    const ladders = BG.shuffle(data.ladders, BG.rng(BG.hash('feels-ladders')));
    return { vigs: picked, ladder: ladders[d % ladders.length] };
  }

  function choosePractice(data, rand) {
    const picked = [];
    BG.shuffle(data.vignettes, rand).forEach((v) => {
      if (picked.length < A_ROUNDS && !picked.some((p) => p[3] === v[3])) picked.push(v);
    });
    return { vigs: picked, ladder: BG.pick(data.ladders, rand) };
  }

  function localDate() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function shortDate(iso) {
    const [y, m, dd] = iso.split('-').map(Number);
    const d = new Date(y, m - 1, dd);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }

  BG.registerGame({
    id: 'feels',
    name: 'Name It',
    emoji: '🫶',
    skill: 'Naming feelings precisely',
    category: 'life',
    tagline: '"Bad" is a blur. "Exasperated" is a diagnosis. Find the exact word.',
    howTo: [
      'Read 5 tiny scenes and pick the most precise feeling word. Bet on your pick.',
      'See why the other words fit less, with mini definitions.',
      'Turn up the volume: put a family of feelings in order, quietest to loudest.',
      'Optional: name your own feeling right now. It stays on this device.',
    ],
    science:
      'People who describe their emotions in more precise, differentiated terms ("emotional granularity") tend to cope better with stress, and this is linked with less binge drinking and lashing out (Kashdan, Barrett & McKnight, Current Directions in Psychological Science 2015). In a randomised trial, emotion-knowledge training helped people tell negative emotions apart more finely (Vedernikova et al., Frontiers in Psychology 2021).',
    scienceUrl: 'https://journals.sagepub.com/doi/10.1177/0963721414550708',
    minutes: 4,
    maxScore: A_ROUNDS * (PTS_A + 40) + PTS_B,

    mount(root, ctx) {
      const data = window.BG_DATA_FEELS || { words: {}, vignettes: [], ladders: [], wheel: [] };
      const DEF = data.words || {};
      const def = (w) => DEF[w] || '';

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
      let moodTimer = null;

      // ---------- state ----------
      let phase = 'idle'; // banner | choose | bet | reveal | ladder | mood | end
      let selected = null;
      let optBtns = [];
      let lockBtn = null;
      let resolveChoice = null;
      let resolveNext = null;
      let resolveBanner = null;
      let correctCount = 0;
      let streak = 0;
      let lifetime = Number(ctx.store.get('lifetime', 0)) || 0;
      const learned = [];

      // ---------- DOM ----------
      const wrap = BG.el(`
        <div class="fe-wrap">
          <div class="fe-badge" aria-live="polite">
            <span class="fe-badge-emoji" aria-hidden="true"></span>
            <span class="fe-badge-text">
              <span class="label">Vocabulary level</span>
              <span class="fe-badge-name"></span>
            </span>
            <span class="fe-badge-meter"><span class="fe-badge-fill"></span></span>
            <span class="fe-badge-count big-num"></span>
          </div>
          <div class="fe-stage"></div>
        </div>`);
      root.appendChild(wrap);
      const stage = wrap.querySelector('.fe-stage');
      const badge = wrap.querySelector('.fe-badge');
      const hasKeys = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

      let shownLevel = levelFor(lifetime).i;
      function setBadge(animate) {
        const lv = levelFor(lifetime);
        badge.querySelector('.fe-badge-emoji').textContent = lv.emoji;
        badge.querySelector('.fe-badge-name').textContent = lv.name;
        const frac = lv.next ? (lifetime - lv.min) / (lv.next - lv.min) : 1;
        badge.querySelector('.fe-badge-fill').style.transform = `scaleX(${Math.max(0.02, Math.min(1, frac))})`;
        badge.querySelector('.fe-badge-count').textContent = lv.next ? `${lifetime}/${lv.next}` : `${lifetime} ★`;
        badge.title = lv.next ? `${lv.next - lifetime} more correct words to reach the next level` : 'Top level reached';
        if (animate) BG.fx.pop(badge);
        if (lv.i > shownLevel) {
          shownLevel = lv.i;
          badge.classList.add('is-up');
          later(() => badge.classList.remove('is-up'), 1600);
          BG.fx.sound('win');
          BG.fx.toast(`Level up! ${lv.emoji} ${lv.name}`);
        }
      }
      setBadge(false);

      function gainLifetime() {
        lifetime += 1;
        ctx.store.set('lifetime', lifetime);
        setBadge(true);
      }

      function scrollTop() {
        try {
          wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* old browsers */
        }
      }

      // ---------- keyboard ----------
      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey) return;
        const active = document.activeElement;
        const onButton = active && active.tagName === 'BUTTON';
        if (phase === 'banner') {
          if ((e.key === 'Enter' || e.key === ' ') && !onButton) {
            e.preventDefault();
            if (resolveBanner) resolveBanner();
          }
          return;
        }
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
        if (phase === 'choose') {
          if (/^[1-4]$/.test(e.key)) {
            const b = optBtns[Number(e.key) - 1];
            if (b) {
              e.preventDefault();
              select(b.dataset.w, true);
            }
          } else if (e.key === 'Enter' && !onButton && selected) {
            e.preventDefault();
            confirmPick();
          }
          return;
        }
        if (phase === 'reveal' && e.key === 'Enter' && !onButton) {
          e.preventDefault();
          if (resolveNext) resolveNext();
        }
      }
      document.addEventListener('keydown', onKey);

      ctx.onDestroy(() => {
        timers.forEach(clearTimeout);
        timers.clear();
        if (moodTimer) moodTimer.stop();
        moodTimer = null;
        document.removeEventListener('keydown', onKey);
        phase = 'end';
      });

      // ---------- helpers ----------
      function waitNext(btn) {
        return new Promise((res) => {
          resolveNext = res;
          btn.addEventListener('click', res, { once: true });
        }).then(() => {
          resolveNext = null;
        });
      }

      async function banner(letter, title, sub, emoji) {
        phase = 'banner';
        stage.innerHTML = `
          <button class="card fe-banner" type="button">
            <span class="fe-banner-letter" aria-hidden="true">${BG.esc(letter)}</span>
            <span class="fe-banner-emoji" aria-hidden="true">${emoji}</span>
            <span class="fe-banner-title">${BG.esc(title)}</span>
            <span class="fe-banner-sub">${BG.esc(sub)}</span>
            <span class="fe-banner-go label">Tap to start</span>
          </button>`;
        const b = stage.querySelector('.fe-banner');
        BG.fx.sound('pop');
        scrollTop();
        await new Promise((res) => {
          resolveBanner = res;
          b.addEventListener('click', res, { once: true });
          later(res, 2600);
        });
        resolveBanner = null;
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      // ---------- Round A: which word fits best? ----------
      function select(w, fromKey) {
        if (phase !== 'choose') return;
        if (w === selected && !fromKey) {
          confirmPick();
          return;
        }
        selected = w;
        optBtns.forEach((b) => {
          const on = b.dataset.w === w;
          b.classList.toggle('is-selected', on);
          b.setAttribute('aria-pressed', String(on));
        });
        lockBtn.disabled = false;
        lockBtn.textContent = `🫶 Lock in "${w}"`;
        BG.fx.sound('tap');
        BG.fx.haptic();
        const btn = optBtns.find((b) => b.dataset.w === w);
        BG.fx.pop(btn);
        if (fromKey && btn) btn.focus({ preventScroll: true });
      }

      function confirmPick() {
        if (phase !== 'choose' || !selected) return;
        BG.fx.haptic(30);
        if (resolveChoice) resolveChoice(selected);
      }

      async function playCase(r, v) {
        const [tag, name, text, best, others, why] = v;
        ctx.setProgress(r + 1, STEPS);
        phase = 'choose';
        selected = null;
        const opts = BG.shuffle([best, ...others], ctx.rand);
        const h = BG.hash(name + text.length);
        const tone = TONES[h % TONES.length];
        const initial = name.replace(/^(Ms|Mr|Mrs|Dr)\.? /, '').charAt(0);

        stage.innerHTML = `
          <div class="fe-round">
            <div class="fe-meta">
              <span class="label">Case ${r + 1} of ${A_ROUNDS}</span>
              <span class="chip chip--gold fe-streak" ${streak >= 2 ? '' : 'hidden'}>🔥 x${streak}</span>
            </div>
            <article class="card fe-case">
              <header class="fe-case-head">
                <span class="fe-avatar fe-avatar--${tone}" aria-hidden="true">${BG.esc(initial)}</span>
                <span class="fe-who">
                  <span class="fe-name">${BG.esc(name)}</span>
                  <span class="fe-tag">${BG.esc(TAGS[tag] || TAGS.life)}</span>
                </span>
              </header>
              <p class="fe-text">${BG.esc(text)}</p>
            </article>
            <p class="fe-q">How does <b>${BG.esc(name)}</b> feel? Pick the <b>most precise</b> word.${hasKeys ? ' <span class="muted">Keys 1–4 · Enter</span>' : ''}</p>
            <div class="fe-opts" role="group" aria-label="Feeling words">
              ${opts.map((w, i) => `
                <button class="fe-opt" data-w="${BG.esc(w)}" aria-pressed="false">
                  ${hasKeys ? `<span class="fe-opt-key">${i + 1}</span>` : ''}
                  <span class="fe-opt-word">${BG.esc(w)}</span>
                </button>`).join('')}
            </div>
            <button class="btn btn--primary btn--block fe-lock" disabled>Pick a word</button>
            <div class="fe-reveal" hidden></div>
          </div>`;

        const caseEl = stage.querySelector('.fe-case');
        const grid = stage.querySelector('.fe-opts');
        const revealEl = stage.querySelector('.fe-reveal');
        lockBtn = stage.querySelector('.fe-lock');
        optBtns = Array.from(grid.querySelectorAll('.fe-opt'));
        BG.fx.sound('pop');
        scrollTop();
        grid.addEventListener('click', (e) => {
          const b = e.target.closest('.fe-opt');
          if (b) select(b.dataset.w, false);
        });
        lockBtn.addEventListener('click', confirmPick);

        const choice = await new Promise((res) => (resolveChoice = res));
        resolveChoice = null;
        if (!ctx.alive) return;

        phase = 'bet';
        grid.classList.add('is-locked');
        optBtns.forEach((b) => (b.disabled = true));
        lockBtn.hidden = true;
        await wait(250);
        if (!ctx.alive) return;
        const bet = await ctx.bet(`How sure is "${choice}"?`);
        if (!ctx.alive) return;

        // ---------- reveal ----------
        phase = 'reveal';
        const correct = choice === best;
        const chosenBtn = optBtns.find((b) => b.dataset.w === choice);
        optBtns.forEach((b) => {
          if (b.dataset.w === best) b.classList.add('is-answer');
          else if (b.dataset.w === choice) b.classList.add('is-wrong');
        });
        const ordered = [best, ...opts.filter((w) => w !== best)];
        revealEl.innerHTML = `
          <div class="card fe-verdict ${correct ? 'fe-verdict--ok' : 'fe-verdict--bad'}">
            <h3 class="fe-title">${BG.esc(BG.pick(correct ? LINES.right : LINES.wrong, ctx.rand))}</h3>
            <p class="fe-best"><span class="label">Most precise</span><span class="fe-best-word">${BG.esc(best)}</span></p>
            <p class="fe-why">${BG.esc(why)}</p>
            <ul class="fe-defs" aria-label="Mini definitions">
              ${ordered.map((w) => `
                <li class="fe-def${w === best ? ' is-best' : ''}${w === choice && !correct ? ' is-pick' : ''}">
                  <span class="fe-def-word">${w === best ? '✓ ' : ''}${BG.esc(w)}${w === choice && !correct ? ' <span class="fe-def-you">your pick</span>' : ''}</span>
                  <span class="fe-def-text">${BG.esc(def(w))}</span>
                </li>`).join('')}
            </ul>
            <div class="fe-points"></div>
          </div>
          <button class="btn btn--primary btn--block fe-next">${r + 1 < A_ROUNDS ? 'Next case →' : 'On to the ladder 🎚️'}</button>`;
        revealEl.hidden = false;
        const verdict = revealEl.querySelector('.fe-verdict');
        const pointsEl = revealEl.querySelector('.fe-points');
        const nextBtn = revealEl.querySelector('.fe-next');
        nextBtn.disabled = true;
        BG.fx.sound(correct ? 'good' : 'bad');
        if (correct) BG.fx.pop(caseEl);
        else BG.fx.shake(chosenBtn || caseEl);

        const chips = [];
        if (correct) {
          correctCount += 1;
          streak += 1;
          ctx.addScore(PTS_A, chosenBtn || caseEl);
          chips.push(`<span class="chip chip--ok">+${PTS_A} precise</span>`);
          gainLifetime();
          if (streak >= 2) {
            const s = stage.querySelector('.fe-streak');
            s.textContent = `🔥 x${streak}`;
            s.hidden = false;
            BG.fx.pop(s);
          }
        } else {
          streak = 0;
        }
        learned.push(best);
        pointsEl.innerHTML = chips.join('');
        try {
          verdict.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
        await wait(450);
        if (!ctx.alive) return;
        const delta = ctx.settleBet(bet, correct, verdict);
        ctx.addScore(delta);
        const b = BG.BETS[bet];
        pointsEl.insertAdjacentHTML(
          'beforeend',
          `<span class="chip ${delta > 0 ? 'chip--ok' : delta < 0 ? '' : 'chip--blue'}">${b ? b.emoji : ''} bet ${delta > 0 ? '+' : ''}${delta}</span>`
        );
        BG.track('feels_case', { best, choice, correct, bet });

        nextBtn.disabled = false;
        nextBtn.focus({ preventScroll: true });
        await waitNext(nextBtn);
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      // ---------- Round B: turn up the volume ----------
      async function playLadder(ladder) {
        ctx.setProgress(A_ROUNDS + 1, STEPS);
        phase = 'ladder';
        const truth = ladder.words.slice();
        const n = truth.length;
        let order = BG.shuffle(truth, ctx.rand);
        for (let t = 0; t < 6 && order.join() === truth.join(); t++) order = BG.shuffle(truth, ctx.rand);
        if (order.join() === truth.join()) order = truth.slice().reverse();
        let picked = null; // index selected for tap-to-swap
        let locked = false;

        stage.innerHTML = `
          <div class="fe-round">
            <div class="fe-meta">
              <span class="label">Turn up the volume</span>
              <span class="chip chip--blue">${ladder.emoji} ${BG.esc(ladder.name)}</span>
            </div>
            <p class="fe-q">Order from <b>quietest</b> (top) to <b>loudest</b> (bottom). Drag a word, or tap two words to swap.</p>
            <div class="fe-ladder">
              <div class="fe-vol" aria-hidden="true"><span>🔈</span><span class="fe-vol-bar"></span><span>🔊</span></div>
              <ol class="fe-rungs" aria-label="${BG.esc(ladder.name)} words, quietest first"></ol>
            </div>
            <button class="btn btn--primary btn--block fe-lock">Lock in my order</button>
            <div class="fe-reveal" hidden></div>
          </div>`;
        const list = stage.querySelector('.fe-rungs');
        const lock = stage.querySelector('.fe-lock');
        const revealEl = stage.querySelector('.fe-reveal');
        BG.fx.sound('pop');
        scrollTop();

        const bars = (k) =>
          `<span class="fe-meter" aria-hidden="true">${Array.from({ length: n }, (_, j) => `<i class="${j <= k ? 'on' : ''}"></i>`).join('')}</span>`;

        function render(focusIdx) {
          list.innerHTML = order
            .map((w, k) => `
              <li class="fe-rung-li">
                <button class="fe-rung${picked === k ? ' is-picked' : ''}" data-k="${k}" aria-label="${BG.esc(w)}, position ${k + 1} of ${n}. Arrow keys move it.">
                  <span class="fe-grip" aria-hidden="true">⋮⋮</span>
                  <span class="fe-rung-word">${BG.esc(w)}</span>
                  ${bars(k)}
                </button>
              </li>`)
            .join('');
          if (focusIdx != null) {
            const b = list.querySelector(`[data-k="${focusIdx}"]`);
            if (b) b.focus({ preventScroll: true });
          }
        }
        render();

        function move(from, to) {
          if (to < 0 || to >= n || from === to) return;
          const [w] = order.splice(from, 1);
          order.splice(to, 0, w);
        }

        // Tap two to swap
        let justDragged = false;
        list.addEventListener('click', (e) => {
          const b = e.target.closest('.fe-rung');
          if (!b || locked) return;
          if (justDragged) {
            justDragged = false;
            return;
          }
          const k = Number(b.dataset.k);
          if (picked == null) {
            picked = k;
            BG.fx.sound('tap');
            render(k);
          } else if (picked === k) {
            picked = null;
            render(k);
          } else {
            [order[picked], order[k]] = [order[k], order[picked]];
            picked = null;
            BG.fx.sound('pick');
            BG.fx.haptic();
            render(k);
            BG.fx.pop(list.querySelector(`[data-k="${k}"]`));
          }
        });

        // Arrow keys move the focused word
        list.addEventListener('keydown', (e) => {
          const b = e.target.closest('.fe-rung');
          if (!b || locked) return;
          const k = Number(b.dataset.k);
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const to = k + (e.key === 'ArrowUp' ? -1 : 1);
            if (to < 0 || to >= n) return;
            move(k, to);
            picked = null;
            BG.fx.sound('tap');
            render(to);
          }
        });

        // Drag to reorder (pointer events: mouse, touch, pen)
        let drag = null;
        list.addEventListener('pointerdown', (e) => {
          const b = e.target.closest('.fe-rung');
          if (!b || locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
          const rungs = Array.from(list.querySelectorAll('.fe-rung'));
          const rects = rungs.map((r) => r.getBoundingClientRect());
          const step = rects.length > 1 ? rects[1].top - rects[0].top : rects[0].height;
          drag = { el: b, k: Number(b.dataset.k), y0: e.clientY, id: e.pointerId, rungs, step, to: Number(b.dataset.k), moved: false };
        });
        list.addEventListener('pointermove', (e) => {
          if (!drag || e.pointerId !== drag.id) return;
          const dy = e.clientY - drag.y0;
          if (!drag.moved) {
            if (Math.abs(dy) < 8) return;
            drag.moved = true;
            try {
              drag.el.setPointerCapture(drag.id);
            } catch {
              /* ignore */
            }
            drag.el.classList.add('is-dragging');
            list.classList.add('is-sorting');
            picked = null;
            drag.rungs.forEach((r) => r.classList.remove('is-picked'));
          }
          e.preventDefault();
          const minDy = -drag.k * drag.step;
          const maxDy = (n - 1 - drag.k) * drag.step;
          const cy = Math.max(minDy, Math.min(maxDy, dy));
          drag.el.style.transform = `translateY(${cy}px) scale(1.03)`;
          const to = Math.max(0, Math.min(n - 1, Math.round(drag.k + cy / drag.step)));
          if (to !== drag.to) {
            drag.to = to;
            BG.fx.sound('tick');
          }
          drag.rungs.forEach((r, j) => {
            if (j === drag.k) return;
            let s = 0;
            if (drag.k < to && j > drag.k && j <= to) s = -drag.step;
            if (drag.k > to && j < drag.k && j >= to) s = drag.step;
            r.style.transform = s ? `translateY(${s}px)` : '';
          });
        });
        const endDrag = (e) => {
          if (!drag || (e && e.pointerId !== drag.id)) return;
          const d = drag;
          drag = null;
          if (!d.moved) return;
          justDragged = true;
          later(() => (justDragged = false), 60);
          list.classList.remove('is-sorting');
          move(d.k, d.to);
          BG.fx.sound('pick');
          BG.fx.haptic();
          render();
          BG.fx.pop(list.querySelector(`[data-k="${d.to}"]`));
        };
        list.addEventListener('pointerup', endDrag);
        list.addEventListener('pointercancel', endDrag);

        await new Promise((res) => lock.addEventListener('click', res, { once: true }));
        if (!ctx.alive) return;
        locked = true;
        picked = null;
        render();
        lock.hidden = true;

        // ---------- score ----------
        let good = 0;
        for (let k = 0; k < n - 1; k++) if (truth.indexOf(order[k]) < truth.indexOf(order[k + 1])) good += 1;
        const perfect = good === n - 1;
        const pts = Math.round((PTS_B * good) / (n - 1));
        Array.from(list.querySelectorAll('.fe-rung')).forEach((b, k) => {
          const ok = truth[k] === order[k];
          b.classList.add(ok ? 'is-ok' : 'is-off');
          b.disabled = true;
          if (!ok) b.insertAdjacentHTML('beforeend', `<span class="fe-rung-should">#${truth.indexOf(order[k]) + 1}</span>`);
        });
        BG.fx.sound(perfect ? 'win' : good > 0 ? 'good' : 'bad');
        if (perfect) {
          BG.fx.confetti(90);
          gainLifetime();
        } else BG.fx.shake(list);
        if (pts) ctx.addScore(pts, list);

        revealEl.innerHTML = `
          <div class="card fe-verdict ${perfect ? 'fe-verdict--ok' : good ? '' : 'fe-verdict--bad'}">
            <h3 class="fe-title">${perfect ? 'Perfect volume control! 🎚️' : `${good} of ${n - 1} steps in the right direction`}</h3>
            <p class="fe-why">${BG.esc(ladder.note)}</p>
            <ol class="fe-defs fe-defs--ladder" aria-label="Correct order with definitions">
              ${truth.map((w, k) => `
                <li class="fe-def">
                  <span class="fe-def-word">${bars(k)} ${BG.esc(w)}</span>
                  <span class="fe-def-text">${BG.esc(def(w))}</span>
                </li>`).join('')}
            </ol>
            <div class="fe-points"><span class="chip ${pts ? 'chip--ok' : 'chip--blue'}">+${pts} ladder</span></div>
          </div>
          <button class="btn btn--primary btn--block fe-next">Continue →</button>`;
        revealEl.hidden = false;
        phase = 'reveal';
        const nextBtn = revealEl.querySelector('.fe-next');
        try {
          revealEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
        BG.track('feels_ladder', { ladder: ladder.name, good, n, perfect });
        nextBtn.focus({ preventScroll: true });
        await waitNext(nextBtn);
        if (!ctx.alive) return;
        BG.fx.sound('tap');
        return { good, steps: n - 1, perfect, pts };
      }

      // ---------- Round C: name your own (optional, private, unscored) ----------
      function diaryStrip(diary) {
        const toneOf = {};
        (data.wheel || []).forEach((g) => g.words.forEach((w) => (toneOf[w] = g.tone)));
        const last = diary.slice(-7);
        return `<div class="fe-diary" aria-label="Your recent feelings">
          ${last.map((e) => `
            <span class="fe-diary-day">
              <span class="fe-diary-date">${BG.esc(shortDate(e.date))}</span>
              <span class="fe-diary-word fe-tone--${BG.esc(toneOf[e.word] || 'blue')}">${BG.esc(e.word)}</span>
            </span>`).join('')}
        </div>`;
      }

      async function moodCheck() {
        ctx.setProgress(STEPS, STEPS);
        phase = 'mood';
        const diary = ctx.store.get('diary', []) || [];
        stage.innerHTML = `
          <div class="card fe-mood-ask">
            <span class="fe-banner-emoji" aria-hidden="true">🫶</span>
            <h3 class="fe-title">Name your own</h3>
            <p class="fe-q">How do you feel right now? Pick the closest word in 15 seconds.</p>
            <p class="fe-private">🔒 Not scored, not shared. Saved only on this device, so you can look back at your own mood diary.</p>
            <div class="fe-mood-btns">
              <button class="btn btn--primary btn--block fe-mood-go">Name my feeling</button>
              <button class="btn btn--ghost btn--block fe-mood-skip">Skip</button>
            </div>
          </div>`;
        scrollTop();
        const go = await new Promise((res) => {
          stage.querySelector('.fe-mood-go').addEventListener('click', () => res(true), { once: true });
          stage.querySelector('.fe-mood-skip').addEventListener('click', () => res(false), { once: true });
        });
        if (!ctx.alive) return null;
        BG.fx.sound('tap');
        if (!go) return null;

        stage.innerHTML = `
          <div class="fe-round fe-mood">
            <p class="fe-q fe-mood-q">Right now I feel…</p>
            <div class="fe-mood-timer"></div>
            <div class="fe-wheel" role="group" aria-label="Feelings wheel">
              ${(data.wheel || []).map((g) => `
                <div class="fe-quad fe-tone--${BG.esc(g.tone)}">
                  <span class="fe-quad-name">${BG.esc(g.name)} <span class="fe-quad-hint">${BG.esc(g.hint)}</span></span>
                  <div class="fe-quad-words">
                    ${g.words.map((w) => `<button class="fe-mood-word" data-w="${BG.esc(w)}" title="${BG.esc(def(w))}">${BG.esc(w)}</button>`).join('')}
                  </div>
                </div>`).join('')}
            </div>
            <p class="fe-private">🔒 Stays on this device.</p>
          </div>`;
        moodTimer = BG.timerBar(stage.querySelector('.fe-mood-timer'), MOOD_SECS);
        const wheel = stage.querySelector('.fe-wheel');
        const pick = await Promise.race([
          moodTimer.done.then(() => null),
          new Promise((res) =>
            wheel.addEventListener('click', (e) => {
              const b = e.target.closest('.fe-mood-word');
              if (b) res(b.dataset.w);
            })
          ),
        ]);
        if (moodTimer) moodTimer.stop();
        moodTimer = null;
        if (!ctx.alive) return null;

        if (!pick) {
          stage.innerHTML = `
            <div class="card fe-mood-ask">
              <span class="fe-banner-emoji" aria-hidden="true">⏳</span>
              <h3 class="fe-title">No rush</h3>
              <p class="fe-q">Feelings can be hard to name on the spot. Try again tomorrow.</p>
              <button class="btn btn--primary btn--block fe-next">Continue →</button>
            </div>`;
        } else {
          const date = localDate();
          const next = diary.filter((e) => e && e.date !== date);
          next.push({ date, day: ctx.day, word: pick });
          const kept = next.slice(-60);
          ctx.store.set('diary', kept);
          BG.fx.sound('good');
          BG.fx.haptic();
          stage.innerHTML = `
            <div class="card fe-mood-ask">
              <span class="fe-banner-emoji" aria-hidden="true">📔</span>
              <h3 class="fe-title">Noted: <span class="fe-mood-picked">${BG.esc(pick)}</span></h3>
              <p class="fe-def-text">${BG.esc(def(pick))}</p>
              <p class="fe-private">🔒 Saved in your mood diary on this device only.</p>
              ${kept.length > 1 ? `<span class="label">Your last ${Math.min(7, kept.length)} check-ins</span>${diaryStrip(kept)}` : ''}
              <button class="btn btn--primary btn--block fe-next">Continue →</button>
            </div>`;
          BG.fx.pop(stage.querySelector('.fe-mood-picked'));
        }
        phase = 'reveal';
        const nextBtn = stage.querySelector('.fe-next');
        nextBtn.focus({ preventScroll: true });
        await waitNext(nextBtn);
        if (!ctx.alive) return null;
        BG.fx.sound('tap');
        return pick;
      }

      // ---------- game ----------
      async function run() {
        const ok = (data.vignettes || []).length >= A_ROUNDS && (data.ladders || []).length;
        if (!ok) {
          stage.innerHTML = '<p class="muted">The feelings dictionary is missing (content file not loaded). Please refresh.</p>';
          return;
        }
        const pick = ctx.mode === 'daily' ? chooseDaily(data, ctx.day) : choosePractice(data, ctx.rand);
        const cases = BG.shuffle(pick.vigs, ctx.rand);

        ctx.setProgress(1, STEPS);
        await banner('A', 'Which word fits best?', '5 tiny scenes. Find the sharpest word for each feeling.', '🔍');
        if (!ctx.alive) return;
        for (let r = 0; r < cases.length; r++) {
          await playCase(r, cases[r]);
          if (!ctx.alive) return;
        }

        await banner('B', 'Turn up the volume', `One family of feelings: ${pick.ladder.name.toLowerCase()}. Put the words in order of intensity.`, '🎚️');
        if (!ctx.alive) return;
        const lad = await playLadder(pick.ladder);
        if (!ctx.alive || !lad) return;

        const mood = await moodCheck();
        if (!ctx.alive) return;

        // ---------- ending ----------
        phase = 'end';
        const lv = levelFor(lifetime);
        const perfect = correctCount === A_ROUNDS && lad.perfect;
        const line = perfect
          ? 'Every feeling named precisely and the ladder in perfect order. Your inner dictionary is sharp.'
          : correctCount >= 4
          ? 'Sharp naming. A few shades still blurred together.'
          : correctCount >= 2
          ? 'Your feelings vocabulary is growing. Every new word is a finer lens.'
          : 'Tricky ones today. Tomorrow brings new scenes and new words.';
        stage.innerHTML = `
          <div class="card fe-end">
            <div class="fe-end-emoji" aria-hidden="true">${perfect ? '🏆' : '🫶'}</div>
            <p class="big-num fe-end-score">${correctCount}/${A_ROUNDS}</p>
            <p class="fe-end-line">${BG.esc(line)}</p>
            <p class="fe-end-row"><span class="label">Ladder</span><span>${lad.perfect ? 'Perfect 🎚️' : `${lad.good}/${lad.steps} steps`}</span></p>
            <p class="fe-end-row"><span class="label">Vocabulary level</span><span>${lv.emoji} ${BG.esc(lv.name)}${lv.next ? ` · ${lv.next - lifetime} to go` : ''}</span></p>
            <div class="fe-end-words"><span class="label">Today's words</span>${learned.map((w) => `<span class="chip chip--blue" title="${BG.esc(def(w))}">${BG.esc(w)}</span>`).join('')}</div>
            <button class="btn btn--primary btn--block fe-finish">See results 🫶</button>
          </div>`;
        BG.fx.pop(stage.querySelector('.fe-end'));
        if (perfect) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else BG.fx.sound(correctCount * 2 >= A_ROUNDS ? 'good' : 'lose');
        scrollTop();
        const fin = stage.querySelector('.fe-finish');
        fin.focus({ preventScroll: true });
        await new Promise((res) => {
          fin.addEventListener('click', res, { once: true });
          later(res, 12000);
        });
        if (!ctx.alive) return;
        ctx.finish({
          summary: `Nailed ${correctCount}/${A_ROUNDS} feelings · Ladder ${lad.perfect ? 'perfect' : `${lad.good}/${lad.steps}`} 🫶`,
          stats: {
            feelings: `${correctCount}/${A_ROUNDS}`,
            ladder: lad.perfect ? 'perfect' : `${lad.good}/${lad.steps}`,
            level: `${lv.emoji} ${lv.name}`,
            words: lifetime,
            checkedIn: !!mood,
          },
        });
      }

      run();
    },
  });
})();

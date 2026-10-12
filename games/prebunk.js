// Prebunk: the manipulation detective. A feed of fictional posts, each using one
// manipulation technique (or none). Name the trick, bet on it, see the giveaway light up.
// Based on "inoculation" research: a short dose of the tricks builds resistance to them.
(() => {
  'use strict';

  const ORDER = ['fear', 'expert', 'dichotomy', 'scapegoat', 'adhominem', 'cherry', 'impersonation', 'bandwagon', 'fine'];
  const TOTAL = 6;
  const TECH_PER_DAY = 5; // + 1 "Seems fine"
  const MONTAGE_SECS = 15;
  const BET_KEYS = ['guess', 'likely', 'sure'];
  const AVATARS = ['🦊', '🐸', '🦉', '🐙', '🐢', '🦄', '🐝', '🐼', '🦔', '🐧', '🍄', '🌵', '🦩', '🐌', '🦆', '🐿️'];
  const AV_TONES = ['accent', 'blue', 'ok', 'gold', 'warn'];

  const LEVELS = [
    [0, 'Easily fooled 🐟'],
    [1, 'Raised eyebrow 🤨'],
    [3, 'Sharp-eyed 🦉'],
    [5, 'Force field 🛡️'],
    [6, 'Unfoolable 🧪'],
  ];

  const LINES = {
    right: ['Busted! 🔍', 'Case closed. 🕵️', 'Nice catch! 🎯', 'Trick spotted! 🧪', 'Elementary. 🔎'],
    fineRight: ['Correct: nothing shady here ✅', 'Clean post, clean call ✅', 'Good: no trick to find ✅'],
    fineMissed: ['That one was actually fine 🙃', 'False alarm: no trick there 🙃'],
    trickMissed: ['It slipped past you 🫣', 'The trick got through 🫣'],
    wrongTrick: ['Right suspicion, wrong trick 🤏', 'Shady, yes, but a different trick 🤏'],
  };

  // ---------- Content selection ----------
  // Daily: technique posts are laid out in a fixed round-robin stream (each technique in turn),
  // and day d takes the next 5. Any 5 consecutive stream items are 5 different techniques, and
  // a post comes back only after the whole stream (64 posts ≈ 12.8 days). Fine posts cycle every 12 days.
  function chooseDaily(data, day) {
    const techIds = ORDER.filter((t) => t !== 'fine');
    const by = {};
    techIds.forEach((t) => {
      by[t] = BG.shuffle(data.posts.filter((p) => p.technique === t), BG.rng(BG.hash('prebunk-posts-' + t)));
    });
    const tOrder = BG.shuffle(techIds, BG.rng(BG.hash('prebunk-tech-order')));
    const per = Math.min(...techIds.map((t) => by[t].length));
    const stream = [];
    for (let k = 0; k < per; k++) tOrder.forEach((t) => stream.push(by[t][k]));
    const fine = BG.shuffle(data.posts.filter((p) => p.technique === 'fine'), BG.rng(BG.hash('prebunk-fine')));
    const d = Math.max(0, day - 1);
    const picked = [];
    for (let j = 0; j < TECH_PER_DAY; j++) picked.push(stream[(d * TECH_PER_DAY + j) % stream.length]);
    picked.push(fine[d % fine.length]);
    return picked;
  }

  function choosePractice(data, rand) {
    const techIds = BG.shuffle(ORDER.filter((t) => t !== 'fine'), rand);
    const fineCount = rand() < 0.3 ? 2 : 1;
    const picked = techIds.slice(0, TOTAL - fineCount).map((t) => BG.pick(data.posts.filter((p) => p.technique === t), rand));
    BG.shuffle(data.posts.filter((p) => p.technique === 'fine'), rand)
      .slice(0, fineCount)
      .forEach((p) => picked.push(p));
    return picked;
  }

  function order(posts, rand) {
    const out = BG.shuffle(posts, rand);
    // Open with a trick, so round 1 rewards the training montage.
    if (out[0] && out[0].technique === 'fine') {
      const j = out.findIndex((p) => p.technique !== 'fine');
      if (j > 0) [out[0], out[j]] = [out[j], out[0]];
    }
    return out;
  }

  // Escape the body, then turn [[giveaway]] into a highlightable mark.
  function renderBody(body) {
    return BG.esc(body).replace(/\[\[([\s\S]+?)\]\]/g, '<mark class="pb-tell">$1</mark>');
  }

  function fmtCount(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return Math.round(n / 1e3) + 'K';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  }

  BG.registerGame({
    id: 'prebunk',
    name: 'Prebunk',
    emoji: '🧪',
    skill: 'Seeing through manipulation',
    category: 'life',
    tagline: 'Every post is hiding a trick. Name it before it gets you.',
    howTo: [
      'A quick training montage shows you a few manipulation tricks.',
      'Then 6 posts hit your feed. Each uses one trick, or none.',
      'Tap the evidence card for the trick (or "Seems fine") and bet on it.',
      'The giveaway phrase lights up, with a tip on how to defuse it.',
    ],
    science:
      'After about 15 minutes of the "Bad News" game, players rated fake news about 21% less reliable, with no drop for real news (Roozenbeek & van der Linden, 2019). Short prebunking videos shown as YouTube ads to 22,632 people improved technique recognition (Roozenbeek et al., Science Advances 2022).',
    scienceUrl: 'https://www.cam.ac.uk/research/news/fake-news-vaccine-works-pre-bunk-game-reduces-susceptibility-to-disinformation',
    minutes: 3,
    maxScore: TOTAL * (50 + 40),

    mount(root, ctx) {
      const data = window.BG_DATA_PREBUNK || { techniques: [], posts: [] };
      const TECH = {};
      (data.techniques || []).forEach((t) => (TECH[t.id] = t));
      const techList = ORDER.map((id) => TECH[id]).filter(Boolean);

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
      let montageTimer = null;

      // ---------- state ----------
      let phase = 'montage'; // montage | choose | bet | reveal | end
      let selected = null;
      let resolveChoice = null;
      let resolveNext = null;
      let resolveSkip = null;
      let correctCount = 0;
      let streak = 0;
      const results = [];

      // ---------- DOM ----------
      const wrap = BG.el(`
        <div class="pb-wrap">
          <div class="pb-meter" aria-live="polite">
            <div class="pb-meter-top">
              <span class="label">Disinformation resistance</span>
              <span class="pb-level">${BG.esc(LEVELS[0][1])}</span>
            </div>
            <div class="pb-meter-bar"><div class="pb-meter-fill"></div></div>
          </div>
          <div class="pb-stage"></div>
        </div>`);
      root.appendChild(wrap);
      const stage = wrap.querySelector('.pb-stage');
      const meterFill = wrap.querySelector('.pb-meter-fill');
      const levelEl = wrap.querySelector('.pb-level');
      const meterEl = wrap.querySelector('.pb-meter');
      const hasKeys = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

      function setMeter() {
        meterFill.style.transform = `scaleX(${correctCount / TOTAL})`;
        let label = LEVELS[0][1];
        LEVELS.forEach(([min, l]) => {
          if (correctCount >= min) label = l;
        });
        if (levelEl.textContent !== label) {
          levelEl.textContent = label;
          BG.fx.pop(levelEl);
        }
        meterEl.classList.toggle('is-full', correctCount >= TOTAL);
      }
      setMeter();

      // ---------- keyboard ----------
      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey) return;
        const active = document.activeElement;
        const onButton = active && active.tagName === 'BUTTON';
        if (phase === 'montage') {
          if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') && !onButton) {
            e.preventDefault();
            if (resolveSkip) resolveSkip();
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
          if (/^[1-9]$/.test(e.key)) {
            const t = techList[Number(e.key) - 1];
            if (t) {
              e.preventDefault();
              select(t.id, true);
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
        if (montageTimer) montageTimer.stop();
        document.removeEventListener('keydown', onKey);
        phase = 'end';
      });

      // ---------- training montage ----------
      async function montage(teach) {
        phase = 'montage';
        stage.innerHTML = `
          <div class="card pb-montage">
            <div class="pb-montage-head">
              <span class="label">🎬 Training montage</span>
              <button class="btn btn--ghost btn--sm pb-skip">Skip →</button>
            </div>
            <div class="pb-montage-timer"></div>
            <div class="pb-lesson" aria-live="polite"></div>
            <div class="pb-montage-dots">${teach.map(() => '<span></span>').join('')}</div>
            <p class="pb-montage-note muted">A small dose of the tricks now makes them easier to spot later. That's the "vaccine".</p>
          </div>`;
        const lessonEl = stage.querySelector('.pb-lesson');
        const dots = Array.from(stage.querySelectorAll('.pb-montage-dots span'));
        const per = MONTAGE_SECS / teach.length;
        let shownIdx = -1;
        const show = (i) => {
          if (i === shownIdx || !teach[i]) return;
          shownIdx = i;
          const t = teach[i];
          lessonEl.innerHTML = `
            <div class="pb-lesson-card">
              <div class="pb-lesson-emoji" aria-hidden="true">${t.emoji}</div>
              <h3 class="pb-lesson-name">${BG.esc(t.name)}</h3>
              <p class="pb-lesson-def">${BG.esc(t.definition)}</p>
              <p class="pb-lesson-ex">${BG.esc(t.example)}</p>
              <p class="pb-lesson-tip"><b>🛡️ Defuse:</b> ${BG.esc(t.defuse)}</p>
            </div>`;
          dots.forEach((d, k) => d.classList.toggle('is-on', k <= i));
          BG.fx.sound('pop');
        };
        show(0);
        const timerHost = stage.querySelector('.pb-montage-timer');
        montageTimer = BG.timerBar(timerHost, MONTAGE_SECS, {
          warnAt: 0,
          onTick: (sec) => show(Math.min(teach.length - 1, Math.floor((MONTAGE_SECS - sec) / per))),
        });
        const skip = new Promise((res) => (resolveSkip = res));
        stage.querySelector('.pb-skip').addEventListener('click', () => resolveSkip && resolveSkip(), { once: true });
        const how = await Promise.race([montageTimer.done.then(() => 'done'), skip.then(() => 'skip')]);
        resolveSkip = null;
        if (montageTimer) montageTimer.stop();
        montageTimer = null;
        if (!ctx.alive) return;
        BG.fx.sound('tap');
        BG.track('prebunk_montage', { how });
      }

      // ---------- a round ----------
      let gridBtns = [];
      let accuseBtn = null;

      function select(id, fromKey) {
        if (phase !== 'choose') return;
        if (id === selected && !fromKey) {
          confirmPick();
          return;
        }
        selected = id;
        gridBtns.forEach((b) => {
          const on = b.dataset.t === id;
          b.classList.toggle('is-selected', on);
          b.setAttribute('aria-pressed', String(on));
        });
        const t = TECH[id];
        accuseBtn.disabled = false;
        accuseBtn.textContent = id === 'fine' ? '✅ Mark as clean' : `🔍 Accuse: ${t.name}`;
        BG.fx.sound('tap');
        BG.fx.haptic();
        const btn = gridBtns.find((b) => b.dataset.t === id);
        BG.fx.pop(btn);
        if (fromKey && btn) btn.focus({ preventScroll: true });
      }

      function confirmPick() {
        if (phase !== 'choose' || !selected) return;
        BG.fx.haptic(30);
        if (resolveChoice) resolveChoice(selected);
      }

      async function playRound(r, post) {
        ctx.setProgress(r + 1, TOTAL);
        phase = 'choose';
        selected = null;
        const h = BG.hash(post.id);
        const viral = post.technique !== 'fine';
        const likes = viral ? 800 + (h % 48000) : 6 + (h % 240);
        const shares = viral ? Math.round(likes * (0.35 + ((h >>> 8) % 40) / 100)) : 1 + ((h >>> 8) % 30);
        const hours = 1 + ((h >>> 16) % 11);
        const avatar = AVATARS[h % AVATARS.length];
        const tone = AV_TONES[(h >>> 4) % AV_TONES.length];

        stage.innerHTML = `
          <div class="pb-round">
            <div class="pb-meta">
              <span class="label">Post ${r + 1} of ${TOTAL}</span>
              <span class="chip chip--gold pb-combo" ${streak >= 2 ? '' : 'hidden'}>🔥 Streak x${streak}</span>
            </div>
            <article class="card pb-post">
              <header class="pb-post-head">
                <span class="pb-avatar pb-avatar--${tone}" aria-hidden="true">${avatar}</span>
                <span class="pb-who">
                  <span class="pb-name">${BG.esc(post.name)}</span>
                  <span class="pb-handle">@${BG.esc(post.handle)} · ${hours}h</span>
                </span>
              </header>
              <p class="pb-body">${renderBody(post.body)}</p>
              <footer class="pb-post-foot" aria-label="Engagement">
                <span>♥ ${fmtCount(likes)}</span>
                <span>🔁 ${fmtCount(shares)}</span>
                <span>💬 ${fmtCount(Math.round(shares / 3) + 1)}</span>
              </footer>
            </article>
            <p class="pb-hint">${hasKeys ? 'Which trick is this? Keys 1–9 pick · Enter accuses' : 'Which trick is this post using?'}</p>
            <div class="pb-grid" role="group" aria-label="Evidence cards">
              ${techList.map((t, i) => `
                <button class="pb-ev${t.id === 'fine' ? ' pb-ev--fine' : ''}" data-t="${t.id}" aria-pressed="false" title="${BG.esc(t.definition)}">
                  ${hasKeys ? `<span class="pb-ev-key">${i + 1}</span>` : ''}
                  <span class="pb-ev-emoji" aria-hidden="true">${t.emoji}</span>
                  <span class="pb-ev-name">${BG.esc(t.name)}</span>
                </button>`).join('')}
            </div>
            <button class="btn btn--primary btn--block pb-accuse" disabled>Pick an evidence card</button>
            <div class="pb-reveal" hidden></div>
          </div>`;

        const postEl = stage.querySelector('.pb-post');
        const grid = stage.querySelector('.pb-grid');
        const hintEl = stage.querySelector('.pb-hint');
        const revealEl = stage.querySelector('.pb-reveal');
        accuseBtn = stage.querySelector('.pb-accuse');
        gridBtns = Array.from(grid.querySelectorAll('.pb-ev'));
        BG.fx.sound('pop');
        try {
          wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* old browsers */
        }

        grid.addEventListener('click', (e) => {
          const b = e.target.closest('.pb-ev');
          if (b) select(b.dataset.t, false);
        });
        accuseBtn.addEventListener('click', confirmPick);

        const choice = await new Promise((res) => (resolveChoice = res));
        resolveChoice = null;
        if (!ctx.alive) return;

        // ---------- stamp + bet ----------
        phase = 'bet';
        grid.classList.add('is-locked');
        gridBtns.forEach((b) => (b.disabled = true));
        accuseBtn.hidden = true;
        hintEl.textContent = '';
        const picked = TECH[choice];
        const stamp = BG.el(`<span class="pb-stamp${choice === 'fine' ? ' pb-stamp--ok' : ''}"></span>`);
        stamp.textContent = choice === 'fine' ? 'CLEAN? ✅' : `${picked.emoji} ${picked.name.toUpperCase()}?`;
        postEl.appendChild(stamp);
        BG.fx.sound('pop');
        BG.fx.haptic(40);
        await wait(550);
        if (!ctx.alive) return;

        const bet = await ctx.bet('How sure?');
        if (!ctx.alive) return;

        // ---------- reveal ----------
        phase = 'reveal';
        const answer = TECH[post.technique];
        const correct = choice === post.technique;
        stamp.remove();
        gridBtns.forEach((b) => {
          if (b.dataset.t === post.technique) b.classList.add('is-answer');
          else if (b.dataset.t === choice) b.classList.add('is-wrong');
        });
        const tell = postEl.querySelector('.pb-tell');
        if (tell) tell.classList.add('is-lit');
        postEl.classList.add(post.technique === 'fine' ? 'is-clean' : 'is-tricky');
        if (post.technique === 'fine') {
          const s = BG.el('<span class="pb-stamp pb-stamp--ok pb-stamp--final">NO TRICKS ✅</span>');
          postEl.appendChild(s);
        } else {
          const s = BG.el('<span class="pb-stamp pb-stamp--final"></span>');
          s.textContent = `${answer.emoji} ${answer.name.toUpperCase()}`;
          postEl.appendChild(s);
        }

        let title;
        if (correct) title = BG.pick(post.technique === 'fine' ? LINES.fineRight : LINES.right, ctx.rand);
        else if (post.technique === 'fine') title = BG.pick(LINES.fineMissed, ctx.rand);
        else if (choice === 'fine') title = BG.pick(LINES.trickMissed, ctx.rand);
        else title = BG.pick(LINES.wrongTrick, ctx.rand);

        const youSaid = correct
          ? ''
          : `<p class="pb-yousaid muted">You said ${picked.emoji} ${BG.esc(picked.name)}.</p>`;
        revealEl.innerHTML = `
          <div class="card pb-verdict ${correct ? 'pb-verdict--ok' : 'pb-verdict--bad'}">
            <h3 class="pb-title">${BG.esc(title)}</h3>
            <p class="pb-answer"><span class="label">The trick</span><span class="pb-answer-name">${answer.emoji} ${BG.esc(answer.name)}</span></p>
            ${youSaid}
            <p class="pb-explain">${BG.esc(post.explain)}</p>
            <p class="pb-defuse"><b>🛡️ How to defuse it:</b> ${BG.esc(answer.defuse)}</p>
            <div class="pb-points"></div>
          </div>
          <button class="btn btn--primary btn--block pb-next">${r + 1 < TOTAL ? 'Next post →' : 'See results 🏁'}</button>`;
        revealEl.hidden = false;
        const verdict = revealEl.querySelector('.pb-verdict');
        const pointsEl = revealEl.querySelector('.pb-points');
        const nextBtn = revealEl.querySelector('.pb-next');
        nextBtn.disabled = true;
        BG.fx.sound(correct ? 'good' : 'bad');
        if (correct) BG.fx.pop(postEl);
        else BG.fx.shake(postEl);
        try {
          (tell || postEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          /* old browsers */
        }

        const chips = [];
        if (correct) {
          correctCount += 1;
          streak += 1;
          ctx.addScore(50, tell || postEl);
          chips.push('<span class="chip chip--ok">+50 spotted</span>');
          if (streak >= 2) {
            const combo = stage.querySelector('.pb-combo');
            combo.textContent = `🔥 Streak x${streak}`;
            combo.hidden = false;
            BG.fx.pop(combo);
          }
        } else {
          streak = 0;
        }
        setMeter();
        pointsEl.innerHTML = chips.join('');
        await wait(500);
        if (!ctx.alive) return;
        const delta = ctx.settleBet(bet, correct, verdict);
        ctx.addScore(delta);
        const b = BG.BETS[bet];
        pointsEl.insertAdjacentHTML(
          'beforeend',
          `<span class="chip ${delta > 0 ? 'chip--ok' : delta < 0 ? '' : 'chip--blue'}">${b ? b.emoji : ''} bet ${delta > 0 ? '+' : ''}${delta}</span>`
        );

        results.push({ technique: post.technique, correct });
        const stats = ctx.store.get('byTechnique', {});
        const row = stats[post.technique] || { n: 0, right: 0 };
        row.n += 1;
        if (correct) row.right += 1;
        stats[post.technique] = row;
        ctx.store.set('byTechnique', stats);
        BG.track('prebunk_round', { id: post.id, technique: post.technique, choice, correct, bet });

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

      // ---------- game ----------
      async function run() {
        const posts = data.posts || [];
        if (!posts.length || !techList.length) {
          stage.innerHTML = '<p class="muted">The evidence locker is empty (content file missing). Please refresh.</p>';
          return;
        }
        const rounds = order(ctx.mode === 'daily' ? chooseDaily(data, ctx.day) : choosePractice(data, ctx.rand), ctx.rand);
        if (rounds.some((p) => !p || !TECH[p.technique])) {
          stage.innerHTML = '<p class="muted">Some evidence went missing. Please refresh.</p>';
          return;
        }

        // Teach the first three tricks that actually show up today.
        const teach = [];
        rounds.forEach((p) => {
          if (p.technique !== 'fine' && !teach.includes(TECH[p.technique]) && teach.length < 3) teach.push(TECH[p.technique]);
        });
        ctx.setProgress(1, TOTAL);
        await montage(teach);
        if (!ctx.alive) return;

        for (let r = 0; r < rounds.length; r++) {
          await playRound(r, rounds[r]);
          if (!ctx.alive) return;
        }

        // ---------- ending ----------
        phase = 'end';
        const missed = [];
        results.forEach((x) => {
          if (!x.correct && !missed.includes(x.technique)) missed.push(x.technique);
        });
        const perfect = correctCount === TOTAL;
        const verdictLine = perfect
          ? 'Not a single trick got past you. Manipulators hate this one weird detective.'
          : correctCount >= 4
          ? 'Strong resistance. A few tricks still wriggled through.'
          : correctCount >= 2
          ? 'Some immunity building. The tricks get easier to see every time.'
          : 'The trolls had a good day. Tomorrow, they won\'t.';
        stage.innerHTML = `
          <div class="card pb-end">
            <div class="pb-end-emoji" aria-hidden="true">${perfect ? '🏆' : '🧪'}</div>
            <p class="big-num pb-end-score">${correctCount}/${TOTAL}</p>
            <p class="pb-end-line">${BG.esc(verdictLine)}</p>
            ${missed.length ? `<p class="pb-end-missed"><span class="label">Watch out for</span>${missed
              .map((id) => `<span class="chip chip--warn">${TECH[id].emoji} ${BG.esc(TECH[id].name)}</span>`)
              .join('')}</p>` : ''}
          </div>`;
        BG.fx.pop(stage.querySelector('.pb-end'));
        if (perfect) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else {
          BG.fx.sound(correctCount * 2 >= TOTAL ? 'good' : 'lose');
        }
        await wait(1800);
        if (!ctx.alive) return;
        ctx.finish({
          summary: `Spotted ${correctCount}/${TOTAL} manipulation tricks 🧪${perfect ? ' Perfect!' : ''}`,
          stats: { spotted: correctCount, posts: TOTAL, missed: missed.map((id) => TECH[id].name).join(', ') || 'none' },
        });
      }

      run();
    },
  });
})();

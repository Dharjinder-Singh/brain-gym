// Brain Gym shell: routing, workout flow, game host, results, stats, sharing.
(() => {
  'use strict';

  const ORDER = ['datewise', 'catchbot', 'recall', 'digits', 'mentalmap', 'onlyyou', 'speak'];
  const WORKOUT_SIZE = 5;
  const CATEGORIES = [
    { id: 'brain', name: 'AI-proof brain', emoji: '🧠', blurb: 'Skills that heavy AI use quietly weakens.' },
    { id: 'life', name: 'Life skills', emoji: '🧭', blurb: 'Everyday smarts: money, safety, people, decisions.' },
    { id: 'cool', name: 'Cool skills', emoji: '✨', blurb: 'Five minutes a day, and one day you just can.' },
  ];
  const view = document.getElementById('view');
  const today = BG.today();
  let active = null; // { destroy() } for the running game

  // Every registered game, in ORDER first, then any others in registration order.
  const games = () => {
    const ids = ORDER.concat(Object.keys(BG.games).filter((id) => !ORDER.includes(id)));
    return ids.map((id) => BG.games[id]).filter(Boolean);
  };
  const catOf = (g) => g.category || 'brain';

  // Today's workout: a deterministic rotating set, one from each category first.
  function workoutGames(n) {
    const all = games();
    if (all.length <= WORKOUT_SIZE) return all;
    const shuffled = BG.shuffle(all, BG.rng(BG.hash(`workout:${n}`)));
    const picked = [];
    CATEGORIES.forEach((c) => {
      const g = shuffled.find((x) => catOf(x) === c.id && !picked.includes(x));
      if (g) picked.push(g);
    });
    for (const g of shuffled) {
      if (picked.length >= WORKOUT_SIZE) break;
      if (!picked.includes(g)) picked.push(g);
    }
    return picked.sort((a, b) => all.indexOf(a) - all.indexOf(b));
  }

  // ---------- Persistence ----------
  function dayRecord(n) {
    return BG.store.get(`day:${n}`, { results: {} });
  }

  function saveResult(n, id, result) {
    const rec = dayRecord(n);
    rec.results[id] = result;
    const complete = workoutGames(n).every((g) => rec.results[g.id]);
    if (complete && !rec.completed) {
      rec.completed = true;
      bumpStreak(n);
    }
    BG.store.set(`day:${n}`, rec);
    return rec;
  }

  function bumpStreak(n) {
    if (n !== today) return;
    const s = BG.store.get('streak', { count: 0, last: 0, best: 0 });
    if (s.last === n) return;
    s.count = s.last === n - 1 ? s.count + 1 : 1;
    s.last = n;
    s.best = Math.max(s.best || 0, s.count);
    BG.store.set('streak', s);
  }

  function currentStreak() {
    const s = BG.store.get('streak', { count: 0, last: 0, best: 0 });
    return s.last >= today - 1 ? s.count : 0;
  }

  function pctOf(result, game) {
    return Math.max(0, Math.min(1, result.score / (game.maxScore || 100)));
  }

  function tile(pct) {
    return pct >= 0.75 ? '🟩' : pct >= 0.45 ? '🟨' : '🟥';
  }

  // ---------- Top bar ----------
  const soundBtn = document.getElementById('btn-sound');
  function paintSound() {
    const muted = BG.store.get('muted', false);
    soundBtn.textContent = muted ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  }
  soundBtn.addEventListener('click', () => {
    BG.store.set('muted', !BG.store.get('muted', false));
    paintSound();
    BG.fx.sound('pop');
  });
  paintSound();

  function paintStreak() {
    const chip = document.getElementById('streak-chip');
    const n = currentStreak();
    chip.hidden = n < 1;
    chip.textContent = `🔥 ${n}`;
  }

  // ---------- Router ----------
  function route() {
    if (active) {
      active.destroy();
      active = null;
    }
    document.querySelectorAll('.bet-sheet').forEach((el) => el.remove());
    paintStreak();
    const hash = location.hash.replace(/^#\/?/, '');
    const [page, arg] = hash.split('/');
    window.scrollTo(0, 0);
    if (page === 'play' && BG.games[arg]) return renderPlay(arg, 'daily');
    if (page === 'practice' && BG.games[arg]) return renderPlay(arg, 'practice');
    if (page === 'done') return renderDone();
    if (page === 'stats') return renderStats();
    if (page === 'science') return renderScience();
    if (page === 'library') return renderLibrary();
    return renderHome();
  }
  window.addEventListener('hashchange', route);

  // ---------- Home ----------
  function nextGame(rec) {
    return workoutGames(today).find((g) => !rec.results[g.id]);
  }

  function renderHome() {
    const rec = dayRecord(today);
    const list = workoutGames(today);
    const done = list.filter((g) => rec.results[g.id]).length;
    const total = list.reduce((sum, g) => sum + (rec.results[g.id] ? rec.results[g.id].score : 0), 0);
    const next = nextGame(rec);
    const date = BG.dateOf(today).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const ring = Math.round((done / list.length) * 100);

    const cta = next
      ? `<a class="btn btn--primary btn--block home-cta" href="#/play/${next.id}">${done ? 'Continue' : 'Start workout'} · ${next.emoji} ${BG.esc(next.name)}</a>`
      : `<a class="btn btn--dark btn--block home-cta" href="#/done">Workout complete · See results 🎉</a>`;

    view.innerHTML = `
      <section class="hero">
        <p class="label">Workout #${today} · ${date}</p>
        <h1 class="hero-title">Train what AI<br>lets slip.</h1>
        <p class="hero-sub">${list.length} quick games today, about ${list.reduce((s, g) => s + (g.minutes || 2), 0)} minutes. Each one trains a real skill, backed by research. A new mix every day.</p>
        <div class="hero-progress">
          <div class="ring" style="--p:${ring}">
            <span class="ring-num">${done}<small>/${list.length}</small></span>
          </div>
          <div class="hero-stats">
            <div><span class="big-num">${total.toLocaleString()}</span><span class="label">points today</span></div>
            <div><span class="big-num">🔥 ${currentStreak()}</span><span class="label">day streak</span></div>
          </div>
        </div>
        ${cta}
      </section>

      <section class="exercises">
        <h2 class="section-title">Today's exercises</h2>
        <ol class="ex-list">
          ${list.map((g, i) => {
            const r = rec.results[g.id];
            const status = r
              ? `<span class="ex-done">${tile(pctOf(r, g))} ${r.score}</span>`
              : next && next.id === g.id
                ? '<span class="chip">Up next</span>'
                : `<span class="ex-min">${g.minutes || 2} min</span>`;
            return `
              <li>
                <a class="ex-card${r ? ' is-done' : ''}" href="#/play/${g.id}">
                  <span class="ex-num">${i + 1}</span>
                  <span class="ex-emoji" aria-hidden="true">${g.emoji}</span>
                  <span class="ex-body">
                    <span class="ex-name">${BG.esc(g.name)}</span>
                    <span class="ex-skill">${BG.esc(g.skill)}</span>
                  </span>
                  ${status}
                </a>
              </li>`;
          }).join('')}
        </ol>
        ${games().length > list.length ? `<a class="btn btn--ghost btn--block lib-link" href="#/library">Game library · all ${games().length} games →</a>` : ''}
      </section>

      ${renderFitness()}

      <section class="why card">
        <h2 class="section-title">Why a brain gym?</h2>
        <p>When AI does the thinking, some skills fade. A 1,000-student trial found that students who practised maths with plain GPT-4 scored <strong>17% lower</strong> once it was taken away (Bastani et al., <em>PNAS</em> 2025). The fix in that study wasn't avoiding AI. It was still doing the hard part yourself.</p>
        <p>Brain Gym is that hard part, made fun. Practice transfers best to the exact skill you practise, so each game trains one skill head-on.</p>
        <a href="#/science">Read the research →</a>
      </section>`;
  }

  function renderFitness() {
    const list = games();
    const rows = list.map((g) => {
      const pcts = [];
      for (let n = today; n > today - 7 && n >= 1; n--) {
        const r = dayRecord(n).results[g.id];
        if (r) pcts.push(pctOf(r, g));
      }
      const avg = pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100) : null;
      return { g, avg };
    });
    if (!rows.some((r) => r.avg != null)) return '';
    const calib = BG.bet.calibrationScore();
    return `
      <section class="fitness card">
        <h2 class="section-title">Your brain fitness <span class="muted small">last 7 days</span></h2>
        ${rows.map(({ g, avg }) => `
          <div class="fit-row">
            <span class="fit-name">${g.emoji} ${BG.esc(g.skill)}</span>
            <span class="fit-bar"><span style="width:${avg || 0}%"></span></span>
            <span class="fit-num">${avg == null ? '–' : avg}</span>
          </div>`).join('')}
        ${calib != null ? `
          <div class="fit-row fit-row--calib">
            <span class="fit-name">🎯 Knowing what you know</span>
            <span class="fit-bar fit-bar--gold"><span style="width:${calib}%"></span></span>
            <span class="fit-num">${calib}</span>
          </div>` : ''}
        <a class="small" href="#/stats">All stats →</a>
      </section>`;
  }

  // ---------- Playing a game ----------
  function renderPlay(id, mode) {
    const game = BG.games[id];
    const rec = dayRecord(today);
    const already = mode === 'daily' ? rec.results[id] : null;

    view.innerHTML = `
      <section class="game-shell">
        <div class="game-head">
          <a class="icon-btn" href="#/" aria-label="Back to the gym">←</a>
          <div class="game-title">
            <span class="game-emoji" aria-hidden="true">${game.emoji}</span>
            <span>
              <span class="game-name">${BG.esc(game.name)}</span>
              <span class="game-skill">${mode === 'practice' ? 'Practice · ' : ''}${BG.esc(game.skill)}</span>
            </span>
          </div>
          <div class="game-score" aria-live="polite"><span class="label">Score</span><span class="big-num" id="game-score">0</span></div>
        </div>
        <div class="game-dots" id="game-dots"></div>
        <div class="game-stage" id="game-stage"></div>
      </section>`;

    const stage = document.getElementById('game-stage');
    if (already) return renderResult(stage, game, already, 'daily', true);
    renderIntro(stage, game, mode);
  }

  function renderIntro(stage, game, mode) {
    stage.innerHTML = `
      <div class="intro card">
        <div class="intro-emoji" aria-hidden="true">${game.emoji}</div>
        <h2 class="intro-title">${BG.esc(game.name)}</h2>
        <p class="intro-tag">${BG.esc(game.tagline || '')}</p>
        <ol class="intro-how">${(game.howTo || []).map((h) => `<li>${BG.esc(h)}</li>`).join('')}</ol>
        <div class="intro-science">
          <span class="label">Why this matters</span>
          <p>${BG.esc(game.science || '')}${game.scienceUrl ? ` <a href="${BG.esc(game.scienceUrl)}" target="_blank" rel="noopener">Source</a>` : ''}</p>
        </div>
        <button class="btn btn--primary btn--block" id="btn-go">${mode === 'practice' ? 'Start practice' : "Let's go"}</button>
      </div>`;
    stage.querySelector('#btn-go').addEventListener('click', () => {
      BG.fx.sound('pick');
      startGame(stage, game, mode);
    });
  }

  function startGame(stage, game, mode) {
    stage.innerHTML = '';
    const root = BG.el(`<div class="game-root g-${game.id}"></div>`);
    stage.appendChild(root);

    const scoreEl = document.getElementById('game-score');
    const dotsEl = document.getElementById('game-dots');
    const cleanups = [];
    const seed = mode === 'daily' ? BG.hash(`${game.id}:${today}`) : (Math.random() * 2 ** 32) >>> 0;
    const startedAt = Date.now();
    let finished = false;
    let shown = 0;
    let tickRaf = null;

    const ctx = {
      day: today,
      mode,
      seed,
      rand: BG.rng(seed),
      score: 0,
      alive: true,
      store: {
        get: (k, fb) => BG.store.get(`g:${game.id}:${k}`, fb),
        set: (k, v) => BG.store.set(`g:${game.id}:${k}`, v),
      },
      addScore(delta, anchor) {
        if (!ctx.alive || !delta) return;
        ctx.score += delta;
        if (anchor) BG.fx.float(anchor, delta > 0 ? `+${delta}` : String(delta), delta > 0 ? 'good' : 'bad');
        animateScore();
      },
      setProgress(i, total) {
        dotsEl.innerHTML = Array.from({ length: total }, (_, k) =>
          `<span class="dot-step${k < i - 1 ? ' is-done' : k === i - 1 ? ' is-current' : ''}"></span>`).join('');
      },
      bet(question) {
        return BG.bet.ask(document.body, question);
      },
      settleBet(key, correct, anchor) {
        return BG.bet.settle(key, correct, anchor);
      },
      onDestroy(fn) {
        cleanups.push(fn);
      },
      finish(result = {}) {
        if (finished || !ctx.alive) return;
        finished = true;
        const final = {
          // Cap at the game's max so no single game can dominate the daily total.
          score: Math.max(0, Math.min(game.maxScore || Infinity, Math.round(ctx.score))),
          summary: result.summary || '',
          stats: result.stats || {},
          seconds: Math.round((Date.now() - startedAt) / 1000),
        };
        BG.track('game_finish', { game: game.id, mode, score: final.score });
        if (mode === 'daily') saveResult(today, game.id, final);
        teardown();
        renderResult(stage, game, final, mode, false);
      },
    };

    function animateScore() {
      cancelAnimationFrame(tickRaf);
      const from = shown;
      const to = ctx.score;
      const t0 = performance.now();
      (function step(now) {
        const k = Math.min(1, (now - t0) / 400);
        shown = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        scoreEl.textContent = shown;
        if (k < 1) tickRaf = requestAnimationFrame(step);
      })(t0);
      BG.fx.pop(scoreEl);
    }

    function teardown() {
      ctx.alive = false;
      cancelAnimationFrame(tickRaf);
      document.querySelectorAll('.bet-sheet').forEach((el) => el.remove());
      cleanups.splice(0).forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      });
    }

    active = { destroy: teardown };
    BG.track('game_start', { game: game.id, mode });
    try {
      game.mount(root, ctx);
    } catch (e) {
      console.error(e);
      root.innerHTML = '<p class="muted">Something went wrong loading this game. Please refresh.</p>';
    }
  }

  function renderResult(stage, game, result, mode, revisit) {
    const pct = pctOf(result, game);
    const rec = dayRecord(today);
    const inWorkout = workoutGames(today).includes(game);
    const next = mode === 'daily' && inWorkout ? nextGame(rec) : null;
    const allDone = mode === 'daily' && inWorkout && !next;
    const headline = pct >= 0.9 ? 'Outstanding!' : pct >= 0.75 ? 'Strong work!' : pct >= 0.45 ? 'Good effort!' : 'Tough one!';

    stage.innerHTML = `
      <div class="result card">
        <div class="result-tile" aria-hidden="true">${tile(pct)}</div>
        <p class="label">${revisit ? "Today's result" : headline}</p>
        <div class="result-score"><span class="big-num" id="result-num">0</span><span class="muted"> / ${game.maxScore}</span></div>
        <p class="result-summary">${BG.esc(result.summary || '')}</p>
        <div class="result-actions">
          ${allDone ? '<a class="btn btn--primary btn--block" href="#/done">Finish workout 🎉</a>' : ''}
          ${next ? `<a class="btn btn--primary btn--block" href="#/play/${next.id}">Next: ${next.emoji} ${BG.esc(next.name)} →</a>` : ''}
          ${mode === 'practice' ? `<button class="btn btn--primary btn--block" id="btn-again">Play again</button>` : ''}
          <a class="btn btn--ghost btn--block" href="${inWorkout ? '#/' : '#/library'}">${inWorkout ? 'Back to the gym' : 'Back to the library'}</a>
          ${mode === 'daily' ? `<a class="small center" href="#/practice/${game.id}">Practice this game (unlimited)</a>` : ''}
        </div>
      </div>`;

    const num = stage.querySelector('#result-num');
    const t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / (revisit ? 1 : 900));
      num.textContent = Math.round(result.score * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);

    if (!revisit) {
      BG.fx.sound(pct >= 0.45 ? 'win' : 'lose');
      if (pct >= 0.9) BG.fx.confetti();
    }
    const again = stage.querySelector('#btn-again');
    if (again) again.addEventListener('click', () => renderPlay(game.id, 'practice'));
    paintStreak();
  }

  // ---------- Workout summary ----------
  function shareText(rec) {
    const list = workoutGames(today);
    const total = list.reduce((s, g) => s + (rec.results[g.id] ? rec.results[g.id].score : 0), 0);
    const grid = list.map((g) => `${g.emoji}${rec.results[g.id] ? tile(pctOf(rec.results[g.id], g)) : '⬜'}`).join(' ');
    const calib = BG.bet.calibrationScore();
    const extras = [calib != null ? `🎯 ${calib}` : '', currentStreak() ? `🔥 ${currentStreak()}` : ''].filter(Boolean).join(' · ');
    return `🧠 Brain Gym #${today}: ${total.toLocaleString()} pts\n${grid}${extras ? `\n${extras}` : ''}\n${location.origin}${location.pathname}`;
  }

  function renderDone() {
    const rec = dayRecord(today);
    const list = workoutGames(today).filter((g) => rec.results[g.id]);
    if (!rec.completed || !list.length) {
      location.hash = '#/';
      return;
    }
    const total = list.reduce((s, g) => s + rec.results[g.id].score, 0);
    const max = list.reduce((s, g) => s + g.maxScore, 0);
    view.innerHTML = `
      <section class="done card">
        <div class="done-badge" aria-hidden="true">🏆</div>
        <p class="label">Workout #${today} complete</p>
        <h1 class="done-title">${total.toLocaleString()} <span class="muted">pts</span></h1>
        <p class="muted">${Math.round((total / max) * 100)}% of max · 🔥 ${currentStreak()} day streak</p>
        <ul class="done-list">
          ${list.map((g) => {
            const r = rec.results[g.id];
            return `<li><span>${g.emoji} ${BG.esc(g.name)}</span><span class="muted small">${BG.esc(r.summary || '')}</span><span class="big-num">${tile(pctOf(r, g))} ${r.score}</span></li>`;
          }).join('')}
        </ul>
        <button class="btn btn--primary btn--block" id="btn-share">Share my workout</button>
        <p class="countdown">Next workout in <span class="big-num" id="countdown">--:--:--</span></p>
        <a class="btn btn--ghost btn--block" href="#/">Back to the gym</a>
      </section>`;
    BG.fx.confetti();
    BG.fx.sound('win');
    document.getElementById('btn-share').addEventListener('click', async () => {
      const text = shareText(rec);
      BG.track('share', { day: today, total });
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        try {
          await navigator.share({ text });
          return;
        } catch {
          /* cancelled: fall through to clipboard */
        }
      }
      try {
        await navigator.clipboard.writeText(text);
        BG.fx.toast('Copied! Paste it anywhere.');
      } catch {
        BG.fx.toast('Could not copy on this device.');
      }
    });
    const cd = document.getElementById('countdown');
    const tick = () => {
      if (!document.body.contains(cd)) return clearInterval(timer);
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      let s = Math.floor((next - now) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      s %= 3600;
      cd.textContent = `${h}:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };
    const timer = setInterval(tick, 1000);
    tick();
  }

  // ---------- Library ----------
  function bestScore(id) {
    let best = null;
    for (let n = today; n >= 1 && n > today - 60; n--) {
      const r = dayRecord(n).results[id];
      if (r && (best == null || r.score > best)) best = r.score;
    }
    return best;
  }

  function renderLibrary() {
    const rec = dayRecord(today);
    const inToday = new Set(workoutGames(today).map((g) => g.id));
    view.innerHTML = `
      <section class="library">
        <p class="label">Game library</p>
        <h1 class="hero-title lib-title">Every game, any time.</h1>
        <p class="hero-sub">Today's workout picks ${WORKOUT_SIZE} of these. Play any of the others whenever you like. Your first play of the day counts towards your stats.</p>
        ${CATEGORIES.map((c) => {
          const list = games().filter((g) => catOf(g) === c.id);
          if (!list.length) return '';
          return `
            <div class="lib-cat">
              <h2 class="section-title">${c.emoji} ${c.name}</h2>
              <p class="muted lib-blurb">${c.blurb}</p>
              <div class="lib-grid">
                ${list.map((g) => {
                  const r = rec.results[g.id];
                  const best = bestScore(g.id);
                  return `
                    <a class="lib-card${r ? ' is-done' : ''}" href="#/play/${g.id}">
                      <span class="lib-emoji" aria-hidden="true">${g.emoji}</span>
                      <span class="lib-name">${BG.esc(g.name)}</span>
                      <span class="lib-skill">${BG.esc(g.skill)}</span>
                      <span class="lib-meta">
                        ${inToday.has(g.id) ? '<span class="chip">Today</span>' : ''}
                        ${r ? `<span class="chip chip--ok">${tile(pctOf(r, g))} ${r.score}</span>` : best != null ? `<span class="chip chip--gold">Best ${best}</span>` : `<span class="ex-min">${g.minutes || 2} min</span>`}
                      </span>
                    </a>`;
                }).join('')}
              </div>
            </div>`;
        }).join('')}
        <a class="btn btn--ghost btn--block" href="#/">Back to today's workout</a>
      </section>`;
  }

  // ---------- Stats ----------
  function renderStats() {
    const calib = BG.store.get('calibration', {});
    const s = BG.store.get('streak', { count: 0, last: 0, best: 0 });
    let workouts = 0;
    for (let n = 1; n <= today; n++) if (dayRecord(n).completed) workouts++;
    const betRows = Object.values(BG.BETS).map((b) => {
      const row = calib[b.key];
      const rate = row && row.n ? Math.round((row.right / row.n) * 100) : null;
      return `
        <div class="calib-row">
          <span>${b.emoji} When you said <strong>${b.label}</strong> <span class="muted">(${b.pct}%)</span></span>
          <span class="big-num">${rate == null ? '–' : `${rate}%`}</span>
          <span class="muted small">${row ? `${row.right}/${row.n}` : 'no bets yet'}</span>
        </div>`;
    }).join('');
    const score = BG.bet.calibrationScore();
    view.innerHTML = `
      <section class="stats card">
        <h1 class="section-title">Your stats</h1>
        <div class="stat-tiles">
          <div><span class="big-num">${workouts}</span><span class="label">workouts</span></div>
          <div><span class="big-num">${currentStreak()}</span><span class="label">streak</span></div>
          <div><span class="big-num">${s.best || 0}</span><span class="label">best streak</span></div>
          <div><span class="big-num">${score == null ? '–' : score}</span><span class="label">calibration</span></div>
        </div>
        <h2 class="section-title small-title">🎯 Knowing what you know</h2>
        <p class="muted">Well-calibrated people are right about 95% of the time when they say "Certain". People using AI tend to overestimate how well they did (Fernandes et al. 2025).</p>
        ${betRows}
      </section>
      ${renderFitness()}
      <a class="btn btn--ghost btn--block" href="#/">Back to the gym</a>`;
  }

  // ---------- Science ----------
  function renderScience() {
    view.innerHTML = `
      <section class="science card">
        <h1 class="section-title">The science behind Brain Gym</h1>
        <p>Research on AI and thinking is young, and we try to be honest about it. The clearest finding: <strong>when AI does the work for you, you get worse at doing it yourself. When it helps you think, it often doesn't hurt.</strong> Brain Gym trains each of these skills directly, because practice transfers best to the skill you actually practise (Simons et al. 2016).</p>
        <ul class="science-list">
          ${games().map((g) => `
            <li>
              <span class="science-emoji">${g.emoji}</span>
              <div>
                <strong>${BG.esc(g.skill)}</strong> · <span class="muted">${BG.esc(g.name)}</span>
                <p>${BG.esc(g.science || '')} ${g.scienceUrl ? `<a href="${BG.esc(g.scienceUrl)}" target="_blank" rel="noopener">Source</a>` : ''}</p>
              </div>
            </li>`).join('')}
          <li>
            <span class="science-emoji">🎯</span>
            <div>
              <strong>Knowing what you know</strong> · <span class="muted">Confidence bets</span>
              <p>With AI help, people's scores went up about 3 points but they overestimated by about 4, and greater AI familiarity made it worse (Fernandes et al. 2025). <a href="https://arxiv.org/abs/2409.16708" target="_blank" rel="noopener">Source</a></p>
            </div>
          </li>
        </ul>
        <p class="muted small">Brain Gym is a game, not a medical product. Brain-training research shows practice mostly improves the trained skill and close relatives, not everything at once.</p>
      </section>
      <a class="btn btn--ghost btn--block" href="#/">Back to the gym</a>`;
  }

  route();
})();

// Source Check: a detective browser. Each case is a convincing (fictional) web page.
// Spend up to 4 investigation clicks, then rule: trustworthy, has an agenda, or not credible.
// Based on "lateral reading": professional fact-checkers judge sites better and faster by
// leaving the page to see what others say about it (Wineburg & McGrew, Stanford).
(() => {
  'use strict';

  const TOTAL = 4;
  const BUDGET = 4;
  const PTS_CORRECT = 60;
  const PTS_PER_CLICK = 10; // per unused click, only when the verdict is right
  const PTS_LATERAL = 15; // used "Search the org" at least once
  const BET_MAX = 40;
  // Best possible case: right verdict after one click (the lateral search): 60 + 3×10 + 15 + 40 = 145.
  // (Zero clicks gives 60 + 40 + 40 = 140, so one smart click is the true maximum.)
  const CASE_MAX = PTS_CORRECT + PTS_PER_CLICK * (BUDGET - 1) + PTS_LATERAL + BET_MAX;

  const TOOLS = [
    { k: 'search', emoji: '🔎', short: 'Search the org', label: 'Search the organisation’s name', lateral: true },
    { k: 'about', emoji: '📄', short: 'About page', label: 'Read their About page', lateral: false },
    { k: 'funding', emoji: '💰', short: 'Who funds it?', label: 'Check who funds it', lateral: true },
    { k: 'date', emoji: '🗓️', short: 'Check date', label: 'Check the date', lateral: false },
    { k: 'author', emoji: '👤', short: 'Search author', label: 'Search the author', lateral: true },
    { k: 'citation', emoji: '🔗', short: 'Cited source', label: 'Follow the cited study', lateral: true },
  ];
  const TOOL = {};
  TOOLS.forEach((t) => (TOOL[t.k] = t));

  const VERDICTS = [
    { k: 'trust', emoji: '✅', label: 'Trustworthy', long: 'Trustworthy source', stamp: 'TRUSTWORTHY', key: 't' },
    { k: 'agenda', emoji: '⚠️', label: 'Has an agenda', long: 'Has an agenda', stamp: 'HAS AN AGENDA', key: 'a' },
    { k: 'fake', emoji: '❌', label: 'Not credible', long: 'Not credible', stamp: 'NOT CREDIBLE', key: 'n' },
  ];
  const VERDICT = {};
  VERDICTS.forEach((v) => (VERDICT[v.k] = v));

  const HERO_TONES = ['blue', 'gold', 'ok', 'accent', 'warn'];
  const BET_KEYS = ['guess', 'likely', 'sure'];

  const LINES = {
    right: ['Case cracked! 🔎', 'Elementary. 🕵️', 'Sharp call! 🎯', 'Nailed it. 📌'],
    wrong: ['The page fooled you this time 🫣', 'Not quite. The clues pointed elsewhere 🤏', 'Missed it. Slick pages are sneaky 🫣'],
  };
  const TIPS = [
    'Fact-checkers leave the page first. What do others say about this site?',
    'A slick design costs nothing. Who is actually behind it?',
    'About pages are written by the site itself. Search engines aren’t.',
    'Follow the money: who pays for this?',
  ];

  // ---------- Daily selection ----------
  // A fixed 10-day pattern of verdict mixes (every day has ≥1 trustworthy case). Per 10 days it
  // uses 16 trust, 12 agenda and 12 fake cases; each pool has at least that many, and each pool is
  // walked in a fixed shuffled order, so no case repeats within 10 days.
  const PATTERN = ['ttaf', 'taaf', 'ttaf', 'taff', 'ttaf', 'ttaf', 'taaf', 'ttaf', 'taff', 'ttaf'];
  const CODE = { t: 'trust', a: 'agenda', f: 'fake' };

  function pools(cases) {
    const by = {};
    Object.values(CODE).forEach((v) => {
      by[v] = BG.shuffle(cases.filter((c) => c.verdict === v), BG.rng(BG.hash('source-pool-' + v)));
    });
    return by;
  }

  function chooseDaily(cases, day) {
    const by = pools(cases);
    const d = Math.max(0, day - 1);
    const perCycle = { trust: 0, agenda: 0, fake: 0 };
    PATTERN.join('').split('').forEach((ch) => (perCycle[CODE[ch]] += 1));
    const used = {};
    Object.keys(perCycle).forEach((v) => (used[v] = Math.floor(d / PATTERN.length) * perCycle[v]));
    for (let i = 0; i < d % PATTERN.length; i++) PATTERN[i].split('').forEach((ch) => (used[CODE[ch]] += 1));
    return PATTERN[d % PATTERN.length].split('').map((ch) => {
      const v = CODE[ch];
      const list = by[v];
      const item = list[used[v] % list.length];
      used[v] += 1;
      return item;
    });
  }

  function choosePractice(cases, rand) {
    const trust = BG.shuffle(cases.filter((c) => c.verdict === 'trust'), rand);
    const other = BG.shuffle(cases.filter((c) => c.verdict !== 'trust'), rand);
    const nTrust = rand() < 0.5 ? 1 : 2;
    return trust.slice(0, nTrust).concat(other.slice(0, TOTAL - nTrust));
  }

  BG.registerGame({
    id: 'source',
    name: 'Source Check',
    emoji: '🔎',
    skill: 'Checking who’s behind a claim',
    category: 'life',
    tagline: 'The page looks legit. But who’s really behind it?',
    howTo: [
      'Each case is a polished web page. Some are honest, some have an agenda, some are fake.',
      'You get 4 investigation clicks: search the org, read the About page, follow the money…',
      'Rule on the source and bet on your verdict. Unused clicks are bonus points.',
      'Tip: fact-checkers leave the page to see what others say about it.',
    ],
    science:
      'Professional fact-checkers judged websites more accurately and far faster than historians and Stanford students because they read "laterally": they left the site to see what others said about it (Wineburg & McGrew, 2017/2019). A short list of tips improved people’s ability to tell true from false headlines (Guess et al., PNAS 2020).',
    scienceUrl: 'https://news.stanford.edu/stories/2017/10/fact-checkers-outperform-historians-evaluating-online-information',
    minutes: 3,
    maxScore: TOTAL * CASE_MAX,

    mount(root, ctx) {
      const data = window.BG_DATA_SOURCE || { cases: [] };
      const hasKeys = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

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

      // ---------- state ----------
      let phase = 'investigate'; // investigate | bet | reveal | end
      let roundApi = null; // { tool(k), verdict(k), confirm() }
      let resolveNext = null;
      let cracked = 0;
      let lateralCases = 0;
      let clicksTotal = 0;
      let streak = 0;

      const wrap = BG.el('<div class="sc-wrap"><div class="sc-stage"></div></div>');
      root.appendChild(wrap);
      const stage = wrap.querySelector('.sc-stage');

      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey) return;
        const active = document.activeElement;
        const onButton = active && active.tagName === 'BUTTON';
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
        if (phase === 'investigate' && roundApi) {
          if (/^[1-6]$/.test(e.key)) {
            e.preventDefault();
            roundApi.tool(TOOLS[Number(e.key) - 1].k);
          } else {
            const v = VERDICTS.find((x) => x.key === e.key.toLowerCase());
            if (v) {
              e.preventDefault();
              roundApi.verdict(v.k);
            } else if (e.key === 'Enter' && !onButton) {
              e.preventDefault();
              roundApi.confirm();
            }
          }
          return;
        }
        if (phase === 'reveal' && e.key === 'Enter' && !onButton && resolveNext) {
          e.preventDefault();
          resolveNext();
        }
      }
      document.addEventListener('keydown', onKey);

      ctx.onDestroy(() => {
        timers.forEach(clearTimeout);
        timers.clear();
        document.removeEventListener('keydown', onKey);
        phase = 'end';
        roundApi = null;
      });

      // ---------- rendering helpers ----------
      function clueBody(c, k) {
        const v = c.clicks[k];
        if (k === 'search') {
          return `
            <p class="sc-query">“${BG.esc(c.site.name)}”</p>
            <ol class="sc-results">
              ${v.map((res) => `
                <li class="sc-result${res.key ? ' is-key' : ''}">
                  <span class="sc-res-d">${BG.esc(res.d)}</span>
                  <span class="sc-res-t">${BG.esc(res.t)}</span>
                  <span class="sc-res-s">${BG.esc(res.s)}</span>
                </li>`).join('')}
            </ol>`;
        }
        return `<p class="sc-clue-text">${BG.esc(v)}</p>`;
      }

      function keyLine(c, k) {
        if (k === 'search') {
          const res = c.clicks.search.find((x) => x.key) || c.clicks.search[0];
          return `${res.d}: ${res.s}`;
        }
        return c.clicks[k];
      }

      // ---------- a round ----------
      async function playRound(r, c) {
        ctx.setProgress(r + 1, TOTAL);
        phase = 'investigate';
        const h = BG.hash(c.id);
        const tone = HERO_TONES[h % HERO_TONES.length];
        const used = [];
        let choice = null;
        let resolveDecision = null;

        const tip = r === 0
          ? `You have ${BUDGET} investigation clicks. Every unused click is +${PTS_PER_CLICK} if you get it right.`
          : TIPS[(h >>> 3) % TIPS.length];

        stage.innerHTML = `
          <div class="sc-round">
            <div class="sc-meta">
              <span class="label">Case ${r + 1} of ${TOTAL}</span>
              <span class="chip chip--gold sc-streak" ${streak >= 2 ? '' : 'hidden'}>🔥 x${streak}</span>
              <span class="sc-budget" role="status" aria-label="${BUDGET} clicks left">
                ${Array.from({ length: BUDGET }, () => '<span class="sc-pip" aria-hidden="true">🔍</span>').join('')}
              </span>
            </div>
            <div class="sc-browser" aria-label="Web page under investigation">
              <div class="sc-chrome" aria-hidden="true">
                <span class="sc-dots"><i></i><i></i><i></i></span>
                <span class="sc-url"><span class="sc-lock">🔒</span><span class="sc-url-text">${BG.esc(c.site.domain)}</span></span>
              </div>
              <div class="sc-page">
                <div class="sc-hero sc-hero--${tone}" aria-hidden="true"><span>${c.site.emoji}</span></div>
                <div class="sc-brand">
                  <span class="sc-logo" aria-hidden="true">${c.site.emoji}</span>
                  <span class="sc-sitename">${BG.esc(c.site.name)}</span>
                </div>
                <div class="sc-nav" aria-hidden="true"><span class="is-on">Home</span><span>News</span><span>About us</span><span>Contact</span></div>
                <h3 class="sc-headline">${BG.esc(c.site.headline)}</h3>
                <p class="sc-blurb">${BG.esc(c.site.blurb)}</p>
                <div class="sc-share" aria-hidden="true"><span>Share</span><i></i><i></i><i></i></div>
              </div>
            </div>
            <p class="sc-coach">${BG.esc(tip)}</p>
            <div class="sc-tools" role="group" aria-label="Investigation clicks">
              ${TOOLS.map((t, i) => `
                <button class="sc-tool" data-k="${t.k}" title="${BG.esc(t.label)}" aria-label="${BG.esc(t.label)}">
                  ${hasKeys ? `<span class="sc-tool-key">${i + 1}</span>` : ''}
                  <span class="sc-tool-emoji" aria-hidden="true">${t.emoji}</span>
                  <span class="sc-tool-name">${BG.esc(t.short)}</span>
                </button>`).join('')}
            </div>
            <div class="sc-notes" aria-live="polite"></div>
            <div class="sc-decide">
              <p class="label sc-decide-label">Your verdict on this source${hasKeys ? ' · keys T / A / N' : ''}</p>
              <div class="sc-verdicts" role="group" aria-label="Verdict">
                ${VERDICTS.map((v) => `
                  <button class="sc-vbtn sc-vbtn--${v.k}" data-v="${v.k}" aria-pressed="false">
                    <span class="sc-vbtn-emoji" aria-hidden="true">${v.emoji}</span>
                    <span class="sc-vbtn-name">${BG.esc(v.label)}</span>
                  </button>`).join('')}
              </div>
              <button class="btn btn--primary btn--block sc-confirm" disabled>Pick a verdict</button>
            </div>
            <div class="sc-reveal" hidden></div>
          </div>`;

        const browser = stage.querySelector('.sc-browser');
        const budgetEl = stage.querySelector('.sc-budget');
        const pips = Array.from(stage.querySelectorAll('.sc-pip'));
        const coach = stage.querySelector('.sc-coach');
        const toolsEl = stage.querySelector('.sc-tools');
        const toolBtns = Array.from(toolsEl.querySelectorAll('.sc-tool'));
        const notes = stage.querySelector('.sc-notes');
        const decide = stage.querySelector('.sc-decide');
        const vBtns = Array.from(stage.querySelectorAll('.sc-vbtn'));
        const confirmBtn = stage.querySelector('.sc-confirm');
        const revealEl = stage.querySelector('.sc-reveal');
        BG.fx.sound('pop');
        try {
          wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* old browsers */
        }

        function useTool(k) {
          if (phase !== 'investigate' || used.includes(k)) return;
          const btn = toolBtns.find((b) => b.dataset.k === k);
          if (used.length >= BUDGET) {
            BG.fx.shake(budgetEl);
            BG.fx.sound('bad');
            return;
          }
          used.push(k);
          const t = TOOL[k];
          btn.classList.add('is-used');
          btn.disabled = true;
          const pip = pips[BUDGET - used.length];
          if (pip) pip.classList.add('is-spent');
          budgetEl.setAttribute('aria-label', `${BUDGET - used.length} clicks left`);
          BG.fx.sound('pick');
          BG.fx.haptic();
          const card = BG.el(`
            <div class="sc-clue sc-clue--${k}">
              <div class="sc-clue-head">
                <span class="sc-clue-title">${t.emoji} ${BG.esc(t.label)}</span>
                <span class="chip ${t.lateral ? 'chip--blue' : 'chip--warn'} sc-clue-chip">${t.lateral ? '↗ Left the page' : '📍 On the page'}</span>
              </div>
              ${clueBody(c, k)}
            </div>`);
          notes.prepend(card);
          try {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } catch {
            /* old browsers */
          }
          if (used.length >= BUDGET) {
            toolBtns.forEach((b) => (b.disabled = true));
            toolsEl.classList.add('is-out');
            coach.textContent = 'Out of clicks. Time to make the call! 🕵️';
            BG.fx.pop(coach);
          } else if (k === 'search' && used.length === 1) {
            coach.textContent = 'That’s how the pros start: see what others say first.';
          }
        }

        function pickVerdict(v) {
          if (phase !== 'investigate') return;
          if (choice === v) {
            confirm();
            return;
          }
          choice = v;
          vBtns.forEach((b) => {
            const on = b.dataset.v === v;
            b.classList.toggle('is-selected', on);
            b.setAttribute('aria-pressed', String(on));
          });
          confirmBtn.disabled = false;
          confirmBtn.textContent = `Stamp it: ${VERDICT[v].emoji} ${VERDICT[v].long}`;
          BG.fx.sound('tap');
          BG.fx.pop(vBtns.find((b) => b.dataset.v === v));
        }

        function confirm() {
          if (phase !== 'investigate' || !choice || !resolveDecision) return;
          BG.fx.haptic(30);
          resolveDecision(choice);
        }

        toolsEl.addEventListener('click', (e) => {
          const b = e.target.closest('.sc-tool');
          if (b) useTool(b.dataset.k);
        });
        decide.addEventListener('click', (e) => {
          const b = e.target.closest('.sc-vbtn');
          if (b) pickVerdict(b.dataset.v);
        });
        confirmBtn.addEventListener('click', confirm);
        roundApi = { tool: useTool, verdict: pickVerdict, confirm };

        const picked = await new Promise((res) => (resolveDecision = res));
        resolveDecision = null;
        roundApi = null;
        if (!ctx.alive) return;

        // ---------- stamp + bet ----------
        phase = 'bet';
        toolBtns.forEach((b) => (b.disabled = true));
        vBtns.forEach((b) => (b.disabled = true));
        decide.classList.add('is-locked');
        confirmBtn.hidden = true;
        const stamp = BG.el(`<span class="sc-stamp sc-stamp--${picked}"></span>`);
        stamp.textContent = `${VERDICT[picked].stamp}?`;
        browser.appendChild(stamp);
        BG.fx.sound('pop');
        BG.fx.haptic(40);
        await wait(500);
        if (!ctx.alive) return;
        const bet = await ctx.bet('How sure is your verdict?');
        if (!ctx.alive) return;

        // ---------- reveal ----------
        phase = 'reveal';
        const correct = picked === c.verdict;
        const usedSearch = used.includes('search');
        const ans = VERDICT[c.verdict];
        stamp.remove();
        const finalStamp = BG.el(`<span class="sc-stamp sc-stamp--${c.verdict} sc-stamp--final"></span>`);
        finalStamp.textContent = `${ans.emoji} ${ans.stamp}`;
        browser.appendChild(finalStamp);
        browser.classList.add(`is-${c.verdict}`);
        vBtns.forEach((b) => {
          if (b.dataset.v === c.verdict) b.classList.add('is-answer');
          else if (b.dataset.v === picked) b.classList.add('is-wrong');
        });
        toolBtns.forEach((b) => b.classList.toggle('is-key', c.crackedBy.includes(b.dataset.k)));
        notes.querySelectorAll('.sc-clue').forEach((el) => {
          const k = (el.className.match(/sc-clue--(\w+)/) || [])[1];
          if (c.crackedBy.includes(k)) el.classList.add('is-key');
        });

        const title = BG.pick(correct ? LINES.right : LINES.wrong, ctx.rand);
        const pro = c.crackedBy.map((k) => {
          const t = TOOL[k];
          return `<li><b>${t.emoji} ${BG.esc(t.label)}${used.includes(k) ? ' <span class="sc-you">✓ you did</span>' : ''}</b><span>${BG.esc(keyLine(c, k))}</span></li>`;
        }).join('');
        revealEl.innerHTML = `
          <div class="card sc-verdict ${correct ? 'sc-verdict--ok' : 'sc-verdict--bad'}">
            <h3 class="sc-title">${BG.esc(title)}</h3>
            <p class="sc-answer"><span class="label">The verdict</span><span class="sc-answer-name">${ans.emoji} ${BG.esc(ans.long)}</span></p>
            ${correct ? '' : `<p class="sc-yousaid muted">You said ${VERDICT[picked].emoji} ${BG.esc(VERDICT[picked].long)}.</p>`}
            <p class="sc-explain">${BG.esc(c.explain)}</p>
            <div class="sc-pro">
              <p class="sc-pro-head">🕵️ What a fact-checker would do</p>
              <ol class="sc-pro-list">${pro}</ol>
            </div>
            <div class="sc-points"></div>
          </div>
          <button class="btn btn--primary btn--block sc-next">${r + 1 < TOTAL ? 'Next case →' : 'Close the case file 🏁'}</button>`;
        revealEl.hidden = false;
        const verdictCard = revealEl.querySelector('.sc-verdict');
        const pointsEl = revealEl.querySelector('.sc-points');
        const nextBtn = revealEl.querySelector('.sc-next');
        nextBtn.disabled = true;
        BG.fx.sound(correct ? 'good' : 'bad');
        if (correct) BG.fx.pop(browser);
        else BG.fx.shake(browser);
        try {
          browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* old browsers */
        }

        const chip = (cls, text) => pointsEl.insertAdjacentHTML('beforeend', `<span class="chip ${cls}">${BG.esc(text)}</span>`);
        clicksTotal += used.length;
        if (usedSearch) lateralCases += 1;
        if (correct) {
          cracked += 1;
          streak += 1;
          ctx.addScore(PTS_CORRECT, finalStamp);
          chip('chip--ok', `+${PTS_CORRECT} cracked`);
          if (streak >= 2) {
            const s = stage.querySelector('.sc-streak');
            s.textContent = `🔥 x${streak}`;
            s.hidden = false;
            BG.fx.pop(s);
          }
          const saved = BUDGET - used.length;
          if (saved > 0) {
            await wait(380);
            if (!ctx.alive) return;
            ctx.addScore(saved * PTS_PER_CLICK, budgetEl);
            chip('chip--gold', `+${saved * PTS_PER_CLICK} for ${saved} unused click${saved > 1 ? 's' : ''}`);
          }
        } else {
          streak = 0;
        }
        if (usedSearch) {
          await wait(380);
          if (!ctx.alive) return;
          ctx.addScore(PTS_LATERAL);
          const sBtn = toolBtns.find((b) => b.dataset.k === 'search');
          BG.fx.float(sBtn, `+${PTS_LATERAL} You read like a fact-checker 🕵️`, 'good');
          chip('chip--blue', `+${PTS_LATERAL} read laterally 🕵️`);
        }
        await wait(450);
        if (!ctx.alive) return;
        const delta = ctx.settleBet(bet, correct, verdictCard);
        ctx.addScore(delta);
        const b = BG.BETS[bet];
        chip(delta > 0 ? 'chip--ok' : delta < 0 ? '' : 'chip--blue', `${b ? b.emoji : ''} bet ${delta > 0 ? '+' : ''}${delta}`);

        const hist = ctx.store.get('history', { cases: 0, correct: 0, lateral: 0 });
        hist.cases += 1;
        if (correct) hist.correct += 1;
        if (usedSearch) hist.lateral += 1;
        ctx.store.set('history', hist);
        BG.track('source_round', { id: c.id, verdict: c.verdict, picked, correct, clicks: used.length, lateral: usedSearch, bet });

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
        const cases = (data.cases || []).filter((c) => c && c.site && c.clicks && VERDICT[c.verdict]);
        if (cases.length < TOTAL || !cases.some((c) => c.verdict === 'trust')) {
          stage.innerHTML = '<p class="muted">The case files are missing (content file not loaded). Please refresh.</p>';
          return;
        }
        const picked = ctx.mode === 'daily' ? chooseDaily(cases, ctx.day) : choosePractice(cases, ctx.rand);
        const rounds = BG.shuffle(picked, ctx.rand);
        for (let r = 0; r < rounds.length; r++) {
          await playRound(r, rounds[r]);
          if (!ctx.alive) return;
        }

        // ---------- ending ----------
        phase = 'end';
        const perfect = cracked === TOTAL;
        const avg = (clicksTotal / TOTAL).toFixed(1).replace(/\.0$/, '');
        const rank = perfect && lateralCases === TOTAL
          ? 'Fact-checker grade. You read like the pros: off the page, fast and right.'
          : perfect
          ? 'Every source sorted. Next time, try the lateral search first. It’s the pro shortcut.'
          : cracked >= 3
          ? 'Sharp detective work. One slick page slipped through.'
          : cracked >= 2
          ? 'Half the cases cracked. The polished pages are the sneaky ones.'
          : 'The websites won today. Tomorrow, open a new tab and search them first.';
        stage.innerHTML = `
          <div class="card sc-end">
            <div class="sc-end-emoji" aria-hidden="true">${perfect ? '🏆' : '🗂️'}</div>
            <p class="big-num sc-end-score">${cracked}/${TOTAL}</p>
            <p class="sc-end-line">${BG.esc(rank)}</p>
            <div class="sc-end-stats">
              <span class="chip chip--blue">🕵️ Searched the org in ${lateralCases}/${TOTAL}</span>
              <span class="chip chip--gold">🔍 ${avg} clicks per case</span>
            </div>
          </div>`;
        BG.fx.pop(stage.querySelector('.sc-end'));
        if (perfect) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else {
          BG.fx.sound(cracked * 2 >= TOTAL ? 'good' : 'lose');
        }
        await wait(1800);
        if (!ctx.alive) return;
        ctx.finish({
          summary: `Cracked ${cracked}/${TOTAL} sources like a pro 🔎${perfect ? ' Perfect!' : ''}`,
          stats: { cracked, cases: TOTAL, searchedOrg: lateralCases, avgClicks: Number(avg) },
        });
      }

      run();
    },
  });
})();

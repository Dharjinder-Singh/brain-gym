// Only You: think of ideas the obvious-answer bot would never think of.
(() => {
  'use strict';

  const ROUNDS = [
    { kind: 'classic', label: 'Round 1 · Classic', secs: 60 },
    { kind: 'twist', label: 'Round 2 · Twist', secs: 45 },
  ];
  const CAP = 25;
  const MAXLEN = 40;
  const PTS_BOT = 5;
  const PTS_ONLY = 20;

  // ---------- Text matching (pure, exported for testing) ----------
  const STOP = new Set(
    ('a an the to for of as it its use used using uses make made making with in on into onto your my our their his her ' +
      'some thing things something like be is are can could you i at by from or and up out off very just stuff them they ' +
      'this that put get got way ways so then also really maybe kind sort lot lots').split(' ')
  );

  function stem(w) {
    if (/^\d+$/.test(w)) return w;
    const vowel = (x) => /[aeiouy]/.test(x);
    if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
    else if (w.length > 4 && /(sh|ch|x|ss|z)es$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
    if (w.length > 7 && w.endsWith('ation')) w = w.slice(0, -5) + 'at';
    else if (w.length > 5 && w.endsWith('ing') && vowel(w.slice(0, -3))) {
      w = w.slice(0, -3);
      if (w.length >= 5 && /([b-df-hj-np-tv-z])$/.test(w)) w = w.slice(0, -1);
    } else if (w.length > 4 && w.endsWith('ed') && !w.endsWith('eed') && vowel(w.slice(0, -2))) {
      w = w.slice(0, -2);
      if (w.length >= 5 && /([b-df-hj-np-tv-z])$/.test(w)) w = w.slice(0, -1);
    }
    return w;
  }

  function clean(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’`]/g, '')
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
      .trim();
  }

  function analyze(s) {
    const words = clean(s).split(' ').filter(Boolean);
    const toks = words.filter((w) => w.length > 1 && !STOP.has(w)).map(stem);
    // Joins of consecutive words, so "book mark" can meet "bookmark".
    const runs = [];
    for (let i = 0; i < toks.length; i++) for (let j = i + 2; j <= Math.min(toks.length, i + 3); j++) runs.push(toks.slice(i, j).join(''));
    return { toks, runs: runs.concat(toks), join: toks.join(''), key: toks.slice().sort().join(' ') };
  }

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let diag = prev[0];
      prev[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = prev[j];
        prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
        diag = tmp;
      }
    }
    return prev[b.length];
  }

  function tokEq(a, b) {
    if (a === b) return true;
    const [s, l] = a.length <= b.length ? [a, b] : [b, a];
    if (s.length >= 4 && l === s + 'e') return true; // danc(ing) ~ dance
    if (s.length >= 3 && l === s + s[s.length - 1]) return true; // cutt(ing) ~ cut
    if (s.length >= 5 && l.startsWith(s) && l.length - s.length <= (s.length >= 7 ? 3 : 2) && l !== s + 'y') return true; // plant ~ planter (not smile ~ smiley)
    if (s.length >= 7 && lev(a, b) <= 1) return true; // small typos in long words
    return false;
  }

  const subset = (small, big) => small.length > 0 && small.every((t) => big.some((u) => tokEq(t, u)));

  // Bot answers -> analysed alias lists (cached on the data object).
  function prepBot(bot) {
    return bot.map((b) => ({
      a: b.a,
      aliases: [b.a].concat(b.aliases || []).map(analyze).filter((x) => x.toks.length),
    }));
  }

  // Returns the index of the first bot answer the idea counts as, or -1.
  function matchIdea(idea, prepped) {
    if (!idea.toks.length) return -1;
    // pass 1: exact (order-free) match
    for (let i = 0; i < prepped.length; i++) {
      if (prepped[i].aliases.some((al) => al.key === idea.key || al.join === idea.join)) return i;
    }
    // pass 2: every alias word appears in the idea ("a bookmark for comics" ⊇ "bookmark"),
    // or the alias, squashed, sits inside the squashed idea ("book mark" → "bookmark")
    for (let i = 0; i < prepped.length; i++) {
      // The alias must be a decent share of the idea, so one stray common word in a long, creative idea doesn't count.
      if (
        prepped[i].aliases.some(
          (al) =>
            (subset(al.toks, idea.toks) && al.toks.length * 3 >= idea.toks.length) ||
            (al.join.length >= 5 && idea.runs.some((run) => tokEq(run, al.join)) && al.join.length * 3 >= idea.join.length)
        )
      )
        return i;
    }
    // pass 3: the idea is a shorter version of an alias ("mark page" ⊆ "mark a page")
    for (let i = 0; i < prepped.length; i++) {
      if (prepped[i].aliases.some((al) => subset(idea.toks, al.toks) && (idea.toks.length >= 2 || al.toks.length <= 2))) return i;
    }
    return -1;
  }

  function isNearDup(a, b) {
    if (a.key === b.key || a.join === b.join) return true;
    const n = Math.min(a.join.length, b.join.length);
    if (n >= 6 && lev(a.join, b.join) <= 1) return true;
    return subset(a.toks, b.toks) && subset(b.toks, a.toks);
  }

  const MASH_RUNS = ['qwer', 'wert', 'rtyu', 'tyui', 'yuio', 'uiop', 'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl', 'zxcv', 'xcvb', 'cvbn', 'vbnm'];
  const REVERSED = MASH_RUNS.map((r) => r.split('').reverse().join(''));

  // Returns {ok:true, text, idea} or {ok:false, msg}
  function vet(raw, previous) {
    let text = String(raw).replace(/\s+/g, ' ').trim();
    if (text.length > MAXLEN) text = text.slice(0, MAXLEN).trim();
    if (text.replace(/\s/g, '').length < 3) return { ok: false, msg: 'A bit longer, please (3+ letters)' };
    const letters = text.toLowerCase().replace(/[^\p{L}]/gu, '');
    const latin = letters.replace(/[^a-z]/g, '');
    if (latin.length && latin.length >= letters.length * 0.8) {
      if (!/[aeiouy]/.test(latin)) return { ok: false, msg: 'Needs a vowel or two 🙃' };
      if (/^(.)\1+$/.test(latin) || /^(.{1,3})\1{2,}.{0,2}$/.test(latin)) return { ok: false, msg: 'Keyboard mash detected 🙃' };
      if (MASH_RUNS.some((r) => latin.includes(r)) || REVERSED.some((r) => latin.includes(r))) return { ok: false, msg: 'Keyboard mash detected 🙃' };
      const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
      if (words.some((w) => /[^aeiouy]{6,}/.test(w)))
        return { ok: false, msg: 'Keyboard mash detected 🙃' };
    }
    const idea = analyze(text);
    if (!idea.toks.length) return { ok: false, msg: 'Say a little more: what is the idea?' };
    if (previous.some((p) => isNearDup(p.idea, idea))) return { ok: false, msg: 'You already have that one' };
    return { ok: true, text, idea };
  }

  // Exposed for node one-off checks; harmless in the browser.
  const api = { analyze, matchIdea, prepBot, vet, stem, tokEq };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------- Botsworth ----------
  const MOOD = { smug: '😏', bored: '🥱', think: '🤔', meh: '😐', nervous: '😬', sweat: '😰', shock: '😳', mind: '🤯' };
  const LINES = {
    intro1: [
      'I have pre-computed every sensible answer. Do try to be sensible.',
      'Humans are so predictable. I say that with love. Mostly.',
      'I already know what you\'ll say. Prove me wrong. You won\'t.',
    ],
    intro2: [
      'A twist round. My circuits adore a twist. Still predictable though.',
      'Weird prompt, same old you. Let\'s go.',
      'Round two. I\'ve updated my obvious list. It\'s very obvious.',
    ],
    ticker: [
      (a) => `thinking of… ${a}? 🥱`,
      (a) => `obviously… ${a}.`,
      (a) => `${a}. Next.`,
      (a) => `hmm, ${a}? Classic.`,
      (a) => `${a}, surely.`,
    ],
    milestone: {
      5: ['meh', 'Five. Cute.'],
      10: ['nervous', 'Ten?! Recalculating…'],
      15: ['sweat', 'Please slow down, my fans are spinning.'],
      20: ['mind', 'TWENTY? Who programmed you?'],
    },
    reveal: ['Let\'s see how many of your "original" ideas I already had. 😏', 'Time to compare brains. Mine is bigger. It\'s a server.'],
    zero: 'Zero ideas? Even I have ideas, and they\'re all borrowed. 🥱',
    high: ['Wait. I did not compute that. 😳', 'Error 404: smugness not found.', 'That was… not in my training data.'],
    mid: ['Some of those were… acceptable. Barely. 😐', 'Hmm. A few got past me. A few.', 'Half human, half me. Interesting.'],
    low: ['As predicted. We are basically the same brain. 😏', 'Told you. I think of everything. Eventually.', 'Copy that. Literally.'],
  };

  BG.registerGame({
    id: 'onlyyou',
    name: 'Only You',
    emoji: '💡',
    skill: 'Original ideas',
    tagline: 'Botsworth only thinks of the obvious. Think of what he never would.',
    howTo: [
      'Type as many ideas as you can. Press Enter after each one.',
      'When time is up, Botsworth shows his list of obvious answers.',
      'If he had your idea too, you get +5. If only you thought of it, you get +20.',
    ],
    science:
      'In one study, help from AI made each person\'s stories better, but everyone\'s stories ended up more alike (Doshi & Hauser, Science Advances 2024).',
    scienceUrl: 'https://www.science.org/doi/10.1126/sciadv.adn5290',
    minutes: 3,
    maxScore: 500,

    mount(root, ctx) {
      const data = window.BG_DATA_ONLYYOU || { classic: [], twist: [] };
      const timeouts = new Set();
      const intervals = new Set();
      let timer = null;
      const later = (fn, ms) => {
        const t = setTimeout(() => {
          timeouts.delete(t);
          if (ctx.alive) fn();
        }, ms);
        timeouts.add(t);
      };
      const sleep = (ms) => new Promise((r) => later(r, ms));
      ctx.onDestroy(() => {
        timeouts.forEach(clearTimeout);
        intervals.forEach(clearInterval);
        if (timer) timer.stop();
      });

      const pickPrompt = (kind) => {
        const list = data[kind] || [];
        if (!list.length) return null;
        if (ctx.mode !== 'daily') return list[Math.floor(ctx.rand() * list.length)];
        const order = BG.shuffle(list.map((_, i) => i), BG.rng(BG.hash('onlyyou-' + kind)));
        return list[order[(Math.max(1, ctx.day) - 1) % list.length]];
      };
      const prompts = ROUNDS.map((r) => pickPrompt(r.kind));
      const rpick = (arr) => arr[Math.floor(ctx.rand() * arr.length)];

      const wrap = BG.el('<div class="g-onlyyou"></div>');
      root.appendChild(wrap);

      const promptHTML = (p) => {
        const parts = p.prompt.split(' — ');
        return parts.length > 1
          ? `${BG.esc(parts[0])} <em class="oy-twist">— ${BG.esc(parts.slice(1).join(' — '))}</em>`
          : BG.esc(p.prompt);
      };
      const botHTML = (mood, line, extra = '') => `
        <div class="oy-bot ${extra}">
          <div class="oy-avatar" aria-hidden="true">🤖<span class="oy-mood">${MOOD[mood] || MOOD.smug}</span></div>
          <div class="oy-say"><span class="oy-name label">Botsworth</span><span class="oy-line">${BG.esc(line)}</span></div>
        </div>`;
      const setBot = (scope, mood, line) => {
        const m = scope.querySelector('.oy-mood');
        const l = scope.querySelector('.oy-line');
        if (m && MOOD[mood] && m.textContent !== MOOD[mood]) {
          m.textContent = MOOD[mood];
          BG.fx.pop(m);
        }
        if (l && line != null) {
          l.textContent = line;
          l.classList.remove('oy-line--in');
          void l.offsetWidth;
          l.classList.add('oy-line--in');
        }
      };

      let totalIdeas = 0;
      let totalUnique = 0;

      // ---------- Round intro ----------
      function intro(r) {
        return new Promise((resolve) => {
          const p = prompts[r];
          const R = ROUNDS[r];
          ctx.setProgress(r + 1, ROUNDS.length);
          wrap.innerHTML = `
            <section class="oy-intro">
              ${botHTML(r === 0 ? 'smug' : 'think', rpick(r === 0 ? LINES.intro1 : LINES.intro2))}
              <div class="oy-card card">
                <div class="oy-meta"><span class="label">${BG.esc(R.label)}</span><span class="chip ${r ? 'chip--blue' : 'chip--gold'}">⏱ ${R.secs}s</span></div>
                <h2 class="oy-prompt">${promptHTML(p)}</h2>
                <p class="oy-sub muted">Botsworth has <b>${p.bot.length}</b> obvious answers ready. Beat them with ideas only you would think of.</p>
              </div>
              <button class="btn btn--primary btn--block oy-go" type="button">${r === 0 ? 'Start thinking' : 'Bring on the twist'}</button>
            </section>`;
          const go = wrap.querySelector('.oy-go');
          go.addEventListener(
            'click',
            () => {
              BG.fx.sound('pick');
              // Build + focus synchronously inside the tap so the mobile keyboard opens.
              resolve(play(r));
            },
            { once: true }
          );
        });
      }

      // ---------- Typing phase ----------
      function play(r) {
        const p = prompts[r];
        const R = ROUNDS[r];
        const ideas = [];
        wrap.innerHTML = `
          <section class="oy-play">
            <div class="oy-head">
              <span class="label">${BG.esc(R.label)}</span>
              <h2 class="oy-prompt oy-prompt--sm">${promptHTML(p)}</h2>
            </div>
            <div class="oy-timer"></div>
            <form class="oy-form" autocomplete="off" novalidate>
              <input class="oy-input" type="text" inputmode="text" enterkeyhint="send" autocomplete="off" autocapitalize="off"
                spellcheck="false" maxlength="${MAXLEN + 20}" placeholder="Type an idea, press Enter" aria-label="Your idea">
              <button class="oy-add" type="submit" aria-label="Add idea">+</button>
            </form>
            <div class="oy-status">
              <span class="oy-count"><b class="big-num">0</b> ideas</span>
              <span class="oy-msg" role="status" aria-live="polite"></span>
            </div>
            ${botHTML('bored', 'warming up my obvious-o-meter…', 'oy-bot--thought')}
            <div class="oy-chips" aria-label="Your ideas"></div>
          </section>`;
        const form = wrap.querySelector('.oy-form');
        const input = wrap.querySelector('.oy-input');
        const addBtn = wrap.querySelector('.oy-add');
        const countEl = wrap.querySelector('.oy-count');
        const countNum = countEl.querySelector('b');
        const msg = wrap.querySelector('.oy-msg');
        const chips = wrap.querySelector('.oy-chips');
        const botRow = wrap.querySelector('.oy-bot');

        let ended = false;
        let quietUntil = 0;
        let endRound;
        const roundOver = new Promise((res) => (endRound = res));

        const say = (text, kind = '') => {
          msg.textContent = text;
          msg.className = 'oy-msg' + (kind ? ` oy-msg--${kind}` : '');
        };

        const add = () => {
          if (ended) return;
          input.focus();
          if (!input.value.trim()) return;
          if (ideas.length >= CAP) {
            say('25 ideas! That\'s the max.', 'bad');
            BG.fx.shake(form);
            return;
          }
          const res = vet(input.value, ideas);
          if (!res.ok) {
            say(res.msg, 'bad');
            BG.fx.shake(form);
            BG.fx.haptic(25);
            input.select();
            return;
          }
          input.value = '';
          ideas.push(res);
          const chip = BG.el(`<span class="oy-idea oy-idea--new"><span class="oy-idea__t"></span></span>`);
          chip.querySelector('.oy-idea__t').textContent = res.text;
          chips.prepend(chip);
          BG.fx.sound('pop');
          BG.fx.haptic(8);
          countNum.textContent = ideas.length;
          countEl.lastChild.textContent = ideas.length === 1 ? ' idea' : ' ideas';
          BG.fx.pop(countEl);
          say('');
          const ms = LINES.milestone[ideas.length];
          if (ms) {
            setBot(botRow, ms[0], ms[1]);
            quietUntil = performance.now() + 3500;
          }
          if (ideas.length >= CAP) {
            say('25 ideas! Max reached. Wow.', 'good');
            later(() => endRound('cap'), 500);
          }
        };

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          add();
        });
        // Keep the keyboard open when tapping +.
        addBtn.addEventListener('mousedown', (e) => e.preventDefault());
        input.addEventListener('focus', () => later(() => form.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300));
        input.addEventListener('input', () => {
          if (msg.classList.contains('oy-msg--bad')) say('');
        });

        // Teasing ticker
        const pool = BG.shuffle(p.bot.map((b) => b.a), ctx.rand);
        let tick = 0;
        const iv = setInterval(() => {
          if (!ctx.alive || ended) return;
          const n = ideas.length;
          if (performance.now() < quietUntil) return; // let a milestone line breathe
          const a = pool[tick % pool.length];
          const line = LINES.ticker[tick % LINES.ticker.length](a);
          setBot(botRow, n >= 10 ? 'nervous' : n >= 5 ? 'think' : 'bored', line);
          tick++;
        }, 2300);
        intervals.add(iv);

        timer = BG.timerBar(wrap.querySelector('.oy-timer'), R.secs);
        timer.done.then(() => endRound('time'));
        input.focus();

        return roundOver.then(async (why) => {
          // Count a half-typed idea if it's valid: no one likes losing their last thought to the buzzer.
          if (why === 'time' && ctx.alive && input.value.trim() && ideas.length < CAP) add();
          ended = true;
          clearInterval(iv);
          intervals.delete(iv);
          if (timer) timer.stop();
          if (!ctx.alive) return null;
          input.disabled = true;
          addBtn.disabled = true;
          input.blur();
          if (why === 'time') say('⏰ Time!', 'good');
          BG.fx.sound('pop');
          BG.fx.pop(wrap.querySelector('.oy-timer'));
          await sleep(800);
          if (!ctx.alive) return null;
          return ideas;
        });
      }

      // ---------- Reveal ----------
      async function reveal(r, ideas) {
        const p = prompts[r];
        if (!p._prep) p._prep = prepBot(p.bot);
        const prep = p._prep;
        const hits = ideas.map((x) => matchIdea(x.idea, prep));

        wrap.innerHTML = `
          <section class="oy-reveal">
            <h2 class="oy-prompt oy-prompt--sm">${promptHTML(p)}</h2>
            ${botHTML('smug', ideas.length ? rpick(LINES.reveal) : LINES.zero)}
            <div class="oy-sec">
              <span class="label">Your ideas</span>
              <div class="oy-chips oy-chips--mine"></div>
            </div>
            <div class="oy-sec">
              <span class="label">Botsworth's obvious list</span>
              <div class="oy-botlist"></div>
            </div>
            <div class="oy-result card" hidden></div>
          </section>`;
        const mine = wrap.querySelector('.oy-chips--mine');
        const botList = wrap.querySelector('.oy-botlist');
        const botRow = wrap.querySelector('.oy-bot');
        const result = wrap.querySelector('.oy-result');

        if (!ideas.length) mine.innerHTML = '<span class="muted oy-empty">No ideas this round.</span>';
        const chipEls = ideas.map((x) => {
          const c = BG.el(`<span class="oy-idea"><span class="oy-idea__t"></span><span class="oy-idea__tag"></span></span>`);
          c.querySelector('.oy-idea__t').textContent = x.text;
          mine.appendChild(c);
          return c;
        });

        await sleep(700);
        if (!ctx.alive) return;

        // Cascade the bot's list, stamping your matching ideas.
        const step = Math.max(80, Math.min(170, 2600 / Math.max(1, p.bot.length)));
        for (let i = 0; i < p.bot.length; i++) {
          const b = BG.el('<span class="oy-bchip"></span>');
          b.textContent = p.bot[i].a;
          botList.appendChild(b);
          const mineHit = [];
          hits.forEach((h, k) => h === i && mineHit.push(k));
          if (mineHit.length) {
            b.classList.add('oy-bchip--hit');
            BG.fx.sound('bad');
            mineHit.forEach((k) => {
              const c = chipEls[k];
              c.classList.add('oy-idea--bot');
              c.querySelector('.oy-idea__tag').textContent = '🤖 Bot thought of that';
              BG.fx.shake(c);
              ctx.addScore(PTS_BOT, c);
            });
            setBot(botRow, 'smug', `"${p.bot[i].a}". Called it. 😏`);
            await sleep(step + 380);
          } else {
            BG.fx.sound('tick');
            await sleep(step);
          }
          if (!ctx.alive) return;
        }

        // Everything the bot never thought of turns gold.
        const uniques = chipEls.filter((_, k) => hits[k] === -1);
        if (uniques.length) {
          setBot(botRow, 'nervous', 'Wait… I don\'t have these…');
          await sleep(450);
          if (!ctx.alive) return;
        }
        for (const c of uniques) {
          c.classList.add('oy-idea--gold');
          c.querySelector('.oy-idea__tag').textContent = '✨ Only you';
          BG.fx.pop(c);
          BG.fx.sound('good');
          ctx.addScore(PTS_ONLY, c);
          await sleep(Math.max(140, Math.min(260, 2400 / uniques.length)));
          if (!ctx.alive) return;
        }

        const n = ideas.length;
        const u = uniques.length;
        totalIdeas += n;
        totalUnique += u;
        const ratio = n ? u / n : 0;
        let mood;
        let line;
        if (!n) [mood, line] = ['bored', LINES.zero];
        else if (ratio >= 0.7 && u >= 3) [mood, line] = [u >= 8 ? 'mind' : 'shock', rpick(LINES.high)];
        else if (ratio >= 0.4) [mood, line] = ['meh', rpick(LINES.mid)];
        else [mood, line] = ['smug', rpick(LINES.low)];
        setBot(botRow, mood, line);

        const last = r === ROUNDS.length - 1;
        result.innerHTML = `
          <div class="oy-orig">
            <span class="label">Originality</span>
            <div class="oy-orig__num big-num"><span>${u}</span>/${n}</div>
            <div class="oy-orig__txt">${n ? `idea${n === 1 ? '' : 's'} ${u === 1 ? 'was' : 'were'} yours alone` : 'No ideas to judge'}</div>
            <div class="oy-orig__bar"><span style="transform:scaleX(${ratio.toFixed(3)})"></span></div>
          </div>
          <p class="oy-wild"><span class="label">One Botsworth never computed</span><br>${BG.esc(p.hint)}</p>
          <button class="btn btn--primary btn--block oy-next" type="button">${last ? 'See my score' : 'Next: the twist round →'}</button>`;
        result.hidden = false;
        BG.fx.sound(u > 0 && ratio >= 0.5 ? 'win' : 'pop');
        BG.fx.pop(result);
        result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

        await new Promise((res) => result.querySelector('.oy-next').addEventListener('click', res, { once: true }));
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      // ---------- Flow ----------
      (async () => {
        if (prompts.some((p) => !p)) {
          wrap.innerHTML = '<p class="muted">Prompts failed to load.</p>';
          ctx.finish({ summary: 'No prompts today 🤖', stats: { ideas: 0, unique: 0 } });
          return;
        }
        for (let r = 0; r < ROUNDS.length; r++) {
          const ideas = await intro(r);
          if (!ctx.alive || !ideas) return;
          await reveal(r, ideas);
          if (!ctx.alive) return;
        }
        if (totalUnique >= 5 && totalIdeas && totalUnique / totalIdeas >= 0.7) BG.fx.confetti();
        const best = ctx.store.get('bestUnique', 0);
        if (totalUnique > best) ctx.store.set('bestUnique', totalUnique);
        ctx.finish({
          summary: totalUnique
            ? `${totalUnique} idea${totalUnique === 1 ? '' : 's'} only you thought of ✨`
            : 'Botsworth predicted everything 🤖',
          stats: { ideas: totalIdeas, unique: totalUnique },
        });
      })();
    },
  });
})();

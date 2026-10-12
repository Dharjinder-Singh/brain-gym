// Catch the Bot: Botsworth, a smug AI, explains its answers step by step.
// One line is wrong (or, rarely, none). Find it, object, bet on it.
(() => {
  'use strict';

  const LEVELS = ['easy', 'medium', 'hard'];
  const LEVEL_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const BET_KEYS = ['guess', 'likely', 'sure'];

  const SAY = {
    intro: {
      easy: [
        'Warm-up question. I solved it before you finished blinking.',
        'Behold: flawless reasoning, at 900 words per second.',
        'An easy one. Try to keep up, human.',
        'I checked this twice. Well, once. Confidently.',
      ],
      medium: [
        'Let\'s turn it up. My confidence is already at 100%.',
        'My training data says I\'m never wrong. I wrote my training data.',
        'Medium difficulty for you. Trivial for me.',
        'Prepare to be dazzled. Again.',
      ],
      hard: [
        'Final round. I\'ve been saving my best reasoning for this.',
        'Hard mode. I don\'t make mistakes, I make features.',
        'This one\'s tricky. For you, I mean.',
        'Last chance to doubt me. You won\'t.',
      ],
    },
    done: [
      'Done. Please clap.',
      'Perfect, as usual. Go on, look for a mistake.',
      'Not a single error. I\'d bet my GPU on it.',
      'Reviewed by me, approved by me. Flawless.',
      'Just copy that down. No need to check.',
    ],
    nervous: [
      'W-why are you looking at that line?',
      'That line is fine. Totally fine. Move along.',
      'Bold choice. Wrong, probably. Probably.',
      'Hmm. Are you sure you want to… nevermind.',
      'Objection? To ME?',
    ],
    caught: [
      'That was… a deliberate test. Of you. You passed. Ugh.',
      'Recalculating my self-esteem…',
      'A cosmic ray flipped a bit! Not my fault!',
      'Fine. FINE. Enjoy your little victory.',
      'Who taught you to read things carefully?!',
    ],
    missed: [
      'Ha! You trusted me. Everyone does.',
      'Fooled you. That\'s my favourite part.',
      'Wrong line, detective. My mistake lives on.',
      'Automation bias: works every single time.',
    ],
    cleanRight: [
      'See? Sometimes I\'m right. Mark the date.',
      'Correct, I was flawless. You may continue to worship me.',
      'Finally, some respect for my genius.',
    ],
    cleanWrong: [
      'Objection overruled! Every line was perfect.',
      'Paranoid much? That one was 100% correct.',
      'You doubted a correct answer. I\'m hurt. Slightly.',
    ],
    trustedWrong: [
      '"Looks right"? It was WRONG. Delicious.',
      'You approved my mistake. I love working with you.',
      'Rubber-stamped! That\'s how I like my humans.',
    ],
    end: {
      3: 'Three for three. I\'m going to reboot and think about my choices.',
      2: 'Two catches. Lucky. I\'ll be back with sneakier mistakes tomorrow.',
      1: 'Only one catch. My plan to be trusted blindly is going well.',
      0: 'Zero catches! I\'ll be running everything by Friday.',
    },
  };

  // ---------- Content selection ----------
  function chooseItems(all, ctx) {
    const by = {};
    LEVELS.forEach((lv) => (by[lv] = all.filter((it) => it.level === lv)));
    const picked = [];
    if (ctx.mode === 'daily') {
      const perms = {};
      LEVELS.forEach((lv) => (perms[lv] = BG.shuffle(by[lv], BG.rng(BG.hash('catchbot-' + lv)))));
      // When medium and hard cycle with the same length, move hard "no error" items away from
      // slots where medium also has one. That's a fixed reordering, so nothing repeats within a cycle.
      const pm = perms.medium;
      const ph = perms.hard;
      if (pm.length && pm.length === ph.length) {
        const noErr = (x) => x.errorLine === -1;
        for (let i = 0; i < ph.length; i++) {
          if (!noErr(pm[i]) || !noErr(ph[i])) continue;
          for (let k = 1; k < ph.length; k++) {
            const j = (i + k) % ph.length;
            if (!noErr(ph[j]) && !noErr(pm[j])) {
              [ph[i], ph[j]] = [ph[j], ph[i]];
              break;
            }
          }
        }
      }
      LEVELS.forEach((lv) => {
        const perm = perms[lv];
        let idx = (ctx.day - 1) % perm.length;
        // At most one "no error" item per game; easy never has one.
        if (picked.some((p) => p.errorLine === -1)) {
          let guard = 0;
          while (perm[idx].errorLine === -1 && guard++ < perm.length) idx = (idx + 1) % perm.length;
        }
        picked.push(perm[idx]);
      });
    } else {
      LEVELS.forEach((lv) => {
        let pool = by[lv];
        if (picked.some((p) => p.errorLine === -1)) pool = pool.filter((it) => it.errorLine !== -1);
        picked.push(BG.pick(pool, ctx.rand));
      });
    }
    return picked;
  }

  BG.registerGame({
    id: 'catchbot',
    name: 'Catch the Bot',
    emoji: '🕵️',
    skill: 'Spotting AI mistakes',
    tagline: 'The bot is confident. The bot is wrong. Find where.',
    howTo: [
      'Botsworth answers step by step. Usually one line is wrong.',
      'Tap the line where it FIRST goes wrong, then hit Objection.',
      'Sometimes it\'s all correct: press "Looks right to me".',
      'Bet on how sure you are. Faster catches earn a bonus.',
    ],
    science:
      'When an AI gave wrong suggestions, radiologists\' accuracy fell from 82% to 45.5%: people stop checking confident machines (Dratsch et al., Radiology 2023).',
    scienceUrl: 'https://pubs.rsna.org/doi/10.1148/radiol.222176',
    minutes: 3,
    maxScore: 510,

    mount(root, ctx) {
      const data = (window.BG_DATA_CATCHBOT && window.BG_DATA_CATCHBOT.items) || [];
      const rounds = chooseItems(data, ctx);
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
      // A wait that ends early when the player taps to skip the typing animation.
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

      // ---------- state ----------
      let phase = 'intro'; // typing | choose | bet | reveal | end
      let selected = -1;
      let lineEls = [];
      let chooseStart = 0;
      let resolveChoice = null;
      let resolveNext = null;
      let caught = 0;
      let streak = 0;
      let confidence = 100;
      const lastSaid = {};
      const say = (pool, key) => {
        let line = BG.pick(pool, ctx.rand);
        if (pool.length > 1 && line === lastSaid[key]) line = pool[(pool.indexOf(line) + 1) % pool.length];
        lastSaid[key] = line;
        sayText(line);
      };

      // ---------- DOM ----------
      const wrap = BG.el(`
        <div class="g-catchbot">
          <div class="cb-hero">
            <div class="cb-bot cb-bot--smug" aria-hidden="true">
              <span class="cb-bot-antenna"></span>
              <div class="cb-bot-head">
                <span class="cb-bot-eye cb-bot-eye--l"></span>
                <span class="cb-bot-eye cb-bot-eye--r"></span>
                <span class="cb-bot-mouth"></span>
                <span class="cb-bot-sweat"></span>
              </div>
            </div>
            <div class="cb-hero-text">
              <div class="cb-name">Botsworth <span class="chip chip--blue cb-conf">Confidence 100%</span></div>
              <div class="bubble cb-say" aria-live="polite"></div>
            </div>
          </div>
          <div class="cb-meta">
            <span class="label cb-round"></span>
            <span class="chip chip--gold cb-combo" hidden></span>
          </div>
          <div class="card cb-q">
            <span class="label cb-topic"></span>
            <p class="cb-qtext"></p>
            <pre class="cb-code" hidden></pre>
          </div>
          <div class="cb-chat" role="list"></div>
          <p class="cb-hint"></p>
          <div class="cb-actions" hidden>
            <button class="btn btn--primary btn--block cb-object" disabled>Tap a line to object</button>
            <button class="btn btn--ghost btn--block cb-fine">Looks right to me ✅</button>
          </div>
          <div class="cb-reveal" hidden></div>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const botEl = $('.cb-bot');
      const sayEl = $('.cb-say');
      const confEl = $('.cb-conf');
      const roundEl = $('.cb-round');
      const comboEl = $('.cb-combo');
      const topicEl = $('.cb-topic');
      const qEl = $('.cb-qtext');
      const codeEl = $('.cb-code');
      const chatEl = $('.cb-chat');
      const hintEl = $('.cb-hint');
      const actionsEl = $('.cb-actions');
      const objectBtn = $('.cb-object');
      const fineBtn = $('.cb-fine');
      const revealEl = $('.cb-reveal');
      const hasKeys = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

      function setMood(mood) {
        botEl.className = `cb-bot cb-bot--${mood}`;
      }
      function sayText(text) {
        sayEl.textContent = text;
        BG.fx.anim(sayEl, 'cb-say-in');
      }
      function setConfidence(v) {
        confidence = Math.max(0, v);
        confEl.textContent = `Confidence ${confidence}%`;
        confEl.className = `chip cb-conf ${confidence >= 70 ? 'chip--blue' : confidence >= 40 ? 'chip--warn' : ''}`;
        BG.fx.pop(confEl);
      }

      // ---------- input ----------
      wrap.addEventListener('click', (e) => {
        if (phase === 'typing') {
          skipping = true;
          if (skipNow) skipNow();
          return;
        }
        const line = e.target.closest('.cb-line');
        if (line && phase === 'choose') {
          const i = Number(line.dataset.i);
          if (i === selected) confirmPick();
          else select(i);
        }
      });
      objectBtn.addEventListener('click', () => confirmPick());
      fineBtn.addEventListener('click', () => {
        if (phase !== 'choose') return;
        BG.fx.haptic();
        resolveChoice && resolveChoice(-1);
      });

      function select(i) {
        if (phase !== 'choose' || !lineEls[i]) return;
        selected = i;
        lineEls.forEach((el, j) => {
          el.classList.toggle('is-selected', j === i);
          el.setAttribute('aria-pressed', String(j === i));
        });
        BG.fx.sound('tap');
        BG.fx.haptic();
        BG.fx.pop(lineEls[i]);
        objectBtn.disabled = false;
        objectBtn.textContent = `🚨 Objection! Line ${i + 1}`;
        setMood('nervous');
        say(SAY.nervous, 'nervous');
      }

      function confirmPick() {
        if (phase !== 'choose' || selected < 0) return;
        BG.fx.haptic(30);
        resolveChoice && resolveChoice(selected);
      }

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
        if (phase === 'typing' && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          skipping = true;
          if (skipNow) skipNow();
          return;
        }
        if (phase === 'choose') {
          if (/^[1-9]$/.test(e.key) && Number(e.key) <= lineEls.length) {
            e.preventDefault();
            const i = Number(e.key) - 1;
            select(i);
            lineEls[i].focus({ preventScroll: true });
          } else if (e.key === '0' || e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            fineBtn.click();
          } else if (e.key === 'Enter' && !onButton) {
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
        document.removeEventListener('keydown', onKey);
        phase = 'end';
      });

      // ---------- a round ----------
      async function playRound(r) {
        const item = rounds[r];
        ctx.setProgress(r + 1, TOTAL);
        phase = 'typing';
        skipping = false;
        selected = -1;
        lineEls = [];
        roundEl.textContent = `Round ${r + 1} of ${TOTAL} · ${LEVEL_LABEL[item.level]}`;
        topicEl.textContent = item.topic;
        qEl.textContent = item.question;
        codeEl.hidden = !item.code;
        codeEl.textContent = item.code || '';
        chatEl.innerHTML = '';
        chatEl.classList.remove('is-approved');
        revealEl.hidden = true;
        revealEl.innerHTML = '';
        actionsEl.hidden = true;
        objectBtn.disabled = true;
        objectBtn.textContent = 'Tap a line to object';
        hintEl.textContent = 'Botsworth is typing… tap anywhere to skip';
        setMood('typing');
        say(SAY.intro[item.level], 'intro');
        BG.fx.pop(wrap.querySelector('.cb-q'));

        await swait(900);
        if (!ctx.alive) return;

        for (let i = 0; i < item.lines.length; i++) {
          let dots = null;
          if (!skipping) {
            dots = BG.el('<div class="bubble cb-typing" aria-label="Botsworth is typing"><i></i><i></i><i></i></div>');
            chatEl.appendChild(dots);
            await swait(Math.min(1300, 420 + item.lines[i].length * 15));
            if (!ctx.alive) return;
            dots.remove();
          }
          const el = BG.el(`
            <button class="bubble cb-line" role="listitem" data-i="${i}" aria-pressed="false">
              <span class="cb-num">${i + 1}</span>
              <span class="cb-text">${BG.esc(item.lines[i])}</span>
            </button>`);
          chatEl.appendChild(el);
          lineEls.push(el);
          if (!skipping) {
            BG.fx.sound('tick');
            await swait(160);
            if (!ctx.alive) return;
          }
        }
        skipping = false;

        // ---------- choose ----------
        phase = 'choose';
        chatEl.classList.add('is-live');
        setMood('smug');
        say(SAY.done, 'done');
        actionsEl.hidden = false;
        hintEl.textContent = hasKeys
          ? `Find the line where Botsworth FIRST goes wrong. Keys: 1–${item.lines.length} pick · Enter objects · 0 looks right`
          : 'Find the line where Botsworth FIRST goes wrong. Tap it, then object.';
        chooseStart = performance.now();
        const choice = await new Promise((res) => (resolveChoice = res));
        resolveChoice = null;
        if (!ctx.alive) return;
        const secs = (performance.now() - chooseStart) / 1000;
        phase = 'bet';
        chatEl.classList.remove('is-live');
        actionsEl.hidden = true;
        hintEl.textContent = '';

        // ---------- stamp ----------
        if (choice >= 0) {
          const stamp = BG.el('<span class="cb-stamp">OBJECTION!</span>');
          lineEls[choice].appendChild(stamp);
          lineEls[choice].classList.add('is-objected');
          BG.fx.sound('pop');
          BG.fx.haptic(40);
          later(() => BG.fx.shake(chatEl), 180);
          setMood('nervous');
          sayText(BG.pick(['Wh-what? Objection to line ' + (choice + 1) + '?!', 'Hold on, let\'s not be hasty…', 'You can\'t object to ME!'], ctx.rand));
        } else {
          chatEl.classList.add('is-approved');
          chatEl.appendChild(BG.el('<span class="cb-stamp cb-stamp--ok">LOOKS RIGHT ✅</span>'));
          BG.fx.sound('pop');
          BG.fx.haptic(20);
          setMood('smug');
          sayText('You trust me? How… sensible.');
        }
        await wait(750);
        if (!ctx.alive) return;

        const bet = await ctx.bet(choice >= 0 ? `How sure are you about line ${choice + 1}?` : 'How sure are you it\'s all correct?');
        if (!ctx.alive) return;

        // ---------- reveal ----------
        phase = 'reveal';
        const correct = choice === item.errorLine;
        const err = item.errorLine;
        lineEls.forEach((el) => el.classList.add('is-done'));
        if (err >= 0) {
          lineEls[err].classList.add('is-error');
          if (correct) lineEls[err].classList.add('is-caught');
        } else {
          lineEls.forEach((el) => el.classList.add('is-ok'));
        }
        if (choice >= 0 && !correct) lineEls[choice].classList.add('is-wrongpick');

        let title;
        if (correct && err >= 0) {
          title = '🕵️ Caught it!';
          setMood('flustered');
          say(SAY.caught, 'caught');
          setConfidence(confidence - 35);
          BG.fx.shake(botEl);
        } else if (correct) {
          title = '✅ Good call: no error this time';
          setMood('smug');
          say(SAY.cleanRight, 'cleanRight');
        } else if (err < 0) {
          title = '🙈 Overruled: it was all correct';
          setMood('gloat');
          say(SAY.cleanWrong, 'cleanWrong');
        } else if (choice < 0) {
          title = '🤖 Botsworth slipped one past you';
          setMood('gloat');
          say(SAY.trustedWrong, 'trustedWrong');
        } else {
          title = '🤖 Wrong line: the bot got away';
          setMood('gloat');
          say(SAY.missed, 'missed');
        }
        BG.fx.sound(correct ? 'good' : 'bad');
        if (!correct) BG.fx.shake(chatEl);

        const where =
          err >= 0
            ? `<p class="cb-where"><span class="label">Error on line ${err + 1}</span><span class="cb-quote">${BG.esc(item.lines[err])}</span></p>`
            : '<p class="cb-where"><span class="label">No error</span></p>';
        revealEl.innerHTML = `
          <div class="card cb-verdict ${correct ? 'cb-verdict--ok' : 'cb-verdict--bad'}">
            <h3 class="cb-title">${title}</h3>
            ${where}
            <p class="cb-explain">${BG.esc(item.explain)}</p>
            <div class="cb-points"></div>
          </div>
          <button class="btn btn--primary btn--block cb-next">${r + 1 < TOTAL ? 'Next round →' : 'See results 🏁'}</button>`;
        revealEl.hidden = false;
        const verdict = revealEl.querySelector('.cb-verdict');
        const pointsEl = revealEl.querySelector('.cb-points');
        const nextBtn = revealEl.querySelector('.cb-next');
        nextBtn.disabled = true;
        BG.fx.pop(verdict);
        try {
          revealEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }

        const chips = [];
        if (correct) {
          caught += 1;
          streak += 1;
          const anchor = err >= 0 ? lineEls[err] : chatEl;
          ctx.addScore(100, anchor);
          chips.push('<span class="chip chip--ok">+100 catch</span>');
          const grace = 2 + item.lines.length * 1.2;
          const bonus = Math.round(30 * Math.max(0, Math.min(1, 1 - (secs - grace) / 20)));
          if (bonus > 0) {
            await wait(420);
            if (!ctx.alive) return;
            ctx.addScore(bonus, verdict);
            chips.push(`<span class="chip chip--blue">⚡ +${bonus} speed</span>`);
          }
          if (streak >= 2) {
            comboEl.textContent = `🔥 Combo x${streak}`;
            comboEl.hidden = false;
            BG.fx.pop(comboEl);
            chips.push(`<span class="chip chip--gold">🔥 Combo x${streak}</span>`);
          }
        } else {
          streak = 0;
          comboEl.hidden = true;
        }
        pointsEl.innerHTML = chips.join('');
        await wait(450);
        if (!ctx.alive) return;
        const delta = ctx.settleBet(bet, correct, verdict);
        ctx.addScore(delta);
        const b = BG.BETS[bet];
        pointsEl.insertAdjacentHTML(
          'beforeend',
          `<span class="chip ${delta > 0 ? 'chip--ok' : delta < 0 ? '' : 'chip--blue'}">${b ? b.emoji : ''} bet ${delta > 0 ? '+' : ''}${delta}</span>`
        );
        BG.track('catchbot_round', { id: item.id, level: item.level, correct, bet, noError: err < 0 });

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
        if (!rounds.length || rounds.some((x) => !x)) {
          sayText('My content file is missing. Even I can\'t bluff without it.');
          return;
        }
        for (let r = 0; r < TOTAL; r++) {
          await playRound(r);
          if (!ctx.alive) return;
        }
        phase = 'end';
        revealEl.hidden = true;
        actionsEl.hidden = true;
        hintEl.textContent = '';
        const key = Math.max(0, Math.min(3, caught));
        sayText(SAY.end[caught === TOTAL ? 3 : key]);
        if (caught === TOTAL) {
          setMood('defeated');
          BG.fx.sound('win');
          BG.fx.confetti();
        } else if (caught === 0) {
          setMood('gloat');
          BG.fx.sound('lose');
        } else {
          setMood(caught * 2 >= TOTAL ? 'flustered' : 'smug');
          BG.fx.sound(caught * 2 >= TOTAL ? 'good' : 'lose');
        }
        BG.fx.pop(botEl);
        await wait(1700);
        if (!ctx.alive) return;
        ctx.finish({
          summary: caught === TOTAL ? `Caught Botsworth ${caught}/${TOTAL} 🕵️ Perfect!` : `Caught Botsworth ${caught}/${TOTAL} 🕵️`,
          stats: { caught, rounds: TOTAL },
        });
      }

      run();
    },
  });
})();

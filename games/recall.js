// Flash Read: read a case file once, it gets shredded, then answer from memory.
// Includes a spaced-repetition "flashback" question from a case played 2–4 days ago.
(() => {
  'use strict';

  const READ_SECONDS = 60;
  const MAX_EARLY_BONUS = 40;
  const POINTS_Q = 50;
  const POINTS_FLASH = 80;
  const KINDS = ['🔎 Detail', '🔢 Numbers', '🕵️ Who did what', '💡 Deduction'];
  const RIGHT_LINES = [
    'Elementary! 🔍',
    'Sharp as a magnifying glass.',
    'The inspector tips his hat. 🎩',
    'Your notebook brain strikes again.',
    'Case-cracking memory!',
    'Nothing gets past you.',
    'Filed, stamped, solved. ✅',
    'The suspects are sweating now.',
  ];
  const WRONG_LINES = [
    'The trail went cold… 🧊',
    'A red herring got you!',
    'Even Holmes slipped sometimes.',
    'That clue slipped through the shredder.',
    'Hmm, check your notes, detective.',
    'The culprit is smirking somewhere.',
  ];

  function dailyIndex(day, n) {
    const order = BG.shuffle(
      Array.from({ length: n }, (_, i) => i),
      BG.rng(BG.hash('recall'))
    );
    return order[(((day - 1) % n) + n) % n];
  }

  BG.registerGame({
    id: 'recall',
    name: 'Flash Read',
    emoji: '📖',
    skill: 'Reading & remembering',
    tagline: 'One look at the case file. Then it gets shredded.',
    howTo: [
      'Read the case file — you get one look (60s). Finish early for bonus points.',
      'The file gets shredded. No peeking back!',
      'Answer 4 quick questions from memory and bet on how sure you are.',
      'Come back in a few days: a 🕰️ flashback question tests what stuck.',
    ],
    science:
      'Teens who read a text with only an AI helper remembered less three days later than those who took notes (Kreijkes et al., Computers & Education 2025). Testing yourself, spaced over days, is one of the best-proven ways to learn (Dunlosky et al. 2013).',
    scienceUrl: 'https://doi.org/10.1016/j.compedu.2025.105514',
    minutes: 3,
    maxScore: 480,

    mount(root, ctx) {
      const data = (window.BG_DATA_RECALL && window.BG_DATA_RECALL.cases) || [];
      const wrap = BG.el('<div class="g-recall"></div>');
      root.appendChild(wrap);
      if (!data.length) {
        wrap.innerHTML = '<p class="muted">Case files are missing. Try again later.</p>';
        ctx.finish({ summary: 'No case today 🗂️', stats: { correct: 0, total: 0 } });
        return;
      }

      const daily = ctx.mode === 'daily';
      const caseIdx = daily ? dailyIndex(ctx.day, data.length) : Math.floor(ctx.rand() * data.length);
      const kase = data[caseIdx];
      const fileNo = String(1000 + caseIdx * 37 + (daily ? ctx.day : 0)).padStart(4, '0');

      // ---- Spaced-repetition history: { [day]: caseId } ----
      let flash = null;
      if (daily) {
        const hist = ctx.store.get('history', {}) || {};
        for (const ago of [3, 2, 4]) {
          const id = hist[ctx.day - ago];
          if (!id || id === kase.id) continue;
          const old = data.find((c) => c.id === id);
          if (old && old.flashback) {
            flash = { kase: old, ago };
            break;
          }
        }
      }
      const totalSteps = 4 + (flash ? 1 : 0);

      let timer = null;
      let keyHandler = null;
      const setKeys = (fn) => {
        if (keyHandler) document.removeEventListener('keydown', keyHandler);
        keyHandler = fn;
        if (fn) document.addEventListener('keydown', fn);
      };
      ctx.onDestroy(() => {
        if (timer) timer.stop();
        setKeys(null);
      });

      const pickLine = (arr) => arr[Math.floor(ctx.rand() * arr.length)];

      // ================= Phase 1: READ =================
      async function readPhase() {
        ctx.setProgress(0, totalSteps);
        wrap.innerHTML = `
          <div class="g-recall-read">
            <div class="g-recall-head">
              <span class="label">Case file #${fileNo}</span>
              <span class="chip chip--warn">👀 One look only</span>
            </div>
            <div class="g-recall-stage">
              <article class="g-recall-file">
                <span class="g-recall-tab">CONFIDENTIAL</span>
                <h2 class="g-recall-title"></h2>
                <p class="g-recall-text"></p>
              </article>
            </div>
            <div class="g-recall-dock">
              <div class="g-recall-timer"></div>
              <button class="btn btn--primary btn--block g-recall-done" type="button">I've got it 🧠</button>
              <p class="g-recall-hint muted">Finish early: +1 point per second left (max ${MAX_EARLY_BONUS}).</p>
            </div>
          </div>`;
        wrap.querySelector('.g-recall-title').textContent = kase.title;
        wrap.querySelector('.g-recall-text').textContent = kase.text;
        const doneBtn = wrap.querySelector('.g-recall-done');
        BG.fx.sound('pop');

        timer = BG.timerBar(wrap.querySelector('.g-recall-timer'), READ_SECONDS);
        const early = new Promise((resolve) => {
          doneBtn.addEventListener('click', () => resolve('early'), { once: true });
        });
        const how = await Promise.race([early, timer.done.then(() => 'time')]);
        if (!ctx.alive) return false;
        const elapsed = timer.elapsed();
        timer.stop();
        doneBtn.disabled = true;

        if (how === 'early') {
          BG.fx.sound('pick');
          BG.fx.haptic();
          const bonus = Math.min(MAX_EARLY_BONUS, Math.max(0, Math.floor(READ_SECONDS - elapsed)));
          if (bonus > 0) ctx.addScore(bonus, doneBtn);
        } else {
          BG.fx.toast('⏰ Time! Shredding the file…');
        }
        BG.track('recall_read', { case: kase.id, early: how === 'early', seconds: Math.round(elapsed) });

        // Remember what was read today (daily only) for future flashbacks.
        if (daily) {
          const hist = ctx.store.get('history', {}) || {};
          hist[ctx.day] = kase.id;
          Object.keys(hist).forEach((d) => {
            if (Number(d) < ctx.day - 30) delete hist[d];
          });
          ctx.store.set('history', hist);
        }

        await shred(wrap.querySelector('.g-recall-stage'), wrap.querySelector('.g-recall-file'));
        return ctx.alive;
      }

      // Cut the file into strips that fall away, with a paper-shredder buzz.
      async function shred(stage, file) {
        const h = file.offsetHeight;
        stage.style.height = `${h + 14}px`;
        wrap.querySelectorAll('.g-recall-done, .g-recall-hint, .g-recall-timer').forEach((el) => (el.style.visibility = 'hidden'));
        const N = 9;
        const box = BG.el('<div class="g-recall-shredder" aria-hidden="true"></div>');
        for (let i = 0; i < N; i++) {
          const strip = file.cloneNode(true);
          strip.classList.add('g-recall-strip');
          strip.style.clipPath = `inset(0 ${(100 - ((i + 1) * 100) / N).toFixed(3)}% 0 ${((i * 100) / N).toFixed(3)}%)`;
          strip.style.setProperty('--d', `${(i % 2 ? 60 : 0) + i * 45}ms`);
          strip.style.setProperty('--r', `${(i % 2 ? 1 : -1) * (4 + (i % 3) * 3)}deg`);
          strip.style.setProperty('--x', `${(i - (N - 1) / 2) * 6}px`);
          box.appendChild(strip);
        }
        file.replaceWith(box);
        const label = BG.el('<div class="g-recall-shred-label">🗑️ SHREDDED</div>');
        stage.appendChild(label);
        for (let i = 0; i < 7; i++) {
          BG.fx.sound('tick');
          if (i % 2 === 0) BG.fx.haptic(8);
          await BG.sleep(70);
          if (!ctx.alive) return;
        }
        BG.fx.sound('pop');
        await BG.sleep(650);
        if (!ctx.alive) return;
        BG.fx.pop(label);
        await BG.sleep(550);
      }

      // ================= Phase 2/3: QUESTIONS =================
      // Shows one question; resolves to whether it was answered right.
      async function ask({ step, kindLabel, banner, q, options, answer, evidence, points }) {
        ctx.setProgress(step, totalSteps);
        wrap.innerHTML = `
          <div class="g-recall-q">
            ${banner ? '<div class="g-recall-banner"></div>' : ''}
            <div class="g-recall-head">
              <span class="label"></span>
              <span class="chip chip--gold">+${points}</span>
            </div>
            <h3 class="g-recall-question"></h3>
            <div class="g-recall-opts" role="group"></div>
            <div class="g-recall-after" hidden>
              <p class="g-recall-react"></p>
              <p class="g-recall-evidence"></p>
              <button class="btn btn--dark btn--block g-recall-next" type="button"></button>
            </div>
          </div>`;
        if (banner) wrap.querySelector('.g-recall-banner').textContent = banner;
        wrap.querySelector('.g-recall-head .label').textContent = kindLabel;
        const qEl = wrap.querySelector('.g-recall-question');
        qEl.textContent = q;
        const optsEl = wrap.querySelector('.g-recall-opts');
        const btns = options.map((text, i) => {
          const b = BG.el(
            `<button class="g-recall-opt" type="button"><span class="g-recall-key">${'ABCD'[i]}</span><span class="g-recall-opt-text"></span></button>`
          );
          b.querySelector('.g-recall-opt-text').textContent = text;
          optsEl.appendChild(b);
          return b;
        });
        BG.fx.pop(qEl);

        const choice = await new Promise((resolve) => {
          btns.forEach((b, i) => b.addEventListener('click', () => resolve(i)));
          setKeys((e) => {
            const k = e.key.toLowerCase();
            let i = ['1', '2', '3', '4'].indexOf(k);
            if (i < 0) i = ['a', 'b', 'c', 'd'].indexOf(k);
            if (i >= 0 && i < btns.length) resolve(i);
          });
        });
        setKeys(null);
        if (!ctx.alive) return false;
        BG.fx.sound('tap');
        BG.fx.haptic();
        btns.forEach((b) => (b.disabled = true));
        btns[choice].classList.add('is-picked');

        const betKey = await ctx.bet('How sure are you?');
        if (!ctx.alive) return false;

        const correct = choice === answer;
        btns[answer].classList.add('is-right');
        if (correct) {
          BG.fx.sound('good');
          BG.fx.pop(btns[answer]);
        } else {
          BG.fx.sound('bad');
          btns[choice].classList.add('is-wrong');
          BG.fx.shake(btns[choice]);
        }
        const delta = ctx.settleBet(betKey, correct, btns[choice]);
        ctx.addScore(delta);
        if (correct) ctx.addScore(points, qEl);

        const after = wrap.querySelector('.g-recall-after');
        const react = wrap.querySelector('.g-recall-react');
        react.textContent = correct ? pickLine(RIGHT_LINES) : pickLine(WRONG_LINES);
        react.classList.add(correct ? 'is-good' : 'is-bad');
        const ev = wrap.querySelector('.g-recall-evidence');
        if (evidence) {
          ev.innerHTML = `<span class="label">📎 Evidence</span><q></q>`;
          ev.querySelector('q').textContent = evidence;
        } else {
          ev.innerHTML = `<span class="label">📎 From the file</span><span></span>`;
          ev.querySelector('span:last-child').textContent = `The answer was: ${options[answer]}`;
        }
        const next = wrap.querySelector('.g-recall-next');
        next.textContent = step >= totalSteps ? 'Close the case 🗂️' : 'Next question →';
        after.hidden = false;
        await BG.sleep(450);
        if (!ctx.alive) return correct;
        next.focus({ preventScroll: true });
        after.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        await new Promise((resolve) => {
          next.addEventListener('click', resolve, { once: true });
          setKeys((e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              resolve();
            }
          });
        });
        setKeys(null);
        if (ctx.alive) BG.fx.sound('tap');
        return correct;
      }

      async function run() {
        const ok = await readPhase();
        if (!ok || !ctx.alive) return;

        let correct = 0;
        for (let i = 0; i < kase.questions.length; i++) {
          const qq = kase.questions[i];
          const right = await ask({
            step: i + 1,
            kindLabel: `Question ${i + 1}/4 · ${KINDS[i] || 'Detail'}`,
            q: qq.q,
            options: qq.options,
            answer: qq.answer,
            evidence: qq.evidence,
            points: POINTS_Q,
          });
          if (!ctx.alive) return;
          if (right) correct++;
        }
        let total = kase.questions.length;

        if (flash) {
          const f = flash.kase.flashback;
          const right = await ask({
            step: totalSteps,
            kindLabel: `🕰️ Flashback · ${flash.ago} days ago`,
            banner: `🕰️ Flashback: from “${flash.kase.title}”, ${flash.ago} days ago…`,
            q: f.q,
            options: f.options,
            answer: f.answer,
            evidence: null,
            points: POINTS_FLASH,
          });
          if (!ctx.alive) return;
          total++;
          if (right) correct++;
        }

        const perfect = correct === total;
        if (perfect) {
          BG.fx.sound('win');
          BG.fx.confetti();
        }
        BG.track('recall_done', { case: kase.id, correct, total, flashback: !!flash });
        ctx.finish({
          summary: `Case closed: ${correct}/${total} 🔍`,
          stats: { correct, total },
        });
      }

      run();
    },
  });
})();

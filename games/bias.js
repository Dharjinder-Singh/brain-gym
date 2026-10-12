// Bias Buster: the two-step trap. Each scenario first lets you FALL for a thinking trap,
// then springs the "TRAP REVEAL!", asks you to name the bias, and gives you a debiased re-do.
// Based on Morewedge et al. (2015): one session of a debiasing game cut biased decisions.
(() => {
  'use strict';

  const TOTAL = 5;
  const PTS = { dodge: 40, name: 40, redo: 20 };
  const PER_ROUND = PTS.dodge + PTS.name + PTS.redo;
  const MAX = TOTAL * PER_ROUND;
  const ORDER = [
    'anchoring', 'framing', 'sunkcost', 'baserate', 'confirmation', 'availability', 'gambler',
    'conjunction', 'planning', 'survivorship', 'statusquo', 'overconfidence', 'halo', 'decoy',
  ];

  // Mind Shield levels by points earned.
  const LEVELS = [
    [0, 'Paper shield 📄'],
    [100, 'Cardboard shield 📦'],
    [200, 'Steel shield 🛡️'],
    [350, 'Force field ✨'],
    [MAX, 'Unbiasable 🧠'],
  ];

  const LINES = {
    dodged: ['Trap dodged! 🛡️', 'Not today, brain! 🛡️', 'Slipped right past it 🛡️', 'Clear thinking! 🛡️'],
    fell: ['Gotcha! You walked right in 🪤', 'Snap! The trap got you 🪤', 'Your brain took the shortcut 🪤', 'Classic! Most people fall for this 🪤'],
    named: ['Named and shamed! 🎯', 'Correct diagnosis 🩺', 'Spot on! 🎯', 'You know your traps 🧠'],
    misnamed: ['Close, but a different trap 🤏', 'Not that one 🤏', 'Different bias, same brain 🤏'],
    redoRight: ['Debiased! ✨', 'Brain rebooted ✨', 'That is the antidote ✨'],
    redoWrong: ['The trap is sneaky 🫠', 'Not quite. See the tip 🫠'],
  };

  // ---------- Content selection ----------
  // Daily: scenarios laid out in a fixed round-robin stream (one bias at a time, in a fixed
  // shuffled order). Day d takes the next 5. With 14 biases, any 5 consecutive items are 5
  // different biases, and the stream (70 items, divisible by 5) only repeats after 14 days.
  function chooseDaily(data, day) {
    const biasIds = ORDER.filter((b) => data.scenarios.some((s) => s.bias === b));
    const by = {};
    biasIds.forEach((b) => {
      by[b] = BG.shuffle(data.scenarios.filter((s) => s.bias === b), BG.rng(BG.hash('bias-scn-' + b)));
    });
    const bOrder = BG.shuffle(biasIds, BG.rng(BG.hash('bias-order')));
    const per = Math.min(...biasIds.map((b) => by[b].length));
    const stream = [];
    for (let k = 0; k < per; k++) bOrder.forEach((b) => stream.push(by[b][k]));
    const d = Math.max(0, day - 1);
    const picked = [];
    for (let j = 0; j < TOTAL; j++) picked.push(stream[(d * TOTAL + j) % stream.length]);
    return picked;
  }

  function choosePractice(data, rand) {
    const biasIds = BG.shuffle(ORDER.filter((b) => data.scenarios.some((s) => s.bias === b)), rand);
    return biasIds.slice(0, TOTAL).map((b) => BG.pick(data.scenarios.filter((s) => s.bias === b), rand));
  }

  const fmtNum = (n) => Number(n).toLocaleString('en-IN');

  BG.registerGame({
    id: 'bias',
    name: 'Bias Buster',
    emoji: '🧠',
    skill: 'Catching thinking traps',
    category: 'brain',
    tagline: 'Your brain has shortcuts. Some of them are traps. Fall in, then learn to dodge.',
    howTo: [
      'Answer each quick question on gut instinct.',
      'TRAP REVEAL! Did you dodge it? (+40)',
      'Name the thinking trap that was at work (+40).',
      'Then make a debiased re-decision (+20).',
    ],
    science:
      'A single session of a debiasing video game cut biased decisions by about 32% right away and about 24% two months later, beating an instructional video, and the gains carried over to new kinds of problems (Morewedge et al., Policy Insights from the Behavioral and Brain Sciences, 2015).',
    scienceUrl: 'https://openaccess.city.ac.uk/id/eprint/12324',
    minutes: 3,
    maxScore: MAX,

    mount(root, ctx) {
      const data = window.BG_DATA_BIAS || { biases: [], scenarios: [] };
      const BIAS = {};
      (data.biases || []).forEach((b) => (BIAS[b.id] = b));

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
      let earned = 0;
      let dodged = 0;
      let named = 0;
      let debiased = 0;
      let streak = 0;
      let bestStreak = 0;
      const results = [];
      // The currently answerable group of buttons (for number keys) and the "continue" action.
      let keyGroup = null;
      let keyEnter = null;

      // ---------- DOM ----------
      const wrap = BG.el(`
        <div class="bz-wrap">
          <div class="bz-meter" aria-live="polite">
            <div class="bz-meter-top">
              <span class="label">🧠 Mind Shield</span>
              <span class="bz-level">${BG.esc(LEVELS[0][1])}</span>
            </div>
            <div class="bz-meter-bar"><div class="bz-meter-fill"></div></div>
          </div>
          <div class="bz-stage"></div>
        </div>`);
      root.appendChild(wrap);
      const stage = wrap.querySelector('.bz-stage');
      const meterEl = wrap.querySelector('.bz-meter');
      const meterFill = wrap.querySelector('.bz-meter-fill');
      const levelEl = wrap.querySelector('.bz-level');
      const hasKeys = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

      function gain(delta, anchor) {
        earned += delta;
        ctx.addScore(delta, anchor);
        setMeter();
      }

      function setMeter() {
        meterFill.style.transform = `scaleX(${Math.min(1, earned / MAX)})`;
        let label = LEVELS[0][1];
        LEVELS.forEach(([min, l]) => {
          if (earned >= min) label = l;
        });
        if (levelEl.textContent !== label) {
          levelEl.textContent = label;
          BG.fx.pop(levelEl);
        }
        meterEl.classList.toggle('is-full', earned >= MAX);
      }
      setMeter();

      function show(el) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
      }

      // ---------- keyboard ----------
      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey) return;
        const active = document.activeElement;
        const onButton = active && (active.tagName === 'BUTTON' || active.tagName === 'INPUT');
        if (keyGroup && /^[1-9]$/.test(e.key)) {
          const b = keyGroup[Number(e.key) - 1];
          if (b && !b.disabled) {
            e.preventDefault();
            b.click();
          }
          return;
        }
        if (keyEnter && e.key === 'Enter' && !onButton) {
          e.preventDefault();
          keyEnter();
        }
      }
      document.addEventListener('keydown', onKey);

      ctx.onDestroy(() => {
        timers.forEach(clearTimeout);
        timers.clear();
        document.removeEventListener('keydown', onKey);
        keyGroup = null;
        keyEnter = null;
      });

      // A vertical list of big option buttons. Resolves with the tapped index.
      function askChoice(host, options, cls) {
        host.innerHTML = `<div class="bz-opts ${cls || ''}" role="group">
          ${options.map((o, i) => `
            <button class="bz-opt" data-i="${i}">
              ${hasKeys ? `<span class="bz-key" aria-hidden="true">${i + 1}</span>` : ''}
              <span class="bz-opt-text">${o}</span>
            </button>`).join('')}
        </div>`;
        const btns = Array.from(host.querySelectorAll('.bz-opt'));
        keyGroup = btns;
        return new Promise((res) => {
          host.querySelector('.bz-opts').addEventListener('click', (e) => {
            const b = e.target.closest('.bz-opt');
            if (!b || b.disabled) return;
            btns.forEach((x) => (x.disabled = true));
            b.classList.add('is-picked');
            keyGroup = null;
            BG.fx.sound('pick');
            BG.fx.haptic();
            res({ index: Number(b.dataset.i), btns });
          });
        });
      }

      // A slider with a big live readout and a lock button. Resolves with the value.
      function askSlider(host, range) {
        const fmt = (v) => `${range.prefix || ''}${fmtNum(v)}${range.suffix || ''}`;
        host.innerHTML = `
          <div class="bz-slider">
            <output class="bz-slider-val big-num">${BG.esc(fmt(range.start))}</output>
            <input type="range" class="bz-range" min="${range.min}" max="${range.max}" step="${range.step || 1}" value="${range.start}" aria-label="Your estimate">
            <div class="bz-slider-ends"><span>${BG.esc(fmt(range.min))}</span><span>${BG.esc(fmt(range.max))}</span></div>
            <div class="bz-nudge">
              <button class="btn btn--ghost btn--sm bz-nudge-btn" data-d="-1" aria-label="Decrease">−</button>
              <span class="muted">drag or nudge</span>
              <button class="btn btn--ghost btn--sm bz-nudge-btn" data-d="1" aria-label="Increase">+</button>
            </div>
            <button class="btn btn--primary btn--block bz-lock">🔒 Lock it in</button>
          </div>`;
        const input = host.querySelector('.bz-range');
        const out = host.querySelector('.bz-slider-val');
        const lock = host.querySelector('.bz-lock');
        const step = Number(range.step || 1);
        const update = () => {
          out.textContent = fmt(Number(input.value));
        };
        update();
        let lastTick = 0;
        input.addEventListener('input', () => {
          update();
          const now = performance.now();
          if (now - lastTick > 70) {
            lastTick = now;
            BG.fx.sound('tick');
          }
        });
        host.querySelectorAll('.bz-nudge-btn').forEach((b) =>
          b.addEventListener('click', () => {
            const v = Math.min(range.max, Math.max(range.min, Number(input.value) + Number(b.dataset.d) * step));
            input.value = String(v);
            update();
            BG.fx.sound('tap');
          })
        );
        keyGroup = null;
        return new Promise((res) => {
          const done = () => {
            if (lock.disabled) return;
            lock.disabled = true;
            input.disabled = true;
            host.querySelectorAll('.bz-nudge-btn').forEach((b) => (b.disabled = true));
            keyEnter = null;
            BG.fx.sound('pick');
            BG.fx.haptic(30);
            res({ value: Number(input.value), el: out });
          };
          lock.addEventListener('click', done);
          keyEnter = done;
        });
      }

      function waitNext(btn) {
        btn.disabled = false;
        btn.focus({ preventScroll: true });
        return new Promise((res) => {
          const go = () => {
            if (btn.disabled) return;
            btn.disabled = true;
            keyEnter = null;
            res();
          };
          btn.addEventListener('click', go, { once: true });
          keyEnter = go;
        });
      }

      // ---------- a round ----------
      async function playRound(r, sc) {
        ctx.setProgress(r + 1, TOTAL);
        const s1 = sc.step1;
        const bias = BIAS[sc.bias];

        stage.innerHTML = `
          <div class="bz-round">
            <div class="bz-meta">
              <span class="label">Trap ${r + 1} of ${TOTAL}</span>
              <span class="chip chip--gold bz-streak" ${streak >= 2 ? '' : 'hidden'}>🔥 Streak x${streak}</span>
            </div>
            <article class="card bz-scene">
              <div class="bz-scene-head">
                <span class="bz-scene-emoji" aria-hidden="true">${sc.emoji || '🤔'}</span>
                <span class="label bz-gut">⚡ Gut instinct!</span>
              </div>
              <p class="bz-setup">${BG.esc(sc.setup)}</p>
              <p class="bz-q">${BG.esc(s1.q)}</p>
              <div class="bz-step1"></div>
            </article>
            <div class="bz-after"></div>
          </div>`;
        const scene = stage.querySelector('.bz-scene');
        const step1Host = stage.querySelector('.bz-step1');
        const after = stage.querySelector('.bz-after');
        BG.fx.sound('pop');
        try {
          wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          /* old browsers */
        }

        // ----- Step 1: the trap -----
        let didDodge;
        let youSaid;
        let bestText;
        let step1Anchor;
        let optBtns = null;
        if (s1.type === 'slider') {
          const { value, el } = await askSlider(step1Host, s1.range);
          if (!ctx.alive) return;
          didDodge = value >= s1.goodRange[0] && value <= s1.goodRange[1];
          const rg = s1.range;
          youSaid = `${rg.prefix || ''}${fmtNum(value)}${rg.suffix || ''}`;
          bestText = s1.truth;
          step1Anchor = el;
        } else {
          const good = [].concat(s1.goodAnswer);
          const opts = s1.options.map((o) => BG.esc(o));
          const { index, btns } = await askChoice(step1Host, opts);
          if (!ctx.alive) return;
          didDodge = good.includes(index);
          youSaid = s1.options[index];
          bestText = good.map((i) => s1.options[i]).join(' / ');
          step1Anchor = btns[index];
          optBtns = btns;
        }

        // Dramatic pause, then the stamp.
        scene.classList.add('is-thinking', 'is-answered');
        await wait(450);
        if (!ctx.alive) return;
        scene.classList.remove('is-thinking');
        const stamp = BG.el(`<span class="bz-stamp${didDodge ? ' bz-stamp--ok' : ''}">${didDodge ? '🛡️ TRAP DODGED!' : '🪤 TRAP REVEAL!'}</span>`);
        scene.appendChild(stamp);
        BG.fx.sound(didDodge ? 'good' : 'honk');
        BG.fx.haptic(didDodge ? 20 : 60);
        if (optBtns) {
          const good = [].concat(s1.goodAnswer);
          optBtns.forEach((b, i) => {
            if (good.includes(i)) b.classList.add('is-good');
            else if (i === s1.trapAnswer) b.classList.add('is-trap');
          });
        }
        if (didDodge) {
          dodged += 1;
          BG.fx.pop(scene);
          gain(PTS.dodge, step1Anchor);
        } else {
          BG.fx.shake(scene);
        }

        const verdict = BG.el(`
          <div class="card bz-verdict ${didDodge ? 'bz-verdict--ok' : 'bz-verdict--bad'}">
            <h3 class="bz-title"></h3>
            ${didDodge ? '' : '<p class="bz-yousaid"><span class="label">You said</span><span class="bz-yousaid-text"></span></p>'}
            <p class="bz-best"><span class="label">${s1.type === 'slider' ? 'The answer' : 'Best answer'}</span><span class="bz-best-text"></span></p>
          </div>`);
        verdict.querySelector('.bz-title').textContent = BG.pick(didDodge ? LINES.dodged : LINES.fell, ctx.rand);
        verdict.querySelector('.bz-best-text').textContent = bestText;
        if (!didDodge) verdict.querySelector('.bz-yousaid-text').textContent = youSaid;
        after.appendChild(verdict);
        show(verdict);
        await wait(650);
        if (!ctx.alive) return;

        // ----- Step 2: name the bias -----
        const nameCard = BG.el(`
          <div class="card bz-namecard">
            <h3 class="bz-h">🕵️ Which bias was at work?</h3>
            <div class="bz-names" role="group" aria-label="Bias options"></div>
          </div>`);
        after.appendChild(nameCard);
        const nameOpts = BG.shuffle(sc.nameOptions.filter((id) => BIAS[id]), ctx.rand);
        const namesHost = nameCard.querySelector('.bz-names');
        namesHost.innerHTML = nameOpts.map((id, i) => `
          <button class="bz-name" data-id="${id}">
            ${hasKeys ? `<span class="bz-key" aria-hidden="true">${i + 1}</span>` : ''}
            <span class="bz-name-emoji" aria-hidden="true">${BIAS[id].emoji}</span>
            <span class="bz-name-text">${BG.esc(BIAS[id].name)}</span>
          </button>`).join('');
        const nameBtns = Array.from(namesHost.querySelectorAll('.bz-name'));
        keyGroup = nameBtns;
        BG.fx.sound('pop');
        show(nameCard);
        const pickedId = await new Promise((res) => {
          namesHost.addEventListener('click', (e) => {
            const b = e.target.closest('.bz-name');
            if (!b || b.disabled) return;
            nameBtns.forEach((x) => (x.disabled = true));
            keyGroup = null;
            BG.fx.haptic();
            res(b.dataset.id);
          });
        });
        if (!ctx.alive) return;
        const didName = pickedId === sc.bias;
        nameBtns.forEach((b) => {
          if (b.dataset.id === sc.bias) b.classList.add('is-good');
          else if (b.dataset.id === pickedId) b.classList.add('is-bad');
        });
        stamp.remove();
        const biasStamp = BG.el('<span class="bz-stamp bz-stamp--bias"></span>');
        biasStamp.textContent = `${bias.emoji} ${bias.name.toUpperCase()}`;
        scene.appendChild(biasStamp);
        const pickedBtn = nameBtns.find((b) => b.dataset.id === pickedId);
        if (didName) {
          named += 1;
          BG.fx.sound('good');
          BG.fx.pop(pickedBtn);
          gain(PTS.name, pickedBtn);
        } else {
          BG.fx.sound('bad');
          BG.fx.shake(pickedBtn);
        }

        const explainCard = BG.el(`
          <div class="card bz-explain">
            <h3 class="bz-title"></h3>
            <p class="bz-bias"><span class="bz-bias-emoji" aria-hidden="true">${bias.emoji}</span><span><b class="bz-bias-name"></b> <span class="bz-bias-line"></span></span></p>
            <p class="bz-why"></p>
            <p class="bz-tip"><b>🛡️ Shield move:</b> <span></span></p>
          </div>`);
        explainCard.querySelector('.bz-title').textContent = BG.pick(didName ? LINES.named : LINES.misnamed, ctx.rand);
        explainCard.querySelector('.bz-bias-name').textContent = bias.name + ':';
        explainCard.querySelector('.bz-bias-line').textContent = bias.oneLiner;
        explainCard.querySelector('.bz-why').textContent = s1.explain;
        explainCard.querySelector('.bz-tip span').textContent = bias.tip || '';
        after.appendChild(explainCard);
        show(explainCard);
        await wait(700);
        if (!ctx.alive) return;

        // ----- Step 3: debiased re-decision -----
        let didRedo = false;
        if (sc.redo) {
          const redoCard = BG.el(`
            <div class="card bz-redo">
              <h3 class="bz-h">🔁 Debias it</h3>
              <p class="bz-redo-q"></p>
              <div class="bz-redo-opts"></div>
            </div>`);
          redoCard.querySelector('.bz-redo-q').textContent = sc.redo.question;
          after.appendChild(redoCard);
          BG.fx.sound('pop');
          show(redoCard);
          const { index, btns } = await askChoice(redoCard.querySelector('.bz-redo-opts'), sc.redo.options.map((o) => BG.esc(o)), 'bz-opts--redo');
          if (!ctx.alive) return;
          didRedo = index === sc.redo.answer;
          btns.forEach((b, i) => {
            if (i === sc.redo.answer) b.classList.add('is-good');
            else if (i === index) b.classList.add('is-trap');
          });
          if (didRedo) {
            debiased += 1;
            BG.fx.sound('good');
            gain(PTS.redo, btns[index]);
          } else {
            BG.fx.sound('bad');
            BG.fx.shake(btns[index]);
          }
          const note = BG.el('<p class="bz-redo-note"></p>');
          note.textContent = BG.pick(didRedo ? LINES.redoRight : LINES.redoWrong, ctx.rand);
          redoCard.appendChild(note);
        }

        // ----- Round tally -----
        const perfectRound = didDodge && didName;
        if (perfectRound) {
          streak += 1;
          bestStreak = Math.max(bestStreak, streak);
        } else {
          streak = 0;
        }
        const streakChip = stage.querySelector('.bz-streak');
        if (streak >= 2) {
          streakChip.textContent = `🔥 Streak x${streak}`;
          streakChip.hidden = false;
          BG.fx.pop(streakChip);
        } else {
          streakChip.hidden = true;
        }

        const tally = BG.el(`
          <div class="bz-tally">
            <span class="chip ${didDodge ? 'chip--ok' : 'chip--warn'}">${didDodge ? `🛡️ Dodged +${PTS.dodge}` : '🪤 Fell in'}</span>
            <span class="chip ${didName ? 'chip--ok' : 'chip--warn'}">${didName ? `🎯 Named +${PTS.name}` : '❓ Misnamed'}</span>
            ${sc.redo ? `<span class="chip ${didRedo ? 'chip--ok' : 'chip--warn'}">${didRedo ? `✨ Debiased +${PTS.redo}` : '🫠 Re-do missed'}</span>` : ''}
            ${streak >= 2 ? `<span class="chip chip--gold">🔥 x${streak}</span>` : ''}
          </div>`);
        const nextBtn = BG.el(`<button class="btn btn--primary btn--block bz-next" disabled>${r + 1 < TOTAL ? 'Next trap →' : 'See results 🏁'}</button>`);
        after.appendChild(tally);
        after.appendChild(nextBtn);
        show(nextBtn);

        results.push({ bias: sc.bias, dodged: didDodge, named: didName, redo: didRedo });
        const stats = ctx.store.get('byBias', {});
        const row = stats[sc.bias] || { n: 0, dodged: 0, named: 0 };
        row.n += 1;
        if (didDodge) row.dodged += 1;
        if (didName) row.named += 1;
        stats[sc.bias] = row;
        ctx.store.set('byBias', stats);
        BG.track('bias_round', { id: sc.id, bias: sc.bias, dodged: didDodge, named: didName, redo: didRedo });

        await waitNext(nextBtn);
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      // ---------- game ----------
      async function run() {
        const scenarios = data.scenarios || [];
        if (!scenarios.length || !Object.keys(BIAS).length) {
          stage.innerHTML = '<p class="muted">The trap room is empty (content file missing). Please refresh.</p>';
          return;
        }
        const rounds = BG.shuffle(ctx.mode === 'daily' ? chooseDaily(data, ctx.day) : choosePractice(data, ctx.rand), ctx.rand);
        if (rounds.length < TOTAL || rounds.some((s) => !s || !BIAS[s.bias])) {
          stage.innerHTML = '<p class="muted">Some traps went missing. Please refresh.</p>';
          return;
        }

        for (let r = 0; r < rounds.length; r++) {
          await playRound(r, rounds[r]);
          if (!ctx.alive) return;
        }

        // ---------- ending ----------
        keyGroup = null;
        keyEnter = null;
        const flawless = dodged === TOTAL && named === TOTAL;
        const caught = [];
        results.forEach((x) => {
          if (!x.dodged && !caught.includes(x.bias)) caught.push(x.bias);
        });
        const line = flawless
          ? 'Not one trap sprang. Your brain is officially bias-proof (for today).'
          : dodged + named >= 7
          ? 'Sharp! A couple of traps snapped, but you saw them for what they were.'
          : dodged + named >= 4
          ? 'Good work. Naming a trap is the first step to dodging it next time.'
          : 'The traps had a feast today. Everyone\'s brain does this. Tomorrow you\'ll see them coming.';
        stage.innerHTML = `
          <div class="card bz-end">
            <div class="bz-end-emoji" aria-hidden="true">${flawless ? '🏆' : '🧠'}</div>
            <div class="bz-end-stats">
              <div><span class="big-num">${dodged}/${TOTAL}</span><span class="label">traps dodged</span></div>
              <div><span class="big-num">${named}/${TOTAL}</span><span class="label">biases named</span></div>
              <div><span class="big-num">${debiased}/${TOTAL}</span><span class="label">debiased</span></div>
            </div>
            <p class="bz-end-line"></p>
            ${caught.length ? `<p class="bz-end-caught"><span class="label">Traps that got you</span>${caught
              .map((id) => `<span class="chip chip--warn">${BIAS[id].emoji} ${BG.esc(BIAS[id].name)}</span>`)
              .join('')}</p>` : ''}
          </div>`;
        stage.querySelector('.bz-end-line').textContent = line;
        BG.fx.pop(stage.querySelector('.bz-end'));
        if (flawless) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else {
          BG.fx.sound(dodged + named >= TOTAL ? 'good' : 'lose');
        }
        await wait(1800);
        if (!ctx.alive) return;
        ctx.finish({
          summary: `Dodged ${dodged}/${TOTAL} traps, named ${named}/${TOTAL} 🧠${flawless ? ' Flawless!' : ''}`,
          stats: {
            dodged,
            named,
            debiased,
            bestStreak,
            caughtBy: caught.map((id) => BIAS[id].name).join(', ') || 'none',
          },
        });
      }

      run();
    },
  });
})();

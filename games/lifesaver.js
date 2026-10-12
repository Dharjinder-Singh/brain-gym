// Lifesaver: two-part emergency workout.
// Part 1 (Rhythm): hands-only CPR compressions on a big chest target, guided by a 110 BPM
// metronome for 8 s, then 20 s solo while the ambulance arrives. Live BPM meter, green zone 100–120.
// Part 2 (Spot the signs): 5 short scenario cards (stroke F.A.S.T., cardiac arrest, other first aid),
// pick the right action, bet on it. Content in lifesaver-data.js.
(() => {
  'use strict';

  const BEAT_BPM = 110;
  const BEAT_MS = 60000 / BEAT_BPM;
  const GUIDE_MS = 8000;
  const SOLO_MS = 20000;
  const ZONE_LO = 100;
  const ZONE_HI = 120;
  const MIN_TAPS = 33; // 20 s at 100/min: fewer taps than this can't score 100% in the zone
  const GAP_MS = 2000; // a pause longer than this breaks the rhythm (meter resets)
  const BOUNCE_MS = 150; // ignore double-fires faster than 400/min
  const ROLL = 6; // rolling average of the last 6 intervals
  const N_VIG = 5;
  const PTS = { zone: 160, steady: 40, sign: 40 };
  const GAUGE_LO = 60;
  const GAUGE_HI = 160;
  const TYPE = {
    stroke: { emoji: '🧠', name: 'Stroke signs' },
    cardiac: { emoji: '🫀', name: 'Heart & CPR' },
    other: { emoji: '🩹', name: 'First aid' },
  };
  const PLAN = [['stroke', 1], ['cardiac', 1], ['other', 3]];

  // ---------- pure helpers (exported for tests) ----------
  // Daily: one fixed seeded permutation per type; day d takes the next n of each, so a card
  // only comes back once its whole pool has been used. Practice: random from ctx.rand.
  function chooseVignettes(all, mode, day, rand, BGx) {
    const by = (t) => all.filter((v) => v.type === t);
    let picked = [];
    PLAN.forEach(([t, n]) => {
      const pool = by(t);
      if (!pool.length) return;
      if (mode === 'daily') {
        const perm = BGx.shuffle(pool, BGx.rng(BGx.hash(`lifesaver-${t}-v1`)));
        const start = ((day - 1) * n) % perm.length;
        for (let k = 0; k < Math.min(n, perm.length); k++) picked.push(perm[(start + k) % perm.length]);
      } else {
        picked = picked.concat(BGx.shuffle(pool, rand).slice(0, n));
      }
    });
    if (picked.length < N_VIG) {
      const rest = BGx.shuffle(all.filter((v) => !picked.includes(v)), rand);
      picked = picked.concat(rest.slice(0, N_VIG - picked.length));
    }
    return BGx.shuffle(picked, rand).slice(0, N_VIG);
  }

  // taps: compressions in the solo phase that had a previous tap; inZone: how many of those had an
  // instantaneous rate within 100–120; intervals: their gaps in ms (pauses > GAP_MS excluded).
  function scoreRhythm(taps, inZone, intervals) {
    const zonePct = taps ? inZone / Math.max(taps, MIN_TAPS) : 0;
    let mean = 0;
    let cv = 1;
    if (intervals.length) {
      mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const varc = intervals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / intervals.length;
      cv = Math.sqrt(varc) / mean;
    }
    const bpm = mean ? Math.round(60000 / mean) : 0;
    // Full steadiness at ≤5% variation, none at ≥25%. Steady at the wrong pace earns a quarter.
    let steady = intervals.length >= 8 ? Math.max(0, Math.min(1, 1 - (cv - 0.05) / 0.2)) : 0;
    if (bpm < 90 || bpm > 130) steady *= 0.25;
    return {
      zonePct,
      zonePts: Math.round(zonePct * PTS.zone),
      steady,
      steadyPts: Math.round(steady * PTS.steady),
      bpm,
      cv,
    };
  }

  const engine = { chooseVignettes, scoreRhythm, PTS, MIN_TAPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  BG.registerGame({
    id: 'lifesaver',
    name: 'Lifesaver',
    emoji: '🫀',
    skill: 'Acting in an emergency',
    category: 'life',
    tagline: 'Someone collapses. Would your hands know the beat?',
    howTo: [
      'Part 1: tap the chest (or press Space) to do compressions. Keep the meter in the green: 100–120 a minute.',
      'A beat guides you for 8 seconds, then you\'re on your own until the ambulance arrives.',
      'Part 2: spot the emergency in 5 quick scenarios, pick the right move and bet on it.',
      'Practice game, not certified training. Take a real CPR class.',
    ],
    science:
      'The American Heart Association says bystander CPR can double or triple a person\'s chance of surviving a cardiac arrest outside hospital. For untrained bystanders helping an adult, it recommends hands-only CPR: push hard and fast in the centre of the chest.',
    scienceUrl: 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support',
    minutes: 3,
    // rhythm 160 (in zone) + 40 (steadiness) + 5 signs × (40 + 40 "certain" bet) = 600
    maxScore: 600,

    mount(root, ctx) {
      const data = (window.BG_DATA_LIFESAVER && window.BG_DATA_LIFESAVER.vignettes) || [];
      const cards = chooseVignettes(data, ctx.mode, ctx.day, ctx.rand, BG);
      const STEPS = 1 + cards.length;

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
      let raf = 0;
      let ac = null;
      const muted = () => BG.store.get('muted', false);

      // Own tiny synth: a soft thump per compression and a soft metronome tick.
      function tone(steps) {
        if (muted()) return;
        try {
          ac = ac || new (window.AudioContext || window.webkitAudioContext)();
          if (ac.state === 'suspended') ac.resume();
          const now = ac.currentTime;
          steps.forEach(([f0, f1, dur, vol, type]) => {
            const o = ac.createOscillator();
            const g = ac.createGain();
            o.type = type || 'sine';
            o.frequency.setValueAtTime(f0, now);
            o.frequency.exponentialRampToValueAtTime(f1, now + dur);
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(vol, now + 0.006);
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            o.connect(g).connect(ac.destination);
            o.start(now);
            o.stop(now + dur + 0.02);
          });
        } catch {
          /* audio unavailable */
        }
      }
      const thump = () => tone([[140, 55, 0.12, 0.22]]);
      const tick = () => tone([[1700, 1500, 0.035, 0.05, 'triangle']]);

      // ---------- DOM ----------
      const wrap = BG.el(`
        <div class="ls-app">
          <section class="ls-rhythm">
            <div class="ls-meta">
              <span class="label ls-part">Part 1 · Hands-only CPR</span>
              <span class="chip chip--gold ls-streak" hidden></span>
            </div>
            <div class="ls-eta" aria-hidden="true">
              <div class="ls-eta-track"><div class="ls-eta-fill"></div><span class="ls-amb">🚑</span><span class="ls-hosp">🧍</span></div>
              <span class="ls-eta-label">Ambulance on its way</span>
            </div>
            <div class="ls-stage">
              <span class="ls-ring" aria-hidden="true"></span>
              <span class="ls-ring ls-ring--2" aria-hidden="true"></span>
              <button class="ls-chest" type="button" aria-label="Chest: tap to do a compression">
                <span class="ls-sternum" aria-hidden="true"></span>
                <span class="ls-heart" aria-hidden="true">🫀</span>
                <span class="ls-push">Tap to start</span>
              </button>
            </div>
            <div class="ls-meter">
              <div class="ls-bpm-row">
                <span class="big-num ls-bpm">--</span><span class="ls-bpm-unit">per min</span>
                <span class="ls-status"></span>
              </div>
              <div class="ls-gauge" aria-hidden="true">
                <span class="ls-zone"></span>
                <span class="ls-needle" hidden></span>
                <span class="ls-tick ls-tick--lo">100</span><span class="ls-tick ls-tick--hi">120</span>
              </div>
            </div>
            <p class="ls-coach" aria-live="polite"></p>
            <div class="ls-fact" hidden></div>
            <div class="ls-rres" hidden></div>
          </section>
          <section class="ls-signs" hidden></section>
          <section class="ls-end" hidden></section>
          <p class="ls-disclaimer">⚠️ Practice game, not certified training. Take a real CPR class.</p>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const rhythmEl = $('.ls-rhythm');
      const streakEl = $('.ls-streak');
      const etaFill = $('.ls-eta-fill');
      const ambEl = $('.ls-amb');
      const etaLabel = $('.ls-eta-label');
      const stageEl = $('.ls-stage');
      const rings = Array.from(wrap.querySelectorAll('.ls-ring'));
      const chestEl = $('.ls-chest');
      const pushEl = $('.ls-push');
      const bpmEl = $('.ls-bpm');
      const statusEl = $('.ls-status');
      const meterEl = $('.ls-meter');
      const needleEl = $('.ls-needle');
      const coachEl = $('.ls-coach');
      const factEl = $('.ls-fact');
      const rresEl = $('.ls-rres');
      const signsEl = $('.ls-signs');
      const endEl = $('.ls-end');
      const zoneEl = $('.ls-zone');
      const pctOf = (b) => ((b - GAUGE_LO) / (GAUGE_HI - GAUGE_LO)) * 100;
      zoneEl.style.left = `${pctOf(ZONE_LO)}%`;
      zoneEl.style.width = `${pctOf(ZONE_HI) - pctOf(ZONE_LO)}%`;
      $('.ls-tick--lo').style.left = `${pctOf(ZONE_LO)}%`;
      $('.ls-tick--hi').style.left = `${pctOf(ZONE_HI)}%`;
      const hasKeys = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

      // ---------- rhythm state ----------
      let state = 'idle'; // idle | guide | solo | done
      let t0 = 0;
      let nextBeat = 0;
      let lastTap = 0;
      let buf = []; // last ROLL intervals (ms)
      let stale = true;
      let streak = 0;
      let bestStreak = 0;
      let totalTaps = 0;
      const solo = { taps: 0, inZone: 0, intervals: [] };
      const factsShown = new Set();
      let resolveRhythm = null;
      let rhythm = null;

      function setCoach(html) {
        coachEl.innerHTML = html;
      }
      setCoach(`Someone has collapsed and isn't breathing normally. 112 has been called. <b>Start compressions!</b>${hasKeys ? ' <span class="muted">(click the chest or press Space)</span>' : ''}`);

      function showFact(key, html, ms = 6000) {
        if (factsShown.has(key)) return;
        factsShown.add(key);
        factEl.innerHTML = html;
        factEl.hidden = false;
        BG.fx.anim(factEl, 'ls-fact-in');
        BG.fx.sound('pop');
        later(() => {
          if (factEl.innerHTML === html) factEl.hidden = true;
        }, ms);
      }

      function rollingBpm() {
        if (!buf.length) return 0;
        return 60000 / (buf.reduce((a, b) => a + b, 0) / buf.length);
      }

      function paintMeter(bpm) {
        if (!bpm) {
          bpmEl.textContent = '--';
          needleEl.hidden = true;
          meterEl.classList.remove('is-good', 'is-slow', 'is-fast');
          statusEl.textContent = '';
          return;
        }
        const r = Math.round(bpm);
        bpmEl.textContent = String(r);
        needleEl.hidden = false;
        needleEl.style.left = `${Math.max(0, Math.min(100, pctOf(bpm)))}%`;
        const good = r >= ZONE_LO && r <= ZONE_HI;
        const slow = r < ZONE_LO;
        meterEl.classList.toggle('is-good', good);
        meterEl.classList.toggle('is-slow', slow);
        meterEl.classList.toggle('is-fast', !good && !slow);
        chestEl.classList.toggle('is-good', good);
        statusEl.textContent = good ? 'Perfect pace 👌' : slow ? 'Faster ⏩' : 'Slow down ⏪';
      }

      function setStreak() {
        if (streak >= 5) {
          streakEl.textContent = `🔥 ${streak} in the zone`;
          if (streakEl.hidden) BG.fx.pop(streakEl);
          streakEl.hidden = false;
        } else {
          streakEl.hidden = true;
        }
      }

      function startRhythm(now) {
        state = 'guide';
        t0 = now;
        nextBeat = now + BEAT_MS;
        stageEl.classList.add('is-guided');
        pushEl.textContent = 'PUSH';
        setCoach('<b>Follow the beat.</b> Push hard and fast in the centre of the chest, about 5–6 cm deep, and let it come all the way back up.');
        ctx.setProgress(1, STEPS);
        BG.track('lifesaver_rhythm_start', { mode: ctx.mode });
        raf = requestAnimationFrame(frame);
      }

      function compress(now) {
        if (state === 'idle') startRhythm(now);
        if (state !== 'guide' && state !== 'solo') return;
        if (lastTap && now - lastTap < BOUNCE_MS) return;
        totalTaps += 1;
        BG.fx.anim(chestEl, 'is-press');
        BG.fx.haptic(15);
        thump();
        if (lastTap) {
          const dt = now - lastTap;
          const rate = 60000 / dt;
          const inZone = rate >= ZONE_LO && rate <= ZONE_HI;
          if (dt > GAP_MS) buf = [];
          else {
            buf.push(dt);
            if (buf.length > ROLL) buf.shift();
          }
          if (state === 'solo') {
            solo.taps += 1;
            if (inZone) solo.inZone += 1;
            if (dt <= GAP_MS) solo.intervals.push(dt);
            streak = inZone ? streak + 1 : 0;
            bestStreak = Math.max(bestStreak, streak);
            setStreak();
            if (streak > 0 && streak % 20 === 0) {
              BG.fx.sound('good');
              BG.fx.float(chestEl, `🔥 ${streak} in a row!`, 'good');
            }
          }
        }
        lastTap = now;
        stale = false;
        paintMeter(rollingBpm());
      }

      // Main loop: metronome, ETA bar, phase changes, pause detection.
      function frame(now) {
        if (!ctx.alive || state === 'done') return;
        const el = now - t0;
        if (state === 'guide') {
          if (now >= nextBeat) {
            tick();
            rings.forEach((r, i) => later(() => BG.fx.anim(r, 'ls-beat'), i * 90));
            while (nextBeat <= now) nextBeat += BEAT_MS;
          }
          if (el >= GUIDE_MS) {
            state = 'solo';
            stageEl.classList.remove('is-guided');
            stageEl.classList.add('is-solo');
            setCoach('<b>Keep going — help is on the way.</b> The beat is gone: hold the rhythm yourself.');
            BG.fx.sound('pop');
            BG.fx.haptic(40);
          }
        }
        if (state === 'solo') {
          const s = el - GUIDE_MS;
          if (s > 4500) showFact('bees', '🎵 Many people use the beat of the Bee Gees\' <b>"Stayin\' Alive"</b> (about 104 BPM) to keep pace.');
          if (s > 12500) showFact('deep', '💪 Real compressions are about <b>5–6 cm deep</b>. That\'s hard work: rescuers swap about every 2 minutes.');
          if (s >= SOLO_MS) {
            endRhythm();
            return;
          }
        }
        const k = Math.min(1, el / (GUIDE_MS + SOLO_MS));
        etaFill.style.transform = `scaleX(${k})`;
        ambEl.style.left = `${k * 100}%`;
        const left = Math.max(0, Math.ceil((GUIDE_MS + SOLO_MS - el) / 1000));
        etaLabel.textContent = `🚑 Ambulance in ${left}s`;
        if (!stale && now - lastTap > 1500) {
          stale = true;
          buf = [];
          paintMeter(0);
          chestEl.classList.remove('is-good');
          statusEl.textContent = "Don't stop! 💪";
          if (state === 'solo' && streak) {
            streak = 0;
            setStreak();
          }
        }
        raf = requestAnimationFrame(frame);
      }

      function endRhythm() {
        state = 'done';
        cancelAnimationFrame(raf);
        stageEl.classList.remove('is-guided', 'is-solo');
        stageEl.classList.add('is-done');
        chestEl.disabled = true;
        etaFill.style.transform = 'scaleX(1)';
        ambEl.style.left = '100%';
        etaLabel.textContent = '🚑 Paramedics have arrived!';
        factEl.hidden = true;
        streakEl.hidden = true;
        rhythm = scoreRhythm(solo.taps, solo.inZone, solo.intervals);
        BG.track('lifesaver_rhythm', { bpm: rhythm.bpm, zone: Math.round(rhythm.zonePct * 100), taps: solo.taps });
        if (resolveRhythm) resolveRhythm();
      }

      // ---------- input ----------
      const stamp = (e) => {
        const n = performance.now();
        return e && e.timeStamp > 0 && Math.abs(e.timeStamp - n) < 1000 ? e.timeStamp : n;
      };
      chestEl.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        compress(stamp(e));
      });
      chestEl.addEventListener('contextmenu', (e) => e.preventDefault());

      let onSignKey = null;
      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey) return;
        if (state !== 'done') {
          if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
            e.preventDefault();
            if (!e.repeat) compress(stamp(e));
          }
          return;
        }
        if (onSignKey) onSignKey(e);
      }
      document.addEventListener('keydown', onKey);

      ctx.onDestroy(() => {
        state = 'done';
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        timers.clear();
        document.removeEventListener('keydown', onKey);
        try {
          if (ac) ac.close();
        } catch {
          /* ignore */
        }
      });

      // ---------- part 1 result ----------
      async function showRhythmResult() {
        const r = rhythm;
        const pct = Math.round(r.zonePct * 100);
        const best = ctx.store.get('bestZone', 0);
        const pb = pct > best && pct > 0;
        if (pb) ctx.store.set('bestZone', pct);
        let verdict;
        if (!solo.taps) verdict = 'No compressions while you were on your own. Next time, keep pushing until help arrives!';
        else if (pct >= 80) verdict = 'Rock-steady hands. That rhythm keeps blood moving to the brain.';
        else if (pct >= 50) verdict = r.bpm < ZONE_LO ? 'Good effort, but you drifted slow. Think "Stayin\' Alive".' : r.bpm > ZONE_HI ? 'Good effort, but you rushed. Fast is good, too fast is less effective.' : 'Good effort. A little more steadiness and you\'re there.';
        else verdict = r.bpm && r.bpm < ZONE_LO ? 'Too slow without the beat. Aim for about two pushes a second.' : r.bpm > ZONE_HI ? 'Too fast without the beat. Aim for about two pushes a second.' : 'The rhythm slipped without the beat. Hum "Stayin\' Alive" and try again.';
        rresEl.innerHTML = `
          <div class="card ls-rcard">
            <h3 class="ls-rtitle">🚑 Paramedics take over</h3>
            <div class="ls-rstats">
              <div><span class="big-num">${r.bpm || '--'}</span><span class="label">avg per min</span></div>
              <div class="ls-rz"><span class="big-num">${pct}%</span><span class="label">in the zone</span></div>
              <div><span class="big-num">${Math.round(r.steady * 100)}%</span><span class="label">steadiness</span></div>
            </div>
            <p class="ls-rline">${BG.esc(verdict)}</p>
            <div class="ls-points">
              <span class="chip chip--ok">+${r.zonePts} zone</span>
              <span class="chip chip--blue">+${r.steadyPts} steady</span>
              ${pb ? '<span class="chip chip--gold">🏅 Personal best</span>' : ''}
              ${bestStreak >= 5 ? `<span class="chip chip--gold">🔥 best run ${bestStreak}</span>` : ''}
            </div>
          </div>
          <button class="btn btn--primary btn--block ls-next">Part 2: Spot the signs →</button>`;
        meterEl.hidden = true;
        coachEl.hidden = true;
        rresEl.hidden = false;
        const card = rresEl.querySelector('.ls-rcard');
        BG.fx.pop(card);
        BG.fx.sound(pct >= 50 ? 'win' : 'good');
        BG.fx.haptic(40);
        try {
          rresEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
        await wait(450);
        if (!ctx.alive) return;
        if (r.zonePts) ctx.addScore(r.zonePts, card.querySelector('.ls-rz'));
        await wait(450);
        if (!ctx.alive) return;
        if (r.steadyPts) ctx.addScore(r.steadyPts, card);
        const nextBtn = rresEl.querySelector('.ls-next');
        nextBtn.focus({ preventScroll: true });
        await new Promise((res) => {
          nextBtn.addEventListener('click', res, { once: true });
          onSignKey = (e) => {
            if (e.key === 'Enter' && document.activeElement !== nextBtn) {
              e.preventDefault();
              res();
            }
          };
        });
        onSignKey = null;
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      // ---------- part 2: spot the signs ----------
      const tally = { right: 0 };
      async function playCard(i) {
        const item = cards[i];
        ctx.setProgress(i + 2, STEPS);
        const order = BG.shuffle(item.options.map((t, k) => ({ t, k })), ctx.rand);
        const type = TYPE[item.type] || TYPE.other;
        signsEl.innerHTML = `
          <div class="ls-meta"><span class="label">Part 2 · Spot the signs</span><span class="label">${i + 1} / ${cards.length}</span></div>
          <div class="card ls-vig">
            <span class="ls-vig-icon" aria-hidden="true">🚨</span>
            <p class="ls-vig-text">${BG.esc(item.text)}</p>
          </div>
          <p class="ls-q">What do you do?</p>
          <div class="ls-opts">
            ${order.map((o, j) => `<button class="ls-opt" data-j="${j}" type="button"><span class="ls-opt-key" aria-hidden="true">${j + 1}</span><span>${BG.esc(o.t)}</span></button>`).join('')}
          </div>
          <div class="ls-reveal" hidden></div>`;
        const vig = signsEl.querySelector('.ls-vig');
        BG.fx.anim(vig, 'ls-slide-in');
        const btns = Array.from(signsEl.querySelectorAll('.ls-opt'));
        const pickJ = await new Promise((res) => {
          btns.forEach((b) => b.addEventListener('click', () => res(Number(b.dataset.j))));
          onSignKey = (e) => {
            if (/^[1-9]$/.test(e.key) && Number(e.key) <= btns.length) {
              e.preventDefault();
              res(Number(e.key) - 1);
            }
          };
        });
        onSignKey = null;
        if (!ctx.alive) return;
        BG.fx.sound('pick');
        BG.fx.haptic(20);
        btns.forEach((b) => (b.disabled = true));
        const picked = btns[pickJ];
        picked.classList.add('is-picked');
        const bet = await ctx.bet('How sure is that the right move?');
        if (!ctx.alive) return;
        const correct = order[pickJ].k === item.answer;
        const rightBtn = btns[order.findIndex((o) => o.k === item.answer)];
        rightBtn.classList.add('is-right');
        if (correct) {
          tally.right += 1;
          BG.fx.sound('good');
          ctx.addScore(PTS.sign, picked);
        } else {
          picked.classList.add('is-wrong');
          BG.fx.sound('bad');
          BG.fx.shake(picked);
        }
        await wait(correct ? 350 : 200);
        if (!ctx.alive) return;
        const delta = ctx.settleBet(bet, correct, rightBtn);
        ctx.addScore(delta);
        BG.track('lifesaver_sign', { id: item.id, type: item.type, correct, bet });

        const revealEl = signsEl.querySelector('.ls-reveal');
        revealEl.innerHTML = `
          <div class="card ls-why ls-why--${correct ? 'ok' : 'bad'}">
            <h3 class="ls-why-title">${correct ? '✅ Right move' : '❌ Not this time'}</h3>
            <span class="chip ${item.type === 'stroke' ? 'chip--blue' : item.type === 'cardiac' ? '' : 'chip--warn'}">${type.emoji} ${type.name}</span>
            <p class="ls-why-text">💡 ${BG.esc(item.why)}</p>
          </div>
          <button class="btn btn--primary btn--block ls-next">${i + 1 < cards.length ? 'Next scenario →' : 'See my report 🫀'}</button>`;
        revealEl.hidden = false;
        BG.fx.pop(revealEl.firstElementChild);
        try {
          revealEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
        const nextBtn = revealEl.querySelector('.ls-next');
        nextBtn.focus({ preventScroll: true });
        await new Promise((res) => {
          nextBtn.addEventListener('click', res, { once: true });
          onSignKey = (e) => {
            if ((e.key === 'Enter' || e.key === 'ArrowRight') && document.activeElement !== nextBtn) {
              e.preventDefault();
              res();
            }
          };
        });
        onSignKey = null;
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      // ---------- flow ----------
      async function run() {
        ctx.setProgress(1, STEPS);
        await new Promise((res) => (resolveRhythm = res));
        resolveRhythm = null;
        if (!ctx.alive) return;
        BG.fx.sound('honk');
        await wait(700);
        if (!ctx.alive) return;
        await showRhythmResult();
        if (!ctx.alive) return;

        rhythmEl.hidden = true;
        signsEl.hidden = false;
        if (!cards.length) signsEl.innerHTML = '<p class="muted">Scenario content is missing. Please refresh.</p>';
        for (let i = 0; i < cards.length; i++) {
          await playCard(i);
          if (!ctx.alive) return;
        }

        // ---------- end ----------
        const r = rhythm;
        const pct = Math.round(r.zonePct * 100);
        const great = pct >= 70 && tally.right === cards.length;
        signsEl.hidden = true;
        endEl.innerHTML = `
          <div class="card ls-endcard">
            <div class="ls-end-emoji">${great ? '🦸' : '🫀'}</div>
            <span class="label">Lifesaver report</span>
            <h3 class="ls-end-name">${great ? 'Ready to rescue' : pct >= 50 || tally.right >= 3 ? 'Getting there' : 'Keep practising'}</h3>
            <div class="ls-points">
              <span class="chip chip--ok">🫀 ${r.bpm || '--'} per min · ${pct}% in the zone</span>
              <span class="chip chip--blue">🚨 ${tally.right}/${cards.length} signs spotted</span>
            </div>
            <div class="ls-remember">
              <p><b>Collapsed, not breathing normally?</b> Call 112 (or 108 for an ambulance in most states), then push hard and fast in the centre of the chest: 100–120 a minute, 5–6 cm deep.</p>
              <p><b>Stroke? Think F.A.S.T.</b> Face drooping · Arm weakness · Speech difficulty · Time to call.</p>
            </div>
          </div>`;
        endEl.hidden = false;
        BG.fx.pop(endEl.firstElementChild);
        if (great) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else {
          BG.fx.sound(tally.right >= 3 ? 'good' : 'lose');
        }
        try {
          endEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
        await wait(3200);
        if (!ctx.alive) return;
        const held = r.bpm ? `Held ${r.bpm} BPM, ${pct}% in the zone` : 'No solo compressions';
        ctx.finish({
          summary: `${held} · ${tally.right}/${cards.length} signs 🫀`,
          stats: {
            bpm: r.bpm,
            inZonePct: pct,
            steadiness: Math.round(r.steady * 100),
            compressions: totalTaps,
            bestRun: bestStreak,
            signs: tally.right,
            signsTotal: cards.length,
          },
        });
      }

      run();
    },
  });
})();

// Brain Gym game: "Dot Dash" (id 'morse').
// Learn Morse code by ear with the Koch method: start with two characters at full speed,
// add one each time you reach 90%. Missed letters come back sooner (spaced repetition).
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure engine (no DOM). Exported for node tests at the bottom.
  // ---------------------------------------------------------------------------
  // Koch order, as used by most Koch-method trainers (LCWO).
  const KOCH = 'K M R S U A P T L O W I . N J E F 0 Y , V G 5 / Q 9 Z H 3 8 B ? 4 2 7 C 1 D 6 X'.split(' ');

  // ITU-R M.1677-1 International Morse code. '.' = dit, '-' = dah.
  const MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
    K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
    U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.',
  };
  const DECODE = {};
  Object.keys(MORSE).forEach((k) => (DECODE[MORSE[k]] = k));

  const CHAR_WPM = 20; // character speed: dit = 60 ms
  const SLOW_WPM = 10; // replay after a miss
  const DIT_MAX = 200; // key held shorter than this = dit
  const CHAR_GAP = 650; // key up this long = character finished

  const patternOf = (ch) => MORSE[String(ch).toUpperCase()] || '';
  const decodePattern = (p) => DECODE[p] || null;
  const patText = (p) => p.replace(/\./g, '·').replace(/-/g, '–');

  // Farnsworth: characters at `wpm`, extra space between characters/words so the
  // overall speed is `eff` WPM (ARRL formula). Returns tone segments [start, dur] in ms.
  function timeline(text, wpm = CHAR_WPM, eff = wpm) {
    const u = 1200 / wpm;
    let cg = 3 * u;
    let wg = 7 * u;
    if (eff < wpm) {
      const ta = ((60 * wpm - 37.2 * eff) / (wpm * eff)) * 1000;
      cg = (3 * ta) / 19;
      wg = (7 * ta) / 19;
    }
    const words = String(text).toUpperCase().trim().split(/\s+/).filter(Boolean);
    const segs = [];
    let t = 0;
    words.forEach((w, wi) => {
      const chars = [...w].filter((c) => MORSE[c]);
      chars.forEach((c, ci) => {
        const p = MORSE[c];
        for (let k = 0; k < p.length; k++) {
          const d = p[k] === '.' ? u : 3 * u;
          segs.push([t, d]);
          t += d;
          if (k < p.length - 1) t += u;
        }
        if (ci < chars.length - 1) t += cg;
      });
      if (wi < words.length - 1) t += wg;
    });
    return { segs, total: t, unit: u, charGap: cg, wordGap: wg };
  }

  // Overall (Farnsworth) speed for words: slow spacing for beginners, tightening as you learn.
  const effWpm = (level) => Math.min(15, 8 + Math.floor(level / 5));

  // Straight-key decoder. Feed it key down/up times (ms); poll() returns a finished pattern.
  function createKeyer({ ditMax = DIT_MAX, charGap = CHAR_GAP, minPress = 15, maxLen = 7 } = {}) {
    let downAt = null;
    let lastUp = 0;
    let cur = '';
    return {
      down(t) {
        if (downAt != null) return false;
        downAt = t;
        return true;
      },
      up(t) {
        if (downAt == null) return null;
        const d = t - downAt;
        downAt = null;
        if (d < minPress) return null; // contact bounce
        const s = d < ditMax ? '.' : '-';
        cur += s;
        lastUp = t;
        return s;
      },
      poll(t) {
        if (downAt != null || !cur) return null;
        if (t - lastUp >= charGap || cur.length >= maxLen) {
          const p = cur;
          cur = '';
          return p;
        }
        return null;
      },
      flush() {
        const p = cur;
        cur = '';
        downAt = null;
        return p || null;
      },
      get pattern() {
        return cur;
      },
      get holding() {
        return downAt != null;
      },
    };
  }

  // Spaced-repetition weight: weak, new and not-seen-lately letters come up more.
  function letterWeight(st, session, isNewest) {
    const s = st || { a: 0.5, n: 0, last: session };
    let w = 1 + 3 * (1 - s.a);
    if (s.n < 6) w += 1.5;
    if (isNewest) w += 1.5;
    w += Math.min(1.5, Math.max(0, session - (s.last || 0)) * 0.5);
    return w;
  }
  const updateAcc = (a, ok) => a * 0.75 + (ok ? 0.25 : 0);

  function pickWeighted(items, weights, rand) {
    let total = 0;
    weights.forEach((w) => (total += w));
    let x = rand() * total;
    for (let i = 0; i < items.length; i++) {
      x -= weights[i];
      if (x < 0) return items[i];
    }
    return items[items.length - 1];
  }

  // Short common words. Filtered at play time to the letters you know.
  const WORDS = (
    'SOS ASK ARK ART ARM ARMS ATOM AUTO MARK MASK MAST MAT MUST PARK PART PAST PAT POT PUT RAM RAMP RAT RUST ' +
    'SALT SAT SLAM SLOT SMART SOAP SOUP SPA SPARK SPOT STAR STOP STORM SUM TALK TAP TASK TOP TRAP TRUST TUSK ' +
    'WALK WALL WARM WASP WORK WORM OWL LOW SLOW TOW WOW SWIM MILK LIST WIT KIT SIT PIT LIP TIP RIM AIM ' +
    'INK PINK SINK LINK MINT PINT JAM JOIN JUMP NEW ONE TEN NET PEN TEA EAT SEA FUN FAN FIN FIRE FROG ' +
    'YES YAWN VAN VET GAS EGG JOY HAT HEN BOX BUS CAB DOT DASH CODE RADIO MORSE QUIZ ZAP HELLO SKY KEY ' +
    'TOY WAY DAY MAY SAY PAY CITY UP US AM AT IT IS ON NO SO TO GO HI OK OR MOM MUM SUMO KAPOK PUMA OPUS ' +
    'TRUMP PLUM SLUM RUM TRAM MAPS SPUR PURR MOAT ROAM ROAST TOAST STRAP SPRAT PASTA PARMA TORSO'
  ).split(' ');

  function makeWord(letters, minLen, maxLen, rand, avoid, newest) {
    const set = new Set(letters);
    const cands = WORDS.filter(
      (w) => w.length >= minLen && w.length <= maxLen && w !== avoid && [...w].every((c) => set.has(c)),
    );
    if (cands.length >= 3 && rand() < 0.75) return { word: cands[Math.floor(rand() * cands.length)], real: true };
    // Koch-style random group, guaranteed to include the newest letter.
    const len = minLen + Math.floor(rand() * (maxLen - minLen + 1));
    const out = [];
    for (let i = 0; i < len; i++) out.push(letters[Math.floor(rand() * letters.length)]);
    if (newest && !out.includes(newest)) out[Math.floor(rand() * len)] = newest;
    return { word: out.join(''), real: false };
  }

  const engine = { KOCH, MORSE, DECODE, patternOf, decodePattern, patText, timeline, effWpm, createKeyer, letterWeight, updateAcc, pickWeighted, makeWord, WORDS, DIT_MAX, CHAR_GAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const TONE = 600;
  const VOL = 0.22;
  const RAMP = 0.005; // 5 ms attack / release: no clicks
  const R1_ITEMS = 25;
  const CHECKPOINT = 12; // Koch check mid-round: 11/12 unlocks a letter right away
  const R2_SECONDS = 30;
  const UNLOCK_AT = 0.9;

  const patHTML = (p, cls = '') =>
    `<span class="g-morse-p ${cls}" role="img" aria-label="${[...p].map((s) => (s === '.' ? 'dit' : 'dah')).join(' ')}">${[...p]
      .map((s, i) => `<i class="${s === '.' ? 'g-morse-dit' : 'g-morse-dah'}" style="--i:${i}"></i>`)
      .join('')}</span>`;
  const keyLabel = (c) => ({ '.': 'period', ',': 'comma', '?': 'question mark', '/': 'slash' })[c] || c;

  BG.registerGame({
    id: 'morse',
    name: 'Dot Dash',
    emoji: '📡',
    skill: 'Learning Morse code',
    category: 'cool',
    tagline: 'Learn Morse by ear, 5 minutes a day. Send SOS within a week.',
    howTo: [
      'Hear a beep pattern, tap its letter. Don\'t count dots: learn the rhythm.',
      'Hit 90% and a new letter unlocks (the Koch method). Missed letters come back sooner.',
      'Then key words on the telegraph: tap = dit, hold = dah.',
      'Bonus: decode a whole word at full speed.',
    ],
    science:
      'The Koch method teaches Morse by sound at full speed, adding a letter at 90% accuracy. Spacing practice over days is one of the most reliable findings in learning research (Cepeda et al., Psychological Bulletin 2006).',
    scienceUrl: 'https://pubmed.ncbi.nlm.nih.gov/16719566/',
    minutes: 4,
    maxScore: 500,

    mount(root, ctx) {
      // ---------- persistent progression ----------
      const firstTime = ctx.store.get('level', null) == null;
      let level = Math.max(2, Math.min(KOCH.length, ctx.store.get('level', 2) | 0));
      const letters = ctx.store.get('letters', {}) || {};
      const session = (ctx.store.get('session', 0) | 0) + 1;
      const fresh = firstTime ? ['K', 'M'] : (ctx.store.get('fresh', []) || []).filter((c) => KOCH.includes(c));
      const unlockedNow = [];
      const known = () => KOCH.slice(0, level);
      const newest = () => KOCH[level - 1];
      KOCH.slice(0, level).forEach((c) => {
        if (!letters[c]) letters[c] = { a: 0.5, n: 0, last: session - 1 };
      });
      const saveLetters = () => ctx.store.set('letters', letters);

      function unlock() {
        if (level >= KOCH.length) return null;
        level++;
        const c = KOCH[level - 1];
        letters[c] = { a: 0.5, n: 0, last: session };
        unlockedNow.push(c);
        ctx.store.set('level', level);
        saveLetters();
        BG.track('morse_unlock', { level, letter: c });
        return c;
      }

      const stats = { r1: 0, r1ok: 0, sent: 0, decoded: false, best: 0 };
      let streak = 0;
      let phase = 'intro';
      let finished = false;

      // ---------- timers (all cleaned up on destroy) ----------
      const timers = new Set();
      const later = (fn, ms) => {
        const id = setTimeout(() => {
          timers.delete(id);
          if (ctx.alive) fn();
        }, ms);
        timers.add(id);
        return id;
      };
      const wait = (ms) => new Promise((r) => later(r, ms));
      let pollIv = null;
      let r2timer = null;

      // ---------- DOM ----------
      root.innerHTML = '';
      const wrap = BG.el(`
        <div class="g-morse">
          <div class="g-morse-top">
            <span class="label g-morse-round"></span>
            <span class="g-morse-chips">
              <span class="chip chip--gold g-morse-streak" hidden></span>
              <span class="chip chip--blue g-morse-count"></span>
            </span>
          </div>
          <div class="panel g-morse-stage">
            <div class="g-morse-lamp" aria-hidden="true"><span class="g-morse-bulb"></span></div>
            <div class="g-morse-readout">
              <div class="g-morse-glyph" aria-live="polite"></div>
              <div class="g-morse-pat"></div>
            </div>
            <span class="g-morse-mute label" hidden>🔇 Sound off: watch the lamp</span>
          </div>
          <p class="g-morse-msg" aria-live="polite"></p>
          <div class="g-morse-body"></div>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const roundEl = $('.g-morse-round');
      const streakEl = $('.g-morse-streak');
      const countEl = $('.g-morse-count');
      const stageEl = $('.g-morse-stage');
      const lampEl = $('.g-morse-lamp');
      const glyphEl = $('.g-morse-glyph');
      const patEl = $('.g-morse-pat');
      const muteEl = $('.g-morse-mute');
      const msgEl = $('.g-morse-msg');
      const body = $('.g-morse-body');

      const isMuted = () => !!BG.store.get('muted', false);
      const syncMute = () => (muteEl.hidden = !isMuted());
      syncMute();

      function say(text, kind = '') {
        msgEl.textContent = text;
        msgEl.className = `g-morse-msg${kind ? ` g-morse-msg--${kind}` : ''}`;
      }
      function showGlyph(text, pattern = '', kind = '') {
        glyphEl.textContent = text;
        glyphEl.className = `g-morse-glyph${kind ? ` g-morse-glyph--${kind}` : ''}`;
        patEl.innerHTML = pattern ? patHTML(pattern) : '';
        if (text) BG.fx.pop(glyphEl);
      }
      function setStreak() {
        streakEl.hidden = streak < 3;
        streakEl.textContent = `🔥 ${streak}`;
        streakEl.classList.toggle('is-hot', streak >= 5);
      }

      // ---------- audio + lamp ----------
      let ac = null;
      function audio() {
        if (isMuted()) return null;
        try {
          if (!ac) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ac = new AC();
          }
          if (ac.state === 'suspended') ac.resume();
          return ac;
        } catch {
          return null;
        }
      }
      const lampOn = () => lampEl.classList.add('is-on');
      const lampOff = () => lampEl.classList.remove('is-on');

      let playing = null;
      function stopPlay() {
        if (!playing) return;
        const p = playing;
        playing = null;
        p.timers.forEach((id) => {
          clearTimeout(id);
          timers.delete(id);
        });
        try {
          if (p.gain && ac) {
            const now = ac.currentTime;
            p.gain.gain.cancelScheduledValues(now);
            p.gain.gain.setValueAtTime(0, now);
            p.osc.stop(now + 0.01);
          }
        } catch {
          /* already stopped */
        }
        lampOff();
        p.resolve();
      }
      // Plays text as Morse (audio + lamp). Resolves when finished or stopped.
      function play(text, wpm = CHAR_WPM, eff = wpm) {
        stopPlay();
        syncMute();
        const { segs, total } = timeline(text, wpm, eff);
        return new Promise((resolve) => {
          const p = { timers: [], resolve };
          playing = p;
          const lead = 40;
          const a = audio();
          if (a) {
            try {
              const osc = a.createOscillator();
              const g = a.createGain();
              osc.type = 'sine';
              osc.frequency.value = TONE;
              const t0 = a.currentTime + lead / 1000;
              g.gain.setValueAtTime(0, a.currentTime);
              segs.forEach(([s, d]) => {
                const st = t0 + s / 1000;
                const en = t0 + (s + d) / 1000;
                g.gain.setValueAtTime(0, st);
                g.gain.linearRampToValueAtTime(VOL, st + RAMP);
                g.gain.setValueAtTime(VOL, en - RAMP);
                g.gain.linearRampToValueAtTime(0, en);
              });
              osc.connect(g).connect(a.destination);
              osc.start(a.currentTime);
              osc.stop(t0 + total / 1000 + 0.05);
              p.osc = osc;
              p.gain = g;
            } catch {
              /* audio unavailable: lamp only */
            }
          }
          segs.forEach(([s, d]) => {
            p.timers.push(later(lampOn, lead + s));
            p.timers.push(later(lampOff, lead + s + d));
          });
          p.timers.push(
            later(() => {
              if (playing !== p) return;
              playing = null;
              lampOff();
              resolve();
            }, lead + total + 30),
          );
        });
      }

      // Sidetone for the telegraph key.
      let side = null;
      function sideTo(v) {
        const a = v > 0 ? audio() : ac;
        if (!a) return;
        try {
          if (!side) {
            if (v === 0) return;
            const osc = a.createOscillator();
            const g = a.createGain();
            osc.type = 'sine';
            osc.frequency.value = TONE;
            g.gain.value = 0;
            osc.connect(g).connect(a.destination);
            osc.start();
            side = { osc, g };
          }
          const now = a.currentTime;
          side.g.gain.cancelScheduledValues(now);
          side.g.gain.setValueAtTime(side.g.gain.value, now);
          side.g.gain.linearRampToValueAtTime(v, now + RAMP);
        } catch {
          /* audio unavailable */
        }
      }
      function sideStop() {
        if (!side) return;
        try {
          side.osc.stop();
        } catch {
          /* already stopped */
        }
        side = null;
      }

      // ---------- input routing ----------
      let onLetter = null; // (ch, btnEl) during rounds 1 and 3
      let onBack = null;
      let onEnter = null;
      let onSpace = null; // round 1: replay
      let keyDown = null; // round 2 telegraph
      let keyUp = null;

      function keypad(letterList, { back = false, newestCh = null } = {}) {
        const n = letterList.length + (back ? 1 : 0);
        const cols = n <= 4 ? Math.max(2, n) : n <= 12 ? 4 : n <= 20 ? 5 : 6;
        const pad = BG.el(`<div class="g-morse-pad" role="group" aria-label="Letters" style="--cols:${cols}"></div>`);
        letterList.forEach((c) => {
          const b = BG.el(`<button class="g-morse-k${c === newestCh ? ' is-new' : ''}${n <= 4 ? ' g-morse-k--big' : ''}" data-ch="${BG.esc(c)}" aria-label="${BG.esc(keyLabel(c))}"></button>`);
          b.textContent = c;
          pad.appendChild(b);
        });
        if (back) pad.appendChild(BG.el('<button class="g-morse-k g-morse-k--back" data-back="1" aria-label="Delete">⌫</button>'));
        pad.addEventListener('click', (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          audio(); // user gesture: wake audio
          if (b.dataset.back) {
            if (onBack) onBack();
          } else if (onLetter) onLetter(b.dataset.ch, b);
        });
        return pad;
      }
      const padBtn = (pad, c) => [...pad.querySelectorAll('[data-ch]')].find((b) => b.dataset.ch === c);

      function onKeyDown(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || !root.isConnected) return;
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key === ' ' || e.code === 'Space') {
          if (keyDown) {
            e.preventDefault();
            if (!e.repeat) keyDown();
          } else if (onSpace) {
            e.preventDefault();
            onSpace();
          }
          return;
        }
        if (e.key === 'Backspace' && onBack) {
          e.preventDefault();
          onBack();
          return;
        }
        if (e.key === 'Enter' && onEnter) {
          e.preventDefault();
          onEnter();
          return;
        }
        if (e.key && e.key.length === 1 && onLetter) {
          const c = e.key.toUpperCase();
          const pad = body.querySelector('.g-morse-pad');
          const b = pad && padBtn(pad, c);
          if (b) {
            e.preventDefault();
            audio();
            onLetter(c, b);
          }
        }
      }
      function onKeyUp(e) {
        if ((e.key === ' ' || e.code === 'Space') && keyUp) {
          e.preventDefault();
          keyUp();
        }
      }
      const onBlur = () => keyUp && keyUp();
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);

      ctx.onDestroy(() => {
        stopPlay();
        sideStop();
        timers.forEach(clearTimeout);
        timers.clear();
        clearInterval(pollIv);
        if (r2timer) r2timer.stop();
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        if (ac) {
          try {
            ac.close();
          } catch {
            /* ignore */
          }
          ac = null;
        }
      });

      function clearInput() {
        onLetter = onBack = onEnter = onSpace = keyDown = keyUp = null;
      }

      // ---------- reveal a newly unlocked letter ----------
      function reveal(c, { mid = false } = {}) {
        return new Promise((resolve) => {
          const card = BG.el(`
            <div class="card g-morse-reveal">
              <span class="label">${mid ? '90% so far! Koch says: level up' : 'Unlocked'}</span>
              <div class="g-morse-reveal-title">🔓 New letter: <b></b></div>
              <div class="g-morse-reveal-big"></div>
              <div class="g-morse-reveal-pat">${patHTML(patternOf(c), 'g-morse-p--lg g-morse-p--stagger')}</div>
              <p class="g-morse-reveal-say muted"></p>
              <div class="g-morse-reveal-btns">
                <button class="btn btn--ghost btn--sm g-morse-hear">🔊 Hear it</button>
                <button class="btn btn--primary g-morse-go">${mid ? 'Keep going →' : 'Nice →'}</button>
              </div>
            </div>`);
          card.querySelector('.g-morse-reveal-title b').textContent = c;
          card.querySelector('.g-morse-reveal-big').textContent = c;
          card.querySelector('.g-morse-reveal-say').textContent = `${patText(patternOf(c))}  · listen for the rhythm, not the count.`;
          body.innerHTML = '';
          body.appendChild(card);
          showGlyph(c, patternOf(c), 'new');
          BG.fx.sound('win');
          BG.fx.haptic(30);
          BG.fx.confetti(80);
          const hear = () => play(c, CHAR_WPM, CHAR_WPM);
          let done = false;
          later(async () => {
            if (done) return;
            await play(c);
            await wait(350);
            if (!done) hear();
          }, 700);
          card.querySelector('.g-morse-hear').addEventListener('click', () => {
            audio();
            hear();
          });
          const go = card.querySelector('.g-morse-go');
          const finish = () => {
            if (done) return;
            done = true;
            stopPlay();
            onEnter = null;
            BG.fx.sound('tap');
            resolve();
          };
          go.addEventListener('click', finish);
          onEnter = finish;
          go.focus({ preventScroll: true });
        });
      }

      // ---------- intro ----------
      function intro() {
        phase = 'intro';
        clearInput();
        roundEl.textContent = `Session ${session} · ${level}/${KOCH.length} letters`;
        countEl.textContent = '📡';
        showGlyph('', '');
        say(firstTime ? 'Welcome, operator. Two letters to start.' : 'Your letters, at full speed. Hear the rhythm.');
        const show = fresh.length ? fresh : [newest()];
        const sos = ['S', 'O'].map((c) => `${c}${KOCH.indexOf(c) < level ? ' ✓' : ' 🔒'}`).join(' · ');
        const sosDone = KOCH.indexOf('S') < level && KOCH.indexOf('O') < level;
        const card = BG.el(`
          <div class="g-morse-intro">
            <div class="label">${fresh.length ? (firstTime ? 'Meet your first letters' : 'New since last time') : 'Newest letter'}</div>
            <div class="g-morse-meet">
              ${show
                .map(
                  (c) => `<button class="card g-morse-meetcard" data-ch="${BG.esc(c)}" aria-label="Hear ${BG.esc(keyLabel(c))}">
                    <span class="g-morse-meetch"></span>${patHTML(patternOf(c), 'g-morse-p--lg')}<span class="g-morse-meethear">▶ hear</span></button>`,
                )
                .join('')}
            </div>
            <div class="g-morse-known">
              <span class="label">You know</span>
              <div class="g-morse-knownrow">${known().map((c) => `<span class="g-morse-kchip${fresh.includes(c) ? ' is-new' : ''}">${BG.esc(c)}</span>`).join('')}</div>
            </div>
            <div class="g-morse-goal chip ${sosDone ? 'chip--ok' : 'chip--warn'}">🆘 Goal SOS: ${sosDone ? 'you can send it!' : sos}</div>
            <button class="btn btn--primary btn--block g-morse-start">Start listening ▶</button>
          </div>`);
        card.querySelectorAll('.g-morse-meetch').forEach((el, i) => (el.textContent = show[i]));
        body.innerHTML = '';
        body.appendChild(card);
        card.querySelector('.g-morse-meet').addEventListener('click', (e) => {
          const b = e.target.closest('[data-ch]');
          if (!b) return;
          audio();
          showGlyph(b.dataset.ch, patternOf(b.dataset.ch));
          BG.fx.pop(b);
          play(b.dataset.ch);
        });
        const start = card.querySelector('.g-morse-start');
        const go = () => {
          if (phase !== 'intro') return;
          audio();
          BG.fx.sound('tap');
          stopPlay();
          round1();
        };
        start.addEventListener('click', go);
        onEnter = go;
        start.focus({ preventScroll: true });
      }

      // ---------- Round 1: Hear it ----------
      async function round1() {
        phase = 'r1';
        clearInput();
        ctx.setProgress(1, 3);
        roundEl.textContent = 'Round 1 · Hear it';
        say('Listen… then tap the letter. Space = play again.');
        let pad = null;
        const renderPad = () => {
          body.innerHTML = '';
          pad = keypad(known(), { newestCh: newest() });
          body.appendChild(pad);
          const again = BG.el('<button class="btn btn--ghost btn--sm g-morse-again">🔁 Play again</button>');
          body.appendChild(again);
          again.addEventListener('click', () => onSpace && onSpace());
        };
        renderPad();

        const requeue = []; // [{ch, due}]
        const recent = [];
        let forceNext = null;
        function nextItem(i) {
          if (forceNext) {
            const c = forceNext;
            forceNext = null;
            return c;
          }
          const dueIdx = requeue.findIndex((r) => r.due <= i);
          if (dueIdx >= 0) return requeue.splice(dueIdx, 1)[0].ch;
          const ks = known();
          const ws = ks.map((c) => {
            let w = letterWeight(letters[c], session, c === newest());
            if (recent.length >= 2 && recent[recent.length - 1] === c && recent[recent.length - 2] === c) w = 0;
            return w;
          });
          return pickWeighted(ks, ws, ctx.rand);
        }

        for (let i = 0; i < R1_ITEMS; i++) {
          countEl.textContent = `${i + 1}/${R1_ITEMS}`;
          const ch = nextItem(i);
          recent.push(ch);
          showGlyph('?', '', 'wait');
          await wait(i === 0 ? 500 : 300);
          if (!ctx.alive) return;

          let answer = null;
          const got = new Promise((r) => (answer = r));
          onLetter = (c, btn) => answer({ c, btn });
          onSpace = () => play(ch);
          play(ch);
          const { c, btn } = await got;
          if (!ctx.alive) return;
          onLetter = null;
          onSpace = null;
          stopPlay();

          const ok = c === ch;
          const st = letters[ch] || (letters[ch] = { a: 0.5, n: 0, last: session });
          st.a = updateAcc(st.a, ok);
          st.n += 1;
          st.last = session;
          saveLetters();
          stats.r1++;
          if (ok) {
            stats.r1ok++;
            streak++;
            stats.best = Math.max(stats.best, streak);
            setStreak();
            const bonus = streak >= 5 ? 3 : 0;
            btn.classList.add('is-right');
            showGlyph(ch, patternOf(ch), 'ok');
            BG.fx.sound('good');
            BG.fx.haptic(10);
            ctx.addScore(10 + bonus, btn);
            if (streak === 5 || streak === 10 || streak === 20) say(`🔥 ${streak} in a row! Combo +3 each`, 'good');
            else say(ok && i % 4 === 0 ? 'Yes! Hear the shape, not the count.' : '');
            await wait(600);
            if (!ctx.alive) return;
            btn.classList.remove('is-right');
          } else {
            streak = 0;
            setStreak();
            btn.classList.add('is-wrong');
            BG.fx.shake(btn);
            const right = padBtn(pad, ch);
            if (right) right.classList.add('is-answer');
            showGlyph(ch, patternOf(ch), 'bad');
            BG.fx.sound('bad');
            BG.fx.haptic(30);
            say(`That was ${ch}  ${patText(patternOf(ch))}. Again, slowly…`, 'bad');
            requeue.push({ ch, due: i + 3 });
            await wait(500);
            if (!ctx.alive) return;
            await play(ch, SLOW_WPM);
            if (!ctx.alive) return;
            await wait(500);
            if (!ctx.alive) return;
            btn.classList.remove('is-wrong');
            if (right) right.classList.remove('is-answer');
            say('');
          }

          // Koch checkpoint: 90%+ on the first 12 unlocks a letter right now.
          if (i === CHECKPOINT - 1 && stats.r1ok / stats.r1 >= UNLOCK_AT && level < KOCH.length) {
            const c2 = unlock();
            if (c2) {
              onLetter = null;
              await reveal(c2, { mid: true });
              if (!ctx.alive) return;
              renderPad();
              const nb = padBtn(pad, c2);
              if (nb) BG.fx.pop(nb);
              forceNext = c2;
              say(`${c2} is in the mix now. It will come up often.`, 'good');
            }
          }
        }
        clearInput();
        await wait(300);
        if (!ctx.alive) return;
        round2();
      }

      // ---------- Round 2: Send it ----------
      function round2() {
        phase = 'r2';
        clearInput();
        ctx.setProgress(2, 3);
        roundEl.textContent = 'Round 2 · Send it';
        countEl.textContent = '0 sent';
        streakEl.hidden = true;
        showGlyph('', '');
        say('Key the word. Tap = dit · hold = dah · pause = next letter.');
        body.innerHTML = '';
        const ui = BG.el(`
          <div class="g-morse-send">
            <div class="g-morse-word" aria-live="polite"></div>
            <div class="g-morse-decoder">
              <span class="label">Decoder</span>
              <span class="g-morse-live"></span>
              <span class="g-morse-sent" aria-label="What you sent"></span>
            </div>
            <div class="g-morse-timerbox"><span class="muted g-morse-timerhint">⏱ 30s starts on your first tap</span></div>
            <button class="g-morse-key" aria-label="Telegraph key. Tap for dit, hold for dah. Space bar works too.">
              <span class="g-morse-keycap">KEY</span>
              <span class="g-morse-keyhint">tap · &nbsp; hold –</span>
            </button>
            <button class="btn btn--primary btn--block g-morse-next2" hidden>Bonus round →</button>
          </div>`);
        body.appendChild(ui);
        const wordEl = ui.querySelector('.g-morse-word');
        const liveEl = ui.querySelector('.g-morse-live');
        const sentEl = ui.querySelector('.g-morse-sent');
        const timerBox = ui.querySelector('.g-morse-timerbox');
        const keyBtn = ui.querySelector('.g-morse-key');
        const nextBtn = ui.querySelector('.g-morse-next2');

        const keyer = createKeyer();
        let word = '';
        let idx = 0;
        let active = true;
        let timer = null;
        let dahTimer = null;
        let lastWord = '';
        let sentLog = [];

        function newWord() {
          const len = level <= 3 ? [2, 3] : [2, 4];
          const w = makeWord(known(), len[0], len[1], ctx.rand, lastWord, newest()).word;
          lastWord = w;
          word = w;
          idx = 0;
          wordEl.innerHTML = [...w]
            .map((c, i) => `<span class="g-morse-wl${i === 0 ? ' is-cur' : ''}" data-i="${i}"><b></b><span class="g-morse-wh"></span></span>`)
            .join('');
          wordEl.querySelectorAll('.g-morse-wl b').forEach((b, i) => (b.textContent = w[i]));
          BG.fx.anim(wordEl, 'g-morse-in');
        }
        function renderLive() {
          liveEl.innerHTML = keyer.pattern ? patHTML(keyer.pattern) : '';
        }
        function renderSent() {
          sentEl.innerHTML = sentLog
            .slice(-10)
            .map((s) => `<span class="${s.ok ? 'is-ok' : 'is-bad'}">${BG.esc(s.c)}</span>`)
            .join('');
        }

        function handleChar(p) {
          if (!p) return;
          renderLive();
          const c = decodePattern(p);
          const want = word[idx];
          const span = wordEl.querySelector(`[data-i="${idx}"]`);
          sentLog.push({ c: c || '?', ok: c === want });
          renderSent();
          if (c === want) {
            stats.sent++;
            countEl.textContent = `${stats.sent} sent`;
            span.classList.remove('is-cur', 'is-hint');
            span.classList.add('is-ok');
            BG.fx.pop(span);
            BG.fx.sound('pick');
            ctx.addScore(15, span);
            idx++;
            if (idx >= word.length) {
              BG.fx.sound('good');
              BG.fx.haptic(20);
              say(word === 'SOS' ? '🆘 You just sent SOS!' : `“${word}” sent! 📡`, 'good');
              later(() => active && newWord(), 450);
            } else {
              wordEl.querySelector(`[data-i="${idx}"]`).classList.add('is-cur');
              say('');
            }
          } else {
            BG.fx.shake(span);
            BG.fx.sound('bad');
            BG.fx.haptic(25);
            span.classList.add('is-hint');
            span.querySelector('.g-morse-wh').innerHTML = patHTML(patternOf(want), 'g-morse-p--sm');
            say(`You sent ${c ? c : 'no letter'} ${patText(p)}. ${want} is ${patText(patternOf(want))}`, 'bad');
          }
        }

        keyDown = () => {
          if (!active) return;
          const t = performance.now();
          if (!keyer.down(t)) return;
          if (!timer) {
            const hint = timerBox.querySelector('.g-morse-timerhint');
            if (hint) hint.remove();
            timer = r2timer = BG.timerBar(timerBox, R2_SECONDS);
            timer.done.then(() => {
              if (ctx.alive && phase === 'r2') endRound();
            });
          }
          keyBtn.classList.add('is-down');
          lampOn();
          sideTo(VOL);
          clearTimeout(dahTimer);
          timers.delete(dahTimer);
          dahTimer = later(() => keyer.holding && keyBtn.classList.add('is-dah'), DIT_MAX);
        };
        keyUp = () => {
          if (!keyer.holding) return;
          const s = keyer.up(performance.now());
          keyBtn.classList.remove('is-down', 'is-dah');
          lampOff();
          sideTo(0);
          if (s) renderLive();
        };

        keyBtn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          audio();
          try {
            keyBtn.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          if (keyDown) keyDown();
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => keyBtn.addEventListener(ev, () => keyUp && keyUp()));
        keyBtn.addEventListener('contextmenu', (e) => e.preventDefault());
        keyBtn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') e.preventDefault();
        });

        pollIv = setInterval(() => {
          if (!ctx.alive || !active) return;
          const p = keyer.poll(performance.now());
          if (p) handleChar(p);
        }, 30);

        function endRound() {
          if (!active) return;
          if (keyer.holding) keyUp();
          const left = keyer.flush();
          if (left) handleChar(left);
          active = false;
          clearInterval(pollIv);
          pollIv = null;
          if (timer) timer.stop();
          sideTo(0);
          later(sideStop, 50);
          keyBtn.disabled = true;
          keyBtn.classList.add('is-off');
          clearInput();
          BG.fx.sound('pop');
          say(stats.sent ? `⏱ Time! You keyed ${stats.sent} letter${stats.sent > 1 ? 's' : ''} correctly.` : '⏱ Time! Sending takes practice: it gets easier fast.', stats.sent ? 'good' : '');
          nextBtn.hidden = false;
          BG.fx.pop(nextBtn);
          nextBtn.focus({ preventScroll: true });
          const go = () => {
            if (phase !== 'r2') return;
            BG.fx.sound('tap');
            round3();
          };
          nextBtn.addEventListener('click', go);
          onEnter = go;
        }

        newWord();
      }

      // ---------- Round 3: Decode ----------
      async function round3() {
        phase = 'r3';
        clearInput();
        ctx.setProgress(3, 3);
        roundEl.textContent = 'Bonus · Decode';
        countEl.textContent = '+40';
        showGlyph('🎧', '');
        const { word, real } = makeWord(known(), 3, 5, ctx.rand, '', newest());
        const eff = effWpm(level);
        say(`A ${word.length}-letter ${real ? 'word' : 'code group'} plays once at full speed. Type it.`);
        body.innerHTML = '';
        const ui = BG.el(`
          <div class="g-morse-decode">
            <div class="g-morse-slots">${[...word].map(() => '<span class="g-morse-slot"></span>').join('')}</div>
            <button class="btn btn--ghost btn--sm g-morse-replay" disabled>🔁 Replay −5</button>
          </div>`);
        body.appendChild(ui);
        const slots = [...ui.querySelectorAll('.g-morse-slot')];
        const replay = ui.querySelector('.g-morse-replay');
        const pad = keypad(known(), { back: true });
        ui.appendChild(pad);
        let typed = '';
        let checked = false;
        let replays = 0;

        const render = () => slots.forEach((s, i) => {
          s.textContent = typed[i] || '';
          s.classList.toggle('is-cur', i === typed.length);
        });
        render();

        async function playWord() {
          replay.disabled = true;
          showGlyph('🎧', '');
          await play(word, CHAR_WPM, eff);
          if (!ctx.alive || checked) return;
          replay.disabled = false;
        }
        replay.addEventListener('click', () => {
          if (checked || playing) return;
          replays++;
          ctx.addScore(-5, replay);
          BG.fx.sound('tap');
          playWord();
        });

        onLetter = (c, btn) => {
          if (checked || typed.length >= word.length) return;
          typed += c;
          BG.fx.sound('tap');
          BG.fx.pop(btn);
          render();
          if (typed.length === word.length) check();
        };
        onBack = () => {
          if (checked || !typed) return;
          typed = typed.slice(0, -1);
          render();
        };

        async function check() {
          checked = true;
          stopPlay();
          replay.disabled = true;
          onLetter = onBack = null;
          const exact = typed === word;
          slots.forEach((s, i) => {
            s.classList.remove('is-cur');
            s.classList.add(typed[i] === word[i] ? 'is-ok' : 'is-bad');
          });
          if (exact) {
            stats.decoded = true;
            showGlyph(word, '', 'ok');
            BG.fx.sound('win');
            BG.fx.confetti(90);
            ctx.addScore(40, ui.querySelector('.g-morse-slots'));
            say(replays ? 'Decoded! 🎧' : 'Decoded on one listen! 🎧', 'good');
          } else {
            showGlyph(word, '', 'bad');
            BG.fx.sound('lose');
            BG.fx.shake(ui.querySelector('.g-morse-slots'));
            say(`It was “${word}”.`, 'bad');
          }
          pad.remove();
          const key = BG.el(`<div class="card g-morse-answer">${[...word]
            .map((c, i) => `<span class="g-morse-arow${typed[i] === c ? '' : ' is-miss'}"><b></b>${patHTML(patternOf(c), 'g-morse-p--sm')}</span>`)
            .join('')}</div>`);
          key.querySelectorAll('.g-morse-arow b').forEach((b, i) => (b.textContent = word[i]));
          ui.appendChild(key);
          await wait(700);
          if (!ctx.alive) return;
          if (!exact) await play(word, CHAR_WPM, eff);
          if (!ctx.alive) return;
          const btn = BG.el('<button class="btn btn--primary btn--block g-morse-next3">See my progress →</button>');
          ui.appendChild(btn);
          BG.fx.pop(btn);
          btn.focus({ preventScroll: true });
          const go = () => {
            if (phase !== 'r3') return;
            BG.fx.sound('tap');
            recap();
          };
          btn.addEventListener('click', go);
          onEnter = go;
        }

        await wait(700);
        if (!ctx.alive) return;
        playWord();
      }

      // ---------- recap ----------
      async function recap() {
        phase = 'recap';
        clearInput();
        stopPlay();
        const acc = stats.r1 ? stats.r1ok / stats.r1 : 0;
        const pct = Math.round(acc * 100);
        // Koch rule: a session at 90%+ unlocks the next letter.
        let endUnlock = null;
        if (acc >= UNLOCK_AT && stats.r1 >= R1_ITEMS) endUnlock = unlock();
        ctx.store.set('level', level);
        ctx.store.set('session', session);
        ctx.store.set('fresh', unlockedNow.slice());
        const hist = ctx.store.get('history', []) || [];
        hist.push({ day: ctx.day, acc: pct, level });
        ctx.store.set('history', hist.slice(-60));
        saveLetters();

        roundEl.textContent = 'Session complete';
        countEl.textContent = `${pct}%`;
        streakEl.hidden = true;
        showGlyph('', '');
        const R = 44;
        const C = 2 * Math.PI * R;
        const frac = (level - (endUnlock ? 1 : 0)) / KOCH.length;
        const ui = BG.el(`
          <div class="g-morse-recap">
            <div class="g-morse-ringwrap">
              <svg class="g-morse-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle class="g-morse-ring-bg" cx="50" cy="50" r="${R}"></circle>
                <circle class="g-morse-ring-fg" cx="50" cy="50" r="${R}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}"></circle>
              </svg>
              <div class="g-morse-ringnum"><b class="big-num">${level - (endUnlock ? 1 : 0)}</b><small>/${KOCH.length}</small><span class="label">letters</span></div>
            </div>
            <div class="g-morse-recapstats">
              <span class="chip ${acc >= UNLOCK_AT ? 'chip--ok' : 'chip--warn'}">🎯 ${pct}% by ear</span>
              <span class="chip chip--blue">📡 ${stats.sent} keyed</span>
              <span class="chip ${stats.decoded ? 'chip--ok' : 'chip--warn'}">🎧 ${stats.decoded ? 'decoded' : 'missed'}</span>
            </div>
            <div class="g-morse-endslot"></div>
            <p class="g-morse-tip muted"></p>
            <button class="btn btn--primary btn--block g-morse-fin">See results</button>
          </div>`);
        body.innerHTML = '';
        body.appendChild(ui);
        const fg = ui.querySelector('.g-morse-ring-fg');
        later(() => (fg.style.strokeDashoffset = (C * (1 - frac)).toFixed(2)), 60);
        const tip = ui.querySelector('.g-morse-tip');
        const weak = known()
          .filter((c) => letters[c] && letters[c].n >= 3)
          .sort((a, b) => letters[a].a - letters[b].a)[0];
        if (level >= KOCH.length) tip.textContent = 'All 40 characters! You are a radio operator now.';
        else if (endUnlock) tip.textContent = `Tomorrow ${endUnlock} joins the mix. Short daily sessions beat one long cram.`;
        else tip.textContent = `${Math.round(UNLOCK_AT * 100)}% unlocks the next letter.${weak ? ` Trickiest today: ${weak} ${patText(patternOf(weak))}.` : ''} Come back tomorrow: spacing works.`;

        if (endUnlock) {
          await wait(500);
          if (!ctx.alive) return;
          const slot = ui.querySelector('.g-morse-endslot');
          slot.innerHTML = `
            <div class="card g-morse-reveal g-morse-reveal--end">
              <div class="g-morse-reveal-title">🔓 New letter: <b></b></div>
              <div class="g-morse-reveal-big"></div>
              <div class="g-morse-reveal-pat">${patHTML(patternOf(endUnlock), 'g-morse-p--lg g-morse-p--stagger')}</div>
            </div>`;
          slot.querySelector('.g-morse-reveal-title b').textContent = endUnlock;
          slot.querySelector('.g-morse-reveal-big').textContent = endUnlock;
          const num = ui.querySelector('.g-morse-ringnum b');
          num.textContent = level;
          BG.fx.pop(num);
          fg.style.strokeDashoffset = (C * (1 - level / KOCH.length)).toFixed(2);
          BG.fx.sound('win');
          BG.fx.confetti(100);
          showGlyph(endUnlock, patternOf(endUnlock), 'new');
          later(() => play(endUnlock), 600);
        }

        const fin = ui.querySelector('.g-morse-fin');
        const go = () => {
          if (finished) return;
          finished = true;
          clearInput();
          stopPlay();
          const learned = unlockedNow.length ? `Learned ${unlockedNow.join(' & ')}! ` : '';
          ctx.finish({
            summary: `${learned}${level} letters at ${pct}% 📡`,
            stats: { letters: level, acc: pct, unlocked: unlockedNow.join(''), sent: stats.sent, decoded: stats.decoded, best: stats.best },
          });
        };
        fin.addEventListener('click', go);
        onEnter = go;
        fin.focus({ preventScroll: true });
      }

      intro();
    },
  });
})();

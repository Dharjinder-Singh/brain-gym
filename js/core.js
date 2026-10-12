// Brain Gym core: utilities, effects, confidence bets, game registry.
// Loaded before any game module. Exposes window.BG.
(() => {
  'use strict';

  const BG = (window.BG = window.BG || {});
  const NS = 'braingym:';
  // Workout #1 is 12 Oct 2026 (local date).
  const EPOCH = Date.UTC(2026, 9, 12);

  // ---------- Randomness ----------
  BG.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  BG.hash = function (str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  };

  BG.shuffle = function (arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  BG.pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
  BG.randInt = (min, max, rand) => min + Math.floor(rand() * (max - min + 1));

  // ---------- Days ----------
  BG.today = function () {
    const d = new Date();
    const local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.max(1, Math.floor((local - EPOCH) / 86400000) + 1);
  };

  BG.dateOf = (n) => new Date(EPOCH + (n - 1) * 86400000);

  // ---------- Storage (never throws) ----------
  BG.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(NS + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(NS + key, JSON.stringify(value));
      } catch {
        /* storage unavailable: play continues for this session */
      }
    },
  };

  // ---------- DOM helpers ----------
  BG.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  BG.el = function (html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  BG.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  BG.track = function (event, props) {
    try {
      if (window.posthog && typeof window.posthog.capture === 'function') window.posthog.capture(event, props);
    } catch {
      /* analytics must never break the game */
    }
  };

  // ---------- Effects ----------
  const fx = (BG.fx = {});

  fx.toast = (() => {
    let timer = null;
    return function (msg) {
      let el = document.getElementById('bg-toast');
      if (!el) {
        el = BG.el('<div id="bg-toast" class="toast" role="status" aria-live="polite"></div>');
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), 2200);
    };
  })();

  // Rising "+25" style label anchored to an element. kind: 'good' | 'bad' | 'info'
  fx.float = function (anchor, text, kind = 'good') {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const el = BG.el(`<span class="float-text float-text--${kind}"></span>`);
    el.textContent = text;
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top + Math.min(r.height / 2, 30)}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  };

  fx.anim = function (el, name) {
    if (!el) return;
    el.classList.remove(name);
    void el.offsetWidth;
    el.classList.add(name);
    el.addEventListener('animationend', () => el.classList.remove(name), { once: true });
  };
  fx.shake = (el) => fx.anim(el, 'fx-shake');
  fx.pop = (el) => fx.anim(el, 'fx-pop');

  fx.haptic = (ms = 12) => {
    try {
      if (navigator.vibrate && !BG.store.get('muted', false)) navigator.vibrate(ms);
    } catch {
      /* not supported */
    }
  };

  fx.confetti = function (amount = 140) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const colors = ['#c8102e', '#ffb703', '#1f9d55', '#3a86ff', '#ff6b9a', '#8338ec'];
    const parts = Array.from({ length: amount }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      s: 5 + Math.random() * 6,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const start = performance.now();
    (function frame(now) {
      const t = now - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.38;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 1800);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
        ctx.restore();
      });
      if (t < 1800) requestAnimationFrame(frame);
      else canvas.remove();
    })(start);
  };

  // Tiny synth so there are no audio files to load.
  let audio = null;
  const SOUNDS = {
    tap: [[660, 0.04, 'triangle', 0.08]],
    pick: [[520, 0.05, 'triangle', 0.1], [780, 0.06, 'triangle', 0.08, 0.04]],
    good: [[660, 0.08, 'sine', 0.14], [990, 0.12, 'sine', 0.12, 0.07]],
    bad: [[220, 0.14, 'sawtooth', 0.07], [165, 0.18, 'sawtooth', 0.06, 0.1]],
    tick: [[1200, 0.02, 'square', 0.03]],
    pop: [[880, 0.05, 'sine', 0.12]],
    honk: [[392, 0.12, 'square', 0.06], [494, 0.12, 'square', 0.05], [392, 0.16, 'square', 0.06, 0.16], [494, 0.16, 'square', 0.05, 0.16]],
    win: [[523, 0.1, 'sine', 0.14], [659, 0.1, 'sine', 0.14, 0.1], [784, 0.1, 'sine', 0.14, 0.2], [1047, 0.28, 'sine', 0.14, 0.3]],
    lose: [[392, 0.16, 'sine', 0.12], [330, 0.16, 'sine', 0.12, 0.16], [262, 0.3, 'sine', 0.12, 0.32]],
  };
  fx.sound = function (name) {
    if (BG.store.get('muted', false)) return;
    const notes = SOUNDS[name];
    if (!notes) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const now = audio.currentTime;
      notes.forEach(([freq, dur, type, vol, delay = 0]) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(vol, now + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
        osc.connect(gain).connect(audio.destination);
        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.02);
      });
    } catch {
      /* audio unavailable */
    }
  };

  // ---------- Confidence bets ----------
  // Payoffs make honest betting optimal: "likely" beats "guess" once you're >50% sure,
  // "sure" beats "likely" once you're >75% sure.
  const BETS = {
    guess: { key: 'guess', label: 'Just a guess', pct: 50, win: 10, lose: 0, emoji: '🤷' },
    likely: { key: 'likely', label: 'Pretty sure', pct: 75, win: 25, lose: -15, emoji: '🤔' },
    sure: { key: 'sure', label: 'Certain', pct: 95, win: 40, lose: -60, emoji: '😎' },
  };
  BG.BETS = BETS;

  BG.bet = {
    // Shows a bottom sheet inside `root`; resolves to 'guess' | 'likely' | 'sure'.
    ask(root, question = 'How sure are you?') {
      return new Promise((resolve) => {
        const sheet = BG.el(`
          <div class="bet-sheet" role="dialog" aria-label="${BG.esc(question)}">
            <p class="bet-q">${BG.esc(question)}</p>
            <div class="bet-options">
              ${Object.values(BETS).map((b) => `
                <button class="bet-btn bet-btn--${b.key}" data-bet="${b.key}">
                  <span class="bet-emoji">${b.emoji}</span>
                  <span class="bet-label">${b.label}</span>
                  <span class="bet-odds">+${b.win} / ${b.lose === 0 ? '0' : b.lose}</span>
                </button>`).join('')}
            </div>
          </div>`);
        root.appendChild(sheet);
        fx.sound('pop');
        sheet.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-bet]');
          if (!btn) return;
          fx.sound('pick');
          fx.haptic();
          sheet.classList.add('bet-sheet--out');
          setTimeout(() => sheet.remove(), 180);
          resolve(btn.dataset.bet);
        });
      });
    },

    // Records the outcome, shows feedback, returns the point change.
    settle(key, correct, anchor) {
      const b = BETS[key] || BETS.guess;
      const delta = correct ? b.win : b.lose;
      const calib = BG.store.get('calibration', {});
      const row = calib[key] || { n: 0, right: 0 };
      row.n += 1;
      if (correct) row.right += 1;
      calib[key] = row;
      BG.store.set('calibration', calib);
      if (anchor) {
        const msg = correct
          ? key === 'sure' ? `+${delta} Called it!` : `+${delta}`
          : delta < 0 ? `${delta} Overconfident!` : 'No harm in guessing';
        fx.float(anchor, msg, correct ? 'good' : delta < 0 ? 'bad' : 'info');
      }
      return delta;
    },

    // 0–100: how close each bucket's hit rate is to what you claimed.
    calibrationScore() {
      const calib = BG.store.get('calibration', {});
      let n = 0;
      let err = 0;
      Object.values(BETS).forEach((b) => {
        const row = calib[b.key];
        if (!row || !row.n) return;
        n += row.n;
        err += row.n * Math.abs(row.right / row.n - b.pct / 100);
      });
      return n ? Math.round(100 - (err / n) * 100) : null;
    },
  };

  // ---------- Timers that clean themselves up ----------
  // Renders a draining bar; resolves when time runs out (or never, if stopped).
  BG.timerBar = function (container, seconds, { onTick, warnAt = 5 } = {}) {
    const bar = BG.el('<div class="timer"><div class="timer-fill"></div><span class="timer-label"></span></div>');
    container.appendChild(bar);
    const fill = bar.querySelector('.timer-fill');
    const label = bar.querySelector('.timer-label');
    const start = performance.now();
    let stopped = false;
    let lastSec = null;
    let resolveDone;
    const done = new Promise((r) => (resolveDone = r));
    (function frame(now) {
      if (stopped) return;
      const left = Math.max(0, seconds - (now - start) / 1000);
      fill.style.transform = `scaleX(${left / seconds})`;
      const sec = Math.ceil(left);
      if (sec !== lastSec) {
        lastSec = sec;
        label.textContent = `${sec}s`;
        bar.classList.toggle('timer--warn', sec <= warnAt);
        if (sec <= warnAt && sec > 0) fx.sound('tick');
        if (onTick) onTick(sec);
      }
      if (left <= 0) {
        stopped = true;
        resolveDone();
        return;
      }
      requestAnimationFrame(frame);
    })(start);
    return {
      el: bar,
      done,
      elapsed: () => (performance.now() - start) / 1000,
      stop() {
        stopped = true;
      },
    };
  };

  // ---------- Game registry ----------
  BG.games = {};
  BG.registerGame = function (def) {
    BG.games[def.id] = def;
  };
})();

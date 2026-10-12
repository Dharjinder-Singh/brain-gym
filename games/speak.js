// Mic Drop: speak impromptu for 60s on a topic; six deterministic judges score the talk.
(() => {
  'use strict';

  const PREP_SECONDS = 15;
  const TALK_SECONDS = 60;
  const POINTS_PER_JUDGE_POINT = 8; // 6 judges × 10 × 8 = 480
  const PAUSE_SECONDS = 3; // a silence longer than this is a "long pause"
  const GAP_CAP = 2.5; // max seconds of a gap still counted as speaking time

  // ---------- Pure scoring (deterministic, testable in node) ----------
  const FILLERS = new Set(['um', 'umm', 'uh', 'uhh', 'uhm', 'er', 'erm', 'ah', 'hmm', 'basically', 'actually', 'literally', 'honestly', 'totally', 'anyway']);
  const FILLER_PAIRS = new Set(['you know', 'i mean', 'kind of', 'sort of']);
  // "like" is only a filler when it isn't doing grammatical work after these words.
  const LIKE_OK_BEFORE = new Set([
    'i', 'you', 'we', 'they', 'he', 'she', 'it', 'would', "i'd", "you'd", "we'd", "they'd", 'dont', "don't", "didn't", 'didnt',
    'really', 'also', 'just', 'to', 'not', 'feel', 'feels', 'look', 'looks', 'sound', 'sounds', 'seem', 'seems', 'things',
    'something', 'anything', 'nothing', 'people', 'would', 'much', 'more', 'most', 'exactly', 'what', 'who', 'is', 'was', 'are', 'were', 'be',
  ]);
  const STOPWORDS = new Set('the a an and or but of to in on at for with is are was were be been it this that these those i you he she we they me my your our their its as by from so if then than there here not no do does did have has had will would can could should just very really'.split(' '));

  const SIGNPOSTS = {
    opening: ['i think', 'i believe', 'in my opinion', 'my view', 'let me', 'today i', "i'd argue", 'i would argue', 'the question'],
    sequence: ['first', 'firstly', 'second', 'secondly', 'third', 'next', 'then', 'another', 'finally', 'lastly'],
    reason: ['because', 'since', 'therefore', "that's why", 'that is why', 'which means', 'so that', 'the reason'],
    example: ['for example', 'for instance', 'such as', 'imagine', 'picture this', 'take '],
    contrast: ['however', 'but', 'on the other hand', 'although', 'even though', 'whereas', 'yet'],
    conclusion: ['in conclusion', 'to sum up', 'overall', 'in short', 'ultimately', 'in the end', 'so yes', 'to conclude', 'all in all'],
  };

  function tokenize(text) {
    return (String(text).toLowerCase().replace(/[’‘]/g, "'").match(/[a-z0-9']+/g) || []).filter((w) => w !== "'");
  }

  // Returns indices of filler words (pairs mark both words).
  function findFillers(words) {
    const hits = new Set();
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (FILLERS.has(w)) hits.add(i);
      else if (w === 'like' && (i === 0 || !LIKE_OK_BEFORE.has(words[i - 1]))) hits.add(i);
      if (i + 1 < words.length && FILLER_PAIRS.has(`${w} ${words[i + 1]}`)) {
        hits.add(i);
        hits.add(i + 1);
      }
    }
    // Count each pair once.
    let count = 0;
    for (let i = 0; i < words.length; i++) {
      if (!hits.has(i)) continue;
      count++;
      if (i + 1 < words.length && hits.has(i + 1) && FILLER_PAIRS.has(`${words[i]} ${words[i + 1]}`)) i++;
    }
    return { count, hits };
  }

  // Moving-average type-token ratio: vocabulary variety that doesn't punish longer talks.
  function mattr(words, win = 50) {
    if (words.length === 0) return 0;
    if (words.length <= win) return new Set(words).size / words.length;
    let sum = 0;
    let n = 0;
    for (let i = 0; i + win <= words.length; i++) {
      sum += new Set(words.slice(i, i + win)).size / win;
      n++;
    }
    return sum / n;
  }

  function findSignposts(words) {
    const text = ` ${words.join(' ')} `;
    const found = {};
    Object.entries(SIGNPOSTS).forEach(([cat, list]) => {
      const hit = list.find((p) => text.includes(` ${p.trim()} `) || (p.endsWith(' ') && text.includes(` ${p}`)));
      if (hit) found[cat] = hit.trim();
    });
    return found;
  }

  function findFocus(words, keys) {
    const hit = new Set();
    words.forEach((w) => keys.forEach((k) => { if (w.startsWith(k)) hit.add(k); }));
    return [...hit];
  }

  // Speaking time and long pauses from the times (seconds since start) at which new words appeared.
  function timing(events) {
    const t = events.slice().sort((a, b) => a - b);
    if (!t.length) return { speakSec: 0, pauses: 0 };
    let speak = 0;
    let pauses = t[0] > PAUSE_SECONDS + 2 ? 1 : 0; // slow start (allow 2s to get going)
    for (let i = 1; i < t.length; i++) {
      const gap = t[i] - t[i - 1];
      speak += Math.min(gap, GAP_CAP);
      if (gap > PAUSE_SECONDS) pauses++;
    }
    speak += 0.6; // the last burst of words
    return { speakSec: Math.round(speak * 10) / 10, pauses };
  }

  const clamp10 = (x) => Math.max(0, Math.min(10, Math.round(x * 10) / 10));

  // m: { transcript, events[], keys[], hasText, talkSeconds }
  function scoreTalk(m) {
    const words = tokenize(m.transcript || '');
    const { speakSec, pauses } = timing(m.events || []);
    const judges = [];

    // Always measured against the full minute, so ending early can't earn full stamina.
    const stamina = clamp10((10 * speakSec) / (TALK_SECONDS * 0.8));
    judges.push({ id: 'stamina', name: 'Stamina', emoji: '⏱️', score: stamina, detail: `${Math.round(speakSec)}s of talking` });

    if (m.hasText) {
      const fill = findFillers(words);
      const minutes = Math.max(speakSec, 1) / 60;
      const wpm = words.length >= 15 ? Math.round(words.length / minutes) : 0;
      const pace = words.length < 15 ? 0 : wpm < 120 ? clamp10(10 - (120 - wpm) / 8) : wpm > 170 ? clamp10(10 - (wpm - 170) / 8) : 10;
      judges.push({ id: 'pace', name: 'Pace', emoji: '🐇', score: pace, detail: wpm ? `${wpm} words/min` : 'too few words' });

      const fpm = fill.count / Math.max(minutes, 0.5);
      const flow = words.length < 15 ? 0 : clamp10(10 - 1.2 * fpm - 1.5 * pauses);
      judges.push({ id: 'flow', name: 'Flow', emoji: '🌊', score: flow, detail: `${fill.count} filler${fill.count === 1 ? '' : 's'}, ${pauses} long pause${pauses === 1 ? '' : 's'}` });

      const variety = mattr(words);
      const range = words.length < 15 ? 0 : clamp10((10 * (variety - 0.5)) / (0.78 - 0.5));
      judges.push({ id: 'range', name: 'Range', emoji: '🎨', score: range, detail: `${Math.round(variety * 100)}% fresh words` });

      const posts = findSignposts(words);
      const nPosts = Object.keys(posts).length;
      judges.push({ id: 'structure', name: 'Structure', emoji: '🧱', score: clamp10(nPosts * 2), detail: nPosts ? `${nPosts} signpost type${nPosts === 1 ? '' : 's'}` : 'no signposts', posts });

      const focus = findFocus(words, m.keys || []);
      const focusScore = words.length < 15 ? 0 : [2, 5, 7, 9, 10][Math.min(4, focus.length)];
      judges.push({ id: 'focus', name: 'Focus', emoji: '🎯', score: focusScore, detail: `${focus.length} topic word${focus.length === 1 ? '' : 's'}`, focus });

      if (words.length < 15) judges.forEach((j) => { if (j.id !== 'stamina') j.na = true; });
      return { judges, words, fillers: fill, wpm, speakSec, pauses, total: judges.reduce((s, j) => s + j.score, 0), outOf: 60 };
    }

    // Audio-only mode: we can still judge stamina and pauses.
    const flow = speakSec < 5 ? 0 : clamp10(10 - 1.5 * pauses);
    judges.push({ id: 'flow', name: 'Flow', emoji: '🌊', score: flow, detail: `${pauses} long pause${pauses === 1 ? '' : 's'}` });
    const raw = judges.reduce((s, j) => s + j.score, 0);
    return { judges, words, fillers: { count: 0, hits: new Set() }, wpm: 0, speakSec, pauses, total: (raw / 20) * 60, outOf: 60, audioOnly: true };
  }

  const scoring = { tokenize, findFillers, mattr, findSignposts, findFocus, timing, scoreTalk };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = scoring;
    return;
  }

  // ---------- Game ----------
  const QUIPS = {
    stamina: ['You owned the full minute. 💪', 'Solid. Push a bit longer next time.', 'Brief! Try to fill the whole minute.'],
    pace: ['Perfect speed. Easy to follow.', 'Close. Nudge your speed towards 120–170.', 'Way off the comfortable range.'],
    flow: ['Smooth as butter. 🧈', 'A few stumbles. Totally normal.', 'Lots of "like" and long silences.'],
    range: ['Rich vocabulary! 🎨', 'Decent variety.', 'Lots of repeated words.'],
    structure: ['Built like a TED talk. 🧱', 'Some structure. Add "because" and an example.', 'Try: opinion → reason → example → wrap-up.'],
    focus: ['Laser focus. 🎯', 'Mostly on topic.', 'You drifted away from the topic.'],
  };
  const TIPS = {
    stamina: 'Keep going even when you run out of ideas: give another example, or tell a quick story.',
    pace: 'Aim for a relaxed, conversational speed of around 120–170 words per minute.',
    flow: 'When you feel an "um" or "like" coming, pause silently instead. A short pause sounds confident.',
    range: 'Swap a repeated word for a more precise one. Describe things instead of saying "thing".',
    structure: 'Use a simple frame: "I think… because… for example… however… so overall…".',
    focus: 'Keep coming back to the topic\'s key words so listeners know where you are.',
  };

  function quip(judge) {
    if (judge.na) return 'Not enough words to judge. Speak up and keep going!';
    const q = QUIPS[judge.id];
    return judge.score >= 8 ? q[0] : judge.score >= 5 ? q[1] : q[2];
  }

  function pickLang() {
    const l = (navigator.language || 'en-US').toLowerCase();
    if (l.startsWith('en')) return navigator.language;
    return 'en-US';
  }

  function mount(root, ctx) {
    const topics = window.BG_DATA_SPEAK.topics;
    const order = BG.shuffle(topics, BG.rng(BG.hash('speak-topics')));
    const today = ctx.mode === 'daily' ? order[(ctx.day - 1) % order.length] : BG.pick(topics, ctx.rand);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const coarse = matchMedia('(pointer: coarse)').matches;

    let timers = [];
    let raf = null;
    let stream = null;
    let audioCtx = null;
    let rec = null;
    let recording = false;

    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    function stopEverything() {
      recording = false;
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(raf);
      if (rec) {
        try { rec.onend = null; rec.abort(); } catch { /* already stopped */ }
        rec = null;
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
      if (audioCtx) audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    ctx.onDestroy(stopEverything);
    ctx.setProgress(1, 3);

    // ----- Phase 1: topic reveal + prep -----
    root.innerHTML = `
      <div class="sp-stage">
        <div class="sp-reel" aria-live="polite"><span class="sp-reel-text"></span></div>
        <div class="sp-prep" hidden>
          <p class="label sp-prep-label">Prep time · think of a side, a reason and an example</p>
          <div class="sp-prep-timer"></div>
          <div class="sp-tips">
            <span class="chip chip--blue">1 · Pick a side</span>
            <span class="chip chip--gold">2 · Give a reason</span>
            <span class="chip chip--ok">3 · Add an example</span>
          </div>
          <button class="btn btn--primary btn--block sp-ready">🎤 I'm ready, start talking</button>
          <button class="btn btn--ghost btn--block btn--sm sp-skip">Can't talk right now? Skip today</button>
          <p class="sp-privacy muted">${SR
            ? "Speech-to-text runs on your browser's speech service. In Chrome, your audio is sent to Google to be transcribed. Brain Gym doesn't store or upload your audio or words."
            : "Your browser can't turn speech into text, so we'll judge your talking time and pauses from microphone volume only. Nothing is recorded or uploaded."}</p>
        </div>
      </div>`;

    const reelText = root.querySelector('.sp-reel-text');
    const prep = root.querySelector('.sp-prep');

    (async () => {
      // Slot-machine style reel landing on today's topic.
      const spins = BG.shuffle(topics, BG.rng(ctx.seed ^ 77)).slice(0, 9).map((t) => t.topic);
      for (let i = 0; i < spins.length; i++) {
        if (!ctx.alive) return;
        reelText.textContent = spins[i];
        reelText.classList.remove('sp-reel-tick');
        void reelText.offsetWidth;
        reelText.classList.add('sp-reel-tick');
        BG.fx.sound('tick');
        await BG.sleep(70 + i * 22);
      }
      if (!ctx.alive) return;
      reelText.textContent = today.topic;
      root.querySelector('.sp-reel').classList.add('is-landed');
      BG.fx.sound('pop');
      BG.fx.pop(root.querySelector('.sp-reel'));
      prep.hidden = false;
      const prepTimer = BG.timerBar(root.querySelector('.sp-prep-timer'), PREP_SECONDS, { warnAt: 3 });
      ctx.onDestroy(() => prepTimer.stop());
      const ready = new Promise((res) => root.querySelector('.sp-ready').addEventListener('click', res, { once: true }));
      const skip = new Promise((res) => root.querySelector('.sp-skip').addEventListener('click', () => res('skip'), { once: true }));
      const outcome = await Promise.race([prepTimer.done, ready, skip]);
      prepTimer.stop();
      if (!ctx.alive) return;
      if (outcome === 'skip') {
        ctx.finish({ summary: 'Skipped today 🤐', stats: { skipped: true } });
        return;
      }
      startTalk();
    })();

    // ----- Phase 2: talking -----
    function startTalk() {
      ctx.setProgress(2, 3);
      BG.fx.sound('pick');
      root.innerHTML = `
        <div class="sp-stage">
          <p class="sp-topic-small">${BG.esc(today.topic)}</p>
          <div class="sp-orb-wrap">
            <canvas class="sp-wave" width="600" height="120" aria-hidden="true"></canvas>
            <div class="sp-orb"><span>🎤</span></div>
          </div>
          <div class="sp-talk-timer"></div>
          <div class="sp-live">
            <div><span class="big-num sp-words">0</span><span class="label">words</span></div>
            <div><span class="big-num sp-wpm">–</span><span class="label">words/min</span></div>
            <div><span class="big-num sp-fill">0</span><span class="label">fillers</span></div>
          </div>
          <p class="sp-transcript" aria-live="polite"><span class="muted">${SR ? 'Start talking… your words appear here.' : 'Start talking… (volume only in this browser)'}</span></p>
          <div class="sp-flash" aria-hidden="true"></div>
          <button class="btn btn--dark btn--block sp-drop" disabled>Mic drop 🎤⬇️ (finish)</button>
          <p class="sp-status muted"></p>
        </div>`;

      const elWords = root.querySelector('.sp-words');
      const elWpm = root.querySelector('.sp-wpm');
      const elFill = root.querySelector('.sp-fill');
      const elText = root.querySelector('.sp-transcript');
      const elFlash = root.querySelector('.sp-flash');
      const elStatus = root.querySelector('.sp-status');
      const orb = root.querySelector('.sp-orb');
      const dropBtn = root.querySelector('.sp-drop');
      const canvas = root.querySelector('.sp-wave');

      const events = [];
      let committed = '';
      let sessionFinal = '';
      let interim = '';
      let lastCount = 0;
      let lastFillers = 0;
      let failed = null;
      let talkTimer = null;
      const t0 = performance.now();
      const now = () => (performance.now() - t0) / 1000;
      recording = true;

      later(() => { dropBtn.disabled = false; }, 20000);

      const fullText = () => `${committed} ${sessionFinal} ${interim}`.replace(/\s+/g, ' ').trim();

      function onUpdate() {
        const text = fullText();
        const words = tokenize(text);
        if (words.length > lastCount) {
          for (let k = lastCount; k < words.length; k++) events.push(now());
          lastCount = words.length;
          BG.fx.pop(orb);
        }
        const tm = timing(events);
        elWords.textContent = words.length;
        elWpm.textContent = tm.speakSec >= 6 ? Math.round(words.length / (tm.speakSec / 60)) : '–';
        const fill = findFillers(words);
        elFill.textContent = fill.count;
        if (fill.count > lastFillers) {
          const lastHit = Math.max(...fill.hits);
          elFlash.textContent = `Filler: “${words[lastHit]}”`;
          BG.fx.anim(elFlash, 'sp-flash-show');
          BG.fx.sound('tick');
        }
        lastFillers = fill.count;
        const tail = text.length > 180 ? `…${text.slice(-180)}` : text;
        elText.textContent = tail || '';
      }

      // Speech recognition (when available).
      if (SR) {
        rec = new SR();
        rec.lang = pickLang();
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let fin = '';
          let int = '';
          for (let i = 0; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) fin += `${r[0].transcript} `;
            else int += `${r[0].transcript} `;
          }
          sessionFinal = fin;
          interim = int;
          onUpdate();
        };
        rec.onerror = (e) => {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') failed = 'denied';
          else if (e.error === 'audio-capture') failed = 'nomic';
          else if (e.error === 'network') elStatus.textContent = 'Speech service hiccup… keep talking.';
          if (failed) showFailure(failed);
        };
        rec.onend = () => {
          committed = `${committed} ${sessionFinal}`;
          sessionFinal = '';
          interim = '';
          if (recording && !failed) {
            try { rec.start(); } catch { /* restarts on next end */ }
          }
        };
        try { rec.start(); } catch { showFailure('nomic'); return; }
      }

      // Microphone level: waveform on desktop, and the whole measurement when there is no speech-to-text.
      const wantMeter = !SR || !coarse;
      if (wantMeter && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then((s) => {
          if (!ctx.alive || !recording) { s.getTracks().forEach((t) => t.stop()); return; }
          stream = s;
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const src = audioCtx.createMediaStreamSource(s);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 1024;
          src.connect(analyser);
          const data = new Uint8Array(analyser.fftSize);
          const g = canvas.getContext('2d');
          const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c8102e';
          let noise = 0.01;
          let lastVoice = -1;
          (function frame() {
            if (!recording) return;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const tNow = now();
            if (tNow < 0.6) noise = Math.max(noise, rms);
            const voiced = rms > Math.max(0.025, noise * 2.5);
            orb.style.setProperty('--level', Math.min(1, rms * 6).toFixed(3));
            // Without speech-to-text, voiced frames (≈ every 0.25s) stand in for words.
            if (!SR && voiced && tNow - lastVoice >= 0.25) {
              events.push(tNow);
              lastVoice = tNow;
              elWords.textContent = '🗣️';
            }
            g.clearRect(0, 0, canvas.width, canvas.height);
            g.fillStyle = accent;
            const bars = 48;
            const step = Math.floor(data.length / bars);
            for (let b = 0; b < bars; b++) {
              const v = Math.abs(data[b * step] - 128) / 128;
              const h = Math.max(4, v * canvas.height * 1.8);
              g.globalAlpha = 0.35 + Math.min(0.65, v * 3);
              g.fillRect(b * (canvas.width / bars) + 2, (canvas.height - h) / 2, canvas.width / bars - 4, h);
            }
            raf = requestAnimationFrame(frame);
          })();
        }).catch(() => {
          if (!SR) showFailure('denied');
        });
      } else if (!SR) {
        showFailure('nomic');
      }

      talkTimer = BG.timerBar(root.querySelector('.sp-talk-timer'), TALK_SECONDS, { warnAt: 10 });
      ctx.onDestroy(() => talkTimer.stop());
      const dropped = new Promise((res) => dropBtn.addEventListener('click', res, { once: true }));

      Promise.race([talkTimer.done, dropped]).then(async () => {
        talkTimer.stop();
        if (!ctx.alive || failed) return;
        const talkSeconds = Math.min(TALK_SECONDS, Math.max(1, now()));
        recording = false;
        orb.classList.add('is-done');
        elStatus.textContent = 'The judges are conferring…';
        BG.fx.sound('pop');
        if (rec) {
          // Give the recognizer a moment to finalise the last words.
          await new Promise((res) => {
            const r = rec;
            const doneFn = () => res();
            r.onend = () => {
              committed = `${committed} ${sessionFinal} ${interim}`;
              sessionFinal = '';
              interim = '';
              doneFn();
            };
            try { r.stop(); } catch { doneFn(); }
            later(doneFn, 1800);
          });
        }
        if (!ctx.alive) return;
        stopEverything();
        const result = scoreTalk({
          transcript: `${committed} ${sessionFinal} ${interim}`,
          events,
          keys: today.keys,
          hasText: !!SR,
          talkSeconds,
        });
        showResults(result);
      });

      function showFailure(kind) {
        if (!ctx.alive) return;
        recording = false;
        if (talkTimer) talkTimer.stop();
        stopEverything();
        const msg = kind === 'denied'
          ? "Your microphone is blocked. Allow mic access for this site in your browser settings, then try again."
          : "We couldn't find a microphone on this device.";
        root.innerHTML = `
          <div class="sp-stage sp-fail card">
            <div class="sp-fail-emoji">🙊</div>
            <p>${msg}</p>
            <button class="btn btn--primary btn--block sp-retry">Try again</button>
            <button class="btn btn--ghost btn--block sp-skip2">Skip today</button>
          </div>`;
        root.querySelector('.sp-retry').addEventListener('click', () => { if (ctx.alive) startTalk(); });
        root.querySelector('.sp-skip2').addEventListener('click', () => ctx.finish({ summary: 'Skipped today 🤐', stats: { skipped: true } }));
      }
    }

    // ----- Phase 3: the judges -----
    async function showResults(r) {
      ctx.setProgress(3, 3);
      const scale = r.audioOnly ? 60 / 20 : 1;
      root.innerHTML = `
        <div class="sp-stage">
          <h3 class="sp-judges-title">The judges' scores</h3>
          ${r.audioOnly ? '<p class="muted sp-note">Volume-only mode: only Stamina and Flow could be judged, scaled up to the full total.</p>' : ''}
          <div class="sp-judges">
            ${r.judges.map((j) => `
              <div class="sp-judge" data-id="${j.id}">
                <div class="sp-judge-inner">
                  <div class="sp-judge-back">${j.emoji}</div>
                  <div class="sp-judge-front">
                    <span class="sp-judge-emoji">${j.emoji}</span>
                    <span class="sp-judge-name">${j.name}</span>
                    <span class="sp-judge-score big-num">${j.score % 1 ? j.score.toFixed(1) : j.score}</span>
                    <span class="sp-judge-detail">${BG.esc(j.detail)}</span>
                  </div>
                </div>
              </div>`).join('')}
          </div>
          <div class="sp-quips"></div>
          <div class="sp-total" hidden><span class="label">Total</span><span class="big-num sp-total-num"></span><span class="muted">/ 60</span></div>
          <div class="sp-tip card" hidden></div>
          <details class="sp-said" ${r.words.length ? '' : 'hidden'}>
            <summary>What you said (fillers in red, signposts in green, topic words in blue)</summary>
            <p class="sp-said-text"></p>
          </details>
          <button class="btn btn--primary btn--block sp-done" hidden>See my result →</button>
        </div>`;

      const quips = root.querySelector('.sp-quips');
      for (const j of r.judges) {
        await BG.sleep(450);
        if (!ctx.alive) return;
        const card = root.querySelector(`.sp-judge[data-id="${j.id}"]`);
        card.classList.add('is-flipped', j.score >= 8 ? 'is-high' : j.score >= 5 ? 'is-mid' : 'is-low');
        BG.fx.sound(j.score >= 8 ? 'good' : j.score >= 5 ? 'pick' : 'bad');
        ctx.addScore(Math.round(j.score * scale * POINTS_PER_JUDGE_POINT), card);
        const q = BG.el(`<p class="sp-quip"><strong>${j.emoji} ${j.name}:</strong> ${BG.esc(quip(j))}</p>`);
        quips.appendChild(q);
      }
      await BG.sleep(400);
      if (!ctx.alive) return;

      const total = Math.round(r.total * 10) / 10;
      const totalEl = root.querySelector('.sp-total');
      totalEl.hidden = false;
      root.querySelector('.sp-total-num').textContent = total;
      BG.fx.pop(totalEl);
      if (total >= 48) BG.fx.confetti();

      const weakest = r.judges.slice().sort((a, b) => a.score - b.score)[0];
      const tip = root.querySelector('.sp-tip');
      tip.hidden = false;
      tip.innerHTML = `<span class="label">Coach's tip · ${weakest.emoji} ${weakest.name}</span><p>${BG.esc(TIPS[weakest.id])}</p>`;

      if (r.words.length) {
        const focusKeys = today.keys;
        const postWords = new Set();
        const struct = r.judges.find((j) => j.id === 'structure');
        if (struct && struct.posts) Object.values(struct.posts).forEach((p) => p.split(' ').forEach((w) => postWords.add(w)));
        root.querySelector('.sp-said-text').innerHTML = r.words.map((w, i) => {
          if (r.fillers.hits.has(i)) return `<mark class="sp-m-fill">${BG.esc(w)}</mark>`;
          if (postWords.has(w)) return `<mark class="sp-m-post">${BG.esc(w)}</mark>`;
          if (focusKeys.some((k) => w.startsWith(k))) return `<mark class="sp-m-focus">${BG.esc(w)}</mark>`;
          return BG.esc(w);
        }).join(' ');
      }

      const done = root.querySelector('.sp-done');
      done.hidden = false;
      done.addEventListener('click', () => {
        const summary = r.audioOnly
          ? `Spoke ${Math.round(r.speakSec)}s with ${r.pauses} long pause${r.pauses === 1 ? '' : 's'} 🎤`
          : `${Math.round(r.speakSec)}s at ${r.wpm} wpm · ${r.fillers.count} filler${r.fillers.count === 1 ? '' : 's'} 🎤`;
        ctx.finish({ summary, stats: { total, wpm: r.wpm, fillers: r.fillers.count, pauses: r.pauses } });
      }, { once: true });
    }
  }

  BG.registerGame({
    id: 'speak',
    name: 'Mic Drop',
    emoji: '🎤',
    skill: 'Thinking on your feet',
    tagline: 'One topic. 15 seconds to think. 60 seconds to talk.',
    howTo: [
      'A random topic lands. You get 15 seconds to prepare.',
      'Talk for 60 seconds. Your words appear live.',
      'Six judges score stamina, pace, flow, vocabulary, structure and focus. Same words, same score, every time.',
    ],
    science: 'When an AI drafted for them, people struggled to quote essays they had just "written" (Kosmyna et al. 2025, preprint), and opinionated AI writing tools shifted what people later believed (Jakesch et al. 2023). Speaking off the cuff is putting your own thoughts into your own words, with no assistant.',
    scienceUrl: 'https://arxiv.org/abs/2302.00560',
    minutes: 2,
    maxScore: 480,
    mount,
  });
})();

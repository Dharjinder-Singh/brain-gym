// Scam or Legit? Messages ping onto a phone. Call each one Scam or Legit,
// then (for scams) tap the exact red flag. Fictional brands only (see scam-data.js).
(() => {
  'use strict';

  const PER_SIDE = 4; // 4 scams + 4 legit per game
  const PTS = { verdict: 30, flag: 20, wolf: -10, comboStep: 5, comboMax: 20 };
  const APP = {
    sms: { name: 'Messages', icon: '💬' },
    whatsapp: { name: 'Chats', icon: '🟢' },
    email: { name: 'Mail', icon: '✉️' },
    upi: { name: 'UPI', icon: '₹' },
    call: { name: 'Phone', icon: '📞' },
  };

  // ---------- content selection ----------
  // Daily: one fixed seeded permutation per side; day d takes the next 4 of each,
  // so nothing repeats until the shorter pool has been fully used (48 / 4 = 12 days).
  function chooseMessages(all, ctx) {
    const scams = all.filter((m) => m.scam);
    const legit = all.filter((m) => !m.scam);
    let picked;
    if (ctx.mode === 'daily') {
      const take = (pool, salt) => {
        const perm = BG.shuffle(pool, BG.rng(BG.hash('scam-' + salt + '-v1')));
        const start = ((ctx.day - 1) * PER_SIDE) % perm.length;
        return Array.from({ length: Math.min(PER_SIDE, perm.length) }, (_, k) => perm[(start + k) % perm.length]);
      };
      picked = take(scams, 'scams').concat(take(legit, 'legit'));
    } else {
      picked = BG.shuffle(scams, ctx.rand).slice(0, PER_SIDE).concat(BG.shuffle(legit, ctx.rand).slice(0, PER_SIDE));
    }
    return BG.shuffle(picked, ctx.rand);
  }

  // ---------- body parsing ----------
  // Splits a body into chunks: the [[flag]] span is one chunk; other text is split into
  // sentences/lines. `nl` = chunk starts a new line.
  function parseBody(body) {
    const chunks = [];
    let nl = false;
    const pushText = (txt) => {
      const lines = txt.split('\n');
      lines.forEach((line, i) => {
        if (i > 0) nl = true;
        line.split(/(?<=[.!?])\s+/).forEach((s) => {
          const t = s.trim();
          if (!t) return;
          chunks.push({ t, flag: false, nl });
          nl = false;
        });
      });
    };
    const re = /\[\[([\s\S]+?)\]\]/g;
    let last = 0;
    let m;
    while ((m = re.exec(body))) {
      pushText(body.slice(last, m.index));
      chunks.push({ t: m[1].trim(), flag: true, nl });
      nl = false;
      last = re.lastIndex;
    }
    pushText(body.slice(last));
    // Tiny leftover fragments ("to link now.") are shown but not tappable.
    chunks.forEach((c) => (c.tap = c.flag || c.t.replace(/^(Caller|You):\s*/, '').length >= 12));
    return chunks;
  }

  const plain = (s) => s.replace(/\[\[|\]\]/g, '');
  const isUnknown = (sender) => /^\+\d|unknown/i.test(sender) || /\(\+\d/.test(sender);

  BG.registerGame({
    id: 'scam',
    name: 'Scam or Legit?',
    emoji: '🚨',
    skill: 'Spotting scams',
    category: 'life',
    tagline: 'Your phone just buzzed. Is it your bank… or a fraudster?',
    howTo: [
      'Messages ping in: SMS, chats, emails, UPI requests and calls.',
      'Call each one 🚩 Scam or ✅ Legit (keys S / L, or swipe left / right).',
      'Said Scam? Tap the exact red flag for bonus points.',
      'Streaks build a 🔥 combo. Crying wolf on a real message costs points.',
    ],
    science:
      'People who played a short anti-phishing game spotted fake websites better than those who read existing online tutorials (Sheng et al., SOUPS 2007). Indians lost ₹22,845 crore to cyber fraud in 2024, per Home Ministry figures reported in the press.',
    scienceUrl: 'https://cups.cs.cmu.edu/soups/2007/proceedings/p88_sheng.pdf',
    minutes: 3,
    // 8 verdicts × 30 + 4 flags × 20 + combo (streak 2..8: 5+10+15+20+20+20+20 = 110) = 430
    maxScore: 430,

    mount(root, ctx) {
      const data = (window.BG_DATA_SCAM && window.BG_DATA_SCAM.messages) || [];
      const rounds = chooseMessages(data, ctx);
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

      // Notification "ding" (own tiny synth; respects the site mute switch).
      let ac = null;
      function ding() {
        if (BG.store.get('muted', false)) return;
        try {
          ac = ac || new (window.AudioContext || window.webkitAudioContext)();
          if (ac.state === 'suspended') ac.resume();
          const now = ac.currentTime;
          [[1318.5, 0], [1760, 0.09]].forEach(([f, d]) => {
            const o = ac.createOscillator();
            const g = ac.createGain();
            o.type = 'sine';
            o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, now + d);
            g.gain.exponentialRampToValueAtTime(0.13, now + d + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.45);
            o.connect(g).connect(ac.destination);
            o.start(now + d);
            o.stop(now + d + 0.5);
          });
        } catch {
          /* audio unavailable */
        }
      }

      // ---------- state ----------
      let phase = 'intro'; // arrive | verdict | flag | reveal | end
      let chunks = [];
      let chunkEls = [];
      let resolveVerdict = null;
      let resolveFlag = null;
      let resolveNext = null;
      let streak = 0;
      let bestStreak = 0;
      const tally = { scamsCaught: 0, scams: 0, legitTrusted: 0, legit: 0, flags: 0, falseAlarms: 0 };

      // ---------- DOM ----------
      const wrap = BG.el(`
        <div class="sc-app">
          <div class="sc-meta">
            <span class="label sc-round"></span>
            <span class="sc-chips">
              <span class="chip chip--gold sc-combo" hidden></span>
            </span>
          </div>
          <div class="sc-stage">
            <div class="sc-phone" aria-live="polite">
              <div class="sc-notch" aria-hidden="true"></div>
              <div class="sc-status" aria-hidden="true">
                <span class="sc-clock"></span>
                <span class="sc-icons"><i class="sc-sig"><b></b><b></b><b></b><b></b></i><i class="sc-batt"></i></span>
              </div>
              <div class="sc-banner" hidden></div>
              <div class="sc-screen"></div>
              <span class="sc-swipe sc-swipe--scam" aria-hidden="true">🚩 SCAM</span>
              <span class="sc-swipe sc-swipe--legit" aria-hidden="true">LEGIT ✅</span>
            </div>
          </div>
          <p class="sc-hint"></p>
          <div class="sc-actions">
            <button class="btn sc-btn sc-btn--scam" data-v="scam" disabled><span class="sc-btn-emoji">🚩</span> Scam</button>
            <button class="btn sc-btn sc-btn--legit" data-v="legit" disabled><span class="sc-btn-emoji">✅</span> Legit</button>
          </div>
          <div class="sc-flagbar" hidden>
            <button class="btn btn--ghost btn--block sc-skip">Not sure, skip the flag</button>
          </div>
          <div class="sc-reveal" hidden></div>
          <div class="sc-end" hidden></div>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const roundEl = $('.sc-round');
      const comboEl = $('.sc-combo');
      const phoneEl = $('.sc-phone');
      const clockEl = $('.sc-clock');
      const bannerEl = $('.sc-banner');
      const screenEl = $('.sc-screen');
      const hintEl = $('.sc-hint');
      const actionsEl = $('.sc-actions');
      const scamBtn = $('.sc-btn--scam');
      const legitBtn = $('.sc-btn--legit');
      const flagbarEl = $('.sc-flagbar');
      const skipBtn = $('.sc-skip');
      const revealEl = $('.sc-reveal');
      const endEl = $('.sc-end');
      const hasKeys = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

      // ---------- rendering ----------
      function chunkHtml(c, i) {
        let t = c.t;
        let speaker = '';
        const sm = /^(Caller|You):\s*/.exec(t);
        if (sm) {
          speaker = sm[1];
          t = t.slice(sm[0].length);
        }
        return {
          speaker,
          html: `<span class="sc-chunk${c.tap ? ' is-tap' : ''}" data-k="${i}">${c.tap ? `<em class="sc-num" aria-hidden="true"></em>` : ''}${BG.esc(t)}</span>`,
        };
      }

      // Groups chunks into lines; returns [{speaker, html}]
      function linesOf(list, offset = 0) {
        const lines = [];
        list.forEach((c, j) => {
          const { speaker, html } = chunkHtml(c, j + offset);
          if (!lines.length || c.nl) lines.push({ speaker, parts: [html] });
          else lines[lines.length - 1].parts.push(html);
        });
        return lines.map((l) => ({ speaker: l.speaker, html: l.parts.join(' ') }));
      }

      function avatarFor(sender) {
        if (isUnknown(sender)) return '👤';
        const ch = sender.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase();
        return ch || '👤';
      }

      function renderMessage(item) {
        const unknown = isUnknown(item.sender);
        const esc = BG.esc;
        let html = '';
        if (item.channel === 'email') {
          const nlAt = item.body.indexOf('\n');
          const subject = nlAt > -1 ? item.body.slice(0, nlAt).trim() : '';
          const rest = nlAt > -1 ? item.body.slice(nlAt + 1).trim() : item.body;
          chunks = parseBody(rest);
          const mm = /^(.*?)\s*<([^>]+)>$/.exec(item.sender);
          const name = mm ? mm[1] : item.sender;
          const addr = mm ? mm[2] : '';
          html = `
            <div class="sc-app-bar sc-app-bar--email"><span>‹ Inbox</span><span class="sc-app-name">✉️ Mail</span></div>
            <div class="sc-email">
              <h4 class="sc-subject">${esc(subject)}</h4>
              <div class="sc-from">
                <span class="sc-avatar">${esc(avatarFor(name))}</span>
                <span class="sc-from-text"><b>${esc(name)}</b><span class="sc-addr">&lt;${esc(addr)}&gt;</span></span>
                <span class="sc-time">${esc(item.time)}</span>
              </div>
              <div class="sc-body sc-body--email">${linesOf(chunks).map((l) => `<p>${l.html}</p>`).join('')}</div>
            </div>`;
        } else if (item.channel === 'upi') {
          chunks = parseBody(item.body);
          const raw = plain(item.body);
          const amt = (/₹[\d,]+(?:\.\d+)?/.exec(raw) || [''])[0];
          const kind = /collect request/i.test(raw) ? 'collect' : /received/i.test(raw) ? 'in' : 'out';
          const title = kind === 'collect' ? 'Collect request' : kind === 'in' ? 'Money received' : 'Payment successful';
          html = `
            <div class="sc-app-bar sc-app-bar--upi"><span>‹</span><span class="sc-app-name">₹ PayZing UPI</span></div>
            <div class="sc-upi sc-upi--${kind}">
              <div class="sc-upi-tag">${kind === 'collect' ? '⏳' : kind === 'in' ? '⬇️' : '✔️'} ${title}</div>
              <div class="sc-upi-amt big-num">${esc(amt)}</div>
              <div class="sc-upi-from">${kind === 'out' ? 'to' : 'from'} <b>${esc(item.sender)}</b></div>
              <div class="sc-body sc-body--upi">${linesOf(chunks).map((l) => `<p>${l.html}</p>`).join('')}</div>
              ${kind === 'collect' ? '<div class="sc-upi-btns" aria-hidden="true"><span>Decline</span><span>Pay</span></div>' : ''}
              <div class="sc-time sc-time--upi">${esc(item.time)}</div>
            </div>`;
        } else if (item.channel === 'call') {
          chunks = parseBody(item.body);
          const name = item.sender.replace(/\s*·\s*Unknown$/i, '');
          html = `
            <div class="sc-app-bar sc-app-bar--call"><span class="sc-app-name">📞 Call transcript</span><span class="sc-time">${esc(item.time)}</span></div>
            <div class="sc-call">
              <div class="sc-caller">
                <span class="sc-avatar sc-avatar--lg">${esc(avatarFor(item.sender))}</span>
                <b>${esc(name)}</b>
                ${unknown ? '<span class="sc-tag">Unknown caller</span>' : '<span class="sc-tag sc-tag--ok">Saved contact</span>'}
              </div>
              <div class="sc-transcript">
                ${linesOf(chunks).map((l) => `<div class="sc-tline sc-tline--${l.speaker === 'You' ? 'you' : 'caller'}"><span class="sc-who">${l.speaker === 'You' ? 'You' : 'Caller'}</span><span class="sc-said">${l.html}</span></div>`).join('')}
              </div>
            </div>`;
        } else {
          // sms + whatsapp: chat thread
          chunks = parseBody(item.body);
          const wa = item.channel === 'whatsapp';
          html = `
            <div class="sc-app-bar sc-app-bar--${item.channel}">
              <span>‹</span>
              <span class="sc-avatar">${esc(avatarFor(item.sender))}</span>
              <span class="sc-thread-name"><b>${esc(item.sender)}</b>${wa && unknown ? '<span class="sc-tag">Not in contacts</span>' : ''}${!wa ? `<span class="sc-sub">${unknown ? 'Mobile number' : 'Text message'}</span>` : ''}</span>
            </div>
            <div class="sc-thread sc-thread--${item.channel}">
              <div class="sc-day label">Today</div>
              <div class="sc-msg">
                <div class="sc-body">${linesOf(chunks).map((l) => `<p>${l.html}</p>`).join('')}</div>
                <span class="sc-time">${esc(item.time)}</span>
              </div>
            </div>`;
        }
        screenEl.className = `sc-screen sc-screen--${item.channel}`;
        screenEl.innerHTML = html;
        chunkEls = Array.from(screenEl.querySelectorAll('.sc-chunk'));
        clockEl.textContent = item.time.replace(/\s?[AP]M$/i, '');
      }

      // ---------- input ----------
      function verdict(v) {
        if (phase !== 'verdict' || !resolveVerdict) return;
        BG.fx.haptic(20);
        resolveVerdict(v);
      }
      scamBtn.addEventListener('click', () => verdict('scam'));
      legitBtn.addEventListener('click', () => verdict('legit'));
      skipBtn.addEventListener('click', () => {
        if (phase === 'flag' && resolveFlag) resolveFlag(-1);
      });
      screenEl.addEventListener('click', (e) => {
        if (phase !== 'flag') return;
        const c = e.target.closest('.sc-chunk.is-tap');
        if (c && resolveFlag) resolveFlag(Number(c.dataset.k));
      });

      // Swipe left = scam, right = legit.
      let drag = null;
      function onDown(e) {
        if (phase !== 'verdict' || (e.pointerType === 'mouse' && e.button !== 0)) return;
        drag = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, live: false };
      }
      function onMove(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.live) {
          if (Math.abs(dx) < 10) return;
          if (Math.abs(dy) > Math.abs(dx)) {
            drag = null; // vertical scroll wins
            return;
          }
          drag.live = true;
          try {
            phoneEl.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          phoneEl.classList.add('is-dragging');
        }
        drag.dx = dx;
        phoneEl.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
        const k = Math.min(1, Math.abs(dx) / 90);
        phoneEl.style.setProperty('--sw-scam', dx < 0 ? k : 0);
        phoneEl.style.setProperty('--sw-legit', dx > 0 ? k : 0);
      }
      function onUp(e) {
        if (!drag || e.pointerId !== drag.id) return;
        const { dx, live } = drag;
        drag = null;
        phoneEl.classList.remove('is-dragging');
        phoneEl.style.transform = '';
        phoneEl.style.setProperty('--sw-scam', 0);
        phoneEl.style.setProperty('--sw-legit', 0);
        if (live && Math.abs(dx) > 90) verdict(dx < 0 ? 'scam' : 'legit');
      }
      phoneEl.addEventListener('pointerdown', onDown);
      phoneEl.addEventListener('pointermove', onMove);
      phoneEl.addEventListener('pointerup', onUp);
      phoneEl.addEventListener('pointercancel', onUp);

      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key;
        if (phase === 'verdict') {
          if (k === 's' || k === 'S' || k === 'ArrowLeft') {
            e.preventDefault();
            verdict('scam');
          } else if (k === 'l' || k === 'L' || k === 'ArrowRight') {
            e.preventDefault();
            verdict('legit');
          }
        } else if (phase === 'flag') {
          const taps = chunkEls.filter((c) => c.classList.contains('is-tap'));
          if (/^[1-9]$/.test(k) && Number(k) <= taps.length) {
            e.preventDefault();
            resolveFlag && resolveFlag(Number(taps[Number(k) - 1].dataset.k));
          } else if ((k === 'Enter' || k === ' ') && document.activeElement && document.activeElement.classList.contains('sc-chunk')) {
            e.preventDefault();
            resolveFlag && resolveFlag(Number(document.activeElement.dataset.k));
          } else if (k === 'Escape' || k === '0') {
            e.preventDefault();
            resolveFlag && resolveFlag(-1);
          }
        } else if (phase === 'reveal' && (k === 'Enter' || k === ' ' || k === 'ArrowRight')) {
          const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
          if (onButton && k !== 'ArrowRight') return;
          e.preventDefault();
          resolveNext && resolveNext();
        }
      }
      document.addEventListener('keydown', onKey);

      ctx.onDestroy(() => {
        timers.forEach(clearTimeout);
        timers.clear();
        document.removeEventListener('keydown', onKey);
        phase = 'end';
        try {
          if (ac) ac.close();
        } catch {
          /* ignore */
        }
      });

      // ---------- helpers ----------
      function setCombo() {
        if (streak >= 2) {
          comboEl.textContent = `🔥 x${streak}`;
          comboEl.hidden = false;
          BG.fx.pop(comboEl);
        } else {
          comboEl.hidden = true;
        }
      }
      function missedThing(item) {
        const t = plain(item.body).toLowerCase();
        if (/deliver|parcel|order/.test(t)) return 'delivery';
        if (/bank|debit|credit|card|otp|password|a\/c/.test(t)) return 'bank alert';
        if (!isUnknown(item.sender) && (item.channel === 'whatsapp' || item.channel === 'call')) return 'message from someone you know';
        return 'message';
      }
      function enableVerdict(on) {
        scamBtn.disabled = !on;
        legitBtn.disabled = !on;
      }

      // ---------- a round ----------
      async function playRound(r) {
        const item = rounds[r];
        ctx.setProgress(r + 1, TOTAL);
        roundEl.textContent = `Message ${r + 1} of ${TOTAL}`;
        phase = 'arrive';
        revealEl.hidden = true;
        revealEl.innerHTML = '';
        flagbarEl.hidden = true;
        actionsEl.hidden = false;
        enableVerdict(false);
        phoneEl.classList.remove('is-flagging', 'is-judged-scam', 'is-judged-legit');
        hintEl.textContent = '';

        // empty screen, then notification banner + ding, then the message slides in
        screenEl.innerHTML = '<div class="sc-idle" aria-hidden="true"></div>';
        await wait(r === 0 ? 350 : 200);
        if (!ctx.alive) return;
        const app = APP[item.channel] || APP.sms;
        const who = item.channel === 'email' ? item.sender.replace(/\s*<.*$/, '') : item.sender.replace(/\s*·\s*Unknown$/i, '');
        bannerEl.innerHTML = `<span class="sc-banner-icon">${app.icon}</span><span class="sc-banner-text"><b>${BG.esc(app.name)}</b> · now<br><span>${BG.esc(who)}</span></span>`;
        bannerEl.hidden = false;
        BG.fx.anim(bannerEl, 'sc-banner-in');
        ding();
        BG.fx.haptic(25);
        await wait(650);
        if (!ctx.alive) return;
        bannerEl.hidden = true;
        renderMessage(item);
        BG.fx.anim(screenEl, 'sc-slide-in');
        await wait(260);
        if (!ctx.alive) return;

        // ---------- verdict ----------
        phase = 'verdict';
        enableVerdict(true);
        hintEl.textContent = hasKeys ? 'Scam or legit? Keys: S / ← scam · L / → legit' : 'Scam or legit? Tap a button or swipe the phone ← / →';
        const v = await new Promise((res) => (resolveVerdict = res));
        resolveVerdict = null;
        if (!ctx.alive) return;
        enableVerdict(false);
        phase = 'judged';
        const saidScam = v === 'scam';
        const correct = saidScam === item.scam;
        phoneEl.classList.add(saidScam ? 'is-judged-scam' : 'is-judged-legit');
        BG.fx.pop(saidScam ? scamBtn : legitBtn);

        if (item.scam) tally.scams += 1;
        else tally.legit += 1;
        let comboBonus = 0;
        if (correct) {
          streak += 1;
          bestStreak = Math.max(bestStreak, streak);
          if (item.scam) tally.scamsCaught += 1;
          else tally.legitTrusted += 1;
          BG.fx.sound('good');
          ctx.addScore(PTS.verdict, phoneEl);
          comboBonus = streak >= 2 ? Math.min(PTS.comboMax, PTS.comboStep * (streak - 1)) : 0;
          setCombo();
          if (comboBonus) {
            await wait(380);
            if (!ctx.alive) return;
            ctx.addScore(comboBonus, comboEl);
          }
        } else {
          streak = 0;
          setCombo();
          BG.fx.sound('bad');
          BG.fx.shake(phoneEl);
          if (!item.scam) {
            tally.falseAlarms += 1;
            ctx.addScore(PTS.wolf, phoneEl);
          }
        }

        // ---------- red-flag hunt (only when a scam was called a scam) ----------
        let flagResult = null; // null = no hunt, true/false = hit/miss, 'skip'
        let pickedK = -1;
        const flagK = chunks.findIndex((c) => c.flag);
        if (item.scam && saidScam) {
          await wait(comboBonus ? 300 : 450);
          if (!ctx.alive) return;
          phase = 'flag';
          actionsEl.hidden = true;
          flagbarEl.hidden = false;
          phoneEl.classList.add('is-flagging');
          let n = 0;
          chunkEls.forEach((el) => {
            if (!el.classList.contains('is-tap')) return;
            n += 1;
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            const num = el.querySelector('.sc-num');
            if (num) num.textContent = String(n);
          });
          hintEl.innerHTML = `<b class="sc-hint-flag">🚩 Tap the red flag</b> · the one part that gives it away${hasKeys ? ' (keys 1–' + n + ')' : ''}`;
          BG.fx.sound('pop');
          pickedK = await new Promise((res) => (resolveFlag = res));
          resolveFlag = null;
          if (!ctx.alive) return;
          flagResult = pickedK < 0 ? 'skip' : pickedK === flagK;
          phoneEl.classList.remove('is-flagging');
          chunkEls.forEach((el) => {
            el.removeAttribute('role');
            el.removeAttribute('tabindex');
          });
          flagbarEl.hidden = true;
          if (flagResult === true) {
            tally.flags += 1;
            BG.fx.sound('win');
            BG.fx.haptic(40);
            ctx.addScore(PTS.flag, chunkEls[flagK]);
          } else if (flagResult === false) {
            BG.fx.sound('bad');
            if (chunkEls[pickedK]) {
              chunkEls[pickedK].classList.add('is-wrongpick');
              BG.fx.shake(chunkEls[pickedK]);
            }
          }
        }

        // ---------- reveal ----------
        phase = 'reveal';
        actionsEl.hidden = true;
        hintEl.textContent = '';
        if (item.scam && chunkEls[flagK]) {
          chunkEls[flagK].classList.add('is-flag');
          if (flagResult === true) chunkEls[flagK].classList.add('is-found');
        }
        let title;
        let tone;
        if (item.scam && saidScam) {
          title = flagResult === true ? '🚩 Scam caught, flag nailed!' : '🚩 Scam caught!';
          tone = 'ok';
        } else if (item.scam) {
          title = '🪤 Gotcha: that was a scam';
          tone = 'bad';
        } else if (!saidScam) {
          title = '✅ Legit, rightly trusted';
          tone = 'ok';
        } else {
          title = '🐺 Crying wolf';
          tone = 'bad';
        }
        const chips = [];
        if (correct) chips.push(`<span class="chip chip--ok">+${PTS.verdict} verdict</span>`);
        if (comboBonus) chips.push(`<span class="chip chip--gold">🔥 +${comboBonus} combo</span>`);
        if (flagResult === true) chips.push(`<span class="chip chip--ok">🚩 +${PTS.flag} red flag</span>`);
        if (flagResult === false) chips.push('<span class="chip chip--warn">Wrong flag, no bonus</span>');
        if (flagResult === 'skip') chips.push('<span class="chip chip--blue">Flag skipped</span>');
        if (!correct && !item.scam) chips.push(`<span class="chip">${PTS.wolf} false alarm</span>`);
        const wolf = !correct && !item.scam
          ? `<p class="sc-wolf">Crying wolf costs you too: you'd miss a real ${missedThing(item)}.</p>`
          : '';
        revealEl.innerHTML = `
          <div class="card sc-verdict sc-verdict--${tone}">
            <h3 class="sc-title">${title}</h3>
            <p class="sc-flagline"><span class="label">${item.scam ? 'Red flag' : 'Why it\'s real'}</span><span>${BG.esc(item.flag)}</span></p>
            ${wolf}
            <p class="sc-lesson">💡 ${BG.esc(item.lesson)}</p>
            <div class="sc-points">${chips.join('')}</div>
          </div>
          <button class="btn btn--primary btn--block sc-next">${r + 1 < TOTAL ? 'Next message →' : 'See my rating 🛡️'}</button>`;
        revealEl.hidden = false;
        const verdictEl = revealEl.querySelector('.sc-verdict');
        const nextBtn = revealEl.querySelector('.sc-next');
        BG.fx.pop(verdictEl);
        try {
          revealEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
        BG.track('scam_round', { id: item.id, channel: item.channel, scam: item.scam, verdict: v, correct, flag: flagResult });

        nextBtn.focus({ preventScroll: true });
        await new Promise((res) => {
          resolveNext = res;
          nextBtn.addEventListener('click', res, { once: true });
        });
        resolveNext = null;
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      function rating(correct) {
        if (correct === TOTAL) return { emoji: '🛡️', name: 'Fortress', line: 'Nothing gets past you. Scammers, take note.' };
        if (correct >= TOTAL - 2 && tally.scamsCaught >= tally.scams - 1) return { emoji: '🔒', name: 'Locked', line: 'Hard to fool. One or two slipped through the cracks.' };
        if (correct >= TOTAL / 2 && tally.scamsCaught >= tally.scams / 2) return { emoji: '🚪', name: 'Door ajar', line: 'Decent instincts, but a smooth talker could get in.' };
        return { emoji: '🪤', name: 'Easy target', line: 'Scammers would love your number. Read the lessons and try again!' };
      }

      async function run() {
        if (!rounds.length) {
          hintEl.textContent = 'Message content is missing. Please refresh.';
          return;
        }
        for (let r = 0; r < TOTAL; r++) {
          await playRound(r);
          if (!ctx.alive) return;
        }
        phase = 'end';
        const correct = tally.scamsCaught + tally.legitTrusted;
        const rt = rating(correct);
        revealEl.hidden = true;
        actionsEl.hidden = true;
        flagbarEl.hidden = true;
        hintEl.hidden = true;
        $('.sc-stage').hidden = true;
        comboEl.hidden = true;
        roundEl.textContent = 'All messages checked';
        endEl.innerHTML = `
          <div class="card sc-endcard">
            <div class="sc-end-emoji">${rt.emoji}</div>
            <span class="label">Scam-proof rating</span>
            <h3 class="sc-end-name">${rt.name}</h3>
            <p class="sc-end-line">${rt.line}</p>
            <div class="sc-end-stats">
              <span class="chip chip--ok">🚩 ${tally.scamsCaught}/${tally.scams} scams caught</span>
              <span class="chip chip--blue">✅ ${tally.legitTrusted}/${tally.legit} real ones trusted</span>
              <span class="chip chip--gold">🎯 ${tally.flags}/${tally.scams} red flags</span>
              ${bestStreak >= 2 ? `<span class="chip chip--gold">🔥 best streak ${bestStreak}</span>` : ''}
            </div>
          </div>`;
        endEl.hidden = false;
        BG.fx.pop(endEl.firstElementChild);
        if (correct === TOTAL) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else {
          BG.fx.sound(correct >= TOTAL / 2 ? 'good' : 'lose');
        }
        try {
          endEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
        await wait(2400);
        if (!ctx.alive) return;
        ctx.finish({
          summary: `Caught ${tally.scamsCaught}/${tally.scams} scams, trusted ${tally.legitTrusted}/${tally.legit} real ones ${rt.emoji}`,
          stats: { ...tally, rating: rt.name, bestStreak },
        });
      }

      run();
    },
  });
})();

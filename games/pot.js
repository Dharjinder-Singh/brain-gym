// Brain Gym game: "Pot Odds" (id 'pot').
// The card room: count your outs, estimate equity with the rule of 2 and 4, then decide call or fold
// against the pot odds. Play money only. Every answer is computed by enumerating the unseen deck.
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure engine (no DOM). Exported for node tests at the bottom.
  // Cards are ints 0..51: rank = c >> 2 (0 = deuce … 12 = ace), suit = c & 3 (♠ ♥ ♦ ♣).
  // ---------------------------------------------------------------------------
  const RANKS = '23456789TJQKA';
  const RANK_SHOW = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const RANK_NAME = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
  const RANK_PLURAL = ['twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  const SUIT_NAME = ['spade', 'heart', 'diamond', 'club'];
  const CAT_NAME = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
  const rankOf = (c) => c >> 2;
  const suitOf = (c) => c & 3;
  const isRed = (c) => suitOf(c) === 1 || suitOf(c) === 2;
  const card = (s) => RANKS.indexOf(s[0]) * 4 + 'shdc'.indexOf(s[1]); // 'Ah' → int (tests)
  const cardText = (c) => RANK_SHOW[rankOf(c)] + SUITS[suitOf(c)];

  // Highest straight in a 13-bit rank mask (bit r = rank r present), or -1. The wheel A-2-3-4-5 ranks as a 5-high (3).
  function straightHigh(mask) {
    for (let h = 12; h >= 4; h--) {
      const need = 0x1f << (h - 4);
      if ((mask & need) === need) return h;
    }
    const wheel = (1 << 12) | 0xf; // A,2,3,4,5
    return (mask & wheel) === wheel ? 3 : -1;
  }

  const BASE = 13 ** 5;
  const pack = (cat, ks) => {
    let v = 0;
    for (let i = 0; i < 5; i++) v = v * 13 + (ks[i] == null ? 0 : ks[i]);
    return cat * BASE + v;
  };

  // Best 5-card hand from 5–7 cards. Returns a number: higher is better; category = Math.floor(score / 13^5).
  function evaluate(cards) {
    const cnt = new Array(13).fill(0);
    const smask = [0, 0, 0, 0];
    const scnt = [0, 0, 0, 0];
    let mask = 0;
    for (const c of cards) {
      const r = rankOf(c);
      const s = suitOf(c);
      cnt[r]++;
      mask |= 1 << r;
      smask[s] |= 1 << r;
      scnt[s]++;
    }
    let fs = -1;
    for (let s = 0; s < 4; s++) if (scnt[s] >= 5) fs = s;
    if (fs >= 0) {
      const sf = straightHigh(smask[fs]);
      if (sf >= 0) return pack(8, [sf]);
    }
    const quads = [];
    const trips = [];
    const pairs = [];
    const singles = [];
    for (let r = 12; r >= 0; r--) {
      if (cnt[r] === 4) quads.push(r);
      else if (cnt[r] === 3) trips.push(r);
      else if (cnt[r] === 2) pairs.push(r);
      else if (cnt[r] === 1) singles.push(r);
    }
    const kick = (excl, n) => {
      const out = [];
      for (let r = 12; r >= 0 && out.length < n; r--) if (cnt[r] && !excl.includes(r)) out.push(r);
      return out;
    };
    if (quads.length) return pack(7, [quads[0]].concat(kick([quads[0]], 1)));
    if (trips.length && (trips.length > 1 || pairs.length)) {
      const t = trips[0];
      const p = Math.max(trips.length > 1 ? trips[1] : -1, pairs.length ? pairs[0] : -1);
      return pack(6, [t, p]);
    }
    if (fs >= 0) {
      const ks = [];
      for (let r = 12; r >= 0 && ks.length < 5; r--) if (smask[fs] & (1 << r)) ks.push(r);
      return pack(5, ks);
    }
    const st = straightHigh(mask);
    if (st >= 0) return pack(4, [st]);
    if (trips.length) return pack(3, [trips[0]].concat(kick([trips[0]], 2)));
    if (pairs.length >= 2) return pack(2, [pairs[0], pairs[1]].concat(kick([pairs[0], pairs[1]], 1)));
    if (pairs.length) return pack(1, [pairs[0]].concat(kick([pairs[0]], 3)));
    return pack(0, kick([], 5));
  }
  const category = (cards) => Math.floor(evaluate(cards) / BASE);

  function hasFlush(cards) {
    const s = [0, 0, 0, 0];
    for (const c of cards) if (++s[suitOf(c)] >= 5) return true;
    return false;
  }
  function hasStraight(cards) {
    let m = 0;
    for (const c of cards) m |= 1 << rankOf(c);
    return straightHigh(m) >= 0;
  }

  // ---------- exact maths ----------
  const C2 = (n) => (n * (n - 1)) / 2;
  // Chance that at least one of your outs arrives: one card from 46 (turn) or two from 47 (flop).
  // Returned as an exact fraction {n, d}.
  function equityFrac(outs, street) {
    if (street === 'turn') return { n: outs, d: 46 };
    return { n: C2(47) - C2(47 - outs), d: C2(47) };
  }
  const fracPct = (f) => (100 * f.n) / f.d;
  const ruleEstimate = (outs, street) => outs * (street === 'turn' ? 2 : 4);

  // ---------- analysing a spot ----------
  // hole: 2 cards, board: 3 (flop) or 4 (turn). target: minimum category that counts as "hitting".
  function analyse(hole, board, target) {
    const hero = hole.concat(board);
    const seen = new Set(hero);
    const unseen = [];
    for (let c = 0; c < 52; c++) if (!seen.has(c)) unseen.push(c);
    const outs = [];
    const flushOuts = [];
    const straightOuts = [];
    let shared = false;
    for (const c of unseen) {
      const h = hero.concat(c);
      const f = hasFlush(h);
      const s = hasStraight(h);
      if (f) flushOuts.push(c);
      if (s) straightOuts.push(c);
      if (category(h) >= target) {
        outs.push(c);
        // Does the board alone make it with this card? Then it's not really your draw.
        const b = board.concat(c);
        if (b.length >= 5 && category(b) >= target) shared = true;
      }
    }
    const sRanks = [...new Set(straightOuts.map(rankOf))].sort((a, b) => b - a);
    return {
      hole, board, target, unseen, outs, flushOuts, straightOuts, sRanks, shared,
      cur: category(hero), madeF: hasFlush(hero), madeS: hasStraight(hero),
    };
  }

  // Is there a run of 4 consecutive ranks (ace also low) among these cards? Distinguishes open-ended from double gutshot.
  function hasFourInRow(cards) {
    let bits = 0; // bit 0 = ace low, bit r+1 = rank r
    for (const c of cards) {
      bits |= 1 << (rankOf(c) + 1);
      if (rankOf(c) === 12) bits |= 1;
    }
    for (let i = 0; i + 4 <= 14; i++) if (((bits >> i) & 0xf) === 0xf) return true;
    return false;
  }

  const KINDS = {
    flush: { target: 5, label: 'Flush draw', aim: 'at least a flush' },
    oesd: { target: 4, label: 'Open-ended straight draw', aim: 'at least a straight' },
    gutshot: { target: 4, label: 'Gutshot straight draw', aim: 'at least a straight' },
    combo: { target: 4, label: 'Combo draw: flush + straight', aim: 'at least a straight (a flush counts too)' },
  };

  function matches(kind, a) {
    if (a.shared || a.madeF || a.madeS || a.cur > 1) return false;
    const F = a.flushOuts.length;
    const S = a.straightOuts.length;
    if (kind === 'flush') return F === 9 && S === 0 && a.outs.length === 9;
    if (kind === 'oesd') return F === 0 && S === 8 && a.sRanks.length === 2;
    if (kind === 'gutshot') return F === 0 && S === 4 && a.sRanks.length === 1;
    if (kind === 'combo') return F === 9 && S >= 4 && a.sRanks.length >= 1;
    return false;
  }

  // Deal hands (with a light bias towards drawing hole cards) until one has exactly the draw we want.
  function dealSpot(kind, street, rand) {
    const target = KINDS[kind].target;
    const nb = street === 'turn' ? 4 : 3;
    const wantFlush = kind === 'flush' || kind === 'combo';
    const wantStraight = kind !== 'flush';
    for (let attempt = 0; attempt < 40000; attempt++) {
      let r1 = Math.floor(rand() * 13);
      let r2 = wantStraight && rand() < 0.75 ? r1 + (rand() < 0.5 ? -1 : 1) * (1 + Math.floor(rand() * 3)) : Math.floor(rand() * 13);
      if (r2 < 0 || r2 > 12) r2 = Math.floor(rand() * 13);
      if (r2 === r1) continue;
      const s1 = Math.floor(rand() * 4);
      const s2 = wantFlush && rand() < 0.7 ? s1 : Math.floor(rand() * 4);
      const hole = [r1 * 4 + s1, r2 * 4 + s2];
      const deck = [];
      for (let c = 0; c < 52; c++) if (c !== hole[0] && c !== hole[1]) deck.push(c);
      const board = [];
      for (let i = 0; i < nb; i++) {
        const j = i + Math.floor(rand() * (deck.length - i));
        [deck[i], deck[j]] = [deck[j], deck[i]];
        board.push(deck[i]);
      }
      // Cheap pre-filter on suits before enumerating.
      const sc = [0, 0, 0, 0];
      hole.concat(board).forEach((c) => sc[suitOf(c)]++);
      const four = sc.indexOf(4);
      if (wantFlush !== (four >= 0)) continue;
      if (wantFlush && suitOf(hole[0]) !== four && suitOf(hole[1]) !== four) continue;
      const a = analyse(hole, board, target);
      if (!matches(kind, a)) continue;
      if (kind === 'oesd' && !hasFourInRow(hole.concat(board))) continue; // keep double gutshots out of the "open-ended" label
      // Sort the board for a tidy table? No: real boards come in deal order.
      return Object.assign(a, { kind, street, attempts: attempt + 1 });
    }
    throw new Error(`pot: could not deal ${kind}`);
  }

  // ---------- pot odds ----------
  // Pot X already includes the opponent's bet; you must call Y. You need equity ≥ Y / (X + Y).
  // Clear-cut only: |equity − required| ≥ 5 percentage points, checked with exact integer arithmetic.
  function priceSpot(spot, rand) {
    const eq = equityFrac(spot.outs.length, spot.street);
    const eqPct = fracPct(eq);
    const wantCall = eqPct < 12 ? rand() < 0.3 : eqPct > 45 ? rand() < 0.6 : rand() < 0.5;
    for (const want of [wantCall, !wantCall]) {
      for (let k = 0; k < 2000; k++) {
        const P = (4 + Math.floor(rand() * 37)) * 50; // pot before their bet: ₹200–₹2,000
        const Y = (1 + Math.floor(rand() * 60)) * 50; // their bet = your call: ₹50–₹3,000
        if (Y > 2 * P || Y * 10 < P) continue; // bets from 1/10 pot to 2× pot
        const X = P + Y; // the pot you see includes their bet
        // diff = eq − Y/(X+Y) = (eq.n (X+Y) − Y eq.d) / (eq.d (X+Y))
        const num = eq.n * (X + Y) - Y * eq.d;
        const den = eq.d * (X + Y);
        if (Math.abs(num) * 20 < den) continue; // < 5 points apart → ambiguous
        const call = num > 0;
        if (call !== want) continue;
        return { pot: X, bet: Y, required: (100 * Y) / (X + Y), equity: eqPct, call };
      }
    }
    throw new Error('pot: could not price spot');
  }

  // 8 rounds, escalating: flush draws → straights → gutshots → combo draws.
  const PLAN = [
    { type: 'A', kinds: ['flush'] },
    { type: 'B', kinds: ['flush'] },
    { type: 'C', kinds: ['flush'] },
    { type: 'A', kinds: ['oesd'] },
    { type: 'C', kinds: ['oesd', 'gutshot'] },
    { type: 'B', kinds: ['gutshot', 'oesd'] },
    { type: 'A', kinds: ['combo'] },
    { type: 'C', kinds: ['combo'] },
  ];
  const PTS = { aExact: 40, aNear: 20, b: 30, c: 50 };
  const MAX_SCORE = PLAN.reduce((s, p) => s + (p.type === 'A' ? PTS.aExact : p.type === 'B' ? PTS.b : PTS.c + 40), 0);

  function makeGame(rand) {
    return PLAN.map((p, i) => {
      const kind = p.kinds[Math.floor(rand() * p.kinds.length)];
      const street = rand() < (i < 2 ? 0.65 : 0.5) ? 'flop' : 'turn';
      const spot = dealSpot(kind, street, rand);
      const r = { type: p.type, kind, street, spot };
      if (p.type === 'C') r.price = priceSpot(spot, rand);
      return r;
    });
  }

  // Explanation of the count, de-duplicating cards that complete both draws.
  function outsWhy(spot) {
    const F = spot.flushOuts.length;
    const S = spot.straightOuts.length;
    const n = spot.outs.length;
    const fSuit = F ? SUIT_NAME[suitOf(spot.flushOuts[0])] : '';
    const ranks = spot.sRanks.map((r) => RANK_PLURAL[r]);
    const rankTxt = ranks.length > 1 ? `${ranks.slice(0, -1).join(', ')} or ${ranks[ranks.length - 1]}` : ranks[0];
    if (spot.kind === 'flush') return `13 ${fSuit}s − 4 you can see = ${F} outs.`;
    if (spot.kind !== 'combo') return `Any ${spot.sRanks.map((r) => RANK_NAME[r]).join(' or ')} completes the straight: ${spot.sRanks.length} × 4 = ${S} outs.`;
    const both = F + S - n;
    return `${F} ${fSuit}s + ${S} straight cards (${rankTxt}) − ${both} that do both = ${n} outs.`;
  }

  function equityWhy(outs, street) {
    const ex = fracPct(equityFrac(outs, street));
    if (street === 'turn') return { rule: `${outs} × 2 = ${outs * 2}%`, exact: `${outs} ÷ 46 = ${ex.toFixed(1)}%`, ex };
    return {
      rule: `${outs} × 4 = ${outs * 4}%`,
      exact: `1 − (${47 - outs}×${46 - outs}) ÷ (47×46) = ${ex.toFixed(1)}%`,
      ex,
    };
  }

  const engine = {
    evaluate, category, straightHigh, hasFlush, hasStraight, analyse, dealSpot, priceSpot, makeGame, equityFrac,
    fracPct, ruleEstimate, outsWhy, equityWhy, card, cardText, KINDS, PLAN, MAX_SCORE, BASE, hasFourInRow,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI: the card room
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const TYPE_LABEL = { A: 'Count the outs', B: 'Quick equity', C: 'Call or fold?' };
  const NOTE = "Poker maths helps decisions but can't remove luck. Gambling laws vary by place; never play with money you can't afford to lose.";
  const C_TIPS = [
    'Simplification used here: hitting wins, missing loses. Real hands are messier.',
    'Implied odds: if you hit, you may win more on later streets, so a slightly worse price can still be fine.',
    'A half-pot bet asks for 25% equity. A pot-sized bet asks for 33%.',
    'The bigger the bet, the more equity you need to call.',
  ];
  const money = (n) => `₹${n.toLocaleString('en-IN')}`;

  function cardHTML(c, extra = '', delay = 0) {
    const txt = `${RANK_SHOW[rankOf(c)]} of ${SUIT_NAME[suitOf(c)]}s`;
    return `<span class="g-pot-card${isRed(c) ? ' is-red' : ''}${extra}" style="--d:${delay}ms" role="img" aria-label="${txt}">
      <b>${RANK_SHOW[rankOf(c)]}</b><i>${SUITS[suitOf(c)]}&#xFE0E;</i></span>`;
  }
  const backHTML = (extra = '') => `<span class="g-pot-card g-pot-back${extra}" aria-hidden="true"></span>`;
  const slotHTML = () => '<span class="g-pot-card g-pot-slot" aria-hidden="true"></span>';

  function chipsHTML(amount) {
    // A little stack: one chip per ~₹250, 2–7 chips, colours cycling.
    const n = Math.max(2, Math.min(7, Math.round(amount / 250)));
    const cols = ['gold', 'blue', 'bad', 'ok'];
    return `<span class="g-pot-stack" aria-hidden="true">${Array.from({ length: n }, (_, i) =>
      `<i class="g-pot-chip g-pot-chip--${cols[i % cols.length]}" style="--i:${i}"></i>`).join('')}</span>`;
  }

  BG.registerGame({
    id: 'pot',
    name: 'Pot Odds',
    emoji: '♠️',
    skill: 'Poker maths: outs & odds',
    category: 'cool',
    tagline: 'Count your outs. Price the call. Let maths, not hope, decide.',
    howTo: [
      'Count the outs: the unseen cards that complete your draw.',
      'Rule of 4 and 2: outs × 4 on the flop (two cards to come), × 2 on the turn.',
      'Call only if your equity beats the price: call ÷ (pot + call).',
      'Play money only. Exact answers are worked out from every card left in the deck.',
    ],
    science:
      'In the 2010 World Series of Poker, players picked out in advance as highly skilled earned a return on investment of over 30%, against about −15% for everyone else (Levitt & Miles, "The Role of Skill Versus Luck in Poker", Journal of Sports Economics 2014; NBER w17023). Better decisions show up in results, though luck still swings any single hand.',
    scienceUrl: 'https://www.nber.org/papers/w17023',
    minutes: 4,
    maxScore: MAX_SCORE,

    mount(root, ctx) {
      const rounds = makeGame(ctx.rand);
      const TOTAL = rounds.length;
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
      let phase = 'idle'; // input | bet | reveal | end
      let onEnter = null;
      let typed = { at: 0 };
      const log = [];

      const wrap = BG.el(`
        <div class="g-pot-wrap">
          <div class="g-pot-meta">
            <span class="label g-pot-round"></span>
            <span class="chip chip--gold g-pot-type"></span>
          </div>
          <div class="g-pot-felt">
            <div class="g-pot-villain"></div>
            <div class="g-pot-centre"></div>
            <div class="g-pot-board" aria-label="Board"></div>
            <div class="g-pot-street"></div>
            <div class="g-pot-hero" aria-label="Your cards"></div>
          </div>
          <div class="card g-pot-q" aria-live="polite"></div>
          <div class="g-pot-input"></div>
          <div class="g-pot-reveal" hidden></div>
          <p class="g-pot-note">🛈 ${BG.esc(NOTE)}</p>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const roundEl = $('.g-pot-round');
      const typeEl = $('.g-pot-type');
      const villainEl = $('.g-pot-villain');
      const centreEl = $('.g-pot-centre');
      const boardEl = $('.g-pot-board');
      const streetEl = $('.g-pot-street');
      const heroEl = $('.g-pot-hero');
      const qEl = $('.g-pot-q');
      const inputEl = $('.g-pot-input');
      const revealEl = $('.g-pot-reveal');

      function onKey(e) {
        if (!ctx.alive || e.metaKey || e.ctrlKey || e.altKey || !root.isConnected) return;
        const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
        if (phase === 'bet') {
          const n = Number(e.key);
          const sheet = document.querySelector('.bet-sheet');
          if (sheet && n >= 1 && n <= 3) {
            const b = sheet.querySelector(`[data-bet="${['guess', 'likely', 'sure'][n - 1]}"]`);
            if (b) {
              e.preventDefault();
              b.click();
            }
          }
          return;
        }
        if (phase === 'input' && keyHandler && keyHandler(e, onButton)) {
          e.preventDefault();
          return;
        }
        if (phase === 'reveal' && e.key === 'Enter' && !onButton && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }
      let keyHandler = null;
      document.addEventListener('keydown', onKey);
      ctx.onDestroy(() => {
        timers.forEach(clearTimeout);
        timers.clear();
        document.removeEventListener('keydown', onKey);
        phase = 'end';
      });

      const scrollTo = (el) => {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* old browsers */
        }
      };

      // ---------- the table ----------
      function setTable(r) {
        const s = r.spot;
        const toCome = s.street === 'flop' ? 2 : 1;
        boardEl.innerHTML =
          s.board.map((c, i) => cardHTML(c, ' g-pot-deal', i * 90 + 200)).join('') +
          Array.from({ length: 5 - s.board.length }, slotHTML).join('');
        heroEl.innerHTML = s.hole.map((c, i) => cardHTML(c, ' g-pot-card--big g-pot-deal', i * 90)).join('') +
          '<span class="g-pot-you label">You</span>';
        streetEl.textContent = `${s.street === 'flop' ? 'Flop' : 'Turn'} · ${toCome} card${toCome > 1 ? 's' : ''} to come`;
        if (r.type === 'C') {
          villainEl.innerHTML = `${backHTML(' g-pot-deal')}${backHTML(' g-pot-deal')}
            <span class="g-pot-vbet">${chipsHTML(r.price.bet)}<span class="g-pot-amt">${s.street === 'flop' ? 'All-in' : 'Bets'} ${money(r.price.bet)}</span></span>`;
          centreEl.innerHTML = `${chipsHTML(r.price.pot)}<span class="g-pot-amt g-pot-amt--pot">Pot ${money(r.price.pot)}</span>`;
          villainEl.hidden = false;
          centreEl.hidden = false;
        } else {
          villainEl.hidden = true;
          centreEl.hidden = true;
        }
        BG.fx.sound('pop');
      }

      // ---------- inputs ----------
      function stepper({ min, max, start, steps, unit, lockText }) {
        return new Promise((resolve) => {
          let v = start;
          inputEl.innerHTML = `
            <div class="card g-pot-pad">
              <div class="g-pot-steps">
                ${steps.filter((d) => d < 0).map((d) => `<button class="g-pot-sbtn" data-d="${d}" aria-label="${d}">${d === -1 ? '−' : `−${-d}`}</button>`).join('')}
                <output class="big-num g-pot-val" aria-live="polite"></output>
                ${steps.filter((d) => d > 0).map((d) => `<button class="g-pot-sbtn" data-d="${d}" aria-label="+${d}">+${d === 1 ? '' : d}</button>`).join('')}
              </div>
              <button class="btn btn--primary btn--block g-pot-lock">${lockText}</button>
              <p class="g-pot-hint muted">Tip: you can type a number and press Enter.</p>
            </div>`;
          const valEl = inputEl.querySelector('.g-pot-val');
          const show = () => {
            valEl.textContent = `${v}${unit}`;
          };
          const set = (x) => {
            v = Math.max(min, Math.min(max, x));
            show();
          };
          show();
          const done = () => {
            if (phase !== 'input') return;
            keyHandler = null;
            inputEl.querySelectorAll('button').forEach((b) => (b.disabled = true));
            inputEl.firstElementChild.classList.add('is-locked');
            BG.fx.sound('pick');
            BG.fx.haptic(20);
            resolve(v);
          };
          inputEl.firstElementChild.addEventListener('click', (e) => {
            if (phase !== 'input') return;
            const b = e.target.closest('.g-pot-sbtn');
            if (b) {
              set(v + Number(b.dataset.d));
              BG.fx.sound('tap');
              BG.fx.haptic();
              BG.fx.pop(valEl);
            } else if (e.target.closest('.g-pot-lock')) {
              done();
            }
          });
          keyHandler = (e, onButton) => {
            if (/^[0-9]$/.test(e.key)) {
              const now = performance.now();
              const d = Number(e.key);
              set(now - typed.at < 1200 && v * 10 + d <= max ? v * 10 + d : d);
              typed.at = now;
              BG.fx.sound('tick');
              return true;
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === '+') {
              set(v + 1);
              return true;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === '-') {
              set(v - 1);
              return true;
            }
            if (e.key === 'Backspace') {
              set(Math.floor(v / 10));
              return true;
            }
            if (e.key === 'Enter' && !onButton) {
              inputEl.querySelector('.g-pot-lock').click();
              return true;
            }
            return false;
          };
          phase = 'input';
        });
      }

      function callFold() {
        return new Promise((resolve) => {
          inputEl.innerHTML = `
            <div class="g-pot-cf">
              <button class="btn g-pot-fold" data-c="fold">🃏 Fold</button>
              <button class="btn btn--primary g-pot-call" data-c="call">🪙 Call</button>
            </div>`;
          const pick = (choice) => {
            if (phase !== 'input') return;
            keyHandler = null;
            inputEl.querySelectorAll('button').forEach((b) => {
              b.disabled = true;
              b.classList.toggle('is-picked', b.dataset.c === choice);
            });
            BG.fx.sound('pick');
            BG.fx.haptic(20);
            resolve(choice);
          };
          inputEl.firstElementChild.addEventListener('click', (e) => {
            const b = e.target.closest('[data-c]');
            if (b) pick(b.dataset.c);
          });
          keyHandler = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'c' || k === 'f') {
              pick(k === 'c' ? 'call' : 'fold');
              return true;
            }
            return false;
          };
          phase = 'input';
        });
      }

      // ---------- reveals ----------
      function gridHTML(spot) {
        const seen = new Set(spot.hole.concat(spot.board));
        const F = new Set(spot.flushOuts);
        const S = new Set(spot.straightOuts);
        const outs = new Set(spot.outs);
        let k = 0;
        const rows = [0, 1, 2, 3].map((s) => {
          const cells = [];
          for (let r = 12; r >= 0; r--) {
            const c = r * 4 + s;
            let cls = 'is-dim';
            if (seen.has(c)) cls = 'is-seen';
            else if (outs.has(c)) cls = F.has(c) && S.has(c) ? 'is-out is-both' : F.has(c) ? 'is-out is-flush' : 'is-out is-straight';
            const delay = cls.startsWith('is-out') ? ` style="--d:${(k++) * 45}ms"` : '';
            cells.push(`<span class="g-pot-gc ${cls}${s === 1 || s === 2 ? ' is-red' : ''}"${delay}>${RANK_SHOW[r]}<i>${SUITS[s]}&#xFE0E;</i></span>`);
          }
          return `<div class="g-pot-grow">${cells.join('')}</div>`;
        });
        const legend = [];
        if (spot.flushOuts.length && spot.straightOuts.length) {
          legend.push('<span><i class="g-pot-key is-flush"></i>flush</span>', '<span><i class="g-pot-key is-straight"></i>straight</span>', '<span><i class="g-pot-key is-both"></i>both</span>');
        } else legend.push(`<span><i class="g-pot-key ${spot.flushOuts.length ? 'is-flush' : 'is-straight'}"></i>out</span>`);
        legend.push('<span><i class="g-pot-key is-seen"></i>on the table</span>');
        return `<div class="g-pot-grid" role="img" aria-label="Deck of 52 with your ${spot.outs.length} outs highlighted">${rows.join('')}</div>
          <div class="g-pot-legend">${legend.join('')}</div>`;
      }

      function barsHTML(price, l1 = 'Need', l2 = 'You have') {
        const w = (v) => `${Math.max(1.5, Math.min(100, v)).toFixed(1)}%`;
        return `<div class="g-pot-bars" role="img" aria-label="${l1} ${price.required.toFixed(1)} percent, ${l2} ${price.equity.toFixed(1)} percent">
          <div class="g-pot-bar"><span class="g-pot-blabel">${l1}</span><span class="g-pot-btrack"><span class="g-pot-bfill g-pot-bfill--need" style="--w:${w(price.required)}"></span></span><b>${price.required.toFixed(1)}%</b></div>
          <div class="g-pot-bar"><span class="g-pot-blabel">${l2}</span><span class="g-pot-btrack"><span class="g-pot-bfill ${price.call ? 'g-pot-bfill--ok' : 'g-pot-bfill--bad'}" style="--w:${w(price.equity)}"></span></span><b>${price.equity.toFixed(1)}%</b></div>
        </div>`;
      }

      async function nextButton(i) {
        const btn = BG.el(`<button class="btn btn--primary btn--block g-pot-next">${i + 1 < TOTAL ? 'Next hand →' : 'Cash out 🏁'}</button>`);
        revealEl.appendChild(btn);
        btn.focus({ preventScroll: true });
        await new Promise((res) => {
          onEnter = res;
          btn.addEventListener('click', res, { once: true });
        });
        onEnter = null;
        if (ctx.alive) BG.fx.sound('tap');
      }

      // ---------- rounds ----------
      async function playRound(i) {
        const r = rounds[i];
        const s = r.spot;
        const K = KINDS[r.kind];
        const n = s.outs.length;
        ctx.setProgress(i + 1, TOTAL);
        phase = 'idle';
        roundEl.textContent = `Hand ${i + 1} of ${TOTAL}`;
        typeEl.textContent = TYPE_LABEL[r.type];
        revealEl.hidden = true;
        revealEl.innerHTML = '';
        inputEl.innerHTML = '';
        setTable(r);
        BG.fx.pop(typeEl);

        if (r.type === 'A') {
          qEl.innerHTML = `<span class="label">${BG.esc(K.label)}</span>
            <p class="g-pot-ask">How many unseen cards give you <b>${BG.esc(K.aim)}</b> on the next card?</p>`;
          const guess = await stepper({ min: 0, max: 20, start: 0, steps: [-1, 1], unit: '', lockText: 'Lock in my count 🔒' });
          if (!ctx.alive) return;
          phase = 'reveal';
          const diff = Math.abs(guess - n);
          const pts = diff === 0 ? PTS.aExact : diff === 1 ? PTS.aNear : 0;
          revealEl.innerHTML = `
            <div class="card g-pot-verdict ${diff === 0 ? 'is-ok' : diff === 1 ? 'is-near' : 'is-bad'}">
              <h3 class="g-pot-title">${diff === 0 ? `🎯 Exactly ${n} outs!` : `${diff === 1 ? '👌 So close:' : '🙈 It\'s'} ${n} outs (you said ${guess})`}</h3>
              ${gridHTML(s)}
              <p class="g-pot-eq">${BG.esc(outsWhy(s))}</p>
            </div>`;
          revealEl.hidden = false;
          const v = revealEl.querySelector('.g-pot-verdict');
          BG.fx.sound(diff === 0 ? 'good' : diff === 1 ? 'pop' : 'bad');
          if (diff > 1) BG.fx.shake(v);
          scrollTo(revealEl);
          if (pts) ctx.addScore(pts, v.querySelector('.g-pot-title'));
          log.push({ type: 'A', ok: diff === 0, label: `${K.label}: ${n} outs`, you: String(guess) });
          BG.track('pot_round', { type: 'A', kind: r.kind, guess, outs: n });
          await nextButton(i);
          return;
        }

        if (r.type === 'B') {
          const toCome = s.street === 'flop' ? 'two cards to come' : 'one card to come';
          qEl.innerHTML = `<span class="label">${BG.esc(K.label)} · ${n} outs</span>
            <p class="g-pot-ask">You have <b>${n} outs</b> with ${toCome}. Rule of ${s.street === 'flop' ? '4' : '2'}: what's your chance to hit?</p>`;
          const guess = await stepper({ min: 0, max: 100, start: 0, steps: [-5, -1, 1, 5], unit: '%', lockText: 'Lock in my estimate 🔒' });
          if (!ctx.alive) return;
          phase = 'reveal';
          const ew = equityWhy(n, s.street);
          const rule = ruleEstimate(n, s.street);
          const ok = Math.abs(guess - rule) <= 2 || Math.abs(guess - ew.ex) <= 2;
          revealEl.innerHTML = `
            <div class="card g-pot-verdict ${ok ? 'is-ok' : 'is-bad'}">
              <h3 class="g-pot-title">${ok ? '🧠 Nailed the rule!' : `🤔 You said ${guess}%`}</h3>
              <div class="g-pot-rows">
                <div><span class="label">Rule of ${s.street === 'flop' ? '4' : '2'}</span><b>${BG.esc(ew.rule)}</b></div>
                <div><span class="label">Exact</span><b>${BG.esc(ew.exact)}</b></div>
              </div>
              ${barsHTML({ required: rule, equity: ew.ex, call: true }, 'Rule', 'Exact')}
              <p class="g-pot-eq">${s.street === 'flop'
                ? 'Exact = 1 − chance both cards miss. The rule runs a bit high once you have more than 8 outs.'
                : 'Exact = outs ÷ 46 unseen cards. The rule of 2 is a touch low.'}</p>
            </div>`;
          revealEl.hidden = false;
          const v = revealEl.querySelector('.g-pot-verdict');
          BG.fx.sound(ok ? 'good' : 'bad');
          if (!ok) BG.fx.shake(v);
          scrollTo(revealEl);
          if (ok) ctx.addScore(PTS.b, v.querySelector('.g-pot-title'));
          log.push({ type: 'B', ok, label: `${n} outs, ${s.street}: ${ew.ex.toFixed(1)}%`, you: `${guess}%` });
          BG.track('pot_round', { type: 'B', kind: r.kind, guess, outs: n });
          await nextButton(i);
          return;
        }

        // C: call or fold
        const p = r.price;
        const toCome = s.street === 'flop' ? 'They are all-in, so you see both cards.' : 'One card to come.';
        qEl.innerHTML = `<span class="label">${BG.esc(K.label)} · ${n} outs</span>
          <p class="g-pot-ask">Pot is <b>${money(p.pot)}</b> (their bet included). Calling costs <b>${money(p.bet)}</b>. ${toCome} Call or fold?</p>
          <p class="g-pot-small muted">Assume hitting wins and missing loses.</p>`;
        const choice = await callFold();
        if (!ctx.alive) return;
        phase = 'bet';
        const bet = await ctx.bet(`How sure is your ${choice}?`);
        if (!ctx.alive) return;
        phase = 'reveal';
        const ok = (choice === 'call') === p.call;
        const tip = C_TIPS[i % C_TIPS.length];
        revealEl.innerHTML = `
          <div class="card g-pot-verdict ${ok ? 'is-ok' : 'is-bad'}">
            <h3 class="g-pot-title">${ok ? (p.call ? '✅ Good call!' : '✅ Good fold!') : p.call ? '❌ That was a call' : '❌ That was a fold'}</h3>
            ${barsHTML(p)}
            <p class="g-pot-eq">Need: ${money(p.bet)} ÷ (${money(p.pot)} + ${money(p.bet)}) = <b>${p.required.toFixed(1)}%</b>.
              You have ${n} outs → <b>${p.equity.toFixed(1)}%</b> (rule: ~${ruleEstimate(n, s.street)}%).
              ${p.call ? 'Equity beats the price: call.' : 'The price is too high: fold.'}</p>
            <p class="g-pot-tip">💡 ${BG.esc(tip)}</p>
            <div class="g-pot-points"></div>
          </div>`;
        revealEl.hidden = false;
        const v = revealEl.querySelector('.g-pot-verdict');
        const ptsEl = revealEl.querySelector('.g-pot-points');
        BG.fx.sound(ok ? 'good' : 'bad');
        if (!ok) BG.fx.shake(v);
        else if (p.call) BG.fx.pop(centreEl);
        scrollTo(revealEl);
        if (ok) {
          ctx.addScore(PTS.c, v.querySelector('.g-pot-title'));
          ptsEl.innerHTML = `<span class="chip chip--ok">+${PTS.c} ${choice}</span>`;
        }
        await wait(450);
        if (!ctx.alive) return;
        const delta = ctx.settleBet(bet, ok, v);
        ctx.addScore(delta);
        const b = BG.BETS[bet];
        ptsEl.insertAdjacentHTML('beforeend', `<span class="chip ${delta > 0 ? 'chip--ok' : delta < 0 ? '' : 'chip--blue'}">${b ? b.emoji : ''} bet ${delta > 0 ? '+' : ''}${delta}</span>`);
        log.push({ type: 'C', ok, label: `${money(p.bet)} into ${money(p.pot)}: ${p.call ? 'call' : 'fold'}`, you: choice });
        BG.track('pot_round', { type: 'C', kind: r.kind, choice, call: p.call, bet });
        await nextButton(i);
      }

      async function run() {
        for (let i = 0; i < TOTAL; i++) {
          await playRound(i);
          if (!ctx.alive) return;
        }
        phase = 'end';
        const cnt = (t) => log.filter((l) => l.type === t);
        const a = cnt('A');
        const bR = cnt('B');
        const c = cnt('C');
        const aOk = a.filter((l) => l.ok).length;
        const bOk = bR.filter((l) => l.ok).length;
        const cOk = c.filter((l) => l.ok).length;
        const all = aOk + bOk + cOk === TOTAL;
        ctx.setProgress(TOTAL + 1, TOTAL);
        roundEl.textContent = `${TOTAL} hands played`;
        typeEl.textContent = 'Cash out';
        inputEl.innerHTML = '';
        qEl.innerHTML = `<p class="g-pot-ask">${all ? '🏆 Perfect session at the table!' : '♠️ The table is closed. Here is your ledger.'}</p>`;
        villainEl.hidden = true;
        centreEl.hidden = false;
        centreEl.innerHTML = `${chipsHTML(1750)}<span class="g-pot-amt g-pot-amt--pot">${ctx.score > 0 ? ctx.score : 0} pts</span>`;
        revealEl.innerHTML = `
          <div class="card g-pot-ledger" role="list" aria-label="Session ledger">
            ${log.map((l, k) => `
              <div class="g-pot-lrow ${l.ok ? 'is-ok' : 'is-bad'}" role="listitem" style="--d:${k * 90}ms">
                <span class="g-pot-lmark">${l.ok ? '✓' : '✗'}</span>
                <span class="label">${l.type === 'A' ? 'Outs' : l.type === 'B' ? 'Equity' : 'Call?'}</span>
                <span class="g-pot-lname">${BG.esc(l.label)}</span>
                <span class="g-pot-lyou">${BG.esc(l.you)}</span>
              </div>`).join('')}
            <div class="g-pot-lsum">
              <span>Outs <b>${aOk}/${a.length}</b></span><span>Equity <b>${bOk}/${bR.length}</b></span><span>Calls <b>${cOk}/${c.length}</b></span>
            </div>
          </div>
          <button class="btn btn--primary btn--block g-pot-fin">See results</button>`;
        revealEl.hidden = false;
        if (all) {
          BG.fx.sound('win');
          BG.fx.confetti();
        } else BG.fx.sound(aOk + bOk + cOk >= 5 ? 'good' : 'lose');
        BG.fx.pop(revealEl.firstElementChild);
        scrollTo(revealEl);
        const fin = revealEl.querySelector('.g-pot-fin');
        fin.focus({ preventScroll: true });
        await new Promise((res) => {
          onEnter = res;
          phase = 'reveal';
          fin.addEventListener('click', res, { once: true });
        });
        onEnter = null;
        if (!ctx.alive) return;
        phase = 'end';
        ctx.finish({
          summary: `Counted outs ${aOk}/${a.length} · ${cOk}/${c.length} correct calls ♠️`,
          stats: { outsExact: aOk, outsRounds: a.length, equityOk: bOk, equityRounds: bR.length, callsOk: cOk, callRounds: c.length },
        });
      }

      run();
    },
  });
})();

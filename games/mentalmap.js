// Brain Gym: Lost in Town (mentalmap). A taxi driver with no GPS.
// Memorize a procedural town, then drive a fare through the fog from memory.
(() => {
  'use strict';

  const LANDMARKS = [
    { e: '🏥', n: 'Hospital' },
    { e: '🏫', n: 'School' },
    { e: '☕', n: 'Café' },
    { e: '🏦', n: 'Bank' },
    { e: '🌳', n: 'Park' },
    { e: '🍕', n: 'Pizza' },
    { e: '🚉', n: 'Station' },
    { e: '📮', n: 'Post office' },
    { e: '🏟️', n: 'Stadium' },
    { e: '🎬', n: 'Cinema' },
    { e: '🛕', n: 'Temple' },
    { e: '🧁', n: 'Bakery' },
  ];

  const ROUNDS = [
    { n: 5, minTrip: 4, mem: 12, lm: 8 },
    { n: 6, minTrip: 6, mem: 14, lm: 9 },
    { n: 7, minTrip: 8, mem: 16, lm: 10 },
  ];

  const DIRS = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
  const DIR_WORD = { N: 'north', E: 'east', S: 'south', W: 'west' };
  const BLOCKED = { lake: '🌊', build: '🏗️' };

  // ---------- Pure generation logic (also testable in node) ----------
  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const isBlocked = (cell) => cell.t === 'lake' || cell.t === 'build';

  function neighbours(n, i) {
    const r = Math.floor(i / n);
    const c = i % n;
    const out = [];
    Object.keys(DIRS).forEach((d) => {
      const nr = r + DIRS[d][0];
      const nc = c + DIRS[d][1];
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) out.push(nr * n + nc);
    });
    return out;
  }

  function bfs(town, from) {
    const { n, cells } = town;
    const dist = new Array(n * n).fill(-1);
    dist[from] = 0;
    const q = [from];
    for (let h = 0; h < q.length; h++) {
      const cur = q[h];
      neighbours(n, cur).forEach((j) => {
        if (dist[j] === -1 && !isBlocked(cells[j])) {
          dist[j] = dist[cur] + 1;
          q.push(j);
        }
      });
    }
    return dist;
  }

  function manhattan(n, a, b) {
    return Math.abs(Math.floor(a / n) - Math.floor(b / n)) + Math.abs((a % n) - (b % n));
  }
  function euclid(n, a, b) {
    return Math.hypot(Math.floor(a / n) - Math.floor(b / n), (a % n) - (b % n));
  }

  function fillTown(n, order, blockedCount, lmCount, rand) {
    const cells = [];
    for (let i = 0; i < n * n; i++) cells.push({ t: 'road', lm: null });
    const names = shuffle(LANDMARKS, rand).slice(0, lmCount);
    const lmIdx = [];
    order.forEach((idx, k) => {
      if (k < blockedCount) {
        cells[idx].t = rand() < 0.55 ? 'lake' : 'build';
      } else if (k < blockedCount + lmCount) {
        cells[idx].lm = names[k - blockedCount];
        cells[idx].t = 'plaza';
        lmIdx.push(idx);
      } else {
        const x = rand();
        cells[idx].t = x < 0.68 ? 'road' : x < 0.86 ? 'park' : 'plaza';
      }
    });
    return { n, cells, landmarks: lmIdx };
  }

  // Questions about the memorized map. Returns null if none is unambiguous.
  function makeQuestion(town, rand) {
    const { n, cells, landmarks } = town;
    const lmName = (i) => `${cells[i].lm.e} ${cells[i].lm.n}`;
    const dirCands = [];
    landmarks.forEach((i) => {
      Object.keys(DIRS).forEach((d) => {
        const r = Math.floor(i / n) + DIRS[d][0];
        const c = (i % n) + DIRS[d][1];
        if (r < 0 || r >= n || c < 0 || c >= n) return;
        const j = r * n + c;
        if (cells[j].lm) dirCands.push({ from: i, dir: d, ans: j });
      });
    });
    const closeCands = [];
    landmarks.forEach((a) => {
      landmarks.forEach((b) => {
        landmarks.forEach((c) => {
          if (a === b || a === c || b >= c) return;
          const mb = manhattan(n, a, b);
          const mc = manhattan(n, a, c);
          const eb = euclid(n, a, b);
          const ec = euclid(n, a, c);
          // Unambiguous under both block distance and straight-line distance.
          if (Math.abs(mb - mc) >= 2 && Math.abs(eb - ec) >= 0.75 && (mb < mc) === (eb < ec)) {
            closeCands.push({ a, b, c, near: mb < mc ? b : c, mb, mc });
          }
        });
      });
    });

    const useDir = dirCands.length && (!closeCands.length || rand() < 0.45);
    if (useDir) {
      const q = dirCands[Math.floor(rand() * dirCands.length)];
      const others = shuffle(landmarks.filter((i) => i !== q.from && i !== q.ans), rand).slice(0, 2);
      const opts = shuffle([q.ans, ...others], rand);
      return {
        kind: 'dir',
        text: `What's directly ${DIR_WORD[q.dir]} of the ${lmName(q.from)}?`,
        options: opts.map((i) => ({ idx: i, label: lmName(i) })),
        answer: opts.indexOf(q.ans),
        highlight: [q.from, q.ans],
        explain: `${lmName(q.ans)} sits right ${DIR_WORD[q.dir]} of the ${lmName(q.from)}.`,
      };
    }
    if (closeCands.length) {
      const q = closeCands[Math.floor(rand() * closeCands.length)];
      const opts = shuffle([q.b, q.c], rand);
      const far = q.near === q.b ? q.c : q.b;
      const dn = Math.min(q.mb, q.mc);
      const df = Math.max(q.mb, q.mc);
      return {
        kind: 'closer',
        text: `Which is closer to the ${lmName(q.a)}?`,
        options: opts.map((i) => ({ idx: i, label: lmName(i) })),
        answer: opts.indexOf(q.near),
        highlight: [q.a, q.b, q.c],
        explain: `${lmName(q.near)} is ${dn} blocks away, ${lmName(far)} is ${df}.`,
      };
    }
    return null;
  }

  function generateTown(cfg, rand) {
    const { n, minTrip, lm } = cfg;
    const blockedCount = Math.round(n * n * 0.15);
    for (let attempt = 0; attempt < 400; attempt++) {
      const order = shuffle(Array.from({ length: n * n }, (_, i) => i), rand);
      const town = fillTown(n, order, blockedCount, lm, rand);
      const walk = town.cells.map((c, i) => i).filter((i) => !isBlocked(town.cells[i]));
      const d0 = bfs(town, walk[0]);
      if (walk.some((i) => d0[i] < 0)) continue; // disconnected
      const pairs = [];
      town.landmarks.forEach((a) => {
        const d = bfs(town, a);
        town.landmarks.forEach((b) => {
          if (a !== b && d[b] >= minTrip) pairs.push([a, b, d[b]]);
        });
      });
      if (!pairs.length) continue;
      const [start, dest, opt] = pairs[Math.floor(rand() * pairs.length)];
      Object.assign(town, { start, dest, opt });
      town.question = makeQuestion(town, rand);
      if (!town.question) continue;
      town.attempts = attempt + 1;
      return town;
    }
    // Fallback: no obstacles, fare from one corner to the other.
    const corners = [0, n * n - 1];
    const rest = shuffle(Array.from({ length: n * n }, (_, i) => i).filter((i) => !corners.includes(i)), rand);
    const town = fillTown(n, [...corners, ...rest], 0, lm, rand);
    Object.assign(town, { start: 0, dest: n * n - 1, opt: 2 * (n - 1), fallback: true });
    town.question = makeQuestion(town, rand);
    return town;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateTown, makeQuestion, bfs, manhattan, euclid, ROUNDS, isBlocked };
  }
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------- Game ----------
  const BG = window.BG;

  BG.registerGame({
    id: 'mentalmap',
    name: 'Lost in Town',
    emoji: '🗺️',
    skill: 'Mental maps',
    tagline: 'Your GPS is dead. The passenger is in a hurry. Drive from memory.',
    howTo: [
      'Memorize the town map before the timer runs out.',
      'Drive the fare through the fog: D-pad, arrow keys or swipe.',
      'Bumping into lakes, building sites or the edge costs 10 points.',
      'Then answer a quick question about the map and bet on it.',
    ],
    science:
      'People who relied more on GPS had worse spatial memory, and their hippocampus-dependent memory declined more steeply over 3 years (Dahmani & Bohbot, Scientific Reports 2020).',
    scienceUrl: 'https://www.nature.com/articles/s41598-020-62877-0',
    minutes: 3,
    maxScore: 580,

    mount(root, ctx) {
      const towns = ROUNDS.map((cfg) => generateTown(cfg, ctx.rand));
      const wrap = BG.el('<div class="g-mentalmap"></div>');
      root.appendChild(wrap);

      let onKey = null;
      let currentTimer = null;
      let peekTimer = null;
      const onKeyDown = (e) => {
        if (!onKey || e.altKey || e.ctrlKey || e.metaKey) return;
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const map = {
          ArrowUp: 'N', ArrowRight: 'E', ArrowDown: 'S', ArrowLeft: 'W',
          w: 'N', d: 'E', s: 'S', a: 'W', W: 'N', D: 'E', S: 'S', A: 'W',
        };
        const dir = map[e.key];
        if (!dir) return;
        e.preventDefault();
        onKey(dir);
      };
      window.addEventListener('keydown', onKeyDown);
      ctx.onDestroy(() => {
        window.removeEventListener('keydown', onKeyDown);
        onKey = null;
        if (currentTimer) currentTimer.stop();
        clearTimeout(peekTimer);
      });

      const stats = { perfect: 0, bumps: 0, peeks: 0 };
      const lmLabel = (cell) => `${cell.lm.e} ${BG.esc(cell.lm.n)}`;

      async function playRound(ri) {
        const cfg = ROUNDS[ri];
        const town = towns[ri];
        const { n, cells } = town;
        const startCell = cells[town.start];
        const destCell = cells[town.dest];
        ctx.setProgress(ri + 1, ROUNDS.length);

        wrap.innerHTML = `
          <div class="mm-top">
            <div class="mm-fare card">
              <div class="label">Fare ${ri + 1} of ${ROUNDS.length} · ${n}×${n} town</div>
              <div class="mm-fare-line">Next fare: <b>${lmLabel(startCell)}</b> → <b>${lmLabel(destCell)}</b></div>
            </div>
            <div class="mm-compass" aria-label="Compass: north is up">
              <span class="mm-c-n">N</span><span class="mm-c-e">E</span><span class="mm-c-s">S</span><span class="mm-c-w">W</span>
              <span class="mm-c-needle"></span>
            </div>
          </div>
          <p class="mm-msg"></p>
          <div class="mm-timer"></div>
          <div class="panel mm-board mm-board--labels" style="--n:${n}" aria-hidden="true">
            ${cells.map((cell, i) => `
              <div class="mm-tile mm-t-${cell.t}${cell.lm ? ' mm-lm' : ''}" data-i="${i}">
                ${cell.lm ? `<span class="mm-emoji">${cell.lm.e}</span><span class="mm-lbl">${BG.esc(cell.lm.n)}</span>` : ''}
                ${BLOCKED[cell.t] ? `<span class="mm-emoji">${BLOCKED[cell.t]}</span>` : ''}
              </div>`).join('')}
          </div>
          <div class="mm-controls"></div>`;

        const msg = wrap.querySelector('.mm-msg');
        const board = wrap.querySelector('.mm-board');
        const controls = wrap.querySelector('.mm-controls');
        const fareLine = wrap.querySelector('.mm-fare-line');
        const tiles = Array.from(board.querySelectorAll('.mm-tile'));
        const taxi = BG.el('<span class="mm-taxi">🚕</span>');

        let pos = town.start;
        let moves = 0;
        let peeked = false;
        let peeking = false;
        let driving = false;
        let revealAll = true;
        const visited = new Set([town.start]);
        const near = (i) => i === pos || neighbours(n, pos).includes(i);

        function render() {
          tiles.forEach((el, i) => {
            const shown = revealAll || peeking || near(i);
            el.classList.toggle('is-fog', !shown);
            el.classList.toggle('is-near', driving && !peeking && near(i) && i !== pos);
            el.classList.toggle('is-visited', visited.has(i) && i !== pos && !revealAll);
          });
          board.classList.toggle('mm-board--peek', peeking);
          if (taxi.parentNode !== tiles[pos]) tiles[pos].appendChild(taxi);
        }
        render();

        // ----- Phase 1: memorize -----
        msg.textContent = 'Memorize the town. Where are the pickup and the drop-off?';
        controls.innerHTML = '<button class="btn btn--primary btn--block mm-ready">Ready, I know the way 🚕</button>';
        const readyBtn = controls.querySelector('.mm-ready');
        let readyResolve;
        const ready = new Promise((r) => (readyResolve = r));
        readyBtn.addEventListener('click', () => readyResolve('ready'));
        currentTimer = BG.timerBar(wrap.querySelector('.mm-timer'), cfg.mem);
        const how = await Promise.race([currentTimer.done, ready]);
        if (!ctx.alive) return;
        const elapsed = currentTimer.elapsed();
        currentTimer.stop();
        currentTimer.el.remove();
        currentTimer = null;
        if (how === 'ready') {
          BG.fx.sound('pick');
          const bonus = Math.max(0, Math.floor(cfg.mem - elapsed));
          if (bonus > 0) ctx.addScore(bonus, readyBtn);
        }

        // ----- Phase 2: drive -----
        revealAll = false;
        driving = true;
        board.classList.remove('mm-board--labels');
        board.classList.add('mm-board--fog');
        fareLine.innerHTML = `Drop off at <b>${lmLabel(destCell)}</b> · GPS: <span class="mm-nogps">offline</span>`;
        msg.textContent = 'No GPS. Drive from memory. You only see the next block.';
        controls.innerHTML = `
          <div class="mm-drive">
            <div class="mm-side">
              <div class="label">Moves</div>
              <div class="big-num mm-moves">0</div>
            </div>
            <div class="mm-dpad">
              <button class="mm-d mm-d-n" data-dir="N" aria-label="Drive north">▲</button>
              <button class="mm-d mm-d-w" data-dir="W" aria-label="Drive west">◀</button>
              <span class="mm-d-hub">🚕</span>
              <button class="mm-d mm-d-e" data-dir="E" aria-label="Drive east">▶</button>
              <button class="mm-d mm-d-s" data-dir="S" aria-label="Drive south">▼</button>
            </div>
            <div class="mm-side">
              <button class="mm-peek" aria-label="Peek at the full map for 2 seconds, costs 30 points">
                <span class="mm-peek-e">👀</span><span class="mm-peek-t">Peek −30</span>
              </button>
            </div>
          </div>`;
        const movesEl = controls.querySelector('.mm-moves');
        const peekBtn = controls.querySelector('.mm-peek');
        render();
        BG.fx.sound('pop');

        let arriveResolve;
        const arrived = new Promise((r) => (arriveResolve = r));

        function bonk(target) {
          stats.bumps += 1;
          BG.fx.sound('bad');
          BG.fx.haptic(40);
          const taxiTile = tiles[pos];
          ctx.addScore(-10, taxiTile);
          BG.fx.shake(taxiTile);
          if (target == null) {
            BG.fx.shake(board);
          } else {
            BG.fx.anim(tiles[target], cells[target].t === 'lake' ? 'mm-splash' : 'mm-bonk');
          }
        }

        function tryMove(dir) {
          if (!driving || peeking) return;
          const r = Math.floor(pos / n) + DIRS[dir][0];
          const c = (pos % n) + DIRS[dir][1];
          if (r < 0 || r >= n || c < 0 || c >= n) return bonk(null);
          const j = r * n + c;
          if (isBlocked(cells[j])) return bonk(j);
          BG.fx.sound('tap');
          visited.add(pos);
          pos = j;
          moves += 1;
          movesEl.textContent = String(moves);
          render();
          BG.fx.anim(taxi, 'mm-hop');
          if (pos === town.dest) {
            driving = false;
            arriveResolve();
          }
        }
        onKey = tryMove;

        controls.querySelector('.mm-dpad').addEventListener('click', (e) => {
          const b = e.target.closest('[data-dir]');
          if (b) tryMove(b.dataset.dir);
        });

        // Swipe on the map (or tap a neighbouring tile).
        let ptr = null;
        board.addEventListener('pointerdown', (e) => {
          ptr = { x: e.clientX, y: e.clientY, id: e.pointerId };
        });
        board.addEventListener('pointerup', (e) => {
          if (!ptr || ptr.id !== e.pointerId) return;
          const dx = e.clientX - ptr.x;
          const dy = e.clientY - ptr.y;
          ptr = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) >= 24) {
            tryMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : dy > 0 ? 'S' : 'N');
            return;
          }
          const t = e.target.closest('.mm-tile');
          if (!t) return;
          const i = Number(t.dataset.i);
          const dir = Object.keys(DIRS).find((d) => {
            const r = Math.floor(pos / n) + DIRS[d][0];
            const c = (pos % n) + DIRS[d][1];
            return r >= 0 && r < n && c >= 0 && c < n && r * n + c === i;
          });
          if (dir) tryMove(dir);
        });
        board.addEventListener('pointercancel', () => (ptr = null));

        peekBtn.addEventListener('click', () => {
          if (peeked || !driving) return;
          peeked = true;
          peeking = true;
          stats.peeks += 1;
          peekBtn.disabled = true;
          BG.fx.sound('pop');
          ctx.addScore(-30, peekBtn);
          board.classList.add('mm-board--labels');
          render();
          peekTimer = setTimeout(() => {
            if (!ctx.alive) return;
            peeking = false;
            board.classList.remove('mm-board--labels');
            render();
          }, 2000);
        });

        await arrived;
        if (!ctx.alive) return;
        onKey = null;
        clearTimeout(peekTimer);
        peeking = false;
        render();

        // ----- Arrival -----
        const destTile = tiles[town.dest];
        destTile.classList.add('is-arrived');
        BG.fx.pop(destTile);
        BG.fx.sound('honk');
        BG.fx.haptic(30);
        controls.querySelectorAll('button').forEach((b) => (b.disabled = true));
        const extra = moves - town.opt;
        const perfect = extra <= 0;
        const tripPts = Math.max(20, 100 - 8 * Math.max(0, extra));
        if (perfect) stats.perfect += 1;
        await BG.sleep(350);
        if (!ctx.alive) return;
        ctx.addScore(tripPts, destTile);
        controls.innerHTML = `
          <div class="mm-result card">
            <div class="mm-result-head">🚕 Dropped off at ${lmLabel(destCell)}!
              ${perfect ? '<span class="chip chip--gold mm-badge">✨ Perfect route!</span>' : ''}</div>
            <div class="muted">${moves} moves · shortest route ${town.opt} · <b>+${tripPts}</b></div>
          </div>`;
        if (perfect) BG.fx.pop(controls.querySelector('.mm-badge'));
        msg.textContent = perfect ? 'Not a single wasted block. The passenger tips well.' : 'Made it! The meter ran a little long.';
        await BG.sleep(1100);
        if (!ctx.alive) return;

        // ----- Spatial question -----
        const q = town.question;
        if (q) {
          msg.textContent = 'Quick one for the dispatcher, from memory:';
          const qCard = BG.el(`
            <div class="mm-q card">
              <p class="mm-q-text">${BG.esc(q.text)}</p>
              <div class="mm-q-opts">
                ${q.options.map((o, k) => `<button class="btn btn--ghost btn--block mm-opt" data-k="${k}">${BG.esc(o.label)}</button>`).join('')}
              </div>
            </div>`);
          controls.appendChild(qCard);
          qCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          const pick = await new Promise((resolve) => {
            qCard.querySelector('.mm-q-opts').addEventListener('click', (e) => {
              const b = e.target.closest('[data-k]');
              if (b) resolve(Number(b.dataset.k));
            });
          });
          if (!ctx.alive) return;
          const btns = Array.from(qCard.querySelectorAll('.mm-opt'));
          btns.forEach((b) => (b.disabled = true));
          btns[pick].classList.add('is-picked');
          BG.fx.sound('pick');
          const bet = await ctx.bet('How sure are you?');
          if (!ctx.alive) return;
          const correct = pick === q.answer;
          btns[q.answer].classList.add('is-right');
          if (!correct) btns[pick].classList.add('is-wrong');
          if (correct) {
            BG.fx.sound('good');
            ctx.addScore(40, btns[pick]);
          } else {
            BG.fx.sound('bad');
            BG.fx.shake(btns[pick]);
          }
          await BG.sleep(450);
          if (!ctx.alive) return;
          ctx.addScore(ctx.settleBet(bet, correct, qCard.querySelector('.mm-q-text')));

          // Reveal the town with the relevant spots highlighted.
          revealAll = true;
          board.classList.remove('mm-board--fog');
          board.classList.add('mm-board--labels');
          render();
          q.highlight.forEach((i) => tiles[i].classList.add('is-hl'));
          qCard.appendChild(BG.el(`<p class="mm-explain">${correct ? '✅' : '❌'} ${BG.esc(q.explain)}</p>`));
        } else {
          revealAll = true;
          board.classList.remove('mm-board--fog');
          board.classList.add('mm-board--labels');
          render();
        }

        const last = ri === ROUNDS.length - 1;
        const next = BG.el(`<button class="btn btn--primary btn--block mm-next">${last ? 'Finish shift 🏁' : 'Next fare →'}</button>`);
        controls.appendChild(next);
        next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await new Promise((r) => next.addEventListener('click', r, { once: true }));
        if (!ctx.alive) return;
        BG.fx.sound('tap');
      }

      (async () => {
        for (let ri = 0; ri < ROUNDS.length; ri++) {
          await playRound(ri);
          if (!ctx.alive) return;
        }
        const all = stats.perfect === ROUNDS.length;
        if (all) BG.fx.confetti();
        BG.track('mentalmap_done', { perfect: stats.perfect, bumps: stats.bumps, peeks: stats.peeks });
        const pr = `${stats.perfect} perfect route${stats.perfect === 1 ? '' : 's'}`;
        ctx.finish({
          summary: all ? `3 fares, all perfect routes. Human GPS 🚕` : `3 fares, ${pr} 🚕`,
          stats: { perfect: stats.perfect, bumps: stats.bumps, peeks: stats.peeks },
        });
      })();
    },
  });
})();

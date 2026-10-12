// Datewise: order five events oldest → newest. Warm-up game.
(() => {
  'use strict';

  const MAX_TRIES = 4;
  const SIZE = 5;
  const TRY_POINTS = [100, 75, 50, 30];
  const CATS = {
    history: ['History', '🏛️'], india: ['India', '🪔'], science: ['Science', '🔬'], space: ['Space', '🚀'],
    tech: ['Tech', '💡'], film: ['Film & TV', '🎬'], music: ['Music', '🎵'], sport: ['Sport', '🏆'],
    landmark: ['Landmarks', '🗼'], culture: ['Culture', '📚'], games: ['Games', '🎮'],
  };

  const POOL = (window.DATEWISE_EVENTS || []).map((e, i) => ({ id: i, title: e[0], year: e[1], cat: e[2] }));
  const DAILY_ORDER = BG.shuffle(POOL, BG.rng(BG.hash('datewise')));

  const fmtYear = (y) => (y < 0 ? `${-y} BC` : String(y));

  function pickDistinct(list, start) {
    const out = [];
    const years = new Set();
    for (let k = 0; k < list.length && out.length < SIZE; k++) {
      const ev = list[(start + k) % list.length];
      if (years.has(ev.year)) continue;
      years.add(ev.year);
      out.push(ev);
    }
    return out;
  }

  function scramble(ids, correct, rand) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const s = BG.shuffle(ids, rand);
      if (s.every((id, i) => id !== correct[i])) return s;
    }
    return ids.slice().reverse();
  }

  function mount(root, ctx) {
    const events = ctx.mode === 'daily'
      ? pickDistinct(DAILY_ORDER, ((ctx.day - 1) * SIZE) % DAILY_ORDER.length)
      : pickDistinct(BG.shuffle(POOL, ctx.rand), 0);
    const byId = new Map(events.map((e) => [e.id, e]));
    const correct = events.slice().sort((a, b) => a.year - b.year).map((e) => e.id);
    let order = scramble(events.map((e) => e.id), correct, ctx.rand);
    const hints = {};
    const tries = [];
    let done = false;
    let selected = null;
    let busy = false;

    root.innerHTML = `
      <div class="dw-board panel">
        <div class="dw-axis"><span>▲</span> Older</div>
        <ol class="dw-cards"></ol>
        <div class="dw-axis"><span>▼</span> Newer</div>
      </div>
      <div class="dw-history" aria-label="Previous tries"></div>
      <button class="btn btn--primary btn--block dw-lock">Lock in</button>
      <p class="dw-tip muted">Drag a card onto another to swap, or tap two cards.</p>`;

    const list = root.querySelector('.dw-cards');
    const lockBtn = root.querySelector('.dw-lock');
    const histEl = root.querySelector('.dw-history');
    const els = new Map();

    order.forEach((id) => {
      const ev = byId.get(id);
      const [label, emoji] = CATS[ev.cat] || CATS.history;
      const li = BG.el(`
        <li class="dw-card" tabindex="0" data-id="${id}">
          <span class="dw-emoji" aria-hidden="true">${emoji}</span>
          <span class="dw-body"><span class="dw-title"></span><span class="dw-cat">${label}</span></span>
          <span class="dw-side"><span class="dw-hint"></span><span class="dw-year">${fmtYear(ev.year)}</span><span class="dw-grip" aria-hidden="true">⋮⋮</span></span>
        </li>`);
      li.querySelector('.dw-title').textContent = ev.title;
      list.appendChild(li);
      els.set(id, li);
    });

    ctx.setProgress(1, MAX_TRIES);

    const locked = (id) => done || hints[id] === 'ok';

    function paint() {
      order.forEach((id, i) => {
        const el = els.get(id);
        const h = hints[id];
        el.classList.toggle('is-ok', h === 'ok');
        el.classList.toggle('is-up', h === 'up');
        el.classList.toggle('is-down', h === 'down');
        el.classList.toggle('is-selected', selected === id);
        el.classList.toggle('is-revealed', done);
        el.classList.toggle('is-missed', done && h !== 'ok');
        el.querySelector('.dw-hint').textContent = h === 'ok' ? '✓' : h === 'up' ? '↑' : h === 'down' ? '↓' : '';
        el.setAttribute('aria-label', `${i + 1}. ${byId.get(id).title}${h === 'ok' ? ', locked' : h === 'up' ? ', belongs higher' : h === 'down' ? ', belongs lower' : ''}`);
      });
      histEl.innerHTML = tries.map((m) => `<div class="dw-hrow">${m.map((x) => `<span class="dw-hcell ${x === 'ok' ? 'ok' : ''}"></span>`).join('')}</div>`).join('');
      lockBtn.hidden = done;
      root.querySelector('.dw-tip').hidden = done;
    }

    function flip(mutate) {
      const items = [...list.children];
      const first = new Map(items.map((el) => [el, el.getBoundingClientRect()]));
      mutate();
      items.forEach((el) => {
        const a = first.get(el);
        const b = el.getBoundingClientRect();
        const dx = a.left - b.left;
        const dy = a.top - b.top;
        if (!dx && !dy) return;
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.style.transition = 'transform 280ms cubic-bezier(.2,.8,.2,1)';
          el.style.transform = '';
        }));
      });
    }

    const syncDom = () => order.forEach((id) => list.appendChild(els.get(id)));

    function swap(a, b) {
      if (a === b || locked(a) || locked(b)) return false;
      const i = order.indexOf(a);
      const j = order.indexOf(b);
      order[i] = b;
      order[j] = a;
      delete hints[a];
      delete hints[b];
      flip(syncDom);
      BG.fx.sound('tap');
      BG.fx.haptic(8);
      return true;
    }

    // Tap-to-swap + drag-to-swap
    let drag = null;
    const clearTargets = () => list.querySelectorAll('.is-target').forEach((el) => el.classList.remove('is-target'));

    list.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.dw-card');
      if (!card || busy || e.button > 0) return;
      const id = Number(card.dataset.id);
      if (locked(id)) {
        if (!done) BG.fx.shake(card);
        return;
      }
      drag = { id, card, x: e.clientX, y: e.clientY, moved: false, target: null, pid: e.pointerId };
      card.setPointerCapture(e.pointerId);
    });

    list.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pid) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < 6) return;
        drag.moved = true;
        selected = null;
        paint();
        drag.card.classList.add('is-dragging');
      }
      drag.card.style.transform = `translate(${dx}px, ${dy}px) scale(1.02)`;
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const t = under && under.closest('.dw-card');
      const tid = t ? Number(t.dataset.id) : null;
      const ok = t && tid !== drag.id && !locked(tid);
      if ((ok ? tid : null) !== drag.target) {
        clearTargets();
        drag.target = ok ? tid : null;
        if (ok) t.classList.add('is-target');
      }
    });

    function endDrag(e, cancel) {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag;
      drag = null;
      clearTargets();
      if (!d.moved) {
        if (!cancel) tap(d.id);
        return;
      }
      if (d.target != null && !cancel) {
        const i = order.indexOf(d.id);
        const j = order.indexOf(d.target);
        order[i] = d.target;
        order[j] = d.id;
        delete hints[d.id];
        delete hints[d.target];
        flip(() => {
          d.card.classList.remove('is-dragging');
          d.card.style.transform = '';
          syncDom();
        });
        BG.fx.sound('tap');
        BG.fx.haptic(8);
        paint();
      } else {
        flip(() => {
          d.card.classList.remove('is-dragging');
          d.card.style.transform = '';
        });
      }
    }
    list.addEventListener('pointerup', (e) => endDrag(e, false));
    list.addEventListener('pointercancel', (e) => endDrag(e, true));

    function tap(id) {
      if (done || busy || locked(id)) return;
      if (selected == null) {
        selected = id;
        BG.fx.sound('pick');
      } else if (selected === id) {
        selected = null;
      } else {
        const other = selected;
        selected = null;
        swap(other, id);
      }
      paint();
    }

    list.addEventListener('keydown', (e) => {
      const card = e.target.closest('.dw-card');
      if (!card || done || busy) return;
      const id = Number(card.dataset.id);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        tap(id);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const i = order.indexOf(id);
        const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
        if (j >= 0 && j < order.length && swap(id, order[j])) {
          paint();
          els.get(id).focus();
        }
      }
    });

    lockBtn.addEventListener('click', async () => {
      if (done || busy) return;
      busy = true;
      selected = null;
      const marks = order.map((id, i) => (id === correct[i] ? 'ok' : correct.indexOf(id) < i ? 'up' : 'down'));
      const solved = marks.every((m) => m === 'ok');

      // Confidence bet on the first lock-in only.
      let betKey = null;
      if (tries.length === 0) {
        betKey = await ctx.bet('Is every card in the right spot?');
        if (!ctx.alive) return;
      }

      tries.push(marks);
      order.forEach((id, i) => { hints[id] = marks[i]; });
      paint();
      order.forEach((id, i) => {
        setTimeout(() => (marks[i] === 'ok' ? BG.fx.pop(els.get(id)) : BG.fx.shake(els.get(id))), i * 70);
      });
      BG.fx.sound(solved ? 'good' : marks.some((m) => m === 'ok') ? 'pick' : 'bad');

      if (betKey) ctx.addScore(ctx.settleBet(betKey, solved, lockBtn));

      if (solved) {
        ctx.addScore(TRY_POINTS[tries.length - 1], list);
      }
      if (solved || tries.length >= MAX_TRIES) {
        done = true;
        ctx.setProgress(MAX_TRIES + 1, MAX_TRIES);
        await BG.sleep(700);
        if (!ctx.alive) return;
        const last = tries[tries.length - 1];
        const lastOrder = order.slice();
        Object.keys(hints).forEach((k) => delete hints[k]);
        lastOrder.forEach((id, i) => { if (last[i] === 'ok') hints[id] = 'ok'; });
        flip(() => {
          order = correct.slice();
          syncDom();
        });
        paint();
        if (solved && tries.length === 1) BG.fx.confetti();
        await BG.sleep(1600);
        if (!ctx.alive) return;
        ctx.finish({
          summary: solved ? `Timeline sorted in ${tries.length} ${tries.length === 1 ? 'try' : 'tries'} 📅` : 'History got the better of you today 📅',
          stats: { tries: tries.length, solved },
        });
        return;
      }
      ctx.setProgress(tries.length + 1, MAX_TRIES);
      busy = false;
    });

    paint();
  }

  BG.registerGame({
    id: 'datewise',
    name: 'Datewise',
    emoji: '📅',
    skill: 'Recalling what you know',
    tagline: 'Five moments in history. Put them in order.',
    howTo: [
      'Order the events from oldest (top) to newest (bottom).',
      'Drag a card onto another, or tap two cards, to swap them.',
      'Green cards lock. Arrows show where the others belong. You get 4 tries.',
    ],
    science: 'Pulling an answer out of your own memory (retrieval practice) is one of the most effective ways to learn, far better than looking it up again (Dunlosky et al. 2013).',
    scienceUrl: 'https://journals.sagepub.com/doi/10.1177/1529100612453266',
    minutes: 1,
    maxScore: 140,
    mount,
  });
})();

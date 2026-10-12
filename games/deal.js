// Brain Gym game: "Better Deal" (id 'deal').
// Supermarket sweep: two price tags, one is the smarter buy. Tap it before the clock runs out.
// Every round is generated procedurally with exact (BigInt rational) arithmetic.
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pure engine (no DOM). Exported for node tests at the bottom.
  // ---------------------------------------------------------------------------
  const ri = (a, b, rand) => a + Math.floor(rand() * (b - a + 1));
  const pk = (arr, rand) => arr[Math.floor(rand() * arr.length)];
  const big = (x) => BigInt(x);

  // Rationals {n, d} with BigInt parts, d > 0, values always positive here.
  const R = (n, d = 1) => ({ n: big(n), d: big(d) });
  const cmp = (a, b) => {
    const l = a.n * b.d;
    const r = b.n * a.d;
    return l < r ? -1 : l > r ? 1 : 0;
  };
  // At least 3% apart: max >= 1.03 × min.
  const gapOK = (a, b, pct = 3) => {
    const [lo, hi] = cmp(a, b) <= 0 ? [a, b] : [b, a];
    return hi.n * lo.d * 100n >= lo.n * hi.d * big(100 + pct);
  };
  const ratioBelow = (a, b, pct) => !gapOK(a, b, pct); // max < (1+pct/100) × min
  const toNum = (r) => Number((r.n * 1000000n) / r.d) / 1000000;

  // ---------- formatting ----------
  function group(n) {
    // Indian digit grouping: 1,23,456
    const s = String(Math.abs(n));
    if (s.length <= 3) return (n < 0 ? '-' : '') + s;
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    const parts = [];
    while (rest.length > 2) {
      parts.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) parts.unshift(rest);
    return (n < 0 ? '-' : '') + parts.join(',') + ',' + last3;
  }
  // Exact price in paise (always a multiple of 50) → "₹1,299" or "₹12.50"
  function fmtP(paise) {
    const r = Math.floor(paise / 100);
    const p = paise % 100;
    return `₹${group(r)}${p ? '.' + String(p).padStart(2, '0') : ''}`;
  }
  // A computed amount in rupees (float), for explanations: "₹719.28", "₹27,199"
  function fmtAmt(rupees, approx = false) {
    const r2 = Math.round(rupees * 100) / 100;
    if (Number.isInteger(r2)) return `${approx ? '≈ ' : ''}₹${group(r2)}`;
    if (r2 >= 1000) return `≈ ₹${group(Math.round(r2))}`;
    return `₹${r2.toFixed(2)}`;
  }
  // Unit price: enough decimals that a 3% gap always shows.
  function fmtUnit(rupees) {
    if (rupees < 10) return `₹${rupees.toFixed(2)}`;
    if (rupees < 100) return `₹${(Math.round(rupees * 10) / 10).toFixed(1)}`;
    return `₹${group(Math.round(rupees))}`;
  }
  const fmtPct = (x) => `${Math.round(x * 100) / 100}%`;

  // Rupees → paise rounded to whole rupee, ₹.50, or a "…9" shelf price.
  function shelfPrice(raw, rand) {
    if (raw < 60 && rand() < 0.35) return Math.max(50, Math.round(raw * 2) * 50);
    if (raw >= 60 && rand() < 0.6) return Math.max(9, Math.round((raw + 1) / 10) * 10 - 1) * 100;
    return Math.max(1, Math.round(raw)) * 100;
  }

  // ---------- catalogues ----------
  const PRODUCTS = [
    { name: 'Atta', emoji: '🌾', unit: 'g', sizes: [1000, 2000, 5000, 10000], per: 1000, perLabel: 'kg', rate: [38, 55] },
    { name: 'Basmati rice', emoji: '🍚', unit: 'g', sizes: [1000, 2000, 5000], per: 1000, perLabel: 'kg', rate: [80, 140] },
    { name: 'Toor dal', emoji: '🫘', unit: 'g', sizes: [500, 1000, 2000], per: 1000, perLabel: 'kg', rate: [120, 170] },
    { name: 'Detergent powder', emoji: '🧺', unit: 'g', sizes: [500, 1000, 2000, 4000], per: 1000, perLabel: 'kg', rate: [80, 150] },
    { name: 'Sunflower oil', emoji: '🌻', unit: 'ml', sizes: [500, 1000, 5000], per: 1000, perLabel: 'L', rate: [130, 180] },
    { name: 'Chai patti', emoji: '🍵', unit: 'g', sizes: [250, 500, 1000], per: 100, perLabel: '100 g', rate: [40, 60] },
    { name: 'Biscuits', emoji: '🍪', unit: 'g', sizes: [120, 250, 450, 600], per: 100, perLabel: '100 g', rate: [18, 32] },
    { name: 'Eggs', emoji: '🥚', unit: 'pc', sizes: [6, 12, 30], per: 1, perLabel: 'egg', rate: [6, 8] },
    { name: 'Shampoo', emoji: '🧴', unit: 'ml', sizes: [180, 340, 650], per: 100, perLabel: '100 ml', rate: [55, 95] },
    { name: 'Toothpaste', emoji: '🪥', unit: 'g', sizes: [100, 150, 200, 300], per: 100, perLabel: '100 g', rate: [45, 80] },
    { name: 'Milk', emoji: '🥛', unit: 'ml', sizes: [500, 1000], per: 1000, perLabel: 'L', rate: [52, 68] },
  ];
  const MULTI_ITEMS = [
    { name: 'Bathing soap', emoji: '🧼', mrp: [35, 65] },
    { name: 'Chocolate bar', emoji: '🍫', mrp: [40, 100] },
    { name: 'Juice 1 L', emoji: '🧃', mrp: [99, 140] },
    { name: 'Instant noodles', emoji: '🍜', mrp: [14, 30] },
    { name: 'Shampoo 340 ml', emoji: '🧴', mrp: [199, 349] },
    { name: 'Coffee 200 g', emoji: '☕', mrp: [280, 450] },
  ];
  const STACK_ITEMS = [
    { name: 'Kurta', emoji: '👕', mrp: [699, 1499] },
    { name: 'Sneakers', emoji: '👟', mrp: [1499, 2999] },
    { name: 'Backpack', emoji: '🎒', mrp: [899, 1999] },
    { name: 'Saree', emoji: '🥻', mrp: [999, 2499] },
    { name: 'Headphones', emoji: '🎧', mrp: [999, 2999] },
    { name: 'Pressure cooker', emoji: '🍲', mrp: [1199, 2499] },
  ];
  const PERISHABLES = [
    { noun: 'bananas', label: 'Bananas', emoji: '🍌', a: [3, 4], b: [12], rate: [5, 8] },
    { noun: 'pav buns', label: 'Pav buns', emoji: '🍞', a: [4, 6], b: [12], rate: [4, 6] },
    { noun: 'curd cups', label: 'Curd cups', emoji: '🥣', a: [2, 3], b: [6], rate: [25, 35] },
    { noun: 'paneer packs', label: 'Paneer', emoji: '🧀', a: [1, 2], b: [4], rate: [80, 95] },
    { noun: 'mangoes', label: 'Mangoes', emoji: '🥭', a: [3, 4], b: [12], rate: [25, 50] },
  ];
  const BIG_BUYS = [
    { name: 'Phone', q: 'a new phone', emoji: '📱', price: [12, 35] },
    { name: 'Laptop', q: 'a new laptop', emoji: '💻', price: [40, 80] },
    { name: 'Fridge', q: 'a new fridge', emoji: '🧊', price: [22, 45] },
    { name: 'TV', q: 'a new TV', emoji: '📺', price: [18, 50] },
    { name: 'Washing machine', q: 'a new washing machine', emoji: '🫧', price: [16, 32] },
  ];

  function sizeLabel(p, s) {
    if (p.unit === 'pc') return `${s} eggs`;
    if (s >= 1000) return `${s / 1000} ${p.unit === 'g' ? 'kg' : 'L'}`;
    return `${s} ${p.unit}`;
  }

  // Each generator returns a "raw" round: offers[2], costs[2] (rationals), lower (bool), etc.
  // finalize() then checks the gap, decides the answer and shuffles sides.

  function genUnit(rand) {
    const p = pk(PRODUCTS, rand);
    const sizes = p.sizes.slice();
    const i = ri(0, sizes.length - 2, rand);
    const j = ri(i + 1, sizes.length - 1, rand);
    const s1 = sizes[i];
    const s2 = sizes[j];
    const rate = ri(p.rate[0] * 2, p.rate[1] * 2, rand) / 2;
    const p1 = shelfPrice((rate * s1) / p.per * (1 + rand() * 0.18), rand);
    const p2 = shelfPrice((rate * s2) / p.per * (0.82 + rand() * 0.24), rand);
    const unit = (paise, s) => (paise / 100) * (p.per / s);
    const off = (paise, s) => ({
      big: fmtP(paise),
      lines: [sizeLabel(p, s)],
      ex: `${fmtP(paise)} for ${sizeLabel(p, s)} = ${fmtUnit(unit(paise, s))}/${p.perLabel}`,
      unitVal: unit(paise, s),
      unitShown: fmtUnit(unit(paise, s)),
      size: s,
    });
    const offers = [off(p1, s1), off(p2, s2)];
    return {
      type: 'unit',
      label: `${p.emoji} ${p.name}`,
      q: `${p.emoji} ${p.name}, same brand. Which is the better buy?`,
      offers,
      costs: [R(p1, s1), R(p2, s2)],
      lower: true,
      maxPct: 35,
      shown: [p1, p2],
      saveFn: (b, w) => (offers[w].unitVal - offers[b].unitVal) * (offers[b].size / p.per),
    };
  }

  function genData(rand) {
    const gbd2 = [2, 3, 4, 5, 6];
    const days = [28, 56, 84];
    let a;
    let b;
    do {
      a = [pk(gbd2, rand), pk(days, rand)];
      b = [pk(gbd2, rand), pk(days, rand)];
    } while (a[0] === b[0] && a[1] === b[1]);
    const mk = ([g2, d]) => {
      const gb = (g2 * d) / 2;
      const price = Math.max(9, Math.round(((3 + rand() * 5) * gb + 1) / 10) * 10 - 1) * 100;
      const perGB = price / 100 / gb;
      return {
        price,
        gb,
        big: fmtP(price),
        lines: [`${g2 / 2} GB/day`, `${d} days`],
        ex: `${fmtP(price)} ÷ ${gb} GB = ${fmtUnit(perGB)}/GB`,
        unitVal: perGB,
        unitShown: fmtUnit(perGB),
      };
    };
    const offers = [mk(a), mk(b)];
    return {
      type: 'data',
      label: '📶 Data pack',
      q: '📶 You stream a lot. Which mobile pack is cheaper per GB?',
      offers,
      costs: [R(offers[0].price, offers[0].gb), R(offers[1].price, offers[1].gb)],
      lower: true,
      maxPct: 45,
      shown: [offers[0].price, offers[1].price],
      saveFn: (bi, w) => (offers[w].unitVal - offers[bi].unitVal) * offers[bi].gb,
    };
  }

  const MULTI = [
    { label: 'Buy 2 get 1 free', pay: 2, get: 3 },
    { label: 'Buy 1 get 1 free', pay: 1, get: 2 },
    { label: 'Buy 3 get 1 free', pay: 3, get: 4 },
  ];
  function genMulti(rand) {
    const it = pk(MULTI_ITEMS, rand);
    const deal = pk(MULTI, rand);
    const P1 = ri(it.mrp[0], it.mrp[1], rand) * 100;
    const P2 = rand() < 0.5 ? P1 : Math.max(500, P1 + ri(-3, 3, rand) * Math.max(100, Math.round(P1 / 2000) * 100));
    const X = pk([10, 15, 20, 25, 30, 35, 40, 45, 50, 55], rand);
    const n = deal.get;
    const costA = deal.pay * P1;
    const costB = R(n * P2 * (100 - X), 100);
    const offers = [
      { big: fmtP(P1), lines: ['each'], badge: deal.label, ex: `${n} for ${fmtAmt(costA / 100)} (pay for ${deal.pay})` },
      { big: fmtP(P2), lines: ['each'], badge: `${X}% off`, ex: `${n} × ${fmtP(P2)} − ${X}% = ${fmtAmt(toNum(costB) / 100)}` },
    ];
    return {
      type: 'multibuy',
      label: `${it.emoji} ${it.name} ×${n}`,
      q: `${it.emoji} You need ${n} × ${it.name}. Which offer costs less?`,
      offers,
      costs: [R(costA), costB],
      lower: true,
      maxPct: 40,
      shown: [P1, P2],
      saveFn: (b, w) => Math.abs(toNum(costB) - costA) / 100,
    };
  }

  function genStacked(rand) {
    const it = pk(STACK_ITEMS, rand);
    const a = pk([10, 20, 25, 30, 40, 50], rand);
    const b = pk([10, 15, 20], rand);
    const c = a + b - ri(0, 8, rand);
    const P1 = (Math.round(ri(it.mrp[0], it.mrp[1], rand) / 100) * 100 - 1) * 100;
    const P2 = rand() < 0.55 ? P1 : P1 + pk([-200, -100, 100, 200], rand) * 100;
    const costA = R(P1 * (100 - a) * (100 - b), 10000);
    const costB = R(P2 * (100 - c), 100);
    const comb = 100 - ((100 - a) * (100 - b)) / 100;
    const offers = [
      { big: fmtP(P1), badge: `${a}% off + extra ${b}%`, lines: ['MRP'], ex: `${fmtP(P1)} − ${a}% − ${b}% = ${fmtAmt(toNum(costA) / 100)} (${fmtPct(comb)} off, not ${a + b}%)` },
      { big: fmtP(P2), badge: `${c}% off`, lines: ['MRP'], ex: `${fmtP(P2)} − ${c}% = ${fmtAmt(toNum(costB) / 100)}` },
    ];
    return {
      type: 'stacked',
      label: `${it.emoji} ${it.name} sale`,
      q: `${it.emoji} ${it.name} sale! Which final price is lower?`,
      offers,
      costs: [costA, costB],
      lower: true,
      maxPct: 30,
      shown: [P1, P2],
      saveFn: () => Math.abs(toNum(costA) - toNum(costB)) / 100,
    };
  }

  function genCoupon(rand) {
    const T = ri(60, 250, rand) * 10; // cart ₹600–₹2,500
    const F = pk([50, 75, 100, 150, 200, 250], rand);
    const M = Math.min(T, pk([299, 499, 599, 799, 999], rand));
    const p = pk([10, 15, 20, 25, 30], rand);
    const C = pk([75, 100, 150, 200, 300], rand);
    const pctOff = R(T * p, 100);
    const capped = cmp(pctOff, R(C)) > 0;
    const costA = R(T - F);
    const costB = capped ? R(T - C) : R(T * (100 - p), 100);
    const offers = [
      { big: `₹${F} off`, badge: 'Flat', lines: [`on orders ${fmtP(M * 100)}+`], ex: `${fmtP(T * 100)} − ₹${F} = ${fmtAmt(T - F)}` },
      { big: `${p}% off`, badge: 'Coupon', lines: [`max ₹${C} off`], ex: `${p}% of ${fmtP(T * 100)} = ${fmtAmt(toNum(pctOff))}${capped ? `, capped at ₹${C}` : ''} → ${fmtAmt(toNum(costB))}` },
    ];
    return {
      type: 'coupon',
      label: '🎟️ Coupon pick',
      q: `🎟️ Your cart: ${fmtP(T * 100)}. Which coupon saves more?`,
      offers,
      costs: [costA, costB],
      lower: true,
      maxPct: 25,
      shown: [T * 100, F * 100, M * 100, C * 100],
      saveFn: () => Math.abs(toNum(costA) - toNum(costB)),
    };
  }

  // Bulk vs need: the bigger pack is cheaper per piece, but you only need a few.
  function genBulk(rand) {
    const it = pk(PERISHABLES, rand);
    const a = pk(it.a, rand);
    const b = pk(it.b, rand);
    const rate = ri(it.rate[0] * 2, it.rate[1] * 2, rand) / 2;
    const PA = shelfPrice(rate * a * (1.05 + rand() * 0.15), rand);
    const PB = shelfPrice(rate * b * (0.72 + rand() * 0.18), rand);
    const offers = [
      { big: fmtP(PA), lines: [`pack of ${a}`], ex: `pack of ${a} = ${fmtP(PA)}`, unit: R(PA, a) },
      { big: fmtP(PB), lines: [`pack of ${b}`], badge: 'Value pack', ex: `${fmtP(PB)} for ${b} (cheaper each, but ${b - a} spoil)`, unit: R(PB, b) },
    ];
    return {
      type: 'bulk',
      label: `${it.emoji} ${it.label}`,
      q: `${it.emoji} You need just ${a} ${it.noun} this week. Extras will spoil.`,
      tail: 'Cheaper per piece is not cheaper if you throw it away.',
      offers,
      costs: [R(PA), R(PB)],
      lower: true,
      maxPct: 400,
      shown: [PA, PB],
      // The lesson needs a real trap: the big pack must be ≥3% cheaper per piece.
      extraOK: () => gapOK(offers[0].unit, offers[1].unit) && cmp(offers[1].unit, offers[0].unit) < 0,
      saveFn: () => (PB - PA) / 100,
    };
  }

  function genEmi(rand) {
    const it = pk(BIG_BUYS, rand);
    const P = (ri(it.price[0], it.price[1], rand) * 1000 - 1) * 100; // paise, e.g. ₹24,999
    const n = pk([6, 9, 12], rand);
    const fee = rand() < 0.4 ? pk([199, 499], rand) : 0;
    const k = -0.06 + rand() * 0.2;
    const E = Math.max(100, Math.round(((P / 100) * (1 + k) - fee) / n / 10) * 10);
    const total = E * n + fee;
    const offers = [
      { big: fmtP(P), lines: ['pay now'], ex: `${fmtP(P)} now` },
      { big: `${fmtP(E * 100)}/mo`, lines: [`× ${n} months`].concat(fee ? [`+ ₹${fee} fee`] : []), badge: 'EMI', ex: `${fmtP(E * 100)} × ${n}${fee ? ` + ₹${fee}` : ''} = ${fmtAmt(total)}` },
    ];
    return {
      type: 'emi',
      label: `${it.emoji} ${it.name}: cash vs EMI`,
      q: `${it.emoji} Buying ${it.q}. Which costs less in total?`,
      offers,
      costs: [R(P, 100), R(total)],
      lower: true,
      maxPct: 30,
      shown: [P, E * 100, fee * 100],
      saveFn: () => Math.abs(P / 100 - total),
    };
  }

  function genLoan(rand) {
    const L = ri(2, 20, rand) * 5000;
    const yrs = pk([1, 2, 3], rand);
    const mm = pk([100, 125, 150, 200], rand); // % per month × 100
    const r = Math.round((mm * 12) / 100) + ri(-3, 2, rand); // simple %/yr near 12× monthly
    const useMonthly = rand() < 0.7;
    const y = Math.round((mm * 12) / 100) - ri(1, 4, rand); // compound %/yr
    const costA = R(L * (100 + r * yrs), 100);
    const m = 12 * yrs;
    const costB = useMonthly
      ? R(big(L) * big(10000 + mm) ** big(m), 10000n ** big(m))
      : R(big(L) * big(100 + y) ** big(yrs), 100n ** big(yrs));
    const exact = (c) => (c.n % c.d === 0n ? fmtAmt(toNum(c)) : fmtAmt(Math.round(toNum(c)), true));
    const mmTxt = `${mm / 100}%`;
    const offers = [
      { big: `${r}%`, lines: ['per year', 'simple interest'], badge: 'Simple', ex: `${r}% simple × ${yrs} yr = ${exact(costA)}` },
      useMonthly
        ? { big: mmTxt, lines: ['per month', 'compounded monthly'], badge: 'Compound', ex: `${mmTxt}/month for ${m} months = ${exact(costB)}` }
        : { big: `${y}%`, lines: ['per year', 'compounded yearly'], badge: 'Compound', ex: `${y}% compounded × ${yrs} yr = ${exact(costB)}` },
    ];
    return {
      type: 'loan',
      label: '🏦 Loan interest',
      q: `🏦 Borrow ${fmtP(L * 100)} for ${yrs} year${yrs > 1 ? 's' : ''}. Which loan costs less to repay?`,
      offers,
      costs: [costA, costB],
      lower: true,
      maxPct: 30,
      shown: [L * 100],
      saveFn: () => Math.abs(toNum(costA) - toNum(costB)),
    };
  }

  // Percentage points vs percent.
  function genPoints(rand) {
    const loan = rand() < 0.6;
    const base10 = loan ? ri(16, 28, rand) * 5 : ri(10, 16, rand) * 5; // rate × 10 (8–14% loan, 5–8% FD)
    const p10 = pk([5, 10, 15, 20], rand); // points × 10
    const q = pk([5, 10, 15, 20, 25], rand);
    const amt = loan ? ri(1, 5, rand) * 100000 : ri(1, 3, rand) * 50000;
    const sign = loan ? -1 : 1;
    // New rates in % as rationals.
    const rA = R(base10 + sign * p10, 10);
    const rB = R(base10 * (100 + sign * q), 1000);
    const base = base10 / 10;
    const opTxt = loan ? '−' : '+';
    const offers = [
      { big: `${opTxt}${p10 / 10} pt`, lines: ['percentage point', loan ? 'rate cut' : 'rate bonus'], ex: `${base}% ${opTxt} ${p10 / 10} pt = ${fmtPct(toNum(rA))}` },
      { big: `${opTxt}${q}%`, lines: ['of your rate', loan ? 'rate cut' : 'rate bonus'], ex: `${base}% ${opTxt} ${q}% of ${base} = ${fmtPct(toNum(rB))}` },
    ];
    return {
      type: 'points',
      label: loan ? '📉 Rate cut' : '📈 FD rate boost',
      q: loan
        ? `📉 Your ${fmtP(amt * 100)} loan is at ${base}% a year. Which cut saves more?`
        : `📈 Your ${fmtP(amt * 100)} FD earns ${base}% a year. Which boost earns more?`,
      offers,
      costs: [rA, rB],
      lower: loan,
      maxPct: 40,
      shown: [amt * 100],
      saveFn: () => (Math.abs(toNum(rA) - toNum(rB)) * amt) / 100,
    };
  }

  // Money now vs more money later, with prices rising.
  function genInflation(rand) {
    const X = ri(5, 50, rand) * 1000;
    const g = ri(3, 15, rand);
    const Z = ri(3, 12, rand);
    const Y = (X * (100 + g)) / 100;
    const vA = R(X);
    const vB = R(Y * 100, 100 + Z);
    const real = toNum(vB);
    const offers = [
      { big: fmtP(X * 100), lines: ['today'], ex: `${fmtP(X * 100)} today` },
      { big: fmtP(Y * 100), lines: ['in 1 year'], ex: `${fmtP(Y * 100)} next year ≈ ${fmtAmt(Math.round(real))} in today's money` },
    ];
    return {
      type: 'inflation',
      label: '🎈 Now vs later',
      q: `🎈 Prices rise ${Z}% a year. Which is worth more to you?`,
      offers,
      costs: [vA, vB],
      lower: false,
      maxPct: 15,
      shown: [X * 100, Y * 100],
      saveFn: () => Math.abs(X - real),
    };
  }

  const GENS = {
    unit: genUnit, data: genData, multibuy: genMulti, stacked: genStacked, coupon: genCoupon,
    bulk: genBulk, emi: genEmi, loan: genLoan, points: genPoints, inflation: genInflation,
  };

  // Retry until the round is fair: ≥3% apart, not absurdly obvious, displayed prices on ₹ / ₹.50.
  function makeRound(type, rand) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const r = GENS[type](rand);
      const [c0, c1] = r.costs;
      if (!gapOK(c0, c1)) continue;
      if (!ratioBelow(c0, c1, r.maxPct)) continue;
      if (r.extraOK && !r.extraOK()) continue;
      if (r.shown.some((p) => !Number.isInteger(p) || p < 0 || p % 50 !== 0)) continue;
      const c = cmp(c0, c1);
      let better = r.lower ? (c < 0 ? 0 : 1) : c > 0 ? 0 : 1;
      if (r.offers[0].unitShown && r.offers[0].unitShown === r.offers[1].unitShown) continue;
      const save = Math.max(1, Math.round(r.saveFn(better, 1 - better)));
      let offers = r.offers;
      let costs = r.costs;
      if (rand() < 0.5) {
        offers = [offers[1], offers[0]];
        costs = [costs[1], costs[0]];
        better = 1 - better;
      }
      const why = `${offers[0].ex} vs ${offers[1].ex}${r.tail ? `. ${r.tail}` : ''}`;
      return { type, label: r.label, q: r.q, offers, costs, lower: r.lower, better, why, save, shown: r.shown, attempts: attempt + 1 };
    }
    throw new Error(`deal: could not generate ${type}`);
  }

  const EASY = ['unit', 'multibuy', 'coupon', 'data', 'unit'];
  const ALL = ['unit', 'data', 'multibuy', 'stacked', 'coupon', 'emi', 'loan', 'points', 'inflation'];

  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Easy rounds first, then the full mix. Bulk-vs-need shows up exactly once.
  function planTypes(n, rand) {
    let seq = ['unit'].concat(shuffle(EASY, rand));
    while (seq.length < n + 4) seq = seq.concat(shuffle(ALL, rand));
    seq.splice(ri(4, 6, rand), 0, 'bulk');
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] === seq[i - 1]) {
        const k = seq.findIndex((t, j) => j > i && t !== seq[i] && t !== seq[i - 1] && t !== 'bulk');
        if (k > 0) [seq[i], seq[k]] = [seq[k], seq[i]];
      }
    }
    return seq.slice(0, n);
  }

  function generateGame(rand, n = 40) {
    return planTypes(n, rand).map((t) => makeRound(t, rand));
  }

  const engine = { generateGame, makeRound, planTypes, GENS, gapOK, cmp, toNum, fmtP, fmtAmt, group };
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
  if (typeof window === 'undefined' || !window.BG) return;

  // ---------------------------------------------------------------------------
  // Game UI
  // ---------------------------------------------------------------------------
  const BG = window.BG;
  const SECONDS = 75;
  const BASE = 40;
  const SPEED_MAX = 10;
  const SPEED_WINDOW = 3;
  const COMBO_STEP = 5;
  const COMBO_MAX = 25;
  const WRONG = -10;
  const ROUNDS = 15; // a cap, so tap-spamming can't outscore thinking

  BG.registerGame({
    id: 'deal',
    name: 'Better Deal',
    emoji: '🛒',
    skill: 'Money maths',
    category: 'life',
    tagline: 'Two price tags. One is a trap. 75 seconds on the clock.',
    howTo: [
      'Two offers sit on the shelf. Tap the better deal (or press ← / →).',
      'Watch for traps: stacked discounts, EMIs, "value" packs you don\'t need.',
      'Correct = 40, fast picks (under 3s) up to +10, streaks up to +25. Wrong = −10.',
      'Your receipt shows how much you saved by picking right.',
    ],
    science:
      'A meta-analysis of 76 randomised trials with over 160,000 people found financial education improves money knowledge and later behaviour (Kaiser, Lusardi, Menkhoff & Urban, J. Financial Economics 2022). Only about 30% of Americans get all three basic financial literacy questions right (Lusardi & Mitchell 2014).',
    scienceUrl: 'https://www.nber.org/papers/w18952',
    minutes: 2,
    maxScore: 600,

    mount(root, ctx) {
      const rounds = generateGame(ctx.rand, ROUNDS);
      const log = []; // {label, ok, save}
      let idx = -1;
      let cur = null;
      let shownAt = 0;
      let locked = true;
      let streak = 0;
      let bestStreak = 0;
      let saved = 0;
      let over = false;
      let skipWait = null;
      const timeouts = new Set();
      const later = (fn, ms) => {
        const t = setTimeout(() => {
          timeouts.delete(t);
          fn();
        }, ms);
        timeouts.add(t);
        return t;
      };
      const wait = (ms) =>
        new Promise((res) => {
          const t = later(res, ms);
          skipWait = () => {
            clearTimeout(t);
            timeouts.delete(t);
            skipWait = null;
            res();
          };
        });

      root.innerHTML = '';
      const wrap = BG.el(`
        <div class="g-deal">
          <div class="g-deal-top">
            <span class="chip chip--blue g-deal-count" aria-label="Smart picks">🛒 0</span>
            <span class="chip chip--gold g-deal-combo" aria-live="polite">Combo ×0</span>
          </div>
          <div class="g-deal-timer"></div>
          <p class="g-deal-q" aria-live="polite"></p>
          <div class="panel g-deal-shelf">
            <div class="g-deal-offers" role="group" aria-label="Offers"></div>
          </div>
          <div class="g-deal-foot">
            <div class="g-deal-cart" aria-hidden="true"><span class="g-deal-cart-ico">🛒</span><span class="g-deal-saved">₹0 saved</span></div>
            <p class="g-deal-why" aria-live="polite"></p>
            <button class="btn btn--ghost btn--sm g-deal-next" hidden>Next →</button>
          </div>
          <div class="g-deal-end" hidden></div>
        </div>`);
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const qEl = $('.g-deal-q');
      const offersEl = $('.g-deal-offers');
      const whyEl = $('.g-deal-why');
      const nextBtn = $('.g-deal-next');
      const cartEl = $('.g-deal-cart');
      const savedEl = $('.g-deal-saved');
      const countEl = $('.g-deal-count');
      const comboEl = $('.g-deal-combo');
      const endEl = $('.g-deal-end');
      ctx.setProgress(1, ROUNDS);

      const timer = BG.timerBar($('.g-deal-timer'), SECONDS);
      ctx.onDestroy(() => {
        timer.stop();
        timeouts.forEach(clearTimeout);
        timeouts.clear();
        document.removeEventListener('keydown', onKey);
      });
      timer.done.then(() => {
        if (ctx.alive) endGame();
      });

      function tagHTML(o, i) {
        const side = i === 0 ? '←' : '→';
        return `
          <button class="g-deal-tag" data-i="${i}" aria-label="Offer ${i ? 'B' : 'A'}: ${BG.esc([o.badge, o.big].concat(o.lines).filter(Boolean).join(', '))}">
            <span class="g-deal-hole" aria-hidden="true"></span>
            ${o.badge ? `<span class="g-deal-badge">${BG.esc(o.badge)}</span>` : '<span class="g-deal-badge g-deal-badge--plain">Offer</span>'}
            <span class="g-deal-price">${BG.esc(o.big)}</span>
            ${o.lines.map((l) => `<span class="g-deal-line">${BG.esc(l)}</span>`).join('')}
            <span class="g-deal-key" aria-hidden="true">${side}</span>
          </button>`;
      }

      function nextRound() {
        if (!ctx.alive || over) return;
        idx++;
        // Wall-clock guard too: the bar pauses when rAF is throttled (background tab).
        if (idx >= rounds.length || timer.elapsed() >= SECONDS) {
          endGame();
          return;
        }
        cur = rounds[idx];
        ctx.setProgress(idx + 1, ROUNDS);
        qEl.textContent = cur.q;
        BG.fx.pop(qEl);
        offersEl.innerHTML = cur.offers.map(tagHTML).join('');
        offersEl.querySelectorAll('.g-deal-tag').forEach((el, i) => {
          el.style.animationDelay = `${i * 60}ms`;
          el.classList.add('g-deal-in');
        });
        whyEl.textContent = idx === 0 ? 'Tap the better deal. Speed counts!' : '';
        whyEl.className = 'g-deal-why';
        nextBtn.hidden = true;
        shownAt = performance.now();
        locked = false;
      }

      async function choose(i) {
        if (locked || over || !cur) return;
        locked = true;
        const t = (performance.now() - shownAt) / 1000;
        const ok = i === cur.better;
        const tags = offersEl.querySelectorAll('.g-deal-tag');
        const picked = tags[i];
        const right = tags[cur.better];
        log.push({ label: cur.label, ok, save: cur.save });
        tags.forEach((el) => el.classList.add('is-done'));
        right.classList.add('is-right');
        if (ok) {
          streak++;
          bestStreak = Math.max(bestStreak, streak);
          saved += cur.save;
          const speed = t < SPEED_WINDOW ? Math.min(SPEED_MAX, Math.round((SPEED_MAX * (SPEED_WINDOW - t)) / (SPEED_WINDOW - 0.5))) : 0;
          const combo = Math.min(COMBO_MAX, COMBO_STEP * (streak - 1));
          const pts = BASE + speed + combo;
          ctx.addScore(pts, picked);
          BG.fx.sound('pick');
          later(() => BG.fx.sound('good'), 90);
          BG.fx.haptic(14);
          coins(picked);
          BG.fx.pop(picked);
          savedEl.textContent = `₹${group(saved)} saved`;
          countEl.textContent = `🛒 ${log.filter((l) => l.ok).length}`;
          whyEl.textContent = `✓ ${cur.why}`;
          whyEl.className = 'g-deal-why g-deal-why--good';
        } else {
          streak = 0;
          ctx.addScore(WRONG, picked);
          picked.classList.add('is-wrong');
          BG.fx.sound('bad');
          BG.fx.haptic(30);
          BG.fx.shake(picked);
          whyEl.textContent = `✗ ${cur.why}`;
          whyEl.className = 'g-deal-why g-deal-why--bad';
        }
        comboEl.textContent = `Combo ×${streak}`;
        comboEl.classList.toggle('is-hot', streak >= 3);
        if (streak >= 2) BG.fx.pop(comboEl);
        if (!ok) {
          // Read the why first; only then can it be skipped.
          await new Promise((res) => later(res, 1300));
          if (!ctx.alive || over) return;
          nextBtn.hidden = false;
        }
        await wait(ok ? 1100 : 2200);
        skipWait = null;
        if (!ctx.alive || over) return;
        nextRound();
      }

      // Coins fly from the chosen tag into the cart.
      function coins(fromEl) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
          BG.fx.pop(cartEl);
          return;
        }
        const wr = wrap.getBoundingClientRect();
        const a = fromEl.getBoundingClientRect();
        const b = cartEl.getBoundingClientRect();
        const x0 = a.left + a.width / 2 - wr.left;
        const y0 = a.top + a.height / 2 - wr.top;
        const x1 = b.left + 22 - wr.left;
        const y1 = b.top + b.height / 2 - wr.top;
        for (let k = 0; k < 6; k++) {
          const c = BG.el('<span class="g-deal-coin" aria-hidden="true">🪙</span>');
          c.style.left = `${x0}px`;
          c.style.top = `${y0}px`;
          wrap.appendChild(c);
          const dx = (k - 2.5) * 14;
          const anim = c.animate(
            [
              { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
              { transform: `translate(calc(-50% + ${dx}px), calc(-50% - 50px)) scale(1.1)`, opacity: 1, offset: 0.35 },
              { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(.5)`, opacity: 0.9 },
            ],
            { duration: 620, delay: k * 45, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' },
          );
          anim.onfinish = () => c.remove();
          later(() => c.remove(), 1200);
        }
        later(() => {
          BG.fx.anim(cartEl, 'g-deal-bump');
          BG.fx.sound('pop');
        }, 600);
      }

      async function endGame() {
        if (over) return;
        over = true;
        locked = true;
        timer.stop();
        if (skipWait) skipWait();
        ctx.setProgress(ROUNDS + 1, ROUNDS);
        const n = log.length;
        const right = log.filter((l) => l.ok).length;
        qEl.textContent = n >= rounds.length ? 'Shelf cleared! Here is your receipt.' : n ? 'Time! Here is your receipt.' : 'Time! The shelf is still full.';
        offersEl.innerHTML = '';
        $('.g-deal-shelf').hidden = true;
        $('.g-deal-foot').hidden = true;
        $('.g-deal-timer').hidden = true;
        endEl.hidden = false;
        endEl.innerHTML = `
          <div class="g-deal-receipt" role="list" aria-label="Receipt">
            <div class="g-deal-rhead">🛒 BRAIN GYM SUPERMART<br><span>Smart-pick receipt</span></div>
            <div class="g-deal-rlines"></div>
            <div class="g-deal-rtotal" hidden></div>
          </div>
          <button class="btn btn--primary btn--block g-deal-fin" hidden>See results</button>`;
        const linesEl = endEl.querySelector('.g-deal-rlines');
        BG.fx.sound('win');
        for (const l of log) {
          const row = BG.el(`<div class="g-deal-rrow ${l.ok ? 'is-ok' : 'is-bad'}" role="listitem">
            <span class="g-deal-rmark">${l.ok ? '✓' : '✗'}</span>
            <span class="g-deal-rname"></span>
            <span class="g-deal-ramt">${l.ok ? `₹${group(l.save)}` : '—'}</span></div>`);
          row.querySelector('.g-deal-rname').textContent = l.label;
          linesEl.appendChild(row);
          BG.fx.sound('tick');
          await new Promise((res) => later(res, 140));
          if (!ctx.alive) return;
        }
        const tot = endEl.querySelector('.g-deal-rtotal');
        tot.hidden = false;
        tot.innerHTML = `<div class="g-deal-rsum"><span>Smart picks</span><b>${right}/${n}</b></div>
          <div class="g-deal-rsum"><span>Best streak</span><b>${bestStreak}</b></div>
          <div class="g-deal-rsave">You saved ₹${group(saved)} by picking right</div>`;
        BG.fx.pop(tot);
        const pct = n ? right / n : 0;
        if (n >= 3 && pct >= 0.9) {
          BG.fx.confetti();
          BG.fx.sound('win');
        } else BG.fx.sound(pct >= 0.6 ? 'good' : 'pop');
        const fin = endEl.querySelector('.g-deal-fin');
        fin.hidden = false;
        fin.addEventListener('click', finish, { once: true });
        fin.focus({ preventScroll: true });
      }

      let finished = false;
      function finish() {
        if (!ctx.alive || finished) return;
        finished = true;
        const n = log.length;
        const right = log.filter((l) => l.ok).length;
        ctx.finish({
          summary: `Saved ₹${group(saved)} with ${right}/${n} smart picks 🛒`,
          stats: { picks: n, correct: right, saved, bestStreak },
        });
      }

      offersEl.addEventListener('click', (e) => {
        const b = e.target.closest('.g-deal-tag');
        if (b) choose(Number(b.dataset.i));
      });
      nextBtn.addEventListener('click', () => skipWait && skipWait());

      function onKey(e) {
        if (e.ctrlKey || e.metaKey || e.altKey || !root.isConnected || over) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          if (!locked) choose(e.key === 'ArrowLeft' ? 0 : 1);
          else if (skipWait && !nextBtn.hidden) skipWait();
        } else if ((e.key === 'Enter' || e.key === ' ') && skipWait && !nextBtn.hidden) {
          e.preventDefault();
          skipWait();
        }
      }
      document.addEventListener('keydown', onKey);

      nextRound();
    },
  });
})();

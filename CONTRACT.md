# Brain Gym game module spec

Brain Gym is a static site (plain HTML/CSS/JS, no build, no frameworks, no npm). Each day's "workout" is a rotating set of 5 games picked from a growing library. Every game is also playable from the library at any time. Each game trains one skill that research shows heavy AI use weakens. **Fun comes first**: every game needs a hook, game feel (sounds, animations, pop-ups), escalation and a satisfying ending.

## Files

```
brain-gym/
  index.html          # shell (owned by lead)
  css/base.css        # design tokens + shared components (read it, reuse it)
  css/app.css         # shell styles (lead)
  js/core.js          # window.BG utilities (read it, reuse it)
  js/app.js           # shell/router (lead)
  games/<id>.js       # YOUR game module
  games/<id>.css      # YOUR game styles, all selectors prefixed with .g-<id>
  games/<id>-data.js  # optional content data (window.BG_DATA_<ID> = ...)
```

Do not edit core.js, base.css, app.js or index.html. If you need something from core, say so in your final report.

## Registering a game

```js
BG.registerGame({
  id: 'catchbot',                 // matches filename
  name: 'Catch the Bot',
  emoji: '🕵️',
  skill: 'Spotting AI mistakes',  // short skill label shown on cards and stats
  category: 'brain',              // 'brain' (AI-proof brain) | 'life' (life skills) | 'cool' (cool skills)
  tagline: 'The bot is confident. The bot is wrong. Find where.',
  howTo: ['Read the bot\'s answer…', 'Tap the line…', 'Bet on…'],   // 2–4 short lines
  science: 'Radiologists who trusted a wrong AI went from 82% to 45% accuracy (Dratsch et al., Radiology 2023).',
  scienceUrl: 'https://…',
  minutes: 2,                     // rough play time
  maxScore: 300,                  // your score scale for a perfect game
  mount(root, ctx) { … },         // build the game inside root
});
```

## The ctx object passed to mount

| member | meaning |
|---|---|
| `ctx.day` | workout number (int ≥ 1). Daily content should be selected from this. |
| `ctx.mode` | `'daily'` or `'practice'` |
| `ctx.seed` | uint32 seed: deterministic per (game, day) in daily mode, random in practice |
| `ctx.rand()` | seeded RNG in [0,1), built from `BG.rng(ctx.seed)` |
| `ctx.score` | current score (read only) |
| `ctx.addScore(delta, anchorEl?)` | adds points, animates the header counter, and shows a float label at `anchorEl` if given. Use it for every point change. |
| `ctx.setProgress(i, total)` | round dots in the header, e.g. `(2, 3)` = round 2 of 3 |
| `ctx.bet(question?)` | `await` → `'guess'|'likely'|'sure'`; shows the Confidence Bet sheet |
| `ctx.settleBet(key, correct, anchorEl)` | records calibration, shows feedback, **returns** the delta; pass it to `ctx.addScore(delta)` with no anchor (settle already showed a float) |
| `ctx.finish({ summary, stats })` | call once when the game ends. `summary`: one short fun line, e.g. "Caught the bot 3/3 🕵️". `stats`: optional small object. The shell then shows the result screen. Score = `ctx.score` clamped to ≥ 0. |
| `ctx.onDestroy(fn)` | register cleanup (timers, listeners on window/document). Called if the user leaves mid-game. |
| `ctx.alive` | false once destroyed; check after every `await` |
| `ctx.store` | `{get(key, fallback), set(key, value)}` namespaced to your game, persistent (for spaced repetition, history) |

## Core utilities (window.BG, see core.js)

- `BG.el(html)` → element, `BG.esc(str)`, `BG.sleep(ms)`
- `BG.shuffle(arr, rand)`, `BG.pick(arr, rand)`, `BG.randInt(min, max, rand)`, `BG.hash(str)`
- `BG.fx.sound('tap'|'pick'|'good'|'bad'|'tick'|'pop'|'win'|'lose')`, `BG.fx.haptic()`
- `BG.fx.float(el, text, 'good'|'bad'|'info')`, `BG.fx.shake(el)`, `BG.fx.pop(el)`, `BG.fx.confetti()`, `BG.fx.toast(msg)`
- `BG.timerBar(container, seconds)` → `{done: Promise, stop(), elapsed()}`; renders a draining bar and ticks in the last 5s
- `BG.track(event, props)` for analytics events

## Shared CSS classes (base.css)

`.btn .btn--primary .btn--ghost .btn--dark .btn--block .btn--sm`, `.icon-btn`, `.panel` (graph-paper board), `.card`, `.chip .chip--ok/--warn/--gold/--blue`, `.label` (mono caps), `.muted`, `.big-num`, `.bubble .bubble--me`, `.timer`.
Tokens: `--bg --surface --board --line --ink --ink-2 --ink-3 --accent --accent-soft --ok --ok-soft --warn --warn-soft --bad --bad-soft --gold --gold-soft --blue --blue-soft --card --card-border --radius --radius-lg --shadow --shadow-lift --font-display --font-body --font-mono`. Dark mode is automatic if you only use tokens. **Never hard-code colors.**

## Rules

- Mobile-first: works at 360px wide, with tap targets ≥ 44px. Desktop also works (mouse and keyboard).
- The shell renders the header, intro screen and result screen. `root` is the empty area below the header. Keep everything inside `root`.
- No external libraries, fonts or network requests. Content lives in your `-data.js`.
- **Accuracy:** every factual claim or "correct answer" in your content must be truly correct. If unsure, leave it out. A wrong answer key ruins trust.
- No `alert()` or `confirm()`.
- Deterministic in daily mode: everyone gets the same content for a given `ctx.day`. Use `ctx.rand`/`ctx.seed`, never `Math.random`, for content selection in daily mode.
- Daily content must not repeat for at least 30 days.
- Clean up every timer, interval and global listener via `ctx.onDestroy`.
- Verify syntax with `node --check games/<id>.js` (and the data file).

# Brain Gym

A free daily brain workout: six quick games, about 10 minutes. Each game trains a skill that research shows heavy AI use weakens. Practice transfers best to the skill you actually practise, so each game targets one skill directly.

| # | Game | Skill | Evidence |
|---|---|---|---|
| 1 | 📅 Datewise | Recalling what you know | Retrieval practice (Dunlosky et al. 2013) |
| 2 | 🕵️ Catch the Bot | Spotting AI mistakes | Automation bias (Dratsch et al. 2023), debugging gap (Shen & Tamkin 2026) |
| 3 | 📖 Flash Read | Reading and remembering | LLM-only reading hurt retention (Kreijkes et al. 2025) |
| 4 | 🔢 Make the Number | Sticking with hard problems | Less persistence after AI help (Liu et al. 2026), 17% drop (Bastani et al. 2025) |
| 5 | 🗺️ Lost in Town | Mental maps | GPS use and spatial memory (Dahmani & Bohbot 2020) |
| 6 | 💡 Only You | Original ideas | AI homogenises ideas (Doshi & Hauser 2024) |
| 🎯 | Confidence Bets (inside games) | Knowing what you know | AI-driven overconfidence (Fernandes et al. 2025) |

The payoffs for confidence bets make honest betting the best strategy. The stats page shows how often you were right at each confidence level.

## Run locally

Static site with no build step:

```sh
python -m http.server 8000
# open http://localhost:8000
```

## Structure

- `index.html`: shell and script order
- `js/core.js`: `window.BG` utilities (RNG, storage, effects, bets, timers, registry)
- `js/app.js`: router, workout flow, results, stats, sharing
- `css/base.css`: design tokens and shared components
- `css/app.css`: shell styles
- `games/<id>.js|.css|-data.js`: one module per game (see `CONTRACT.md`)

Daily content is deterministic per workout number (#1 = 12 Oct 2026), so everyone gets the same workout each day. `#/practice/<id>` gives unlimited random rounds. Progress is stored in `localStorage`.

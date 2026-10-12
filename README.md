# Brain Gym

A free daily brain workout: seven quick games, about 12 minutes. Each game trains a skill that research shows heavy AI use weakens. Practice transfers best to the skill you actually practise, so each game targets one skill directly.

| # | Game | Skill | Evidence |
|---|---|---|---|
| 1 | 📅 Datewise | Recalling what you know | Retrieval practice (Dunlosky et al. 2013) |
| 2 | 🕵️ Catch the Bot | Spotting AI mistakes | Automation bias (Dratsch et al. 2023), debugging gap (Shen & Tamkin 2026) |
| 3 | 📖 Flash Read | Reading and remembering | LLM-only reading hurt retention (Kreijkes et al. 2025) |
| 4 | 🔢 Make the Number | Sticking with hard problems | Less persistence after AI help (Liu et al. 2026), 17% drop (Bastani et al. 2025) |
| 5 | 🗺️ Lost in Town | Mental maps | GPS use and spatial memory (Dahmani & Bohbot 2020) |
| 6 | 💡 Only You | Original ideas | AI homogenises ideas (Doshi & Hauser 2024) |
| 7 | 🎤 Mic Drop | Thinking on your feet | Ownership and opinion effects of AI writing (Kosmyna et al. 2025, Jakesch et al. 2023) |
| 8 | 🧪 Prebunk | Seeing through manipulation | Inoculation games (Roozenbeek & van der Linden 2019; Roozenbeek et al. 2022) |
| 9 | 👥 1000 People | Understanding risk | Natural frequencies (Hoffrage et al. 2015) |
| 10 | 🛒 Better Deal | Money maths | Financial education meta-analysis (Kaiser et al. 2022) |
| 11 | 🚨 Scam or Legit? | Spotting scams | Game-based anti-phishing training (Sheng et al. 2007) |
| 12 | 🧠 Bias Buster | Catching thinking traps | Debiasing game (Morewedge et al. 2015) |
| 13 | 🎯 90% Sure | Knowing what you don't know | Calibration training (Moore et al. 2017) |
| 14 | 🧊 Spin Doctor | Spatial thinking | Spatial training meta-analysis (Uttal et al. 2013) |
| 15 | 🏰 Memory Palace | Memorising anything | Method of loci (Dresler et al. 2017) |
| 16 | 🫀 Lifesaver | Acting in an emergency | AHA / Resuscitation Council UK CPR guidance, F.A.S.T. |
| 17 | 📡 Dot Dash | Learning Morse code | Koch method + spacing (Cepeda et al. 2006) |
| 18 | ⌨️ Type Dojo | Fast, accurate typing | How we type (Feit et al. 2016) |
| 19 | 🫶 Name It | Naming feelings precisely | Emotional granularity (Kashdan et al. 2015) |
| 20 | 🔎 Source Check | Checking who's behind a claim | Lateral reading (Wineburg & McGrew 2017) |
| 21 | ⏳ Inner Clock | Sensing and planning time | Planning fallacy (Buehler et al. 1994) |
| 22 | 🧩 Who Did What? | Step-by-step deduction | Practise the reasoning yourself (Bastani et al. 2025) |
| 23 | 🧾 Split the Bill | Everyday mental maths | Numeracy and decisions (Peters et al. 2006) |
| 24 | 📊 Chart Crimes | Reading charts critically | Truncated axes (Correll et al. 2020) |

Games are grouped as **AI-proof brain**, **Life skills** and **Cool skills**. Each day's workout is a deterministic rotation of 5 games, one from each category first. Every game is also playable from `#/library`.

Mic Drop scores a 60-second impromptu talk with six fixed formulas, so the same transcript and timing always get the same score:

- **Stamina:** speaking time ÷ 48s.
- **Pace:** 10 points between 120 and 170 words per minute, minus 1 point for every 8 wpm outside that range.
- **Flow:** 10 − 1.2 × fillers per minute − 1.5 × pauses longer than 3 seconds.
- **Range:** moving-average type-token ratio over 50-word windows, mapped from 0.50–0.78.
- **Structure:** 2 points per signpost category used (opening, sequence, reason, example, contrast, conclusion).
- **Focus:** how many of the topic's keyword stems you mention (0 / 1 / 2 / 3 / 4+ = 2 / 5 / 7 / 9 / 10).

Speech-to-text uses the browser's Web Speech API. In Chrome this sends audio to Google. Without it, the game scores stamina and flow from microphone volume.
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

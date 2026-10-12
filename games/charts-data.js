// Chart Crimes content: fictional themes, headline templates per crime, and lesson text.
// All places, teams, apps and numbers are invented. Numbers are generated per case in charts.js.
// Placeholders in templates: {WHAT} (upper-case metric), {what}, {pct}, {lo}, {vis}, {first}, {last}, ...
(() => {
  'use strict';

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MATCHES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
  const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];

  const DATA = {
    themes: [
      {
        id: 'chai',
        emoji: '☕',
        who: "Raju's Chai Corner",
        source: "Raju's sales notebook",
        what: 'chai sales',
        WHAT: 'CHAI SALES',
        unit: 'cups per month',
        unitShort: 'cups',
        base: [900, 1400],
        labels: MONTHS, period: 'month',
        icon: '☕',
        partner: { what: 'phone repairs next door', WHAT: 'PHONE REPAIRS NEXT DOOR', unit: 'repairs', base: [40, 70] },
        cause: {
          x: 'Samosas sold', y: 'Cups of chai sold', xUnit: 'samosas', yUnit: 'cups',
          xBase: [300, 700], yBase: [700, 1500],
          headline: 'SAMOSAS ARE MAKING PEOPLE CRAVE CHAI!',
          hidden: '🌧️ Cool, rainy months',
          lesson: 'Both climb in cool, rainy months, when more people stop at the stall. The weather drives both; samosas don\'t cause chai.',
        },
        pie: { title: 'Favourite chai (survey of 200 customers)', cats: ['Masala', 'Ginger', 'Elaichi', 'Plain'] },
      },
      {
        id: 'cricket',
        emoji: '🏏',
        who: 'Thunderbolts XI',
        source: 'the club scorebook',
        what: 'runs per match',
        WHAT: 'THUNDERBOLTS RUNS',
        unit: 'runs per match',
        unitShort: 'runs',
        base: [160, 250],
        labels: MATCHES, period: 'match',
        icon: '🏏',
        partner: { what: 'the team\'s social media followers', WHAT: 'SOCIAL MEDIA FOLLOWERS', unit: 'followers', base: [2000, 4000] },
        cause: {
          x: 'Ice creams sold at the ground', y: 'Runs scored', xUnit: 'ice creams', yUnit: 'runs',
          xBase: [150, 600], yBase: [140, 280],
          headline: 'ICE CREAM IS TURNING BATTERS INTO HEROES!',
          hidden: '☀️ Hot, dry match days',
          lesson: 'Hot, dry days give a flat pitch (more runs) and hot fans (more ice cream). Same cause, two effects.',
        },
        pie: { title: 'Best part of match day (survey of 300 fans)', cats: ['Batting', 'Bowling', 'Snacks', 'Crowd'] },
      },
      {
        id: 'rain',
        emoji: '🌧️',
        who: 'Puddleford weather station',
        source: 'Puddleford weather station',
        what: 'rain totals',
        WHAT: 'PUDDLEFORD RAIN TOTALS',
        unit: 'mm of rain per month',
        unitShort: 'mm',
        base: [70, 180],
        labels: MONTHS, period: 'month',
        icon: '🌧️',
        partner: { what: 'library visitors', WHAT: 'LIBRARY VISITS', unit: 'visitors', base: [500, 900] },
        cause: {
          x: 'Umbrellas sold in town', y: 'Rainfall (mm)', xUnit: 'umbrellas', yUnit: 'mm',
          xBase: [40, 260], yBase: [30, 220],
          headline: 'BUYING UMBRELLAS IS MAKING IT RAIN!',
          hidden: '☔ Wet months',
          lesson: 'The arrow points the other way: rain sells umbrellas. A link can be real while the headline gets the direction backwards.',
        },
        pie: { title: 'Favourite rain gear (survey of 250 Puddlefolk)', cats: ['Umbrella', 'Raincoat', 'Gumboots', 'Rain hat'] },
      },
      {
        id: 'app',
        emoji: '📱',
        who: 'the SnackSnap app',
        source: 'SnackSnap app-store dashboard',
        what: 'SnackSnap downloads',
        WHAT: 'SNACKSNAP DOWNLOADS',
        unit: 'thousand downloads per month',
        unitShort: 'k',
        base: [30, 70],
        labels: MONTHS, period: 'month',
        icon: '📱',
        partner: { what: 'the price of tomatoes', WHAT: 'TOMATO PRICES', unit: 'per kg', base: [20, 40] },
        cause: {
          x: 'Pizza orders in town', y: 'SnackSnap downloads (k)', xUnit: 'orders', yUnit: 'k',
          xBase: [800, 2000], yBase: [20, 80],
          headline: 'PIZZA IS DRIVING SNACKSNAP DOWNLOADS!',
          hidden: '🏖️ School-holiday months',
          lesson: 'Holiday months mean more free time: more pizza and more app downloads. A hidden third factor pushes both up.',
        },
        pie: { title: 'How users found SnackSnap (survey of 400 users)', cats: ['Friends', 'Store search', 'Social media', 'Ads'] },
      },
      {
        id: 'bus',
        emoji: '🚌',
        who: 'Route 7 buses',
        source: 'Route 7 depot log',
        what: 'on-time buses',
        WHAT: 'ON-TIME BUSES',
        unit: 'on-time buses per week',
        unitShort: 'buses',
        base: [300, 450],
        labels: WEEKS, period: 'week',
        icon: '🚌',
        partner: { what: 'pigeons counted at the depot', WHAT: 'DEPOT PIGEONS', unit: 'pigeons', base: [30, 60] },
        cause: {
          x: 'Raincoats sold in town', y: 'Late buses', xUnit: 'raincoats', yUnit: 'late buses',
          xBase: [20, 120], yBase: [10, 60],
          headline: 'RAINCOATS ARE MAKING ROUTE 7 RUN LATE!',
          hidden: '🌧️ Rainy weeks',
          lesson: 'Rain slows traffic and sells raincoats. The raincoats aren\'t delaying anyone; the weather is behind both.',
        },
        pie: { title: 'Why people ride Route 7 (survey of 180 riders)', cats: ['Cheap', 'No parking', 'Faster', 'Greener'] },
      },
    ],

    // The 9 crimes + honest. `short` is the evidence-card label (keep it short for 360px).
    crimes: {
      truncated: {
        emoji: '✂️',
        name: 'Chopped y-axis',
        short: 'Chopped axis',
        headlines: ['{WHAT} EXPLODE!', '{WHAT} GO THROUGH THE ROOF!', '{WHAT} SKYROCKET!'],
        lesson: 'The y-axis starts at {lo}, not 0. The real rise was only {pct}%, but the chopped axis made the last bar look {vis}× taller than the first.',
      },
      cherry: {
        emoji: '🍒',
        name: 'Cherry-picked time window',
        short: 'Cherry-picked',
        headlines: ['{WHAT} ON A RECORD-BREAKING RUN!', '{WHAT} ARE BOOMING!', 'BEST RUN EVER FOR {WHAT}!'],
        lesson: 'The chart showed only the last {win} points, a {wpct}% bounce. Zoom out to all {n} and {what} ended {fpct}% below where they started.',
      },
      dual: {
        emoji: '⚖️',
        name: 'Dual axes faking a link',
        short: 'Dual axes',
        headlines: ['{WHAT} SOAR RIGHT ALONGSIDE {PARTNER}!', '{WHAT} AND {PARTNER} RISE IN LOCKSTEP!'],
        lesson: 'Two y-axes with different scales let the designer make any two lines hug. On one shared scale, {what} rose {apct}% while {partner} rose {bpct}%.',
      },
      pie: {
        emoji: '🥧',
        name: 'Pie that adds up to more than 100%',
        short: 'Broken pie',
        headlines: ['{TOP} + {SECOND} = {sum2}%: A LANDSLIDE!', '{TOP} AND {SECOND} WIN {sum2}% OF THE VOTE!'],
        lesson: 'Add the slices: {sum}%. People could pick several answers, so a pie (parts of one whole) is the wrong chart, and adding slices double-counts people.',
      },
      picto: {
        emoji: '🎈',
        name: 'Inflated pictogram',
        short: 'Inflated icon',
        headlines: ['{WHAT} MORE THAN DOUBLE!', '{WHAT} BALLOON: LOOK AT THAT!'],
        lesson: 'The number went up {ratio}×, but the icon grew {ratio}× wider AND {ratio}× taller, so its area grew {area}×. Our eyes read area.',
      },
      intervals: {
        emoji: '📅',
        name: 'Uneven gaps on the x-axis',
        short: 'Uneven gaps',
        headlines: ['{WHAT} GROWTH IS ACCELERATING!', '{WHAT} ARE TAKING OFF FASTER AND FASTER!'],
        lesson: 'The years step 1 apart at first but up to {bigGap} apart at the end, yet they were drawn evenly spaced. Spaced by real time, it\'s a steady straight line: no speed-up.',
      },
      cumulative: {
        emoji: '🧮',
        name: 'Running total posing as growth',
        short: 'Running total',
        headlines: ['{WHAT} RISE EVERY SINGLE {PERIOD}!', '{WHAT} NEVER STOP CLIMBING!'],
        lesson: 'That was a running total, which can only go up. Per {period}, {what} actually fell from {first} to {last}.',
      },
      nounits: {
        emoji: '❓',
        name: 'Missing numbers and baseline',
        short: 'No numbers',
        headlines: ['{WHAT} COLLAPSE!', '{WHAT} IN FREEFALL!'],
        lesson: 'No numbers, no units, no zero line: you can\'t judge the size. With the axis back, the drop is just {pct}%.',
      },
      causation: {
        emoji: '🔗',
        name: 'Correlation sold as causation',
        short: 'Fake cause',
        headlines: [],
        lesson: '',
      },
    },
    honest: {
      emoji: '✅',
      name: 'Honest chart',
      lesson: [
        'Zero baseline, labelled units, the full time range and a headline that matches the numbers. This one plays fair.',
        'Nothing hidden: the axis starts at 0, the units are there and the claim fits the data. Trusting good charts is a skill too.',
        'Fair chart, fair headline. Being a sceptic means checking, not doubting everything.',
      ],
      pieLesson: 'The slices add up to exactly 100% and the headline matches the biggest one. Fair.',
      pictoLesson: 'The icon\'s AREA grows by the same factor as the number ({ratio}×). That\'s the honest way to scale a picture.',
    },
  };

  if (typeof window !== 'undefined') window.BG_DATA_CHARTS = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})();

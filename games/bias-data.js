// Bias Buster content. Every person, town, shop and brand here is invented.
// Each scenario lets the player fall into ONE thinking trap first (step1), then names it.
// step1.type 'choice': trapAnswer / goodAnswer are option indexes (goodAnswer may be an array).
// step1.type 'slider': range {min,max,step,start,prefix?,suffix?}; dodged = value inside goodRange.
// Every bias has the same number of scenarios (the daily rotation relies on that).
// Real-world numbers used: Everest 8,849 m; Gandhi died aged 78 (1869–1948); UN has 193 members;
// 1×2×…×8 = 40,320. Everything else is self-contained arithmetic or invented.
window.BG_DATA_BIAS = {
  biases: [
    { id: 'anchoring', name: 'Anchoring', emoji: '⚓',
      oneLiner: 'The first number you hear drags your estimate towards it.',
      tip: 'Ignore the number you were handed. Start from what you actually know, then adjust boldly.' },
    { id: 'framing', name: 'Framing effect', emoji: '🖼️',
      oneLiner: 'The same facts feel different when dressed up as a gain or a loss.',
      tip: 'Flip the frame: rewrite "10% fail" as "90% pass" and see if you still feel the same.' },
    { id: 'sunkcost', name: 'Sunk cost fallacy', emoji: '🕳️',
      oneLiner: 'Sticking with something because of what you already spent, not what lies ahead.',
      tip: 'Money and time already spent are gone either way. Compare only the futures.' },
    { id: 'baserate', name: 'Base-rate neglect', emoji: '📊',
      oneLiner: 'Ignoring how common something is in the first place.',
      tip: 'Picture 1,000 people. How many really are X? Then apply the evidence to that crowd.' },
    { id: 'confirmation', name: 'Confirmation bias', emoji: '🔎',
      oneLiner: 'Hunting only for evidence that agrees with what you already believe.',
      tip: 'Look for the test that could prove you WRONG. That is the one that teaches you something.' },
    { id: 'availability', name: 'Availability bias', emoji: '📺',
      oneLiner: 'Judging how likely something is by how easily examples spring to mind.',
      tip: 'Vivid is not the same as common. Ask for the counts, not the stories.' },
    { id: 'gambler', name: "Gambler's fallacy", emoji: '🎲',
      oneLiner: 'Believing a random event is "due" because it has not happened lately.',
      tip: 'Coins and dice have no memory. Every go is a fresh start.' },
    { id: 'conjunction', name: 'Conjunction fallacy', emoji: '🔗',
      oneLiner: 'Feeling that "A and B" is more likely than plain "A".',
      tip: 'Every extra detail is one more thing that must be true, so the chance can only go down.' },
    { id: 'planning', name: 'Planning fallacy', emoji: '📅',
      oneLiner: 'Underestimating how long your own tasks will take.',
      tip: 'Skip the best-case daydream. Check how long similar jobs ACTUALLY took.' },
    { id: 'survivorship', name: 'Survivorship bias', emoji: '✈️',
      oneLiner: 'Learning only from the winners, because the losers vanished from view.',
      tip: 'Ask: who failed, and is not here to be counted?' },
    { id: 'statusquo', name: 'Status quo bias', emoji: '🛋️',
      oneLiner: 'Sticking with the default just because it is the default.',
      tip: 'Ask: if I were choosing fresh today, would I pick this?' },
    { id: 'overconfidence', name: 'Overconfidence', emoji: '😎',
      oneLiner: 'Being more sure than your track record justifies.',
      tip: 'Check your past hit rate, and bet only what it supports.' },
    { id: 'halo', name: 'Halo effect', emoji: '😇',
      oneLiner: 'One shiny trait (looks, fame, charm) colours your judgement of everything else.',
      tip: 'Judge each quality on its own evidence.' },
    { id: 'decoy', name: 'Decoy effect', emoji: '🍿',
      oneLiner: 'A deliberately unattractive third option makes another one look like a steal.',
      tip: 'Cover the decoy with your thumb. Which would you pick from what is left?' },
  ],

  scenarios: [
    // ---------------- Anchoring ----------------
    {
      id: 'anc1', bias: 'anchoring', emoji: '🏔️',
      setup: 'Quiz night at the Chaipur chai stall. Quizmaster Bablu leans in: "Is Mount Everest taller or shorter than 2,000 metres?" Taller, obviously. Then he says: quick, no phones!',
      step1: {
        type: 'slider', q: 'Estimate the height of Mount Everest.',
        range: { min: 0, max: 15000, step: 100, start: 2000, suffix: ' m' },
        trapAnswer: 2000, goodRange: [7500, 10000],
        truth: 'Everest is about 8,849 m tall.',
        explain: 'That "2,000 m" was useless, yet it sat there pulling guesses down. Even the slider started on it, which made it extra sticky.',
      },
      nameOptions: ['anchoring', 'availability', 'gambler', 'conjunction'],
      redo: {
        question: 'Bablu\'s next card: "Is the Ganga longer or shorter than 50 km?" Your best move?',
        options: ['Start near 50 km and nudge upwards', 'Ignore the 50 and estimate from what I know', 'Average 50 with my gut guess'],
        answer: 1,
      },
    },
    {
      id: 'anc2', bias: 'anchoring', emoji: '👴',
      setup: 'Your cousin Pappu, who is very sure of everything, asks: "Did Mahatma Gandhi live past the age of 140?" No, obviously. "Okay then, smarty…"',
      step1: {
        type: 'slider', q: 'How old was Gandhi when he died?',
        range: { min: 0, max: 150, step: 1, start: 140, suffix: ' yrs' },
        trapAnswer: 140, goodRange: [70, 86],
        truth: 'Gandhi was 78 (born 1869, died 1948).',
        explain: 'A ridiculous 140 still drags estimates upwards. In a classic experiment, people who first heard "140" guessed Gandhi was older than people who first heard "9".',
      },
      nameOptions: ['anchoring', 'gambler', 'conjunction', 'halo'],
      redo: {
        question: 'Pappu again: "Was the Taj Mahal finished before or after the year 3000?" Your plan?',
        options: ['Treat 3000 as nonsense and reason from what I know', 'Pick a year near 3000 to be safe', 'Go halfway between 3000 and today'],
        answer: 0,
      },
    },
    {
      id: 'anc3', bias: 'anchoring', emoji: '🌍',
      setup: 'Inter-college GK quiz. The card reads: "Is the number of member countries in the United Nations more or less than 25?" More, surely. Next part of the card:',
      step1: {
        type: 'slider', q: 'How many member countries does the UN have?',
        range: { min: 0, max: 300, step: 1, start: 25 },
        trapAnswer: 25, goodRange: [165, 220],
        truth: 'The UN has 193 member countries.',
        explain: 'A low starting number makes people adjust upwards, but not nearly far enough. Anchors work even when you know they are random.',
      },
      nameOptions: ['anchoring', 'conjunction', 'halo', 'sunkcost'],
      redo: {
        question: 'Your teammate got a card asking "more or less than 280?" and guessed 240. Why do your guesses differ so much?',
        options: ['Different anchors pulled us in different directions', 'My teammate knows more geography', 'We both guessed totally at random'],
        answer: 0,
      },
    },
    {
      id: 'anc4', bias: 'anchoring', emoji: '👩‍🏫',
      setup: 'Mrs. Kulkarni writes on the board: 1 × 2 × 3 × 4 × 5 × 6 × 7 × 8. "Five seconds. No working out. Gut feeling only!"',
      step1: {
        type: 'slider', q: 'Gut estimate: what does it come to?',
        range: { min: 0, max: 60000, step: 500, start: 500 },
        trapAnswer: 500, goodRange: [25000, 55000],
        truth: 'It is 40,320.',
        explain: 'Starting with 1 × 2 × 3 feels tiny, so gut estimates land far too low. In the classic study, people shown 8 × 7 × 6… guessed much higher than people shown 1 × 2 × 3…, and both groups were way under.',
      },
      nameOptions: ['anchoring', 'halo', 'sunkcost', 'availability'],
      redo: {
        question: 'Same sum, written 8 × 7 × 6 × 5 × 4 × 3 × 2 × 1. Should your answer change?',
        options: ['Yes, it looks bigger now', 'No, it is the same product, so the same answer', 'Yes, it looks smaller now'],
        answer: 1,
      },
    },
    {
      id: 'anc5', bias: 'anchoring', emoji: '🏏',
      setup: 'Sunday market. A seller waves a used cricket bat: "Original price ₹12,000, boss!" You checked online: the same used bat usually sells for about ₹1,500.',
      step1: {
        type: 'slider', q: 'What is a sensible first offer?',
        range: { min: 0, max: 12000, step: 100, start: 12000, prefix: '₹' },
        trapAnswer: 12000, goodRange: [800, 2000],
        truth: 'Around ₹1,500, the going rate for this used bat.',
        explain: 'The ₹12,000 is the seller\'s anchor. An offer that "feels reasonable next to ₹12,000" can still be miles above what the bat is worth.',
      },
      nameOptions: ['anchoring', 'sunkcost', 'availability', 'gambler'],
      redo: {
        question: 'Next stall: "This kurta was ₹4,999, today only ₹2,499!" What should decide your offer?',
        options: ['What similar kurtas actually sell for', 'The 50% discount', 'The original ₹4,999'],
        answer: 0,
      },
    },

    // ---------------- Framing ----------------
    {
      id: 'frm1', bias: 'framing', emoji: '🩺',
      setup: 'Nani needs a routine knee operation. Two surgeons, same hospital, same procedure. Dr. Rao\'s poster: "90% of my patients walk pain-free within a month." Dr. Iyer\'s poster: "10% of my patients still have pain after a month."',
      step1: {
        type: 'choice', q: 'Who has the better results?',
        options: ['Dr. Rao: 90% sounds great', 'Dr. Iyer: at least she is honest', 'They are exactly the same'],
        trapAnswer: 0, goodAnswer: 2,
        explain: '90% pain-free and 10% still in pain are the same result. A "success" frame simply feels nicer than a "failure" frame.',
      },
      nameOptions: ['framing', 'halo', 'gambler', 'conjunction'],
      redo: {
        question: 'Rewrite "1 in 5 students fail this exam" in the gain frame.',
        options: ['1 in 5 students pass', '4 in 5 students pass', 'Every student passes'],
        answer: 1,
      },
    },
    {
      id: 'frm2', bias: 'framing', emoji: '🧀',
      setup: 'Supermarket aisle. Paneer A shouts: "80% FAT-FREE!" Paneer B says: "Contains 20% fat." Same price, same weight.',
      step1: {
        type: 'choice', q: 'Which is the lower-fat choice?',
        options: ['Paneer B', 'They are the same', 'Paneer A'],
        trapAnswer: 2, goodAnswer: 1,
        explain: '80% fat-free means 20% fat. Packet A just put a happy spin on the very same number.',
      },
      nameOptions: ['framing', 'gambler', 'conjunction', 'sunkcost'],
      redo: {
        question: 'A biscuit box boasts: "Now 30% less sugar than before!" What should you check?',
        options: ['How much sugar is actually in each biscuit', 'Whether the box is green', 'Nothing: "less" always means healthy'],
        answer: 0,
      },
    },
    {
      id: 'frm3', bias: 'framing', emoji: '📚',
      setup: 'Two coaching classes put up banners. Sharma Classes: "75% of our students clear the exam!" Verma Classes: "Only 25% of our students fail!" Same exam, same batch sizes.',
      step1: {
        type: 'choice', q: 'Which institute has the better record?',
        options: ['Sharma Classes', 'Verma Classes', 'Neither: the records are identical'],
        trapAnswer: 0, goodAnswer: 2,
        explain: '75% clear = 25% fail. Same numbers in different outfits. The word "fail" stings even with "only" in front of it.',
      },
      nameOptions: ['framing', 'conjunction', 'sunkcost', 'survivorship'],
      redo: {
        question: 'Verma Classes repaints its banner: "75% of our students clear the exam!" Should your opinion of Verma change?',
        options: ['Yes, it sounds better now', 'No, it is the same fact'],
        answer: 1,
      },
    },
    {
      id: 'frm4', bias: 'framing', emoji: '🍛',
      setup: 'Lunchtime. Stall A: "Thali ₹200. Get ₹20 OFF when you pay by UPI!" Stall B: "Thali ₹180. ₹20 extra if you pay cash." Same thali, and you always pay by UPI.',
      step1: {
        type: 'choice', q: 'Which deal is better for you?',
        options: ['Stall A: I get a discount!', 'Stall B: it is cheaper', 'Both cost me the same'],
        trapAnswer: 0, goodAnswer: 2,
        explain: 'Paying by UPI, both thalis cost ₹180. A "discount" feels like a win and a "surcharge" feels like a loss, even when the money is identical.',
      },
      nameOptions: ['framing', 'sunkcost', 'survivorship', 'halo'],
      redo: {
        question: 'App A: train ticket ₹550, with ₹50 cashback if you book today. App B: ₹500 if you book today, ₹550 tomorrow. You are booking today. Which is cheaper?',
        options: ['App A, cashback!', 'Both cost ₹500 today', 'App B'],
        answer: 1,
      },
    },
    {
      id: 'frm5', bias: 'framing', emoji: '🌊',
      setup: 'A flood is heading for 600 homes in the village of Pakodapur. The panchayat has two plans. Plan A: "200 homes will be saved." Plan B: "400 homes will be lost."',
      step1: {
        type: 'choice', q: 'Which plan protects more homes?',
        options: ['Plan A', 'Plan B', 'They protect the same number'],
        trapAnswer: 0, goodAnswer: 2,
        explain: '600 homes minus 400 lost = 200 saved. In a famous study, people flipped their choices when the same outcome was described as lives saved instead of lives lost.',
      },
      nameOptions: ['framing', 'survivorship', 'halo', 'gambler'],
      redo: {
        question: 'An engineer says: "There is a 30% chance the old dam leaks this year." What is the same fact in the other frame?',
        options: ['70% chance it does not leak', '30% chance it does not leak', 'The dam is safe'],
        answer: 0,
      },
    },

    // ---------------- Sunk cost ----------------
    {
      id: 'sc1', bias: 'sunkcost', emoji: '🎬',
      setup: 'You bought a non-refundable ₹800 ticket for tonight\'s 3-hour movie. Now it is pouring, you are exhausted, and friends invite you to free cricket on the terrace next door, which you would honestly enjoy more.',
      step1: {
        type: 'choice', q: 'What do you do tonight?',
        options: ['Go to the movie. I PAID ₹800!', 'Play cricket with friends'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'The ₹800 is gone whichever you choose. The only live question is which evening you would enjoy more, and you already said: cricket.',
      },
      nameOptions: ['sunkcost', 'gambler', 'anchoring', 'conjunction'],
      redo: {
        question: 'If the ticket had been a free gift, you would pick cricket. Does having paid ₹800 change which evening is better?',
        options: ['No: the money is gone either way', 'Yes: paying makes the movie more fun'],
        answer: 0,
      },
    },
    {
      id: 'sc2', bias: 'sunkcost', emoji: '🍽️',
      setup: 'You paid ₹999 for the all-you-can-eat buffet at Hotel Mast Kalandar. Four plates in, you are completely full. The gulab jamun counter is staring at you.',
      step1: {
        type: 'choice', q: 'Another plate?',
        options: ['Yes. I must get my money\'s worth!', 'No. I am full, so I stop.'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Stuffing yourself will not bring back the ₹999. It just adds a stomach ache to the bill.',
      },
      nameOptions: ['sunkcost', 'anchoring', 'conjunction', 'availability'],
      redo: {
        question: 'Your friend says: "At ₹999 you have to eat at least ₹999 worth!" Best reply?',
        options: ['The ₹999 is spent either way, so I eat only what I want', 'True, bring one more plate', 'Let\'s pack food in our pockets'],
        answer: 0,
      },
    },
    {
      id: 'sc3', bias: 'sunkcost', emoji: '🥟',
      setup: 'Chintu has spent 2 years and ₹3 lakh building a samosa-delivery app. It has 12 users (mostly his mausi). A mentor shows him a second idea with clearly better prospects for his next ₹1 lakh.',
      step1: {
        type: 'choice', q: 'Where should his next ₹1 lakh go?',
        options: ['The samosa app, or the ₹3 lakh was wasted', 'The better new idea'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'The ₹3 lakh is spent no matter what Chintu does next. Throwing good money after bad does not rescue it.',
      },
      nameOptions: ['sunkcost', 'conjunction', 'availability', 'halo'],
      redo: {
        question: 'Which question should Chintu ask himself?',
        options: ['Which option gives the best result from TODAY on?', 'How do I avoid admitting the ₹3 lakh is gone?', 'Which project have I worked on longer?'],
        answer: 0,
      },
    },
    {
      id: 'sc4', bias: 'sunkcost', emoji: '🚆',
      setup: 'Your ₹300 train ticket is non-refundable, and the train is now delayed by 5 hours. A bus leaving right now gets you there 3 hours sooner for ₹200, and you would gladly pay ₹200 to save 3 hours.',
      step1: {
        type: 'choice', q: 'What do you do?',
        options: ['Take the bus', 'Wait. I am not wasting my ₹300 ticket!'],
        trapAnswer: 1, goodAnswer: 0,
        explain: 'The ₹300 is lost either way. Since 3 hours are worth more than ₹200 to you, the bus wins.',
      },
      nameOptions: ['sunkcost', 'availability', 'halo', 'gambler'],
      redo: {
        question: 'Which costs should matter in this decision?',
        options: ['The ₹300 ticket', 'The extra ₹200 versus the 3 hours saved', 'How much you like trains in general'],
        answer: 1,
      },
    },
    {
      id: 'sc5', bias: 'sunkcost', emoji: '🎸',
      setup: 'Tanya paid ₹15,000 (no refunds) for a 6-month guitar course. Three months in, she realises she hates guitar and loves the free dance class at college. Both are on Saturday mornings.',
      step1: {
        type: 'choice', q: 'What should Tanya do on Saturdays now?',
        options: ['Keep going to guitar: ₹15,000 is ₹15,000!', 'Switch to dance'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'The fee is gone whether she strums or dances. Three more months of suffering will not refund a single rupee.',
      },
      nameOptions: ['sunkcost', 'halo', 'gambler', 'anchoring'],
      redo: {
        question: 'Tanya\'s dad says: "Finish what you paid for!" Best reply?',
        options: ['The money is spent either way; my Saturdays should go to what helps me now', 'You are right, money is sacred', 'I will do both at the same time'],
        answer: 0,
      },
    },

    // ---------------- Base-rate neglect ----------------
    {
      id: 'br1', bias: 'baserate', emoji: '🧪',
      setup: 'Your college runs a new "Exam Panic" screening test. It flags 90% of students who really have exam panic, but it also wrongly flags 10% of calm students. Only 1 in 100 students actually has exam panic. Ravi gets flagged.',
      step1: {
        type: 'choice', q: 'Roughly how likely is it that Ravi really has exam panic?',
        options: ['About 90%', 'About 50%', 'About 8%'],
        trapAnswer: 0, goodAnswer: 2,
        explain: 'Picture 1,000 students: 10 have it (9 get flagged), 990 do not (99 get wrongly flagged). Only 9 of the 108 flagged students really have it: about 8%.',
      },
      nameOptions: ['baserate', 'availability', 'gambler', 'anchoring'],
      redo: {
        question: 'Before trusting any positive test result, what is the first thing to ask?',
        options: ['How common is the condition to begin with?', 'How expensive was the test?', 'How confident does the doctor look?'],
        answer: 0,
      },
    },
    {
      id: 'br2', bias: 'baserate', emoji: '📜',
      setup: 'Meera loves poetry. She studies at a college with 950 engineering students and 50 literature students. A survey says 80% of literature students love poetry, and so do 10% of engineering students.',
      step1: {
        type: 'choice', q: 'What is Meera more likely to study?',
        options: ['Literature, obviously', 'Engineering'],
        trapAnswer: 0, goodAnswer: 1,
        explain: '80% of 50 = 40 poetry-loving literature students. 10% of 950 = 95 poetry-loving engineers. Meera is more than twice as likely to be an engineer.',
      },
      nameOptions: ['baserate', 'gambler', 'anchoring', 'halo'],
      redo: {
        question: 'Which fact did the "obvious" answer ignore?',
        options: ['There are 19 engineers for every literature student', 'Meera\'s age', 'The college\'s ranking'],
        answer: 0,
      },
    },
    {
      id: 'br3', bias: 'baserate', emoji: '🛺',
      setup: 'In Chaipur, 85 of every 100 autos are green and 15 are blue. After a late-night bump, a witness says the auto was blue. Tests show this witness names colours correctly 80% of the time at night.',
      step1: {
        type: 'choice', q: 'How likely is it that the auto really was blue?',
        options: ['About 80%', 'About 41%', 'About 15%'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Per 100 autos: 15 blue × 80% = 12 correctly called blue; 85 green × 20% = 17 wrongly called blue. 12 out of 29 is about 41%. All those green autos create lots of false "blue" calls.',
      },
      nameOptions: ['baserate', 'anchoring', 'halo', 'sunkcost'],
      redo: {
        question: 'What made the 80% answer wrong?',
        options: ['It ignored that green autos are far more common', 'The witness was lying', 'Night-time does not matter'],
        answer: 0,
      },
    },
    {
      id: 'br4', bias: 'baserate', emoji: '🚨',
      setup: 'A bank\'s fraud alarm catches 99% of fraudulent payments, but also wrongly flags 1% of normal ones. Only 1 in 10,000 payments is actually fraud. Your ₹40 chai payment gets flagged.',
      step1: {
        type: 'choice', q: 'How likely is it to really be fraud?',
        options: ['About 99%', 'About 50%', 'About 1%'],
        trapAnswer: 0, goodAnswer: 2,
        explain: 'Out of 1,000,000 payments: 100 are fraud (99 flagged), and 1% of the other 999,900 gives about 9,999 false alarms. Only 99 of roughly 10,100 flags are real: about 1%.',
      },
      nameOptions: ['baserate', 'halo', 'sunkcost', 'availability'],
      redo: {
        question: 'Easiest way to work out problems like this?',
        options: ['Imagine a big crowd, like 1,000,000 payments, and count', 'Trust the 99% headline', 'Assume it is half and half'],
        answer: 0,
      },
    },
    {
      id: 'br5', bias: 'baserate', emoji: '🔭',
      setup: 'Cricket scout Bhola says his "star sense" spots 80% of kids who will become stars, but it also wrongly tags 20% of kids who will not. In his academy, only 1 in 50 kids becomes a star. He tags young Golu.',
      step1: {
        type: 'choice', q: 'How likely is Golu to become a star?',
        options: ['About 80%', 'About 8%', 'About 50%'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Per 50 kids: 1 future star (tagged 80% of the time) and 49 others (about 9.8 wrongly tagged). That is 0.8 real stars out of 10.6 tags: about 8%.',
      },
      nameOptions: ['baserate', 'sunkcost', 'availability', 'gambler'],
      redo: {
        question: 'Bhola tags 10 kids this season. Roughly how many will become stars?',
        options: ['About 8', 'About 1', 'All 10'],
        answer: 1,
      },
    },

    // ---------------- Confirmation bias ----------------
    {
      id: 'cf1', bias: 'confirmation', emoji: '🃏',
      setup: 'Each card has a letter on one side and a number on the other. Bablu claims: "If a card has a vowel on one side, it has an even number on the other." The cards on the table show: A, K, 4, 7.',
      step1: {
        type: 'choice', q: 'Which cards MUST you flip to check whether Bablu is wrong?',
        options: ['A and 4', 'A only', 'A and 7', 'All four'],
        trapAnswer: 0, goodAnswer: 2,
        explain: 'Flip A (it needs an even number) and 7 (a vowel behind it breaks the rule). The 4 can only agree with the rule, never break it. Most people pick A and 4: they go looking for agreement.',
      },
      nameOptions: ['confirmation', 'gambler', 'anchoring', 'decoy'],
      redo: {
        question: 'Cards have a shape on one side and a colour on the other. Rule: "If circle, then red." Cards show: circle, square, red, blue. Which do you flip?',
        options: ['Circle and red', 'Circle and blue', 'Square and blue'],
        answer: 1,
      },
    },
    {
      id: 'cf2', bias: 'confirmation', emoji: '🍱',
      setup: 'Canteen rule: "If a tiffin has a red lid, it contains rice." On the counter: a closed red-lid tiffin, a closed blue-lid tiffin, and two opened tiffins (lids out of sight), one with rice and one with roti.',
      step1: {
        type: 'choice', q: 'Which tiffins must you check to catch a rule-breaker?',
        options: ['Red lid and the rice one', 'Red lid and the roti one', 'Only the red lid', 'Blue lid and the roti one'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'A rule-breaker is a red lid without rice. So check the red lid (rice inside?) and the roti one (is its lid red?). The rice tiffin cannot break the rule, whatever its lid.',
      },
      nameOptions: ['confirmation', 'anchoring', 'decoy', 'sunkcost'],
      redo: {
        question: 'Why is checking the rice tiffin a waste of time?',
        options: ['Whatever its lid, it cannot break the rule', 'Rice is boring', 'It might secretly be roti'],
        answer: 0,
      },
    },
    {
      id: 'cf3', bias: 'confirmation', emoji: '🔢',
      setup: 'Bablu has a secret rule for number triples. He says "2, 4, 6" fits it. You suspect the rule is "goes up by 2". You may test one triple, and he will say Yes or No.',
      step1: {
        type: 'choice', q: 'Which test teaches you the most?',
        options: ['8, 10, 12', '100, 102, 104', '1, 7, 50'],
        trapAnswer: 0, goodAnswer: 2,
        explain: '8-10-12 and 100-102-104 fit your guess, so a Yes tells you nothing new. 1-7-50 could break your theory. (Bablu\'s rule was "any three increasing numbers".)',
      },
      nameOptions: ['confirmation', 'decoy', 'sunkcost', 'framing'],
      redo: {
        question: 'Bablu says Yes to 1, 7, 50. Now what?',
        options: ['"Up by 2" is wrong; next try something like 3, 2, 1', 'Ignore it and test 12, 14, 16', 'Declare victory anyway'],
        answer: 0,
      },
    },
    {
      id: 'cf4', bias: 'confirmation', emoji: '🍀',
      setup: 'Kabir is sure his "lucky" bat makes him score more runs. He can name 5 big innings he played with it.',
      step1: {
        type: 'choice', q: 'What is the best way to test his belief?',
        options: ['Find more big innings he played with the lucky bat', 'Compare his average with and without the lucky bat', 'Ask teammates if they believe in lucky bats'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'More success stories with the bat prove nothing. You need the comparison: how he does WITHOUT it, plus his low scores WITH it.',
      },
      nameOptions: ['confirmation', 'sunkcost', 'framing', 'gambler'],
      redo: {
        question: 'Which fact would most weaken Kabir\'s belief?',
        options: ['He averages the same with his regular bat', 'He once scored 80 with the lucky bat', 'He really likes the bat\'s sticker'],
        answer: 0,
      },
    },
    {
      id: 'cf5', bias: 'confirmation', emoji: '⏰',
      setup: 'You are convinced your friend Tinku is ALWAYS late, and you want to prove it to the group.',
      step1: {
        type: 'choice', q: 'How do you check fairly?',
        options: ['List all the times he has been late', 'Go through your last 20 meet-ups and count on-time vs late', 'Ask the friends who also think he is always late'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Listing only late arrivals, or asking people who already agree, collects support, not truth. A fair check counts both kinds.',
      },
      nameOptions: ['confirmation', 'framing', 'gambler', 'anchoring'],
      redo: {
        question: 'Your 20-meet-up count shows Tinku was late 4 times. Best conclusion?',
        options: ['He is usually on time', 'Still always late; the count must be wrong', 'He was faking punctuality'],
        answer: 0,
      },
    },

    // ---------------- Availability ----------------
    {
      id: 'av1', bias: 'availability', emoji: '📖',
      setup: 'Imagine 4 pages of an English novel, about 2,000 words. Quick, start thinking of examples!',
      step1: {
        type: 'choice', q: 'Which kind of word appears more often?',
        options: ['7-letter words ending in -ing (_ _ _ _ i n g)', '7-letter words with n as the 6th letter (_ _ _ _ _ n _)'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Every _ _ _ _ i n g word also has n as its 6th letter, so the second group includes all of the first, plus words like "present" and "content". The -ing words just pop into mind more easily.',
      },
      nameOptions: ['availability', 'gambler', 'anchoring', 'halo'],
      redo: {
        question: 'The lesson from this?',
        options: ['What comes to mind easily is not always what is most common', '-ing words are rare', 'Always pick the longer option'],
        answer: 0,
      },
    },
    {
      id: 'av2', bias: 'availability', emoji: '🛫',
      setup: 'After a week of news about one plane crash, Tara cancels her flight and decides to drive 1,500 km to Goa instead, to be "safe".',
      step1: {
        type: 'choice', q: 'Per kilometre travelled, which is riskier?',
        options: ['Flying', 'Driving', 'About the same'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Per kilometre, driving is far deadlier than flying with an airline. Plane crashes are rare but dramatic, so they flood the news and our memory.',
      },
      nameOptions: ['availability', 'anchoring', 'halo', 'decoy'],
      redo: {
        question: 'What should Tara compare instead of headlines?',
        options: ['Deaths per kilometre travelled for each option', 'How scary each crash looked', 'What her neighbours think'],
        answer: 0,
      },
    },
    {
      id: 'av3', bias: 'availability', emoji: '🦈',
      setup: 'Movie night: a shark thriller. Now your little cousin refuses to swim in the sea. "Sharks are the deadliest animals ever!"',
      step1: {
        type: 'choice', q: 'Which animal causes the most human deaths worldwide each year?',
        options: ['Sharks', 'Tigers', 'Mosquitoes'],
        trapAnswer: 0, goodAnswer: 2,
        explain: 'Mosquitoes, by spreading diseases like malaria, are linked to hundreds of thousands of deaths a year. Sharks kill only a handful. Dramatic dangers are easy to picture, so they feel more common.',
      },
      nameOptions: ['availability', 'halo', 'decoy', 'sunkcost'],
      redo: {
        question: 'Your cousin asks how to judge danger. Best advice?',
        options: ['Look up how often it actually happens', 'Go by how scary the movie was', 'Avoid anything with teeth'],
        answer: 0,
      },
    },
    {
      id: 'av4', bias: 'availability', emoji: '🚉',
      setup: 'Uncle Jagdish still talks about the three times the 7:15 local was horribly late. So now he leaves home an hour early, every single day. The railway app shows the 7:15 was more than 10 minutes late on just 6 of the last 200 days.',
      step1: {
        type: 'choice', q: 'What should guide his routine?',
        options: ['The 200-day record', 'Uncle\'s three vivid memories'],
        trapAnswer: 1, goodAnswer: 0,
        explain: 'Three dramatic mornings feel like "always" because they are easy to recall. The record says the train ran roughly on time on 97% of days.',
      },
      nameOptions: ['availability', 'decoy', 'sunkcost', 'gambler'],
      redo: {
        question: 'A smart time buffer for Uncle would be based on…',
        options: ['How late the train usually runs', 'The worst morning ever', 'His neighbour\'s horror stories'],
        answer: 0,
      },
    },
    {
      id: 'av5', bias: 'availability', emoji: '📱',
      setup: 'Two of Pinky\'s neighbours had phones stolen this month, and it is all her building\'s WhatsApp group talks about. Now she says "half of Chaipur gets robbed every year". Chaipur police records show about 1 phone theft per 200 people per year.',
      step1: {
        type: 'choice', q: 'Which estimate is more trustworthy?',
        options: ['Pinky\'s "half the city"', 'The records: about 1 in 200'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Recent, emotional, close-to-home stories are easy to recall, so they feel common. Counts beat chatter.',
      },
      nameOptions: ['availability', 'sunkcost', 'gambler', 'anchoring'],
      redo: {
        question: 'What should Pinky do with her worry?',
        options: ['Take sensible precautions, sized to the real risk', 'Never leave the house again', 'Ignore it completely'],
        answer: 0,
      },
    },

    // ---------------- Gambler's fallacy ----------------
    {
      id: 'gf1', bias: 'gambler', emoji: '🪙',
      setup: 'Bunty flips a fair coin. HEADS. HEADS. HEADS. HEADS. HEADS. Five in a row! The crowd at the chai stall goes silent.',
      step1: {
        type: 'choice', q: 'What is the chance the next flip is tails?',
        options: ['More than 50%: tails is due', 'Exactly 50%', 'Less than 50%: heads is on a roll'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'A fair coin has no memory. Every flip is 50-50, whatever came before.',
      },
      nameOptions: ['gambler', 'anchoring', 'halo', 'sunkcost'],
      redo: {
        question: 'Bunty asks: "So what DOES five heads in a row tell us about the next flip?"',
        options: ['Nothing, if the coin is fair', 'Tails is coming', 'The coin is getting tired'],
        answer: 0,
      },
    },
    {
      id: 'gf2', bias: 'gambler', emoji: '🏆',
      setup: 'Captain Ravi of the Pakodapur XI has lost the toss 6 matches in a row. Before the final, his teammates grin: "Relax, you are DUE a win!"',
      step1: {
        type: 'choice', q: 'How likely is Ravi to win this toss?',
        options: ['More likely than usual', '50-50, as always', 'Less likely: he is unlucky'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'The coin does not know Ravi\'s history. Losing six tosses does not build up any "credit".',
      },
      nameOptions: ['gambler', 'halo', 'sunkcost', 'statusquo'],
      redo: {
        question: 'Ravi wants to call heads "because tails keeps coming up". Does his call matter?',
        options: ['No: both calls are 50-50', 'Yes: heads is due', 'Yes: tails is hot, so call tails'],
        answer: 0,
      },
    },
    {
      id: 'gf3', bias: 'gambler', emoji: '🎲',
      setup: 'Ludo night at Nani\'s. You need a 6 to get your piece out, and you have not rolled one in your last 12 turns. Your cousins are howling with laughter.',
      step1: {
        type: 'choice', q: 'Chance of a 6 on your next roll?',
        options: ['Higher than usual: it is overdue', 'Still 1 in 6', 'Lower than usual: I am cursed'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'A fair die has no memory. Every roll is a fresh 1 in 6.',
      },
      nameOptions: ['gambler', 'sunkcost', 'statusquo', 'survivorship'],
      redo: {
        question: 'Which of these actually makes a 6 more likely?',
        options: ['Nothing: every roll of a fair die is 1 in 6', 'Blowing on the die', 'Waiting longer between rolls'],
        answer: 0,
      },
    },
    {
      id: 'gf4', bias: 'gambler', emoji: '🎟️',
      setup: 'The Diwali lucky draw picks one number from 1 to 50 each week with a fair machine. Number 27 has not come up for 40 weeks. Uncle wants ticket 27: "It is overdue!"',
      step1: {
        type: 'choice', q: 'How do 27\'s chances compare with other numbers this week?',
        options: ['Higher: it is overdue', 'Exactly the same', 'Lower: it is jinxed'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'With a fair machine, every number has the same 1 in 50 chance every week, however long it has been missing.',
      },
      nameOptions: ['gambler', 'statusquo', 'survivorship', 'anchoring'],
      redo: {
        question: 'Which ticket number has the best odds this week?',
        options: ['They are all equal', '27', 'Last week\'s winner'],
        answer: 0,
      },
    },
    {
      id: 'gf5', bias: 'gambler', emoji: '👶',
      setup: 'The Sharmas have four daughters and are expecting a fifth child. Dadi is certain: "After four girls, a boy is definitely coming!" (For this puzzle, treat each birth as a 50-50 chance.)',
      step1: {
        type: 'choice', q: 'Chance the fifth baby is a boy?',
        options: ['Much higher than 50%', 'About 50%', 'Much lower than 50%'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'In this setup each birth is its own 50-50 event. Earlier births do not push the next one either way.',
      },
      nameOptions: ['gambler', 'survivorship', 'anchoring', 'halo'],
      redo: {
        question: 'Dadi says: "It has to even out!" What is true?',
        options: ['Chance does not "balance the books" on the next baby', 'The next baby must balance things out', 'Four girls means girls forever'],
        answer: 0,
      },
    },

    // ---------------- Conjunction fallacy ----------------
    {
      id: 'cj1', bias: 'conjunction', emoji: '🗣️',
      setup: 'Bunty is 31, outspoken and brilliant. In college he ran the debate club and organised clean-the-river drives every weekend.',
      step1: {
        type: 'choice', q: 'Which is more likely?',
        options: ['Bunty is a bank clerk', 'Bunty is a bank clerk AND an environmental activist'],
        trapAnswer: 1, goodAnswer: 0,
        explain: 'Every activist bank clerk is also a bank clerk, so the second option can never be more likely than the first. The story just makes it feel more "Bunty".',
      },
      nameOptions: ['conjunction', 'anchoring', 'gambler', 'sunkcost'],
      redo: {
        question: 'Adding details to a story makes it…',
        options: ['Less likely (or at best equally likely)', 'More likely', 'Exactly twice as likely'],
        answer: 0,
      },
    },
    {
      id: 'cj2', bias: 'conjunction', emoji: '💃',
      setup: 'Dolly, 28, has a statistics degree, solves sudoku on the metro and colour-codes her grocery list.',
      step1: {
        type: 'choice', q: 'Which is more likely?',
        options: ['Dolly is a dancer who keeps her accounts in spreadsheets', 'Dolly is a dancer'],
        trapAnswer: 0, goodAnswer: 1,
        explain: '"Dancer" covers every dancer, spreadsheet fans included. The extra detail fits Dolly\'s vibe, but it can only shrink the odds.',
      },
      nameOptions: ['conjunction', 'gambler', 'sunkcost', 'statusquo'],
      redo: {
        question: 'Which is more likely? (a) It rains in Mumbai tomorrow. (b) It rains in Mumbai tomorrow AND the local trains run late.',
        options: ['(a)', '(b)'],
        answer: 0,
      },
    },
    {
      id: 'cj3', bias: 'conjunction', emoji: '🔥',
      setup: 'Final of the Chaipur Premier League. Fast bowler Raju has been in red-hot form all season.',
      step1: {
        type: 'choice', q: 'Which is more likely?',
        options: ['Raju takes a wicket AND his team wins the final', 'Raju takes a wicket'],
        trapAnswer: 0, goodAnswer: 1,
        explain: '"Takes a wicket and team wins" needs two things to happen. "Takes a wicket" needs just one.',
      },
      nameOptions: ['conjunction', 'sunkcost', 'statusquo', 'decoy'],
      redo: {
        question: 'Which bet is safer?',
        options: ['The Rajdhani is late tomorrow', 'There is fog in Delhi AND the Rajdhani is late tomorrow'],
        answer: 0,
      },
    },
    {
      id: 'cj4', bias: 'conjunction', emoji: '🍅',
      setup: 'Mr. Kulkarni, 68, is a retired chemistry teacher who reads three newspapers every morning with a magnifying glass.',
      step1: {
        type: 'choice', q: 'Which is more likely?',
        options: ['He plays online video games', 'He plays online video games AND grows prize-winning tomatoes'],
        trapAnswer: 1, goodAnswer: 0,
        explain: 'Gamers with prize tomatoes are a small slice of all gamers. The tomato detail makes the story feel right, but it makes it less likely.',
      },
      nameOptions: ['conjunction', 'statusquo', 'decoy', 'anchoring'],
      redo: {
        question: 'Spot the rule: the chance of "A and B" is…',
        options: ['Never more than the chance of A alone', 'Always more than the chance of A alone', 'Chance of A plus chance of B'],
        answer: 0,
      },
    },
    {
      id: 'cj5', bias: 'conjunction', emoji: '😴',
      setup: 'Your friend Golu studied all night for the physics exam, then drank four cups of cutting chai on the way in.',
      step1: {
        type: 'choice', q: 'Which is more likely?',
        options: ['Golu dozes off in the exam AND fails it', 'Golu dozes off in the exam'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'A story with a dramatic ending feels convincing, but "dozes off and fails" can never beat "dozes off" on its own.',
      },
      nameOptions: ['conjunction', 'decoy', 'anchoring', 'gambler'],
      redo: {
        question: 'A detective says: "The butler did it, with a knife, in the kitchen, at midnight." Each extra detail makes the full theory…',
        options: ['Less likely to be entirely true', 'More likely', 'No different'],
        answer: 0,
      },
    },

    // ---------------- Planning fallacy ----------------
    {
      id: 'pl1', bias: 'planning', emoji: '📝',
      setup: 'You have a project due. Your gut says: "3 days, easy." Your last 4 projects each took about twice as long as you planned.',
      step1: {
        type: 'choice', q: 'How many days should you budget?',
        options: ['3 days', '4 days', '6 days'],
        trapAnswer: 0, goodAnswer: 2,
        explain: 'Your own track record says "about double". Planning from the best-case movie in your head is exactly what keeps going wrong.',
      },
      nameOptions: ['planning', 'gambler', 'halo', 'decoy'],
      redo: {
        question: 'Best way to estimate the next project?',
        options: ['Check how long similar past projects actually took', 'Imagine everything going smoothly', 'Pick the time you wish it took'],
        answer: 0,
      },
    },
    {
      id: 'pl2', bias: 'planning', emoji: '💃',
      setup: 'Family sangeet! Bua says the dance will be ready in 2 weeks. The last 3 family dances each took about 5 weeks, even though every time everyone said "2 weeks".',
      step1: {
        type: 'choice', q: 'The wedding is 5 weeks away. When should practice start?',
        options: ['Now', 'In 3 weeks: 2 weeks is plenty'],
        trapAnswer: 1, goodAnswer: 0,
        explain: '"This time will be different" is the planning fallacy\'s favourite line. Three past dances say 5 weeks.',
      },
      nameOptions: ['planning', 'halo', 'decoy', 'statusquo'],
      redo: {
        question: 'Bua: "But this song is easier!" Your answer?',
        options: ['Maybe, but plan for the usual time and enjoy finishing early', 'Then 1 week is enough', 'Then skip practice'],
        answer: 0,
      },
    },
    {
      id: 'pl3', bias: 'planning', emoji: '🔨',
      setup: 'Contractor Pappu promises your kitchen will be done in 10 days. Your neighbours say his last 8 kitchens each took between 18 and 25 days.',
      step1: {
        type: 'choice', q: 'When should you plan to cook at home again?',
        options: ['In about 10 days', 'In about 3 to 4 weeks'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Pappu\'s promise is the hopeful inside view. The outside view, how long his kitchens really take, says 18 to 25 days.',
      },
      nameOptions: ['planning', 'decoy', 'statusquo', 'framing'],
      redo: {
        question: 'Pappu says your bathroom will take 5 days. Smart plan?',
        options: ['Find out how long his bathrooms actually took', 'Invite guests for day 6', 'Trust him, he sounds sure'],
        answer: 0,
      },
    },
    {
      id: 'pl4', bias: 'planning', emoji: '⏰',
      setup: 'Your train leaves at 8:00. You feel that "bed to platform takes 15 minutes". Your phone\'s log of the last 20 mornings says it actually took 25 to 30 minutes.',
      step1: {
        type: 'choice', q: 'Latest sensible alarm time?',
        options: ['7:45', '7:25', '7:55'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Fifteen minutes is the dream run. Real mornings take up to 30, so 7:25 is the latest safe alarm.',
      },
      nameOptions: ['planning', 'statusquo', 'framing', 'gambler'],
      redo: {
        question: 'Why do our own time estimates usually come out too short?',
        options: ['We picture the smooth best case and forget the delays', 'Clocks run fast', 'Everyone is lazy'],
        answer: 0,
      },
    },
    {
      id: 'pl5', bias: 'planning', emoji: '📚',
      setup: 'Exam on the 20th, 12 chapters left. You plan 2 chapters a day, so you will start on the 14th. Last week you also planned 2 a day, and actually managed 1 a day.',
      step1: {
        type: 'choice', q: 'When should you really start?',
        options: ['The 14th', 'The 8th'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'At your real pace of 1 chapter a day, 12 chapters need 12 days: start on the 8th (or trim topics).',
      },
      nameOptions: ['planning', 'framing', 'gambler', 'halo'],
      redo: {
        question: 'Halfway through, you are behind again. Best move?',
        options: ['Re-plan using the pace you have actually managed', 'Assume you will go twice as fast at the end', 'Stop planning altogether'],
        answer: 0,
      },
    },

    // ---------------- Survivorship bias ----------------
    {
      id: 'sv1', bias: 'survivorship', emoji: '💰',
      setup: 'A viral reel: "These 3 billionaires dropped out of college!" Your cousin Bittu announces he is quitting his degree to get rich.',
      step1: {
        type: 'choice', q: 'What does the reel tell you about dropping out?',
        options: ['Dropping out is a path to riches', 'Very little: we never see the dropouts who did not get rich'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'The reel only shows the winners. The huge number of dropouts who did not become billionaires never get a reel.',
      },
      nameOptions: ['survivorship', 'anchoring', 'gambler', 'sunkcost'],
      redo: {
        question: 'To judge the idea, Bittu should look at…',
        options: ['How ALL dropouts turn out, not just famous ones', 'More billionaire reels', 'Which billionaire has the coolest car'],
        answer: 0,
      },
    },
    {
      id: 'sv2', bias: 'survivorship', emoji: '🛸',
      setup: 'In a drone-paintball league, the drones that make it back are covered in paint hits on the wings and tail, but almost none on the motor. The team can afford armour for one area.',
      step1: {
        type: 'choice', q: 'Where should the armour go?',
        options: ['Wings and tail, where the hits are', 'The motor'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Drones hit in the motor never made it back to be counted. Clean motors on survivors mean motor hits are the deadly ones. Statistician Abraham Wald made this point about WWII bombers.',
      },
      nameOptions: ['survivorship', 'gambler', 'sunkcost', 'statusquo'],
      redo: {
        question: 'The key question in cases like this?',
        options: ['What happened to the ones that did not come back?', 'Which part looks most damaged?', 'Which part is most expensive?'],
        answer: 0,
      },
    },
    {
      id: 'sv3', bias: 'survivorship', emoji: '🏛️',
      setup: 'Walking through old Chaipur, Dadaji points at the 80-year-old havelis: "See? Every old building is still standing. Builders back then were far better than today\'s!"',
      step1: {
        type: 'choice', q: 'What is the catch?',
        options: ['No catch: old builders were simply better', 'The badly built old buildings already fell down or were demolished'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'We only see the old buildings that survived. The shoddy ones vanished long ago, which makes the past look better than it was.',
      },
      nameOptions: ['survivorship', 'sunkcost', 'statusquo', 'decoy'],
      redo: {
        question: 'Which is another example of the same trap?',
        options: ['"Old phones were tougher" (we only see the ones still working)', '"It rained, so the roads are wet"', '"Mangoes are sweet in summer"'],
        answer: 0,
      },
    },
    {
      id: 'sv4', bias: 'survivorship', emoji: '🏏',
      setup: 'A fantasy-cricket app\'s ads show a new winner every day: "Rahul from Nagpur won ₹10 lakh!" Your flatmate is convinced: "People win all the time!"',
      step1: {
        type: 'choice', q: 'What can you conclude about your odds?',
        options: ['Winning big is common', 'Nothing: the ads only show winners, never the players who lost'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'For every winner in an ad there may be lakhs of players who lost, and they never appear on screen.',
      },
      nameOptions: ['survivorship', 'statusquo', 'decoy', 'anchoring'],
      redo: {
        question: 'What would actually tell you your odds?',
        options: ['How many players there are versus how many win', 'How happy the winners look', 'How often the ad plays'],
        answer: 0,
      },
    },
    {
      id: 'sv5', bias: 'survivorship', emoji: '🎶',
      setup: 'Mausaji, turning up the radio: "Every Hindi song from the 1970s is a classic! Today\'s music is rubbish."',
      step1: {
        type: 'choice', q: 'Why might the 70s sound so great?',
        options: ['The 70s were simply better', 'The forgettable 70s songs were forgotten; only the hits still get played'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Time filters out the flops. We end up comparing the best of the past with ALL of the present.',
      },
      nameOptions: ['survivorship', 'decoy', 'anchoring', 'gambler'],
      redo: {
        question: 'A fair comparison of the two decades would…',
        options: ['Compare like with like: all songs, or only the top hits, from both', 'Compare old hits with random new songs', 'Ask only Mausaji'],
        answer: 0,
      },
    },

    // ---------------- Status quo bias ----------------
    {
      id: 'sq1', bias: 'statusquo', emoji: '📶',
      setup: 'Your phone plan auto-renews at ₹599 a month for "unlimited international roaming" you have never used. A ₹299 plan has everything you actually use. Switching takes 2 minutes in the app.',
      step1: {
        type: 'choice', q: 'What do you do?',
        options: ['Keep the current plan: it works', 'Switch to the ₹299 plan'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'The current plan wins only because it is already there. Choosing fresh, you would never pay ₹599 for things you do not use.',
      },
      nameOptions: ['statusquo', 'anchoring', 'gambler', 'halo'],
      redo: {
        question: 'The magic question for any "default" choice?',
        options: ['"If I were choosing fresh today, would I pick this?"', '"Has it always been this way?"', '"Is changing a hassle?"'],
        answer: 0,
      },
    },
    {
      id: 'sq2', bias: 'statusquo', emoji: '🏦',
      setup: 'Nani gave you ₹50,000. It sits in a savings account earning 2% a year. Your bank offers an equally safe fixed deposit at 7% a year, and you will not need the money for 2 years. Moving it takes 5 minutes.',
      step1: {
        type: 'choice', q: 'What do you do?',
        options: ['Leave it where Nani put it', 'Move it to the 7% deposit'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'If someone handed you ₹50,000 in cash today, you would pick 7% over 2%. Leaving it is a choice too, just a hidden one.',
      },
      nameOptions: ['statusquo', 'gambler', 'halo', 'conjunction'],
      redo: {
        question: 'Leaving things as they are counts as…',
        options: ['A choice, with costs like any other', 'Not a decision at all', 'Always the safest option'],
        answer: 0,
      },
    },
    {
      id: 'sq3', bias: 'statusquo', emoji: '☑️',
      setup: 'Office joining form. The box "Enrol me in the canteen lunch plan (₹2,000/month)" is already ticked. You bring a dabba from home every single day.',
      step1: {
        type: 'choice', q: 'What do you do with the box?',
        options: ['Untick it', 'Leave it ticked: they must know best'],
        trapAnswer: 1, goodAnswer: 0,
        explain: 'Pre-ticked boxes win because changing feels like effort. Defaults are powerful: countries where organ donation is opt-out have far higher sign-up rates than opt-in countries.',
      },
      nameOptions: ['statusquo', 'halo', 'conjunction', 'decoy'],
      redo: {
        question: 'Why do companies pre-tick boxes?',
        options: ['Because most people stick with the default', 'Because it is always best for you', 'Pure coincidence'],
        answer: 0,
      },
    },
    {
      id: 'sq4', bias: 'statusquo', emoji: '🚇',
      setup: 'For 3 years you have taken a 45-minute bus to college. A new metro line opens: 25 minutes, same fare, with a station right outside your gate.',
      step1: {
        type: 'choice', q: 'Tomorrow, you take…',
        options: ['The bus: it is what I always do', 'The metro'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Habits feel safe because they are familiar, not because they are better. Faster at the same price: the metro wins.',
      },
      nameOptions: ['statusquo', 'conjunction', 'decoy', 'anchoring'],
      redo: {
        question: 'A friend says: "The bus has always worked, why change?" Best reply?',
        options: ['"Always worked" is not the same as "best option now"', 'True, never change anything', 'Buses are evil'],
        answer: 0,
      },
    },
    {
      id: 'sq5', bias: 'statusquo', emoji: '🏋️',
      setup: 'Your free trial of the "FitBhai" workout app quietly turned into a ₹249/month subscription. You have opened it twice in three months.',
      step1: {
        type: 'choice', q: 'What do you do?',
        options: ['Cancel it', 'Keep it: I might use it someday'],
        trapAnswer: 1, goodAnswer: 0,
        explain: 'If FitBhai asked you today, "Join for ₹249 a month?", you would say no. Staying subscribed is the same choice, made by default.',
      },
      nameOptions: ['statusquo', 'decoy', 'anchoring', 'gambler'],
      redo: {
        question: 'Smart habit for subscriptions?',
        options: ['Review them every few months: "Would I sign up today?"', 'Never look at bank statements', 'Subscribe to more apps to feel fit'],
        answer: 0,
      },
    },

    // ---------------- Overconfidence ----------------
    {
      id: 'oc1', bias: 'overconfidence', emoji: '🎤',
      setup: 'At quiz nights, Raju notes how sure he feels. Of the 20 answers he called "100% certain", 13 were right. Tonight he is "100% certain" again.',
      step1: {
        type: 'choice', q: 'Best estimate of the chance he is right?',
        options: ['About 100%', 'About 65%', 'About 30%'],
        trapAnswer: 0, goodAnswer: 1,
        explain: '13 out of 20 is 65%. Raju\'s feeling of "certain" is right about two times in three, not every time.',
      },
      nameOptions: ['overconfidence', 'halo', 'gambler', 'sunkcost'],
      redo: {
        question: 'What should Raju do with this?',
        options: ['Treat his "certain" as "probably" and double-check', 'Feel even more certain', 'Stop doing quizzes'],
        answer: 0,
      },
    },
    {
      id: 'oc2', bias: 'overconfidence', emoji: '👨‍🍳',
      setup: 'Cousin Montu has watched 20 cooking videos and announces he will cook, alone, for his sister\'s 200-guest wedding. He has never cooked for more than 4 people.',
      step1: {
        type: 'choice', q: 'What is the smart plan?',
        options: ['Trust Montu: he watched 20 videos!', 'Do a trial dinner for 20 first, and book a backup caterer'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Watching is not doing. Montu\'s confidence is far ahead of his track record, and a wedding is a costly place to find out.',
      },
      nameOptions: ['overconfidence', 'gambler', 'sunkcost', 'anchoring'],
      redo: {
        question: 'Montu\'s trial dinner for 20 goes badly. Best response?',
        options: ['Use the caterer and keep practising', 'Cook for 200 anyway', 'Blame the guests'],
        answer: 0,
      },
    },
    {
      id: 'oc3', bias: 'overconfidence', emoji: '💯',
      setup: 'You predict you will score 95 in tomorrow\'s test. Your last five predictions vs actual scores: 90→72, 85→70, 92→75, 88→74, 95→78.',
      step1: {
        type: 'choice', q: 'Most realistic expectation?',
        options: ['About 95', 'About 78', 'About 50'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'You have overestimated by about 16 marks every single time. 95 minus your usual gap is about 78.',
      },
      nameOptions: ['overconfidence', 'sunkcost', 'anchoring', 'decoy'],
      redo: {
        question: 'Best fix for this pattern?',
        options: ['Adjust each prediction by your usual gap', 'Predict even higher to stay motivated', 'Stop taking tests'],
        answer: 0,
      },
    },
    {
      id: 'oc4', bias: 'overconfidence', emoji: '💸',
      setup: 'Trivia night offer: bet ₹100 on your answer. Right: you get ₹150 back (₹50 profit). Wrong: you lose the ₹100. You feel "totally sure", but your "totally sure" answers have been right only 6 times in 10.',
      step1: {
        type: 'choice', q: 'Take the bet?',
        options: ['Yes, I am totally sure!', 'No: at 6 in 10, I lose money on average'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'At 6 in 10: 0.6 × ₹50 − 0.4 × ₹100 = −₹10 per bet on average. Your feeling says yes; your track record says no.',
      },
      nameOptions: ['overconfidence', 'anchoring', 'decoy', 'halo'],
      redo: {
        question: 'How often would you need to be right for this bet to break even?',
        options: ['2 times in 3', '1 time in 2', '9 times in 10'],
        answer: 0,
      },
    },
    {
      id: 'oc5', bias: 'overconfidence', emoji: '📈',
      setup: 'Bunny started trading shares 2 weeks ago, during a month when almost every share went up. His portfolio rose 8%, about the same as the whole market.',
      step1: {
        type: 'choice', q: 'What should Bunny conclude?',
        options: ['I am a trading genius. Time to quit my job!', 'Everything rose; I cannot tell skill from luck yet'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Two weeks in a rising market proves nothing about skill. He did what the whole market did. Early wins make people far more confident than the evidence allows.',
      },
      nameOptions: ['overconfidence', 'decoy', 'halo', 'gambler'],
      redo: {
        question: 'What would actually show Bunny has skill?',
        options: ['Beating the overall market over years, in good times and bad', 'One more good week', 'Feeling confident'],
        answer: 0,
      },
    },

    // ---------------- Halo effect ----------------
    {
      id: 'hl1', bias: 'halo', emoji: '✍️',
      setup: 'Mrs. Joshi grades two essays with word-for-word identical content. One is in beautiful, neat handwriting. The other looks like a spider fell in an ink pot.',
      step1: {
        type: 'choice', q: 'Which deserves more marks for content?',
        options: ['The neat one', 'They deserve the same', 'The messy one'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'The content is identical. Neat handwriting creates a glow that spills over onto how clever the ideas seem.',
      },
      nameOptions: ['halo', 'framing', 'decoy', 'sunkcost'],
      redo: {
        question: 'How could Mrs. Joshi grade more fairly?',
        options: ['Grade typed copies so handwriting cannot sway her', 'Grade the neat ones first', 'Give bonus marks for handwriting'],
        answer: 0,
      },
    },
    {
      id: 'hl2', bias: 'halo', emoji: '👔',
      setup: 'Two candidates for a coding job. Arjun is charming, sharply dressed and tells great jokes. Bhavna is quiet and plainly dressed. Both scored 72/100 on the same coding test.',
      step1: {
        type: 'choice', q: 'Based on the evidence, who is the better coder?',
        options: ['Arjun', 'Bhavna', 'No difference'],
        trapAnswer: 0, goodAnswer: 2,
        explain: 'Charm and good clothes say nothing about coding. The only coding evidence, the test, is a tie.',
      },
      nameOptions: ['halo', 'decoy', 'sunkcost', 'gambler'],
      redo: {
        question: 'To hire fairly, what should count most?',
        options: ['Job-related tests, scored the same way for everyone', 'Who you would most like to have chai with', 'Who dresses best'],
        answer: 0,
      },
    },
    {
      id: 'hl3', bias: 'halo', emoji: '🌟',
      setup: 'Superstar Rocky Khanna, your favourite actor, opens a restaurant. You have not read a single review yet.',
      step1: {
        type: 'choice', q: 'How good is the food likely to be?',
        options: ['Amazing: Rocky is amazing', 'Cannot tell yet: his acting says nothing about the cooking'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Loving someone\'s movies makes everything with their name on it glow. But Rocky is not the one in the kitchen.',
      },
      nameOptions: ['halo', 'sunkcost', 'gambler', 'statusquo'],
      redo: {
        question: 'Best way to judge the restaurant?',
        options: ['Reviews and a taste test', 'Rocky\'s box-office record', 'The poster'],
        answer: 0,
      },
    },
    {
      id: 'hl4', bias: 'halo', emoji: '🧮',
      setup: 'Ishaan is handsome, captain of the cricket team and everyone\'s favourite. The class must pick someone for the maths olympiad, and everyone says "Obviously Ishaan!" Nobody has seen his maths marks.',
      step1: {
        type: 'choice', q: 'Should Ishaan be picked?',
        options: ['Yes: he is great at everything', 'Check the maths marks first'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Being a cricket star and popular says nothing about maths. One shining trait gets stretched to cover everything.',
      },
      nameOptions: ['halo', 'gambler', 'statusquo', 'framing'],
      redo: {
        question: 'Which evidence is actually relevant here?',
        options: ['Maths test scores', 'Number of sixes hit', 'Instagram followers'],
        answer: 0,
      },
    },
    {
      id: 'hl5', bias: 'halo', emoji: '📱',
      setup: 'The new Zoomfone looks stunning: glass back, super slim, gorgeous colours. Your friend says: "Something this beautiful must have amazing battery life!"',
      step1: {
        type: 'choice', q: 'What does the design tell you about the battery?',
        options: ['Great looks, so great battery', 'Nothing: check battery tests'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'Beauty is one quality; battery life is another. The halo makes us assume good things come bundled together.',
      },
      nameOptions: ['halo', 'statusquo', 'framing', 'decoy'],
      redo: {
        question: 'Which source best answers "is the battery good"?',
        options: ['Independent battery tests', 'The launch video', 'How the phone feels in your hand'],
        answer: 0,
      },
    },

    // ---------------- Decoy effect ----------------
    {
      id: 'dc1', bias: 'decoy', emoji: '🍿',
      setup: 'At the cinema: Small popcorn ₹150. Medium ₹290. Large ₹300. You just want a light snack, and you hate wasting food.',
      step1: {
        type: 'choice', q: 'What do you buy?',
        options: ['Small', 'Medium', 'Large: only ₹10 more!'],
        trapAnswer: 2, goodAnswer: 0,
        explain: 'The medium exists to make the large look like a steal. For a light snack, small was the right pick all along.',
      },
      nameOptions: ['decoy', 'statusquo', 'gambler', 'conjunction'],
      redo: {
        question: 'Cover the medium with your thumb. Small ₹150 or Large ₹300, for a light snack?',
        options: ['Small', 'Large'],
        answer: 0,
      },
    },
    {
      id: 'dc2', bias: 'decoy', emoji: '📰',
      setup: 'Subscribing to the Chaipur Times. Digital only: ₹590/year. Print only: ₹1,250/year. Print + Digital: ₹1,250/year. You read everything on your phone, and the dog eats paper.',
      step1: {
        type: 'choice', q: 'Which plan?',
        options: ['Digital only', 'Print + Digital: the digital part is free!', 'Print only'],
        trapAnswer: 1, goodAnswer: 0,
        explain: '"Print only" is a decoy nobody picks; it makes "Print + Digital" look like a free gift. But you would pay ₹660 extra for paper you do not want.',
      },
      nameOptions: ['decoy', 'gambler', 'conjunction', 'halo'],
      redo: {
        question: 'Why does the "Print only" plan exist?',
        options: ['To make Print + Digital look like a bargain', 'Because lots of people want it', 'By mistake'],
        answer: 0,
      },
    },
    {
      id: 'dc3', bias: 'decoy', emoji: '📲',
      setup: 'Mobile data packs: 1 GB/day for ₹199. 1.5 GB/day for ₹289. 2 GB/day for ₹299. Your phone says you use about 0.7 GB a day.',
      step1: {
        type: 'choice', q: 'Which pack?',
        options: ['1 GB/day for ₹199', '2 GB/day for ₹299: what a deal', '1.5 GB/day for ₹289'],
        trapAnswer: 1, goodAnswer: 0,
        explain: 'The ₹289 pack is there to make ₹299 look amazing. But you only use 0.7 GB, so ₹199 already covers you.',
      },
      nameOptions: ['decoy', 'conjunction', 'halo', 'sunkcost'],
      redo: {
        question: 'Before comparing packs, what should you check first?',
        options: ['How much you actually use', 'Which pack has the biggest number', 'Which pack is in the middle'],
        answer: 0,
      },
    },
    {
      id: 'dc4', bias: 'decoy', emoji: '💪',
      setup: 'Gym offer: 3 months ₹3,000. 6 months ₹5,800. 12 months ₹6,000. You are moving to another city in 3 months.',
      step1: {
        type: 'choice', q: 'Which membership?',
        options: ['12 months: only ₹200 more than 6!', '3 months', '6 months'],
        trapAnswer: 0, goodAnswer: 1,
        explain: 'The 6-month price makes 12 months look like a bargain. But you will only be there for 3 months, so you would pay double for months you cannot use.',
      },
      nameOptions: ['decoy', 'halo', 'sunkcost', 'statusquo'],
      redo: {
        question: 'Cover the decoy: 3 months for ₹3,000 or 12 months for ₹6,000, when you leave after 3?',
        options: ['3 months', '12 months'],
        answer: 0,
      },
    },
    {
      id: 'dc5', bias: 'decoy', emoji: '🎧',
      setup: 'You need headphones for long train journeys, so battery life matters most to you. A: ₹2,000, 40-hour battery. B: ₹3,500, better bass, 15-hour battery. Then the shop adds C: ₹3,800, same bass as B, 12-hour battery.',
      step1: {
        type: 'choice', q: 'Which do you buy?',
        options: ['A', 'B: it beats C easily!', 'C'],
        trapAnswer: 1, goodAnswer: 0,
        explain: 'C is a decoy that makes B look like a winner. But battery matters most to you, and A wins that by miles.',
      },
      nameOptions: ['decoy', 'sunkcost', 'statusquo', 'gambler'],
      redo: {
        question: 'Does adding a worse option C change whether A or B suits you?',
        options: ['No: C should not change A versus B', 'Yes: B is better now'],
        answer: 0,
      },
    },
  ],
};

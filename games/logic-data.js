// Brain Gym content: "Who Did What?" (logic). Name and attribute pools for generated logic-grid cases.
// Category fields:
//   noun   – used in the case intro ("Each had a different chai, snack and arrival time")
//   label  – short tab label; emoji – tab icon
//   pred / neg – predicate templates, {v} = item name ("ordered {v}" / "didn't order {v}")
//   or     – optional "either" template with {a} and {b}; defaults to pred with "{a} or {b}"
//   who    – noun phrase for "the person with this value" ("the {v} drinker")
//   ordered – items are in ascending order; next = "{A} <next> {B}" means A is exactly one step after B,
//             before = "{A} <before> {B}" means A comes earlier/lower than B.
//   items  – { n: name used in sentences, s: short label for grid headers (max ~7 chars) }
(function (root) {
  'use strict';

  const COLOURS = [
    { n: 'red', s: 'Red' },
    { n: 'blue', s: 'Blue' },
    { n: 'green', s: 'Green' },
    { n: 'yellow', s: 'Yellow' },
    { n: 'purple', s: 'Purple' },
    { n: 'orange', s: 'Orange' },
  ];

  const PLACES = [
    { n: '1st', s: '1st' },
    { n: '2nd', s: '2nd' },
    { n: '3rd', s: '3rd' },
    { n: '4th', s: '4th' },
    { n: '5th', s: '5th' },
    { n: '6th', s: '6th' },
  ];

  const DATA = {
    // Short, varied, easy to tell apart. Picked so each case uses distinct first letters.
    names: [
      'Asha', 'Ben', 'Chen', 'Dara', 'Eli', 'Farah', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kofi', 'Lena',
      'Mo', 'Nia', 'Omar', 'Pia', 'Raj', 'Sofia', 'Tom', 'Uma', 'Vik', 'Wen', 'Yara', 'Zoe',
    ],

    themes: [
      {
        id: 'chai',
        title: 'The Chai Stall',
        emoji: '🍵',
        setup: '{N} friends stopped at the corner chai stall.',
        cats: [
          {
            key: 'drink', noun: 'chai', label: 'Chai', emoji: '🍵',
            pred: 'ordered {v}', neg: "didn't order {v}", who: 'the {v} drinker',
            items: [
              { n: 'masala chai', s: 'Masala' }, { n: 'ginger chai', s: 'Ginger' }, { n: 'saffron chai', s: 'Saffron' },
              { n: 'lemon tea', s: 'Lemon' }, { n: 'mint tea', s: 'Mint' }, { n: 'tulsi tea', s: 'Tulsi' },
            ],
          },
          {
            key: 'snack', noun: 'snack', label: 'Snack', emoji: '🥟',
            pred: 'ate the {v}', neg: "didn't eat the {v}", or: 'ate the {a} or the {b}', who: 'whoever ate the {v}',
            items: [
              { n: 'samosa', s: 'Samosa' }, { n: 'pakoras', s: 'Pakoras' }, { n: 'toast', s: 'Toast' },
              { n: 'biscuits', s: 'Biscuit' }, { n: 'rusks', s: 'Rusks' }, { n: 'banana bread', s: 'Banana' },
            ],
          },
          {
            key: 'time', noun: 'arrival time', label: 'Time', emoji: '🕓', ordered: true,
            pred: 'arrived at {v}', neg: "didn't arrive at {v}", who: 'the {v} arrival',
            next: 'arrived exactly an hour after', before: 'arrived earlier than',
            items: [
              { n: '3pm', s: '3pm' }, { n: '4pm', s: '4pm' }, { n: '5pm', s: '5pm' },
              { n: '6pm', s: '6pm' }, { n: '7pm', s: '7pm' }, { n: '8pm', s: '8pm' },
            ],
          },
        ],
      },
      {
        id: 'books',
        title: 'Book Club Night',
        emoji: '📚',
        setup: '{N} book club members met for their monthly chat.',
        cats: [
          {
            key: 'book', noun: 'book', label: 'Book', emoji: '📖',
            pred: 'brought the {v}', neg: "didn't bring the {v}", or: 'brought the {a} or the {b}', who: 'the {v} reader',
            items: [
              { n: 'mystery', s: 'Mystery' }, { n: 'sci-fi novel', s: 'Sci-fi' }, { n: 'poetry book', s: 'Poetry' },
              { n: 'history book', s: 'History' }, { n: 'romance', s: 'Romance' }, { n: 'fantasy epic', s: 'Fantasy' },
            ],
          },
          {
            key: 'mug', noun: 'mug colour', label: 'Mug', emoji: '☕',
            pred: 'drank from the {v} mug', neg: "didn't drink from the {v} mug",
            or: 'drank from the {a} or the {b} mug', who: 'whoever had the {v} mug',
            items: COLOURS,
          },
          {
            key: 'seat', noun: 'seat', label: 'Seat', emoji: '🪑', ordered: true,
            pred: 'sat in seat {v}', neg: "didn't sit in seat {v}", or: 'sat in seat {a} or {b}', who: 'the person in seat {v}',
            next: 'sat in the seat numbered one higher than', before: 'sat in a lower-numbered seat than',
            items: [
              { n: '1', s: 'Seat 1' }, { n: '2', s: 'Seat 2' }, { n: '3', s: 'Seat 3' },
              { n: '4', s: 'Seat 4' }, { n: '5', s: 'Seat 5' }, { n: '6', s: 'Seat 6' },
            ],
          },
        ],
      },
      {
        id: 'pets',
        title: 'The Pet Show',
        emoji: '🐾',
        setup: '{N} neighbours entered the village pet show.',
        cats: [
          {
            key: 'pet', noun: 'pet', label: 'Pet', emoji: '🐾',
            pred: 'brought the {v}', neg: "didn't bring the {v}", or: 'brought the {a} or the {b}', who: "the {v}'s owner",
            items: [
              { n: 'cat', s: 'Cat' }, { n: 'dog', s: 'Dog' }, { n: 'rabbit', s: 'Rabbit' },
              { n: 'parrot', s: 'Parrot' }, { n: 'hamster', s: 'Hamster' }, { n: 'tortoise', s: 'Tortoise' },
            ],
          },
          {
            key: 'treat', noun: 'treat', label: 'Treat', emoji: '🥕',
            pred: 'packed {v}', neg: "didn't pack {v}", who: 'whoever packed {v}',
            items: [
              { n: 'carrots', s: 'Carrots' }, { n: 'cheese', s: 'Cheese' }, { n: 'apple slices', s: 'Apple' },
              { n: 'peas', s: 'Peas' }, { n: 'seeds', s: 'Seeds' }, { n: 'oat cookies', s: 'Oats' },
            ],
          },
          {
            key: 'place', noun: 'finishing place', label: 'Place', emoji: '🏅', ordered: true,
            pred: 'finished {v}', neg: "didn't finish {v}", who: 'the {v}-place finisher',
            next: 'finished exactly one place behind', before: 'finished ahead of',
            items: PLACES,
          },
        ],
      },
      {
        id: 'travel',
        title: 'Holiday Snaps',
        emoji: '🧳',
        setup: '{N} cousins each took one trip this year.',
        cats: [
          {
            key: 'city', noun: 'city', label: 'City', emoji: '🏙️',
            pred: 'visited {v}', neg: "didn't visit {v}", who: 'the {v} visitor',
            items: [
              { n: 'Lisbon', s: 'Lisbon' }, { n: 'Kyoto', s: 'Kyoto' }, { n: 'Cairo', s: 'Cairo' },
              { n: 'Lima', s: 'Lima' }, { n: 'Oslo', s: 'Oslo' }, { n: 'Hanoi', s: 'Hanoi' },
            ],
          },
          {
            key: 'bag', noun: 'suitcase colour', label: 'Case', emoji: '🧳',
            pred: 'packed the {v} suitcase', neg: "didn't pack the {v} suitcase",
            or: 'packed the {a} or the {b} suitcase', who: 'whoever packed the {v} suitcase',
            items: COLOURS,
          },
          {
            key: 'month', noun: 'month', label: 'Month', emoji: '📅', ordered: true,
            pred: 'travelled in {v}', neg: "didn't travel in {v}", who: 'the {v} traveller',
            next: 'travelled the month after', before: 'travelled earlier in the year than',
            items: [
              { n: 'March', s: 'Mar' }, { n: 'April', s: 'Apr' }, { n: 'May', s: 'May' },
              { n: 'June', s: 'Jun' }, { n: 'July', s: 'Jul' }, { n: 'August', s: 'Aug' },
            ],
          },
        ],
      },
      {
        id: 'classes',
        title: 'Evening Classes',
        emoji: '🎨',
        setup: '{N} flatmates each signed up for an evening class.',
        cats: [
          {
            key: 'class', noun: 'class', label: 'Class', emoji: '🎨',
            pred: 'takes {v}', neg: "doesn't take {v}", who: 'the {v} student',
            items: [
              { n: 'pottery', s: 'Pottery' }, { n: 'salsa', s: 'Salsa' }, { n: 'chess', s: 'Chess' },
              { n: 'guitar', s: 'Guitar' }, { n: 'yoga', s: 'Yoga' }, { n: 'Spanish', s: 'Spanish' },
            ],
          },
          {
            key: 'bottle', noun: 'water bottle', label: 'Bottle', emoji: '🧴',
            pred: 'carries the {v} bottle', neg: "doesn't carry the {v} bottle",
            or: 'carries the {a} or the {b} bottle', who: 'whoever carries the {v} bottle',
            items: COLOURS,
          },
          {
            key: 'day', noun: 'class day', label: 'Day', emoji: '📆', ordered: true,
            pred: 'goes on {v}', neg: "doesn't go on {v}", who: 'the {v} student',
            next: 'goes the day after', before: 'goes earlier in the week than',
            items: [
              { n: 'Monday', s: 'Mon' }, { n: 'Tuesday', s: 'Tue' }, { n: 'Wednesday', s: 'Wed' },
              { n: 'Thursday', s: 'Thu' }, { n: 'Friday', s: 'Fri' }, { n: 'Saturday', s: 'Sat' },
            ],
          },
        ],
      },
      {
        id: 'tower',
        title: 'The Tall Building',
        emoji: '🏢',
        setup: '{N} neighbours live in the same tall building.',
        cats: [
          {
            key: 'plant', noun: 'balcony plant', label: 'Plant', emoji: '🪴',
            pred: 'grows {v}', neg: "doesn't grow {v}", who: 'the {v} grower',
            items: [
              { n: 'basil', s: 'Basil' }, { n: 'tomatoes', s: 'Tomato' }, { n: 'cacti', s: 'Cacti' },
              { n: 'ferns', s: 'Ferns' }, { n: 'orchids', s: 'Orchid' }, { n: 'sunflowers', s: 'Sunflwr' },
            ],
          },
          {
            key: 'pet', noun: 'pet', label: 'Pet', emoji: '🐠',
            pred: 'keeps a {v}', neg: "doesn't keep a {v}", or: 'keeps a {a} or a {b}', who: 'the {v} owner',
            items: [
              { n: 'goldfish', s: 'Fish' }, { n: 'cat', s: 'Cat' }, { n: 'gecko', s: 'Gecko' },
              { n: 'budgie', s: 'Budgie' }, { n: 'hamster', s: 'Hamster' }, { n: 'rabbit', s: 'Rabbit' },
            ],
          },
          {
            key: 'floor', noun: 'floor', label: 'Floor', emoji: '🏢', ordered: true,
            pred: 'lives on the {v} floor', neg: "doesn't live on the {v} floor",
            or: 'lives on the {a} or {b} floor', who: 'the {v}-floor resident',
            next: 'lives exactly one floor above', before: 'lives lower down than',
            items: PLACES,
          },
        ],
      },
      {
        id: 'cakes',
        title: 'Birthday Cakes',
        emoji: '🎂',
        setup: '{N} friends collected birthday cakes from the bakery.',
        cats: [
          {
            key: 'flavour', noun: 'flavour', label: 'Flavour', emoji: '🎂',
            pred: 'ordered the {v} cake', neg: "didn't order the {v} cake",
            or: 'ordered the {a} or the {b} cake', who: 'whoever ordered the {v} cake',
            items: [
              { n: 'chocolate', s: 'Choc' }, { n: 'lemon', s: 'Lemon' }, { n: 'carrot', s: 'Carrot' },
              { n: 'vanilla', s: 'Vanilla' }, { n: 'coffee', s: 'Coffee' }, { n: 'red velvet', s: 'Velvet' },
            ],
          },
          {
            key: 'topper', noun: 'cake topper', label: 'Topper', emoji: '🦖',
            pred: 'asked for a {v} on top', neg: "didn't ask for a {v} on top",
            or: 'asked for a {a} or a {b} on top', who: 'whoever asked for a {v}',
            items: [
              { n: 'unicorn', s: 'Unicorn' }, { n: 'rocket', s: 'Rocket' }, { n: 'dinosaur', s: 'Dino' },
              { n: 'football', s: 'Ball' }, { n: 'rainbow', s: 'Rainbow' }, { n: 'crown', s: 'Crown' },
            ],
          },
          {
            key: 'pickup', noun: 'pickup time', label: 'Pickup', emoji: '⏰', ordered: true,
            pred: 'collected at {v}', neg: "didn't collect at {v}", who: 'the {v} pickup',
            next: 'collected exactly an hour after', before: 'collected earlier than',
            items: [
              { n: '9am', s: '9am' }, { n: '10am', s: '10am' }, { n: '11am', s: '11am' },
              { n: '12pm', s: '12pm' }, { n: '1pm', s: '1pm' }, { n: '2pm', s: '2pm' },
            ],
          },
        ],
      },
      {
        id: 'funrun',
        title: 'Park Fun Run',
        emoji: '🏃',
        setup: '{N} friends ran the Saturday park fun run.',
        cats: [
          {
            key: 'shirt', noun: 'shirt colour', label: 'Shirt', emoji: '👕',
            pred: 'wore {v}', neg: "didn't wear {v}", who: 'the runner in {v}',
            items: COLOURS,
          },
          {
            key: 'snack', noun: 'post-run snack', label: 'Snack', emoji: '🍌',
            pred: 'grabbed {v} afterwards', neg: "didn't grab {v} afterwards", or: 'grabbed {a} or {b} afterwards',
            who: 'whoever grabbed {v}',
            items: [
              { n: 'a banana', s: 'Banana' }, { n: 'an apple', s: 'Apple' }, { n: 'a muffin', s: 'Muffin' },
              { n: 'a smoothie', s: 'Smoothie' }, { n: 'a flapjack', s: 'Flapjk' }, { n: 'pretzels', s: 'Pretzel' },
            ],
          },
          {
            key: 'place', noun: 'finishing place', label: 'Place', emoji: '🏅', ordered: true,
            pred: 'finished {v}', neg: "didn't finish {v}", who: 'the {v}-place runner',
            next: 'finished exactly one place behind', before: 'finished ahead of',
            items: PLACES,
          },
        ],
      },
    ],
  };

  root.BG_DATA_LOGIC = DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);

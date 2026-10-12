// Prebunk content. Every account, town, product and person here is invented.
// Technique posts mark their giveaway phrase with [[...]]; "fine" posts have none.
// Each technique has the same number of posts (the daily rotation relies on that).
window.BG_DATA_PREBUNK = {
  techniques: [
    {
      id: 'fear', name: 'Fearmongering', emoji: '😱',
      definition: 'Scary, over-the-top language that makes you panic, so you share before you think.',
      example: '"Your salad drawer could be a TICKING TIME BOMB. Act now before it\'s too late!!!"',
      defuse: 'Feel the jolt of panic? That\'s the cue to slow down. Ask how big the real risk is and where the evidence is.',
    },
    {
      id: 'expert', name: 'Fake expert', emoji: '🥼',
      definition: 'Borrowing authority from someone who sounds impressive but isn\'t an expert in this topic.',
      example: '"As a doctor (of medieval poetry), I can confirm glowing broccoli is safe."',
      defuse: 'Ask: is this person an expert in THIS exact topic? Can you find their work anywhere else?',
    },
    {
      id: 'dichotomy', name: 'False choice', emoji: '⚖️',
      definition: 'Pretending there are only two options when there are plenty more.',
      example: '"Either we ban ALL kites, or the sky belongs to chaos."',
      defuse: 'Ask: what are options three, four and five? Real choices are rarely all-or-nothing.',
    },
    {
      id: 'scapegoat', name: 'Scapegoating', emoji: '🎯',
      definition: 'Blaming a complicated problem on one group of people.',
      example: '"Potholes, late buses AND slow Wi-Fi? Obviously the skateboarders did it."',
      defuse: 'Big problems rarely have a single villain. Ask what else could be causing it.',
    },
    {
      id: 'adhominem', name: 'Personal attack', emoji: '🤬',
      definition: 'Attacking the person making an argument instead of the argument itself.',
      example: '"She says the bridge is safe, but she wears socks with sandals."',
      defuse: 'Skip the insult and look for an actual reason the claim is wrong. Often there isn\'t one.',
    },
    {
      id: 'cherry', name: 'Cherry-picking', emoji: '📉',
      definition: 'Showing the one convenient fact or data point and hiding the rest.',
      example: '"Winter is cancelled! It was 18°C on January 3rd."',
      defuse: 'Ask what the full picture looks like. One day, one photo or one review is not a trend.',
    },
    {
      id: 'impersonation', name: 'Impersonation', emoji: '🎭',
      definition: 'Pretending to be a trusted person or organisation, often from a "new" or "backup" account.',
      example: '"Hi, it\'s the REAL Mayor Plum on my secret new account!"',
      defuse: 'Check the handle letter by letter and look for the same news on the official website or account.',
    },
    {
      id: 'bandwagon', name: 'Bandwagon', emoji: '🔁',
      definition: 'Claiming something is true or good because lots of people believe it or share it.',
      example: '"Over 2 million people shared this, so it must be true!"',
      defuse: 'Popularity isn\'t proof. Millions of shares can all trace back to one unchecked claim.',
    },
    {
      id: 'fine', name: 'Seems fine', emoji: '✅',
      definition: 'No manipulation trick: a calm, checkable claim, or just an ordinary post.',
      example: '"From next month the library is open until 6pm on Saturdays. Timetable on our website."',
      defuse: 'No red flags. It\'s still worth checking the source for anything important, but you don\'t need to doubt everything.',
    },
  ],

  posts: [
    // ---------------- 😱 Fearmongering ----------------
    {
      id: 'fe1', handle: 'TruthNinja77', name: 'Truth Ninja',
      body: 'Broccoli in Millbrook has started glowing at night. [[Your salad drawer could be a ticking time bomb. Throw out every green vegetable before it\'s too late!!!]]',
      technique: 'fear',
      explain: 'No evidence of any danger, just panic words ("ticking time bomb", "too late") designed to make you act first and think never.',
    },
    {
      id: 'fe2', handle: 'DoomScroll_Daily', name: 'Doom Scroll Daily',
      body: 'The new traffic light on Puddleby High Street takes 4 seconds longer to turn green. [[This is how it starts. Next comes total gridlock, and nobody will ever get home again.]]',
      technique: 'fear',
      explain: 'A 4-second delay is inflated into a catastrophe. The post sells dread, not facts.',
    },
    {
      id: 'fe3', handle: 'AlarmBellAnnie', name: 'Annie 🔔',
      body: 'Got the new SmartKettle 2 and it beeps when the water boils. [[WAKE UP. Nobody is safe in their own kitchen anymore!!]]',
      technique: 'fear',
      explain: 'A beeping kettle becomes a threat to everyone\'s safety. Shouting plus doom, zero evidence.',
    },
    {
      id: 'fe4', handle: 'Panic_Station', name: 'Panic Station',
      body: 'Riverton Zoo\'s escaped tortoise was spotted near the bakery. [[LOCK YOUR DOORS. Keep the children inside. Nobody knows what it is capable of.]]',
      technique: 'fear',
      explain: 'It\'s a tortoise. The scary instructions are there to frighten you, not inform you.',
    },
    {
      id: 'fe5', handle: 'CloudWatcherX', name: 'Cloud Watcher',
      body: 'Forecast says light drizzle for Saturday\'s Glimmerton kite festival. [[This could be the storm that wipes our town off the map. Cancel everything NOW.]]',
      technique: 'fear',
      explain: 'Light drizzle is blown up into a town-ending storm. Catastrophe words are the whole message.',
    },
    {
      id: 'fe6', handle: 'SirensOnly', name: 'Sirens Only 🚨',
      body: 'Lower Snodsworth Library is getting a new barcode scanner. [[Every book you ever borrowed could be exposed and used against you. Be very afraid.]]',
      technique: 'fear',
      explain: 'A routine equipment upgrade is spun into a vague, terrifying threat with nothing to back it up.',
    },
    {
      id: 'fe7', handle: 'WorstCase_Wendy', name: 'Worst-Case Wendy',
      body: 'The ducks on the town pond have been quacking louder this week. [[Something terrible is coming and they know it. Stock up on tinned food tonight!]]',
      technique: 'fear',
      explain: 'Noisy ducks become an omen of doom, and you\'re told to panic-buy. Pure fear, no facts.',
    },
    {
      id: 'fe8', handle: 'EndIsNear_ish', name: 'The End Is Near (ish)',
      body: 'A new phone game called Fruit Stack is going around. [[Once your kid downloads it, their brain may never recover. Delete it before it\'s too late!!]]',
      technique: 'fear',
      explain: '"Brain may never recover" is a scary claim with no source. Urgency plus dread is the trick.',
    },

    // ---------------- 🥼 Fake expert ----------------
    {
      id: 'ex1', handle: 'Dr_Totally_Real', name: 'Dr. Totally Real',
      body: '[[As a doctor (of medieval poetry)]], I can confirm that glowing broccoli is perfectly safe to eat by the bucket.',
      technique: 'expert',
      explain: 'A real title in the wrong field. A poetry doctorate says nothing about food safety.',
    },
    {
      id: 'ex2', handle: 'GlitterGossip', name: 'Glitter Gossip ✨',
      body: 'Pop star Dazzle McGlitter says MegaMind Moon Gummies made her 40% smarter. [[If a chart-topping singer says they work, who are we to argue?]]',
      technique: 'expert',
      explain: 'Fame isn\'t expertise. A singer has no special knowledge about whether a supplement works.',
    },
    {
      id: 'ex3', handle: 'BridgeFacts_Not', name: 'Bridge Facts',
      body: '[[A man at the bus stop who says he "basically used to be an engineer"]] told me the new Riverton bridge is made of cardboard.',
      technique: 'expert',
      explain: 'A vague, uncheckable "basically an engineer" is being used as authority.',
    },
    {
      id: 'ex4', handle: 'Prof_Nobody', name: 'Prof. Nobody',
      body: '[[Professor Gerald Whiskers of the Institute of Advanced Thinking (founded last Tuesday)]] says cats can predict the lottery.',
      technique: 'expert',
      explain: 'An impressive-sounding title from an institute nobody can check. Grand names are cheap.',
    },
    {
      id: 'ex5', handle: 'WellnessWizard', name: 'Wellness Wizard 🔮',
      body: 'My yoga teacher, [[who is also a certified crystal whisperer]], says the SnoozePod 3000 cures Monday mornings.',
      technique: 'expert',
      explain: 'A made-up qualification with nothing to do with sleep gadgets is presented as expertise.',
    },
    {
      id: 'ex6', handle: 'HoverHeadlines', name: 'Hover Headlines',
      body: 'Action hero Brick Thunderjaw, [[who once played a rocket scientist in a film]], says the new HoverShoes are 100% safe.',
      technique: 'expert',
      explain: 'Playing a scientist in a film doesn\'t make you one. The authority is borrowed from a costume.',
    },
    {
      id: 'ex7', handle: 'RealScienceMaybe', name: 'Real Science (Maybe)',
      body: 'The new Millbrook water fountain makes you taller, according to [[my cousin, a jellyfish researcher, who says plumbing is "basically the same as jellyfish"]].',
      technique: 'expert',
      explain: 'A real scientist, but in a totally unrelated field, speaking way outside it.',
    },
    {
      id: 'ex8', handle: 'AskAnAstronaut', name: 'Space Fan Steve',
      body: '[[Speaking as someone who once toured a space museum]], I can tell you the Puddleby fireworks are knocking satellites out of orbit.',
      technique: 'expert',
      explain: 'A museum visit is dressed up as space expertise to make a wild claim sound credible.',
    },

    // ---------------- ⚖️ False choice ----------------
    {
      id: 'fc1', handle: 'KiteLord', name: 'Kite Lord 🪁',
      body: 'Kites got tangled in Riverton\'s trees again. [[Either we ban ALL kites, or we accept that the sky belongs to chaos.]]',
      technique: 'dichotomy',
      explain: 'There are lots of middle options: kite zones, rules for windy days, trimming trees.',
    },
    {
      id: 'fc2', handle: 'LotWatcher', name: 'Empty Lot Watch',
      body: 'Big debate about the empty lot on Mill Lane. [[Either it becomes a giant car park, or it stays an ugly patch of weeds forever.]]',
      technique: 'dichotomy',
      explain: 'A park, a playground, housing, a market… The post hides every option except two.',
    },
    {
      id: 'fc3', handle: 'GadgetGrump', name: 'Gadget Grump',
      body: 'SnoozePod 3000 is out. [[Either you buy one today, or you just don\'t care about your sleep.]]',
      technique: 'dichotomy',
      explain: 'You can care a lot about sleep and still not buy a gadget. Two options, falsely presented as the only ones.',
    },
    {
      id: 'fc4', handle: 'PuddlebyPride', name: 'Puddleby Pride 🎃',
      body: 'The Pumpkin Festival is back! [[You\'re either with the festival or you hate fun.]] Pick a side.',
      technique: 'dichotomy',
      explain: 'Maybe you like fun but not pumpkins, or you\'re just busy that weekend. Life isn\'t two boxes.',
    },
    {
      id: 'fc5', handle: 'BakerBarry', name: 'Baker Barry 🥖',
      body: 'Vote on the 24-hour bakery is tomorrow. [[Either you support it, or you want Glimmerton to go hungry.]]',
      technique: 'dichotomy',
      explain: 'Opposing one bakery\'s hours isn\'t the same as wanting people to starve. Many positions in between.',
    },
    {
      id: 'fc6', handle: 'MillbrookMoves', name: 'Millbrook Moves',
      body: 'The bus timetable is up for review. [[Either we keep every route exactly as it is, or we scrap buses altogether.]]',
      technique: 'dichotomy',
      explain: 'You can change a few routes and keep the rest. All-or-nothing framing hides the sensible options.',
    },
    {
      id: 'fc7', handle: 'FountainFan', name: 'Fountain Fan ⛲',
      body: 'Opinions on the new park fountain? [[There are only two kinds of people: those who love it and those who hate joy.]]',
      technique: 'dichotomy',
      explain: 'Some people are neutral, some think it\'s too loud. Splitting everyone into two camps is the trick.',
    },
    {
      id: 'fc8', handle: 'HomeworkHawk', name: 'Homework Hawk',
      body: 'Riverton Academy is reviewing its homework policy. [[Either students do five hours a night, or they learn nothing at all.]]',
      technique: 'dichotomy',
      explain: 'Between five hours and zero learning there are lots of possibilities. Only the extremes are offered.',
    },

    // ---------------- 🎯 Scapegoating ----------------
    {
      id: 'sg1', handle: 'PotholeTruth', name: 'Pothole Truth',
      body: 'Millbrook has potholes, the bus is late and my Wi-Fi is slow. [[It\'s obvious: the skateboarders did all of this.]]',
      technique: 'scapegoat',
      explain: 'Three unrelated problems are pinned on one group with no evidence. Classic scapegoat.',
    },
    {
      id: 'sg2', handle: 'GardenGuardian', name: 'Garden Guardian 🍅',
      body: 'My tomatoes didn\'t grow this year. [[Pigeon owners are ruining every garden in this town.]]',
      technique: 'scapegoat',
      explain: 'Weather, soil, watering… Instead of any of those, one group gets the blame.',
    },
    {
      id: 'sg3', handle: 'TrafficTom', name: 'Traffic Tom 🚗',
      body: 'Why is Riverton traffic so bad? [[Simple: the people of Lower Snodsworth drive over here and cause every single jam.]]',
      technique: 'scapegoat',
      explain: 'Traffic has many causes. Blaming one town\'s residents for all of it is scapegoating.',
    },
    {
      id: 'sg4', handle: 'PriceWatchPete', name: 'Price Watch Pete',
      body: 'Cheese prices went up at the Glimmerton market. [[Blame the accordion club. Everything went wrong when they started meeting on Thursdays.]]',
      technique: 'scapegoat',
      explain: 'Prices depend on costs, supply and demand. An unrelated hobby group takes the fall.',
    },
    {
      id: 'sg5', handle: 'RainyDayRant', name: 'Rainy Day Rant ☔',
      body: 'Riverton just had its rainiest summer on record. [[Thanks a lot, kite flyers. You\'ve angered the clouds.]]',
      technique: 'scapegoat',
      explain: 'Weather isn\'t caused by kites. The post invents a group to blame for a complex problem.',
    },
    {
      id: 'sg6', handle: 'LibraryLament', name: 'Library Lament 📚',
      body: 'The library has run out of mystery novels again. [[Chess club members are hoarding them, just like they hoard everything.]]',
      technique: 'scapegoat',
      explain: 'Maybe the books are popular, or the budget is small. A whole group is blamed without evidence.',
    },
    {
      id: 'sg7', handle: 'MillbrookMoaner', name: 'Millbrook Moaner',
      body: 'Millbrook FC lost again. [[It\'s those fans who cheer too quietly. They\'ve cursed this team.]]',
      technique: 'scapegoat',
      explain: 'Losing has lots of causes (like the other team). A slice of the crowd gets blamed instead.',
    },
    {
      id: 'sg8', handle: 'WiFiWarrior', name: 'Wi-Fi Warrior 📶',
      body: 'Internet down again in Glimmerton? [[I\'ll tell you who\'s behind it: birdwatchers. With their binoculars. Every time.]]',
      technique: 'scapegoat',
      explain: 'Outages have technical causes. Pinning them on a hobby group is scapegoating.',
    },

    // ---------------- 🤬 Personal attack ----------------
    {
      id: 'ah1', handle: 'BridgeBuff', name: 'Bridge Buff',
      body: 'Dr. Lin says the new bridge passed all its safety checks. [[But she wears socks with sandals, so why would anyone listen to her?]]',
      technique: 'adhominem',
      explain: 'Her footwear has nothing to do with the safety checks. The argument is never addressed.',
    },
    {
      id: 'ah2', handle: 'CouncilCritic', name: 'Council Critic',
      body: 'Councillor Fennel wants more bike racks in town. [[This is a man who still uses a flip phone. Next!]]',
      technique: 'adhominem',
      explain: 'His phone has nothing to do with whether bike racks are a good idea.',
    },
    {
      id: 'ah3', handle: 'HotTakeHarry', name: 'Hot Take Harry 🔥',
      body: 'The Riverton forecaster says Saturday will be sunny. [[Classic. She can\'t even park her car straight.]]',
      technique: 'adhominem',
      explain: 'Parking skills say nothing about weather forecasting. The person is attacked, not the forecast.',
    },
    {
      id: 'ah4', handle: 'SnarkySam', name: 'Snarky Sam',
      body: 'A food critic says the new Millbrook pizza place is excellent. [[He\'s clearly a clown who puts ketchup on everything.]]',
      technique: 'adhominem',
      explain: 'Mocking his taste isn\'t a reason the review is wrong. No counter-argument, just insults.',
    },
    {
      id: 'ah5', handle: 'ChessMaster3000', name: 'Chess Master 3000 ♟️',
      body: 'The tournament referee says the new chess rules are fair. [[Typical of someone with that ridiculous haircut.]]',
      technique: 'adhominem',
      explain: 'The referee\'s haircut doesn\'t make the rules unfair. The post dodges the actual question.',
    },
    {
      id: 'ah6', handle: 'GadgetLoyalist', name: 'Gadget Loyalist',
      body: 'A reviewer says the SnoozePod 3000 battery dies after 5 hours. [[Of course she does, she\'s a famously grumpy person.]]',
      technique: 'adhominem',
      explain: 'Calling the reviewer grumpy doesn\'t change the battery life. Attack the test, not the tester.',
    },
    {
      id: 'ah7', handle: 'LocalLegend', name: 'Local Legend',
      body: 'The librarian says overdue fines help pay for new books. [[Says the guy who owns 47 cardigans. Nobody trusts a cardigan man.]]',
      technique: 'adhominem',
      explain: 'Cardigan count is irrelevant. The claim about fines is never actually challenged.',
    },
    {
      id: 'ah8', handle: 'OpinionsGalore', name: 'Opinions Galore',
      body: 'The school science teacher says the "glowing broccoli" is just light reflecting off the packaging. [[What would she know? She failed her driving test twice.]]',
      technique: 'adhominem',
      explain: 'Driving tests have nothing to do with the explanation. The teacher is mocked instead of answered.',
    },

    // ---------------- 📉 Cherry-picking ----------------
    {
      id: 'cp1', handle: 'StatsSlinger', name: 'Stats Slinger 📊',
      body: 'Glimmerton\'s new speed bumps don\'t work. [[Proof: last Tuesday two more cars were caught speeding than the Tuesday before.]]',
      technique: 'cherry',
      explain: 'One day compared with another tells you almost nothing. What do the months of data say?',
    },
    {
      id: 'cp2', handle: 'SunnyClaims', name: 'Sunny Claims ☀️',
      body: 'Puddleby is officially the sunniest town in the country! [[Here are three photos of blue skies I took in August.]]',
      technique: 'cherry',
      explain: 'Three summer photos are hand-picked to stand in for a whole year of weather.',
    },
    {
      id: 'cp3', handle: 'GummyFan', name: 'Gummy Fan 🍬',
      body: 'MegaMind Moon Gummies work! [[Out of 200 testers, here are the 3 whose test scores went up.]]',
      technique: 'cherry',
      explain: 'Showing 3 successes out of 200 hides the other 197. That\'s the definition of cherry-picking.',
    },
    {
      id: 'cp4', handle: 'BusFacts', name: 'Bus Facts 🚌',
      body: 'The new Route 7 is a disaster. [[On Monday the 8:04 bus was 20 minutes late.]]',
      technique: 'cherry',
      explain: 'One late bus doesn\'t show the route is a disaster. What about the hundreds of other trips?',
    },
    {
      id: 'cp5', handle: 'SnowNoMore', name: 'Snow No More',
      body: 'Winter is cancelled in Riverton! [[It was 18°C on January 3rd.]]',
      technique: 'cherry',
      explain: 'One warm day is cherry-picked. You need the whole season to talk about winter.',
    },
    {
      id: 'cp6', handle: 'ReviewQueen', name: 'Review Queen 👑',
      body: 'The Millbrook Café is the worst in town. [[Just read this one-star review from 2019!]]',
      technique: 'cherry',
      explain: 'A single old review is picked out of many. What do the rest say?',
    },
    {
      id: 'cp7', handle: 'HoverFanatic', name: 'Hover Fanatic',
      body: 'HoverShoes are totally reliable. [[Watch this clip of the one time they worked perfectly!]]',
      technique: 'cherry',
      explain: 'The best moment is shown and every failure is left out.',
    },
    {
      id: 'cp8', handle: 'TownTrends', name: 'Town Trends',
      body: 'Crime is up in Lower Snodsworth. [[Garden-gnome thefts went up this year]], and that\'s all the proof you need.',
      technique: 'cherry',
      explain: 'One tiny category is picked out to claim a town-wide trend. What happened to all the other numbers?',
    },

    // ---------------- 🎭 Impersonation ----------------
    {
      id: 'im1', handle: 'RivertonCouncil_0fficial', name: 'Riverton Council (Official)',
      body: '[[This is the council\'s NEW official account, please ignore the old one.]] Free parking permits for everyone who sends us their bank details!',
      technique: 'impersonation',
      explain: 'A "new official account" (with a zero in "0fficial") pretends to be the council. Check the real website.',
    },
    {
      id: 'im2', handle: 'MayorPlum_Real', name: 'Mayor Plum (real)',
      body: '[[Hi, it\'s me, Mayor Plum, on my secret personal account.]] I\'ve decided to rename the town Plumtown. Please share!',
      technique: 'impersonation',
      explain: 'A "secret account" claiming to be the mayor. Real announcements come through official channels.',
    },
    {
      id: 'im3', handle: 'GlimmertonNewz', name: 'Glimmerton News',
      body: '[[BREAKING from Glimmerton News (yes, the real one, we just changed our logo)]]: the bakery is giving away free cakes tomorrow.',
      technique: 'impersonation',
      explain: 'A lookalike account ("Newz") insists it\'s the real news outlet. Trusted names are easy to copy.',
    },
    {
      id: 'im4', handle: 'DazzleMcGlitterr', name: 'Dazzle McGlitter',
      body: '[[Hi fans, it\'s me, Dazzle, posting from my backup account!]] Message me to win a signed hairbrush, just pay $50 shipping.',
      technique: 'impersonation',
      explain: 'A "backup account" with an extra letter in the handle. Fake celebrity accounts love giveaways with a fee.',
    },
    {
      id: 'im5', handle: 'MillbrookPolice_HQ', name: 'Millbrook Police Dept',
      body: '[[Official notice from Millbrook Police (new page, our old one is down)]]: all bicycles must be painted orange by Friday.',
      technique: 'impersonation',
      explain: 'It borrows the police\'s authority from an unverified "new page". Check the official site before obeying.',
    },
    {
      id: 'im6', handle: 'SnoozePod_Help_Desk', name: 'SnoozePod Support',
      body: '[[Hello, I\'m from the SnoozePod company\'s official help team!]] To fix your device, just reply with your password.',
      technique: 'impersonation',
      explain: 'Pretending to be company support to get your password. Real support never asks for it.',
    },
    {
      id: 'im7', handle: 'PuddlebyLibrary_', name: 'Puddleby Library',
      body: '[[Message from the head librarian, posting from a temporary account]]: late fees have doubled. Pay at the link below.',
      technique: 'impersonation',
      explain: 'A "temporary account" with a trailing underscore poses as the library. Pay only via the official site.',
    },
    {
      id: 'im8', handle: 'RivertonWeather0ffice', name: 'Riverton Weather Office',
      body: '[[The real Riverton Weather Office here, our usual account is on holiday]]: it will snow marshmallows on Thursday.',
      technique: 'impersonation',
      explain: 'An account claiming to be the "real" weather office, with a zero in its handle. Accounts don\'t go on holiday.',
    },

    // ---------------- 🔁 Bandwagon ----------------
    {
      id: 'bw1', handle: 'TrendTracker', name: 'Trend Tracker 📈',
      body: 'Glowing broccoli is bad for you. [[Over 2 million people have already shared this, so it must be true!]]',
      technique: 'bandwagon',
      explain: 'Share counts measure popularity, not accuracy. No evidence is offered at all.',
    },
    {
      id: 'bw2', handle: 'HoverShoeHype', name: 'HoverShoe Hype',
      body: '[[Everyone in Glimmerton already owns HoverShoes.]] Don\'t be the last person still walking!',
      technique: 'bandwagon',
      explain: 'The pitch is "everyone is doing it", not "here\'s why it\'s good".',
    },
    {
      id: 'bw3', handle: 'GummyGang', name: 'Gummy Gang',
      body: '[[Thousands of people can\'t be wrong]]: MegaMind Moon Gummies are the real deal.',
      technique: 'bandwagon',
      explain: 'Thousands of people absolutely can be wrong. Numbers aren\'t evidence.',
    },
    {
      id: 'bw4', handle: 'ViralVince', name: 'Viral Vince',
      body: '[[This post already has 50,000 likes, so you know it\'s legit]]: the Riverton clock tower is completely hollow.',
      technique: 'bandwagon',
      explain: 'Likes are used as proof. A claim doesn\'t get truer because it\'s popular.',
    },
    {
      id: 'bw5', handle: 'JoinTheClub', name: 'Join The Club',
      body: '[[All your neighbours have already signed]] the petition to paint Millbrook bridge purple. What are you waiting for?',
      technique: 'bandwagon',
      explain: 'Social pressure instead of reasons. Should the bridge be purple? The post never says why.',
    },
    {
      id: 'bw6', handle: 'PopularOpinion', name: 'Popular Opinion',
      body: '[[Literally everyone I know]] says the new Puddleby roundabout is haunted. Case closed.',
      technique: 'bandwagon',
      explain: '"Everyone says" replaces evidence. Case very much not closed.',
    },
    {
      id: 'bw7', handle: 'FOMO_Fiona', name: 'FOMO Fiona',
      body: '[[Every cool parent in Lower Snodsworth]] is signing their kids up for Underwater Chess. Places are filling up!',
      technique: 'bandwagon',
      explain: 'It sells the fear of missing out, not the benefits of the class.',
    },
    {
      id: 'bw8', handle: 'MostPeopleAgree', name: 'Most People Agree',
      body: '[[9 out of 10 people on my feed]] think the SnoozePod 3000 makes you look younger. That settles it.',
      technique: 'bandwagon',
      explain: 'A poll of your own feed proves nothing about the gadget. Agreement isn\'t evidence.',
    },

    // ---------------- ✅ Seems fine ----------------
    {
      id: 'ok1', handle: 'RivertonLibrary', name: 'Riverton Library',
      body: 'From next month we\'re open until 6pm on Saturdays. The full timetable is on our website. See you there!',
      technique: 'fine',
      explain: 'A plain, checkable announcement from the library itself. No pressure, no tricks.',
    },
    {
      id: 'ok2', handle: 'MillbrookBakes', name: 'Millbrook Bakes 🥐',
      body: 'Sold out of sourdough by 10am again! We\'re adding an extra batch on Fridays from now on. Thanks for your patience.',
      technique: 'fine',
      explain: 'An ordinary business update. Nothing scary, no fake authority, no pressure.',
    },
    {
      id: 'ok3', handle: 'GlimmertonWeatherDesk', name: 'Glimmerton Weather Desk',
      body: 'Saturday: 70% chance of light rain in the afternoon. Kite festival organisers will post any changes by Friday evening.',
      technique: 'fine',
      explain: 'Calm, specific and honest about uncertainty ("70% chance"). That\'s what good info looks like.',
    },
    {
      id: 'ok4', handle: 'Dr_Ana_Ruiz', name: 'Dr. Ana Ruiz, food scientist',
      body: 'Lots of questions about the "glowing broccoli". Our lab tested samples: the glow comes from a reflective wax on the packaging, not the broccoli. Photos and methods are in our report.',
      technique: 'fine',
      explain: 'A relevant expert explains what was tested and shows the methods so you can check.',
    },
    {
      id: 'ok5', handle: 'PuddlebyCouncil', name: 'Puddleby Town Council',
      body: 'Councillors voted 6–3 to add two pedestrian crossings on Mill Lane. Meeting minutes, including the objections raised, are on our website.',
      technique: 'fine',
      explain: 'It reports the vote, admits there were objections and links to the full record.',
    },
    {
      id: 'ok6', handle: 'JoReviewsGadgets', name: 'Jo Reviews Gadgets',
      body: 'Tested the SnoozePod 3000 for two weeks. Comfy, but the battery lasted about 5 hours, not the 10 on the box. Mixed bag: 3/5.',
      technique: 'fine',
      explain: 'A balanced review with good and bad points and a clear test period.',
    },
    {
      id: 'ok7', handle: 'RivertonZoo', name: 'Riverton Zoo 🐢',
      body: 'Update: Shelly the tortoise has been found safe in the café garden, munching lettuce. She\'s back in her enclosure. Thanks, everyone!',
      technique: 'fine',
      explain: 'A straightforward update from the zoo itself. Happy ending, no tricks.',
    },
    {
      id: 'ok8', handle: 'MillbrookBusCo', name: 'Millbrook Bus Co.',
      body: 'From 1 June, Route 7 will run every 20 minutes instead of every 30, based on a year of passenger counts. New timetable attached.',
      technique: 'fine',
      explain: 'A change explained with the data behind it, from the bus company\'s own account.',
    },
    {
      id: 'ok9', handle: 'GrandmaGertie', name: 'Gertie 🍋',
      body: 'Tried the lemon cake from the Puddleby cookbook. Mine came out a bit flat, so next time I\'ll use fresher baking powder. Still tasty!',
      technique: 'fine',
      explain: 'Just someone sharing a baking attempt. Not every post is trying to manipulate you.',
    },
    {
      id: 'ok10', handle: 'Class5B_Science', name: 'Class 5B Science',
      body: 'We measured the pond\'s water temperature every morning for a month. Average: 14°C, warmest on the 21st. The full data sheet is on the school noticeboard.',
      technique: 'fine',
      explain: 'All the data, not a hand-picked day, and it\'s shared so others can check.',
    },
    {
      id: 'ok11', handle: 'LowerSnodsworthFC', name: 'Lower Snodsworth FC ⚽',
      body: 'We lost 2–1 on Saturday. Their keeper made some brilliant saves. Training is Tuesday at 6pm, and new players are always welcome.',
      technique: 'fine',
      explain: 'Gracious and factual. No one to blame, nothing to panic about.',
    },
    {
      id: 'ok12', handle: 'CheckItCharlie', name: 'Charlie',
      body: 'Saw a post saying all bikes must be painted orange by Friday. I checked the Millbrook Police website and there\'s no such rule. Looks like a fake account.',
      technique: 'fine',
      explain: 'This is someone doing exactly the right thing: checking the official source before sharing.',
    },
  ],
};

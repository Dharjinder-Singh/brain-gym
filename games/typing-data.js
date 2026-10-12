// Type Dojo content: Word rain words + Sprint passages.
// All text is plain ASCII (letters, digits, space and . , ! ? ' -) so it can be typed on any keyboard.
// Output shape: window.BG_DATA_TYPING = { words: [string], passages: [string] }
(() => {
  'use strict';

  const words = `
    the and you that was for are with his they this have from one had word but not what all
    were when your can said there use each which she how their will other about out many then
    them these some her would make like him into time has look two more write see number way
    could people than first water been call who oil now find long down day did get come made may
    part over new sound take only little work know place year live back give most very after
    thing our just name good sentence man think say great where help through much before line
    right too mean old any same tell boy follow came want show also around form three small set
    put end does another well large must big even such because turn here why ask went men read
    need land different home move try kind hand picture again change off play spell air away
    animal house point page letter mother answer found study still learn should world high every
    near add food between own below country plant last school father keep tree never start city
    earth eye light thought head under story saw left few while along might close something seem
    next hard open example begin life always those both paper together got group often run
    important until children side feet car mile night walk white sea began grow took river four
    carry state once book hear stop without second later miss idea enough eat face watch far
    really almost let above girl sometimes mountain cut young talk soon list song being leave
    family happy smile laugh dance music garden rain cloud storm sun moon star planet rocket
    window door table chair clock pencil bottle basket ticket market train station bridge road
    bread butter cheese apple mango banana orange lemon sugar salt pepper honey rice spoon plate
    jump swim climb throw catch kick ride fly sing draw paint build fix clean cook bake brave
    quick quiet bright clever gentle kind proud lucky funny silly curious friendly
    tiger lion monkey parrot peacock elephant camel horse rabbit turtle dolphin whale penguin
    puzzle riddle secret magic dragon castle pirate treasure island jungle desert ocean forest
    rainbow thunder winter summer spring autumn breeze shadow mirror candle lantern
    chai auto metro cricket monsoon samosa dosa idli rickshaw bazaar mela diwali holi kite
    chutney lassi biryani paneer jalebi scooter tiffin
    pizza robot laptop phone camera button signal planet comet galaxy orbit
    zebra yellow purple violet silver golden velvet jazz quiz fuzzy buzz jolly
    victory journey kingdom village festival picnic holiday birthday promise wonder
  `.trim().split(/\s+/);

  const passages = [
    // Proverbs, retold
    'Slow and steady wins the race, but steady does not mean sleepy. Keep a calm rhythm, trust your fingers, and the speed will arrive on its own, one clean word at a time.',
    'Practice makes progress. Nobody types fast on the first day. Ten honest minutes each morning will carry you further than one wild hour once a month. Small steps add up.',
    'Little drops of water make a mighty ocean. Every key you press correctly today is a tiny drop, and one day you will look back and see a whole sea of skill behind you.',
    'Where there is a will, there is a way. If a word trips you up, slow down, breathe, and type it again. The keyboard does not care how many tries it takes. Neither should you.',
    'Do not count your chickens before they hatch, and do not count your words per minute before you finish the line. Eyes on the next letter, not on the score.',
    'A journey of a thousand miles begins with a single step. A journey of a thousand words begins with a single key. Press it gently, press it right, and then press the next one.',
    'The early bird catches the worm, but the second mouse gets the cheese. Being first is nice. Being careful is often better. Today, try to be both quick and careful.',
    'Rome was not built in a day, and neither is a fast typist. Bricks go down one at a time. Letters go down one at a time. Patience is the mortar that holds it all together.',
    'Actions speak louder than words, but today the words are the action! Let your fingers do the talking while your hands stay calm and still above the keys.',
    'An apple a day keeps the doctor away. A short typing drill a day keeps the clumsy fingers away. Both are easy, both are cheap, and both work better when you keep at them.',
    'Every cloud has a silver lining. A typo is not a disaster, it is a clue. It shows you exactly which key needs a little more love tomorrow. Fix it, smile, and carry on.',
    'Two heads are better than one, and ten fingers are better than two. Give every finger its own keys and keep that deal forever. Your hands will thank you for the order.',
    'Better late than never, but better never late. Start your drill on time, finish it with a grin, and then go and enjoy a cup of chai. You have earned it, champion.',
    'Look before you leap, and read before you type. Glance a few words ahead so your fingers already know what is coming. Good typists read like good drivers watch the road.',
    'The pen is mightier than the sword, and the keyboard is mightier than the pen, at least when it comes to speed. Use that power for kind messages and clever ideas.',
    'Many hands make light work. Ten fingers sharing the load means no single finger gets tired. Spread the work, keep the rhythm, and the words will flow like a river.',
    'You cannot judge a book by its cover, and you cannot judge a typist by one bad line. Every session is a fresh page. Turn it, take a breath, and write a better story.',
    'When life gives you lemons, make lemonade. When the keyboard gives you a tricky word, type it slowly three times. By the third time, the tricky word will feel like an old friend.',
    'Birds of a feather flock together, and letters that live close together love to be typed in pairs. Notice the pairs you type often, like th, in and er, and make them smooth.',
    'A stitch in time saves nine. Fixing a mistake right away is much faster than finding it later. That is why this dojo makes you correct each red letter before moving on.',

    // Fun facts (kept to well-established ones)
    'An octopus has three hearts and blue blood. Two hearts pump blood through the gills and one pumps it around the body. That is a lot of heart for an animal with no bones at all.',
    'A day on Venus is longer than a year on Venus. The planet spins so slowly that it goes all the way around the Sun before it finishes turning once on its own axis.',
    'Bananas are berries, but strawberries are not! To a botanist, a berry grows from one flower with one ovary. The banana fits the rule, while the strawberry is something else.',
    'Hummingbirds can hover in one spot and even fly backwards. Their wings beat so fast that they hum, which is how these tiny birds got their name. They can hover like little drones.',
    'Butterflies taste with their feet. When a butterfly lands on a leaf, sensors on its feet help it check whether the plant is a good place to lay eggs. Imagine tasting your shoes!',
    'A group of flamingos is called a flamboyance. Flamingos are pink because of the food they eat, such as tiny shrimp and algae. Young flamingos start out grey and turn pink later.',
    'Wombats make cube-shaped poop. Scientists studied why and found that the walls of their gut stretch in a special way, shaping the droppings into little blocks. Nature is weird!',
    'Light from the Sun takes about eight minutes to reach Earth. So when you look at the Sun at sunset, you are really seeing it as it was a few minutes ago. Please do not stare, though.',
    'Jupiter is the biggest planet in our solar system. More than a thousand Earths could fit inside it. Its Great Red Spot is a giant storm that is wider than our whole planet.',
    'Sea otters often hold paws while they float and sleep, so they do not drift apart. They also wrap themselves in seaweed like a blanket. Cute and clever at the same time.',
    'The peacock is the national bird of India. Only the males have the famous long, shiny train of feathers, which they spread into a fan to impress. The females are called peahens.',
    'Honey can stay good to eat for a very long time if it is sealed well. It has very little water and is slightly acidic, so germs find it hard to grow there. Sweet and strong!',
    'A snail can sleep for a long stretch when the weather is too dry. It seals itself inside its shell and waits for damp days to return. Now that is a serious nap.',
    'Cats spend a large part of their day asleep, often twelve hours or more. Cats are most active around dawn and dusk, which is why your cat may want to play at sunrise.',
    'Giraffes have the same number of neck bones as people: seven. Each of their neck bones is just much, much longer. That long neck helps them reach leaves high in the trees.',
    'Some elephants have passed the mirror test, showing they recognise their own reflection. They also use their trunks to drink, smell, lift logs and even give friendly hugs.',
    'The monsoon usually reaches Kerala around the first of June and then sweeps north across India. Farmers, schools and cricket fans all watch the sky to see when it will arrive.',
    'Penguins cannot fly in the air, but they fly through the water. Their wings work like flippers, and some penguins can dive deep to catch fish before popping back up for air.',
    'Dolphins sleep with one half of the brain at a time. One side rests while the other stays alert, so the dolphin can keep swimming and come up to breathe. Smart and sleepy!',
    'Your fingers have no muscles inside them. The muscles that move them sit in your palm and forearm and pull on long tendons, like strings on a puppet. Wiggle them and see.',

    // Mini-stories
    'Meera wanted to win the school typing contest. Every evening she practised for ten minutes, slow and careful. On the big day she was not the fastest, but she made zero mistakes and won.',
    'The auto driver had a tiny keyboard taped to his dashboard. At every red light he practised a word or two. By the end of the year he had typed his first novel, one signal at a time.',
    'A small robot named Bolt loved to type, but its fingers were made of spoons. It typed slowly, very slowly, yet every letter was right. The other robots soon came to Bolt for help.',
    'Grandpa sat down at the laptop for the first time. He pressed one key, then laughed, then pressed another. A week later he sent his first email to the whole family. It said: Hello!',
    'On a rainy monsoon afternoon, two friends raced each other on old keyboards. The thunder boomed, the chai went cold, and both of them laughed so hard that they forgot who won.',
    'The dragon in the castle could not breathe fire any more, so she learned to type instead. Now she writes long letters to the knights, and they always write back very politely.',
    'Arjun typed with two fingers like a hungry woodpecker. His sister showed him where the home row was. Slowly his hands learned the map, and the woodpecker became a pianist.',
    'A tiny mouse lived under the keyboard and ate the crumbs. Each time someone typed fast, the mouse danced. Each time they made a mistake, it sneezed. It sneezed less and less.',
    'The pirate captain could not read the old treasure map, so he typed every clue into his laptop. The last clue said: Look under the coconut tree. The treasure was a box of sweets.',
    'The metro was crowded, but Riya had a seat and a story in her head. She typed it on her phone with two quick thumbs, and by the last station the story had a happy ending.',
    'The village held a kite festival every January. This year a girl painted a keyboard on her kite. It flew higher than all the others, and the letters seemed to dance in the wind.',
    'A cricket coach told his team to watch the ball, not the crowd. A typing coach tells you to watch the words, not your fingers. Trust your hands to find the keys on their own.',
    'Every morning the baker typed the day menu on a tiny screen: fresh bread, warm buns, sweet jalebi. One day he typed bread as braed, and people queued up to try the new braed.',
    'The owl ran a night school for young animals. Lesson one was patience. Lesson two was practice. Lesson three was typing with soft paws so nobody woke up the sleeping bears.',
    'Kabir lost his first typing race by a mile. He did not sulk. He practised for a month, raced again, and lost by only a little. He grinned. Getting better is its own kind of win.',
    'Two parrots shared a cage next to a computer. One learned to say every word it heard. The other learned to press the space bar at the perfect moment. Together they wrote poems.',
    'The old lighthouse keeper typed a short log each night: wind, waves, ships that passed. After forty years his logs filled a whole shelf, and every page was neat and clear.',
    'A turtle and a rabbit had a typing race. The rabbit typed fast and made many typos. The turtle typed slowly and made none. In the end the judge read both, and the turtle won.',
    'The school bell rang, but Asha stayed for one more minute to finish her sentence. She pressed the last full stop, smiled, and ran out into the sunshine with her friends.',
    'A family played a game after dinner: each person typed one line of a story. Dad added a dragon, Mum added a picnic, and the baby pressed the keyboard with a happy fist.',
  ];

  window.BG_DATA_TYPING = { words: Array.from(new Set(words)), passages };
})();

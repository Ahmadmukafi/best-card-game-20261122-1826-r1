// deck.js — the cards of EMBER CHAIN: suits, the deck, and the seeded shuffle.
// One job: know what a card is, and hand cards out in a reproducible order.

export const SUITS = {
  flame: { name: 'Flame', glyph: '▲', color: '#ff5a3c', dark: '#a12718', beats: 'thorn' },
  tide: { name: 'Tide', glyph: '≋', color: '#38a8ff', dark: '#145a94', beats: 'flame' },
  thorn: { name: 'Thorn', glyph: '✤', color: '#58c96b', dark: '#1f7a33', beats: 'tide' },
  stone: { name: 'Stone', glyph: '■', color: '#ffb02e', dark: '#8a5a10', beats: null },
};

export const SUIT_KEYS = ['flame', 'tide', 'thorn', 'stone'];

// Flavor names, one per power step, so every card has a name of its own.
const CARD_NAMES = {
  flame: ['Cinder', 'Spark', 'Blaze', 'Wildfire', 'Pyre', 'Inferno', 'Magma', 'Phoenix', 'Sunflare'],
  tide: ['Dewdrop', 'Ripple', 'Stream', 'Current', 'Breaker', 'Undertow', 'Maelstrom', 'Leviathan', 'Abyssal'],
  thorn: ['Sprout', 'Bramble', 'Vine', 'Thistle', 'Briar', 'Rootbind', 'Wolfsbane', 'Elderwood', 'Worldroot'],
  stone: ['Pebble', 'Flint', 'Granite', 'Boulder', 'Monolith', 'Obsidian', 'Gargoyle', 'Colossus', 'Mountain'],
};

// Cost in ember follows power: light cards are cheap, heavy cards cost more.
export function emberCost(power) {
  if (power <= 3) return 1;
  if (power <= 6) return 2;
  return 3;
}

export function makeCard(suit, power) {
  return {
    id: `${suit}-${power}`,
    suit,
    power,
    cost: emberCost(power),
    name: CARD_NAMES[suit][power - 1],
  };
}

// A small deterministic RNG (mulberry32). Seeded draws make every screenshot
// reproducible: the same seed always deals the same hands.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDeck() {
  const deck = [];
  for (const suit of SUIT_KEYS) {
    for (let power = 1; power <= 9; power++) deck.push(makeCard(suit, power));
  }
  return deck;
}

export function shuffleDeck(deck, rng) {
  const cards = deck.slice();
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cards[i];
    cards[i] = cards[j];
    cards[j] = tmp;
  }
  return cards;
}

// Draw from the top of the deck; when it runs dry, the discard pile is
// shuffled back in so a duel never stalls.
export function drawCards(deck, discard, rng, count) {
  const drawn = [];
  for (let n = 0; n < count; n++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck.push(...shuffleDeck(discard.splice(0), rng));
    }
    drawn.push(deck.pop());
  }
  return drawn;
}

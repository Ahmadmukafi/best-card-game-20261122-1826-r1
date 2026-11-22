// opponent.js — the rival mage: what it charges, and which card it plays.
// One job: make the rival readable and counterable. It commits to a card at
// the start of the round and announces that card's suit as its intent, so the
// player can answer with the suit that beats it — or keep a chain alive.

import { SUITS } from './deck.js';

// The suit that beats a given suit (Stone has no beater and no victim).
export function counterSuit(suit) {
  for (const key of Object.keys(SUITS)) {
    if (SUITS[key].beats === suit) return key;
  }
  return null;
}

// Pick the card the rival commits this round. It prefers a card whose suit
// beats the suit the player played last; otherwise it takes its strongest
// card it can afford. The choice is seeded, so a fixed seed replays it.
export function chooseRivalCard(hand, ember, playerLastSuit, rng) {
  const affordable = hand.filter((card) => card.cost <= ember);
  const pool = affordable.length > 0 ? affordable : hand.slice();
  if (pool.length === 0) return null;
  if (playerLastSuit) {
    const beater = counterSuit(playerLastSuit);
    const counters = pool.filter((card) => card.suit === beater);
    if (counters.length > 0) {
      counters.sort((a, b) => b.power - a.power);
      return counters[0];
    }
  }
  const sorted = pool.slice().sort((a, b) => b.power - a.power || a.cost - b.cost);
  // Usually the strongest, sometimes the second — a rival with a tell, not a wall.
  const pick = rng() < 0.75 ? sorted[0] : sorted[Math.min(1, sorted.length - 1)];
  return pick;
}

// The intent line the table shows before the player answers.
export function intentLine(card) {
  if (!card) return 'The rival hesitates…';
  return `Rival is charging ${SUITS[card.suit].name}…`;
}

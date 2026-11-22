// chain.js — the CHAIN, EMBER CHAIN's signature mechanic, and the clash rules.
// One job: turn two played cards into damage, and keep the chain honest.

import { SUITS } from './deck.js';

export const MAX_CHAIN = 5;

// A suit beats exactly one other suit; Stone is neutral and unblockable:
// it never gains an advantage and never suffers one.
export function suitBeats(attackerSuit, defenderSuit) {
  if (attackerSuit === 'stone' || defenderSuit === 'stone') return false;
  return SUITS[attackerSuit].beats === defenderSuit;
}

export function suitLosesTo(attackerSuit, defenderSuit) {
  return suitBeats(defenderSuit, attackerSuit);
}

// Advantage multiplies power by 3/2 (rounded up); disadvantage halves it
// (rounded down, never below 1); a neutral clash plays at face value.
export function effectivePower(card, foeCard) {
  if (suitBeats(card.suit, foeCard.suit)) return Math.ceil((card.power * 3) / 2);
  if (suitLosesTo(card.suit, foeCard.suit)) return Math.max(1, Math.floor(card.power / 2));
  return card.power;
}

// Playing the same suit as your previous card grows the chain by one;
// any other suit (or passing) breaks it back to one.
export function nextChain(chain, lastSuit, playedSuit) {
  if (playedSuit === null) return 0;
  if (lastSuit === playedSuit) return Math.min(chain + 1, MAX_CHAIN);
  return 1;
}

export function chainMultiplier(chain) {
  return Math.max(1, Math.min(chain, MAX_CHAIN));
}

// Resolve one clash. The higher effective power wins and deals the
// difference as damage; the player's chain multiplies damage they deal,
// and Surge doubles it once more. Returns everything the table needs to show.
export function resolveClash(playerCard, rivalCard, chain, surgeActive) {
  const playerEff = effectivePower(playerCard, rivalCard);
  const rivalEff = effectivePower(rivalCard, playerCard);
  const mult = chainMultiplier(chain) * (surgeActive ? 2 : 1);
  const playerWins = playerEff > rivalEff;
  const tied = playerEff === rivalEff;
  const rawGap = Math.abs(playerEff - rivalEff);
  const damageToRival = playerWins ? rawGap * mult : 0;
  const damageToPlayer = !playerWins && !tied ? rawGap : 0;
  return {
    playerEff,
    rivalEff,
    playerWins,
    tied,
    mult,
    damageToRival,
    damageToPlayer,
    playerAdvantage: suitBeats(playerCard.suit, rivalCard.suit),
    rivalAdvantage: suitBeats(rivalCard.suit, playerCard.suit),
  };
}

// Human words for the clash, shown under the table after each round.
export function clashLine(result, playerCard, rivalCard) {
  if (result.tied) {
    return `Dead heat — ${playerCard.name} meets ${rivalCard.name} at ${result.playerEff} each. No damage.`;
  }
  if (result.playerWins) {
    const adv = result.playerAdvantage ? ` ${SUITS[playerCard.suit].name} beats ${SUITS[rivalCard.suit].name}!` : '';
    return `${playerCard.name} ${result.playerEff} overpowers ${rivalCard.name} ${result.rivalEff}.${adv} Chain ×${result.mult} — ${result.damageToRival} damage!`;
  }
  const adv = result.rivalAdvantage ? ` ${SUITS[rivalCard.suit].name} beats ${SUITS[playerCard.suit].name}!` : '';
  return `${rivalCard.name} ${result.rivalEff} overpowers ${playerCard.name} ${result.playerEff}.${adv} You take ${result.damageToPlayer} damage.`;
}

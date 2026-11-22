// main.js — EMBER CHAIN's state machine: title, rounds, clash, win, loss.
// One job: own the duel's state and drive the table from it. The ?shot=
// query renders one fixed screen (title, table, win, loss) from a fixed seed,
// so every screenshot is a reproducible render of this same code.

import { buildDeck, shuffleDeck, drawCards, mulberry32 } from './deck.js';
import { nextChain, resolveClash, clashLine, chainMultiplier } from './chain.js';
import { chooseRivalCard, intentLine } from './opponent.js';
import {
  buildTable,
  renderTable,
  renderTitle,
  renderWin,
  renderLoss,
  hideOverlay,
} from './render.js';
import { bindInput } from './input.js';
import {
  playCardSound,
  clashWinSound,
  clashLoseSound,
  chainUpSound,
  surgeSound,
  victorySound,
  defeatSound,
  ensureAudio,
} from './audio.js';

const MAX_LIFE = 20;
const HAND_SIZE = 7;
const MAX_EMBER = 7;
const START_EMBER = 3;

function newGame(seed) {
  const rng = mulberry32(seed);
  const deck = shuffleDeck(buildDeck(), rng);
  const discard = [];
  return {
    screen: 'title',
    phase: 'title',
    seed,
    gamesPlayed: 0,
    rng,
    deck,
    discard,
    round: 1,
    score: 0,
    playerLife: MAX_LIFE,
    rivalLife: MAX_LIFE,
    maxLife: MAX_LIFE,
    ember: START_EMBER,
    maxEmber: MAX_EMBER,
    rivalEmber: START_EMBER,
    chain: 0,
    bestChain: 0,
    lastSuit: null,
    surgeUsed: false,
    surgeActive: false,
    playerHand: drawCards(deck, discard, rng, HAND_SIZE),
    rivalHand: drawCards(deck, discard, rng, HAND_SIZE),
    playerPlayed: null,
    rivalPlayed: null,
    rivalCommitted: null,
    intentText: '',
    message: 'Welcome to the tavern. Press Enter to play.',
    lastResult: null,
  };
}

const app = document.getElementById('app');
const statusLine = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

let state = newGame(seed);
buildTable(app);

function announce(text) {
  statusLine.textContent = text;
}

function refresh() {
  renderTable(app, state, playCard);
}

// The rival commits a card at the start of the round and announces its suit,
// so the player can answer with the suit that beats it.
function beginRound() {
  state.playerPlayed = null;
  state.rivalPlayed = null;
  state.lastResult = null;
  state.rivalCommitted = chooseRivalCard(
    state.rivalHand,
    state.rivalEmber,
    state.lastSuit,
    state.rng,
  );
  if (state.rivalCommitted) {
    state.rivalHand = state.rivalHand.filter((card) => card !== state.rivalCommitted);
  }
  state.intentText = intentLine(state.rivalCommitted);
  state.phase = 'awaitPlay';
  if (!state.message.startsWith('Round')) {
    state.message = `Round ${state.round} — the rival charges ${state.rivalCommitted ? state.rivalCommitted.suit : 'nothing'}. Your move.`;
  }
  refresh();
}

function startGame() {
  ensureAudio();
  state.screen = 'table';
  state.phase = 'awaitPlay';
  hideOverlay(app);
  state.message = `Round 1 — the rival charges. Your move.`;
  beginRound();
  announce('The duel begins. Play a card.');
}

function finishDuel(won) {
  state.screen = won ? 'win' : 'loss';
  state.phase = 'over';
  state.intentText = '';
  refresh();
  if (won) {
    victorySound();
    renderWin(app, state);
    announce(`Victory. Final score ${state.score}.`);
  } else {
    defeatSound();
    renderLoss(app, state);
    announce(`Defeat. Final score ${state.score}.`);
  }
}

function checkEnd() {
  if (state.rivalLife <= 0) {
    state.rivalLife = 0;
    state.message = 'The rival’s life is spent — VICTORY!';
    finishDuel(true);
    return true;
  }
  if (state.playerLife <= 0) {
    state.playerLife = 0;
    state.message = 'Your life is spent — DEFEAT.';
    finishDuel(false);
    return true;
  }
  return false;
}

function nextRound() {
  state.round += 1;
  state.ember = Math.min(state.maxEmber, state.ember + 1);
  state.rivalEmber = Math.min(state.maxEmber, state.rivalEmber + 1);
  if (state.playerHand.length < HAND_SIZE) {
    state.playerHand.push(...drawCards(state.deck, state.discard, state.rng, 1));
  }
  if (state.rivalHand.length < HAND_SIZE) {
    state.rivalHand.push(...drawCards(state.deck, state.discard, state.rng, 1));
  }
  state.surgeActive = false;
  beginRound();
}

function resolveRound() {
  const played = state.playerPlayed;
  const rivalCard = state.rivalCommitted;
  state.rivalCommitted = null;
  state.rivalPlayed = rivalCard || null;

  if (!played && !rivalCard) {
    state.message = 'Both mages hold. The embers settle.';
    state.chain = 0;
    state.lastSuit = null;
    refresh();
    window.setTimeout(nextRound, 900);
    return;
  }
  if (!played) {
    // The player passed: the rival's card lands unopposed.
    const power = rivalCard.power;
    state.playerLife = Math.max(0, state.playerLife - power);
    state.chain = 0;
    state.lastSuit = null;
    state.message = `You hold back — ${rivalCard.name} strikes unopposed for ${power} damage.`;
    state.discard.push(rivalCard);
    clashLoseSound();
    refresh();
    if (!checkEnd()) window.setTimeout(nextRound, 1100);
    return;
  }

  const chain = nextChain(state.chain, state.lastSuit, played.suit);
  const grew = chain > state.chain;
  state.chain = chain;
  state.bestChain = Math.max(state.bestChain, chain);
  state.lastSuit = played.suit;

  if (!rivalCard) {
    const damage = played.power * chainMultiplier(chain) * (state.surgeActive ? 2 : 1);
    state.rivalLife = Math.max(0, state.rivalLife - damage);
    state.score += damage;
    state.message = `${played.name} lands unopposed — ${damage} damage!`;
    state.discard.push(played);
    clashWinSound();
    refresh();
    if (!checkEnd()) window.setTimeout(nextRound, 1100);
    return;
  }

  const result = resolveClash(played, rivalCard, chain, state.surgeActive);
  state.lastResult = result;
  state.rivalLife = Math.max(0, state.rivalLife - result.damageToRival);
  state.playerLife = Math.max(0, state.playerLife - result.damageToPlayer);
  state.score += result.damageToRival;
  state.message = clashLine(result, played, rivalCard);
  state.discard.push(played, rivalCard);
  if (result.playerWins) clashWinSound();
  else if (!result.tied) clashLoseSound();
  if (grew && chain >= 2) chainUpSound(chain);
  refresh();
  if (!checkEnd()) window.setTimeout(nextRound, 1400);
}

function playCard(index) {
  if (state.phase !== 'awaitPlay' || state.screen !== 'table') return;
  const card = state.playerHand[index];
  if (!card) return;
  if (card.cost > state.ember) {
    state.message = `Not enough ember — ${card.name} costs ${card.cost}⬢, you hold ${state.ember}.`;
    refresh();
    return;
  }
  ensureAudio();
  state.playerHand.splice(index, 1);
  state.ember -= card.cost;
  state.playerPlayed = card;
  state.phase = 'resolving';
  playCardSound();
  refresh();
  window.setTimeout(resolveRound, 500);
}

function endTurn() {
  if (state.phase !== 'awaitPlay' || state.screen !== 'table') return;
  if (state.playerPlayed) {
    resolveRound();
    return;
  }
  // Passing without a card: the rival's committed card lands unopposed.
  state.phase = 'resolving';
  refresh();
  window.setTimeout(resolveRound, 350);
}

function useSurge() {
  if (state.phase !== 'awaitPlay' || state.screen !== 'table') return;
  if (state.surgeUsed) {
    state.message = 'Surge is spent — once per game.';
    refresh();
    return;
  }
  ensureAudio();
  state.surgeUsed = true;
  state.surgeActive = true;
  state.message = 'SURGE! Your chain doubles on the next clash.';
  surgeSound();
  refresh();
}

function confirm() {
  ensureAudio();
  if (state.screen === 'title') {
    startGame();
    return;
  }
  if (state.screen === 'win' || state.screen === 'loss') {
    state.gamesPlayed += 1;
    const keepSeed = state.seed + state.gamesPlayed;
    state = newGame(keepSeed);
    startGame();
  }
}

// Deterministic showcase states for screenshots: the same seed always
// renders the same table, so the screenshots reproduce exactly.
function applyShot(shotName) {
  if (shotName === 'title') {
    state.screen = 'title';
    renderTitle(app);
    return;
  }
  if (shotName === 'table') {
    state.screen = 'table';
    state.round = 4;
    state.score = 86;
    state.playerLife = 14;
    state.rivalLife = 11;
    state.ember = 5;
    state.rivalEmber = 4;
    state.chain = 3;
    state.bestChain = 3;
    state.lastSuit = 'flame';
    state.phase = 'awaitPlay';
    // The played cards leave the hands, exactly as a real round does, and
    // the clash line is computed from the cards on the table — never typed.
    const played = state.playerHand.find((c) => c.suit === 'flame' && c.power >= 6) || state.playerHand[0];
    state.playerHand = state.playerHand.filter((c) => c !== played);
    state.playerPlayed = played;
    const rivalCard = state.rivalHand.find((c) => c.suit === 'thorn') || state.rivalHand[0];
    state.rivalHand = state.rivalHand.filter((c) => c !== rivalCard);
    state.rivalPlayed = rivalCard;
    state.rivalCommitted = state.rivalHand.find((c) => c.suit === 'tide') || null;
    state.intentText = intentLine(state.rivalCommitted);
    state.lastResult = resolveClash(played, rivalCard, 3, false);
    state.message = clashLine(state.lastResult, played, rivalCard);
    refresh();
    return;
  }
  if (shotName === 'win') {
    state.screen = 'win';
    state.round = 8;
    state.score = 214;
    state.playerLife = 9;
    state.rivalLife = 0;
    state.bestChain = 4;
    state.phase = 'over';
    refresh();
    renderWin(app, state);
    return;
  }
  if (shotName === 'loss') {
    state.screen = 'loss';
    state.round = 7;
    state.score = 96;
    state.playerLife = 0;
    state.rivalLife = 7;
    state.bestChain = 3;
    state.phase = 'over';
    refresh();
    renderLoss(app, state);
  }
}

if (shot) {
  applyShot(shot);
} else {
  renderTitle(app);
}
bindInput({ playCard, endTurn, useSurge, confirm });

// Handle for play-testing from the console or a CDP eval script.
window.__ember = { getState: () => state, startGame, playCard, endTurn, useSurge, confirm };

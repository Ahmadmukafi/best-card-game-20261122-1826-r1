// render.js — everything the player sees: the table, the hands, the chain
// counter, and the title / victory / defeat screens. One job: turn the game
// state into DOM, and make cards slide, flip and snap with CSS classes.

import { SUITS } from './deck.js';
import { chainMultiplier } from './chain.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// One card, readable at thumbnail size: a big power numeral, the suit glyph
// top-left AND in the centre, the ember cost, and the card's name.
export function createCardElement(card, size) {
  const suit = SUITS[card.suit];
  const node = el('div', `card suit-${card.suit} ${size || ''}`);
  node.dataset.cardId = card.id;
  const top = el('div', 'card-top');
  top.appendChild(el('span', 'card-glyph', suit.glyph));
  top.appendChild(el('span', 'card-cost', `⬢${card.cost}`));
  node.appendChild(top);
  node.appendChild(el('div', 'card-power', String(card.power)));
  node.appendChild(el('div', 'card-center-glyph', suit.glyph));
  node.appendChild(el('div', 'card-name', card.name));
  node.appendChild(el('div', 'card-suit', suit.name.toUpperCase()));
  return node;
}

function heartRow(label, life, maxLife) {
  const row = el('div', 'life-row');
  row.appendChild(el('span', 'life-label', label));
  const hearts = el('span', 'life-hearts');
  for (let i = 0; i < maxLife; i++) {
    hearts.appendChild(el('span', i < life ? 'heart full' : 'heart empty', '♥'));
  }
  row.appendChild(hearts);
  row.appendChild(el('span', 'life-num', `${life}/${maxLife}`));
  return row;
}

function emberRow(ember, maxEmber) {
  const row = el('div', 'ember-row');
  row.appendChild(el('span', 'ember-label', 'EMBER'));
  const pips = el('span', 'ember-pips');
  for (let i = 0; i < maxEmber; i++) {
    pips.appendChild(el('span', i < ember ? 'ember-pip full' : 'ember-pip empty', '⬢'));
  }
  row.appendChild(pips);
  return row;
}

// Build the table skeleton once; renderTable(state) fills it in after that.
export function buildTable(root) {
  root.innerHTML = '';
  const table = el('div', 'table');

  const topbar = el('div', 'topbar');
  topbar.appendChild(el('div', 'brand', 'EMBER CHAIN'));
  const scoreBox = el('div', 'score-box');
  scoreBox.appendChild(el('span', 'score-label', 'SCORE'));
  scoreBox.appendChild(el('span', 'score-value', '0'));
  topbar.appendChild(scoreBox);
  const roundBox = el('div', 'round-box');
  roundBox.appendChild(el('span', 'round-label', 'ROUND'));
  roundBox.appendChild(el('span', 'round-value', '1'));
  topbar.appendChild(roundBox);
  topbar.appendChild(el('div', 'lives'));
  table.appendChild(topbar);

  const rivalZone = el('div', 'rival-zone');
  rivalZone.appendChild(el('div', 'zone-label', 'RIVAL — MARA THE EMBER WITCH'));
  rivalZone.appendChild(el('div', 'rival-hand'));
  rivalZone.appendChild(el('div', 'intent', ''));
  table.appendChild(rivalZone);

  const middle = el('div', 'middle');
  const clash = el('div', 'clash');
  const youSlot = el('div', 'clash-slot');
  youSlot.appendChild(el('div', 'slot-label', 'YOU PLAY'));
  youSlot.appendChild(el('div', 'slot-card'));
  clash.appendChild(youSlot);
  clash.appendChild(el('div', 'clash-vs', 'VS'));
  const rivalSlot = el('div', 'clash-slot');
  rivalSlot.appendChild(el('div', 'slot-label', 'RIVAL PLAYS'));
  rivalSlot.appendChild(el('div', 'slot-card'));
  clash.appendChild(rivalSlot);
  middle.appendChild(clash);
  const chainBox = el('div', 'chain-box');
  chainBox.appendChild(el('div', 'chain-label', 'CHAIN'));
  chainBox.appendChild(el('div', 'chain-value', '×1'));
  chainBox.appendChild(el('div', 'chain-hint', 'same suit in a row'));
  middle.appendChild(chainBox);
  table.appendChild(middle);

  const playerZone = el('div', 'player-zone');
  playerZone.appendChild(el('div', 'zone-label', 'YOUR HAND — click a card, or press 1–7'));
  playerZone.appendChild(el('div', 'player-hand'));
  table.appendChild(playerZone);

  const controls = el('div', 'controls');
  const surgeBtn = el('button', 'btn surge-btn', 'SURGE ×2  (S)');
  surgeBtn.id = 'surge-btn';
  const endBtn = el('button', 'btn end-btn', 'END TURN  (Space)');
  endBtn.id = 'end-btn';
  controls.appendChild(surgeBtn);
  controls.appendChild(endBtn);
  controls.appendChild(el('div', 'keys-hint', '1–7 play card · Space end turn · S surge · Enter start'));
  table.appendChild(controls);

  table.appendChild(el('div', 'message', ''));
  root.appendChild(table);

  const overlay = el('div', 'overlay hidden');
  overlay.id = 'overlay';
  root.appendChild(overlay);
  return table;
}

function fillHand(container, hand, size, playable, onPick) {
  container.innerHTML = '';
  hand.forEach((card, index) => {
    const node = createCardElement(card, size);
    node.style.setProperty('--deal-delay', `${index * 60}ms`);
    node.classList.add('dealt');
    if (playable) {
      node.classList.add('playable');
      node.tabIndex = 0;
      node.addEventListener('click', () => onPick(index));
      node.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick(index);
        }
      });
    }
    container.appendChild(node);
  });
}

function fillSlot(slot, card, winner) {
  slot.innerHTML = '';
  if (!card) {
    slot.appendChild(el('div', 'slot-empty', '—'));
    return;
  }
  const node = createCardElement(card, 'played');
  node.classList.add('played');
  if (winner) node.classList.add('clash-winner');
  slot.appendChild(node);
}

export function renderTable(root, state, onPick) {
  const table = root.querySelector('.table');
  table.querySelector('.score-value').textContent = String(state.score);
  table.querySelector('.round-value').textContent = String(state.round);
  const lives = table.querySelector('.lives');
  lives.innerHTML = '';
  lives.appendChild(heartRow('YOU', state.playerLife, state.maxLife));
  lives.appendChild(heartRow('RIVAL', state.rivalLife, state.maxLife));
  lives.appendChild(emberRow(state.ember, state.maxEmber));

  fillHand(table.querySelector('.rival-hand'), state.rivalHand, 'mini', false, onPick);
  const intent = table.querySelector('.intent');
  intent.textContent = state.intentText || '';
  intent.classList.toggle('visible', Boolean(state.intentText));

  fillSlot(
    table.querySelectorAll('.slot-card')[0],
    state.playerPlayed,
    state.lastResult ? state.lastResult.playerWins : false,
  );
  fillSlot(
    table.querySelectorAll('.slot-card')[1],
    state.rivalPlayed,
    state.lastResult ? !state.lastResult.playerWins && !state.lastResult.tied : false,
  );

  const chainValue = table.querySelector('.chain-value');
  chainValue.textContent = `×${chainMultiplier(state.chain)}`;
  const chainBox = table.querySelector('.chain-box');
  chainBox.classList.toggle('hot', state.chain >= 2);
  chainBox.classList.toggle('blazing', state.chain >= 4);
  table.querySelector('.chain-hint').textContent =
    state.chain >= 2
      ? `${state.chain} in a row — keep it alive!`
      : 'same suit in a row';

  const canPlay = state.phase === 'awaitPlay';
  fillHand(table.querySelector('.player-hand'), state.playerHand, '', canPlay, onPick);
  table.querySelectorAll('.player-hand .card').forEach((node, index) => {
    const card = state.playerHand[index];
    const affordable = card && card.cost <= state.ember;
    node.classList.toggle('unaffordable', canPlay && !affordable);
    if (canPlay && affordable) node.title = `Press ${index + 1} to play ${card.name}`;
  });

  const surgeBtn = table.querySelector('#surge-btn');
  surgeBtn.disabled = state.surgeUsed || !canPlay;
  surgeBtn.textContent = state.surgeUsed ? 'SURGE USED' : 'SURGE ×2  (S)';
  surgeBtn.classList.toggle('armed', state.surgeActive);
  const endBtn = table.querySelector('#end-btn');
  endBtn.disabled = !canPlay;

  table.querySelector('.message').textContent = state.message || '';
}

function suitLegend() {
  const legend = el('div', 'legend');
  for (const key of Object.keys(SUITS)) {
    const suit = SUITS[key];
    const item = el('div', `legend-item suit-${key}`);
    item.appendChild(el('span', 'legend-glyph', suit.glyph));
    const names = el('div', 'legend-names');
    names.appendChild(el('span', 'legend-suit', suit.name));
    names.appendChild(
      el('span', 'legend-beats', suit.beats ? `beats ${SUITS[suit.beats].name}` : 'neutral, unblockable'),
    );
    item.appendChild(names);
    legend.appendChild(item);
  }
  return legend;
}

export function renderTitle(root) {
  const overlay = root.querySelector('#overlay');
  overlay.className = 'overlay title-screen';
  overlay.innerHTML = '';
  overlay.appendChild(el('div', 'game-title', 'EMBER CHAIN'));
  overlay.appendChild(el('div', 'game-sub', 'A duel of ember and nerve in the arcane tavern'));
  overlay.appendChild(suitLegend());
  const rules = el('div', 'title-rules');
  rules.appendChild(el('p', '', 'Play cards of the same suit in a row to build the CHAIN — ×2, ×3, ×4… Break it and it resets.'));
  rules.appendChild(el('p', '', 'The rival announces the suit it charges before it plays. Counter it — or keep your chain alive.'));
  rules.appendChild(el('p', '', 'Once per game, SURGE doubles your chain. First to break the other mage wins.'));
  overlay.appendChild(rules);
  overlay.appendChild(el('div', 'press-start', 'PRESS ENTER OR CLICK TO PLAY'));
  overlay.appendChild(el('div', 'title-keys', '1–7 play card · Space end turn · S surge'));
}

export function renderWin(root, state) {
  const overlay = root.querySelector('#overlay');
  overlay.className = 'overlay win-screen';
  overlay.innerHTML = '';
  overlay.appendChild(el('div', 'burst', '✦'));
  overlay.appendChild(el('div', 'end-title', 'VICTORY'));
  overlay.appendChild(el('div', 'end-sub', 'The rival’s embers scatter across the table. The tavern is yours.'));
  overlay.appendChild(el('div', 'end-score', `FINAL SCORE  ${state.score}`));
  overlay.appendChild(el('div', 'end-detail', `Rounds played: ${state.round}  ·  Best chain: ×${state.bestChain}`));
  overlay.appendChild(el('div', 'press-start', 'PRESS ENTER TO PLAY AGAIN'));
}

export function renderLoss(root, state) {
  const overlay = root.querySelector('#overlay');
  overlay.className = 'overlay loss-screen';
  overlay.innerHTML = '';
  overlay.appendChild(el('div', 'burst dim', '✦'));
  overlay.appendChild(el('div', 'end-title', 'DEFEAT'));
  overlay.appendChild(el('div', 'end-sub', 'Your last ember gutters out. Mara the Ember Witch takes the table.'));
  overlay.appendChild(el('div', 'end-score', `FINAL SCORE  ${state.score}`));
  overlay.appendChild(el('div', 'end-detail', `Rounds played: ${state.round}  ·  Best chain: ×${state.bestChain}`));
  overlay.appendChild(el('div', 'press-start', 'PRESS ENTER TO TRY AGAIN'));
}

export function hideOverlay(root) {
  const overlay = root.querySelector('#overlay');
  overlay.className = 'overlay hidden';
  overlay.innerHTML = '';
}

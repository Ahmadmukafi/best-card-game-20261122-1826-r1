// input.js — keyboard and mouse for EMBER CHAIN. One job: turn keys and
// clicks into the game's verbs (play a card, end the turn, surge, start).

export function bindInput(handlers) {
  function onKey(event) {
    if (event.repeat) return;
    const key = event.key;
    if (key >= '1' && key <= '7') {
      handlers.playCard(Number(key) - 1);
      return;
    }
    if (key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      handlers.endTurn();
      return;
    }
    if (key === 's' || key === 'S') {
      handlers.useSurge();
      return;
    }
    if (key === 'Enter') {
      handlers.confirm();
    }
  }
  document.addEventListener('keydown', onKey);

  const surgeBtn = document.getElementById('surge-btn');
  if (surgeBtn) surgeBtn.addEventListener('click', () => handlers.useSurge());
  const endBtn = document.getElementById('end-btn');
  if (endBtn) endBtn.addEventListener('click', () => handlers.endTurn());
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.addEventListener('click', () => handlers.confirm());

  return function unbindInput() {
    document.removeEventListener('keydown', onKey);
  };
}

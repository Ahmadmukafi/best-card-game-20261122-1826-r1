# EMBER CHAIN — best-card-game-20261122-1826

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Ahmadmukafi/best-card-game-20261122-1826-r1/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Ahmadmukafi/best-card-game-20261122-1826-r1/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

**EMBER CHAIN** is an original duel card game for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826). Two ember-mages duel across an arcane-tavern table. Every card carries a cost in ember, a power, and one of four suits — Flame, Tide, Thorn, Stone — told apart by colour, shape and icon.

## The signature mechanic: CHAIN

Play cards of the same suit in a row and the chain multiplier grows — x2, x3, x4 — shown as one big glowing counter on the table. Break the chain and it resets to x1. Suits counter each other (Flame beats Thorn, Thorn beats Tide, Tide beats Flame; Stone is neutral but unblockable), and a once-per-game **Surge** doubles the chain. The rival announces the suit it is charging before it plays, so every hand is a readable decision: keep the chain alive, or break it to counter?

## How to play

- **Keyboard:** `1`–`7` play a hand card, `Space` ends the turn, `S` uses Surge, `Enter` starts or restarts.
- **Mouse:** click a card to play it, click **End Turn** to pass.
- Reduce the rival's life to 0 to win. Lose all your life and the tavern goes dark.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

`game/` is plain static files — no build step, no network request, no library.
Screenshots are deterministic: open `?shot=title|table|win|loss&seed=1`.

## License

MIT — see [LICENSE](LICENSE).

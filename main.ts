// EMBER CHAIN — entry program for best-card-game-20261122-1826.
// Node 22, standard library only. The game itself is game/: plain static files
// a desktop browser opens offline (game/index.html and its ES modules, no
// library, no network request). This program hands the entry in: it copies
// game/ and screenshots/ from beside this file into /output and writes
// /output/dossier.json with the vendored make.fun library, the summary the
// judge reads. Run it locally with MAKEFUN_OUTPUT_DIR set:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotDir = join(repoRoot, 'screenshots');
if (existsSync(shotDir)) cpSync(shotDir, join(outputDir, 'screenshots'), { recursive: true });

// The gate's own caps, from the kit's RULES.txt. Only text_max_bytes shapes the
// dossier's bytes; the other caps refuse an entry the scorer would refuse:
// more than 4 screenshots, or one over 256 KiB; more than 993 files in game/,
// or 48 MiB of game files in all; a path under game/ over 1000 bytes. game/
// counts beside /output's own 1000-entry cap, together with screenshots/ and
// dossier.json, so the dossier leaves them room.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

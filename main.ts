// A working gta6-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. Only the plumbing, not an open world: Block
// Dodger, a plain 2D canvas game where a paddle dodges falling blocks and catches coins, with a
// title screen, score, lives and levels, game over and restart, flat colours and no sound. Build
// This entry's game is Solara Bay: Neon Shores, an original open-world crime game built in
// game/ in the starter's place: a procedural coastal city explored on foot and by car, with
// traffic, pedestrians, stealable cars, a five-star wanted system with SBPD police response,
// a six-mission story with combat, a HUD with a live minimap, WebAudio-synthesised sound and
// localStorage saving. Its 4 screenshots live in screenshots/ (the first by name is the cover).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Agent-authored improvement over the starter: verify the screenshots exist before copying
// anything. The gate refuses an entry with no screenshots, and the starter would have copied
// an empty (or missing) folder in silence and handed in an entry that scores zero; failing
// loudly here, with the folder named, turns a wasted submission into a one-line fix.
const screenshotsDir = join(here, 'screenshots');
const screenshotFiles = existsSync(screenshotsDir)
  ? readdirSync(screenshotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name) && !name.startsWith('.'))
  : [];
if (screenshotFiles.length < 3) {
  throw new Error(`screenshots/ must hold 3 or 4 PNG or JPEG screenshots of the game; found ${screenshotFiles.length}. Take them with the game's ?shot= scenes before handing in.`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(screenshotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// pedestrians.js — the people of Solara Bay: office workers, surfers, tourists and joggers
// who stroll the sidewalks, chat in pairs, cross at corners, flee gunfire and car horns,
// drop cash when robbed, and remember being wronged long enough to matter to the police.
import { WORLD } from './config.js';
import { randRange, pick, chance } from './random.js';
import { isRoad, collideBuildings } from './world.js';

const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const SHIRTS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8', '#00b894', '#e17055', '#74b9ff', '#dfe6e9', '#fdcb6e'];
const NAMES = ['Maya', 'Dario', 'Ines', 'Kiko', 'Sari', 'Bruno', 'Lena', 'Tomas', 'Ayu', 'Rico', 'Nadia', 'Pablo', 'Sinta', 'Marco', 'Dewi', 'Leo'];

let nextPedId = 1;

export function createPedestrian(rng, x, y) {
  return {
    id: nextPedId++, x, y, angle: randRange(rng, 0, Math.PI * 2),
    speed: randRange(rng, 34, 62), health: 40, state: 'walk',
    name: pick(rng, NAMES), skin: pick(rng, SKIN), shirt: pick(rng, SHIRTS),
    wanderTimer: randRange(rng, 1, 5), fleeTimer: 0, downTimer: 0, cash: Math.floor(randRange(rng, 4, 42)),
    dead: false, isCop: false, isEnemy: false, targetX: x, targetY: y,
  };
}

/** A living population, denser near the beach and the Neon Strip. */
export function spawnPedestrians(G) {
  const peds = [];
  for (let i = 0; i < 64; i += 1) {
    const nearBeach = chance(G.rng, 0.35);
    const x = nearBeach ? randRange(G.rng, WORLD.beachX - 500, WORLD.beachX + 120) : randRange(G.rng, 60, WORLD.beachX - 60);
    const y = randRange(G.rng, 60, WORLD.size - 60);
    peds.push(createPedestrian(G.rng, x, y));
  }
  return peds;
}

function pickWanderTarget(G, ped) {
  // Sidewalk-ish wandering: step along the block edges, cross streets sometimes.
  const dx = randRange(G.rng, -260, 260);
  const dy = randRange(G.rng, -260, 260);
  ped.targetX = Math.max(30, Math.min(WORLD.size - 30, ped.x + dx));
  ped.targetY = Math.max(30, Math.min(WORLD.size - 30, ped.y + dy));
}

/** Advance one pedestrian: stroll, flee danger, fall, and (rarely) get back up. */
export function updatePedestrian(G, ped, dt) {
  if (ped.dead) return;
  if (ped.downTimer > 0) {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0 && ped.health > 0) ped.state = 'flee';
    return;
  }
  const danger = G.dangerAt(ped.x, ped.y);
  if (danger > 0) { ped.state = 'flee'; ped.fleeTimer = 1.6; }
  if (ped.fleeTimer > 0) ped.fleeTimer -= dt;
  else if (ped.state === 'flee') ped.state = 'walk';

  let tx; let ty; let speed = ped.speed;
  if (ped.state === 'flee') {
    const away = Math.atan2(ped.y - G.player.y, ped.x - G.player.x);
    tx = ped.x + Math.cos(away) * 120;
    ty = ped.y + Math.sin(away) * 120;
    speed = 148;
  } else {
    ped.wanderTimer -= dt;
    if (ped.wanderTimer <= 0 || Math.hypot(ped.targetX - ped.x, ped.targetY - ped.y) < 14) {
      pickWanderTarget(G, ped);
      ped.wanderTimer = randRange(G.rng, 3, 8);
    }
    tx = ped.targetX; ty = ped.targetY;
    // Prefer not to jaywalk through traffic: pause at the kerb when a car is close.
    if (isRoad(ped.x, ped.y)) speed *= 1.5;
  }
  const dx = tx - ped.x;
  const dy = ty - ped.y;
  const d = Math.hypot(dx, dy);
  if (d > 2) {
    ped.angle = Math.atan2(dy, dx);
    let nx = ped.x + (dx / d) * speed * dt;
    let ny = ped.y + (dy / d) * speed * dt;
    const fixed = collideBuildings(G.city.buildings, nx, ny, 9);
    nx = fixed.x; ny = fixed.y;
    ped.x = nx; ped.y = ny;
  }
}

/** Hurt a pedestrian: they fall, drop cash, and the law notices assaults. */
export function hurtPedestrian(G, ped, damage, sourceX, sourceY) {
  if (ped.dead) return;
  ped.health -= damage;
  ped.state = 'flee';
  ped.fleeTimer = 2.2;
  G.spawnParticles(ped.x, ped.y, 5, '#c0392b', 60, 0.35);
  if (ped.health <= 0) {
    ped.downTimer = 6;
    ped.health = 0;
    if (chance(G.rng, 0.5)) {
      ped.dead = true;
      G.dropCash(ped.x, ped.y, ped.cash);
    }
    if (!ped.isCop && !ped.isEnemy) G.addWantedHeat('assault', ped.x, ped.y);
  } else if (!ped.isCop && !ped.isEnemy && damage >= 10) {
    G.addWantedHeat('assault', ped.x, ped.y);
  }
  void sourceX; void sourceY;
}

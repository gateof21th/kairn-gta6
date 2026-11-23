// police.js — the Solara Bay Police Department: the wanted system and its response.
// Crimes witnessed near officers or reported by fleeing pedestrians add heat; heat becomes
// stars; stars bring patrol cars that ram and block, officers who chase on foot, and a bust
// meter that fills when they hold the player close. Lose sight, stay clean, and stars fade.
import { WORLD, WANTED } from './config.js';
import { randRange } from './random.js';
import { nearestRoadPoint, lineOfSight, collideBuildings } from './world.js';
import { createCar, damageCar } from './vehicles.js';

export const POLICE_COLOR = '#2d3e50';
export const POLICE_STRIPE = '#f5f6fa';

export function createWanted() {
  return { stars: 0, heat: 0, decayTimer: 0, seenTimer: 0, bust: 0, spawnTimer: 0 };
}

/** Add heat for a crime; converts to a star each full point. Called by every crime site. */
export function addWantedHeat(G, kind, x, y) {
  const w = G.wanted;
  // Crimes only count when someone could plausibly report them: a cop or ped within earshot,
  // or the player already on the radar.
  let witnessed = w.stars > 0;
  if (!witnessed) {
    for (const ped of G.peds) { if (!ped.dead && Math.hypot(ped.x - x, ped.y - y) < 210) { witnessed = true; break; } }
  }
  if (!witnessed) for (const cop of G.cops) { if (Math.hypot(cop.x - x, cop.y - y) < 320) { witnessed = true; break; } }
  if (!witnessed) return;
  w.heat += WANTED.heat[kind] || 1;
  while (w.heat >= 1 && w.stars < WANTED.maxStars) { w.stars += 1; w.heat -= 1; }
  if (w.stars >= WANTED.maxStars) w.heat = Math.min(w.heat, 0.9);
  w.decayTimer = 0;
  w.seenTimer = 2.5;
}

/** Create one police unit (car with an officer ready to step out) near a road point. */
export function spawnPoliceCar(G, x, y) {
  const spot = nearestRoadPoint(x, y);
  const car = createCar(G.rng, spot.x, spot.y, randRange(G.rng, 0, Math.PI * 2), 1, false);
  car.isPolice = true;
  car.model = { name: 'SBPD Interceptor', color: POLICE_COLOR, topSpeed: 330 + G.wanted.stars * 14, accel: 205, grip: 3.4 };
  car.health = 130;
  car.driver = { cop: true };
  G.cars.push(car);
  const officer = {
    id: 9000 + G.cops.length, x: spot.x + 16, y: spot.y + 16, angle: 0, speed: 150,
    health: 60, state: 'drive', name: 'Officer', skin: '#e0ac69', shirt: '#2d3e50',
    wanderTimer: 0, fleeTimer: 0, downTimer: 0, cash: 0, dead: false, isCop: true, isEnemy: false,
    car, shootTimer: randRange(G.rng, 0.6, 1.4), targetX: x, targetY: y,
  };
  G.cops.push(officer);
  return officer;
}

function desiredCopCount(G) {
  return [0, 1, 2, 3, 4, 6][G.wanted.stars] || 0;
}

/** Drive a police car toward the player, ram on contact, block ahead when close. */
export function updatePoliceCar(G, cop, dt) {
  const car = cop.car;
  if (!car || car.dead || car.isPlayer) { cop.state = 'foot'; return; }
  if (cop.state !== 'drive') return;
  const player = G.player;
  const dx = player.x - car.x;
  const dy = player.y - car.y;
  const dist = Math.hypot(dx, dy);
  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
  const top = car.model.topSpeed;
  let target = dist > 60 ? top : top * 0.4;
  if (Math.abs(diff) > 2.2) target = -top * 0.3; // reverse out of a bad angle
  car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), car.model.accel * dt);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = collideBuildings(G.city.buildings, nx, ny, 20);
  if (Math.abs(fixed.x - nx) > 0.5 || Math.abs(fixed.y - ny) > 0.5) car.speed *= -0.3;
  car.x = Math.max(24, Math.min(WORLD.size - 24, fixed.x));
  car.y = Math.max(24, Math.min(WORLD.size - 24, fixed.y));

  // Ram damage and the officer stepping out when the chase gets close and slow.
  if (player.inCar && dist < 40 && Math.abs(car.speed) > 80) {
    damageCar(G, player.car, 6);
    G.shake = Math.max(G.shake, 4);
    car.speed *= 0.6;
  }
  if (dist < 120 && (!player.inCar || Math.abs(player.car ? player.car.speed : 0) < 30)) {
    cop.state = 'foot';
    cop.x = car.x + 20; cop.y = car.y + 10;
    car.driver = null;
    car.parked = true;
  }
}

/** An officer on foot: close in, hold position, shoot at higher wanted levels. */
export function updatePoliceOfficer(G, cop, dt) {
  if (cop.dead || cop.downTimer > 0) { if (cop.downTimer > 0) cop.downTimer -= dt; return; }
  if (cop.state === 'drive') { updatePoliceCar(G, cop, dt); return; }
  const player = G.player;
  const dx = player.x - cop.x;
  const dy = player.y - cop.y;
  const dist = Math.hypot(dx, dy);
  cop.angle = Math.atan2(dy, dx);
  const hold = G.wanted.stars >= 3 ? 150 : 26;
  if (dist > hold) {
    const nx = cop.x + (dx / dist) * cop.speed * dt;
    const ny = cop.y + (dy / dist) * cop.speed * dt;
    const fixed = collideBuildings(G.city.buildings, nx, ny, 10);
    cop.x = fixed.x; cop.y = fixed.y;
  }
  if (G.wanted.stars >= 2 && dist < 330 && dist > 60) {
    cop.shootTimer -= dt;
    if (cop.shootTimer <= 0 && lineOfSight(G.city.buildings, cop.x, cop.y, player.x, player.y)) {
      cop.shootTimer = randRange(G.rng, 0.7, 1.5) - G.wanted.stars * 0.07;
      G.enemyShoot(cop, G.wanted.stars >= 4 ? 11 : 7);
    }
  }
  // Back into the car if the player drives away.
  if (cop.car && !cop.car.dead && player.inCar && dist > 260) {
    cop.state = 'drive';
    cop.car.parked = false;
    cop.car.driver = { cop: true };
  }
}

/**
 * The wanted system tick: spawn response, track line of sight, fill the bust meter when
 * officers hold the player, and decay stars when the player stays unseen and clean.
 */
export function updateWanted(G, dt) {
  const w = G.wanted;
  const player = G.player;
  if (w.stars <= 0) { w.bust = Math.max(0, w.bust - dt * 0.5); return; }

  w.spawnTimer -= dt;
  const wanted = desiredCopCount(G);
  const active = G.cops.filter((c) => !c.dead && c.downTimer <= 0).length;
  if (active < wanted && w.spawnTimer <= 0) {
    w.spawnTimer = 2.2;
    const angle = randRange(G.rng, 0, Math.PI * 2);
    const dist = randRange(G.rng, 460, 620);
    spawnPoliceCar(G, player.x + Math.cos(angle) * dist, player.y + Math.sin(angle) * dist);
  }

  let seen = false;
  let closeOfficers = 0;
  for (const cop of G.cops) {
    if (cop.dead) continue;
    const d = Math.hypot(cop.x - player.x, cop.y - player.y);
    if (d < 380 && lineOfSight(G.city.buildings, cop.x, cop.y, player.x, player.y)) seen = true;
    if (cop.state === 'foot' && d < 64) closeOfficers += 1;
  }
  if (seen) { w.seenTimer = 2.5; w.decayTimer = 0; }
  else if (w.seenTimer > 0) w.seenTimer -= dt;

  const playerSpeed = player.inCar && player.car ? Math.abs(player.car.speed) : (player.moving ? 150 : 0);
  if (closeOfficers > 0 && playerSpeed < 60) {
    w.bust += dt * (0.34 + closeOfficers * 0.16);
    if (w.bust >= 1) { G.onBusted(); return; }
  } else {
    w.bust = Math.max(0, w.bust - dt * 0.45);
  }

  if (w.seenTimer <= 0) {
    w.decayTimer += dt;
    if (w.decayTimer >= WANTED.decaySeconds) {
      w.decayTimer = 0;
      w.stars -= 1;
      w.heat = 0;
      if (w.stars <= 0) {
        G.cops.length = 0;
        G.cars = G.cars.filter((c) => !c.isPolice);
        G.notify('You lost the SBPD. Lay low, Rafi.');
      }
    }
  }
  for (const cop of G.cops) updatePoliceOfficer(G, cop, dt);
}

// combat.js — fists, guns and consequences: player shooting with mouse aim, enemy and
// police fire, bullets that respect buildings, hit reactions, dropped cash and explosions.
// Every shot fired near witnesses feeds the wanted system, so combat is never free.
import { WEAPONS } from './config.js';
import { randRange, pick } from './random.js';
import { lineOfSight, collideBuildings } from './world.js';
import { hurtPedestrian } from './pedestrians.js';
import { damageCar } from './vehicles.js';

export function createCombat() {
  return { bullets: [], cooldown: 0, muzzle: 0, shells: 0 };
}

const ENEMY_SHIRTS = ['#6c3483', '#943126', '#1a5276', '#7d6608'];

/** Spawn a wave of Cannery Kings at a point: armed pedestrians who hunt the player. */
export function spawnEnemies(G, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    G.enemies.push({
      id: 5000 + G.enemies.length + i, x: x + Math.cos(angle) * randRange(G.rng, 40, 110), y: y + Math.sin(angle) * randRange(G.rng, 40, 110),
      angle: 0, speed: randRange(G.rng, 96, 122), health: 55, state: 'hunt', name: 'Cannery King',
      skin: pick(G.rng, ['#f1c27d', '#c68642', '#8d5524']), shirt: pick(G.rng, ENEMY_SHIRTS),
      wanderTimer: 0, fleeTimer: 0, downTimer: 0, cash: Math.floor(randRange(G.rng, 18, 60)), dead: false,
      isCop: false, isEnemy: true, shootTimer: randRange(G.rng, 0.5, 1.6), strafe: pick(G.rng, [-1, 1]), targetX: x, targetY: y,
    });
  }
}

/** Fire one bullet from (x, y) toward angle; `from` is 'player', 'enemy' or 'cop'. */
export function fireBullet(G, x, y, angle, weapon, from) {
  const speed = 860;
  G.combat.bullets.push({
    x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    life: weapon.range / speed, damage: weapon.damage, from,
  });
}

/** An NPC shoots at the player with skill-based inaccuracy. */
export function enemyShoot(G, shooter, damage) {
  const player = G.player;
  const base = Math.atan2(player.y - shooter.y, player.x - shooter.x);
  const miss = randRange(G.rng, -0.16, 0.16);
  fireBullet(G, shooter.x, shooter.y, base + miss, { range: 360, damage }, shooter.isCop ? 'cop' : 'enemy');
  G.audio.gunshot(true);
  G.spawnParticles(shooter.x + Math.cos(base) * 16, shooter.y + Math.sin(base) * 16, 2, '#ffd166', 40, 0.08);
}

/** Player attack: mouse aim, weapon cooldowns, melee arc, recoil shake and heat. */
export function updatePlayerCombat(G, dt) {
  const c = G.combat;
  c.cooldown -= dt;
  if (c.muzzle > 0) c.muzzle -= dt;
  const player = G.player;
  if (player.inCar) return;
  const weapon = WEAPONS[player.weapon];
  const aim = Math.atan2(G.mouseWorld.y - player.y, G.mouseWorld.x - player.x);
  player.angle = aim;
  const wantsFire = G.input.mouse.down;
  if (!wantsFire || c.cooldown > 0) return;
  if (!weapon.auto && c.firedThisPress) return;
  c.firedThisPress = true;
  c.cooldown = weapon.cooldown;

  if (weapon.pellets === 0) {
    // Fists: a short arc in front of the player.
    G.audio.punch();
    let hit = false;
    const targets = [...G.peds, ...G.enemies, ...G.cops];
    for (const t of targets) {
      if (t.dead || t.downTimer > 0) continue;
      const d = Math.hypot(t.x - player.x, t.y - player.y);
      if (d < weapon.range + 10) { hurtPedestrian(G, t, weapon.damage, player.x, player.y); hit = true; }
    }
    for (const car of G.cars) {
      if (!car.dead && Math.hypot(car.x - player.x, car.y - player.y) < weapon.range + 22) { damageCar(G, car, 4); hit = true; }
    }
    if (hit) G.shake = Math.max(G.shake, 1.5);
    return;
  }

  for (let p = 0; p < weapon.pellets; p += 1) {
    const spread = randRange(G.rng, -weapon.spread, weapon.spread);
    fireBullet(G, player.x + Math.cos(aim) * 16, player.y + Math.sin(aim) * 16, aim + spread, weapon, 'player');
  }
  c.muzzle = 0.05;
  G.shake = Math.max(G.shake, weapon.kick * 0.5);
  if (player.weapon === 3) G.audio.shotgun(); else G.audio.gunshot(weapon.auto);
  G.addWantedHeat('shot', player.x, player.y);
  for (const car of G.cars) if (!car.isPolice && Math.hypot(car.x - player.x, car.y - player.y) < 200) car.panic = 2;
}

/** Enemy brains: close to range, strafe, fire in bursts, fall and drop cash. */
export function updateEnemies(G, dt) {
  const player = G.player;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.downTimer > 0) { e.downTimer -= dt; continue; }
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    e.angle = Math.atan2(dy, dx);
    const want = player.inCar ? 210 : 165;
    if (dist > want + 24 || !lineOfSight(G.city.buildings, e.x, e.y, player.x, player.y)) {
      const nx = e.x + (dx / (dist || 1)) * e.speed * dt;
      const ny = e.y + (dy / (dist || 1)) * e.speed * dt;
      const fixed = collideBuildings(G.city.buildings, nx, ny, 10);
      e.x = fixed.x; e.y = fixed.y;
    } else {
      // Strafe sideways to feel alive, flipping direction now and then.
      if (Math.random() < dt * 0.4) e.strafe *= -1;
      const px = -Math.sin(e.angle) * e.strafe;
      const py = Math.cos(e.angle) * e.strafe;
      const fixed = collideBuildings(G.city.buildings, e.x + px * 44 * dt, e.y + py * 44 * dt, 10);
      e.x = fixed.x; e.y = fixed.y;
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 360) {
        e.shootTimer = randRange(G.rng, 0.55, 1.3);
        enemyShoot(G, e, 8);
      }
    }
  }
  G.enemies = G.enemies.filter((e) => !e.dead || e.downTimer > -8);
}

/** Bullet flight and every impact: buildings stop shots, cars dent, people fall. */
export function updateBullets(G, dt) {
  const bullets = G.combat.bullets;
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let spent = b.life <= 0;

    for (const bd of G.city.buildings) {
      if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) {
        G.spawnParticles(b.x, b.y, 2, '#d8cfc0', 40, 0.2);
        spent = true;
        break;
      }
    }
    if (!spent) {
      for (const car of G.cars) {
        if (car.dead) continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < 24) {
          damageCar(G, car, b.damage);
          if (b.from === 'player' && car.isPolice) G.addWantedHeat('copHit', b.x, b.y);
          spent = true;
          break;
        }
      }
    }
    if (!spent && b.from !== 'player') {
      const p = G.player;
      const target = p.inCar && p.car ? p.car : p;
      const r = p.inCar ? 24 : 12;
      if (Math.hypot(target.x - b.x, target.y - b.y) < r) {
        if (p.inCar && p.car) damageCar(G, p.car, b.damage * 0.7);
        G.hurtPlayer(b.damage, b.x, b.y);
        spent = true;
      }
    }
    if (!spent && b.from === 'player') {
      const targets = [...G.enemies, ...G.cops, ...G.peds];
      for (const t of targets) {
        if (t.dead || t.downTimer > 0) continue;
        if (Math.hypot(t.x - b.x, t.y - b.y) < 12) {
          if (t.isCop) G.addWantedHeat('copHit', b.x, b.y);
          hurtPedestrian(G, t, b.damage, G.player.x, G.player.y);
          spent = true;
          break;
        }
      }
    }
    if (spent) bullets.splice(i, 1);
  }
}

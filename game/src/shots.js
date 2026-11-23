// shots.js — deterministic screenshot scenes behind ?shot=<scene>&seed=<n>.
// Each scene builds the real game world from the seed, then stages a genuine moment with
// the real systems (traffic, pedestrians, police, missions, combat) and lets the normal
// renderer and HUD draw it. Nothing is composited: what the screenshot shows is the game.
import { PLACES, startMission } from './missions.js';
import { spawnPoliceCar } from './police.js';
import { nearestCar } from './vehicles.js';

/** Put the player in the nearest car (or a given one) the way the F key would. */
function putInCar(G, car, speed) {
  car.isPlayer = true;
  car.driver = { player: true };
  car.parked = false;
  G.player.inCar = true;
  G.player.car = car;
  G.player.x = car.x;
  G.player.y = car.y;
  car.speed = speed;
}

/** Run the live simulation briefly so traffic, people and lights settle naturally. */
function settle(G, seconds) {
  const step = 1 / 30;
  for (let t = 0; t < seconds; t += step) G.simulate(step, true);
}

export function stageShot(G, name) {
  const maya = PLACES.mayaCorner;
  if (name === 'driving') {
    // Behind the wheel of a red Cielo Coupe on a busy avenue, traffic all around.
    G.player.x = 1660; G.player.y = 1410;
    const car = nearestCar(G, G.player.x, G.player.y, 900);
    if (car) { car.x = G.player.x; car.y = G.player.y; car.angle = 0; putInCar(G, car, 190); }
    G.say('Maya Sol', 'Port Azul garage, Rafi — and try to bring it back in one piece.');
    G.mission.offered = true;
    settle(G, 1.2);
    // Whatever traffic did during the settle, the cover moment is at speed.
    if (G.player.car) { G.player.car.speed = 218; G.player.x = G.player.car.x; G.player.y = G.player.car.y; }
    return;
  }
  if (name === 'chase') {
    // Four stars: SBPD interceptors closing in during the Cannery Kings escape stage.
    startMission(G, 1);
    G.mission.active.stageIndex = 2;
    G.player.x = 1500; G.player.y = 1750;
    const car = nearestCar(G, G.player.x, G.player.y, 900);
    if (car) { car.x = G.player.x; car.y = G.player.y; car.angle = -0.5; putInCar(G, car, 230); }
    G.wanted.stars = 4;
    G.wanted.seenTimer = 3;
    G.wanted.bust = 0.35;
    spawnPoliceCar(G, G.player.x - 190, G.player.y + 90);
    spawnPoliceCar(G, G.player.x - 320, G.player.y - 130);
    spawnPoliceCar(G, G.player.x + 260, G.player.y + 190);
    for (const cop of G.cops) { cop.state = 'drive'; }
    G.say('Vex Marlowe', 'Kings — he is running for the safehouse! Cut him off!');
    settle(G, 0.8);
    return;
  }
  if (name === 'combat') {
    // The Old Cannery shootout: Kings closing in, tracers in the air, two stars up.
    startMission(G, 1);
    G.mission.active.stageIndex = 1;
    const at = PLACES.cannery;
    G.player.x = at.x + 30; G.player.y = at.y + 66;
    G.player.weapon = 2;
    G.spawnEnemies(at.x, at.y, 4);
    G.wanted.stars = 2;
    G.wanted.seenTimer = 3;
    spawnPoliceCar(G, at.x - 330, at.y - 220);
    G.say('Vex Marlowe', 'You picked the wrong crew to rob, Vale!');
    settle(G, 0.6);
    // A live exchange of fire, frozen mid-burst for the camera.
    const enemy = G.enemies[0];
    if (enemy) {
      G.combat.muzzle = 0.06;
      G.player.angle = Math.atan2(enemy.y - G.player.y, enemy.x - G.player.x);
      for (let i = 0; i < 3; i += 1) {
        G.combat.bullets.push({ x: G.player.x + Math.cos(G.player.angle) * (30 + i * 26), y: G.player.y + Math.sin(G.player.angle) * (30 + i * 26), vx: Math.cos(G.player.angle) * 860, vy: Math.sin(G.player.angle) * 860, life: 0.4, damage: 13, from: 'player' });
      }
      G.spawnParticles(enemy.x, enemy.y, 6, '#ffb347', 70, 0.4);
    }
    return;
  }
  // Cover (default): on foot on the Neon Strip at golden hour, Maya's first job waiting,
  // traffic rolling past, the minimap and HUD alive with the whole city.
  G.player.x = maya.x - 36;
  G.player.y = maya.y + 52;
  G.player.angle = -0.7;
  G.say('Maya Sol', 'Rafi Vale. You owe half the bay — lucky for you, I have work.');
  settle(G, 1.4);
}

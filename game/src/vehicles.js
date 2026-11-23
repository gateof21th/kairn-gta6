// vehicles.js — every car in Solara Bay: parked cars, moving traffic and the player's ride.
// Traffic follows the road grid, keeps to its lane, slows for the car ahead, turns at
// intersections and panics when shots are fired nearby. Cars take damage, smoke, burn and
// can be stolen: walk up, press F, and the car (and its wanted consequences) are yours.
import { WORLD, VEHICLE_MODELS } from './config.js';
import { randRange, pick, chance } from './random.js';
import { isRoad, collideBuildings } from './world.js';

let nextCarId = 1;

export function createCar(rng, x, y, angle, modelIndex, parked) {
  const model = VEHICLE_MODELS[modelIndex % VEHICLE_MODELS.length];
  return {
    id: nextCarId++, x, y, angle, speed: 0,
    model, modelIndex, parked: !!parked,
    health: 100, driver: null, isPlayer: false, isPolice: false,
    dirX: Math.cos(angle), dirY: Math.sin(angle),
    turnTimer: randRange(rng, 1, 4), panic: 0, honk: 0, dead: false, fire: 0,
    width: 44, length: 24, steer: 0,
  };
}

/** Lane offset for right-hand traffic, given a heading angle snapped to the grid. */
function laneOffset(angle) {
  return { x: Math.cos(angle + Math.PI / 2) * 16, y: Math.sin(angle + Math.PI / 2) * 16 };
}

/** Spawn the ambient traffic and parked cars that make the city feel lived in. */
export function spawnTraffic(G) {
  const cars = [];
  for (let i = 0; i < 46; i += 1) {
    const horizontal = chance(G.rng, 0.5);
    const laneLine = Math.floor(randRange(G.rng, 0, WORLD.size / WORLD.cell)) * WORLD.cell + WORLD.road / 2;
    const along = randRange(G.rng, 60, WORLD.size - 60);
    const angle = horizontal ? (chance(G.rng, 0.5) ? 0 : Math.PI) : (chance(G.rng, 0.5) ? Math.PI / 2 : -Math.PI / 2);
    const off = laneOffset(angle);
    const x = horizontal ? along : laneLine + off.x;
    const y = horizontal ? laneLine + off.y : along;
    if (x >= WORLD.beachX - 40) continue;
    const car = createCar(G.rng, x, y, angle, Math.floor(randRange(G.rng, 0, VEHICLE_MODELS.length)), false);
    car.speed = randRange(G.rng, 60, 120);
    car.driver = { civilian: true };
    cars.push(car);
  }
  for (let i = 0; i < 30; i += 1) {
    const x = randRange(G.rng, 80, WORLD.beachX - 80);
    const y = randRange(G.rng, 80, WORLD.size - 80);
    if (isRoad(x, y)) continue;
    const car = createCar(G.rng, x, y, chance(G.rng, 0.5) ? 0 : Math.PI / 2, Math.floor(randRange(G.rng, 0, VEHICLE_MODELS.length)), true);
    cars.push(car);
  }
  return cars;
}

function snapTurn(car, rng) {
  // At an intersection, sometimes pick a new grid heading.
  const headings = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  if (chance(rng, 0.45)) car.angle = pick(rng, headings);
}

/** Advance one traffic car: follow its lane, brake for obstacles, turn at junctions. */
export function updateTrafficCar(G, car, dt) {
  if (car.isPlayer || car.isPolice || car.parked || car.dead) return;
  if (car.panic > 0) car.panic -= dt;
  const model = car.model;
  let target = car.panic > 0 ? model.topSpeed * 0.8 : randRange(G.rng, 105, 135);

  // Brake for a car or the player ahead.
  const aheadX = car.x + Math.cos(car.angle) * 58;
  const aheadY = car.y + Math.sin(car.angle) * 58;
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    if (Math.hypot(other.x - aheadX, other.y - aheadY) < 30) { target = 0; break; }
  }
  if (!G.player.inCar && Math.hypot(G.player.x - aheadX, G.player.y - aheadY) < 26) {
    target = 0;
    if (car.honk <= 0) { car.honk = randRange(G.rng, 2, 6); G.audio.carHorn(); }
  }
  if (car.honk > 0) car.honk -= dt;

  car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), model.accel * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  // Stay in lane: ease back toward the centre line of the current road.
  const mx = car.x % WORLD.cell;
  const my = car.y % WORLD.cell;
  const horizontal = Math.abs(Math.cos(car.angle)) > 0.5;
  if (horizontal && my > WORLD.road) car.y -= (my - WORLD.road / 2) * dt * 0.6;
  if (!horizontal && mx > WORLD.road) car.x -= (mx - WORLD.road / 2) * dt * 0.6;

  // Intersection? Both coordinates inside road strips means a junction.
  if (mx < WORLD.road && my < WORLD.road) {
    car.turnTimer -= dt;
    if (car.turnTimer <= 0) { snapTurn(car, G.rng); car.turnTimer = randRange(G.rng, 0.4, 1.2); }
  }
  // World edges: turn around rather than leave Solara Bay.
  if (car.x < 40 || car.x > WORLD.beachX - 30 || car.y < 40 || car.y > WORLD.size - 40) {
    car.angle += Math.PI;
    car.x = Math.max(40, Math.min(WORLD.beachX - 30, car.x));
    car.y = Math.max(40, Math.min(WORLD.size - 40, car.y));
  }
  if (car.health < 35 && G.time % 0.12 < dt) {
    G.spawnParticles(car.x, car.y - 6, 1, '#555', 30, 0.5);
  }
  if (car.health <= 0 && !car.dead) destroyCar(G, car);
}

/** Player driving physics: arcade acceleration, steering, handbrake drift and collisions. */
export function updatePlayerCar(G, car, dt) {
  const input = G.input;
  const model = car.model;
  const axis = input.moveAxis();
  const throttle = -axis.y; // W is forward
  if (throttle > 0) car.speed += model.accel * dt;
  else if (throttle < 0) car.speed -= (car.speed > 4 ? 260 : 120) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 42 * dt);
  if (input.brake()) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 340 * dt);
  car.speed = Math.max(-model.topSpeed * 0.38, Math.min(model.topSpeed, car.speed));

  const steerInput = axis.x;
  const speedRatio = car.speed / model.topSpeed;
  if (Math.abs(car.speed) > 2) {
    const drift = input.brake() ? 1.7 : 1;
    car.angle += steerInput * model.grip * drift * dt * Math.sign(car.speed) * (0.35 + 0.65 * Math.min(1, Math.abs(speedRatio) * 1.6));
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = collideBuildings(G.city.buildings, nx, ny, 20);
  if (Math.abs(fixed.x - nx) > 0.5 || Math.abs(fixed.y - ny) > 0.5) {
    if (Math.abs(car.speed) > 130) { damageCar(G, car, 9); G.audio.hurt(); G.shake = Math.min(9, Math.abs(car.speed) / 30); }
    car.speed *= -0.25;
  }
  car.x = Math.max(24, Math.min(WORLD.size - 24, fixed.x));
  car.y = Math.max(24, Math.min(WORLD.size - 24, fixed.y));
  G.player.x = car.x;
  G.player.y = car.y;
  G.player.angle = car.angle;

  // Running into people and cars has consequences handled by the caller via speed.
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 36 && d > 0) {
      other.x += ((other.x - car.x) / d) * (36 - d);
      other.y += ((other.y - car.y) / d) * (36 - d);
      if (Math.abs(car.speed) > 90) { damageCar(G, other, 12); damageCar(G, car, 5); G.shake = 5; }
      car.speed *= 0.72;
    }
  }
  if (car.health < 35 && G.time % 0.1 < dt) G.spawnParticles(car.x, car.y - 8, 1, '#444', 26, 0.6);
  if (car.health <= 0 && !car.dead) destroyCar(G, car);
  G.audio.setEngine(speedRatio);
}

export function damageCar(G, car, amount) {
  car.health -= amount;
  G.spawnParticles(car.x, car.y, 4, '#ffb347', 60, 0.3);
  if (car.health <= 0 && !car.dead) destroyCar(G, car);
}

export function destroyCar(G, car) {
  car.dead = true;
  car.fire = 2.5;
  car.speed = 0;
  G.spawnParticles(car.x, car.y, 26, '#ff7b2f', 130, 0.8);
  G.spawnParticles(car.x, car.y, 16, '#333', 70, 1.1);
  G.audio.explosion();
  G.shake = Math.max(G.shake, 8);
  if (Math.hypot(G.player.x - car.x, G.player.y - car.y) < 90 && !G.player.inCar) G.hurtPlayer(16, car.x, car.y);
  G.addWantedHeat('explosion', car.x, car.y);
  if (car.isPlayer) G.exitCar(true);
}

/** The nearest stealable car to a point, or null. */
export function nearestCar(G, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

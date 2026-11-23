// main.js — boot, the game loop and the glue between every system.
// Owns the shared game state G that the modules read and write: the player (on foot and
// driving), the wanted level, cash, weapons, dialogue, notifications, particles, saving
// to localStorage, the camera, and the screens (title, play, paused, wasted, busted).
// ?shot=<scene>&seed=<n> stages a deterministic screenshot scene instead of the loop.
import { WORLD, PLAYER, WEAPONS, SAVE_KEY, GAME_TITLE } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_INTERACT, ACTION_WEAPON_NEXT, ACTION_RESTART } from './input.js';
import { createAudio } from './audio.js';
import { generateCity, updatePickups, collideBuildings, districtAt } from './world.js';
import { spawnTraffic, updateTrafficCar, updatePlayerCar, nearestCar, createCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrian } from './pedestrians.js';
import { createWanted, addWantedHeat, updateWanted } from './police.js';
import { createMissionState, updateMissions, currentTarget, currentObjective, startOddJob, CHARACTERS } from './missions.js';
import { createCombat, spawnEnemies, enemyShoot, updatePlayerCombat, updateEnemies, updateBullets } from './combat.js';
import { createRenderer } from './render.js';
import { drawHud, drawMenu } from './hud.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261123;

const canvas = document.getElementById('game');
const status = document.getElementById('status');

function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function buildGame(saved) {
  const rng = createRandom(seed);
  const city = generateCity(rng);
  const G = {
    rng, city, time: 0, screen: 'title', shotMode: !!shotName, shotCruise: false,
    camera: { x: city.safehouse.x, y: city.safehouse.y },
    shake: 0, hurtFlash: 0,
    input: null, audio: createAudio(), mouseWorld: { x: 0, y: 0 },
    player: {
      x: city.safehouse.x + 30, y: city.safehouse.y + 44, angle: 0.6,
      health: PLAYER.health, armor: PLAYER.armor, radius: PLAYER.radius,
      inCar: false, car: null, weapon: 0, moving: false,
      skin: '#c68642', shirt: '#00b894', name: 'Rafi Vale',
      dead: false, downTimer: 0, isCop: false, isEnemy: false,
    },
    cars: [], peds: [], cops: [], enemies: [], cashDrops: [],
    combat: createCombat(), wanted: createWanted(), mission: createMissionState(),
    missionCar: null, cash: 120, dialogue: null, sayQueue: [], notifications: [],
    particles: [], prompt: '', danger: { x: 0, y: 0, timer: 0 },
    stats: { missionsDone: 0, faresDone: 0, carsStolen: 0, playTime: 0 },
    ownedWeapons: [true, false, false, false],
    hasSave: !!saved,
  };
  if (saved) {
    G.cash = saved.cash ?? G.cash;
    G.mission.index = saved.missionIndex ?? 0;
    G.mission.complete = !!saved.complete;
    G.stats = { ...G.stats, ...(saved.stats || {}) };
    if (Array.isArray(saved.ownedWeapons)) G.ownedWeapons = saved.ownedWeapons;
    if (saved.weapon && G.ownedWeapons[saved.weapon]) G.player.weapon = saved.weapon;
  }
  G.cars = spawnTraffic(G);
  G.peds = spawnPedestrians(G);

  // ---- shared services the modules call back through G ----
  G.spawnParticles = (x, y, count, color, speed, life) => {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.5 + Math.random()), maxLife: life, color, size: 2 + Math.random() * 3.4 });
    }
    if (G.particles.length > 420) G.particles.splice(0, G.particles.length - 420);
  };
  G.notify = (text) => {
    G.notifications.push({ text, life: 4.2 });
    if (G.notifications.length > 4) G.notifications.shift();
    status.textContent = text;
  };
  G.say = (speaker, text) => {
    const known = Object.values(CHARACTERS).find((c) => c.name === speaker);
    G.sayQueue.push({ speaker, text, color: known ? known.color : '#fff' });
  };
  G.earnCash = (amount) => { G.cash += amount; };
  G.dropCash = (x, y, amount) => { if (amount > 0) G.cashDrops.push({ x, y, amount, life: 26 }); };
  G.addWantedHeat = (kind, x, y) => {
    addWantedHeat(G, kind, x, y);
    if (kind === 'shot' || kind === 'explosion') { G.danger.x = x; G.danger.y = y; G.danger.timer = 1.4; }
  };
  G.dangerAt = (x, y) => (G.danger.timer > 0 && Math.hypot(x - G.danger.x, y - G.danger.y) < 250 ? 1 : 0);
  G.enemyShoot = (shooter, damage) => enemyShoot(G, shooter, damage);
  G.spawnEnemies = (x, y, count) => spawnEnemies(G, x, y, count);
  G.currentTarget = () => currentTarget(G);
  G.currentObjective = () => currentObjective(G);
  G.hurtPlayer = (damage, sx, sy) => {
    const p = G.player;
    if (G.screen !== 'play' && !G.shotMode) return;
    const absorbed = Math.min(p.armor, damage * 0.6);
    p.armor -= absorbed;
    p.health -= damage - absorbed;
    G.hurtFlash = 0.5;
    G.shake = Math.max(G.shake, 3);
    G.audio.hurt();
    G.spawnParticles(p.x, p.y, 4, '#c0392b', 60, 0.3);
    void sx; void sy;
    if (p.health <= 0 && G.screen === 'play') {
      p.health = 0;
      G.screen = 'wasted';
      G.audio.missionFail();
      status.textContent = 'Wasted.';
    }
  };
  G.onBusted = () => {
    if (G.screen !== 'play') return;
    G.screen = 'busted';
    G.audio.busted();
    status.textContent = 'Busted.';
  };
  G.exitCar = (forced) => {
    const p = G.player;
    if (!p.car) return;
    const car = p.car;
    car.isPlayer = false;
    car.driver = null;
    if (!car.dead) car.parked = true;
    p.inCar = false;
    p.car = null;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 26;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 26;
    const fixed = collideBuildings(G.city.buildings, p.x, p.y, p.radius);
    p.x = fixed.x; p.y = fixed.y;
    G.audio.setEngine(0);
    if (!forced) G.audio.carDoor();
  };
  G.spawnMissionCar = (at) => {
    const car = createCar(G.rng, at.x + 30, at.y + 20, 0, 4, true);
    car.model = { name: 'Vesper GT', color: '#8e44ad', topSpeed: 392, accel: 265, grip: 3.9 };
    G.cars.push(car);
    G.missionCar = car;
  };
  G.saveGame = () => {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: G.cash, missionIndex: G.mission.index, complete: G.mission.complete,
        weapon: G.player.weapon, ownedWeapons: G.ownedWeapons, stats: G.stats,
      }));
      G.hasSave = true;
    } catch { /* storage off: the run lasts this visit only */ }
  };
  G.simulate = (dt, autopilot) => simulate(G, dt, autopilot);
  return G;
}

function enterCar(G, car) {
  const p = G.player;
  const wasDriven = !!car.driver && !car.parked;
  if (car.driver && car.driver.civilian) {
    // Carjacking: the driver bails out and runs, and the law takes an interest.
    const driver = { id: 7000 + Math.floor(Math.random() * 900), x: car.x - 18, y: car.y + 14, angle: 0, speed: 60, health: 40, state: 'flee', name: 'Driver', skin: '#f1c27d', shirt: '#74b9ff', wanderTimer: 0, fleeTimer: 3, downTimer: 0, cash: 12, dead: false, isCop: false, isEnemy: false, targetX: car.x, targetY: car.y };
    G.peds.push(driver);
    G.addWantedHeat('carjack', car.x, car.y);
  }
  if (car.isPolice) G.addWantedHeat('carjack', car.x, car.y);
  car.driver = { player: true };
  car.isPlayer = true;
  car.parked = false;
  p.inCar = true;
  p.car = car;
  p.x = car.x; p.y = car.y;
  G.stats.carsStolen += wasDriven || car.isPolice ? 1 : 0;
  G.audio.carDoor();
  G.notify(`Driving the ${car.model.name}`);
}

function updatePlayerOnFoot(G, dt) {
  const p = G.player;
  const input = G.input;
  const axis = input.moveAxis();
  const len = Math.hypot(axis.x, axis.y);
  p.moving = len > 0;
  if (len > 0) {
    const speed = input.sprint() ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const nx = p.x + (axis.x / len) * speed * dt;
    const ny = p.y + (axis.y / len) * speed * dt;
    const fixed = collideBuildings(G.city.buildings, nx, ny, p.radius);
    p.x = Math.max(16, Math.min(WORLD.size - 16, fixed.x));
    p.y = Math.max(16, Math.min(WORLD.size - 16, fixed.y));
    if (!input.mouse.down) p.angle = Math.atan2(axis.y, axis.x);
  }
  // Traffic is dangerous: a fast car clips the player.
  for (const car of G.cars) {
    if (car.dead || car.isPlayer) continue;
    if (Math.abs(car.speed) > 120 && Math.hypot(car.x - p.x, car.y - p.y) < 24) {
      G.hurtPlayer(14, car.x, car.y);
      p.x += Math.cos(car.angle) * 22;
      p.y += Math.sin(car.angle) * 22;
      car.speed *= 0.5;
    }
  }
}

function updateInteractions(G) {
  const p = G.player;
  G.prompt = '';
  if (p.inCar) {
    G.prompt = 'F — get out';
    return;
  }
  const car = nearestCar(G, p.x, p.y, 48);
  if (car) G.prompt = car.driver ? `F — steal the ${car.model.name}` : `F — drive the ${car.model.name}`;
  if (G.mission.complete && !G.mission.active && !G.mission.oddJob) {
    const spots = [G.city.safehouse, G.city.garage];
    for (const s of spots) if (Math.hypot(p.x - s.x, p.y - s.y) < 54) G.prompt = 'F — take an odd job (fare)';
  }
}

function applyPickups(G) {
  const p = G.player;
  if (p.inCar) return;
  for (const pk of G.city.pickups) {
    if (pk.taken || Math.hypot(pk.x - p.x, pk.y - p.y) > 22) continue;
    pk.taken = true;
    pk.respawn = 45;
    if (pk.kind === 'health') { p.health = Math.min(100, p.health + 45); G.notify('Patched up +45 health'); }
    else if (pk.kind === 'armor') { p.armor = 100; G.notify('Armour vest equipped'); }
    else if (pk.kind === 'cash') { G.earnCash(75); G.notify('Cash stash +$75'); G.audio.cash(); }
    else {
      const idx = pk.kind === 'pistol' ? 1 : pk.kind === 'smg' ? 2 : 3;
      G.ownedWeapons[idx] = true;
      p.weapon = idx;
      G.notify(`Picked up the ${WEAPONS[idx].name}`);
    }
    if (pk.kind !== 'cash') G.audio.pickup();
    G.saveGame();
  }
  for (let i = G.cashDrops.length - 1; i >= 0; i -= 1) {
    const d = G.cashDrops[i];
    d.life -= 1 / 60;
    if (d.life <= 0) { G.cashDrops.splice(i, 1); continue; }
    if (Math.hypot(d.x - p.x, d.y - p.y) < 22) {
      G.earnCash(d.amount);
      G.notify(`+$${d.amount}`);
      G.audio.cash();
      G.cashDrops.splice(i, 1);
    }
  }
}

function simulate(G, dt, autopilot) {
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 16);
  if (G.hurtFlash > 0) G.hurtFlash -= dt;
  if (G.danger.timer > 0) G.danger.timer -= dt;

  if (!autopilot) {
    if (G.player.inCar && G.player.car) {
      if (G.shotCruise) G.player.car.speed = Math.max(G.player.car.speed, 150);
      updatePlayerCar(G, G.player.car, dt);
    } else {
      updatePlayerOnFoot(G, dt);
      G.audio.setEngine(0);
    }
    updatePlayerCombat(G, dt);
  } else if (G.player.inCar && G.player.car) {
    G.player.car.speed = Math.max(120, G.player.car.speed);
    updatePlayerCar(G, G.player.car, dt);
  }

  for (const car of G.cars) updateTrafficCar(G, car, dt);
  for (const ped of G.peds) updatePedestrian(G, ped, dt);
  updateEnemies(G, dt);
  updateBullets(G, dt);
  updateWanted(G, dt);
  updatePickups(G.city, dt);
  if (!autopilot) {
    updateMissions(G, dt);
    applyPickups(G);
    updateInteractions(G);
  }

  // Particles drift and fade.
  for (let i = G.particles.length - 1; i >= 0; i -= 1) {
    const pt = G.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  // Fire on wrecked cars.
  for (const car of G.cars) {
    if (car.dead && car.fire > 0) {
      car.fire -= dt;
      if (Math.random() < dt * 18) G.spawnParticles(car.x + (Math.random() - 0.5) * 22, car.y - 6, 1, Math.random() < 0.6 ? '#ff7b2f' : '#444', 44, 0.7);
    }
  }
  // Dialogue and notifications tick down.
  if (!G.dialogue && G.sayQueue.length) {
    G.dialogue = { ...G.sayQueue.shift(), timer: 4.6 };
  }
  if (G.dialogue) {
    G.dialogue.timer -= dt;
    if (G.dialogue.timer <= 0) G.dialogue = null;
  }
  for (let i = G.notifications.length - 1; i >= 0; i -= 1) {
    G.notifications[i].life -= dt;
    if (G.notifications[i].life <= 0) G.notifications.splice(i, 1);
  }
  // Camera: smooth follow, looking ahead of a moving car.
  const p = G.player;
  const look = p.inCar && p.car ? 0.32 : 0.1;
  const tx = p.x + (p.inCar && p.car ? Math.cos(p.car.angle) * p.car.speed * look : 0);
  const ty = p.y + (p.inCar && p.car ? Math.sin(p.car.angle) * p.car.speed * look : 0);
  G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
  G.audio.update(dt, G.cops.length > 0 && G.wanted.stars > 0);
}

function respawnAt(G, place, fineRatio, message) {
  const p = G.player;
  if (p.inCar) G.exitCar(true);
  p.health = 100;
  p.armor = 25;
  p.x = place.x + 24;
  p.y = place.y + 30;
  const fine = Math.floor(G.cash * fineRatio);
  G.cash -= fine;
  G.wanted.stars = 0;
  G.wanted.heat = 0;
  G.wanted.bust = 0;
  G.cops.length = 0;
  G.cars = G.cars.filter((c) => !c.isPolice);
  G.enemies.length = 0;
  if (G.mission.active) { G.mission.active = null; G.missionCar = null; }
  G.camera.x = p.x; G.camera.y = p.y;
  G.screen = 'play';
  G.notify(message + (fine > 0 ? `  Fine: -$${fine}` : ''));
  G.saveGame();
}

function runGame() {
  const saved = loadSave();
  const G = buildGame(saved);
  G.input = createInput(canvas);
  const renderer = createRenderer(canvas);
  let last = performance.now();
  let accumulator = 0;
  const STEP = 1 / 60;

  function handleActions() {
    const actions = G.input.takeActions();
    if (actions & ACTION_CONFIRM) G.audio.unlock();
    if (G.screen === 'title' && (actions & ACTION_CONFIRM)) {
      G.screen = 'play';
      G.audio.unlock();
      G.audio.click();
      G.notify(`Welcome to ${GAME_TITLE} — meet Maya Sol at the gold marker`);
      if (!G.hasSave) G.say('Maya Sol', 'Rafi! Down here on the strip. I have work with your name on it.');
      status.textContent = 'Playing.';
      return;
    }
    if (G.screen === 'wasted' && (actions & (ACTION_CONFIRM | ACTION_RESTART))) {
      respawnAt(G, G.city.hospital, 0.1, 'Discharged from Solara General.');
      return;
    }
    if (G.screen === 'busted' && (actions & (ACTION_CONFIRM | ACTION_RESTART))) {
      respawnAt(G, G.city.policeStation, 0.15, 'Released from SBPD Central.');
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (G.screen === 'play') G.screen = 'paused';
      else if (G.screen === 'paused') G.screen = 'play';
    }
    if (G.screen !== 'play') return;
    if (actions & ACTION_INTERACT) {
      if (G.player.inCar) G.exitCar(false);
      else {
        const car = nearestCar(G, G.player.x, G.player.y, 48);
        if (car) enterCar(G, car);
        else if (G.mission.complete && !G.mission.oddJob) startOddJob(G);
      }
    }
    if (actions & ACTION_WEAPON_NEXT) {
      for (let n = 1; n <= WEAPONS.length; n += 1) {
        const idx = (G.player.weapon + n) % WEAPONS.length;
        if (G.ownedWeapons[idx]) { G.player.weapon = idx; break; }
      }
      G.audio.click();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    handleActions();
    if (!G.input.mouse.down) G.combat.firedThisPress = false;
    G.mouseWorld.x = G.camera.x + (G.input.mouse.x - renderer.view.w / 2);
    G.mouseWorld.y = G.camera.y + (G.input.mouse.y - renderer.view.h / 2);
    if (G.screen === 'play') {
      while (accumulator >= STEP) {
        simulate(G, STEP, false);
        G.stats.playTime += STEP;
        accumulator -= STEP;
        if (G.screen !== 'play') { accumulator = 0; break; }
      }
    } else {
      accumulator = 0;
      if (G.screen === 'title') {
        // The title floats over a living city: traffic rolls, people stroll.
        for (const car of G.cars) updateTrafficCar(G, car, 1 / 60);
        for (const ped of G.peds) updatePedestrian(G, ped, 1 / 60);
        G.time += 1 / 60;
        G.camera.x += (1650 + Math.sin(G.time * 0.05) * 700 - G.camera.x) * 0.004;
        G.camera.y += (1500 + Math.cos(G.time * 0.04) * 600 - G.camera.y) * 0.004;
      }
    }
    renderer.drawWorld(G);
    if (G.screen === 'play' || G.screen === 'paused') drawHud(renderer.ctx, G, renderer.view);
    drawMenu(renderer.ctx, G, renderer.view, G.screen);
    void districtAt;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') G.screen = 'paused';
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') G.audio.toggleMute();
  });
  status.textContent = 'Solara Bay: Neon Shores. Press Enter to start.';
  requestAnimationFrame(frame);
}

function runShot() {
  const G = buildGame(null);
  G.input = createInput(canvas);
  G.screen = 'play';
  G.shotCruise = shotName === 'driving' || shotName === 'chase';
  const renderer = createRenderer(canvas);
  stageShot(G, shotName || 'cover');
  G.camera.x = G.player.x;
  G.camera.y = G.player.y;
  let painted = 0;
  function paint() {
    renderer.drawWorld(G);
    drawHud(renderer.ctx, G, renderer.view);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (shotName) runShot();
else runGame();

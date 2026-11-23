// world.js — Solara Bay itself: procedural city generation from a seed.
// A grid of avenues and streets, city blocks filled with extruded buildings, palm trees,
// street lamps, a beach and bay on the east edge, named districts, a safehouse, garages,
// shops and the pickups scattered through the streets. Also the collision helpers every
// other system uses, so buildings feel solid the same way for people and for cars.
import { WORLD, DISTRICTS } from './config.js';
import { randInt, randRange, pick, chance } from './random.js';

const BUILDING_COLORS = ['#e8b04b', '#d97b4f', '#c95d63', '#7fb3d5', '#a3c585', '#e6d3a3', '#b08968', '#8ecae6', '#f4a261', '#e9c46a', '#90be6d', '#f28482'];
const ROOF_COLORS = ['#8d6e63', '#6d6875', '#a26769', '#5f6c7b', '#7f5539', '#606c38'];
export const SHOP_KINDS = ['Diner', 'Palm Mart', 'Surf Shop', 'Auto Repairs', 'Café Brisa', 'Vinyl Store', 'Pharmacy', 'Barber'];

/** True when a point sits on a road strip (avenue or street), beach excluded. */
export function isRoad(x, y) {
  if (x >= WORLD.beachX) return false;
  return (x % WORLD.cell) < WORLD.road || (y % WORLD.cell) < WORLD.road;
}

/** True when a point is on a sidewalk: just beside a road, not on the road itself. */
export function isSidewalk(x, y) {
  if (isRoad(x, y) || x >= WORLD.beachX) return false;
  const mx = x % WORLD.cell;
  const my = y % WORLD.cell;
  return mx < WORLD.road + 16 || my < WORLD.road + 16 || mx > WORLD.cell - 16 || my > WORLD.cell - 16;
}

/** The district name for a world position, from its place in the grid. */
export function districtAt(x, y) {
  if (x >= WORLD.beachX) return 'Solara Beach';
  const col = Math.min(2, Math.floor(x / (WORLD.size / 3)));
  const row = Math.min(1, Math.floor(y / (WORLD.size / 2)));
  return DISTRICTS[row * 3 + col];
}

/** Push a circle (x, y, r) out of every building rect it overlaps; returns corrected {x, y}. */
export function collideBuildings(buildings, x, y, r) {
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx;
    const dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) { y = b.y - r; continue; }
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * r;
      y = ny + (dy / d) * r;
    }
  }
  return { x, y };
}

/** True when the straight line a→b stays clear of buildings (a cheap line of sight). */
export function lineOfSight(buildings, ax, ay, bx, by) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 26);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    for (let j = 0; j < buildings.length; j += 1) {
      const b = buildings[j];
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return false;
    }
  }
  return true;
}

/** Nearest point on a road to (x, y): used to place traffic, police spawns and markers. */
export function nearestRoadPoint(x, y) {
  const snap = (v) => {
    const m = v % WORLD.cell;
    const base = v - m;
    return m < WORLD.cell / 2 ? base + WORLD.road / 2 : base + WORLD.cell + WORLD.road / 2;
  };
  const rx = snap(x);
  const ry = snap(y);
  return Math.abs(rx - x) < Math.abs(ry - y) ? { x: rx, y } : { x, y: ry };
}

/**
 * Build the whole city from rng. Returns buildings, props (palms and lamps), shops,
 * pickups, named places and the spawn points the other systems use.
 */
export function generateCity(rng) {
  const buildings = [];
  const props = [];
  const shops = [];
  const pickups = [];
  const blocksPerSide = Math.floor(WORLD.beachX / WORLD.cell);

  for (let bx = 0; bx < blocksPerSide; bx += 1) {
    for (let by = 0; by < Math.floor(WORLD.size / WORLD.cell); by += 1) {
      const ox = bx * WORLD.cell + WORLD.road;
      const oy = by * WORLD.cell + WORLD.road;
      const inner = WORLD.cell - WORLD.road;
      const split = chance(rng, 0.5) ? 2 : 1;
      for (let sx = 0; sx < split; sx += 1) {
        for (let sy = 0; sy < split; sy += 1) {
          const w = inner / split - randRange(rng, 8, 26);
          const h = inner / split - randRange(rng, 8, 26);
          const x = ox + (inner / split) * sx + randRange(rng, 2, 10);
          const y = oy + (inner / split) * sy + randRange(rng, 2, 10);
          buildings.push({
            x, y, w, h,
            height: randRange(rng, 14, 64),
            color: pick(rng, BUILDING_COLORS),
            roof: pick(rng, ROOF_COLORS),
            windows: randInt(rng, 2, 5),
            neon: chance(rng, 0.22) ? pick(rng, ['#ff5da2', '#39d0ff', '#ffe14d', '#7dff6a']) : null,
          });
        }
      }
      // Palms and lamps along the sidewalks of this block.
      const propCount = randInt(rng, 2, 5);
      for (let p = 0; p < propCount; p += 1) {
        const edge = randInt(rng, 0, 3);
        const t = rng();
        let px = ox; let py = oy;
        if (edge === 0) { px = ox + t * inner; py = oy - 8; }
        if (edge === 1) { px = ox + t * inner; py = oy + inner + 8; }
        if (edge === 2) { px = ox - 8; py = oy + t * inner; }
        if (edge === 3) { px = ox + inner + 8; py = oy + t * inner; }
        props.push({ x: px, y: py, kind: chance(rng, 0.62) ? 'palm' : 'lamp', sway: randRange(rng, 0, 6.28) });
      }
      // One block in seven fronts a shop onto the street.
      if (chance(rng, 0.15)) {
        shops.push({ x: ox + inner / 2, y: oy - 4, kind: pick(rng, SHOP_KINDS), name: `${pick(rng, SHOP_KINDS)}` });
      }
    }
  }

  // Pickups: health at diners, armour at the port, weapons in alleys, cash stashes on roofs' streets.
  const pickupKinds = ['health', 'armor', 'pistol', 'smg', 'shotgun', 'cash'];
  for (let i = 0; i < 42; i += 1) {
    const p = nearestRoadPoint(randRange(rng, 120, WORLD.beachX - 120), randRange(rng, 120, WORLD.size - 120));
    pickups.push({ x: p.x + randRange(rng, -26, 26), y: p.y + randRange(rng, -26, 26), kind: pickupKinds[i % pickupKinds.length], taken: false, respawn: 0, bob: randRange(rng, 0, 6.28) });
  }

  const safehouse = { x: 420, y: 420, name: "Rafi's Safehouse" };
  const garage = { x: WORLD.cell * 5 + 46, y: WORLD.cell * 8 + 46, name: 'Port Azul Garage' };
  const hospital = { x: WORLD.cell * 2 + 46, y: WORLD.cell * 3 + 46, name: 'Solara General' };
  const policeStation = { x: WORLD.cell * 6 + 46, y: WORLD.cell * 5 + 46, name: 'SBPD Central' };

  return { buildings, props, shops, pickups, safehouse, garage, hospital, policeStation };
}

/** Respawn timers for pickups; taken pickups drift back after a while. */
export function updatePickups(city, dt) {
  for (const p of city.pickups) {
    p.bob += dt * 2.4;
    if (p.taken) {
      p.respawn -= dt;
      if (p.respawn <= 0) p.taken = false;
    }
  }
}

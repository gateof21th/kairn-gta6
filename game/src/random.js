// random.js — a seeded mulberry32 generator plus small helpers built on it.
// The same seed always builds the same city, which makes screenshot scenes repeatable
// and lets a saved game return to the exact streets the player left.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] inclusive, drawn from rng. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Float in [min, max), drawn from rng. */
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

/** One element of a non-empty list, drawn from rng. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** True with probability p, drawn from rng. */
export function chance(rng, p) {
  return rng() < p;
}

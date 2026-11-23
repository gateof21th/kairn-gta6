// config.js — every tuning constant for Solara Bay: Neon Shores in one place.
// The city, cast, vehicles and story are fully original to this game.
export const GAME_TITLE = 'SOLARA BAY';
export const GAME_SUBTITLE = 'NEON SHORES';
export const CITY_NAME = 'Solara Bay';
export const HERO_NAME = 'Rafi Vale';

export const WORLD = {
  size: 3840,   // the world is a square of this many pixels, beach on the east edge
  cell: 320,    // one city block pitch: a road strip plus one block of buildings
  road: 92,     // width of the road strip inside each cell pitch
  beachX: 3520, // east of this line is sand, then water
};

export const PLAYER = {
  radius: 11,
  walkSpeed: 172,
  sprintSpeed: 276,
  health: 100,
  armor: 50,
};

export const WANTED = {
  decaySeconds: 24, // seconds out of sight per star lost
  maxStars: 5,
  heat: { carjack: 1, assault: 1, shot: 1, copHit: 2, explosion: 2, mission: 1 },
};

export const VEHICLE_MODELS = [
  { name: 'Cielo Coupe',   color: '#e74c3c', topSpeed: 350, accel: 215, grip: 3.6 },
  { name: 'Marlin Sedan',  color: '#3498db', topSpeed: 295, accel: 178, grip: 3.1 },
  { name: 'Dune Buggy K7', color: '#f39c12', topSpeed: 305, accel: 235, grip: 2.7 },
  { name: 'Palma Van',     color: '#dfe6e9', topSpeed: 242, accel: 142, grip: 2.9 },
  { name: 'Vesper GT',     color: '#9b59b6', topSpeed: 392, accel: 265, grip: 3.9 },
  { name: 'Toro Pickup',   color: '#27ae60', topSpeed: 268, accel: 168, grip: 3.0 },
  { name: 'Sol Taxi',      color: '#f1c40f', topSpeed: 282, accel: 172, grip: 3.1 },
];

export const WEAPONS = [
  { name: 'Fists',        damage: 14, range: 34,  cooldown: 0.30, spread: 0,    pellets: 0, auto: false, kick: 0 },
  { name: 'Sol-9 Pistol', damage: 24, range: 440, cooldown: 0.23, spread: 0.03, pellets: 1, auto: false, kick: 2 },
  { name: 'Gull SMG',     damage: 13, range: 390, cooldown: 0.09, spread: 0.09, pellets: 1, auto: true,  kick: 1 },
  { name: 'Breaker SG',   damage: 11, range: 250, cooldown: 0.78, spread: 0.17, pellets: 6, auto: false, kick: 5 },
];

export const SAVE_KEY = 'solara-bay-neon-shores-save-v1';
export const DISTRICTS = ['Cielo Hills', 'Neon Strip', 'Marina Flats', 'Old Cannery', 'Port Azul', 'Port Azul Docks'];
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

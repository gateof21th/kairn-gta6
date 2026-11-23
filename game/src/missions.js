// missions.js — the story of Solara Bay: Neon Shores, as data plus a stage machine.
// Rafi Vale, a boat mechanic who owes money across the bay, takes jobs from fixer Maya Sol
// against the Cannery Kings, the crew muscling in on Port Azul. Six story missions chain
// go-to, delivery, shootout, street-race, car-theft and escape stages; finishing the story
// unlocks endless odd jobs (fares and deliveries) for cash in free roam.
import { WORLD } from './config.js';
import { nearestRoadPoint } from './world.js';

export const CHARACTERS = {
  rafi: { name: 'Rafi Vale', color: '#ffd166' },
  maya: { name: 'Maya Sol', color: '#ff5da2' },
  beto: { name: 'Uncle Beto', color: '#7dff6a' },
  vex: { name: 'Vex Marlowe', color: '#ff6b6b' },
  inez: { name: 'Inez Prado', color: '#39d0ff' },
};

const P = (x, y) => nearestRoadPoint(x, y);
export const PLACES = {
  safehouse: P(420, 420),
  mayaCorner: P(1660, 880),      // Neon Strip
  cannery: P(760, 2620),         // Old Cannery
  port: P(2980, 2980),           // Port Azul docks
  garage: P(1706, 2666),         // Port Azul Garage
  beachKiosk: P(3380, 1500),     // Solara Beach
  hills: P(880, 620),            // Cielo Hills
  marina: P(2980, 620),          // Marina Flats
};

export const STORY_MISSIONS = [
  {
    title: 'First Errand', giver: 'maya', reward: 350,
    intro: [
      ['maya', 'Rafi. You owe half the bay and your boat is a lawn ornament. Run one errand and we start fixing that.'],
      ['rafi', 'One errand. Famous last words, Maya.'],
      ['maya', 'Pick up a package at the beach kiosk. Take it to Beto at the Port Azul garage. Do not open it.'],
    ],
    stages: [
      { kind: 'goto', at: PLACES.beachKiosk, label: 'Pick up the package at the beach kiosk' },
      { kind: 'goto', at: PLACES.garage, label: 'Deliver the package to Uncle Beto at the garage' },
    ],
    outro: [['beto', 'You run Maya\'s errands now? Careful, sobrino. Her errands grow teeth.'], ['maya', 'Paid. More work soon — the Kings are leaning on the port.']],
  },
  {
    title: 'Cannery Kings', giver: 'maya', reward: 600, heat: 'mission',
    intro: [
      ['maya', 'Vex Marlowe and his Cannery Kings shook down two of my drivers at the old cannery.'],
      ['rafi', 'And you want me to shake back.'],
      ['maya', 'I want you to be memorable. Clear them out, then get clear yourself.'],
    ],
    stages: [
      { kind: 'goto', at: PLACES.cannery, label: 'Go to the Old Cannery' },
      { kind: 'waves', at: PLACES.cannery, count: 4, label: 'Clear out the Cannery Kings' },
      { kind: 'goto', at: PLACES.safehouse, label: 'Lose the heat and get back to the safehouse' },
    ],
    outro: [['vex', 'Tell Maya the bay is bigger than her little empire. This is not over.'], ['maya', 'Memorable. Very memorable. The port breathes again.']],
  },
  {
    title: 'Street Heat', giver: 'inez', reward: 550,
    intro: [
      ['inez', 'Inez Prado. I move medicine the fast way, and my driver just quit mid-route.'],
      ['rafi', 'Let me guess. The route is timed and the city is full of cops.'],
      ['inez', 'Hit every checkpoint before the clock dies. Drive like the bay is watching. It is.'],
    ],
    stages: [
      { kind: 'checkpoints', points: [PLACES.hills, PLACES.mayaCorner, PLACES.marina, PLACES.beachKiosk, PLACES.garage], time: 150, label: 'Hit every checkpoint before time runs out' },
    ],
    outro: [['inez', 'Fast hands, cool head. The clinics send their thanks, driver.']],
  },
  {
    title: 'The Violet Vesper', giver: 'maya', reward: 800, heat: 'mission',
    intro: [
      ['maya', 'A violet Vesper GT sits at the marina, bought with money stolen from my drivers.'],
      ['rafi', 'You want it stolen back. Poetic.'],
      ['maya', 'Steal it, bring it to the garage. Vex will notice. So will the SBPD.'],
    ],
    stages: [
      { kind: 'steal', at: PLACES.marina, label: 'Steal the violet Vesper GT at the marina' },
      { kind: 'goto', at: PLACES.garage, label: 'Deliver the Vesper GT to the garage', needsMissionCar: true },
    ],
    outro: [['maya', 'Poetry delivered. Vex is furious, which means we are winning.']],
  },
  {
    title: 'Dockside Ambush', giver: 'beto', reward: 1000, heat: 'mission',
    intro: [
      ['beto', 'The Kings hit the docks tonight, sobrino. My crews are fishermen, not fighters.'],
      ['rafi', 'I will hold the port, Beto. Keep your people inside.'],
      ['beto', 'Two waves, maybe more. Take the good guns from the alley crates before you go.'],
    ],
    stages: [
      { kind: 'goto', at: PLACES.port, label: 'Get to the Port Azul docks' },
      { kind: 'waves', at: PLACES.port, count: 5, label: 'Hold the docks — wave one' },
      { kind: 'waves', at: PLACES.port, count: 6, label: 'Hold the docks — final wave' },
    ],
    outro: [['beto', 'The port stands because you did. Maya is planning the end of this. Be ready.']],
  },
  {
    title: 'Neon Finale', giver: 'maya', reward: 2000, heat: 'mission',
    intro: [
      ['maya', 'Tonight Vex moves his whole take out of the cannery in one convoy truck route. We take it at the strip.'],
      ['vex', 'Vale! I know that face. Kings — do not let him reach the hills!'],
      ['maya', 'Grab the Kings\' cash car, run the checkpoints to shake his crew, and bring it home, Rafi.'],
    ],
    stages: [
      { kind: 'steal', at: PLACES.mayaCorner, label: 'Take the Cannery Kings\' cash car on the Neon Strip' },
      { kind: 'checkpoints', points: [PLACES.marina, PLACES.hills, PLACES.cannery], time: 120, label: 'Shake the Kings — hit the checkpoints', needsMissionCar: true },
      { kind: 'goto', at: PLACES.safehouse, label: 'Bring the cash car home to the safehouse', needsMissionCar: true },
    ],
    outro: [
      ['maya', 'That is the Kings\' whole season, Rafi. The bay is ours again — your debts included. Paid in full.'],
      ['rafi', 'Then I am buying my boat back. And Maya... keep the phone on. I like this city awake.'],
    ],
  },
];

export function createMissionState() {
  return {
    index: 0,          // next story mission to offer
    active: null,      // { def, stageIndex, timer, spawned, checkpoint }
    complete: false,   // story finished
    oddJob: null,      // active repeatable job in free roam
    offered: false,
  };
}

/** Start story mission `index`: queue its dialogue, arm stage one, spawn its props. */
export function startMission(G, index) {
  const def = STORY_MISSIONS[index];
  if (!def) return;
  const state = { def, stageIndex: 0, timer: 0, spawned: false, checkpoint: 0 };
  G.mission.active = state;
  G.mission.offered = false;
  for (const [who, text] of def.intro) G.say(CHARACTERS[who].name, text);
  if (def.heat) G.addWantedHeat(def.heat, G.player.x, G.player.y);
  armStage(G, state);
  G.notify(`Mission started: ${def.title}`);
  G.audio.click();
}

function armStage(G, state) {
  const stage = state.def.stages[state.stageIndex];
  state.spawned = false;
  if (stage.kind === 'checkpoints') state.timer = stage.time;
  if (stage.kind === 'steal') G.spawnMissionCar(stage.at);
  if (stage.kind === 'waves') state.spawned = false;
}

/** The marker the HUD and minimap should point at right now, or null. */
export function currentTarget(G) {
  const m = G.mission;
  if (m.active) {
    const stage = m.active.def.stages[m.active.stageIndex];
    if (!stage) return null;
    if (stage.kind === 'checkpoints') return stage.points[m.active.checkpoint] || null;
    if (stage.kind === 'steal' && G.missionCar && !G.missionCar.dead) return { x: G.missionCar.x, y: G.missionCar.y };
    return stage.at;
  }
  if (m.oddJob) return m.oddJob.stage === 'pickup' ? m.oddJob.from : m.oddJob.to;
  if (!m.complete && !m.offered) return PLACES.mayaCorner;
  return null;
}

/** The objective line for the HUD. */
export function currentObjective(G) {
  const m = G.mission;
  if (m.active) {
    const stage = m.active.def.stages[m.active.stageIndex];
    if (!stage) return '';
    let label = stage.label;
    if (stage.kind === 'checkpoints') label += `  (${m.active.checkpoint + 1}/${stage.points.length})`;
    if (stage.kind === 'waves' && m.active.spawned) label += `  — ${G.enemies.filter((e) => !e.dead && e.downTimer <= 0).length} left`;
    if (stage.needsMissionCar && G.player.car !== G.missionCar) label = 'Get back in the marked car — ' + label;
    return `${m.active.def.title}: ${label}`;
  }
  if (m.oddJob) return m.oddJob.stage === 'pickup' ? `Odd job: pick up ${m.oddJob.name} — $${m.oddJob.fare}` : `Odd job: drop ${m.oddJob.name} at the marker — $${m.oddJob.fare}`;
  if (m.complete) return 'Free roam — find a fare downtown, or just enjoy Solara Bay';
  return 'Meet Maya Sol on the Neon Strip to start work (gold marker)';
}

function finishMission(G) {
  const m = G.mission;
  const def = m.active.def;
  for (const [who, text] of def.outro) G.say(CHARACTERS[who].name, text);
  G.earnCash(def.reward);
  G.notify(`Mission complete: ${def.title}  +$${def.reward}`);
  G.audio.missionDone();
  G.stats.missionsDone += 1;
  m.index += 1;
  m.active = null;
  G.missionCar = null;
  if (m.index >= STORY_MISSIONS.length) {
    m.complete = true;
    G.notify('Story complete! Solara Bay is yours — odd jobs and free roam unlocked.');
    G.say('Maya Sol', 'The bay is quiet, Rafi. Fares downtown if you ever miss the noise.');
  }
  G.saveGame();
}

function failMission(G, reason) {
  G.notify(`Mission failed: ${reason}`);
  G.audio.missionFail();
  G.mission.active = null;
  G.missionCar = null;
  G.mission.offered = false;
}

/** Per-frame mission logic: markers, waves, timers, theft and delivery checks. */
export function updateMissions(G, dt) {
  const m = G.mission;
  const player = G.player;

  // Offer the next story mission when the player reaches Maya's corner.
  if (!m.active && !m.complete && !m.oddJob) {
    const d = Math.hypot(player.x - PLACES.mayaCorner.x, player.y - PLACES.mayaCorner.y);
    if (d < 60 && !player.inCar) {
      startMission(G, m.index);
      return;
    }
  }
  if (m.oddJob) { updateOddJob(G); return; }
  if (!m.active) return;

  const state = m.active;
  const stage = state.def.stages[state.stageIndex];
  if (!stage) { finishMission(G); return; }

  const advance = () => {
    state.stageIndex += 1;
    if (state.stageIndex >= state.def.stages.length) finishMission(G);
    else { armStage(G, state); G.audio.pickup(); }
  };

  if (stage.kind === 'goto') {
    if (stage.needsMissionCar && player.car !== G.missionCar) return;
    if (Math.hypot(player.x - stage.at.x, player.y - stage.at.y) < 62) advance();
  } else if (stage.kind === 'steal') {
    if (G.missionCar && player.car === G.missionCar) { G.addWantedHeat('mission', player.x, player.y); advance(); }
  } else if (stage.kind === 'waves') {
    const d = Math.hypot(player.x - stage.at.x, player.y - stage.at.y);
    if (!state.spawned && d < 240) {
      state.spawned = true;
      G.spawnEnemies(stage.at.x, stage.at.y, stage.count);
      G.say('Vex Marlowe', 'That is him! Take him down!');
    }
    if (state.spawned && G.enemies.every((e) => e.dead || e.downTimer > 4)) advance();
  } else if (stage.kind === 'checkpoints') {
    if (stage.needsMissionCar && player.car !== G.missionCar) { /* timer keeps running: pressure */ }
    state.timer -= dt;
    if (state.timer <= 0) { failMission(G, 'Out of time'); return; }
    const point = stage.points[state.checkpoint];
    if (point && Math.hypot(player.x - point.x, player.y - point.y) < 78) {
      state.checkpoint += 1;
      G.audio.cash();
      G.earnCash(25);
      if (state.checkpoint >= stage.points.length) advance();
    }
  }
  void WORLD;
}

/** Repeatable free-roam work: pick a passenger up, drop them off, get paid by distance. */
export function startOddJob(G) {
  const spots = [PLACES.hills, PLACES.marina, PLACES.beachKiosk, PLACES.port, PLACES.cannery, PLACES.garage];
  const from = spots[Math.floor(G.rng() * spots.length)];
  let to = spots[Math.floor(G.rng() * spots.length)];
  if (to === from) to = PLACES.safehouse;
  const fare = 60 + Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 14);
  const names = ['a tourist', 'a chef', 'a surfer', 'a nurse', 'a DJ', 'a fisher'];
  G.mission.oddJob = { from, to, fare, stage: 'pickup', name: names[Math.floor(G.rng() * names.length)] };
  G.notify('Odd job started — follow the gold marker');
}

function updateOddJob(G) {
  const job = G.mission.oddJob;
  const player = G.player;
  if (job.stage === 'pickup') {
    if (Math.hypot(player.x - job.from.x, player.y - job.from.y) < 58) {
      job.stage = 'dropoff';
      G.say('Passenger', 'Thanks for stopping! The marker, please — and step on it.');
      G.audio.carDoor();
    }
  } else if (Math.hypot(player.x - job.to.x, player.y - job.to.y) < 62) {
    G.earnCash(job.fare);
    G.notify(`Fare paid: +$${job.fare}`);
    G.audio.cash();
    G.mission.oddJob = null;
    G.stats.faresDone += 1;
    G.saveGame();
  }
}

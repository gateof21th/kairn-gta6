// hud.js — everything fixed to the screen: health and armour bars, cash, weapon and
// wanted stars, the district name, the mission objective banner, dialogue, notifications,
// the bust meter, interaction prompts — and the minimap, a live scaled plan of Solara Bay
// with road grid, the bay, the player arrow and blips for missions, police and enemies.
import { WORLD, WEAPONS, FONT } from './config.js';
import { districtAt } from './world.js';

const MAP_SIZE = 196;
const MAP_MARGIN = 18;

function bar(ctx, x, y, w, h, ratio, color, label) {
  ctx.fillStyle = 'rgba(10,12,20,0.62)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 4, y + h - 2.5);
}

export function drawMinimap(ctx, G, view) {
  const x0 = MAP_MARGIN;
  const y0 = view.h - MAP_SIZE - MAP_MARGIN;
  const scale = MAP_SIZE / WORLD.size;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, MAP_SIZE, MAP_SIZE);
  ctx.clip();
  ctx.fillStyle = '#79b657';
  ctx.fillRect(x0, y0, MAP_SIZE, MAP_SIZE);
  ctx.fillStyle = '#f2dfae';
  ctx.fillRect(x0 + WORLD.beachX * scale, y0, MAP_SIZE, MAP_SIZE);
  ctx.fillStyle = '#2e86c1';
  ctx.fillRect(x0 + (WORLD.beachX + 210) * scale, y0, MAP_SIZE, MAP_SIZE);
  ctx.strokeStyle = 'rgba(40,44,54,0.85)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i <= WORLD.size / WORLD.cell; i += 1) {
    ctx.beginPath(); ctx.moveTo(x0 + i * WORLD.cell * scale, y0); ctx.lineTo(x0 + i * WORLD.cell * scale, y0 + MAP_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0 + i * WORLD.cell * scale); ctx.lineTo(x0 + MAP_SIZE, y0 + i * WORLD.cell * scale); ctx.stroke();
  }
  const dot = (wx, wy, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x0 + wx * scale, y0 + wy * scale, r, 0, Math.PI * 2); ctx.fill();
  };
  dot(G.city.safehouse.x, G.city.safehouse.y, '#2ecc71', 3.4);
  for (const car of G.cars) if (!car.dead && Math.random() < 0.9) dot(car.x, car.y, 'rgba(255,255,255,0.55)', 1.4);
  for (const e of G.enemies) if (!e.dead) dot(e.x, e.y, '#ff3b30', 3);
  for (const cop of G.cops) if (!cop.dead) dot(cop.x, cop.y, Math.floor(G.time * 3) % 2 ? '#2e86ff' : '#ff3b30', 3);
  const target = G.currentTarget();
  if (target) {
    dot(target.x, target.y, '#ffd700', 4.6);
    ctx.strokeStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(x0 + target.x * scale, y0 + target.y * scale, 7 + Math.sin(G.time * 4) * 1.6, 0, Math.PI * 2); ctx.stroke();
  }
  // Player arrow, rotated to facing.
  ctx.translate(x0 + G.player.x * scale, y0 + G.player.y * scale);
  ctx.rotate(G.player.angle + Math.PI / 2);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#111';
  ctx.beginPath(); ctx.moveTo(0, -6.4); ctx.lineTo(4.4, 5); ctx.lineTo(0, 2.6); ctx.lineTo(-4.4, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, MAP_SIZE, MAP_SIZE);
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  ctx.fillRect(x0, y0 + MAP_SIZE - 17, MAP_SIZE, 17);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 10.5px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(districtAt(G.player.x, G.player.y).toUpperCase() + '  ·  SOLARA BAY', x0 + MAP_SIZE / 2, y0 + MAP_SIZE - 4.5);
}

export function drawHud(ctx, G, view) {
  const player = G.player;
  drawMinimap(ctx, G, view);

  // Vitals, bottom-left above the minimap.
  const bx = MAP_MARGIN;
  const by = view.h - MAP_SIZE - MAP_MARGIN - 58;
  bar(ctx, bx, by, 196, 13, player.health / 100, '#e74c3c', 'HEALTH');
  bar(ctx, bx, by + 20, 196, 13, player.armor / 100, '#5dade2', 'ARMOUR');
  if (player.inCar && player.car) bar(ctx, bx, by + 40, 196, 10, player.car.health / 130, '#f39c12', player.car.model.name.toUpperCase());

  // Cash, weapon and wanted stars, top-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7dff6a';
  ctx.font = `bold 27px ${FONT}`;
  ctx.fillText('$' + G.cash.toLocaleString('en-US'), view.w - 22, 38);
  ctx.fillStyle = '#fff';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(WEAPONS[player.weapon].name + (player.inCar ? '  ·  ' + Math.round(Math.abs(player.car.speed) * 0.62) + ' km/h' : ''), view.w - 22, 62);
  // Wanted stars.
  for (let s = 0; s < 5; s += 1) {
    const active = s < G.wanted.stars;
    ctx.fillStyle = active ? (Math.floor(G.time * 2.4) % 2 && G.wanted.stars >= 4 ? '#ff3b30' : '#ffd700') : 'rgba(255,255,255,0.28)';
    ctx.font = '26px ' + FONT;
    ctx.fillText('★', view.w - 22 - (4 - s) * 27, 92);
  }
  if (G.wanted.stars > 0 && G.wanted.seenTimer <= 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `12px ${FONT}`;
    ctx.fillText('out of sight — stay clean to lose the stars', view.w - 22, 112);
  }

  // Mission objective banner, top-centre.
  const objective = G.currentObjective();
  if (objective) {
    ctx.font = `bold 15.5px ${FONT}`;
    const w = Math.min(view.w - 420, ctx.measureText(objective).width + 34);
    ctx.fillStyle = 'rgba(10,12,20,0.66)';
    ctx.beginPath(); ctx.roundRect(view.w / 2 - w / 2, 14, w, 34, 8); ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText(objective, view.w / 2, 37);
  }
  const active = G.mission.active;
  if (active && active.def.stages[active.stageIndex] && active.def.stages[active.stageIndex].kind === 'checkpoints') {
    ctx.fillStyle = active.timer < 20 ? '#ff6b6b' : '#fff';
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('⏱ ' + Math.max(0, active.timer).toFixed(1), view.w / 2, 76);
  }

  // Bust meter, centre-bottom.
  if (G.wanted.bust > 0.02) {
    const w = 260;
    ctx.fillStyle = 'rgba(10,12,20,0.66)';
    ctx.fillRect(view.w / 2 - w / 2 - 3, view.h - 128, w + 6, 24);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(view.w / 2 - w / 2, view.h - 125, w * G.wanted.bust, 12);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED METER — BREAK FREE!', view.w / 2, view.h - 96);
  }

  // Interaction prompt.
  if (G.prompt) {
    ctx.fillStyle = 'rgba(10,12,20,0.7)';
    const w = ctx.measureText(G.prompt).width + 40;
    ctx.font = `bold 15px ${FONT}`;
    ctx.beginPath(); ctx.roundRect(view.w / 2 - w / 2 - 18, view.h - 178, w + 36, 32, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(G.prompt, view.w / 2, view.h - 157);
  }

  // Notifications, left side under the top.
  ctx.textAlign = 'left';
  let ny = 30;
  for (const n of G.notifications) {
    ctx.globalAlpha = Math.min(1, n.life);
    ctx.fillStyle = 'rgba(10,12,20,0.6)';
    ctx.font = `bold 14px ${FONT}`;
    const w = ctx.measureText(n.text).width + 22;
    ctx.fillRect(16, ny - 16, w, 24);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(n.text, 27, ny + 1);
    ny += 30;
  }
  ctx.globalAlpha = 1;

  // Dialogue box, bottom-centre: the story talking.
  if (G.dialogue) {
    const d = G.dialogue;
    const w = Math.min(680, view.w - 320);
    const x = view.w / 2 - w / 2;
    const y = view.h - 92;
    ctx.fillStyle = 'rgba(8,10,18,0.82)';
    ctx.beginPath(); ctx.roundRect(x, y, w, 66, 10); ctx.fill();
    ctx.fillStyle = d.color;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(d.speaker.toUpperCase(), x + 16, y + 21);
    ctx.fillStyle = '#fff';
    ctx.font = `14.5px ${FONT}`;
    wrapText(ctx, d.text, x + 16, y + 42, w - 32, 18);
  }

  // Controls hint, bottom-right (fades after the first minutes).
  if (G.time < 50 || G.screen === 'play') {
    ctx.fillStyle = 'rgba(255,255,255,0.66)';
    ctx.font = `11.5px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('WASD move · SHIFT sprint · F enter/steal car · MOUSE aim + click shoot · Q weapon · P pause · M mute', view.w - 16, view.h - 10);
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

function panel(ctx, view, title, titleColor, lines, prompt) {
  ctx.fillStyle = 'rgba(6,8,16,0.72)';
  ctx.fillRect(0, 0, view.w, view.h);
  const w = 660;
  const h = 150 + lines.length * 27 + 60;
  const x = view.w / 2 - w / 2;
  const y = view.h / 2 - h / 2;
  ctx.fillStyle = 'rgba(12,16,28,0.94)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = titleColor;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor;
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText(title, view.w / 2, y + 66);
  ctx.fillStyle = '#dfe6e9';
  ctx.font = `16px ${FONT}`;
  lines.forEach((line, i) => ctx.fillText(line, view.w / 2, y + 108 + i * 27));
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText(prompt, view.w / 2, y + h - 24);
}

/** Full-screen menus: title, pause, wasted, busted and the story-complete card. */
export function drawMenu(ctx, G, view, screen) {
  if (screen === 'title') {
    const grad = ctx.createLinearGradient(0, 0, 0, view.h);
    grad.addColorStop(0, 'rgba(30,10,50,0.55)');
    grad.addColorStop(1, 'rgba(200,70,40,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText('SOLARA BAY', view.w / 2, view.h * 0.30);
    ctx.fillStyle = '#ff5da2';
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText('— NEON SHORES —', view.w / 2, view.h * 0.30 + 52);
    ctx.fillStyle = '#fff';
    ctx.font = `17px ${FONT}`;
    ctx.fillText('An original open-world crime story. Rafi Vale owes the whole bay money —', view.w / 2, view.h * 0.30 + 96);
    ctx.fillText('fixer Maya Sol has work, and the Cannery Kings have other ideas.', view.w / 2, view.h * 0.30 + 122);
    ctx.fillStyle = 'rgba(10,12,20,0.7)';
    ctx.beginPath(); ctx.roundRect(view.w / 2 - 300, view.h * 0.30 + 148, 600, 118, 10); ctx.fill();
    ctx.fillStyle = '#dfe6e9';
    ctx.font = `14.5px ${FONT}`;
    ctx.fillText('WASD / arrows — move & drive      SHIFT — sprint', view.w / 2, view.h * 0.30 + 178);
    ctx.fillText('F — enter / steal car      MOUSE — aim, CLICK — shoot', view.w / 2, view.h * 0.30 + 202);
    ctx.fillText('Q — swap weapon      P — pause      M — mute', view.w / 2, view.h * 0.30 + 226);
    ctx.fillText('SPACE — handbrake      Progress saves automatically', view.w / 2, view.h * 0.30 + 250);
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(G.hasSave ? 'Press ENTER or CLICK — continue Rafi\'s story' : 'Press ENTER or CLICK — start Rafi\'s story', view.w / 2, view.h * 0.30 + 306);
    return;
  }
  if (screen === 'paused') {
    panel(ctx, view, 'PAUSED', '#ffd700', [
      `Cash $${G.cash.toLocaleString('en-US')} · Missions done ${G.stats.missionsDone}/6 · Fares ${G.stats.faresDone}`,
      `Cars stolen ${G.stats.carsStolen} · Time in Solara Bay ${Math.floor(G.stats.playTime / 60)} min`,
      'Your progress is saved to this browser automatically.',
    ], 'P or ENTER — back to the bay');
    return;
  }
  if (screen === 'wasted') {
    panel(ctx, view, 'WASTED', '#ff3b30', [
      'Solara General patched Rafi up — the bill came out of his pocket.',
      'You wake at the hospital. The bay keeps turning.',
    ], 'ENTER — wake up');
    return;
  }
  if (screen === 'busted') {
    panel(ctx, view, 'BUSTED', '#5dade2', [
      'The SBPD impounded the moment and fined Rafi on the spot.',
      'You walk out of SBPD Central a little poorer and a lot wiser.',
    ], 'ENTER — walk free');
    return;
  }
}

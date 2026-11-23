// render.js — everything the camera sees: Solara Bay drawn top-down with extruded
// buildings, sun-bleached roads, palms, the beach and the bay, traffic, people, tracers
// and particles. A warm late-afternoon grade sits over the world; the HUD lives in hud.js.
import { WORLD } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 800 };

  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = view.w;
    canvas.height = view.h;
  }
  resize();
  window.addEventListener('resize', resize);

  function visible(cam, pad) {
    return { x0: cam.x - view.w / 2 - pad, y0: cam.y - view.h / 2 - pad, x1: cam.x + view.w / 2 + pad, y1: cam.y + view.h / 2 + pad };
  }

  function drawGround(G, cam) {
    const v = visible(cam, 80);
    ctx.fillStyle = '#79b657';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // Beach and bay on the east edge.
    ctx.fillStyle = '#f2dfae';
    ctx.fillRect(WORLD.beachX, v.y0, WORLD.size - WORLD.beachX + 400, v.y1 - v.y0);
    ctx.fillStyle = '#2e86c1';
    ctx.fillRect(WORLD.beachX + 210, v.y0, WORLD.size - WORLD.beachX, v.y1 - v.y0);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let y = Math.floor(v.y0 / 90) * 90; y < v.y1; y += 90) ctx.fillRect(WORLD.beachX + 196 + Math.sin(y * 0.05 + G.time) * 6, y, 16, 3);

    // Roads: dark strips on both grid axes, sidewalks first.
    ctx.fillStyle = '#cbb9a0';
    for (let x = Math.floor(v.x0 / WORLD.cell) * WORLD.cell; x < v.x1; x += WORLD.cell) ctx.fillRect(x - 8, v.y0, WORLD.road + 16, v.y1 - v.y0);
    for (let y = Math.floor(v.y0 / WORLD.cell) * WORLD.cell; y < v.y1; y += WORLD.cell) ctx.fillRect(v.x0, y - 8, v.x1 - v.x0, WORLD.road + 16);
    ctx.fillStyle = '#3a3f4a';
    for (let x = Math.floor(v.x0 / WORLD.cell) * WORLD.cell; x < v.x1; x += WORLD.cell) { if (x < WORLD.beachX) ctx.fillRect(x, v.y0, WORLD.road, v.y1 - v.y0); }
    for (let y = Math.floor(v.y0 / WORLD.cell) * WORLD.cell; y < v.y1; y += WORLD.cell) ctx.fillRect(v.x0, y, v.x1 - v.x0, WORLD.road);
    // Centre dashes.
    ctx.fillStyle = '#f7d774';
    for (let x = Math.floor(v.x0 / WORLD.cell) * WORLD.cell + WORLD.road / 2 - 2; x < v.x1; x += WORLD.cell) {
      for (let y = Math.floor(v.y0 / 46) * 46; y < v.y1; y += 46) ctx.fillRect(x, y, 4, 24);
    }
    for (let y = Math.floor(v.y0 / WORLD.cell) * WORLD.cell + WORLD.road / 2 - 2; y < v.y1; y += WORLD.cell) {
      for (let x = Math.floor(v.x0 / 46) * 46; x < v.x1; x += 46) ctx.fillRect(x, y, 24, 4);
    }
    // Crosswalks at intersections.
    ctx.fillStyle = 'rgba(240,240,240,0.5)';
    for (let x = Math.floor(v.x0 / WORLD.cell) * WORLD.cell; x < v.x1; x += WORLD.cell) {
      for (let y = Math.floor(v.y0 / WORLD.cell) * WORLD.cell; y < v.y1; y += WORLD.cell) {
        for (let s = 0; s < 4; s += 1) { ctx.fillRect(x + 8 + s * 20, y + 2, 10, 5); ctx.fillRect(x + 8 + s * 20, y + WORLD.road - 7, 10, 5); }
      }
    }
  }

  function drawBuildings(G, cam) {
    const v = visible(cam, 160);
    for (const b of G.city.buildings) {
      if (b.x > v.x1 || b.x + b.w < v.x0 || b.y > v.y1 || b.y + b.h < v.y0) continue;
      const lift = b.height * 0.55;
      // Drop shadow, then the sunlit wall, then the roof face lifted north-west.
      ctx.fillStyle = 'rgba(60,40,20,0.30)';
      ctx.fillRect(b.x + 10, b.y + 12, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x - lift * 0.4, b.y - lift * 0.5, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(b.x - lift * 0.4, b.y - lift * 0.5, b.w, b.h);
      // Window grid on the roof face reads as the lit facade at this angle.
      ctx.fillStyle = 'rgba(255,244,190,0.75)';
      const cols = Math.max(2, Math.floor(b.w / 22));
      const rows = Math.max(2, Math.floor(b.h / 22));
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if ((cx * 7 + cy * 13 + b.windows) % 3 === 0) continue;
          ctx.fillRect(b.x - lift * 0.4 + 7 + cx * 22, b.y - lift * 0.5 + 7 + cy * 22, 9, 12);
        }
      }
      if (b.neon) {
        ctx.fillStyle = b.neon;
        ctx.globalAlpha = 0.85 + Math.sin(G.time * 3 + b.x) * 0.15;
        ctx.fillRect(b.x - lift * 0.4 + 6, b.y - lift * 0.5 + b.h - 12, Math.min(56, b.w - 12), 5);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawProps(G, cam) {
    const v = visible(cam, 60);
    for (const p of G.city.props) {
      if (p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1) continue;
      if (p.kind === 'lamp') {
        ctx.fillStyle = '#555';
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        ctx.fillStyle = 'rgba(255,220,130,0.5)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
      } else {
        const sway = Math.sin(G.time * 1.4 + p.sway) * 2;
        ctx.strokeStyle = '#8a6642';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + sway, p.y - 10); ctx.stroke();
        ctx.strokeStyle = '#2e9e4f';
        ctx.lineWidth = 2.4;
        for (let f = 0; f < 6; f += 1) {
          const a = (f / 6) * Math.PI * 2 + p.sway;
          ctx.beginPath();
          ctx.moveTo(p.x + sway, p.y - 10);
          ctx.lineTo(p.x + sway + Math.cos(a) * 13, p.y - 10 + Math.sin(a) * 8);
          ctx.stroke();
        }
      }
    }
  }

  function drawPickups(G) {
    const icons = { health: ['#fff', '#e74c3c', '+'], armor: ['#7fb3d5', '#1a5276', 'A'], pistol: ['#ffd166', '#7d6608', '9'], smg: ['#ffd166', '#7d6608', 'S'], shotgun: ['#ffd166', '#7d6608', 'B'], cash: ['#7dff6a', '#1e8449', '$'] };
    for (const p of G.city.pickups) {
      if (p.taken) continue;
      const bob = Math.sin(p.bob) * 3;
      const [bg, fg, glyph] = icons[p.kind];
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(p.x, p.y + 8, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fg;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(glyph, p.x, p.y + bob + 4);
    }
  }

  function drawMarker(G, cam) {
    const target = G.currentTarget();
    if (!target) return;
    const pulse = 16 + Math.sin(G.time * 4) * 4;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2); ctx.stroke();
    const grad = ctx.createLinearGradient(0, target.y - 260, 0, target.y);
    grad.addColorStop(0, 'rgba(255,215,0,0)');
    grad.addColorStop(1, 'rgba(255,215,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(target.x - 9, target.y - 260, 18, 260);
    // Off-screen direction arrow.
    const dx = target.x - cam.x;
    const dy = target.y - cam.y;
    if (Math.abs(dx) > view.w / 2 - 60 || Math.abs(dy) > view.h / 2 - 60) {
      const a = Math.atan2(dy, dx);
      const ax = cam.x + Math.cos(a) * (view.w / 2 - 44);
      const ay = cam.y + Math.sin(a) * (view.h / 2 - 44);
      ctx.fillStyle = '#ffd700';
      ctx.save();
      ctx.translate(ax, ay); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawCar(G, car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-20, -9, 46, 26);
    ctx.fillStyle = car.dead ? '#2b2b2b' : car.model.color;
    ctx.beginPath();
    ctx.roundRect(-23, -12, 46, 24, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,45,0.9)';
    ctx.fillRect(-4, -10, 13, 20);       // windshield + cabin
    ctx.fillRect(-16, -9, 6, 18);        // rear window
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(-17, -14, 9, 4); ctx.fillRect(9, -14, 9, 4);
    ctx.fillRect(-17, 10, 9, 4); ctx.fillRect(9, 10, 9, 4);
    ctx.fillStyle = '#fff8b0';
    ctx.fillRect(21, -9, 2.6, 5); ctx.fillRect(21, 4, 2.6, 5);
    ctx.fillStyle = '#ff5a4d';
    ctx.fillRect(-23.5, -9, 2.4, 5); ctx.fillRect(-23.5, 4, 2.4, 5);
    if (car.isPolice) {
      ctx.fillStyle = '#f5f6fa';
      ctx.fillRect(-12, -12, 20, 24);
      ctx.fillStyle = Math.floor(G.time * 3) % 2 ? '#ff3b30' : '#2e86ff';
      ctx.fillRect(-3, -6, 7, 12);
      ctx.fillStyle = '#2d3e50';
      ctx.font = 'bold 6px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SBPD', 2, 2);
    }
    if (car === G.missionCar) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-26, -15, 52, 30, 7); ctx.stroke();
    }
    ctx.restore();
    if (car.health < 55 && !car.dead) {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(car.x - 16, car.y - 24, 32, 4);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(car.x - 16, car.y - 24, 32 * Math.max(0, car.health) / 100, 4);
    }
  }

  function drawPerson(G, person, isPlayer) {
    const down = person.downTimer > 0 || person.dead;
    ctx.save();
    ctx.translate(person.x, person.y);
    if (down) {
      ctx.rotate(person.angle + Math.PI / 2);
      ctx.fillStyle = person.shirt;
      ctx.beginPath(); ctx.roundRect(-13, -6, 26, 12, 6); ctx.fill();
      ctx.fillStyle = person.skin;
      ctx.beginPath(); ctx.arc(15, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.rotate(person.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.arc(2, 3, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = person.shirt;
    ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = person.skin;
    ctx.beginPath(); ctx.arc(1.5, 0, 5.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isPlayer ? '#123' : 'rgba(0,0,0,0.55)';
    ctx.fillRect(4, -1.4, isPlayer ? 7 : 5, 2.8); // cap brim / hair line in facing direction
    if (isPlayer || person.isEnemy || person.isCop) {
      const weapon = isPlayer ? G.player.weapon : 1;
      if (weapon > 0) {
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(19, 4); ctx.stroke();
      }
    }
    ctx.restore();
    if (person.isCop) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', person.x, person.y - 14);
    }
    if ((person.isEnemy || person.isCop) && person.health < 55) {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(person.x - 12, person.y - 18, 24, 3.4);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(person.x - 12, person.y - 18, 24 * Math.max(0, person.health) / 60, 3.4);
    }
  }

  function drawParticles(G) {
    for (const p of G.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawWorld(G) {
    const cam = G.camera;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, view.h);
    sky.addColorStop(0, '#ffb26b');
    sky.addColorStop(1, '#ff8e63');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.w, view.h);
    const sx = G.shake ? (Math.random() - 0.5) * G.shake : 0;
    const sy = G.shake ? (Math.random() - 0.5) * G.shake : 0;
    ctx.translate(view.w / 2 - cam.x + sx, view.h / 2 - cam.y + sy);

    drawGround(G, cam);
    drawBuildings(G, cam);
    drawProps(G, cam);
    drawPickups(G);
    drawMarker(G, cam);
    for (const drop of G.cashDrops) {
      ctx.fillStyle = '#7dff6a';
      ctx.beginPath(); ctx.arc(drop.x, drop.y, 6 + Math.sin(G.time * 5 + drop.x) * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#145a24';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', drop.x, drop.y + 3);
    }
    for (const car of G.cars) drawCar(G, car);
    for (const ped of G.peds) drawPerson(G, ped, false);
    for (const e of G.enemies) drawPerson(G, e, false);
    for (const cop of G.cops) { if (cop.state === 'foot') drawPerson(G, cop, false); }
    if (!G.player.inCar) drawPerson(G, G.player, true);
    if (G.combat.muzzle > 0 && !G.player.inCar) {
      const a = G.player.angle;
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(G.player.x + Math.cos(a) * 30, G.player.y + Math.sin(a) * 30, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#ffe66d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const b of G.combat.bullets) {
      ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    drawParticles(G);

    // Warm sunset grade and a soft vignette over the world (never over the HUD).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255,140,60,0.07)';
    ctx.fillRect(0, 0, view.w, view.h);
    const vig = ctx.createRadialGradient(view.w / 2, view.h / 2, view.h * 0.45, view.w / 2, view.h / 2, view.h * 0.95);
    vig.addColorStop(0, 'rgba(20,10,40,0)');
    vig.addColorStop(1, 'rgba(20,10,40,0.30)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, view.w, view.h);
    if (G.hurtFlash > 0) {
      ctx.fillStyle = `rgba(220,40,30,${Math.min(0.35, G.hurtFlash)})`;
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  return { drawWorld, view, ctx };
}

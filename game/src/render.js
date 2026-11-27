// Nusantara Sky Courier — chase-view renderer.
// One file, one job: project the 3D world onto the 2D canvas and draw it.
import { CAMERA, CANVAS_WIDTH, CANVAS_HEIGHT, FIELD } from './config.js';
import { terrainHeight } from './world.js';
import { fbm, mulberry32 } from './random.js';

export const LIGHTS = {
  noon: { top: '#2f6fb2', mid: '#9fd0e8', bot: '#d8eef7', sun: '#fff3c4', sunX: 0.78, sunY: 0.16 },
  dawn: { top: '#4a5a9e', mid: '#e8a56b', bot: '#f7d9a8', sun: '#ffd9a0', sunX: 0.2, sunY: 0.3 },
  golden: { top: '#35507e', mid: '#e8975a', bot: '#f9cf8e', sun: '#ffcf7d', sunX: 0.72, sunY: 0.34 },
  sunset: { top: '#2c2a5e', mid: '#c65f6e', bot: '#f2a56b', sun: '#ff9e66', sunX: 0.3, sunY: 0.42 },
};

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(a) {
  const len = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
}

function makeCamera(plane) {
  const forward = [Math.sin(plane.heading), 0, Math.cos(plane.heading)];
  const eye = [
    plane.x - forward[0] * CAMERA.distance,
    plane.y + CAMERA.height,
    plane.z - forward[2] * CAMERA.distance,
  ];
  const target = [
    plane.x + forward[0] * 30,
    plane.y - 3,
    plane.z + forward[2] * 30,
  ];
  const f = norm(sub(target, eye));
  const right = norm(cross(f, [0, 1, 0]));
  const up = cross(right, f);
  return { eye, f, right, up };
}

function project(camera, p, width, height) {
  const d = sub(p, camera.eye);
  const xc = dot(d, camera.right);
  const yc = dot(d, camera.up);
  const zc = dot(d, camera.f);
  if (zc < 1) return null;
  return {
    x: width / 2 + (xc / zc) * CAMERA.focal,
    y: height / 2 - (yc / zc) * CAMERA.focal,
    depth: zc,
  };
}

function shade(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((n & 255) * factor));
  return `rgb(${r},${g},${b})`;
}

function groundColor(height, x, z, seed) {
  const vary = 0.88 + fbm(x * 0.05, z * 0.05, seed) * 0.24;
  let base = '#5da24a';
  if (height < 2.5) base = '#d9c48f';
  else if (height < 12) base = '#5da24a';
  else if (height < 22) base = '#3d7a35';
  else if (height < 32) base = '#8a7f72';
  else base = '#5c4a42';
  return shade(base, vary);
}

function drawSky(ctx, light, width, height, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, light.top);
  gradient.addColorStop(0.55, light.mid);
  gradient.addColorStop(1, light.bot);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const sunX = light.sunX * width;
  const sunY = light.sunY * height;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
  glow.addColorStop(0, light.sun);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
  ctx.fillStyle = light.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
  void time;
}

function drawSea(ctx, camera, light, width, height) {
  const far = [camera.eye[0] + camera.f[0] * 900, 0, camera.eye[2] + camera.f[2] * 900];
  const horizon = project(camera, far, width, height);
  const horizonY = horizon ? horizon.y : height * 0.42;
  const gradient = ctx.createLinearGradient(0, horizonY, 0, height);
  gradient.addColorStop(0, '#2b7ea6');
  gradient.addColorStop(1, '#0d4d6e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, Math.max(0, horizonY), width, height - Math.max(0, horizonY));
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i += 1) {
    const y = horizonY + ((height - horizonY) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawClouds(ctx, camera, seed, width, height) {
  const rand = mulberry32(seed + 77);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 12; i += 1) {
    const cx = (rand() - 0.5) * 1100;
    const cz = (rand() - 0.5) * 1100;
    const cy = 120 + rand() * 50;
    const p = project(camera, [cx, cy, cz], width, height);
    if (!p || p.depth < 30) continue;
    const scale = Math.min(1.4, 320 / p.depth);
    const w = 90 * scale;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w, w * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - w * 0.5, p.y + 4, w * 0.6, w * 0.24, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + w * 0.5, p.y + 4, w * 0.6, w * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTerrain(ctx, camera, world, width, height) {
  const step = FIELD.gridStep;
  const half = FIELD.half;
  const quads = [];
  for (let gx = -half; gx < half; gx += step) {
    for (let gz = -half; gz < half; gz += step) {
      const corners = [
        [gx, terrainHeight(gx, gz, world.seed), gz],
        [gx + step, terrainHeight(gx + step, gz, world.seed), gz],
        [gx + step, terrainHeight(gx + step, gz + step, world.seed), gz + step],
        [gx, terrainHeight(gx, gz + step, world.seed), gz + step],
      ];
      const maxH = Math.max(corners[0][1], corners[1][1], corners[2][1], corners[3][1]);
      if (maxH < 0.4) continue;
      const projected = corners.map((c) => project(camera, c, width, height));
      if (projected.some((p) => p === null)) continue;
      const depth = projected.reduce((sum, p) => sum + p.depth, 0) / 4;
      const avgH = corners.reduce((sum, c) => sum + c[1], 0) / 4;
      quads.push({ depth, pts: projected, color: groundColor(avgH, gx + step / 2, gz + step / 2, world.seed) });
    }
  }
  quads.sort((a, b) => b.depth - a.depth);
  for (const quad of quads) {
    ctx.fillStyle = quad.color;
    ctx.beginPath();
    ctx.moveTo(quad.pts[0].x, quad.pts[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(quad.pts[i].x, quad.pts[i].y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRunway(ctx, camera, runway, width, height) {
  const along = [Math.sin(runway.heading), 0, Math.cos(runway.heading)];
  const across = [Math.cos(runway.heading), 0, -Math.sin(runway.heading)];
  const half = runway.length / 2;
  const w = runway.width / 2;
  const corners = [
    [runway.x + along[0] * half + across[0] * w, runway.elevation + 0.3, runway.z + along[2] * half + across[2] * w],
    [runway.x + along[0] * half - across[0] * w, runway.elevation + 0.3, runway.z + along[2] * half - across[2] * w],
    [runway.x - along[0] * half - across[0] * w, runway.elevation + 0.3, runway.z - along[2] * half - across[2] * w],
    [runway.x - along[0] * half + across[0] * w, runway.elevation + 0.3, runway.z - along[2] * half + across[2] * w],
  ];
  const pts = corners.map((c) => project(camera, c, width, height));
  if (pts.some((p) => p === null)) return;
  ctx.fillStyle = '#34383f';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5f5f0';
  for (let d = -half + 10; d < half - 6; d += 14) {
    const c1 = [runway.x + along[0] * d - across[0] * 0.8, runway.elevation + 0.4, runway.z + along[2] * d - across[2] * 0.8];
    const c2 = [runway.x + along[0] * d + across[0] * 0.8, runway.elevation + 0.4, runway.z + along[2] * d + across[2] * 0.8];
    const c3 = [runway.x + along[0] * (d + 6) + across[0] * 0.8, runway.elevation + 0.4, runway.z + along[2] * (d + 6) + across[2] * 0.8];
    const c4 = [runway.x + along[0] * (d + 6) - across[0] * 0.8, runway.elevation + 0.4, runway.z + along[2] * (d + 6) - across[2] * 0.8];
    const q = [c1, c2, c3, c4].map((c) => project(camera, c, width, height));
    if (q.some((p) => p === null)) continue;
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(q[i].x, q[i].y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRing(ctx, camera, ring, passed, width, height) {
  const normal = [0, 0, 1];
  const u = [1, 0, 0];
  const v = [0, 1, 0];
  void normal;
  void u;
  void v;
  const pts = [];
  for (let i = 0; i <= 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    const p = project(camera, [ring.x + Math.cos(a) * ring.r, ring.y + Math.sin(a) * ring.r, ring.z], width, height);
    if (p) pts.push(p);
  }
  if (pts.length < 4) return;
  const color = passed ? '#39d353' : '#ffc93c';
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function drawPlane(ctx, plane, time, width, height) {
  const px = width / 2;
  const py = height * 0.62 + Math.sin(plane.pitch) * 30;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(plane.roll);
  const scale = 1;
  ctx.scale(scale, scale);
  // Propeller blur.
  ctx.fillStyle = 'rgba(200,210,220,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -62, 7 + 3 * Math.sin(time * 40), 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail.
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.moveTo(-34, 38);
  ctx.lineTo(34, 38);
  ctx.lineTo(22, 52);
  ctx.lineTo(-22, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.moveTo(-6, 30);
  ctx.lineTo(6, 30);
  ctx.lineTo(4, 52);
  ctx.lineTo(-4, 52);
  ctx.closePath();
  ctx.fill();
  // Wings.
  ctx.fillStyle = '#f8f3e6';
  ctx.beginPath();
  ctx.moveTo(-96, -2);
  ctx.lineTo(-14, -12);
  ctx.lineTo(-10, 8);
  ctx.lineTo(-88, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(96, -2);
  ctx.lineTo(14, -12);
  ctx.lineTo(10, 8);
  ctx.lineTo(88, 16);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = '#f8f3e6';
  ctx.beginPath();
  ctx.moveTo(0, -64);
  ctx.quadraticCurveTo(14, -30, 13, 10);
  ctx.quadraticCurveTo(12, 44, 0, 52);
  ctx.quadraticCurveTo(-12, 44, -13, 10);
  ctx.quadraticCurveTo(-14, -30, 0, -64);
  ctx.closePath();
  ctx.fill();
  // Orange cheatline.
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.quadraticCurveTo(0, -2, 12, -6);
  ctx.stroke();
  // Canopy.
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.ellipse(0, -30, 8, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-3, -36, 3, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Registration on the tail.
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PK-NSC', 0, 46);
  // Navigation lights.
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(-96, 6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(96, 6, 4, 0, Math.PI * 2);
  ctx.fill();
  // Landing gear.
  if (plane.gear) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 20);
    ctx.lineTo(-14, 34);
    ctx.moveTo(10, 20);
    ctx.lineTo(14, 34);
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(-14, 36, 4, 0, Math.PI * 2);
    ctx.arc(14, 36, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Draw one frame of the world (no HUD, no screens).
export function renderWorld(ctx, state) {
  const { plane, world, light, time } = state;
  const width = CANVAS_WIDTH;
  const height = CANVAS_HEIGHT;
  const camera = makeCamera(plane);
  drawSky(ctx, light, width, height, time);
  drawSea(ctx, camera, light, width, height);
  drawClouds(ctx, camera, world.seed, width, height);
  drawTerrain(ctx, camera, world, width, height);
  for (const runway of world.runways) drawRunway(ctx, camera, runway, width, height);
  world.rings.forEach((ring, index) => {
    const passed = state.missions ? state.missions.ringIndex > index : ring.passed;
    drawRing(ctx, camera, ring, passed, width, height);
  });
  drawPlane(ctx, plane, time, width, height);
}

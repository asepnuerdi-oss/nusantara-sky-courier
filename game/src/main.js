// Nusantara Sky Courier — the game loop and screens.
// One file, one job: wire input, physics, missions, rendering and HUD together.
import { STEP, CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { createWorld, onRunway, runwayById } from './world.js';
import { createPlane, stepPlane } from './physics.js';
import { createInput } from './input.js';
import { renderWorld, LIGHTS } from './render.js';
import { drawHud } from './hud.js';
import { createAudio } from './audio.js';
import { createMissions, onRing, onLanded, currentSortie } from './missions.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function newState(seed) {
  const world = createWorld(seed);
  const runway = runwayById(1);
  const plane = createPlane(runway.x, runway.z, runway.heading);
  plane.y = runway.elevation + 0.6;
  return {
    seed,
    world,
    plane,
    missions: createMissions(),
    screen: 'title',
    time: 0,
    light: LIGHTS.dawn,
    lights: LIGHTS,
    wind: { x: 0, z: 0 },
  };
}

function drawPanel(title, lines, accent) {
  ctx.fillStyle = 'rgba(8,18,32,0.72)';
  ctx.fillRect(240, 150, 800, 420);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(240, 150, 800, 420);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(title, CANVAS_WIDTH / 2, 220);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  lines.forEach((line, index) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, 270 + index * 34);
  });
}

function drawScreen(state) {
  const { plane, missions } = state;
  if (state.screen === 'title') {
    drawPanel('NUSANTARA SKY COURIER', [
      'Kurir udara antar pulau: Ring Run, Island Hop, dan Storm Courier.',
      'Keyboard: panah = pitch & belok · W/S atau Shift = throttle · G = roda · F = flap',
      'Mouse: gerakkan untuk mengemudi, tahan klik untuk tambah throttle.',
      'Mendaratlah dengan pelan di landasan — bahan bakar dan lambung terbatas.',
      'Tekan Enter atau klik untuk terbang.',
    ], '#ffd166');
  } else if (state.screen === 'pause') {
    drawPanel('JEDA', ['Tekan P untuk lanjut terbang.', `Skor sementara: ${missions.score}`], '#7dd3fc');
  } else if (state.screen === 'crashed') {
    drawPanel('PESAWAT JATUH', [
      'Bahan bakar dan lambung tidak bisa menyelamatkan sortie ini.',
      `Skor akhir: ${missions.score} · Sortie: ${currentSortie(missions).name}`,
      'Tekan R untuk terbang lagi.',
    ], '#f87171');
  } else if (state.screen === 'victory') {
    drawPanel('MISI SELESAI!', [
      'Paket terkirim ke Pulau Banda. Kamu Kurir Nusantara sejati.',
      `Skor akhir: ${missions.score}`,
      'Tekan R untuk terbang lagi.',
    ], '#4ade80');
  }
  void plane;
}

function checkRing(state) {
  const { plane, world, missions } = state;
  if (missions.sortie !== 0 || missions.ringIndex >= world.rings.length) return;
  const ring = world.rings[missions.ringIndex];
  const dx = plane.x - ring.x;
  const dy = plane.y - ring.y;
  const dz = plane.z - ring.z;
  if (Math.sqrt(dx * dx + dy * dy + dz * dz) < ring.r + 4) {
    ring.passed = true;
    onRing(missions, state.time);
    state.audio.ring();
  }
}

function update(state, input, dt) {
  const controls = input.controls();
  const { plane, missions } = state;

  if (controls.mute) state.audio.toggleMute();
  if (state.screen === 'title' && (controls.start || controls.restart)) {
    state.audio.ensure();
    state.screen = 'play';
    missions.startedAt = state.time;
  }
  if (state.screen === 'play' && controls.pause) state.screen = 'pause';
  else if (state.screen === 'pause' && controls.pause) state.screen = 'play';
  if ((state.screen === 'crashed' || state.screen === 'victory') && controls.restart) {
    resetRun(state);
    return;
  }
  if (state.screen !== 'play') return;

  if (controls.gear) plane.gear = !plane.gear;
  if (controls.flaps) plane.flaps = !plane.flaps;

  // Storm Courier: gusts push the aeroplane sideways.
  if (missions.sortie === 2) {
    state.wind.x = Math.sin(state.time * 0.4) * 7;
    state.wind.z = Math.cos(state.time * 0.33) * 5;
  } else {
    state.wind.x = 0;
    state.wind.z = 0;
  }

  const result = stepPlane(plane, controls, state.world, dt);
  plane.x += state.wind.x * dt;
  plane.z += state.wind.z * dt;

  if (result === 'landed') {
    const strip = state.world.runways.find((runway) => onRunway(plane.x, plane.z, runway));
    if (strip) {
      const outcome = onLanded(missions, strip.id, state.time, 0);
      state.audio.land();
      if (outcome === 'victory') state.screen = 'victory';
    }
  } else if (result === 'crashed') {
    state.screen = 'crashed';
    state.audio.crash();
  }
  checkRing(state);
  state.audio.update(plane.throttle, plane.speed, state.screen === 'play');
}

function resetRun(state) {
  const fresh = newState(state.seed);
  state.world = fresh.world;
  state.plane = fresh.plane;
  state.missions = fresh.missions;
  state.screen = 'title';
  state.light = LIGHTS.dawn;
  state.wind = { x: 0, z: 0 };
}

function frame(state, input) {
  renderWorld(ctx, state);
  if (state.screen !== 'title') drawHud(ctx, state);
  drawScreen(state);
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') ?? 1) || 1;
  const shot = params.get('shot');
  const state = newState(seed);
  state.audio = createAudio();
  const input = createInput(canvas);

  canvas.addEventListener('pointerdown', () => {
    state.audio.ensure();
    if (state.screen === 'title') {
      state.screen = 'play';
      state.missions.startedAt = state.time;
    }
  });

  if (shot) {
    const staged = stageShot(shot, state);
    state.screen = staged.screen;
    state.missions.startedAt = 0;
    frame(state, input);
    return;
  }

  let last = performance.now();
  let accumulator = 0;
  function loop(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    state.time += elapsed;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      update(state, input, STEP);
      accumulator -= STEP;
    }
    frame(state, input);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot();

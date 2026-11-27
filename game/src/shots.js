// Nusantara Sky Courier — deterministic screenshot scenes.
// One file, one job: stage the named shot by flying the real rules forward
// from a fresh world, so the same seed always gives the same frame.
import { STEP } from './config.js';
import { stepPlane, createPlane } from './physics.js';
import { runwayById } from './world.js';

// A simple autopilot: steer toward a target point and hold an altitude.
function autopilotInput(plane, target, speedTarget) {
  const desiredHeading = Math.atan2(target.x - plane.x, target.z - plane.z);
  let error = desiredHeading - plane.heading;
  while (error > Math.PI) error -= Math.PI * 2;
  while (error < -Math.PI) error += Math.PI * 2;
  const roll = Math.max(-1, Math.min(1, error * 1.6));
  const altError = target.y - plane.y;
  const pitch = Math.max(-1, Math.min(1, altError * 0.03 + 0.08));
  const throttleDelta = plane.speed < speedTarget ? 0.8 : plane.speed > speedTarget + 6 ? -0.8 : 0;
  return { pitch, roll, throttleDelta, brake: false };
}

function flyFor(plane, world, seconds, steer) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = steer(plane);
    const result = stepPlane(plane, input, world, STEP);
    if (result === 'crashed') break;
    if (result === 'landed') break;
  }
}

function parkOnRunway(plane, runway, heading) {
  plane.x = runway.x;
  plane.z = runway.z;
  plane.y = runway.elevation + 0.6;
  plane.heading = heading;
  plane.pitch = 0;
  plane.roll = 0;
  plane.speed = 0;
  plane.throttle = 0;
  plane.gear = true;
}

// Set the world to the named scene and return the screen to draw over it.
export function stageShot(name, state) {
  const { world, missions } = state;
  const plane = state.plane;
  missions.ringIndex = 0;
  missions.landings = [];
  missions.finished = false;
  missions.score = 0;

  if (name === 'play') {
    state.light = state.lights.noon;
    plane.x = -60;
    plane.y = 42;
    plane.z = -10;
    plane.heading = Math.atan2(100, 50);
    plane.speed = 58;
    plane.throttle = 0.7;
    plane.gear = false;
    const ring = world.rings[1];
    flyFor(plane, world, 14, (p) => autopilotInput(p, ring, 58));
    return { screen: 'play' };
  }

  if (name === 'approach') {
    state.light = state.lights.golden;
    const runway = runwayById(2);
    plane.x = runway.x - 380;
    plane.z = runway.z;
    plane.y = 62;
    plane.heading = runway.heading;
    plane.speed = 50;
    plane.throttle = 0.35;
    plane.gear = true;
    plane.flaps = true;
    missions.message = 'FINAL — Pulau Komodo';
    missions.messageUntil = 999;
    flyFor(plane, world, 16, (p) => {
      const target = { x: runway.x, y: 6, z: runway.z };
      return autopilotInput(p, target, 48);
    });
    return { screen: 'play' };
  }

  if (name === 'end') {
    state.light = state.lights.sunset;
    const runway = runwayById(3);
    parkOnRunway(plane, runway, runway.heading);
    missions.score = 1240;
    missions.finished = true;
    missions.message = 'Misi selesai — Paket terkirim!';
    missions.messageUntil = 999;
    return { screen: 'victory' };
  }

  // Default: the start scene.
  state.light = state.lights.dawn;
  const runway = runwayById(1);
  parkOnRunway(plane, runway, runway.heading);
  plane.throttle = 0;
  return { screen: 'title' };
}

export { createPlane };

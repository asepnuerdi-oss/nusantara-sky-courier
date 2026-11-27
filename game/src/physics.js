// Nusantara Sky Courier — flight physics.
// One file, one job: step the aeroplane one fixed timestep, no drawing.
import { PLANE, STEP } from './config.js';
import { onRunway, terrainHeight } from './world.js';

export function createPlane(x, z, heading) {
  return {
    x, y: 6, z,
    heading, pitch: 0, roll: 0,
    speed: 0, throttle: 0,
    fuel: PLANE.fuelCapacity, damage: 0,
    gear: true, flaps: false,
    verticalSpeed: 0, stalled: false,
    landed: false, crashed: false,
  };
}

// input: { pitch: -1..1 (up positive), roll: -1..1 (right positive),
//          throttleDelta, brake, gearToggle, flapsToggle }
export function stepPlane(plane, input, world, dt = STEP) {
  if (plane.crashed) return 'crashed';

  plane.throttle = Math.min(1, Math.max(0, plane.throttle + input.throttleDelta * dt));
  if (input.brake) plane.throttle = Math.max(0, plane.throttle - 0.9 * dt);

  const targetRoll = input.roll * (PLANE.maxBankDeg * Math.PI) / 180;
  plane.roll += (targetRoll - plane.roll) * Math.min(1, 3.2 * dt);
  const targetPitch = input.pitch * (PLANE.maxPitchDeg * Math.PI) / 180;
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, 2.6 * dt);

  const targetSpeed = plane.throttle * PLANE.maxSpeed;
  const drag = plane.flaps ? 0.55 : 0.4;
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, drag * dt);
  if (plane.speed < 0) plane.speed = 0;

  // Bank turns the nose; pitch climbs or sinks the nose.
  plane.heading += -plane.roll * PLANE.turnAuthority * (plane.speed / PLANE.cruiseSpeed) * dt;
  const climb = Math.sin(plane.pitch) * plane.speed * PLANE.climbAuthority;
  plane.stalled = plane.speed < PLANE.stallSpeed && plane.y > 2;
  const sink = plane.stalled ? 9 : 1.2;
  plane.verticalSpeed = climb - sink * Math.max(0, 1 - plane.speed / PLANE.cruiseSpeed);
  if (plane.y <= 0.5 && plane.speed < 2) plane.verticalSpeed = 0;

  plane.x += Math.sin(plane.heading) * plane.speed * dt;
  plane.z += Math.cos(plane.heading) * plane.speed * dt;
  plane.y += plane.verticalSpeed * dt;

  const burn = PLANE.fuelIdle + plane.throttle * PLANE.fuelFull;
  plane.fuel = Math.max(0, plane.fuel - burn * dt);
  if (plane.fuel <= 0) plane.throttle = 0;

  const ground = terrainHeight(plane.x, plane.z, world.seed);
  if (plane.y <= ground + 0.6) {
    const runway = world.runways.find((strip) => onRunway(plane.x, plane.z, strip));
    // A fast roll with the nose up is a takeoff, not a crash.
    if (runway && plane.gear && plane.speed >= PLANE.stallSpeed && input.pitch > 0.15) {
      plane.y = ground + 0.7;
      plane.landed = false;
      return 'flying';
    }
    const gentle = Math.abs(plane.verticalSpeed) <= PLANE.landSinkLimit;
    if (runway && gentle && plane.gear && plane.y > 0.5) {
      plane.y = ground + 0.6;
      plane.landed = true;
      if (plane.speed > PLANE.gearSpeedLimit) plane.damage = Math.min(100, plane.damage + 12 * dt);
      plane.speed = Math.max(0, plane.speed - 26 * dt);
      if (plane.speed <= 0.5) return 'landed';
      return 'rolling';
    }
    plane.y = ground + 0.6;
    plane.crashed = true;
    plane.damage = 100;
    return 'crashed';
  }
  if (plane.y < 0.4) {
    plane.y = 0.4;
    plane.crashed = true;
    plane.damage = 100;
    return 'crashed';
  }
  plane.landed = false;
  return 'flying';
}

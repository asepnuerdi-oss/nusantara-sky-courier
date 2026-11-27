// Nusantara Sky Courier — shared tuning constants.
// One file, one job: every number the rest of the game agrees on.
export const STEP = 1 / 60;
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const FIELD = { half: 560, gridStep: 40 };
export const PLANE = {
  maxSpeed: 92,
  cruiseSpeed: 58,
  stallSpeed: 34,
  maxBankDeg: 58,
  maxPitchDeg: 24,
  turnAuthority: 0.85,
  climbAuthority: 1.0,
  fuelCapacity: 100,
  // Fuel burn per second at idle and at full throttle.
  fuelIdle: 0.12,
  fuelFull: 0.85,
  gearSpeedLimit: 55,
  landSinkLimit: 7,
};
export const CAMERA = { distance: 26, height: 8.5, focal: 620 };
export const RING_RADIUS = 9;
export const SCORE = { ring: 120, landing: 250, sortieBonus: 300, timeBonusPerSec: 4 };
export const SHOTS = [
  { name: '1-start.jpg', query: '?shot=start&seed=1' },
  { name: '2-play.jpg', query: '?shot=play&seed=1' },
  { name: '3-approach.jpg', query: '?shot=approach&seed=1' },
  { name: '4-end.jpg', query: '?shot=end&seed=1' },
];

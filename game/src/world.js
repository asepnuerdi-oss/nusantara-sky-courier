// Nusantara Sky Courier — the archipelago.
// One file, one job: terrain height, islands, runways and rings, all from a seed.
import { fbm } from './random.js';

// Three hand-placed islands, each with its own character.
export const ISLANDS = [
  { name: 'Pulau Merak', x: -140, z: -90, radius: 150, peak: 26, volcano: false },
  { name: 'Pulau Komodo', x: 190, z: 130, radius: 175, peak: 34, volcano: true },
  { name: 'Pulau Banda', x: -60, z: 280, radius: 135, peak: 22, volcano: false },
];

export const RUNWAYS = [
  { id: 1, island: 'Pulau Merak', x: -140, z: -90, heading: Math.PI / 2, length: 90, width: 12, elevation: 4 },
  { id: 2, island: 'Pulau Komodo', x: 190, z: 130, heading: Math.PI / 2, length: 100, width: 12, elevation: 5 },
  { id: 3, island: 'Pulau Banda', x: -60, z: 280, heading: Math.PI / 2, length: 90, width: 12, elevation: 4 },
];

export const RINGS = [
  { x: -60, y: 42, z: -10, r: 9 },
  { x: 40, y: 50, z: 40, r: 9 },
  { x: 120, y: 44, z: 90, r: 9 },
  { x: 190, y: 56, z: 170, r: 9 },
  { x: 90, y: 40, z: 220, r: 9 },
];

export const SEA_LEVEL = 0;

function islandBump(x, z, island) {
  const dx = x - island.x;
  const dz = z - island.z;
  const d = Math.sqrt(dx * dx + dz * dz) / island.radius;
  if (d >= 1) return 0;
  const fall = Math.cos(d * Math.PI * 0.5);
  return island.peak * fall * fall;
}

function volcanoBump(x, z, island) {
  if (!island.volcano) return 0;
  const dx = x - (island.x + 18);
  const dz = z - (island.z - 12);
  const d = Math.sqrt(dx * dx + dz * dz) / 55;
  if (d >= 1) return 0;
  const fall = Math.cos(d * Math.PI * 0.5);
  return 24 * fall * fall;
}

// Height of the ground at (x, z). Sea floor sits below zero.
export function terrainHeight(x, z, seed) {
  let h = -9;
  for (const island of ISLANDS) {
    h = Math.max(h, islandBump(x, z, island) + volcanoBump(x, z, island));
  }
  if (h > 0) {
    h += (fbm(x * 0.02, z * 0.02, seed) - 0.5) * 5;
  }
  // Flatten the ground under each runway so landings read clearly.
  for (const runway of RUNWAYS) {
    const dx = x - runway.x;
    const dz = z - runway.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    const flat = 70;
    if (d < flat) {
      const t = d / flat;
      const blend = t * t * (3 - 2 * t);
      h = runway.elevation * (1 - blend) + h * blend;
    }
  }
  return h;
}

// True when (x, z) lies on the paved strip of the given runway.
export function onRunway(x, z, runway) {
  const dx = x - runway.x;
  const dz = z - runway.z;
  const along = dx * Math.sin(runway.heading) + dz * Math.cos(runway.heading);
  const across = dx * Math.cos(runway.heading) - dz * Math.sin(runway.heading);
  return Math.abs(along) <= runway.length / 2 && Math.abs(across) <= runway.width / 2;
}

export function runwayById(id) {
  return RUNWAYS.find((runway) => runway.id === id) ?? RUNWAYS[0];
}

// The world object the rest of the game shares.
export function createWorld(seed) {
  return {
    seed,
    islands: ISLANDS,
    runways: RUNWAYS,
    rings: RINGS.map((ring) => ({ ...ring, passed: false })),
  };
}

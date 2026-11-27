// Nusantara Sky Courier — the three sorties.
// One file, one job: objectives, scoring, and what happens on each event.
import { SCORE } from './config.js';
import { runwayById } from './world.js';

export const SORTIES = [
  {
    name: 'Ring Run',
    brief: 'Terbang melewati 5 ring emas di atas laut menuju Pulau Komodo.',
    target: 'ring',
  },
  {
    name: 'Island Hop',
    brief: 'Mendarat di landasan Pulau Komodo, lalu di Pulau Banda. Hemat bahan bakar.',
    target: 'land',
  },
  {
    name: 'Storm Courier',
    brief: 'Angin badai bertiup kencang. Antar paket ke landasan Pulau Banda sebelum bahan bakar habis.',
    target: 'deliver',
  },
];

export function createMissions() {
  return {
    sortie: 0,
    ringIndex: 0,
    landings: [],
    delivered: false,
    score: 0,
    message: '',
    messageUntil: 0,
    startedAt: 0,
    finished: false,
  };
}

export function currentSortie(missions) {
  return SORTIES[missions.sortie] ?? SORTIES[SORTIES.length - 1];
}

export function objectiveText(missions) {
  const sortie = currentSortie(missions);
  if (missions.finished) return 'Semua misi selesai — selamat, Kurir Nusantara!';
  if (sortie.target === 'ring') return `Ring Run: lewati ring ${missions.ringIndex + 1}/5`;
  if (sortie.target === 'land') {
    const next = missions.landings.length === 0 ? 'Pulau Komodo' : 'Pulau Banda';
    return `Island Hop: mendarat di ${next} (${missions.landings.length}/2)`;
  }
  return 'Storm Courier: antar paket ke Pulau Banda';
}

function say(missions, text, now) {
  missions.message = text;
  missions.messageUntil = now + 3.5;
}

export function onRing(missions, now) {
  missions.score += SCORE.ring;
  missions.ringIndex += 1;
  say(missions, `Ring ${missions.ringIndex}/5 dilewati! +${SCORE.ring}`, now);
  if (missions.ringIndex >= 5) {
    missions.score += SCORE.sortieBonus;
    missions.sortie = 1;
    missions.ringIndex = 0;
    say(missions, `Sortie 1 selesai! +${SCORE.sortieBonus} — lanjut Island Hop`, now);
    return 'sortie';
  }
  return 'ring';
}

export function onLanded(missions, runwayId, now, timeBonus = 0) {
  if (missions.landings.includes(runwayId)) return 'repeat';
  missions.landings.push(runwayId);
  missions.score += SCORE.landing + timeBonus;
  const runway = runwayById(runwayId);
  say(missions, `Mendarat di ${runway.island}! +${SCORE.landing + timeBonus}`, now);
  const sortie = currentSortie(missions);
  if (sortie.target === 'land' && missions.landings.length >= 2) {
    missions.score += SCORE.sortieBonus;
    missions.sortie = 2;
    say(missions, `Sortie 2 selesai! +${SCORE.sortieBonus} — lanjut Storm Courier`, now);
    return 'sortie';
  }
  if (sortie.target === 'deliver') {
    missions.delivered = true;
    missions.finished = true;
    missions.score += SCORE.sortieBonus;
    say(missions, `Paket terkirim! Misi selesai +${SCORE.sortieBonus}`, now);
    return 'victory';
  }
  return 'landed';
}

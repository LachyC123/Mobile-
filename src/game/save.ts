// Save system — versioned localStorage with corruption fallback.

import { DIVISIONS } from './constants';

export interface RankState {
  division: number; // index into DIVISIONS
  lp: number; // 0..99
  wins: number;
  losses: number;
  streak: number;
  bestDivision: number;
}

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  haptics: boolean;
  reducedShake: boolean;
}

export interface SaveData {
  version: number;
  rank: RankState;
  tutorialDone: boolean;
  clubName: string;
  settings: Settings;
}

const KEY = 'rushline.save.v1';
const VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8, music: 0.7, sfx: 0.9, muted: false, haptics: true, reducedShake: false,
};

export function freshSave(): SaveData {
  return {
    version: VERSION,
    rank: { division: 0, lp: 0, wins: 0, losses: 0, streak: 0, bestDivision: 0 },
    tutorialDone: false,
    clubName: 'Voltford City',
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== VERSION) return freshSave();
    const base = freshSave();
    return {
      version: VERSION,
      rank: { ...base.rank, ...(data.rank ?? {}) },
      tutorialDone: Boolean(data.tutorialDone),
      clubName: typeof data.clubName === 'string' ? data.clubName : base.clubName,
      settings: { ...base.settings, ...(data.settings ?? {}) },
    };
  } catch {
    return freshSave();
  }
}

export function persist(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full/blocked — session continues without persistence
  }
}

export function divisionOf(rank: RankState) {
  return DIVISIONS[Math.min(rank.division, DIVISIONS.length - 1)];
}

export function haptic(settings: Settings, ms = 18) {
  if (!settings.haptics) return;
  if (navigator.vibrate) navigator.vibrate(ms);
}

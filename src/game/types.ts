import type { ClassId } from './constants';

export type Team = 0 | 1; // 0 = home (player, bottom), 1 = away (bot, top)

export interface Tile {
  x: number;
  y: number;
}

export interface Athlete {
  id: string;
  team: Team;
  cls: ClassId;
  x: number;
  y: number;
  acted: boolean;
  hasBall: boolean;
}

export interface Ball {
  carrierId: string | null;
  x: number; // loose-ball position (valid when carrierId === null)
  y: number;
}

export type MatchPhase = 'play' | 'over';

export interface MatchState {
  seed: number;
  rngState: number; // external Rng instance is kept alongside; this is informational
  athletes: Athlete[];
  ball: Ball;
  score: [number, number];
  playsUsed: [number, number]; // plays each team has taken
  activeTeam: Team;
  ap: number;
  flow: [number, number];
  surge: [boolean, boolean]; // pending Flow surge for that team's next play
  suddenDeath: boolean;
  phase: MatchPhase;
  winner: Team | null;
  goalLimit: number; // goals to win (tutorial scrimmage uses 1)
  playLimit: number; // plays per team (0 = unlimited, tutorial setups)
}

// ── Events: the only channel from rules → presentation (vfx/audio/ui) ──

export type GameEvent =
  | { type: 'move'; athleteId: string; path: Tile[]; pickedUpBall: boolean }
  | { type: 'pass'; fromId: string; toId: string; interceptedById: string | null }
  | { type: 'shove'; shoverId: string; targetId: string; pushedTo: Tile | null; ballLooseAt: Tile | null }
  | { type: 'pickup'; athleteId: string }
  | { type: 'goal'; team: Team; scorerId: string }
  | { type: 'flow'; team: Team; value: number; surgeReady: boolean }
  | { type: 'playEnd'; team: Team }
  | { type: 'playStart'; team: Team; ap: number; suddenDeath: boolean }
  | { type: 'matchOver'; winner: Team }
  | { type: 'invalid'; reason: string };

export interface PassOption {
  targetId: string;
  tiles: Tile[]; // line tiles including endpoints
  interceptedById: string | null; // who would pick it off (null = safe)
}

export interface ShoveOption {
  targetId: string;
  pushTo: Tile | null; // where target lands (null = blocked, stays)
}

export interface ActionSet {
  moves: Tile[]; // reachable destinations
  paths: Map<string, Tile[]>; // "x,y" -> path
  passes: PassOption[];
  shoves: ShoveOption[];
}

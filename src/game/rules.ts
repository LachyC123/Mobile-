// RUSHLINE rules engine — pure, deterministic, presentation-free.
// All legality + resolution lives here. The renderer never decides anything.

import {
  COLS, ROWS, BASE_AP, SURGE_AP, FLOW_MAX, FLOW_PER_PASS, FLOW_PER_SHOVE,
  FLOW_PER_GOAL, GOALS_TO_WIN, MAX_PLAYS_PER_TEAM, CLASSES, CLASS_ORDER,
  HOME_GOAL_ROW, AWAY_GOAL_ROW,
} from './constants';
import { Rng } from './rng';
import type {
  Athlete, MatchState, GameEvent, ActionSet, PassOption, ShoveOption, Team, Tile,
} from './types';

const key = (x: number, y: number) => `${x},${y}`;
export const inBounds = (x: number, y: number) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
export const goalRowFor = (team: Team) => (team === 0 ? HOME_GOAL_ROW : AWAY_GOAL_ROW);

export function athleteAt(state: MatchState, x: number, y: number): Athlete | null {
  return state.athletes.find((a) => a.x === x && a.y === y) ?? null;
}

export function getAthlete(state: MatchState, id: string): Athlete {
  const a = state.athletes.find((t) => t.id === id);
  if (!a) throw new Error(`no athlete ${id}`);
  return a;
}

// ── Match setup ────────────────────────────────────────────────

export function newMatch(seed: number, opts?: { goalLimit?: number; playLimit?: number }): MatchState {
  const mk = (team: Team): Athlete[] => {
    // home (team 0) lines up at the bottom attacking row 0; away mirrors
    const homePos: Tile[] = [
      { x: 3, y: 7 }, // captain
      { x: 1, y: 8 }, { x: 5, y: 8 }, // rushers
      { x: 2, y: 9 }, { x: 4, y: 9 }, // guards
    ];
    return CLASS_ORDER.map((cls, i) => {
      const p = homePos[i];
      const y = team === 0 ? p.y : ROWS - 1 - p.y;
      return { id: `${team}:${i}`, team, cls, x: p.x, y, acted: false, hasBall: false };
    });
  };
  return {
    seed,
    rngState: seed,
    athletes: [...mk(0), ...mk(1)],
    ball: { carrierId: null, x: 3, y: 5 },
    score: [0, 0],
    playsUsed: [0, 0],
    activeTeam: 0,
    ap: BASE_AP,
    flow: [0, 0],
    surge: [false, false],
    suddenDeath: false,
    phase: 'play',
    winner: null,
    goalLimit: opts?.goalLimit ?? GOALS_TO_WIN,
    playLimit: opts?.playLimit ?? MAX_PLAYS_PER_TEAM,
  };
}

export function carrier(state: MatchState): Athlete | null {
  return state.ball.carrierId ? getAthlete(state, state.ball.carrierId) : null;
}

// ── Geometry helpers ───────────────────────────────────────────

/** Supercover line tiles from a→b (straight row/col/45° diagonal only). */
export function lineTiles(a: Tile, b: Tile): Tile[] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const out: Tile[] = [];
  for (let i = 0; i <= steps; i++) out.push({ x: a.x + sx * i, y: a.y + sy * i });
  return out;
}

const chebyshev = (a: Tile, b: Tile) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// ── Legal action computation ───────────────────────────────────

export function legalActions(state: MatchState, athleteId: string, rng?: Rng): ActionSet | null {
  if (state.phase !== 'play') return null;
  const a = getAthlete(state, athleteId);
  if (a.team !== state.activeTeam || a.acted || state.ap <= 0) return null;
  const def = CLASSES[a.cls];

  // movement: BFS up to spd, blocked by athletes (both teams)
  const moves: Tile[] = [];
  const paths = new Map<string, Tile[]>();
  const visited = new Map<string, Tile[]>();
  visited.set(key(a.x, a.y), []);
  let frontier: Tile[] = [{ x: a.x, y: a.y }];
  for (let step = 1; step <= def.spd; step++) {
    const next: Tile[] = [];
    for (const t of frontier) {
      for (let d = 0; d < 8; d++) {
        const nx = t.x + [1, 1, 0, -1, -1, -1, 0, 1][d];
        const ny = t.y + [0, 1, 1, 1, 0, -1, -1, -1][d];
        const k = key(nx, ny);
        if (!inBounds(nx, ny) || visited.has(k)) continue;
        if (athleteAt(state, nx, ny)) continue;
        const path = [...visited.get(key(t.x, t.y))!, { x: nx, y: ny }];
        visited.set(k, path);
        moves.push({ x: nx, y: ny });
        paths.set(k, path);
        next.push({ x: nx, y: ny });
      }
    }
    frontier = next;
  }

  // passes: carrier only, straight lines to teammates
  const passes: PassOption[] = [];
  if (a.hasBall) {
    for (const mate of state.athletes) {
      if (mate.team !== a.team || mate.id === a.id) continue;
      if (chebyshev(a, mate) > def.passRange) continue;
      const tiles = lineTiles(a, mate);
      if (!tiles) continue;
      let interceptedById: string | null = null;
      if (!def.threaded) {
        const inner = tiles.slice(1, -1);
        let best = Infinity;
        for (const opp of state.athletes) {
          if (opp.team === a.team) continue;
          for (const t of inner) {
            if (chebyshev(opp, t) <= 1) {
              const d = chebyshev(a, opp);
              if (d < best) { best = d; interceptedById = opp.id; }
              break;
            }
          }
        }
      }
      passes.push({ targetId: mate.id, tiles, interceptedById });
    }
  }

  // shoves: guards only, adjacent enemies
  const shoves: ShoveOption[] = [];
  if (def.canShove) {
    for (const opp of state.athletes) {
      if (opp.team === a.team) continue;
      if (chebyshev(a, opp) !== 1) continue;
      const dx = Math.sign(opp.x - a.x);
      const dy = Math.sign(opp.y - a.y);
      const tx = opp.x + dx;
      const ty = opp.y + dy;
      const free = inBounds(tx, ty) && !athleteAt(state, tx, ty);
      shoves.push({ targetId: opp.id, pushTo: free ? { x: tx, y: ty } : null });
    }
  }

  void rng;
  return { moves, paths, passes, shoves };
}

// ── Internal helpers ───────────────────────────────────────────

function addFlow(state: MatchState, team: Team, amount: number, events: GameEvent[]) {
  if (state.surge[team]) return; // already queued
  state.flow[team] = Math.min(FLOW_MAX, state.flow[team] + amount);
  if (state.flow[team] >= FLOW_MAX) {
    state.flow[team] = 0;
    state.surge[team] = true;
    events.push({ type: 'flow', team, value: FLOW_MAX, surgeReady: true });
  } else {
    events.push({ type: 'flow', team, value: state.flow[team], surgeReady: false });
  }
}

function checkGoal(state: MatchState, a: Athlete, events: GameEvent[]): boolean {
  if (!a.hasBall) return false;
  if (a.y !== goalRowFor(a.team)) return false;
  state.score[a.team]++;
  events.push({ type: 'goal', team: a.team, scorerId: a.id });
  addFlow(state, a.team, FLOW_PER_GOAL, events);
  if (state.score[a.team] >= state.goalLimit || state.suddenDeath) {
    state.phase = 'over';
    state.winner = a.team;
    events.push({ type: 'matchOver', winner: a.team });
  }
  return true;
}

/** Reset formations after a goal; conceding team takes the next play. */
export function resetKickoff(state: MatchState, concedingTeam: Team): GameEvent[] {
  const fresh = newMatch(state.seed, { goalLimit: state.goalLimit, playLimit: state.playLimit });
  const keepScore: [number, number] = [...state.score];
  const keepPlays: [number, number] = [...state.playsUsed];
  const keepFlow: [number, number] = [...state.flow];
  const keepSurge: [boolean, boolean] = [...state.surge];
  const keepSudden = state.suddenDeath;
  Object.assign(state, fresh);
  state.score = keepScore;
  state.playsUsed = keepPlays;
  state.flow = keepFlow;
  state.surge = keepSurge;
  state.suddenDeath = keepSudden;
  state.phase = 'play';
  return beginPlay(state, concedingTeam);
}

export function beginPlay(state: MatchState, team: Team): GameEvent[] {
  state.activeTeam = team;
  state.ap = state.surge[team] ? SURGE_AP : BASE_AP;
  state.surge[team] = false;
  for (const a of state.athletes) if (a.team === team) a.acted = false;
  return [{ type: 'playStart', team, ap: state.ap, suddenDeath: state.suddenDeath }];
}

// ── Action application ─────────────────────────────────────────

export function applyMove(state: MatchState, athleteId: string, x: number, y: number, rng: Rng): GameEvent[] {
  const acts = legalActions(state, athleteId, rng);
  if (!acts) return [{ type: 'invalid', reason: 'Athlete cannot act now.' }];
  const path = acts.paths.get(key(x, y));
  if (!path) return [{ type: 'invalid', reason: 'Cannot move there.' }];

  const a = getAthlete(state, athleteId);
  const events: GameEvent[] = [];
  a.x = x;
  a.y = y;
  a.acted = true;
  state.ap--;

  let pickedUp = false;
  if (!state.ball.carrierId && state.ball.x === x && state.ball.y === y) {
    state.ball.carrierId = a.id;
    a.hasBall = true;
    pickedUp = true;
    events.push({ type: 'pickup', athleteId: a.id });
  }
  events.unshift({ type: 'move', athleteId: a.id, path, pickedUpBall: pickedUp });

  if (!checkGoal(state, a, events)) {
    // moving through your own goal row with the ball is fine; only scoring row matters
  }
  return events;
}

export function applyPass(state: MatchState, athleteId: string, targetId: string, rng: Rng): GameEvent[] {
  const acts = legalActions(state, athleteId, rng);
  if (!acts) return [{ type: 'invalid', reason: 'Athlete cannot act now.' }];
  const opt = acts.passes.find((p) => p.targetId === targetId);
  if (!opt) return [{ type: 'invalid', reason: 'No passing lane.' }];

  const a = getAthlete(state, athleteId);
  const events: GameEvent[] = [];
  a.hasBall = false;
  a.acted = true;
  state.ap--;

  if (opt.interceptedById) {
    const thief = getAthlete(state, opt.interceptedById);
    state.ball.carrierId = thief.id;
    thief.hasBall = true;
    events.push({ type: 'pass', fromId: a.id, toId: targetId, interceptedById: thief.id });
    if (checkGoal(state, thief, events)) return events;
  } else {
    const mate = getAthlete(state, targetId);
    state.ball.carrierId = mate.id;
    mate.hasBall = true;
    events.push({ type: 'pass', fromId: a.id, toId: targetId, interceptedById: null });
    addFlow(state, a.team, FLOW_PER_PASS, events);
    if (checkGoal(state, mate, events)) return events;
  }
  return events;
}

export function applyShove(state: MatchState, athleteId: string, targetId: string, rng: Rng): GameEvent[] {
  const acts = legalActions(state, athleteId, rng);
  if (!acts) return [{ type: 'invalid', reason: 'Athlete cannot act now.' }];
  const opt = acts.shoves.find((s) => s.targetId === targetId);
  if (!opt) return [{ type: 'invalid', reason: 'No shove target.' }];

  const a = getAthlete(state, athleteId);
  const t = getAthlete(state, targetId);
  const events: GameEvent[] = [];
  a.acted = true;
  state.ap--;

  if (opt.pushTo) {
    t.x = opt.pushTo.x;
    t.y = opt.pushTo.y;
  }

  let ballLooseAt: Tile | null = null;
  if (t.hasBall) {
    t.hasBall = false;
    state.ball.carrierId = null;
    // ball pops to a free neighbor of the target's final tile (deterministic via rng)
    const free: Tile[] = [];
    for (let d = 0; d < 8; d++) {
      const nx = t.x + [1, 1, 0, -1, -1, -1, 0, 1][d];
      const ny = t.y + [0, 1, 1, 1, 0, -1, -1, -1][d];
      if (inBounds(nx, ny) && !athleteAt(state, nx, ny)) free.push({ x: nx, y: ny });
    }
    const spot = free.length ? free[rng.int(0, free.length - 1)] : { x: t.x, y: t.y };
    state.ball.x = spot.x;
    state.ball.y = spot.y;
    ballLooseAt = spot;
  }

  events.push({ type: 'shove', shoverId: a.id, targetId, pushedTo: opt.pushTo, ballLooseAt });
  addFlow(state, a.team, FLOW_PER_SHOVE, events);

  // a shoved carrier already standing on the goal line no longer holds the ball — no goal.
  return events;
}

export function endPlay(state: MatchState): GameEvent[] {
  if (state.phase !== 'play') return [];
  const team = state.activeTeam;
  state.playsUsed[team]++;
  const events: GameEvent[] = [{ type: 'playEnd', team }];

  // match clock: after both teams used all plays
  if (state.playLimit > 0 && !state.suddenDeath &&
      state.playsUsed[0] >= state.playLimit && state.playsUsed[1] >= state.playLimit) {
    if (state.score[0] !== state.score[1]) {
      state.phase = 'over';
      state.winner = state.score[0] > state.score[1] ? 0 : 1;
      events.push({ type: 'matchOver', winner: state.winner });
      return events;
    }
    state.suddenDeath = true;
  }
  events.push(...beginPlay(state, team === 0 ? 1 : 0));
  return events;
}

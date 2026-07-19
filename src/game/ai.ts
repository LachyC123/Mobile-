// RUSHLINE bot — utility AI. Chooses one action at a time, re-evaluating
// after each, until AP runs out or nothing scores positively.

import { CLASSES, COLS, ROWS } from './constants';
import type { DivisionDef } from './constants';
import {
  legalActions, applyMove, applyPass, applyShove, carrier, goalRowFor,
} from './rules';
import { Rng } from './rng';
import type { Athlete, GameEvent, MatchState, Team, Tile } from './types';

interface BotAction {
  kind: 'move' | 'pass' | 'shove';
  athleteId: string;
  x?: number;
  y?: number;
  targetId?: string;
  score: number;
}

const dist = (a: Tile, b: Tile) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const manhattan = (a: Tile, b: Tile) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function enemiesOf(state: MatchState, team: Team): Athlete[] {
  return state.athletes.filter((a) => a.team !== team);
}

function progressOf(team: Team, y: number): number {
  // tiles advanced toward the scoring row, normalized 0..1
  return team === 0 ? (ROWS - 1 - y) / (ROWS - 1) : y / (ROWS - 1);
}

function dangerAt(state: MatchState, team: Team, t: Tile): number {
  // how many enemies could reach/shove this tile soon
  let d = 0;
  for (const e of enemiesOf(state, team)) {
    const dd = dist(e, t);
    if (dd <= 1) d += 3;
    else if (dd <= 2) d += 1;
  }
  return d;
}

function evaluate(state: MatchState, team: Team, div: DivisionDef, rng: Rng): BotAction | null {
  const cands: BotAction[] = [];
  const mine = state.athletes.filter((a) => a.team === team && !a.acted);
  if (!mine.length || state.ap <= 0) return null;
  const ballCarrier = carrier(state);
  const goalRow = goalRowFor(team);

  for (const a of mine) {
    const acts = legalActions(state, a.id, rng);
    if (!acts) continue;

    // ── shoves ──
    for (const s of acts.shoves) {
      const target = state.athletes.find((t) => t.id === s.targetId)!;
      let sc = 2;
      if (target.hasBall) sc += 14; // popping the core loose is huge
      if (s.pushTo && s.pushTo.y === goalRowFor(target.team) && target.hasBall) sc += 4;
      if (!s.pushTo && !target.hasBall) sc -= 1.5; // shoving into boards for nothing
      cands.push({ kind: 'shove', athleteId: a.id, targetId: s.targetId, score: sc });
    }

    // ── passes ──
    for (const p of acts.passes) {
      const mate = state.athletes.find((t) => t.id === p.targetId)!;
      if (p.interceptedById) {
        // dumb divisions sometimes throw risky passes
        const gamble = div.avoidsRisk ? -30 : (rng.next() < 0.25 ? 1 : -30);
        cands.push({ kind: 'pass', athleteId: a.id, targetId: p.targetId, score: gamble });
        continue;
      }
      let sc = 3;
      sc += (progressOf(team, mate.y) - progressOf(team, a.y)) * 10; // forward is good
      if (mate.y === goalRow) sc += 60; // pass that scores
      sc -= dangerAt(state, team, mate) * 1.2; // into traffic is bad
      if (dist(mate, { x: 3, y: goalRow }) < dist(a, { x: 3, y: goalRow })) sc += 2;
      // backward safety pass when carrier is about to get shoved
      if (a.hasBall && dangerAt(state, team, a) >= 3 && progressOf(team, mate.y) < progressOf(team, a.y)) sc += 4;
      cands.push({ kind: 'pass', athleteId: a.id, targetId: p.targetId, score: sc });
    }

    // ── moves ──
    for (const m of acts.moves) {
      let sc = 0.5;
      const tileIsBall = !state.ball.carrierId && state.ball.x === m.x && state.ball.y === m.y;

      if (tileIsBall) sc += 22; // grab the loose core
      if (a.hasBall) {
        if (m.y === goalRow) sc += 100; // SCORE
        sc += (progressOf(team, m.y) - progressOf(team, a.y)) * 8;
        sc -= dangerAt(state, team, m) * (div.avoidsRisk ? 2.4 : 1.4);
        // keep central lanes
        sc -= Math.abs(m.x - 3) * 0.3;
      } else if (ballCarrier && ballCarrier.team !== team) {
        // defending: close down the carrier; guards hug them, others contain
        const before = dist(a, ballCarrier);
        const after = dist(m, ballCarrier);
        sc += (before - after) * (a.cls === 'GUARD' ? 4 : 2);
        if (after === 1 && a.cls === 'GUARD') sc += 5; // get in shove range
        if (div.huntsInterceptions && after <= 2) sc += 1;
        // stay goal-side of the carrier
        const goalSide = team === 0 ? m.y > ballCarrier.y : m.y < ballCarrier.y;
        if (goalSide) sc += 2.5;
      } else if (ballCarrier && ballCarrier.team === team && ballCarrier.id !== a.id) {
        // support: get open upfield, away from markers
        sc += (progressOf(team, m.y) - progressOf(team, a.y)) * 3;
        sc -= dangerAt(state, team, m) * 0.8;
        const toCarrier = dist(m, ballCarrier);
        if (toCarrier >= 2 && toCarrier <= CLASSES[a.cls].passRange) sc += 2; // stay a passing option
      } else {
        // loose ball race
        const ballTile = { x: state.ball.x, y: state.ball.y };
        sc += (manhattan(a, ballTile) - manhattan(m, ballTile)) * 5;
      }
      cands.push({ kind: 'move', athleteId: a.id, x: m.x, y: m.y, score: sc });
    }
  }

  if (!cands.length) return null;
  for (const c of cands) c.score += (rng.next() - 0.5) * div.noise;
  cands.sort((x, y) => y.score - x.score);
  const best = cands[0];
  return best.score > 1.2 ? best : null; // threshold: don't fidget
}

export interface BotStep {
  events: GameEvent[];
  action: BotAction;
}

/** Execute one bot action; caller animates, then asks for the next. */
export function botStep(state: MatchState, team: Team, div: DivisionDef, rng: Rng): BotStep | null {
  const action = evaluate(state, team, div, rng);
  if (!action) return null;
  let events: GameEvent[];
  if (action.kind === 'move') events = applyMove(state, action.athleteId, action.x!, action.y!, rng);
  else if (action.kind === 'pass') events = applyPass(state, action.athleteId, action.targetId!, rng);
  else events = applyShove(state, action.athleteId, action.targetId!, rng);
  return { events, action };
}

// Columns used for tiny heuristics above
void COLS;

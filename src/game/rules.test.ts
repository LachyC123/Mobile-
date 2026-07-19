// Rules engine tests — the pure core of RUSHLINE, exercised without any DOM.

import { describe, expect, it } from 'vitest';
import {
  BASE_AP, COLS, FLOW_MAX, GOALS_TO_WIN, HOME_GOAL_ROW, ROWS, SURGE_AP,
} from './constants';
import { Rng } from './rng';
import {
  applyMove, applyPass, applyShove, beginPlay, endPlay, getAthlete,
  legalActions, newMatch, resetKickoff,
} from './rules';
import type { MatchState } from './types';

function giveBall(s: MatchState, id: string) {
  for (const a of s.athletes) a.hasBall = false;
  const a = getAthlete(s, id);
  a.hasBall = true;
  s.ball.carrierId = id;
}

function place(s: MatchState, id: string, x: number, y: number) {
  const a = getAthlete(s, id);
  a.x = x;
  a.y = y;
}

describe('match setup', () => {
  it('fields five athletes per team with a loose ball at midfield', () => {
    const s = newMatch(1);
    expect(s.athletes).toHaveLength(10);
    expect(s.athletes.filter((a) => a.team === 0)).toHaveLength(5);
    expect(s.ball.carrierId).toBeNull();
    expect(s.ball).toMatchObject({ x: 3, y: 5 });
    expect(s.activeTeam).toBe(0);
    expect(s.ap).toBe(BASE_AP);
    expect(s.goalLimit).toBe(GOALS_TO_WIN);
    // nobody stacks a tile
    const keys = new Set(s.athletes.map((a) => `${a.x},${a.y}`));
    expect(keys.size).toBe(10);
  });
});

describe('movement', () => {
  it('limits paths to the athlete speed and keeps them in bounds', () => {
    const s = newMatch(2);
    const rng = new Rng(2);
    const acts = legalActions(s, '0:1', rng)!; // rusher, spd 3
    expect(acts.moves.length).toBeGreaterThan(0);
    for (const m of acts.moves) {
      const path = acts.paths.get(`${m.x},${m.y}`)!;
      expect(path.length).toBeLessThanOrEqual(3);
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThan(COLS);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.y).toBeLessThan(ROWS);
    }
  });

  it('cannot move onto an occupied tile', () => {
    const s = newMatch(3);
    const rng = new Rng(3);
    const acts = legalActions(s, '0:0', rng)!;
    for (const m of acts.moves) {
      expect(s.athletes.some((a) => a.x === m.x && a.y === m.y)).toBe(false);
    }
  });

  it('spends AP, marks the athlete acted, and picks up a loose ball', () => {
    const s = newMatch(4);
    const rng = new Rng(4);
    place(s, '0:1', 3, 6); // next to the loose ball at 3,5
    const events = applyMove(s, '0:1', 3, 5, rng);
    expect(events.some((e) => e.type === 'pickup')).toBe(true);
    expect(getAthlete(s, '0:1').hasBall).toBe(true);
    expect(s.ball.carrierId).toBe('0:1');
    expect(s.ap).toBe(BASE_AP - 1);
    expect(getAthlete(s, '0:1').acted).toBe(true);
    // same athlete cannot act twice in one play
    expect(legalActions(s, '0:1', rng)).toBeNull();
  });
});

describe('passing', () => {
  it('completes a safe straight pass and builds flow', () => {
    const s = newMatch(5);
    const rng = new Rng(5);
    place(s, '0:1', 3, 6);
    place(s, '0:0', 3, 4);
    giveBall(s, '0:1');
    const acts = legalActions(s, '0:1', rng)!;
    const opt = acts.passes.find((p) => p.targetId === '0:0')!;
    expect(opt.interceptedById).toBeNull();
    const events = applyPass(s, '0:1', '0:0', rng);
    expect(events.some((e) => e.type === 'pass' && e.interceptedById === null)).toBe(true);
    expect(s.ball.carrierId).toBe('0:0');
    expect(s.flow[0]).toBe(1);
  });

  it('is stolen by a rival standing beside the lane', () => {
    const s = newMatch(6);
    const rng = new Rng(6);
    place(s, '1:0', 6, 0); // move the away captain off the target tile
    place(s, '0:1', 3, 6);
    place(s, '0:2', 3, 3);
    place(s, '1:3', 2, 4); // enemy guard hugging the lane
    giveBall(s, '0:1');
    const acts = legalActions(s, '0:1', rng)!;
    const opt = acts.passes.find((p) => p.targetId === '0:2')!;
    expect(opt.interceptedById).toBe('1:3');
    applyPass(s, '0:1', '0:2', rng);
    expect(s.ball.carrierId).toBe('1:3');
    expect(s.flow[0]).toBe(0); // no flow for a turnover
  });

  it('captain threaded passes can never be intercepted', () => {
    const s = newMatch(7);
    const rng = new Rng(7);
    place(s, '1:0', 6, 0); // move the away captain off the target tile
    place(s, '0:0', 3, 6); // captain
    place(s, '0:1', 3, 3);
    place(s, '1:3', 2, 4);
    giveBall(s, '0:0');
    const acts = legalActions(s, '0:0', rng)!;
    const opt = acts.passes.find((p) => p.targetId === '0:1')!;
    expect(opt.interceptedById).toBeNull();
  });

  it('rejects bent or out-of-range lanes', () => {
    const s = newMatch(8);
    const rng = new Rng(8);
    place(s, '0:1', 0, 6);
    place(s, '0:2', 2, 5); // knight-shaped: not a straight line
    giveBall(s, '0:1');
    const acts = legalActions(s, '0:1', rng)!;
    expect(acts.passes.find((p) => p.targetId === '0:2')).toBeUndefined();
  });
});

describe('shoving', () => {
  it('pops the ball loose from a shoved carrier', () => {
    const s = newMatch(9);
    const rng = new Rng(9);
    place(s, '0:3', 3, 6); // guard
    place(s, '1:1', 3, 5); // enemy carrier
    giveBall(s, '1:1');
    const events = applyShove(s, '0:3', '1:1', rng);
    const shove = events.find((e) => e.type === 'shove')!;
    expect(shove.type === 'shove' && shove.ballLooseAt).toBeTruthy();
    expect(s.ball.carrierId).toBeNull();
    expect(getAthlete(s, '1:1').hasBall).toBe(false);
    expect(s.flow[0]).toBe(1);
  });

  it('only guards can shove', () => {
    const s = newMatch(10);
    const rng = new Rng(10);
    place(s, '0:1', 3, 6); // rusher
    place(s, '1:1', 3, 5);
    const acts = legalActions(s, '0:1', rng)!;
    expect(acts.shoves).toHaveLength(0);
  });
});

describe('scoring', () => {
  it('scores when the carrier reaches the goal row and ends at the goal limit', () => {
    const s = newMatch(11, { goalLimit: 1 });
    const rng = new Rng(11);
    place(s, '0:1', 3, 1);
    giveBall(s, '0:1');
    const events = applyMove(s, '0:1', 3, HOME_GOAL_ROW, rng);
    expect(events.some((e) => e.type === 'goal' && e.team === 0)).toBe(true);
    expect(events.some((e) => e.type === 'matchOver' && e.winner === 0)).toBe(true);
    expect(s.score[0]).toBe(1);
    expect(s.phase).toBe('over');
  });

  it('kickoff reset preserves score and hands the play to the conceder', () => {
    const s = newMatch(12);
    const rng = new Rng(12);
    place(s, '0:1', 3, 1);
    giveBall(s, '0:1');
    applyMove(s, '0:1', 3, HOME_GOAL_ROW, rng);
    expect(s.score[0]).toBe(1);
    const events = resetKickoff(s, 1);
    expect(s.score[0]).toBe(1);
    expect(s.activeTeam).toBe(1);
    expect(s.ball.carrierId).toBeNull();
    expect(events.some((e) => e.type === 'playStart' && e.team === 1)).toBe(true);
  });
});

describe('flow surge', () => {
  it('arms a surge at full flow and grants 5 AP next play', () => {
    const s = newMatch(13);
    const rng = new Rng(13);
    s.flow[0] = FLOW_MAX - 1;
    place(s, '0:1', 3, 6);
    place(s, '0:0', 3, 4);
    giveBall(s, '0:1');
    applyPass(s, '0:1', '0:0', rng);
    expect(s.surge[0]).toBe(true);
    expect(s.flow[0]).toBe(0);
    beginPlay(s, 0);
    expect(s.ap).toBe(SURGE_AP);
    expect(s.surge[0]).toBe(false); // consumed
  });
});

describe('play clock', () => {
  it('alternates teams and resets acted flags', () => {
    const s = newMatch(14);
    const rng = new Rng(14);
    applyMove(s, '0:1', 1, 7, rng);
    const events = endPlay(s);
    expect(s.activeTeam).toBe(1);
    expect(s.playsUsed[0]).toBe(1);
    expect(events.some((e) => e.type === 'playStart' && e.team === 1)).toBe(true);
    expect(s.athletes.filter((a) => a.team === 1).every((a) => !a.acted)).toBe(true);
  });

  it('enters sudden death when the play limit expires level', () => {
    const s = newMatch(15, { playLimit: 1 });
    endPlay(s); // home play 1 done
    expect(s.suddenDeath).toBe(false);
    endPlay(s); // away play 1 done, scores level
    expect(s.suddenDeath).toBe(true);
    expect(s.phase).toBe('play');
  });

  it('ends on points when the play limit expires with a leader', () => {
    const s = newMatch(16, { playLimit: 1 });
    s.score = [2, 1];
    endPlay(s);
    endPlay(s);
    expect(s.phase).toBe('over');
    expect(s.winner).toBe(0);
  });

  it('sudden death goal wins instantly', () => {
    const s = newMatch(17);
    const rng = new Rng(17);
    s.suddenDeath = true;
    place(s, '0:1', 3, 1);
    giveBall(s, '0:1');
    const events = applyMove(s, '0:1', 3, HOME_GOAL_ROW, rng);
    expect(events.some((e) => e.type === 'matchOver' && e.winner === 0)).toBe(true);
  });
});

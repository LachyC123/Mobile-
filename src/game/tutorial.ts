// Tutorial — Coach Pip teaches rushball through action, one idea at a time,
// on the real pitch with the real rules. Ends in a live first-to-1 scrimmage.

import { BASE_AP, COLS, ROWS } from './constants';
import type { ActionSet, GameEvent, MatchState } from './types';
import type { MatchController } from './matchController';

interface Step {
  id: string;
  text: string;
  continue?: boolean; // shows a CONTINUE button instead of gating on an action
  setup?: (s: MatchState) => void;
  allowSelect?: (athleteId: string, s: MatchState) => boolean;
  allowAction?: (kind: 'move' | 'pass' | 'shove', actorId: string, targetId: string | undefined, tile: { x: number; y: number } | undefined, s: MatchState) => boolean;
  completeOn?: (events: GameEvent[]) => boolean;
  refill?: boolean; // keep player AP topped up during drills
  bot?: boolean; // bot may take turns (scrimmage)
}

function clearBalls(s: MatchState) {
  for (const a of s.athletes) a.hasBall = false;
  s.ball.carrierId = null;
}

function giveBall(s: MatchState, id: string) {
  clearBalls(s);
  const a = s.athletes.find((t) => t.id === id)!;
  a.hasBall = true;
  s.ball.carrierId = id;
}

function place(s: MatchState, id: string, x: number, y: number) {
  const a = s.athletes.find((t) => t.id === id)!;
  a.x = x;
  a.y = y;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    text: "Oi! Coach Pip here. Welcome to RUSHLINE — the fastest sport on two feet. I'll show you the ropes. It takes two minutes, tops.",
    continue: true,
  },
  {
    id: 'move',
    text: 'See your squad at the bottom? Tap your RUSHER — headband, quick legs — then tap a glowing tile to run there.',
    allowSelect: (id) => id === '0:1',
    completeOn: (ev) => ev.some((e) => e.type === 'move'),
    refill: true,
  },
  {
    id: 'ap',
    text: 'Nice legs. Each play you get 4 ACTION POINTS — the pips up top. Every athlete you use spends one. Move somebody else.',
    completeOn: (ev) => ev.some((e) => e.type === 'move'),
    refill: true,
  },
  {
    id: 'core',
    text: 'That glowing ball? The CORE. Run onto it to pick it up. Go on.',
    setup: (s) => {
      place(s, '0:1', 2, 7); // (3,7) is the Captain's spot — never stack athletes
      clearBalls(s);
      s.ball.x = 3;
      s.ball.y = 5;
    },
    completeOn: (ev) => ev.some((e) => e.type === 'pickup'),
    refill: true,
  },
  {
    id: 'pass',
    text: "You're on the ball! Tap your CAPTAIN — star on his chest — to zip a pass over.",
    setup: (s) => {
      place(s, '0:1', 3, 6);
      place(s, '0:0', 3, 4);
      giveBall(s, '0:1');
    },
    allowAction: (kind, _a, target) => kind === 'move' || (kind === 'pass' && target === '0:0'),
    completeOn: (ev) => ev.some((e) => e.type === 'pass' && !e.interceptedById),
    refill: true,
  },
  {
    id: 'lane',
    text: 'Passes fly in straight lines. If a rival stands NEXT to the lane, they STEAL it. Their guard is lurking by your lane — force the pass anyway. Tap the marked Rusher twice.',
    setup: (s) => {
      place(s, '0:1', 3, 6);
      giveBall(s, '0:1');
      place(s, '0:2', 5, 4);
      place(s, '1:3', 4, 4); // bot guard beside the diagonal lane
    },
    allowSelect: (id) => id === '0:1',
    allowAction: (kind, _a, target) => kind === 'pass' && target === '0:2',
    completeOn: (ev) => ev.some((e) => e.type === 'pass' && !!e.interceptedById),
    refill: true,
  },
  {
    id: 'lane2',
    text: 'INTERCEPTED — told you they bite. Note: the CAPTAIN\'s threaded passes can never be picked off. Win the Core back: shove time.',
    continue: true,
  },
  {
    id: 'shove',
    text: 'Your GUARDS wear helmets. Select yours and tap the ball-carrier to SHOVE him. The Core pops loose!',
    setup: (s) => {
      clearBalls(s);
      place(s, '0:3', 2, 6); // your guard
      place(s, '1:1', 2, 5); // bot rusher with the ball
      giveBall(s, '1:1');
      place(s, '0:0', 4, 7);
      place(s, '0:1', 1, 7);
    },
    allowSelect: (id) => id === '0:3',
    allowAction: (kind) => kind === 'shove',
    completeOn: (ev) => ev.some((e) => e.type === 'shove'),
    refill: true,
  },
  {
    id: 'recover',
    text: 'Core loose! First body on it wins. Go grab it.',
    completeOn: (ev) => ev.some((e) => e.type === 'pickup' && e.athleteId.startsWith('0:')),
    refill: true,
  },
  {
    id: 'score',
    text: 'Now the fun bit: carry the Core into the GLOWING row at the top. That\'s a GOAL. Run it in!',
    setup: (s) => {
      giveBall(s, '0:0');
      place(s, '0:0', 3, 2);
      // park every rival safely wide — clear runway down the middle
      place(s, '1:0', 0, 5);
      place(s, '1:1', 6, 5);
      place(s, '1:2', 6, 6);
      place(s, '1:3', 0, 6);
      place(s, '1:4', 6, 8);
    },
    completeOn: (ev) => ev.some((e) => e.type === 'goal' && e.team === 0),
    refill: true,
  },
  {
    id: 'flow',
    text: 'GOAL! See the FLOW meter? Caught passes and shoves fill it. A full meter means +1 Action Point next play. Fluent teams get extra football. Simple as that.',
    continue: true,
  },
  {
    id: 'scrimmage',
    text: 'Final exam: a real duel against Mudtown Rovers. FIRST TO 1 GOAL wins. Everything you know. Go!',
    setup: (s) => {
      // fresh kickoff, golden-goal scrimmage
      const homePos = [
        { x: 3, y: 7 }, { x: 1, y: 8 }, { x: 5, y: 8 }, { x: 2, y: 9 }, { x: 4, y: 9 },
      ];
      s.athletes.forEach((a, i) => {
        const p = homePos[i % 5];
        a.x = p.x;
        a.y = a.team === 0 ? p.y : ROWS - 1 - p.y;
        a.acted = false;
        a.hasBall = false;
      });
      s.ball.carrierId = null;
      s.ball.x = 3;
      s.ball.y = 5;
      s.score = [0, 0];
      s.goalLimit = 1;
      s.playLimit = 0;
      s.suddenDeath = false;
      s.activeTeam = 0;
      s.ap = BASE_AP;
      s.flow = [0, 0];
      s.surge = [false, false];
      void COLS;
    },
    bot: true,
  },
];

export class TutorialRunner {
  private idx = 0;
  private ctl: MatchController | null = null;

  attach(ctl: MatchController) {
    this.ctl = ctl;
    const step = STEPS[this.idx];
    if (step.setup) {
      step.setup(ctl.getState());
      ctl.refreshFromState();
    }
  }

  private get step(): Step {
    return STEPS[Math.min(this.idx, STEPS.length - 1)];
  }

  currentText(): string | null {
    return this.step.text;
  }

  needsContinue(): boolean {
    return !!this.step.continue;
  }

  allowEndPlay(): boolean {
    return !!this.step.bot;
  }

  botEnabled(): boolean {
    return !!this.step.bot;
  }

  onContinue() {
    if (!this.step.continue) return;
    this.advance();
  }

  onPlayStart() {
    // nothing needed — drills keep the ball with the player
  }

  refillAp() {
    if (this.step.refill) this.ctl?.refillPlayerAp();
  }

  allowSelect(athleteId: string): boolean {
    if (!this.ctl) return false;
    if (this.step.allowSelect) return this.step.allowSelect(athleteId, this.ctl.getState());
    return true;
  }

  allowAction(kind: 'move' | 'pass' | 'shove', actorId: string, targetId?: string, tile?: { x: number; y: number }): boolean {
    if (!this.ctl) return false;
    if (this.step.allowAction) return this.step.allowAction(kind, actorId, targetId, tile, this.ctl.getState());
    return true;
  }

  filterActions(_id: string, actions: ActionSet): ActionSet {
    return actions; // gating happens in allowAction/allowSelect
  }

  onEvents(events: GameEvent[]) {
    if (this.step.continue) return;
    if (this.step.completeOn && this.step.completeOn(events)) {
      this.advance();
    }
  }

  isDone(): boolean {
    return this.idx >= STEPS.length - 1 && this.step.id === 'scrimmage' ? false : this.idx >= STEPS.length;
  }

  private advance() {
    if (!this.ctl) return;
    this.idx = Math.min(this.idx + 1, STEPS.length - 1);
    const step = this.step;
    if (step.setup) {
      step.setup(this.ctl.getState());
      this.ctl.refreshFromState();
    }
    if (step.bot) {
      this.ctl.setFlowForTutorial('player');
    }
    this.ctl.setCoach(step.text, !!step.continue);
  }
}

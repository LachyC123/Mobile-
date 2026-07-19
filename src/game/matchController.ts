// MatchController — owns the loop: rules state (authoritative) → event-driven
// animation/vfx/audio → touch input. React HUD talks to this via snapshots.

import {
  BASE_AP, CLASSES, COLS, ROWS, type ClubDef, type DivisionDef, LOADING_TIPS,
} from './constants';
import { PAL } from './palette';
import { Rng } from './rng';
import {
  newMatch, legalActions, applyMove, applyPass, applyShove, endPlay as rulesEndPlay,
  resetKickoff, carrier, getAthlete,
} from './rules';
import { botStep } from './ai';
import { Renderer, tileCenter, TILE, type SceneView, type ViewAthlete, type ViewBall } from './renderer';
import { Vfx } from './vfx';
import { audio } from './audio';
import { haptic, type Settings } from './save';
import type { ActionSet, GameEvent, MatchState, Team, Tile } from './types';
import type { TutorialRunner } from './tutorial';

export type MatchMode = 'ranked' | 'quick' | 'tutorial';
type FlowState = 'kickoff' | 'player' | 'bot' | 'ceremony' | 'over';

export interface MatchResult {
  winner: Team;
  score: [number, number];
  playerWon: boolean;
}

export interface HudSnapshot {
  flow: FlowState;
  score: [number, number];
  ap: number;
  apMax: number;
  flowMeter: number;
  flowMax: number;
  surgeArmed: boolean;
  playsLeft: number;
  suddenDeath: boolean;
  selectedId: string | null;
  selectedLabel: string | null;
  canAct: boolean;
  canEndPlay: boolean;
  coachLine: string | null;
  coachContinue: boolean;
  botClubName: string;
  playerClubName: string;
  tip: string;
  botThinking: boolean;
}

interface Anim {
  t: number;
  dur: number;
  update: (k: number) => void;
  onDone?: () => void;
}

interface Scheduled {
  at: number;
  fn: () => void;
}

export interface ControllerOpts {
  canvas: HTMLCanvasElement;
  mode: MatchMode;
  division: DivisionDef;
  botClub: ClubDef;
  playerClub: ClubDef;
  seed: number;
  goalLimit?: number;
  playLimit?: number;
  tutorial?: TutorialRunner;
  getSettings: () => Settings;
  onSnapshot: (s: HudSnapshot) => void;
  onMatchEnd: (r: MatchResult) => void;
}

const walkSpeed = 5.2; // tiles per second

export class MatchController {
  private renderer: Renderer;
  private vfx = new Vfx();
  private state: MatchState;
  private rng: Rng;
  private opts: ControllerOpts;
  private flow: FlowState = 'kickoff';
  private viewAthletes = new Map<string, ViewAthlete>();
  private viewBall: ViewBall;
  private anims: Anim[] = [];
  private scheduled: Scheduled[] = [];
  private clock = 0;
  private lastTs = 0;
  private raf = 0;
  private destroyed = false;
  private selectedId: string | null = null;
  private actions: ActionSet | null = null;
  private armedPass: string | null = null;
  private countdownText: string | null = null;
  private botTimer = 0;
  private coachLine: string | null = null;
  private coachContinue = false;
  private tip: string;
  private onPointer: (e: PointerEvent) => void;
  private surgeShownFor: [boolean, boolean] = [false, false];

  constructor(opts: ControllerOpts) {
    this.opts = opts;
    this.renderer = new Renderer(opts.canvas);
    this.rng = new Rng(opts.seed);
    this.state = newMatch(opts.seed, { goalLimit: opts.goalLimit, playLimit: opts.playLimit });
    this.tip = LOADING_TIPS[opts.seed % LOADING_TIPS.length];
    this.viewBall = { wx: 0, wy: 0, visible: true, carried: false, spin: 0 };

    for (const a of this.state.athletes) {
      const { wx, wy } = tileCenter(a.x, a.y);
      this.viewAthletes.set(a.id, {
        id: a.id,
        cls: a.cls,
        kit: a.team === 0 ? { primary: opts.playerClub.primary, secondary: opts.playerClub.secondary }
                          : { primary: opts.botClub.primary, secondary: opts.botClub.secondary },
        skinIdx: parseInt(a.id.split(':')[1], 10) + (a.team === 1 ? 1 : 0),
        wx, wy, pose: 'idle', alpha: 1, flash: 0, flashColor: '#ffffff',
        squash: 1, bobT: Math.random() * 6, selected: false, acted: false, hasBall: false,
        mark: 'none',
      });
    }
    this.syncBall(true);

    this.onPointer = (e: PointerEvent) => this.handlePointer(e);
    opts.canvas.addEventListener('pointerdown', this.onPointer);

    if (opts.tutorial) {
      opts.tutorial.attach(this);
      this.coachLine = opts.tutorial.currentText();
      this.coachContinue = opts.tutorial.needsContinue();
    }
  }

  // ── public API ────────────────────────────────────────────────

  start() {
    this.resize();
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.update(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    this.kickoffCountdown(true);
  }

  resize() {
    const rect = this.opts.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (rect.width > 0 && rect.height > 0) this.renderer.resize(rect.width, rect.height, dpr);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.opts.canvas.removeEventListener('pointerdown', this.onPointer);
  }

  endPlayRequested() {
    if (this.flow !== 'player') return;
    if (this.opts.tutorial && !this.opts.tutorial.allowEndPlay()) return;
    this.deselect();
    this.finishPlayerPlay();
  }

  coachContinueRequested() {
    if (this.opts.tutorial) {
      this.opts.tutorial.onContinue();
      this.coachLine = this.opts.tutorial.currentText();
      this.coachContinue = this.opts.tutorial.needsContinue();
      this.emitSnapshot();
    }
  }

  getState(): MatchState {
    return this.state;
  }

  /** dev/test bridge */
  tapTile(x: number, y: number): string {
    return this.handleTile(x, y);
  }

  legalFor(id: string) {
    return legalActions(this.state, id, this.rng);
  }

  getFlow() {
    return this.flow;
  }

  forceRefresh() {
    this.refreshFromState();
  }

  // ── setup & countdown ─────────────────────────────────────────

  private kickoffCountdown(first: boolean) {
    this.flow = 'kickoff';
    audio.sfx('whistle');
    // athletes jog in
    if (first) {
      for (const a of this.state.athletes) {
        const va = this.viewAthletes.get(a.id)!;
        const { wy } = tileCenter(a.x, a.y);
        const fromY = a.team === 0 ? wy + 260 : wy - 260;
        va.wy = fromY;
        va.pose = 'run1';
        this.addAnim(0.9 + Math.random() * 0.3, (k) => {
          va.wy = fromY + (wy - fromY) * easeOut(k);
          va.pose = Math.floor(this.clock * 10) % 2 === 0 ? 'run1' : 'run2';
        }, () => { va.pose = 'idle'; });
      }
    }
    const seq = first ? ['3', '2', '1', 'PLAY!'] : ['PLAY!'];
    seq.forEach((txt, i) => {
      this.schedule(0.6 + i * 0.75, () => {
        this.countdownText = txt;
        audio.sfx(txt === 'PLAY!' ? 'countdownGo' : 'countdown');
        if (txt === 'PLAY!') haptic(this.opts.getSettings(), 30);
        this.schedule(0.7, () => {
          this.countdownText = null;
          if (i === seq.length - 1) this.beginPlayerOrBot();
        });
      });
    });
  }

  private beginPlayerOrBot() {
    if (this.state.phase === 'over') return;
    const tut = this.opts.tutorial;
    if (tut && !tut.botEnabled() && this.state.activeTeam !== 0) {
      // drills: possession of the turn always comes back to the player
      this.state.activeTeam = 0;
      this.state.ap = this.state.surge[0] ? this.state.ap + 1 : 4;
      this.state.surge[0] = false;
      for (const a of this.state.athletes) if (a.team === 0) a.acted = false;
    }
    if (this.state.activeTeam === 0) {
      this.flow = 'player';
      if (tut) tut.onPlayStart();
    } else {
      this.flow = 'bot';
      this.botTimer = 0.7;
    }
    this.emitSnapshot();
  }

  // ── input ─────────────────────────────────────────────────────

  private handlePointer(e: PointerEvent) {
    audio.unlock();
    const rect = this.opts.canvas.getBoundingClientRect();
    const { wx, wy } = this.renderer.toWorld(e.clientX, e.clientY, rect);
    const tile = this.renderer.worldToTile(wx, wy);
    if (!tile) {
      this.deselect();
      return;
    }
    this.handleTile(tile.x, tile.y);
  }

  private handleTile(x: number, y: number): string {
    if (this.flow !== 'player' || this.state.phase !== 'play') return 'ignore:flow';
    const tut = this.opts.tutorial;
    const clicked = this.state.athletes.find((a) => a.x === x && a.y === y);

    if (!this.selectedId) {
      if (clicked && clicked.team === 0 && !clicked.acted && this.state.ap > 0) {
        if (tut && !tut.allowSelect(clicked.id)) { this.errNudge(); return 'err:select'; }
        this.select(clicked.id);
        return 'select:' + clicked.id;
      }
      return 'ignore:noselect';
    }

    const sel = getAthlete(this.state, this.selectedId);
    if (clicked && clicked.id === this.selectedId) { this.deselect(); return 'deselect'; }

    if (this.actions) {
      // shove?
      const shove = this.actions.shoves.find((s) => {
        const t = getAthlete(this.state, s.targetId);
        return t.x === x && t.y === y;
      });
      if (shove && (!tut || tut.allowAction('shove', this.selectedId, shove.targetId))) {
        this.armedPass = null;
        this.doShove(this.selectedId, shove.targetId);
        return 'shove';
      }
      // pass?
      const pass = this.actions.passes.find((p) => {
        const t = getAthlete(this.state, p.targetId);
        return t.x === x && t.y === y;
      });
      if (pass && (!tut || tut.allowAction('pass', this.selectedId, pass.targetId))) {
        if (pass.interceptedById && this.armedPass !== pass.targetId) {
          this.armedPass = pass.targetId;
          const t = tileCenter(x, y);
          this.vfx.popup(t.wx, t.wy - 30, 'INTERCEPTION RISK!', PAL.danger, 0.9);
          this.vfx.popup(t.wx, t.wy - 12, 'tap again to force it', PAL.textMain, 0.7);
          audio.sfx('error');
          this.emitSnapshot();
          return 'arm';
        }
        this.armedPass = null;
        this.doPass(this.selectedId, pass.targetId);
        return 'pass';
      }
      // move?
      const mv = this.actions.moves.find((m) => m.x === x && m.y === y);
      if (mv && (!tut || tut.allowAction('move', this.selectedId, undefined, mv))) {
        this.armedPass = null;
        this.doMove(this.selectedId, mv.x, mv.y);
        return 'move';
      }
    }

    // reselect another athlete
    if (clicked && clicked.team === 0 && !clicked.acted && this.state.ap > 0) {
      if (tut && !tut.allowSelect(clicked.id)) { this.errNudge(); return 'err:select2'; }
      this.select(clicked.id);
      void sel;
      return 'reselect:' + clicked.id;
    }
    this.deselect();
    void sel;
    return 'deselect-end';
  }

  private errNudge() {
    audio.sfx('error');
    this.vfx.shake(2);
  }

  private select(id: string) {
    this.selectedId = id;
    this.actions = legalActions(this.state, id, this.rng);
    if (this.opts.tutorial && this.actions) this.actions = this.opts.tutorial.filterActions(id, this.actions);
    audio.sfx('select');
    haptic(this.opts.getSettings(), 10);
    this.updateMarks();
    this.emitSnapshot();
  }

  private deselect() {
    this.selectedId = null;
    this.actions = null;
    this.armedPass = null;
    this.updateMarks();
    this.emitSnapshot();
  }

  private updateMarks() {
    for (const va of this.viewAthletes.values()) {
      va.selected = va.id === this.selectedId;
      va.mark = 'none';
    }
    if (!this.actions) return;
    for (const p of this.actions.passes) {
      const va = this.viewAthletes.get(p.targetId)!;
      va.mark = p.interceptedById ? 'passRisky' : 'pass';
      if (this.armedPass === p.targetId) va.mark = 'passRisky';
    }
    for (const s of this.actions.shoves) {
      this.viewAthletes.get(s.targetId)!.mark = 'shove';
    }
  }

  // ── actions (rules → events → animation/feedback) ─────────────

  private doMove(id: string, x: number, y: number) {
    const events = applyMove(this.state, id, x, y, this.rng);
    this.handleEvents(events);
    this.afterPlayerAction();
  }

  private doPass(id: string, targetId: string) {
    const events = applyPass(this.state, id, targetId, this.rng);
    this.handleEvents(events);
    this.afterPlayerAction();
  }

  private doShove(id: string, targetId: string) {
    const events = applyShove(this.state, id, targetId, this.rng);
    this.handleEvents(events);
    this.afterPlayerAction();
  }

  private afterPlayerAction() {
    this.selectedId = null;
    this.actions = null;
    this.armedPass = null;
    this.updateMarks();
    if (this.state.phase === 'over') return; // handled by events
    if (this.flow !== 'ceremony') {
      if (this.opts.tutorial) this.opts.tutorial.refillAp();
      if (this.state.ap <= 0 && this.flow === 'player') {
        this.schedule(0.55, () => {
          if (this.flow === 'player' && this.state.ap <= 0) this.finishPlayerPlay();
        });
      }
    }
    this.emitSnapshot();
  }

  private finishPlayerPlay() {
    const events = rulesEndPlay(this.state);
    this.handleEvents(events);
    if (this.state.phase !== 'over' && this.flow !== 'ceremony') this.beginPlayerOrBot();
    this.emitSnapshot();
  }

  // ── event → feedback pipeline ─────────────────────────────────

  private handleEvents(events: GameEvent[]) {
    for (const ev of events) {
      switch (ev.type) {
        case 'move': this.animMove(ev.athleteId, ev.path); break;
        case 'pickup': this.fbPickup(ev.athleteId); break;
        case 'pass': this.animPass(ev); break;
        case 'shove': this.animShove(ev); break;
        case 'goal': this.fbGoal(ev.team, ev.scorerId); break;
        case 'flow': this.fbFlow(ev.team, ev.surgeReady); break;
        case 'playEnd': break;
        case 'playStart': this.fbPlayStart(ev.team, ev.ap); break;
        case 'matchOver': this.fbMatchOver(ev.winner); break;
        case 'invalid': audio.sfx('error'); break;
      }
    }
    if (this.opts.tutorial) {
      this.opts.tutorial.onEvents(events);
      this.coachLine = this.opts.tutorial.currentText();
      this.coachContinue = this.opts.tutorial.needsContinue();
    }
    this.emitSnapshot();
  }

  private animMove(athleteId: string, path: Tile[]) {
    const va = this.viewAthletes.get(athleteId)!;
    const pts = path.map((t) => tileCenter(t.x, t.y));
    const dur = path.length / walkSpeed;
    let sx = va.wx;
    let sy = va.wy;
    audio.sfx('move');
    this.addAnim(dur, (k) => {
      const dist = k * path.length;
      const idx = Math.min(path.length - 1, Math.floor(dist));
      const frac = dist - idx;
      const from = idx === 0 ? { wx: sx, wy: sy } : pts[idx - 1];
      const to = pts[idx];
      va.wx = from.wx + (to.wx - from.wx) * frac;
      va.wy = from.wy + (to.wy - from.wy) * frac;
      va.pose = Math.floor(this.clock * 12) % 2 === 0 ? 'run1' : 'run2';
      if (Math.random() < 0.25) {
        this.vfx.spawn(va.wx, va.wy + TILE * 0.32, {
          count: 1, speed: 14, color: 'rgba(233,244,228,0.5)', size: 3, maxLife: 0.35,
        });
      }
    }, () => {
      const a = getAthlete(this.state, athleteId);
      va.pose = a.hasBall ? 'carry' : 'idle';
      va.squash = 0.86;
      this.addAnim(0.16, (k2) => { va.squash = 0.86 + 0.14 * k2; });
      sx = 0; sy = 0;
    });
  }

  private fbPickup(athleteId: string) {
    const va = this.viewAthletes.get(athleteId)!;
    va.hasBall = true;
    va.pose = 'carry';
    audio.sfx('pickup');
    this.vfx.popup(va.wx, va.wy - 40, 'CORE!', PAL.reward, 0.9);
    this.vfx.spawn(va.wx, va.wy, { count: 8, speed: 60, color: PAL.reward, size: 3, maxLife: 0.4 });
    this.syncBall(true);
  }

  private animPass(ev: Extract<GameEvent, { type: 'pass' }>) {
    const from = this.viewAthletes.get(ev.fromId)!;
    const toAth = getAthlete(this.state, ev.interceptedById ?? ev.toId);
    const dest = tileCenter(toAth.x, toAth.y);
    audio.sfx('pass');
    const sx = from.wx;
    const sy = from.wy - 10;
    const dur = 0.34;
    from.hasBall = false;
    from.pose = 'idle';
    this.addAnim(dur, (k) => {
      const x = sx + (dest.wx - sx) * k;
      const y = sy + (dest.wy - 10 - sy) * k - Math.sin(k * Math.PI) * 26;
      this.viewBall.wx = x;
      this.viewBall.wy = y;
      this.viewBall.carried = false;
      this.viewBall.visible = true;
      this.viewBall.spin += 0.3;
      if (Math.random() < 0.5) {
        this.vfx.spawn(x, y + 6, { count: 1, speed: 6, color: PAL.coreMid, size: 2, maxLife: 0.3 });
      }
    }, () => {
      const catcher = this.viewAthletes.get(toAth.id)!;
      if (ev.interceptedById) {
        // INTERCEPTION — big moment
        catcher.hasBall = true;
        catcher.pose = 'carry';
        catcher.flash = 1;
        catcher.flashColor = PAL.danger;
        this.vfx.freeze(0.16);
        this.vfx.shake(7);
        this.vfx.flash(PAL.danger, 0.22);
        this.vfx.showBanner('INTERCEPTED!', { color: PAL.danger, tier: 'medium' });
        this.vfx.spawn(catcher.wx, catcher.wy - 10, { count: 22, speed: 120, color: PAL.danger, size: 4, maxLife: 0.6 });
        audio.sfx('intercept');
        audio.crowdSwell(0.4, 1.4);
        haptic(this.opts.getSettings(), 60);
      } else {
        catcher.hasBall = true;
        catcher.pose = 'carry';
        catcher.flash = 0.8;
        catcher.flashColor = PAL.reward;
        this.vfx.popup(catcher.wx, catcher.wy - 40, 'CAUGHT!', PAL.interact, 0.85);
        this.vfx.spawn(catcher.wx, catcher.wy - 8, { count: 10, speed: 70, color: PAL.interact, size: 3, maxLife: 0.4 });
        audio.sfx('catch');
        haptic(this.opts.getSettings(), 15);
      }
      this.syncBall(true);
    });
  }

  private animShove(ev: Extract<GameEvent, { type: 'shove' }>) {
    const shover = this.viewAthletes.get(ev.shoverId)!;
    const target = this.viewAthletes.get(ev.targetId)!;
    const dx = Math.sign(target.wx - shover.wx);
    const dy = Math.sign(target.wy - shover.wy);
    // shover lunges
    this.addAnim(0.12, (k) => {
      shover.wx += dx * k * 6;
      shover.wy += dy * k * 6;
    }, () => {
      this.addAnim(0.18, (k) => {
        shover.wx -= dx * k * 6;
        shover.wy -= dy * k * 6;
      });
    });
    // target slides + flashes
    const tx0 = target.wx;
    const ty0 = target.wy;
    const dest = ev.pushedTo ? tileCenter(ev.pushedTo.x, ev.pushedTo.y) : { wx: tx0, wy: ty0 };
    target.flash = 1;
    target.flashColor = '#ffffff';
    this.addAnim(0.2, (k) => {
      const e = easeOut(k);
      target.wx = tx0 + (dest.wx - tx0) * e;
      target.wy = ty0 + (dest.wy - ty0) * e;
      target.squash = 1 - Math.sin(k * Math.PI) * 0.2;
    });

    this.vfx.shake(6);
    this.vfx.spawn((shover.wx + target.wx) / 2, (shover.wy + target.wy) / 2 - 8, {
      count: 16, speed: 130, color: '#ffffff', size: 4, maxLife: 0.35,
    });
    this.vfx.popup(target.wx, target.wy - 44, 'SHOVE!', '#ffffff', 0.9);
    audio.sfx('shove');
    haptic(this.opts.getSettings(), 45);

    if (ev.ballLooseAt) {
      target.hasBall = false;
      target.pose = 'idle';
      const spot = tileCenter(ev.ballLooseAt.x, ev.ballLooseAt.y);
      const bx = target.wx;
      const by = target.wy - 8;
      this.schedule(0.1, () => {
        audio.sfx('ballLoose');
        this.vfx.popup(spot.wx, spot.wy - 30, 'CORE LOOSE!', PAL.reward, 0.9);
        this.addAnim(0.3, (k) => {
          this.viewBall.wx = bx + (spot.wx - bx) * k;
          this.viewBall.wy = by + (spot.wy - by) * k - Math.sin(k * Math.PI) * 20;
          this.viewBall.carried = false;
          this.viewBall.visible = true;
        }, () => this.syncBall(true));
      });
    }
  }

  private fbGoal(team: Team, scorerId: string) {
    this.flow = 'ceremony';
    const mine = team === 0;
    const scorer = this.viewAthletes.get(scorerId)!;
    scorer.pose = 'celebrate';
    scorer.flash = 1;
    scorer.flashColor = PAL.reward;

    // whole scoring team celebrates
    for (const a of this.state.athletes) {
      if (a.team === team) this.viewAthletes.get(a.id)!.pose = 'celebrate';
    }

    this.vfx.freeze(0.1);
    this.vfx.slowmo = 0.9;
    this.vfx.shake(9);
    this.vfx.flash(mine ? PAL.reward : PAL.danger, 0.35);
    this.vfx.showBanner('GOAL!', {
      sub: mine ? `${this.opts.playerClub.name} scores` : `${this.opts.botClub.name} scores`,
      color: mine ? PAL.reward : PAL.danger,
      tier: 'large',
      dur: 2.2,
    });
    // confetti: two bursts + ongoing fountain
    const colors = mine ? [PAL.reward, PAL.interact, '#ffffff', '#29d3b5'] : [PAL.danger, '#ffffff', '#ffb0a0'];
    for (let i = 0; i < 3; i++) {
      this.schedule(i * 0.18, () => {
        this.vfx.spawn(scorer.wx, scorer.wy - 20, {
          count: 34, speed: 190, color: colors[i % colors.length], size: 4, gravity: 240, drag: 0.96, maxLife: 1.1,
        });
        this.vfx.spawn(scorer.wx, scorer.wy - 20, {
          count: 20, speed: 150, color: colors[(i + 1) % colors.length], size: 3, gravity: 200, drag: 0.96, maxLife: 0.9,
        });
      });
    }
    audio.sfx(mine ? 'goal' : 'goalAgainst');
    audio.crowdSwell(mine ? 0.85 : 0.5, 3.2);
    haptic(this.opts.getSettings(), 90);

    if (this.state.phase === 'over') return; // matchOver event follows

    this.schedule(2.5, () => {
      const conceding: Team = team === 0 ? 1 : 0;
      const events = resetKickoff(this.state, conceding);
      // reset view positions instantly
      for (const a of this.state.athletes) {
        const va = this.viewAthletes.get(a.id)!;
        const { wx, wy } = tileCenter(a.x, a.y);
        va.wx = wx; va.wy = wy;
        va.pose = 'idle';
        va.hasBall = false;
        va.flash = 0;
      }
      this.syncBall(true);
      this.handleEvents(events);
      this.kickoffCountdown(false);
    });
  }

  private fbFlow(team: Team, surgeReady: boolean) {
    if (!surgeReady) {
      audio.sfx('flow');
      return;
    }
    if (this.surgeShownFor[team]) return;
    this.surgeShownFor[team] = true;
    const mine = team === 0;
    this.vfx.showBanner('FLOW SURGE!', {
      sub: mine ? '+1 Action Point next play' : 'rival club surges',
      color: PAL.reward,
      tier: 'medium',
    });
    audio.sfx('surge');
    this.vfx.flash(PAL.reward, 0.15);
  }

  private fbPlayStart(team: Team, ap: number) {
    this.surgeShownFor[team] = false;
    if (team === 0) {
      this.vfx.popup(tileCenter(3, ROWS - 3).wx, tileCenter(3, ROWS - 3).wy, `YOUR PLAY — ${ap} AP`, PAL.interact, 0.9);
    }
    void ap;
  }

  private fbMatchOver(winner: Team) {
    this.flow = 'over';
    const playerWon = winner === 0;
    this.schedule(1.2, () => {
      audio.sfx(playerWon ? 'win' : 'lose');
      this.opts.onMatchEnd({ winner, score: [...this.state.score], playerWon });
    });
  }

  // ── bot turn ──────────────────────────────────────────────────

  private updateBot(dt: number) {
    if (this.flow !== 'bot') return;
    if (this.anims.length > 0 || this.vfx.hitstop > 0) return;
    this.botTimer -= dt;
    if (this.botTimer > 0) return;
    const notDone = () => {
      const f: FlowState = this.flow;
      const p: MatchState['phase'] = this.state.phase;
      return p !== 'over' && f !== 'ceremony';
    };
    const step = botStep(this.state, 1, this.opts.division, this.rng);
    if (!step) {
      const events = rulesEndPlay(this.state);
      this.handleEvents(events);
      if (notDone()) this.beginPlayerOrBot();
      return;
    }
    this.botTimer = 0.55;
    this.handleEvents(step.events);
    if (this.state.ap <= 0 && notDone() && this.flow === 'bot') {
      this.botTimer = 0.7;
      // force end next tick
      this.schedule(0.6, () => {
        if (this.flow === 'bot' && this.state.ap <= 0 && notDone()) {
          const events = rulesEndPlay(this.state);
          this.handleEvents(events);
          if (notDone()) this.beginPlayerOrBot();
        }
      });
    }
  }

  // ── frame update ──────────────────────────────────────────────

  private addAnim(dur: number, update: (k: number) => void, onDone?: () => void) {
    this.anims.push({ t: 0, dur: Math.max(0.01, dur), update, onDone });
  }

  private schedule(delay: number, fn: () => void) {
    this.scheduled.push({ at: this.clock + delay, fn });
  }

  private syncBall(snap: boolean) {
    const c = carrier(this.state);
    if (c) {
      const va = this.viewAthletes.get(c.id)!;
      this.viewBall.carried = true;
      this.viewBall.visible = true;
      if (snap) {
        this.viewBall.wx = va.wx;
        this.viewBall.wy = va.wy + TILE * 0.18;
      }
    } else {
      this.viewBall.carried = false;
      this.viewBall.visible = true;
      if (snap) {
        const { wx, wy } = tileCenter(this.state.ball.x, this.state.ball.y);
        this.viewBall.wx = wx;
        this.viewBall.wy = wy;
      }
    }
  }

  private update(dt: number) {
    const timeScale = this.vfx.update(dt);
    const gdt = dt * timeScale;
    this.clock += gdt;

    // scheduled callbacks
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      if (this.clock >= this.scheduled[i].at) {
        const s = this.scheduled.splice(i, 1)[0];
        s.fn();
      }
    }

    // anims
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += gdt;
      const k = Math.min(1, a.t / a.dur);
      a.update(k);
      if (k >= 1) {
        this.anims.splice(i, 1);
        a.onDone?.();
      }
    }

    // flash decay
    for (const va of this.viewAthletes.values()) {
      if (va.flash > 0) va.flash = Math.max(0, va.flash - gdt * 3.2);
    }

    // ball follows carrier
    const c = carrier(this.state);
    if (c && this.viewBall.carried) {
      const va = this.viewAthletes.get(c.id)!;
      this.viewBall.wx = va.wx;
      this.viewBall.wy = va.wy + TILE * 0.18;
      this.viewBall.spin = 0;
    }

    // acted markers from state
    for (const a of this.state.athletes) {
      const va = this.viewAthletes.get(a.id)!;
      va.acted = a.acted && a.team === this.state.activeTeam;
      va.hasBall = a.hasBall;
    }

    this.updateBot(gdt);

    this.renderer.render(this.buildView(), dt);
  }

  private buildView(): SceneView {
    const selAthlete = this.selectedId ? getAthlete(this.state, this.selectedId) : null;
    const pathPreview: Tile[] = [];
    void pathPreview;
    return {
      athletes: [...this.viewAthletes.values()],
      ball: this.viewBall,
      hl: {
        moves: this.actions ? this.actions.moves : [],
        pathPreview,
        selectedTile: selAthlete ? { x: selAthlete.x, y: selAthlete.y } : null,
        actedTiles: this.state.athletes.filter((a) => a.acted && a.team === this.state.activeTeam),
      },
      vfx: this.vfx,
      time: this.clock,
      countdown: this.countdownText,
      surgeTeam: this.state.surge[0] ? 0 : this.state.surge[1] ? 1 : -1,
    };
  }

  private emitSnapshot() {
    const tut = this.opts.tutorial;
    const selAth = this.selectedId ? this.state.athletes.find((a) => a.id === this.selectedId) : null;
    this.opts.onSnapshot({
      flow: this.flow,
      score: [...this.state.score],
      ap: this.state.ap,
      apMax: this.state.surge[0] ? BASE_AP + 1 : BASE_AP,
      flowMeter: this.state.flow[0],
      flowMax: 6,
      surgeArmed: this.state.surge[0],
      playsLeft: this.state.playLimit > 0 ? Math.max(0, this.state.playLimit - this.state.playsUsed[0]) : 0,
      suddenDeath: this.state.suddenDeath,
      selectedId: this.selectedId,
      selectedLabel: selAth ? `${CLASSES[selAth.cls].name}${selAth.hasBall ? ' · ON THE CORE' : ''}` : null,
      canAct: this.flow === 'player',
      canEndPlay: tut ? tut.allowEndPlay() : this.flow === 'player',
      coachLine: this.coachLine,
      coachContinue: this.coachContinue,
      botClubName: this.opts.botClub.name,
      playerClubName: this.opts.playerClub.name,
      tip: this.tip,
      botThinking: this.flow === 'bot',
    });
    void tut;
  }

  // tutorial support: let the script mutate + refresh views
  refreshFromState() {
    for (const a of this.state.athletes) {
      const va = this.viewAthletes.get(a.id)!;
      const { wx, wy } = tileCenter(a.x, a.y);
      va.wx = wx; va.wy = wy;
      va.hasBall = a.hasBall;
      va.pose = a.hasBall ? 'carry' : 'idle';
      va.flash = 0;
      va.acted = false;
    }
    this.syncBall(true);
    this.deselect();
    this.emitSnapshot();
  }

  setCoach(line: string | null, cont: boolean) {
    this.coachLine = line;
    this.coachContinue = cont;
    this.emitSnapshot();
  }

  setFlowForTutorial(f: 'player' | 'bot') {
    this.flow = f;
    this.emitSnapshot();
  }

  refillPlayerAp() {
    this.state.ap = BASE_AP;
    for (const a of this.state.athletes) if (a.team === 0) a.acted = false;
    this.emitSnapshot();
  }

  skipBotTurn() {
    // tutorial: immediately bounce play back to the player
    const events = rulesEndPlay(this.state);
    this.handleEvents(events);
    this.beginPlayerOrBot();
  }
}

function easeOut(k: number): number {
  return 1 - Math.pow(1 - k, 3);
}

export { COLS, ROWS };

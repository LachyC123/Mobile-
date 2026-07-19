// RUSHLINE match renderer — canvas 2D, crisp pixels, one cached static layer
// (sky, stands, boards, pitch) + dynamic passes (glows, highlights, entities, vfx).

import { COLS, ROWS, HOME_GOAL_ROW, AWAY_GOAL_ROW } from './constants';
import { PAL, CROWD_COLORS } from './palette';
import { Rng } from './rng';
import { athleteSprite, coreSprite, type Pose, type TeamKit } from './sprites';
import type { Tile } from './types';
import type { Vfx } from './vfx';

export const TILE = 48;
const BOARD = 28;
const SKY_H = 140;
const STAND_TOP = 96;
const STAND_BOT = 84;
const SIDE = 36;

export const WORLD_W = COLS * TILE + 2 * (BOARD + SIDE); // 464
export const WORLD_H = SKY_H + STAND_TOP + BOARD + ROWS * TILE + BOARD + STAND_BOT; // 904
export const PITCH_X = SIDE + BOARD; // 64
export const PITCH_Y = SKY_H + STAND_TOP + BOARD; // 264

export interface ViewAthlete {
  id: string;
  cls: 'RUSHER' | 'GUARD' | 'CAPTAIN';
  kit: TeamKit;
  skinIdx: number;
  wx: number; // world px
  wy: number;
  pose: Pose;
  alpha: number;
  flash: number; // 0..1 white-hot
  flashColor: string;
  squash: number; // 1 = normal
  bobT: number;
  selected: boolean;
  acted: boolean;
  hasBall: boolean;
  mark: 'none' | 'pass' | 'passRisky' | 'shove';
}

export interface ViewBall {
  wx: number;
  wy: number;
  visible: boolean;
  carried: boolean;
  spin: number;
}

export interface HighlightState {
  moves: Tile[];
  pathPreview: Tile[];
  selectedTile: Tile | null;
  actedTiles: Tile[];
}

export interface SceneView {
  athletes: ViewAthlete[];
  ball: ViewBall;
  hl: HighlightState;
  vfx: Vfx;
  time: number;
  countdown: string | null;
  surgeTeam: -1 | 0 | 1; // pitch-edge shimmer when a surge is armed
}

export function tileCenter(x: number, y: number): { wx: number; wy: number } {
  return { wx: PITCH_X + x * TILE + TILE / 2, wy: PITCH_Y + y * TILE + TILE / 2 };
}

function pixelFont(size: number): string {
  return `${size}px "Press Start 2P", monospace`;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private crowdTop: HTMLCanvasElement[] = [];
  private crowdBot: HTMLCanvasElement[] = [];
  private crowdL: HTMLCanvasElement[] = [];
  private crowdR: HTMLCanvasElement[] = [];
  private crowdFrame = 0;
  private crowdTimer = 0;
  private clouds: { x: number; y: number; w: number; speed: number }[] = [];
  private scale = 1;
  private offX = 0;
  private offY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    const rng = new Rng(1337);
    for (let i = 0; i < 4; i++) {
      this.clouds.push({ x: rng.next() * WORLD_W, y: 14 + rng.next() * 70, w: 40 + rng.next() * 60, speed: 2 + rng.next() * 4 });
    }
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.scale = Math.min(this.canvas.width / WORLD_W, this.canvas.height / WORLD_H);
    this.offX = (this.canvas.width - WORLD_W * this.scale) / 2;
    this.offY = (this.canvas.height - WORLD_H * this.scale) / 2;
    this.buildStatic();
  }

  /** Convert client px → world px. */
  toWorld(clientX: number, clientY: number, rect: DOMRect): { wx: number; wy: number } {
    const dpr = this.canvas.width / rect.width;
    return {
      wx: ((clientX - rect.left) * dpr - this.offX) / this.scale,
      wy: ((clientY - rect.top) * dpr - this.offY) / this.scale,
    };
  }

  worldToTile(wx: number, wy: number): Tile | null {
    const x = Math.floor((wx - PITCH_X) / TILE);
    const y = Math.floor((wy - PITCH_Y) / TILE);
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return null;
    return { x, y };
  }

  // ── static layer ─────────────────────────────────────────────

  buildStatic() {
    const bg = document.createElement('canvas');
    bg.width = WORLD_W;
    bg.height = WORLD_H;
    const c = bg.getContext('2d')!;
    const rng = new Rng(4242);

    // dusk sky
    const sky = c.createLinearGradient(0, 0, 0, SKY_H + STAND_TOP);
    sky.addColorStop(0, PAL.skyTop);
    sky.addColorStop(0.55, PAL.skyMid);
    sky.addColorStop(0.85, PAL.skyLow);
    sky.addColorStop(1, PAL.horizon);
    c.fillStyle = sky;
    c.fillRect(0, 0, WORLD_W, SKY_H + STAND_TOP);

    // stars
    for (let i = 0; i < 60; i++) {
      const x = rng.next() * WORLD_W;
      const y = rng.next() * SKY_H * 0.75;
      c.fillStyle = rng.chance(0.25) ? PAL.star : '#8f96b8';
      c.globalAlpha = 0.3 + rng.next() * 0.6;
      c.fillRect(Math.floor(x), Math.floor(y), rng.chance(0.2) ? 2 : 1, 1);
    }
    c.globalAlpha = 1;

    // pixel moon
    c.fillStyle = '#f4e8c9';
    c.fillRect(WORLD_W - 66, 22, 22, 22);
    c.fillStyle = '#e3d3ac';
    c.fillRect(WORLD_W - 60, 28, 5, 5);
    c.fillRect(WORLD_W - 52, 36, 4, 4);

    this.buildCrowdStrips();

    // top stand base
    c.fillStyle = PAL.standDark;
    c.fillRect(0, SKY_H, WORLD_W, STAND_TOP);
    c.fillStyle = PAL.standLight;
    c.fillRect(0, SKY_H, WORLD_W, 3);
    for (let i = 1; i < 4; i++) {
      c.fillStyle = PAL.standMid;
      c.fillRect(0, SKY_H + i * 26, WORLD_W, 2);
    }
    c.drawImage(this.crowdTop[0], 0, SKY_H + 4);

    // bottom stand
    const botY = PITCH_Y + ROWS * TILE + BOARD;
    c.fillStyle = PAL.standDark;
    c.fillRect(0, botY, WORLD_W, STAND_BOT);
    c.fillStyle = PAL.standLight;
    c.fillRect(0, botY, WORLD_W, 3);
    c.drawImage(this.crowdBot[0], 0, botY + 5);

    // side stands
    c.fillStyle = PAL.standDark;
    c.fillRect(0, PITCH_Y - BOARD, SIDE, ROWS * TILE + BOARD * 2);
    c.fillRect(WORLD_W - SIDE, PITCH_Y - BOARD, SIDE, ROWS * TILE + BOARD * 2);
    c.fillStyle = PAL.standLight;
    c.fillRect(SIDE - 3, PITCH_Y - BOARD, 3, ROWS * TILE + BOARD * 2);
    c.fillRect(WORLD_W - SIDE, PITCH_Y - BOARD, 3, ROWS * TILE + BOARD * 2);
    c.drawImage(this.crowdL[0], 2, PITCH_Y - BOARD + 4);
    c.drawImage(this.crowdR[0], WORLD_W - SIDE + 2, PITCH_Y - BOARD + 4);

    // floodlight towers
    this.drawTower(c, 26, SKY_H - 6);
    this.drawTower(c, WORLD_W - 26, SKY_H - 6);

    // pennant string across the top stand
    c.strokeStyle = '#0d1420';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, SKY_H + 8);
    c.quadraticCurveTo(WORLD_W / 2, SKY_H + 18, WORLD_W, SKY_H + 8);
    c.stroke();
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const x = t * WORLD_W;
      const y = SKY_H + 8 + Math.sin(t * Math.PI) * 9;
      c.fillStyle = i % 2 === 0 ? '#29d3b5' : '#ff6b6b';
      c.beginPath();
      c.moveTo(x - 4, y);
      c.lineTo(x + 4, y);
      c.lineTo(x, y + 8);
      c.closePath();
      c.fill();
    }

    // ad boards
    this.drawBoards(c);

    // pitch
    this.drawPitch(c, rng);

    this.bg = bg;
  }

  private buildCrowdStrips() {
    const mk = (w: number, h: number, seed: number): HTMLCanvasElement[] => {
      const variants: HTMLCanvasElement[] = [];
      for (let v = 0; v < 3; v++) {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const cc = cv.getContext('2d')!;
        const rng = new Rng(seed + v * 977);
        for (let y = 0; y < h; y += 4) {
          for (let x = 0; x < w; x += 3) {
            if (rng.chance(0.82)) {
              cc.fillStyle = rng.pick(CROWD_COLORS);
              cc.fillRect(x, y + (rng.chance(0.3) ? 1 : 0), 2, 2);
              if (rng.chance(0.12)) { // waving arms / flags
                cc.fillStyle = rng.chance(0.5) ? '#29d3b5' : '#ffd23f';
                cc.fillRect(x, y - 2, 1, 2);
              }
            }
          }
        }
        variants.push(cv);
      }
      return variants;
    };
    this.crowdTop = mk(WORLD_W, STAND_TOP - 8, 101);
    this.crowdBot = mk(WORLD_W, STAND_BOT - 10, 202);
    this.crowdL = mk(SIDE - 4, ROWS * TILE + BOARD * 2 - 8, 303);
    this.crowdR = mk(SIDE - 4, ROWS * TILE + BOARD * 2 - 8, 404);
  }

  private drawTower(c: CanvasRenderingContext2D, x: number, baseY: number) {
    c.fillStyle = PAL.towerDark;
    c.fillRect(x - 2, baseY - 66, 4, 66);
    c.fillRect(x - 8, baseY - 70, 16, 4);
    // lamp head
    c.fillStyle = '#39415c';
    c.fillRect(x - 12, baseY - 86, 24, 16);
    c.fillStyle = PAL.lamp;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 2; j++) c.fillRect(x - 9 + i * 7, baseY - 83 + j * 7, 5, 5);
  }

  private drawBoards(c: CanvasRenderingContext2D) {
    const sponsors = ['PIXEL COLA', 'RUSHLINE', '8-BIT ENERGY', 'NOVA TV', 'KITKRAFT', 'BYTE SHOP'];
    c.font = pixelFont(10);
    c.textBaseline = 'middle';

    const band = (x: number, y: number, w: number, h: number, vertical: boolean) => {
      c.fillStyle = PAL.boardBg;
      c.fillRect(x, y, w, h);
      c.strokeStyle = PAL.panelEdge;
      c.lineWidth = 2;
      c.strokeRect(x + 1, y + 1, w - 2, h - 2);
      if (!vertical) {
        c.fillStyle = PAL.boardText;
        let cx = x + 12;
        let i = 0;
        while (cx < x + w - 60) {
          const label = sponsors[(i + (y > WORLD_H / 2 ? 3 : 0)) % sponsors.length];
          c.fillText(label, cx, y + h / 2 + 1);
          cx += label.length * 11 + 46;
          i++;
        }
      } else {
        // side boards: stacked glyph tiles
        for (let cy = y + 8; cy < y + h - 16; cy += 34) {
          c.fillStyle = ['#29d3b5', '#ffd23f', '#ff6b6b', '#6ef3ff'][(cy / 34 | 0) % 4];
          c.fillRect(x + w / 2 - 6, cy, 12, 12);
          c.fillStyle = PAL.boardBg;
          c.fillRect(x + w / 2 - 3, cy + 3, 6, 6);
        }
      }
    };
    // top + bottom boards
    band(SIDE, PITCH_Y - BOARD, COLS * TILE + BOARD * 2, BOARD, false);
    band(SIDE, PITCH_Y + ROWS * TILE, COLS * TILE + BOARD * 2, BOARD, false);
    // side boards
    band(SIDE, PITCH_Y, BOARD, ROWS * TILE, true);
    band(SIDE + BOARD + COLS * TILE, PITCH_Y, BOARD, ROWS * TILE, true);
  }

  private drawPitch(c: CanvasRenderingContext2D, rng: Rng) {
    const px = PITCH_X;
    const py = PITCH_Y;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const stripe = Math.floor(y / 2) % 2 === 0;
        const checker = (x + y) % 2 === 0;
        c.fillStyle = stripe
          ? checker ? PAL.grassStripeA : PAL.grassStripeB
          : checker ? PAL.grassA : PAL.grassB;
        c.fillRect(px + x * TILE, py + y * TILE, TILE, TILE);
        // turf speckles
        for (let i = 0; i < 5; i++) {
          c.fillStyle = rng.chance(0.5) ? PAL.turfDark : PAL.chalkDim;
          c.globalAlpha = 0.25;
          c.fillRect(px + x * TILE + rng.int(3, TILE - 4), py + y * TILE + rng.int(3, TILE - 4), 2, 1);
          c.globalAlpha = 1;
        }
      }
    }

    // goal row tints
    c.fillStyle = 'rgba(255,107,107,0.16)'; // away (bot) colors on top row = player target
    c.fillRect(px, py + HOME_GOAL_ROW * TILE, COLS * TILE, TILE);
    c.fillStyle = 'rgba(41,211,181,0.16)';
    c.fillRect(px, py + AWAY_GOAL_ROW * TILE, COLS * TILE, TILE);

    // chalk: outer boundary
    c.fillStyle = PAL.chalk;
    const cw = 3;
    c.fillRect(px - 2, py - 2, COLS * TILE + 4, cw);
    c.fillRect(px - 2, py + ROWS * TILE - 1, COLS * TILE + 4, cw);
    c.fillRect(px - 2, py - 2, cw, ROWS * TILE + 4);
    c.fillRect(px + COLS * TILE - 1, py - 2, cw, ROWS * TILE + 4);
    // halfway line
    const midY = py + 5 * TILE + TILE / 2;
    c.fillRect(px, midY - 1, COLS * TILE, 3);
    // center circle (chunky pixel ring)
    const ccx = px + (COLS * TILE) / 2;
    const ccy = midY;
    const r = TILE * 1.1;
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      c.fillRect(Math.round(ccx + Math.cos(t) * r) - 1, Math.round(ccy + Math.sin(t) * r) - 1, 3, 3);
    }
    c.fillRect(ccx - 2, ccy - 2, 5, 5);
    // goal row chalk emphasis
    c.fillRect(px, py + TILE - 1, COLS * TILE, 3);
    c.fillRect(px, py + (ROWS - 1) * TILE - 1, COLS * TILE, 3);
    // chalk wear
    for (let i = 0; i < 90; i++) {
      c.fillStyle = PAL.chalkDim;
      c.globalAlpha = 0.4;
      const wx = px + rng.next() * COLS * TILE;
      const edges = [py - 2, py + ROWS * TILE - 1, midY - 1];
      c.fillRect(Math.floor(wx), edges[rng.int(0, 2)] + rng.int(0, 2), 2, 1);
      c.globalAlpha = 1;
    }
  }

  // ── frame render ─────────────────────────────────────────────

  render(view: SceneView, dt: number) {
    const { ctx: c } = this;
    if (!this.bg) this.buildStatic();
    c.imageSmoothingEnabled = false;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = PAL.skyTop;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const shake = view.vfx;
    c.setTransform(this.scale, 0, 0, this.scale,
      this.offX + shake.shakeX * this.scale, this.offY + shake.shakeY * this.scale);

    c.drawImage(this.bg!, 0, 0);

    // animated crowd (cycle variants)
    this.crowdTimer += dt;
    if (this.crowdTimer > 0.28) {
      this.crowdTimer = 0;
      this.crowdFrame = (this.crowdFrame + 1 + (Math.random() < 0.3 ? 1 : 0)) % 3;
    }
    const f = this.crowdFrame;
    c.drawImage(this.crowdTop[f], 0, SKY_H + 4);
    const botY = PITCH_Y + ROWS * TILE + BOARD;
    c.drawImage(this.crowdBot[f], 0, botY + 5);
    c.drawImage(this.crowdL[f], 2, PITCH_Y - BOARD + 4);
    c.drawImage(this.crowdR[f], WORLD_W - SIDE + 2, PITCH_Y - BOARD + 4);

    // clouds drift
    c.fillStyle = 'rgba(44,42,78,0.9)';
    for (const cl of this.clouds) {
      cl.x += cl.speed * dt;
      if (cl.x - cl.w > WORLD_W) cl.x = -cl.w;
      c.fillRect(cl.x, cl.y, cl.w, 10);
      c.fillRect(cl.x + 8, cl.y - 6, cl.w * 0.5, 6);
      c.fillRect(cl.x + 14, cl.y + 10, cl.w * 0.4, 5);
    }

    // floodlight cones (subtle flicker)
    const flick = 0.05 + Math.sin(view.time * 13) * 0.008 + Math.sin(view.time * 31) * 0.006;
    c.fillStyle = `rgba(255,233,160,${Math.max(0.02, flick)})`;
    for (const tx of [26, WORLD_W - 26]) {
      c.beginPath();
      c.moveTo(tx - 14, SKY_H - 88);
      c.lineTo(tx + 14, SKY_H - 88);
      c.lineTo(tx + (tx < WORLD_W / 2 ? 150 : -150), SKY_H + 210);
      c.closePath();
      c.fill();
    }

    // goal-row glow pulse
    const pulse = 0.1 + Math.sin(view.time * 2.4) * 0.06;
    c.fillStyle = `rgba(255,107,107,${pulse})`;
    c.fillRect(PITCH_X, PITCH_Y, COLS * TILE, TILE);
    c.fillStyle = `rgba(41,211,181,${pulse})`;
    c.fillRect(PITCH_X, PITCH_Y + (ROWS - 1) * TILE, COLS * TILE, TILE);

    // surge shimmer on pitch edge
    if (view.surgeTeam >= 0) {
      const col = view.surgeTeam === 0 ? 'rgba(255,210,63,' : 'rgba(255,107,107,';
      const a = 0.25 + Math.sin(view.time * 6) * 0.15;
      c.strokeStyle = `${col}${a})`;
      c.lineWidth = 4;
      c.strokeRect(PITCH_X - 4, PITCH_Y - 4, COLS * TILE + 8, ROWS * TILE + 8);
    }

    this.drawHighlights(c, view);
    this.drawEntities(c, view);
    this.drawParticles(c, view.vfx);
    this.drawPopups(c, view.vfx);
    this.drawBanner(c, view);

    if (view.countdown) {
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = pixelFont(64);
      c.fillStyle = PAL.ink;
      c.fillText(view.countdown, WORLD_W / 2 + 4, WORLD_H / 2 + 6);
      c.fillStyle = PAL.reward;
      c.fillText(view.countdown, WORLD_W / 2, WORLD_H / 2);
    }

    // screen flash
    if (view.vfx.flashLife > 0) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = (view.vfx.flashLife / view.vfx.flashMax) * 0.32;
      c.fillStyle = view.vfx.flashColor;
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      c.globalAlpha = 1;
    }
  }

  private drawHighlights(c: CanvasRenderingContext2D, view: SceneView) {
    const t = view.time;

    // reachable tiles
    for (const m of view.hl.moves) {
      const { wx, wy } = tileCenter(m.x, m.y);
      const a = 0.35 + Math.sin(t * 5 + m.x + m.y) * 0.12;
      c.fillStyle = `rgba(110,243,255,${a})`;
      c.fillRect(wx - 3, wy - 8, 6, 6);
      c.fillRect(wx - 3, wy + 2, 6, 6);
      c.fillRect(wx - 8, wy - 3, 6, 6);
      c.fillRect(wx + 2, wy - 3, 6, 6);
    }

    // path preview
    if (view.hl.pathPreview.length) {
      c.fillStyle = 'rgba(110,243,255,0.85)';
      for (const p of view.hl.pathPreview) {
        const { wx, wy } = tileCenter(p.x, p.y);
        c.fillRect(wx - 3, wy - 3, 6, 6);
      }
    }

    // acted tiles dim
    for (const tile of view.hl.actedTiles) {
      const { wx, wy } = tileCenter(tile.x, tile.y);
      c.fillStyle = 'rgba(10,16,26,0.28)';
      c.fillRect(wx - TILE / 2, wy - TILE / 2, TILE, TILE);
    }

    // selection brackets
    if (view.hl.selectedTile) {
      const { wx, wy } = tileCenter(view.hl.selectedTile.x, view.hl.selectedTile.y);
      const s = TILE / 2 + 2 + Math.sin(t * 6) * 2;
      c.fillStyle = PAL.interact;
      const L = 10;
      const T2 = 4;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        c.fillRect(wx + sx * s - (sx < 0 ? 0 : T2), wy + sy * s - (sy < 0 ? 0 : T2), T2, L * (sy < 0 ? 1 : 1) * (sy < 0 ? 1 : 1));
        c.fillRect(wx + sx * s - (sx < 0 ? 0 : L), wy + sy * s - (sy < 0 ? 0 : T2), L, T2);
      }
    }
  }

  private drawEntities(c: CanvasRenderingContext2D, view: SceneView) {
    // sort by wy for depth
    const sorted = [...view.athletes].sort((a, b) => a.wy - b.wy);
    const t = view.time;

    for (const a of sorted) {
      // shadow
      c.fillStyle = 'rgba(8,14,20,0.35)';
      c.beginPath();
      c.ellipse(a.wx, a.wy + TILE * 0.34, TILE * 0.3, TILE * 0.11, 0, 0, Math.PI * 2);
      c.fill();

      const bob = a.pose === 'idle' || a.pose === 'carry' ? Math.sin(t * 2.6 + a.bobT) * 1.6 : 0;
      const size = TILE * 1.06;
      const sy = size * a.squash;
      const sx = size * (2 - a.squash);

      c.save();
      c.globalAlpha = a.alpha * (a.acted && !a.hasBall ? 0.55 : 1);
      c.translate(a.wx, a.wy + bob - TILE * 0.28);
      c.scale(1, 1);
      const spr = athleteSprite(a.kit, a.cls, a.pose, a.skinIdx);
      c.drawImage(spr, -sx / 2, -sy / 2 - size * 0.12, sx, sy);
      c.restore();

      if (a.flash > 0) {
        c.globalAlpha = Math.min(1, a.flash) * 0.85;
        c.fillStyle = a.flashColor;
        c.fillRect(a.wx - size / 2, a.wy + bob - TILE * 0.28 - sy / 2 - size * 0.12, size, sy);
        c.globalAlpha = 1;
      }

      // marks above head
      const topY = a.wy - TILE * 0.78 + bob;
      if (a.mark === 'pass' || a.mark === 'passRisky') {
        const risky = a.mark === 'passRisky';
        const col = risky ? PAL.danger : PAL.reward;
        const r = 9 + Math.sin(t * 6) * 1.5;
        c.strokeStyle = col;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(a.wx, topY - 6, r, 0, Math.PI * 2);
        c.stroke();
        if (risky) {
          c.fillStyle = col;
          c.font = pixelFont(12);
          c.textAlign = 'center';
          c.fillText('!', a.wx, topY - 10);
        }
      } else if (a.mark === 'shove') {
        c.fillStyle = PAL.danger;
        const yy = topY - 4 + Math.sin(t * 8) * 2;
        c.beginPath();
        c.moveTo(a.wx - 8, yy - 6);
        c.lineTo(a.wx + 8, yy - 6);
        c.lineTo(a.wx, yy + 4);
        c.closePath();
        c.fill();
      }

      // acted pip
      if (a.acted) {
        c.fillStyle = 'rgba(20,28,40,0.8)';
        c.fillRect(a.wx + TILE * 0.22, a.wy + TILE * 0.22, 10, 10);
        c.fillStyle = PAL.textDim;
        c.font = pixelFont(8);
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('✓', a.wx + TILE * 0.22 + 5, a.wy + TILE * 0.22 + 5);
      }
    }

    // the Core
    if (view.ball.visible) {
      const b = view.ball;
      const bounce = b.carried ? 0 : Math.abs(Math.sin(t * 3.2)) * 6;
      c.fillStyle = 'rgba(8,14,20,0.3)';
      c.beginPath();
      c.ellipse(b.wx, b.wy + TILE * 0.3, 8, 3.5, 0, 0, Math.PI * 2);
      c.fill();
      if (!b.carried) {
        const glow = 0.5 + Math.sin(t * 4) * 0.25;
        c.strokeStyle = `rgba(255,210,63,${glow})`;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(b.wx, b.wy - 4 - bounce, 11 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
        c.stroke();
      }
      const bs = TILE * 0.5;
      c.save();
      c.translate(b.wx, b.wy - 6 - bounce);
      c.rotate(b.spin);
      c.drawImage(coreSprite(), -bs / 2, -bs / 2, bs, bs);
      c.restore();
    }
  }

  private drawParticles(c: CanvasRenderingContext2D, vfx: Vfx) {
    for (const p of vfx.particles) {
      if (!p.alive) continue;
      const k = p.life / p.maxLife;
      c.globalAlpha = Math.min(1, k * 1.6);
      c.fillStyle = p.color;
      const s = p.shrink ? Math.max(1, p.size * k) : p.size;
      c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    c.globalAlpha = 1;
  }

  private drawPopups(c: CanvasRenderingContext2D, vfx: Vfx) {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const p of vfx.popups) {
      if (!p.alive) continue;
      const k = p.life / p.maxLife;
      const size = Math.round(11 * p.scale);
      c.font = pixelFont(size);
      c.globalAlpha = Math.min(1, k * 2);
      c.fillStyle = PAL.ink;
      c.fillText(p.text, p.x + 2, p.y + 2);
      c.fillStyle = p.color;
      c.fillText(p.text, p.x, p.y);
    }
    c.globalAlpha = 1;
  }

  private drawBanner(c: CanvasRenderingContext2D, view: SceneView) {
    const b = view.vfx.banner;
    if (!b) return;
    const age = b.maxLife - b.life;
    const inT = Math.min(1, age / 0.18);
    const outT = Math.min(1, b.life / 0.25);
    const ease = 1 - Math.pow(1 - inT, 3);
    const scale = (0.6 + 0.4 * ease) * (b.tier === 'large' ? 1.5 : b.tier === 'medium' ? 1.15 : 0.9);

    c.save();
    c.translate(WORLD_W / 2, WORLD_H * 0.42);
    c.scale(scale, scale);
    c.globalAlpha = Math.min(1, outT * 1.4);
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    // backing slab
    const wpx = Math.max(150, b.text.length * 22 + 50);
    c.fillStyle = 'rgba(14,20,32,0.88)';
    c.fillRect(-wpx / 2, -34, wpx, b.sub ? 78 : 62);
    c.fillStyle = b.color;
    c.fillRect(-wpx / 2, -34, wpx, 5);
    c.fillRect(-wpx / 2, b.sub ? 39 : 23, wpx, 5);

    c.font = pixelFont(b.tier === 'large' ? 30 : 22);
    c.fillStyle = PAL.ink;
    c.fillText(b.text, 3, -4);
    c.fillStyle = b.color;
    c.fillText(b.text, 0, -7);
    if (b.sub) {
      c.font = pixelFont(10);
      c.fillStyle = PAL.textMain;
      c.fillText(b.sub, 0, 20);
    }
    c.restore();
    c.globalAlpha = 1;
  }
}

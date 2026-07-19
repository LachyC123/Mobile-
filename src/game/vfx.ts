// VFX — pooled particles, pixel popups, banners, camera shake, hit-stop.
// Effect strength tiers: 'small' | 'medium' | 'large' so spectacle stays rare.

export type Tier = 'small' | 'medium' | 'large';

interface Particle {
  alive: boolean;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  shrink: boolean;
}

interface Popup {
  alive: boolean;
  x: number; y: number;
  text: string;
  color: string;
  life: number; maxLife: number;
  scale: number;
}

export interface Banner {
  text: string;
  sub?: string;
  color: string;
  life: number;
  maxLife: number;
  tier: Tier;
}

const MAX_PARTICLES = 320;
const MAX_POPUPS = 24;

export class Vfx {
  particles: Particle[] = [];
  popups: Popup[] = [];
  banner: Banner | null = null;
  flashColor = '';
  flashLife = 0;
  flashMax = 0.001;
  shakeMag = 0;
  shakeX = 0;
  shakeY = 0;
  hitstop = 0; // seconds of frozen gameplay remaining
  reducedShake = false;
  slowmo = 0; // seconds of slowed time remaining

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#fff', gravity: 0, drag: 1, shrink: true });
    }
    for (let i = 0; i < MAX_POPUPS; i++) {
      this.popups.push({ alive: false, x: 0, y: 0, text: '', color: '#fff', life: 0, maxLife: 1, scale: 1 });
    }
  }

  reset() {
    for (const p of this.particles) p.alive = false;
    for (const p of this.popups) p.alive = false;
    this.banner = null;
    this.flashLife = 0;
    this.shakeMag = 0;
    this.hitstop = 0;
    this.slowmo = 0;
  }

  spawn(x: number, y: number, opts: Partial<Particle> & { count?: number; spread?: number; speed?: number }) {
    const count = opts.count ?? 8;
    const spread = opts.spread ?? Math.PI * 2;
    const baseAngle = (opts as { angle?: number }).angle ?? 0;
    const speed = opts.speed ?? 90;
    for (let i = 0; i < count; i++) {
      const p = this.particles.find((q) => !q.alive);
      if (!p) return;
      const a = baseAngle + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      p.alive = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.maxLife = opts.maxLife ?? (0.4 + Math.random() * 0.4);
      p.life = p.maxLife;
      p.size = opts.size ?? 3;
      p.color = opts.color ?? '#ffffff';
      p.gravity = opts.gravity ?? 0;
      p.drag = opts.drag ?? 0.92;
      p.shrink = true;
    }
  }

  popup(x: number, y: number, text: string, color = '#ffffff', scale = 1) {
    const p = this.popups.find((q) => !q.alive);
    if (!p) return;
    p.alive = true;
    p.x = x; p.y = y;
    p.text = text;
    p.color = color;
    p.maxLife = 0.9;
    p.life = p.maxLife;
    p.scale = scale;
  }

  showBanner(text: string, opts?: { sub?: string; color?: string; tier?: Tier; dur?: number }) {
    const tier = opts?.tier ?? 'medium';
    const dur = opts?.dur ?? (tier === 'large' ? 2.2 : tier === 'medium' ? 1.4 : 0.9);
    this.banner = {
      text, sub: opts?.sub, color: opts?.color ?? '#ffffff',
      life: dur, maxLife: dur, tier,
    };
  }

  flash(color: string, dur = 0.18) {
    this.flashColor = color;
    this.flashLife = dur;
    this.flashMax = dur;
  }

  shake(mag: number) {
    if (this.reducedShake) mag *= 0.25;
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  freeze(sec: number) {
    this.hitstop = Math.max(this.hitstop, sec);
  }

  /** returns time scale for this frame (hit-stop & slow-mo aware) */
  update(dt: number): number {
    // banners/popups/particles always run on real time
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
    if (this.flashLife > 0) this.flashLife -= dt;

    this.shakeMag *= Math.pow(0.0015, dt); // fast decay
    if (this.shakeMag < 0.2) this.shakeMag = 0;
    this.shakeX = (Math.random() - 0.5) * 2 * this.shakeMag;
    this.shakeY = (Math.random() - 0.5) * 2 * this.shakeMag;

    for (const p of this.particles) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const p of this.popups) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.y -= 34 * dt;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return 0;
    }
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      return 0.35;
    }
    return 1;
  }
}

// Animated menu backdrop — dusk sky, twinkling crowd, floodlights, drifting clouds.
import { useEffect, useRef } from 'react';
import { PAL, CROWD_COLORS } from '@/game/palette';
import { Rng } from '@/game/rng';

export function CrowdBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let destroyed = false;
    const crowdVariants: HTMLCanvasElement[] = [];

    const build = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      crowdVariants.length = 0;
      const crowdH = Math.floor(h * 0.22);
      for (let v = 0; v < 3; v++) {
        const cv = document.createElement('canvas');
        cv.width = canvas.width;
        cv.height = crowdH * dpr;
        const cc = cv.getContext('2d')!;
        const rng = new Rng(777 + v * 55);
        for (let y = 0; y < cv.height; y += 4 * dpr) {
          for (let x = 0; x < cv.width; x += 3 * dpr) {
            if (rng.chance(0.8)) {
              cc.fillStyle = rng.pick(CROWD_COLORS);
              cc.fillRect(x, y, 2 * dpr, 2 * dpr);
              if (rng.chance(0.1)) {
                cc.fillStyle = rng.chance(0.5) ? '#29d3b5' : '#ffd23f';
                cc.fillRect(x, y - 2 * dpr, dpr, 2 * dpr);
              }
            }
          }
        }
        crowdVariants.push(cv);
      }
    };
    build();

    const rng = new Rng(99);
    const stars = Array.from({ length: 70 }, () => ({
      x: rng.next(), y: rng.next() * 0.5, s: rng.chance(0.2) ? 2 : 1, p: rng.next() * 6,
    }));
    const clouds = Array.from({ length: 4 }, () => ({
      x: rng.next(), y: 0.05 + rng.next() * 0.25, w: 0.14 + rng.next() * 0.16, v: 0.004 + rng.next() * 0.006,
    }));

    let t = 0;
    let last = performance.now();
    let crowdFrame = 0;
    let crowdTimer = 0;

    const loop = (ts: number) => {
      if (destroyed) return;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      t += dt;
      const w = canvas.width;
      const h = canvas.height;
      const dpr = w / (canvas.clientWidth || window.innerWidth);
      ctx.imageSmoothingEnabled = false;

      // sky
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, PAL.skyTop);
      g.addColorStop(0.5, PAL.skyMid);
      g.addColorStop(0.78, PAL.skyLow);
      g.addColorStop(0.92, PAL.horizon);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // stars (twinkle)
      for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 1.4 + s.p));
        ctx.fillStyle = PAL.star;
        ctx.fillRect(s.x * w, s.y * h, s.s * dpr, s.s * dpr);
      }
      ctx.globalAlpha = 1;

      // pixel moon (rounded clusters + craters + halo)
      const mx = w * 0.78;
      const my = h * 0.1;
      const u = 3 * dpr;
      ctx.fillStyle = 'rgba(244,232,201,0.12)';
      ctx.fillRect(mx - 4 * u, my - 4 * u, 14 * u, 14 * u);
      ctx.fillStyle = '#f4e8c9';
      const moonRows = [
        [2, 0, 4], [1, 1, 6], [0, 2, 8], [0, 3, 8], [0, 4, 8], [1, 5, 6], [2, 6, 4],
      ];
      for (const [ox, oy, len] of moonRows) ctx.fillRect(mx + ox * u, my + oy * u, len * u, u);
      ctx.fillStyle = '#e3d3ac';
      ctx.fillRect(mx + 2 * u, my + 2 * u, u, u);
      ctx.fillRect(mx + 5 * u, my + 4 * u, u, u);

      // clouds
      ctx.fillStyle = 'rgba(44,42,78,0.85)';
      for (const c of clouds) {
        c.x += c.v * dt;
        if (c.x > 1.2) c.x = -0.25;
        ctx.fillRect(c.x * w, c.y * h, c.w * w, 8 * dpr);
        ctx.fillRect((c.x + 0.03) * w, (c.y - 0.015) * h, c.w * w * 0.5, 5 * dpr);
      }

      // floodlight towers (behind the stands, masts rising from them)
      const crowdH = h * 0.22;
      const standY = h - crowdH;
      const flick = 0.06 + Math.sin(t * 12) * 0.01;
      for (const fx of [w * 0.08, w * 0.92]) {
        ctx.fillStyle = PAL.towerDark;
        ctx.fillRect(fx - 3 * dpr, standY - 30 * dpr, 6 * dpr, 32 * dpr + crowdH);
        ctx.fillRect(fx - 7 * dpr, standY - 22 * dpr, 14 * dpr, 3 * dpr);
        ctx.fillStyle = '#39415c';
        ctx.fillRect(fx - 11 * dpr, standY - 40 * dpr, 22 * dpr, 12 * dpr);
        ctx.fillStyle = PAL.lamp;
        ctx.fillRect(fx - 8 * dpr, standY - 37 * dpr, 6 * dpr, 7 * dpr);
        ctx.fillRect(fx + 2 * dpr, standY - 37 * dpr, 6 * dpr, 7 * dpr);
      }
      // light cones
      ctx.fillStyle = `rgba(255,233,160,${Math.max(0.02, flick)})`;
      for (const fx of [w * 0.08, w * 0.92]) {
        ctx.beginPath();
        ctx.moveTo(fx - 11 * dpr, standY - 34 * dpr);
        ctx.lineTo(fx + 11 * dpr, standY - 34 * dpr);
        ctx.lineTo(fx + (fx < w / 2 ? 150 : -150) * dpr, standY + crowdH * 0.35);
        ctx.closePath();
        ctx.fill();
      }

      // stands + crowd (covers the mast bases)
      ctx.fillStyle = PAL.standDark;
      ctx.fillRect(0, standY - 6 * dpr, w, crowdH + 6 * dpr);
      ctx.fillStyle = PAL.standLight;
      ctx.fillRect(0, standY - 6 * dpr, w, 3 * dpr);
      crowdTimer += dt;
      if (crowdTimer > 0.3) {
        crowdTimer = 0;
        crowdFrame = (crowdFrame + 1) % 3;
      }
      if (crowdVariants[crowdFrame]) ctx.drawImage(crowdVariants[crowdFrame], 0, standY);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => build();
    window.addEventListener('resize', onResize);
    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

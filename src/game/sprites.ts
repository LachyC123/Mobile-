// RUSHLINE sprite foundry — every sprite is authored pixel-by-pixel here.
// Keys: P/p = team primary (+shade), S/s = secondary (+shade), H/h = hair,
// K/k = skin (+shade), E = eye, W = white, B = boots, . = transparent.

import type { ClassId, ClubDef } from './constants';

export type Pose = 'idle' | 'run1' | 'run2' | 'carry' | 'celebrate';

// ── athlete body poses (16×16) ─────────────────────────────────

const BODY_IDLE = [
  '................',
  '....hhhhhhh.....',
  '...hhhhhhhhh....',
  '...hhKKKKKhh....',
  '...hKKKKKKKh....',
  '...hKEKKKEKh....',
  '....KKKKKKK.....',
  '....KKkKKK......',
  '...PPPPPPPPP....',
  '..pPPPPPPPPPp...',
  '..KpPPPPPPPpK...',
  '..KpPpPPPpPpK...',
  '....pPPPPPp.....',
  '....SSS.SSS.....',
  '....WWW.WWW.....',
  '...BBBB.BBBB....',
];

const BODY_RUN1 = [
  '................',
  '....hhhhhhh.....',
  '...hhhhhhhhh....',
  '...hhKKKKKhh....',
  '...hKKKKKKKh....',
  '...hKEKKKEKh....',
  '....KKKKKKK.....',
  '....KKkKKK......',
  '...PPPPPPPPP....',
  '..KpPPPPPPPp....',
  '..KpPPPPPPPpK...',
  '....pPPPPPpK....',
  '...SSS..SSS.....',
  '..WWW....WWW....',
  '.BBB......BBB...',
  '................',
];

const BODY_RUN2 = [
  '................',
  '....hhhhhhh.....',
  '...hhhhhhhhh....',
  '...hhKKKKKhh....',
  '...hKKKKKKKh....',
  '...hKEKKKEKh....',
  '....KKKKKKK.....',
  '....KKkKKK......',
  '...PPPPPPPPP....',
  '....pPPPPPPPpK..',
  '...KpPPPPPPpK...',
  '....KpPPPPp.....',
  '.....SSS..SSS...',
  '....WWW....WWW..',
  '...BBB......BBB.',
  '................',
];

const BODY_CARRY = [
  '................',
  '....hhhhhhh.....',
  '...hhhhhhhhh....',
  '...hhKKKKKhh....',
  '...hKKKKKKKh....',
  '...hKEKKKEKh....',
  '....KKKKKKK.....',
  '....KKkKKK......',
  '...PPPPPPPPP....',
  '..pPPPPPPPPPp...',
  '..pPPKKKKKPPp...',
  '..pPPPPPPPPPp...',
  '....pPPPPPp.....',
  '....SSS.SSS.....',
  '....WWW.WWW.....',
  '...BBBB.BBBB....',
];

const BODY_CELEBRATE = [
  '................',
  '.K............K.',
  '.K..hhhhhhh..K..',
  '.K.hhhhhhhhh.K..',
  '..KhhKKKKKhhK...',
  '...hKKKKKKKh....',
  '...hKEKKKEKh....',
  '....KKKKKKK.....',
  '....KKkKKK......',
  '...PPPPPPPPP....',
  '..pPPPPPPPPPp...',
  '..pPPpPPPpPPp...',
  '....pPPPPPp.....',
  '....SSS.SSS.....',
  '....WWW.WWW.....',
  '...BBBB.BBBB....',
];

const POSE_BODIES: Record<Pose, string[]> = {
  idle: BODY_IDLE,
  run1: BODY_RUN1,
  run2: BODY_RUN2,
  carry: BODY_CARRY,
  celebrate: BODY_CELEBRATE,
};

// ── class overlays: [x, y, key] triplets, pose-independent ─────
// Guard: helmet dome + shoulder pads. Rusher: headband. Captain: chest star + armband.

const OVERLAYS: Record<ClassId, [number, number, string][]> = {
  GUARD: [
    [4, 1, 'S'], [5, 1, 'S'], [6, 1, 'S'], [7, 1, 'S'], [8, 1, 'S'], [9, 1, 'S'], [10, 1, 'S'], [11, 1, 'S'],
    [3, 2, 'S'], [12, 2, 'S'],
    [3, 3, 's'], [12, 3, 's'],
    [2, 8, 'P'], [13, 8, 'P'],
    [1, 9, 'P'], [14, 9, 'P'],
  ],
  RUSHER: [
    [3, 3, 'P'], [4, 3, 'P'], [5, 3, 'P'], [6, 3, 'P'], [7, 3, 'P'], [8, 3, 'P'], [9, 3, 'P'], [10, 3, 'P'], [11, 3, 'P'], [12, 3, 'P'],
  ],
  CAPTAIN: [
    [7, 9, 'W'], [8, 9, 'W'],
    [6, 10, 'W'], [7, 10, 'W'], [8, 10, 'W'], [9, 10, 'W'],
    [7, 11, 'W'], [8, 11, 'W'],
    [12, 9, 'S'], [13, 9, 'S'], [12, 10, 'S'], [13, 10, 'S'],
  ],
};

// ── the Core (ball), 8×8 ────────────────────────────────────────

const CORE = [
  '..cccc..',
  '.cWWcccc',
  'cWcCCccc',
  'cCCCCCCc',
  'cCCCCCCc',
  'cCCCCCcc',
  '.cccccc.',
  '..cccc..',
];

// ── coach portrait, 24×24 (tutorial + loading) ─────────────────

const COACH = [
  '........................',
  '......TTTTTTTTTTT.......',
  '.....TTTTTTTTTTTTT......',
  '.....TTTTTTTTTTTTTTT....',
  '.....tttttttttttt.......',
  '.....ttKKKKKKKKtt.......',
  '.....tKKKKKKKKKKt.......',
  '.....tKEKKKKEKKt........',
  '.....tKKKKKKKKKKt.......',
  '.....tKKKKkKKKKt........',
  '......KKKKKKKKK.........',
  '....WWWWWWWWWWWWWW......',
  '..WWJJJJJJJJJJJJJJWW....',
  '..WJjJJJJJJJJJJJJjJW....',
  '..WJJJJJTTTTTJJJJJJW....',
  '..WJJJJJTTTTTJJJJJW.....',
  '...JJJJTTTTTTTJJJJ......',
  '...JJJJTTTTTTTJJJJ......',
  '...JJJJJJTTTJJJJJ.......',
  '...KKJJJJJJJJJJJKK......',
  '...KKJJJJJJJJJJJKK......',
  '....JJJJJJJJJJJJ........',
  '....JJJJJJJJJJJJ........',
  '........................',
];

// ── shade + sprite baking ──────────────────────────────────────

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export const SKIN_TONES = [
  { K: '#f2c9a0', k: '#d9a678' },
  { K: '#c98d5f', k: '#a86b42' },
  { K: '#8a5a3b', k: '#6b4229' },
];

interface KeyMap {
  [key: string]: string;
}

function bake(rows: string[], map: KeyMap, overlays?: [number, number, string][]): HTMLCanvasElement {
  const h = rows.length;
  const w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  const put = (x: number, y: number, ch: string) => {
    const col = map[ch];
    if (!col) return;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`sprite row ${y} has width ${row.length}, expected ${w}`);
    for (let x = 0; x < w; x++) if (row[x] !== '.') put(x, y, row[x]);
  });
  if (overlays) for (const [x, y, ch] of overlays) put(x, y, ch);
  return cv;
}

export interface TeamKit {
  primary: string;
  secondary: string;
}

const kitMap = (kit: TeamKit, skinIdx: number): KeyMap => ({
  P: kit.primary,
  p: shade(kit.primary, 0.72),
  S: kit.secondary,
  s: shade(kit.secondary, 0.7),
  H: shade(kit.secondary, 0.55),
  h: shade(kit.secondary, 0.45),
  K: SKIN_TONES[skinIdx % SKIN_TONES.length].K,
  k: SKIN_TONES[skinIdx % SKIN_TONES.length].k,
  E: '#1c2430',
  W: '#ffffff',
  B: '#1c2430',
});

const spriteCache = new Map<string, HTMLCanvasElement>();

export function athleteSprite(kit: TeamKit, cls: ClassId, pose: Pose, skinIdx = 0): HTMLCanvasElement {
  const cacheKey = `${kit.primary}|${kit.secondary}|${cls}|${pose}|${skinIdx}`;
  let cv = spriteCache.get(cacheKey);
  if (cv) return cv;
  cv = bake(POSE_BODIES[pose], kitMap(kit, skinIdx), OVERLAYS[cls]);
  spriteCache.set(cacheKey, cv);
  return cv;
}

let coreCanvas: HTMLCanvasElement | null = null;
export function coreSprite(): HTMLCanvasElement {
  if (!coreCanvas) {
    coreCanvas = bake(CORE, {
      c: '#ffc94d', C: '#ffe08a', W: '#fffbe8',
    });
  }
  return coreCanvas;
}

let coachCanvas: HTMLCanvasElement | null = null;
export function coachSprite(): HTMLCanvasElement {
  if (!coachCanvas) {
    coachCanvas = bake(COACH, {
      T: '#29d3b5', t: '#17324a',
      K: SKIN_TONES[1].K, k: SKIN_TONES[1].k,
      E: '#1c2430', W: '#ffffff',
      J: '#17324a', j: '#0f2233',
    });
  }
  return coachCanvas;
}

// ── club crests: 20×22 shields with per-club motif ─────────────

export function crestCanvas(club: ClubDef, px = 3): HTMLCanvasElement {
  const W = 20;
  const H = 22;
  const cv = document.createElement('canvas');
  cv.width = W * px;
  cv.height = H * px;
  const ctx = cv.getContext('2d')!;
  const p = shade(club.primary, 0.75);
  const s = club.secondary;
  const w = '#f2f6ff';

  const pxRect = (x: number, y: number, ww: number, hh: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x * px, y * px, ww * px, hh * px);
  };

  // shield silhouette
  for (let y = 0; y < H; y++) {
    let inset = 0;
    if (y > 14) inset = y - 14;
    if (y >= 20) inset = 6;
    if (y === 21) inset = 8;
    pxRect(inset, y, W - inset * 2, 1, s);
    if (W - inset * 2 > 2) pxRect(inset + 1, y, W - inset * 2 - 2, 1, club.primary);
  }
  // top band
  pxRect(1, 1, W - 2, 3, s);

  // motif
  ctx.fillStyle = w;
  const motif = club.motif;
  if (motif === 'stripes') {
    for (let x = 3; x < W - 2; x += 4) pxRect(x, 5, 2, 11, p);
  } else if (motif === 'hoops') {
    for (let y = 6; y < 15; y += 4) pxRect(2, y, W - 4, 2, p);
  } else if (motif === 'checker') {
    for (let y = 5; y < 15; y += 2)
      for (let x = 2 + ((y / 2) % 2) * 2; x < W - 2; x += 4) pxRect(x, y, 2, 2, p);
  } else if (motif === 'bolt') {
    const bolt: [number, number][] = [[11, 5], [10, 6], [9, 7], [8, 8], [7, 9], [10, 9], [9, 10], [8, 11], [7, 12], [6, 13], [5, 14]];
    for (const [x, y] of bolt) pxRect(x, y, 2, 2, w);
  } else if (motif === 'star') {
    const star: [number, number][] = [[9, 5], [8, 7], [7, 7], [11, 7], [12, 7], [6, 9], [13, 9], [8, 11], [11, 11], [7, 13], [12, 13]];
    for (const [x, y] of star) pxRect(x, y, 2, 2, w);
  } else if (motif === 'diamond') {
    const dia: [number, number][] = [[9, 5], [8, 7], [10, 7], [7, 9], [11, 9], [8, 11], [10, 11], [9, 13]];
    for (const [x, y] of dia) pxRect(x, y, 2, 2, w);
  }
  return cv;
}

export function crestDataURL(club: ClubDef, px = 3): string {
  const cacheKey = `crest:${club.id}:${px}`;
  const cached = spriteCache.get(cacheKey);
  if (cached) return (cached as unknown as { du: string }).du;
  const cv = crestCanvas(club, px);
  const du = cv.toDataURL();
  spriteCache.set(cacheKey, Object.assign(document.createElement('canvas'), { du }) as HTMLCanvasElement);
  return du;
}

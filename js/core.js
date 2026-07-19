'use strict';
// GOLAZO DECK — core engine: canvas, loop, input, bitmap font, ui, particles, juice.
window.GD = window.GD || {};
(function (G) {

const W = 216, H = 384;
G.W = W; G.H = H;

// ---------- canvas ----------
const cv = document.createElement('canvas');
cv.width = W; cv.height = H;
document.body.appendChild(cv);
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
G.cv = cv; G.ctx = ctx;
G.viewScale = 1;

function resize() {
  const ww = window.innerWidth, wh = window.innerHeight;
  const s = Math.min(ww / W, wh / H);
  cv.style.width = (W * s) + 'px';
  cv.style.height = (H * s) + 'px';
  cv.style.left = ((ww - W * s) / 2) + 'px';
  cv.style.top = ((wh - H * s) / 2) + 'px';
  G.viewScale = s;
}
window.addEventListener('resize', resize);
resize();

G.makeCanvas = function (w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return c;
};

// ---------- math / rng ----------
G.clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
G.lerp = (a, b, t) => a + (b - a) * t;
G.rand = Math.random;
G.irand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
G.pick = arr => arr[Math.floor(Math.random() * arr.length)];
G.chance = p => Math.random() < p;
G.gauss = () => (Math.random() + Math.random() + Math.random()) * 2 / 3 - 1; // approx normal, [-1,1]
G.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
// seeded rng (deterministic roster)
G.mulberry = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
G.ease = {
  outQ: t => 1 - (1 - t) * (1 - t),
  inQ: t => t * t,
  outC: t => 1 - Math.pow(1 - t, 3),
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1
};

// ---------- input ----------
const P = {
  x: 0, y: 0, down: false, justDown: false, justUp: false,
  startX: 0, startY: 0, upX: 0, upY: 0,
  dx: 0, dy: 0,          // movement this frame
  downTime: 0,           // seconds held
  moved: 0               // total px moved since press
};
G.P = P;
let px = 0, py = 0;

function evPos(e) {
  const r = cv.getBoundingClientRect();
  return {
    x: G.clamp((e.clientX - r.left) / G.viewScale, 0, W - 1),
    y: G.clamp((e.clientY - r.top) / G.viewScale, 0, H - 1)
  };
}
window.addEventListener('pointerdown', e => {
  e.preventDefault();
  const p = evPos(e);
  P.down = true; P.justDown = true;
  P.x = p.x; P.y = p.y; P.startX = p.x; P.startY = p.y;
  P.downTime = 0; P.moved = 0;
  px = p.x; py = p.y;
  if (G.audio) G.audio.unlock();
}, { passive: false });
window.addEventListener('pointermove', e => {
  if (!P.down) return;
  const p = evPos(e);
  P.x = p.x; P.y = p.y;
}, { passive: false });
function release(e) {
  if (!P.down) return;
  P.down = false; P.justUp = true;
  P.upX = P.x; P.upY = P.y;
}
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
window.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

// ---------- bitmap font (3x5) ----------
const FONT = {
  'A': [2, 5, 7, 5, 5], 'B': [6, 5, 6, 5, 6], 'C': [3, 4, 4, 4, 3], 'D': [6, 5, 5, 5, 6],
  'E': [7, 4, 6, 4, 7], 'F': [7, 4, 6, 4, 4], 'G': [3, 4, 5, 5, 3], 'H': [5, 5, 7, 5, 5],
  'I': [7, 2, 2, 2, 7], 'J': [1, 1, 1, 5, 2], 'K': [5, 5, 6, 5, 5], 'L': [4, 4, 4, 4, 7],
  'M': [5, 7, 7, 5, 5], 'N': [6, 5, 5, 5, 5], 'O': [2, 5, 5, 5, 2], 'P': [6, 5, 6, 4, 4],
  'Q': [2, 5, 5, 3, 1], 'R': [6, 5, 6, 5, 5], 'S': [3, 4, 2, 1, 6], 'T': [7, 2, 2, 2, 2],
  'U': [5, 5, 5, 5, 7], 'V': [5, 5, 5, 5, 2], 'W': [5, 5, 7, 7, 5], 'X': [5, 5, 2, 5, 5],
  'Y': [5, 5, 2, 2, 2], 'Z': [7, 1, 2, 4, 7],
  '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [6, 1, 2, 4, 7], '3': [7, 1, 3, 1, 7],
  '4': [5, 5, 7, 1, 1], '5': [7, 4, 6, 1, 6], '6': [3, 4, 7, 5, 7], '7': [7, 1, 2, 2, 2],
  '8': [7, 5, 2, 5, 7], '9': [7, 5, 7, 1, 6],
  ' ': [0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 2], ',': [0, 0, 0, 2, 4], '!': [2, 2, 2, 0, 2],
  '?': [6, 1, 2, 0, 2], '-': [0, 0, 7, 0, 0], '+': [0, 2, 7, 2, 0], ':': [0, 2, 0, 2, 0],
  '/': [1, 1, 2, 4, 4], "'": [2, 4, 0, 0, 0], '(': [1, 2, 2, 2, 1], ')': [4, 2, 2, 2, 4],
  '%': [5, 1, 2, 4, 5], '>': [4, 2, 1, 2, 4], '<': [1, 2, 4, 2, 1], '&': [2, 5, 2, 5, 3],
  '"': [5, 5, 0, 0, 0], '*': [5, 2, 7, 2, 5], '=': [0, 7, 0, 7, 0]
};

// draw a string; opts: {c:color, s:scale, align:'l'|'c'|'r', outline:color, alpha}
G.text = function (str, x, y, opts) {
  opts = opts || {};
  const s = opts.s || 1;
  const col = opts.c || '#ffffff';
  str = String(str).toUpperCase();
  const w = G.textW(str, s);
  if (opts.align === 'c') x -= Math.floor(w / 2);
  else if (opts.align === 'r') x -= w;
  x = Math.round(x); y = Math.round(y);
  if (opts.alpha !== undefined) { ctx.save(); ctx.globalAlpha = opts.alpha; }
  if (opts.outline) {
    drawRun(str, x - s, y, s, opts.outline);
    drawRun(str, x + s, y, s, opts.outline);
    drawRun(str, x, y - s, s, opts.outline);
    drawRun(str, x, y + s, s, opts.outline);
  }
  drawRun(str, x, y, s, col);
  if (opts.alpha !== undefined) ctx.restore();
  return w;
};
function drawRun(str, x, y, s, col) {
  ctx.fillStyle = col;
  let cx = x;
  for (let i = 0; i < str.length; i++) {
    const g = FONT[str[i]] || FONT['?'];
    for (let r = 0; r < 5; r++) {
      const bits = g[r];
      if (!bits) continue;
      for (let c = 0; c < 3; c++) {
        if (bits & (4 >> c)) ctx.fillRect(cx + c * s, y + r * s, s, s);
      }
    }
    cx += 4 * s;
  }
}
G.textW = (str, s) => String(str).length * 4 * (s || 1) - (s || 1);

// word-wrapped text, returns height used
G.textWrap = function (str, x, y, maxW, opts) {
  opts = opts || {};
  const s = opts.s || 1;
  const words = String(str).split(' ');
  let line = '', ly = y;
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (G.textW(test, s) > maxW && line) {
      G.text(line, x, ly, opts);
      line = wd; ly += 7 * s;
    } else line = test;
  }
  if (line) G.text(line, x, ly, opts);
  return ly + 7 * s - y;
};

// ---------- shapes ----------
G.rect = function (x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
// pixel-rounded panel: corners notched 1px
G.panel = function (x, y, w, h, fill, border, shadow) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillRect(x + 1, y + 2, w, h);
  }
  ctx.fillStyle = border || '#181425';
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
};
G.frameRect = function (x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
};
G.fillCircle = function (cx, cy, r, c) {
  ctx.fillStyle = c;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
};
G.dither = function (x, y, w, h, c) { // 50% checker
  ctx.fillStyle = c;
  x = Math.round(x); y = Math.round(y);
  for (let yy = 0; yy < h; yy++)
    for (let xx = (yy & 1); xx < w; xx += 2)
      ctx.fillRect(x + xx, y + yy, 1, 1);
};

// ---------- immediate-mode button ----------
// returns true when clicked this frame
G.button = function (x, y, w, h, label, opts) {
  opts = opts || {};
  const inside = (qx, qy) => qx >= x - 2 && qx <= x + w + 2 && qy >= y - 2 && qy <= y + h + 2;
  const pressed = P.down && inside(P.x, P.y) && inside(P.startX, P.startY) && !G.transBusy();
  const oy = pressed ? 1 : 0;
  const fill = opts.disabled ? '#3a4466' : (opts.fill || '#e43b44');
  const border = '#181425';
  if (!pressed && !opts.flat) G.rect(x, y + 2, w, h, '#181425');
  G.panel(x, y + oy, w, h, fill, border);
  // top light edge
  if (!opts.disabled) G.rect(x + 1, y + oy + 1, w - 2, 1, opts.hi || 'rgba(255,255,255,0.35)');
  const tc = opts.disabled ? '#8b9bb4' : (opts.tc || '#ffffff');
  const ts = opts.s || 1;
  G.text(label, x + w / 2, y + oy + Math.floor((h - 5 * ts) / 2), { c: tc, align: 'c', s: ts });
  if (opts.disabled) return false;
  if (P.justUp && inside(P.upX, P.upY) && inside(P.startX, P.startY) && P.moved < 9 && !G.transBusy()) {
    if (G.audio) G.audio.ui();
    return true;
  }
  return false;
};
// invisible tap zone
G.tapped = function (x, y, w, h) {
  if (G.transBusy()) return false;
  const inside = (qx, qy) => qx >= x && qx <= x + w && qy >= y && qy <= y + h;
  return P.justUp && inside(P.upX, P.upY) && inside(P.startX, P.startY) && P.moved < 9;
};

// ---------- juice: shake / flash / hitstop / slowmo ----------
let trauma = 0, shakeT = 0;
G.addShake = a => { trauma = Math.min(1, trauma + a); };
let flashCol = null, flashT = 0, flashD = 0;
G.flash = (c, d) => { flashCol = c; flashT = d || 0.12; flashD = flashT; };
let hitStopT = 0;
G.hitStop = t => { hitStopT = Math.max(hitStopT, t); };
G.timeScale = 1;
G.vibrate = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };

// ---------- particles ----------
const parts = [];
G.burst = function (x, y, opts) {
  opts = opts || {};
  const n = opts.n || 8;
  for (let i = 0; i < n; i++) {
    const a = opts.a !== undefined ? opts.a + (Math.random() - 0.5) * (opts.spread || 1.2) : Math.random() * Math.PI * 2;
    const sp = (opts.sp || 40) * (0.4 + Math.random() * 0.8);
    parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      g: opts.g !== undefined ? opts.g : 90,
      life: (opts.life || 0.5) * (0.6 + Math.random() * 0.6),
      t: 0,
      c: Array.isArray(opts.c) ? G.pick(opts.c) : (opts.c || '#ffffff'),
      sz: opts.sz || 2, wob: opts.wob || 0
    });
  }
};
const pops = []; // floating text
G.pop = function (txt, x, y, opts) {
  opts = opts || {};
  pops.push({ txt, x, y, t: 0, life: opts.life || 0.9, c: opts.c || '#ffffff', s: opts.s || 1, o: opts.outline || '#181425' });
};
function updateFX(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    if (p.t >= p.life) { parts.splice(i, 1); continue; }
    p.vy += p.g * dt;
    p.x += p.vx * dt + (p.wob ? Math.sin(p.t * 12 + p.x) * p.wob * dt : 0);
    p.y += p.vy * dt;
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.t += dt;
    if (p.t >= p.life) pops.splice(i, 1);
  }
}
function drawFX() {
  for (const p of parts) {
    const k = 1 - p.t / p.life;
    const sz = Math.max(1, Math.round(p.sz * (k > 0.5 ? 1 : k * 2)));
    G.rect(p.x - sz / 2, p.y - sz / 2, sz, sz, p.c);
  }
  for (const p of pops) {
    const k = p.t / p.life;
    const y = p.y - G.ease.outQ(k) * 14;
    G.text(p.txt, p.x, y, { c: p.c, align: 'c', s: p.s, outline: p.o, alpha: k > 0.7 ? (1 - k) / 0.3 : 1 });
  }
}
G.clearFX = () => { parts.length = 0; pops.length = 0; };

// ---------- toast ----------
let toastMsg = null, toastT = 0;
G.toast = function (msg) { toastMsg = msg; toastT = 1.6; };

// ---------- scenes + transition ----------
const scenes = {};
let scene = null, sceneName = '';
let trans = null; // {ph:'out'|'in', t, name, args}
G.reg = (name, s) => { scenes[name] = s; };
G.go = function (name, args) {
  if (!scene) {
    scene = scenes[name]; sceneName = name;
    if (scene.enter) scene.enter(args);
    trans = { ph: 'in', t: 0 };
    return;
  }
  if (trans) return;
  trans = { ph: 'out', t: 0, name, args };
};
G.sceneName = () => sceneName;
G.transBusy = () => !!trans;

function drawTrans() {
  if (!trans) return;
  const k = trans.ph === 'out' ? G.ease.inQ(trans.t) : 1 - G.ease.outQ(trans.t);
  ctx.fillStyle = '#181425';
  const stripes = 8, sh = H / stripes;
  for (let i = 0; i < stripes; i++) {
    const off = (i % 2 === 0 ? 1 : -1);
    const w = Math.round(W * k);
    ctx.fillRect(off > 0 ? 0 : W - w, Math.round(i * sh), w, Math.ceil(sh));
  }
}

// ---------- main loop ----------
let last = 0;
G.time = 0;
function frame(t) {
  requestAnimationFrame(frame);
  let dt = Math.min((t - last) / 1000, 0.05);
  last = t;
  G.time += dt;
  if (P.down) { P.downTime += dt; }
  P.dx = P.x - px; P.dy = P.y - py;
  P.moved += Math.abs(P.dx) + Math.abs(P.dy);
  px = P.x; py = P.y;

  // transition
  if (trans) {
    trans.t += dt * 3.4;
    if (trans.t >= 1) {
      if (trans.ph === 'out') {
        G.clearFX();
        scene = scenes[trans.name]; sceneName = trans.name;
        if (scene.enter) scene.enter(trans.args);
        trans = { ph: 'in', t: 0 };
      } else trans = null;
    }
  }

  // hitstop freezes sim
  let sdt = dt * G.timeScale;
  if (hitStopT > 0) { hitStopT -= dt; sdt = 0; }

  if (scene && scene.update) scene.update(sdt, dt);
  updateFX(sdt || dt * 0.15);

  // shake
  trauma = Math.max(0, trauma - dt * 1.6);
  shakeT += dt * 30;
  const sh = trauma * trauma;
  const sx = Math.round(5 * sh * Math.sin(shakeT * 1.7));
  const sy = Math.round(4 * sh * Math.sin(shakeT * 2.3));

  ctx.save();
  ctx.translate(sx, sy);
  if (scene && scene.draw) scene.draw();
  drawFX();
  ctx.restore();

  // flash overlay
  if (flashT > 0) {
    flashT -= dt;
    ctx.save();
    ctx.globalAlpha = Math.max(0, flashT / flashD) * 0.65;
    ctx.fillStyle = flashCol;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // toast
  if (toastT > 0) {
    toastT -= dt;
    const a = Math.min(1, toastT / 0.3);
    ctx.save(); ctx.globalAlpha = a;
    const tw = G.textW(toastMsg, 1) + 12;
    G.panel(W / 2 - tw / 2, H - 46, tw, 13, '#262b44', '#181425');
    G.text(toastMsg, W / 2, H - 42, { c: '#ffffff', align: 'c' });
    ctx.restore();
  }

  drawTrans();

  P.justDown = false; P.justUp = false;
}
requestAnimationFrame(frame);

})(window.GD);

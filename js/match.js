'use strict';
// GOLAZO DECK — match scene: moment-based gameplay. Flick shots, aftertouch curl,
// physical keeper AI, and glove-drag defend moments.
(function (G) {

const C = () => G.C;
const D = () => G.D;

const BALLX = 108, BALLY = 330;

const MOMENTNAME = {
  open: 'OPEN PLAY', freekick: 'FREE KICK', volley: 'VOLLEY',
  oneonone: 'ONE ON ONE', penalty: 'PENALTY', defend: 'DEFEND!'
};

const COMM = {
  goal: ['GOAL!', 'BURIED!', 'WHAT A FINISH!', 'TOP CLASS!'],
  golazo: ['GOLAZO!!!', 'SCREAMER!', 'UNSTOPPABLE!', 'PURE MAGIC!'],
  save: ['DENIED!', 'GREAT SAVE!', 'KEPT OUT!'],
  parry: ['PUSHED WIDE!', 'TIPPED AWAY!'],
  miss: ['WIDE!', 'OFF TARGET!', 'INTO THE STANDS!'],
  over: ['OVER THE BAR!', 'SKIED IT!'],
  post: ['OFF THE POST!', 'CLANG!'],
  postin: ['IN OFF THE POST!', 'KISSED THE POST... IN!'],
  block: ['BLOCKED!', 'INTO THE WALL!'],
  under: ['UNDER THE WALL!'],
  smother: ['SMOTHERED!', 'TOO SLOW!'],
  lost: ['DISPOSSESSED!', 'TACKLED!'],
  fluff: ['MISKICKED!', 'FLUFFED IT!'],
  oursave: ['WHAT A SAVE!', 'SAFE HANDS!', 'DENIED THEM!'],
  ourparry: ['PARRIED CLEAR!', 'FISTED AWAY!'],
  concede: ['THEY SCORE...', 'IN THE NET...', 'PICKED THE CORNER...']
};

const M = {}; // scene state
let S; // shorthand for match state object

function genMoments() {
  const cfg = M.opp.cfg;
  const total = 5;
  const defN = cfg.defN;
  const types = [];
  types.push('open');
  const atkPool = ['freekick', 'volley', 'oneonone', 'open'];
  while (types.length < total - defN) types.push(G.pick(atkPool));
  if (G.chance(0.18)) types[types.length - 1] = 'penalty';
  for (let i = 0; i < defN; i++) types.splice(G.irand(1, types.length), 0, 'defend');
  // minutes ascending
  const mins = [];
  while (mins.length < total) mins.push(G.irand(4, 90));
  mins.sort((a, b) => a - b);
  return types.map((t, i) => ({ type: t, minute: mins[i] }));
}

G.reg('match', {
  enter() {
    M.opp = D().opponent();
    M.moments = genMoments();
    M.idx = -1;
    M.us = 0; M.them = 0; M.saves = 0;
    M.events = M.moments.map(() => 0); // 0 pending, 1 goal, 2 fail, 3 concede, 4 save
    M.state = 'intro';
    M.t = 0;
    M.ripple = null;
    M.excite = 0;
    G.audio.music(false);
    G.audio.crowd(0.7);
    G.audio.whistle(1);
    G.timeScale = 1;
  },

  update(dt, rdt) {
    M.t += rdt; // real time for UI
    M.excite = Math.max(0, M.excite - rdt * 0.5);
    if (M.ripple && M.ripple.t > 0) M.ripple.t -= rdt * 2;
    const st = M.state;
    if (st === 'intro') {
      if (M.t > 2.2 || (M.t > 0.6 && G.P.justUp)) nextMoment();
    } else if (st === 'setup') {
      if (M.t > 1.1) startMoment();
    } else if (st === 'aim') {
      updateAim(dt, rdt);
    } else if (st === 'volleywait') {
      updateVolleyWait(dt, rdt);
    } else if (st === 'flight') {
      updateFlight(dt, rdt);
    } else if (st === 'defprep') {
      updateDefPrep(dt, rdt);
    } else if (st === 'defflight') {
      updateDefFlight(dt, rdt);
    } else if (st === 'outcome') {
      if (M.t > 1.7 || (M.t > 0.7 && G.P.justUp)) nextMoment();
    } else if (st === 'fulltime') {
      if (M.t > 1.6) {
        G.timeScale = 1;
        G.audio.crowd(0);
        G.go('result', {
          us: M.us, them: M.them, saves: M.saves, opp: M.opp, events: M.events
        });
        M.state = 'done';
      }
    }
  },

  draw() {
    G.stadium({ sky: M.opp.cfg.sky, kits: [G.KITS[D().s().club.kit], G.KITS[M.opp.kit]], excite: M.excite, crowdSeed: M.opp.seed });
    G.drawGoal(M.ripple);
    const st = M.state;
    if (st === 'intro') return drawIntro();
    if (st === 'pick') { drawScoreboard(); drawPick(); return; }
    drawMomentWorld();
    drawScoreboard();
    if (st === 'setup') drawSetupBanner();
    if (st === 'outcome') drawOutcome();
    if (st === 'fulltime') {
      G.text('FULL TIME', G.W / 2, 160, { c: '#ffffff', s: 2, align: 'c', outline: '#181425' });
    }
  }
});

// ---------- flow ----------
function nextMoment() {
  G.timeScale = 1;
  M.idx++;
  if (M.idx >= M.moments.length) {
    M.state = 'fulltime'; M.t = 0;
    G.audio.whistleLong();
    return;
  }
  M.mom = M.moments[M.idx];
  M.cands = D().eligible(M.mom.type);
  M.state = 'pick'; M.t = 0;
}

function selectCard(card) {
  M.card = card;
  D().useStamina(card, M.mom.type === 'defend' ? 16 : 24);
  D().persist();
  M.state = 'setup'; M.t = 0;
  G.audio.ui();
}

function startMoment() {
  M.t = 0;
  M.shot = null;
  const type = M.mom.type;
  if (type === 'defend') {
    M.def = initDefend();
    M.state = 'defprep';
  } else {
    M.aim = initAim(type);
    M.state = type === 'volley' ? 'volleywait' : 'aim';
  }
}

// ---------- shared stat helpers ----------
function fx(key) { return D().eff(M.card, key); } // fatigued effective stat
function hasTrait(t) { return M.card.trait === t; }

// ---------- AIM ----------
function initAim(type) {
  const a = {
    type, dragging: false, gx: 0, gy: 8, power: 0,
    time: 0, kz: 0,           // keeper advance (1v1)
    pressT: M.opp.cfg.defT,   // open-play pressure
    defX: G.chance(0.5) ? -20 : 236, // defender slides in from a side
    wall: null, vol: null
  };
  if (type === 'freekick') {
    const side = G.chance(0.5) ? -1 : 1;
    a.wall = { l: side < 0 ? -34 : 4, r: side < 0 ? -4 : 34, jumped: false, n: 3 };
  }
  if (type === 'volley') {
    a.vol = { f: 0, dur: 2.3, zoneA: 0.52, zoneB: 0.8, quality: 0.5 };
  }
  return a;
}

function aimFromDrag() {
  const P = G.P;
  const vx = P.startX - P.x, vy = P.y - P.startY; // pull down = power
  const len = Math.hypot(vx, vy);
  const a = M.aim;
  a.power = G.clamp(len / 95, 0, 1);
  a.gx = G.clamp(-vx * 1.25, -60, 60);
  a.gy = G.clamp(vy * 0.55 - 6, 0, 46);
  return len;
}

function spreadSigma() {
  const a = M.aim;
  let s = (2 + 20 * Math.pow(a.power, 1.7)) * (1.55 - fx('acc') / 99);
  if (hasTrait('CANNON')) s *= 1.28;
  if (hasTrait('BULLSEYE')) s *= 0.7;
  if (a.type === 'volley' && a.vol) s *= (1 + (1 - a.vol.quality) * 1.6);
  return Math.max(1.5, s);
}

function updateAim(dt, rdt) {
  const a = M.aim;
  a.time += dt;
  const P = G.P;

  // pressure systems
  if (a.type === 'open') {
    a.pressT -= dt;
    if (a.pressT <= 0) return endMoment('lost');
  } else if (a.type === 'oneonone') {
    a.kz = Math.min(42, a.kz + dt * 10.5);
    if (a.kz >= 42) return endMoment('smother');
  }

  if (P.down && P.startY > 190) {
    a.dragging = true;
    aimFromDrag();
  }
  if (P.justUp && a.dragging) {
    a.dragging = false;
    const len = aimFromDrag();
    // recompute from up position
    const vx = P.startX - P.upX, vy = P.upY - P.startY;
    a.power = G.clamp(Math.hypot(vx, vy) / 95, 0, 1);
    a.gx = G.clamp(-vx * 1.25, -60, 60);
    a.gy = G.clamp(vy * 0.55 - 6, 0, 46);
    if (a.power > 0.16) fireShot();
  }
}

function updateVolleyWait(dt, rdt) {
  const a = M.aim, v = a.vol;
  v.f += rdt / v.dur * (inZone() ? 0.55 : 1); // zone plays slower (composure slow-mo)
  G.timeScale = 1;
  function inZone() { return v.f >= v.zoneA && v.f <= v.zoneB; }
  if (v.f > v.zoneB) return endMoment('fluff');
  const P = G.P;
  if (P.down && P.startY > 170) { a.dragging = true; aimFromDrag(); }
  if (P.justUp && a.dragging) {
    a.dragging = false;
    const vx = P.startX - P.upX, vy = P.upY - P.startY;
    a.power = G.clamp(Math.hypot(vx, vy) / 95, 0, 1);
    a.gx = G.clamp(-vx * 1.25, -60, 60);
    a.gy = G.clamp(vy * 0.55 - 6, 0, 46);
    if (a.power <= 0.16) return;
    if (!inZone()) return endMoment('fluff');
    const mid = (v.zoneA + v.zoneB) / 2;
    v.quality = 1 - Math.abs(v.f - mid) / ((v.zoneB - v.zoneA) / 2);
    fireShot(volleyBallPos());
  }
}

function volleyBallPos() {
  const f = M.aim.vol.f;
  // cross arc from left touchline into the box
  const x = G.lerp(14, 152, f);
  const y = G.lerp(258, 316, f) - Math.sin(f * Math.PI) * 55;
  return { x, y };
}

function fireShot(origin) {
  const a = M.aim;
  const sig = spreadSigma();
  const tut = D().s().tut;
  if (!tut.aim) { tut.aim = 1; D().persist(); }
  const gx0 = a.gx + G.gauss() * sig;
  const gy0 = G.clamp(a.gy + G.gauss() * sig * 0.7, 0, 55);
  let T = 1.05 - 0.52 * a.power;
  if (hasTrait('CANNON')) T *= 0.88;
  const cfg = M.opp.cfg;
  M.shot = {
    ox: origin ? origin.x : BALLX, oy: origin ? origin.y : BALLY,
    gx0, gy0, T, ft: 0, curl: 0,
    curlCap: (9 + fx('cur') * 0.24) * (hasTrait('TRIVELA') ? 1.45 : 1),
    slowFrac: Math.min(0.92, (0.55 + fx('com') / 99 * 0.28) * (hasTrait('ICEVEINS') ? 1.3 : 1)),
    chip: false,
    arcP: a.power,
    trail: [],
    // keeper
    kx: 0, kdec: false, ktarget: 0,
    krea: cfg.rea * (hasTrait('KNUCKLE') ? 1.35 : 1) * (a.type === 'penalty' ? 0 : 1),
    kerr: cfg.err * (hasTrait('KNUCKLE') ? 1.8 : 1),
    kspd: a.type === 'penalty' ? 150 : cfg.spd,
    kreach: cfg.reach * (a.type === 'oneonone' ? (1 + a.kz / 50) : 1),
    kz: a.kz || 0,
    penSide: a.type === 'penalty' ? (G.chance(0.1) ? 0 : (G.chance(0.5) ? -1 : 1)) : null,
    wall: a.wall ? { ...a.wall, jumped: G.chance(0.6) } : null,
    resolved: false
  };
  if (M.shot.penSide !== null && M.shot.penSide !== 0) {
    M.shot.ktarget = M.shot.penSide * (16 + Math.random() * 20);
    M.shot.kdec = true;
  }
  M.state = 'flight'; M.t = 0;
  G.audio.kick();
  G.audio.slowmo();
  G.vibrate(15);
  G.burst(M.shot.ox, M.shot.oy, { n: 6, c: [G.C.grassL, G.C.beige], sp: 30, life: 0.4 });
}

// lateral position of ball at flight fraction f (goal-plane coords)
function shotLat(sh, f) { return sh.gx0 * f + sh.curl * Math.pow(f, 1.6); }
function shotH(sh, f) {
  const arcH = (1 - sh.arcP) * 16 + sh.gy0 * 0.15 + (sh.chip ? 20 : 0);
  return sh.gy0 * f + arcH * 4 * f * (1 - f);
}

function updateFlight(dt, rdt) {
  const sh = M.shot;
  const f0 = sh.ft / sh.T;
  G.timeScale = f0 < sh.slowFrac ? 0.36 : 1;
  sh.ft += dt;
  const f = Math.min(1, sh.ft / sh.T);
  const P = G.P;

  // aftertouch curl
  if (P.down && f < 0.85) {
    const add = P.dx * 0.5 * (0.35 + fx('cur') / 99);
    sh.curl = G.clamp(sh.curl + add, -sh.curlCap, sh.curlCap);
    if (Math.abs(sh.curl) > 6 && !D().s().tut.curl) { D().s().tut.curl = 1; D().persist(); }
  }
  // chip
  if (hasTrait('CHIP') && P.justDown && f < 0.7 && !sh.chip) {
    sh.chip = true;
    sh.gy0 = Math.max(sh.gy0, 33 + G.gauss() * 2);
    G.audio.chip();
  }

  // keeper decision + movement
  if (!sh.kdec && sh.ft >= sh.krea) {
    sh.kdec = true;
    sh.ktarget = (sh.gx0 + sh.curl) + G.gauss() * sh.kerr;
  }
  if (sh.kdec && sh.penSide !== 0) {
    const d = sh.ktarget - sh.kx;
    const step = sh.kspd * dt;
    sh.kx += Math.abs(d) < step ? d : Math.sign(d) * step;
  }

  // wall check
  if (sh.wall && !sh.wallDone && f >= 0.3) {
    sh.wallDone = true;
    const xw = shotLat(sh, 0.3);
    const hw = shotH(sh, 0.3);
    if (xw > sh.wall.l && xw < sh.wall.r) {
      const blocked = sh.wall.jumped ? (hw >= 7 && hw <= 26) : (hw < 18);
      if (blocked) {
        G.burst(108 + xw * 0.35, 262 - hw, { n: 10, c: ['#ffffff', G.C.fog], sp: 60 });
        G.audio.saveThud(); G.addShake(0.3);
        return endMoment('block');
      } else if (hw < 7) sh.under = true;
    }
  }

  // trail
  const bp = ballScreen(sh, f);
  sh.trail.push({ x: bp.x, y: bp.y, r: bp.r });
  if (sh.trail.length > 7) sh.trail.shift();

  if (f >= 1 && !sh.resolved) {
    sh.resolved = true;
    resolveShot(sh);
  }
}

function ballScreen(sh, f) {
  const lat = shotLat(sh, f);
  const h = shotH(sh, f);
  const x = G.lerp(sh.ox, 108 + lat, f);
  const groundY = G.lerp(sh.oy, G.GOAL.y - 2, f);
  const hs = G.lerp(1.5, 1, f);
  return { x, y: groundY - h * hs, r: Math.round(G.lerp(5, 2, f)), lat, h };
}

function resolveShot(sh) {
  G.timeScale = 1;
  const gx = shotLat(sh, 1);
  const gy = shotH(sh, 1);
  const special = sh.arcP > 0.85 || Math.abs(sh.curl) > 14 || sh.chip || sh.under ||
    (M.aim.type === 'volley') || (M.aim.type === 'freekick');

  // frame geometry
  if (gy > 38 && gy < 45 && Math.abs(gx) < 43) return hitFrame(sh, gx, gy, special); // bar
  if (Math.abs(gx) > 43 && Math.abs(gx) < 49 && gy < 40) return hitFrame(sh, gx, gy, special); // post
  if (Math.abs(gx) > 46 || gy > 42) {
    endMoment(gy > 42 ? 'over' : 'miss');
    G.audio.ohh();
    return;
  }
  // keeper
  let reach = sh.kreach * (gy > 28 ? 0.72 : 1) * (sh.chip ? 0.5 : 1);
  if (M.aim.type === 'oneonone' && sh.chip && sh.kz > 15) reach = 0;
  const dist = Math.abs(sh.kx - gx);
  if (sh.kdec && dist < reach && gy < 34) {
    if (dist < reach * 0.55) return endMoment('save', { gx, gy, catchIt: true });
    return endMoment('parry', { gx, gy });
  }
  endMoment('goal', { gx, gy, special });
}

function hitFrame(sh, gx, gy, special) {
  G.audio.post(); G.addShake(0.45); G.hitStop(0.06);
  const p = G.gp2s(G.clamp(gx, -46, 46), Math.min(gy, 40));
  G.burst(p.x, p.y, { n: 8, c: ['#ffffff', G.C.gold], sp: 70 });
  if (G.chance(0.4)) endMoment('postin', { gx: G.clamp(gx, -40, 40), gy: Math.min(gy, 30), special });
  else { endMoment('post'); G.audio.ohh(); }
}

// ---------- DEFEND ----------
function initDefend() {
  const cfg = M.opp.cfg;
  const q = cfg.shotQ;
  const side = G.chance(0.5) ? -1 : 1;
  const low = G.chance(0.55);
  const d = {
    windup: 0.9, ft: -1, // ft<0 = windup
    ogx: G.clamp(side * (18 + q * 22 + G.gauss() * 6), -44, 44),
    ogy: low ? 3 + Math.random() * 10 : G.clamp(14 + q * 20 + G.gauss() * 4, 8, 36),
    T: Math.max(0.62, 1.18 - q * 0.42 + G.gauss() * 0.05),
    curl: (D().s().div <= 3 && G.chance(0.45)) ? (G.chance(0.5) ? 1 : -1) * (5 + q * 11) : 0,
    gx: 0, gy: 6, // glove pos (plane)
    markerAt: (0.34 - fx('ref') / 99 * 0.22) * (hasTrait('RADAR') ? 0.55 : 1),
    gspd: (55 + fx('div') / 99 * 95) * (hasTrait('CAT') ? 1.3 : 1),
    grad: (6 + fx('han') / 99 * 6) * (hasTrait('SPIDER') ? 1.35 : 1),
    trail: [], resolved: false
  };
  return d;
}
function defLat(d, f) { return d.ogx * f + d.curl * Math.pow(f, 1.6) * 0.9; }
function defFinal(d) { return { gx: defLat(d, 1), gy: d.ogy }; }

function updateDefPrep(dt, rdt) {
  const d = M.def;
  d.windup -= rdt;
  moveGlove(d, rdt);
  if (d.windup <= 0) {
    M.state = 'defflight'; M.t = 0;
    d.ft = 0;
    G.audio.kick();
  }
}

function moveGlove(d, rdt) {
  const P = G.P;
  if (P.down) {
    // pad mapping: lower screen → goal plane
    const tx = G.clamp((P.x - 108) / 88 * 52, -46, 46);
    const ty = G.clamp((330 - P.y) / 120 * 40, 0, 38);
    const dx = tx - d.gx, dy = ty - d.gy;
    const dl = Math.hypot(dx, dy);
    const step = d.gspd * rdt;
    if (dl < step) { d.gx = tx; d.gy = ty; }
    else { d.gx += dx / dl * step; d.gy += dy / dl * step; }
  }
}

function updateDefFlight(dt, rdt) {
  const d = M.def;
  G.timeScale = d.ft / d.T > d.markerAt ? 0.55 : 0.85;
  d.ft += dt;
  moveGlove(d, rdt);
  const f = Math.min(1, d.ft / d.T);
  const bp = defBallScreen(d, f);
  d.trail.push(bp);
  if (d.trail.length > 6) d.trail.shift();
  if (f >= 1 && !d.resolved) {
    d.resolved = true;
    G.timeScale = 1;
    const fin = defFinal(d);
    const distv = Math.hypot(d.gx - fin.gx, (d.gy - fin.gy) * 0.9);
    if (distv < d.grad * 0.6) endMoment('oursave', fin);
    else if (distv < d.grad) endMoment('ourparry', fin);
    else endMoment('concede', fin);
  }
}
function defBallScreen(d, f) {
  const lat = defLat(d, f);
  const h = d.ogy * f + 6 * 4 * f * (1 - f) * 0.4;
  const x = G.lerp(120, 108 + lat, f);
  const groundY = G.lerp(318, G.GOAL.y - 2, f);
  return { x, y: groundY - h * G.lerp(1.5, 1, f), r: Math.round(G.lerp(5, 2, f)) };
}

// ---------- outcomes ----------
function endMoment(kind, info) {
  info = info || {};
  M.state = 'outcome'; M.t = 0;
  M.outcome = { kind, info };
  G.timeScale = 1;
  const ev = M.events;
  const kits = [G.KITS[D().s().club.kit], G.KITS[M.opp.kit]];

  if (kind === 'goal' || kind === 'postin') {
    M.us++;
    ev[M.idx] = 1;
    M.ripple = { x: 108 + G.clamp(info.gx, -44, 44), y: G.GOAL.y - 4 - Math.min(info.gy, 38), t: 1 };
    G.audio.roar(); G.audio.swish();
    G.addShake(info.special ? 0.75 : 0.5);
    G.hitStop(info.special ? 0.13 : 0.08);
    G.flash('#ffffff', info.special ? 0.16 : 0.08);
    G.vibrate(info.special ? [30, 40, 60] : 40);
    M.excite = 1.6;
    const p = G.gp2s(G.clamp(info.gx, -44, 44), Math.min(info.gy, 36));
    G.burst(p.x, p.y, { n: 22, c: [kits[0].a, kits[0].b, G.C.gold, '#ffffff'], sp: 85, life: 0.9, g: 120, wob: 8 });
    M.outcome.txt = kind === 'postin' ? G.pick(COMM.postin) : (info.special ? G.pick(COMM.golazo) : G.pick(COMM.goal));
    M.outcome.big = !!info.special;
  } else if (kind === 'oursave' || kind === 'ourparry') {
    M.saves++;
    ev[M.idx] = 4;
    G.audio.saveThud(); G.audio.roar();
    G.addShake(0.4); G.hitStop(0.08);
    G.vibrate(30);
    M.excite = 1.2;
    const p = G.gp2s(G.clamp(info.gx, -44, 44), Math.min(info.gy, 36));
    G.burst(p.x, p.y, { n: 12, c: ['#ffffff', G.C.sky], sp: 60, life: 0.6 });
    M.outcome.txt = kind === 'oursave' ? G.pick(COMM.oursave) : G.pick(COMM.ourparry);
    M.outcome.big = true;
  } else if (kind === 'concede') {
    M.them++;
    ev[M.idx] = 3;
    M.ripple = { x: 108 + G.clamp(info.gx, -44, 44), y: G.GOAL.y - 4 - Math.min(info.gy, 38), t: 1 };
    G.audio.sad(); G.audio.ohh();
    G.addShake(0.3);
    M.outcome.txt = G.pick(COMM.concede);
  } else {
    ev[M.idx] = 2;
    if (kind === 'save' || kind === 'parry') { G.audio.saveThud(); G.audio.ohh(); G.addShake(0.25); }
    if (kind === 'under') { }
    const key = { save: 'save', parry: 'parry', miss: 'miss', over: 'over', post: 'post', block: 'block', smother: 'smother', lost: 'lost', fluff: 'fluff' }[kind] || 'miss';
    M.outcome.txt = G.pick(COMM[key]);
  }
}

// ---------- drawing ----------
function shortName(n) {
  const w = n.split(' ');
  return (w.length > 1 ? w[0].slice(0, 3) : n.slice(0, 3));
}

function drawScoreboard() {
  const s = D().s();
  const kits = [G.KITS[s.club.kit], G.KITS[M.opp.kit]];
  G.panel(28, 2, 160, 13, G.C.dusk, G.C.ink);
  G.rect(32, 5, 7, 7, kits[0].a);
  G.frameRect(32, 5, 7, 7, G.C.ink);
  G.rect(177, 5, 7, 7, kits[1].a);
  G.frameRect(177, 5, 7, 7, G.C.ink);
  G.text(shortName(s.club.name), 43, 6, { c: '#ffffff' });
  G.text(shortName(M.opp.name), 173, 6, { c: '#ffffff', align: 'r' });
  G.text(M.us + '-' + M.them, 108, 6, { c: G.C.gold, align: 'c' });
  // moment pips
  const n = M.moments.length;
  const px0 = 108 - (n * 8 - 3) / 2;
  for (let i = 0; i < n; i++) {
    const ev = M.events[i];
    const col = ev === 1 ? G.C.lime : ev === 2 ? G.C.steel : ev === 3 ? G.C.red : ev === 4 ? G.C.sky : G.C.dusk;
    G.rect(px0 + i * 8, 17, 5, 4, G.C.ink);
    G.rect(px0 + i * 8 + 1, 18, 3, 2, col);
    if (i === M.idx && M.state !== 'outcome') G.frameRect(px0 + i * 8, 17, 5, 4, G.C.gold);
  }
  if (M.mom) G.text(M.mom.minute + "'", 200, 17, { c: G.C.cloud });
}

function drawIntro() {
  const s = D().s();
  const k = Math.min(1, M.t * 1.8);
  const e = G.ease.outBack(k);
  G.rect(0, 150, G.W, 84, 'rgba(24,20,37,0.7)');
  const x1 = G.lerp(-60, 62, e), x2 = G.lerp(276, 154, e);
  G.drawCrest(s.club.crest, G.KITS[s.club.kit], x1, 178, 2);
  G.drawCrest(M.opp.crest, G.KITS[M.opp.kit], x2, 178, 2);
  G.text('VS', 108, 172, { c: G.C.gold, s: 2, align: 'c', outline: G.C.ink });
  G.text(s.club.name, 62, 198, { c: '#ffffff', align: 'c' });
  G.text(M.opp.name, 154, 198, { c: '#ffffff', align: 'c' });
  G.text('DIVISION ' + (s.div === 0 ? 'LEGEND' : s.div), 108, 216, { c: G.C.cloud, align: 'c' });
}

function drawPick() {
  const dim = 'rgba(24,20,37,0.55)';
  G.rect(0, 0, G.W, G.H, dim);
  const mom = M.mom;
  G.text(MOMENTNAME[mom.type], 108, 128, { c: mom.type === 'defend' ? G.C.red : G.C.gold, s: 2, align: 'c', outline: G.C.ink });
  G.text(mom.minute + "' - " + (mom.type === 'defend' ? 'PICK YOUR KEEPER' : 'WHO TAKES IT?'), 108, 148, { c: '#ffffff', align: 'c' });
  const n = M.cands.length;
  const cw = G.CARDW, gap = 12;
  const totw = n * cw + (n - 1) * gap;
  const x0 = Math.round((G.W - totw) / 2);
  for (let i = 0; i < n; i++) {
    const c = M.cands[i];
    const x = x0 + i * (cw + gap), y = 168;
    const wob = Math.sin(G.time * 3 + i) * 1.5;
    G.drawCard(c, x, y + wob, 1);
    if (D().tired(c)) G.text('TIRED', x + cw / 2, y - 8 + wob, { c: G.C.red, align: 'c' });
    if (G.tapped(x - 4, y - 8, cw + 8, G.CARDH + 12)) selectCard(c);
  }
  G.text('TAP A CARD', 108, 262, { c: G.C.cloud, align: 'c', alpha: 0.6 + 0.4 * Math.sin(G.time * 5) });
}

function drawSetupBanner() {
  const k = Math.min(1, M.t * 2.5);
  const e = G.ease.outBack(k);
  const y = G.lerp(-30, 60, e);
  const mom = M.mom;
  const col = mom.type === 'defend' ? G.C.red : G.C.amber;
  G.panel(18, y, 180, 30, G.C.dusk, G.C.ink);
  G.rect(18, y, 4, 30, col);
  G.text(MOMENTNAME[mom.type] + " " + mom.minute + "'", 108, y + 6, { c: col, align: 'c', s: 1 });
  G.text(M.card.name, 108, y + 17, { c: '#ffffff', align: 'c' });
}

function drawMomentWorld() {
  const s = D().s();
  const myKit = G.KITS[s.club.kit];
  const oppKit = G.KITS[M.opp.kit];
  const gkKit = G.GKKITS[(M.opp.seed || 0) % G.GKKITS.length];
  const st = M.state;
  const type = M.mom ? M.mom.type : 'open';

  if (type === 'defend') { drawDefendWorld(oppKit, gkKit); return; }

  // opposition keeper (in outcome, save/parry poses are drawn by drawOutcomeWorld instead)
  const outcomeHandlesKeeper = st === 'outcome' && M.outcome && (M.outcome.kind === 'save' || M.outcome.kind === 'parry');
  if (!outcomeHandlesKeeper) {
    let kx = 108, kpose = 'gkReady', kposeFlip = false, ky = G.GOAL.y, ksc = 1;
    if (st === 'flight' && M.shot) {
      kx = 108 + M.shot.kx;
      if (M.shot.kdec && Math.abs(M.shot.ktarget) > 8) { kpose = 'gkDive'; kposeFlip = M.shot.ktarget < 0; }
    }
    if (type === 'oneonone') {
      const kz = st === 'flight' ? M.shot.kz : (M.aim ? M.aim.kz : 0);
      ky = G.GOAL.y + kz * 1.4;
      ksc = 1 + kz / 42 * 0.7;
    }
    G.drawSprite(kpose, gkKit, 2, 0, kx, ky, { scale: ksc, flip: kposeFlip });
  }

  // free kick wall
  if (M.aim && M.aim.wall && (st === 'aim' || st === 'flight')) {
    const w = (st === 'flight' && M.shot.wall) ? M.shot.wall : M.aim.wall;
    const cx = 108 + (w.l + w.r) / 2 * 0.55;
    const jump = (st === 'flight' && M.shot.wall.jumped && M.shot.ft / M.shot.T > 0.12) ? 6 : 0;
    for (let i = 0; i < 3; i++) {
      G.drawSprite('gkIdle', oppKit, (i * 2 + 1) % 5, (i * 3) % 6, cx + (i - 1) * 11, 252 - jump, {});
    }
  }
  // open play: pressing defender
  if (type === 'open' && st === 'aim' && M.aim) {
    const total = M.opp.cfg.defT;
    const k = 1 - M.aim.pressT / total;
    const fromLeft = M.aim.defX < 108;
    const dx = G.lerp(M.aim.defX, BALLX - (fromLeft ? 16 : -16), G.ease.inQ(k));
    G.drawSprite('runBack', oppKit, 1, 2, dx, BALLY + 8, { flip: !fromLeft });
    // pressure bar
    if (k > 0.35) {
      G.rect(78, 200, 60, 5, G.C.ink);
      G.rect(79, 201, Math.round(58 * (1 - k)), 3, k > 0.75 ? G.C.red : G.C.amber);
    }
  }

  if (st === 'aim' || st === 'setup' || st === 'volleywait') {
    drawAimState(myKit);
  } else if (st === 'flight') {
    drawFlightState(myKit);
  } else if (st === 'outcome') {
    drawOutcomeWorld(myKit, gkKit);
  }
}

function drawAimState(myKit) {
  const a = M.aim;
  const card = M.card;
  const type = M.mom.type;
  let bx = BALLX, by = BALLY;

  if (type === 'volley' && a && a.vol && M.state === 'volleywait') {
    const bp = volleyBallPos();
    bx = bp.x; by = bp.y;
    // striker waits at strike point
    G.drawSprite('idleBack', myKit, card.skin, card.hair, 168, 336, {});
    // zone flash
    if (a.vol.f >= a.vol.zoneA && a.vol.f <= a.vol.zoneB) {
      const p = Math.sin(G.time * 14) > 0;
      G.frameRect(bx - 8, by - 8, 16, 16, p ? G.C.gold : '#ffffff');
      G.text('NOW!', bx, by - 18, { c: G.C.gold, align: 'c', outline: G.C.ink });
    }
    G.ball(bx, by, 4, G.time * 3);
  } else {
    // shooter beside ball
    const pose = (a && a.dragging) ? 'runBack' : 'idleBack';
    G.drawSprite(pose, myKit, card.skin, card.hair, bx - 14, by + 12, {});
    G.ball(bx, by, 5, 0);
  }

  if (a && a.dragging && a.power > 0.05) {
    // aim reticle + spread
    const sig = spreadSigma();
    const p = G.gp2s(G.clamp(a.gx, -60, 60), Math.min(a.gy, 46));
    const offTarget = Math.abs(a.gx) > 44 || a.gy > 40;
    const col = offTarget ? G.C.red : G.C.gold;
    // dotted aim line
    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const lx = G.lerp(bx, p.x, t);
      const ly = G.lerp(by, p.y, t) - Math.sin(t * Math.PI) * 20 * (1 - a.power);
      G.rect(lx - 1, ly - 1, 2, 2, i % 2 ? '#ffffff' : col);
    }
    // spread ellipse (dotted)
    const rx = sig, ry = Math.max(2, sig * 0.7);
    for (let ang = 0; ang < 16; ang++) {
      const th = ang / 16 * Math.PI * 2;
      G.rect(p.x + Math.cos(th) * rx, p.y + Math.sin(th) * ry, 1, 1, col);
    }
    G.rect(p.x - 1, p.y - 1, 3, 3, col);
    // power bar
    G.rect(202, 220, 8, 100, G.C.ink);
    const ph = Math.round(96 * a.power);
    const pcol = a.power > 0.8 ? G.C.red : a.power > 0.5 ? G.C.amber : G.C.lime;
    G.rect(204, 318 - ph, 4, ph, pcol);
  }

  // tutorial hint
  if (!D().s().tut.aim && M.state === 'aim') {
    const bob = Math.sin(G.time * 4) * 4;
    G.text('PULL BACK FROM THE BALL', 108, 236, { c: '#ffffff', align: 'c', outline: G.C.ink });
    G.text('RELEASE TO SHOOT!', 108, 246, { c: G.C.gold, align: 'c', outline: G.C.ink });
    G.rect(106, 288 + bob, 4, 12, 'rgba(255,255,255,0.7)');
  }
}

function drawFlightState(myKit) {
  const sh = M.shot;
  const f = Math.min(1, sh.ft / sh.T);
  // kicker follow-through
  G.drawSprite('kickBack', myKit, M.card.skin, M.card.hair, sh.ox - 14, sh.oy + 12, {});
  // trail
  for (let i = 0; i < sh.trail.length; i++) {
    const t = sh.trail[i];
    const a = (i + 1) / sh.trail.length * 0.4;
    G.ctx.save(); G.ctx.globalAlpha = a;
    G.fillCircle(t.x, t.y, Math.max(1, t.r - 1), '#ffffff');
    G.ctx.restore();
  }
  const bp = ballScreen(sh, f);
  // knuckle wobble
  const wob = hasTrait('KNUCKLE') ? Math.sin(sh.ft * 40) * 1.5 : 0;
  G.ball(bp.x + wob, bp.y, bp.r, sh.ft * 6);
  // slow-mo curl hint
  if (f < sh.slowFrac) {
    if (!D().s().tut.curl) {
      G.text('< SWIPE TO CURL >', 108, 210, { c: G.C.sky, align: 'c', outline: G.C.ink, alpha: 0.7 + 0.3 * Math.sin(G.time * 8) });
    }
    // cinematic bars
    G.rect(0, 0, G.W, 3, G.C.ink); G.rect(0, G.H - 3, G.W, 3, G.C.ink);
  }
  if (hasTrait('CHIP') && !sh.chip && f < 0.6) {
    G.text('TAP = CHIP', 176, 200, { c: G.C.cloud, alpha: 0.7 });
  }
}

function drawDefendWorld(oppKit, gkKit) {
  const d = M.def;
  const st = M.state;
  // red vignette
  G.rect(0, 0, G.W, 2, G.C.red); G.rect(0, 0, 2, G.H, G.C.red);
  G.rect(G.W - 2, 0, 2, G.H, G.C.red); G.rect(0, G.H - 2, G.W, 2, G.C.red);
  // our keeper stands at goal, mirroring glove x
  const kx = 108 + (d ? d.gx * 0.8 : 0);
  const dive = d && Math.abs(d.gx) > 14;
  G.drawSprite(dive ? 'gkDive' : 'gkReady', gkKit, M.card.skin, M.card.hair, kx, G.GOAL.y, { flip: d && d.gx < 0 });
  // opponent striker
  if (st === 'defprep') {
    const k = 1 - d.windup / 0.9;
    G.drawSprite('runBack', oppKit, 1, 1, G.lerp(140, 122, k), 336, { flip: true });
    G.ball(120, 318, 5, 0);
    G.text('DEFEND!', 108, 200, { c: G.C.red, s: 2, align: 'c', outline: G.C.ink });
  } else if (st === 'defflight' || st === 'outcome') {
    G.drawSprite('kickBack', oppKit, 1, 1, 122, 336, { flip: true });
    if (st === 'defflight') {
      const f = Math.min(1, d.ft / d.T);
      // trail + ball
      for (let i = 0; i < d.trail.length; i++) {
        const t = d.trail[i];
        G.ctx.save(); G.ctx.globalAlpha = (i + 1) / d.trail.length * 0.4;
        G.fillCircle(t.x, t.y, Math.max(1, t.r - 1), '#ffffff');
        G.ctx.restore();
      }
      const bp = defBallScreen(d, f);
      G.ball(bp.x, bp.y, bp.r, d.ft * 6);
      // predicted marker
      if (d.ft / d.T > d.markerAt) {
        const fin = defFinal(d);
        // marker drifts with curl as it applies
        const mx = d.ogx + d.curl * Math.pow(Math.max(f, 0.3), 1.6) * 0.9;
        const p = G.gp2s(G.clamp(mx, -46, 46), d.ogy);
        const blink = Math.sin(G.time * 16) > 0;
        G.text('X', p.x - 1, p.y - 2, { c: blink ? G.C.red : '#ffffff', outline: G.C.ink });
      }
    }
  }
  // glove cursor
  if (d && st !== 'outcome') {
    const gp = G.gp2s(d.gx, d.gy);
    for (let ang = 0; ang < 12; ang++) {
      const th = ang / 12 * Math.PI * 2;
      G.rect(gp.x + Math.cos(th) * d.grad, gp.y + Math.sin(th) * d.grad * 0.9, 1, 1, G.C.sky);
    }
    G.icon('glove', gp.x - 3, gp.y - 4);
    if (!D().s().tut.save && st === 'defprep') {
      G.text('DRAG TO MOVE YOUR GLOVES', 108, 226, { c: G.C.sky, align: 'c', outline: G.C.ink });
      G.text('COVER THE X!', 108, 236, { c: '#ffffff', align: 'c', outline: G.C.ink });
    }
  }
  if (st === 'outcome' && !D().s().tut.save) { D().s().tut.save = 1; D().persist(); }
}

function drawOutcomeWorld(myKit, gkKit) {
  const o = M.outcome;
  const kind = o.kind;
  if (kind === 'goal' || kind === 'postin') {
    // scorer celebrates
    const hop = Math.abs(Math.sin(M.t * 9)) * 6;
    G.drawSprite('celebrate', myKit, M.card.skin, M.card.hair, BALLX - 14, BALLY + 12 - hop, {});
    // ball in net
    const p = G.gp2s(G.clamp(o.info.gx || 0, -42, 42), Math.min(o.info.gy || 5, 34));
    G.ball(p.x, p.y + 3, 2, 0);
  } else if (kind === 'save' || kind === 'parry') {
    const p = G.gp2s(G.clamp(o.info.gx || 0, -42, 42), 2);
    G.drawSprite(kind === 'save' ? 'gkCatch' : 'gkDive', gkKit, 2, 0, p.x, G.GOAL.y, { flip: (o.info.gx || 0) < 0 });
    if (kind === 'save') G.ball(p.x, G.GOAL.y - 16, 3, 0);
    G.drawSprite('idleBack', myKit, M.card.skin, M.card.hair, BALLX - 14, BALLY + 12, {});
  } else {
    G.drawSprite('idleBack', myKit, M.card.skin, M.card.hair, BALLX - 14, BALLY + 12, {});
  }
}

function drawOutcome() {
  if (M.mom.type === 'defend') {
    const oppKit = G.KITS[M.opp.kit];
    const gkKit = G.GKKITS[(M.opp.seed || 0) % G.GKKITS.length];
    drawDefendWorld(oppKit, gkKit);
    const d = M.def, o = M.outcome;
    if (o.kind === 'oursave') {
      const p = G.gp2s(G.clamp(o.info.gx, -42, 42), o.info.gy);
      G.ball(p.x, p.y, 3, 0);
    }
  }
  const o = M.outcome;
  const k = Math.min(1, M.t * 3);
  const sc = o.big ? 3 : 2;
  const e = G.ease.outBack(k);
  const col = (o.kind === 'goal' || o.kind === 'postin') ? G.C.gold :
    (o.kind === 'oursave' || o.kind === 'ourparry') ? G.C.sky :
      (o.kind === 'concede') ? G.C.red : '#ffffff';
  G.ctx.save();
  G.ctx.translate(108, 172);
  G.ctx.scale(e, e);
  G.text(o.txt, 0, -5 * sc, { c: col, s: sc, align: 'c', outline: G.C.ink });
  G.ctx.restore();
  if (M.t > 0.7) G.text('TAP', 108, 300, { c: G.C.cloud, align: 'c', alpha: 0.5 + 0.4 * Math.sin(G.time * 5) });
}

// debug/testing hooks
G.__matchState = () => M.state;
G.__momentInfo = () => ({ type: M.mom ? M.mom.type : null, idx: M.idx });

})(window.GD);

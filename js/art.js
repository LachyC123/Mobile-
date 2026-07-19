'use strict';
// GOLAZO DECK — authored pixel art: palette, kits, sprites, faces, crests, cards, stadium.
(function (G) {

// ---------- palette (fixed — every color in the game comes from here) ----------
const C = {
  ink: '#181425', dusk: '#262b44', slate: '#3a4466', steel: '#5a6988',
  fog: '#8b9bb4', cloud: '#c0cbdc', white: '#ffffff',
  grassLine: '#1d4732', grassD: '#265c42', grassL: '#3e8948', lime: '#63c74d',
  gold: '#fee761', amber: '#feae34', ember: '#f77622', red: '#e43b44', maroon: '#a22633',
  berry: '#b55088', plum: '#68386c', violet: '#8a5cdb',
  blue: '#0099db', sky: '#2ce8f5',
  brown: '#743f39', bronze: '#b86f50', tan: '#e4a672', beige: '#ead4aa'
};
G.C = C;

const SKINS = ['#f4ceb0', '#e0a878', '#c98858', '#9c6444', '#6f4430'];
const HAIRC = [C.ink, C.brown, C.bronze, C.amber, C.cloud, C.maroon];
G.SKINS = SKINS; G.HAIRC = HAIRC;

// team kits {a: primary, b: secondary}
G.KITS = [
  { a: C.red, b: C.white, n: 'CRIMSON' },
  { a: C.blue, b: C.white, n: 'AZURE' },
  { a: C.white, b: C.ink, n: 'GHOST' },
  { a: C.gold, b: C.ink, n: 'WASP' },
  { a: C.grassL, b: C.white, n: 'FOREST' },
  { a: C.plum, b: C.amber, n: 'ROYAL' },
  { a: C.ember, b: C.ink, n: 'EMBER' },
  { a: C.dusk, b: C.sky, n: 'MIDNIGHT' },
  { a: C.maroon, b: C.sky, n: 'CLARET' },
  { a: C.cloud, b: C.red, n: 'STEEL' }
];
// keeper kits, picked to avoid clash
G.GKKITS = [
  { a: C.gold, b: C.ink }, { a: C.sky, b: C.ink }, { a: C.berry, b: C.white }, { a: C.lime, b: C.ink }
];

const RAR = [
  { n: 'COMMON', c: C.steel, hi: C.cloud, bg: C.slate },
  { n: 'RARE', c: C.blue, hi: C.sky, bg: '#0d5f8a' },
  { n: 'EPIC', c: C.violet, hi: C.berry, bg: '#553a8a' },
  { n: 'ICON', c: C.amber, hi: C.gold, bg: '#8a5a1d' }
];
G.RAR = RAR;

// ---------- sprite builder ----------
// map chars: K ink, A kitA, B kitB, S skin, H hair, C sock(kitA), X boot, G glove, E eye, W white
function buildSprite(rows, cols) {
  const h = rows.length, w = rows[0].length;
  const c = G.makeCanvas(w, h);
  const x = c.getContext('2d');
  for (let r = 0; r < h; r++) {
    const row = rows[r];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      x.fillStyle = cols[ch] || '#ff00ff';
      x.fillRect(i, r, 1, 1);
    }
  }
  return c;
}

const POSES = {};
POSES.idleBack = [
  '..............',
  '.....KKKK.....',
  '....KHHHHK....',
  '....KHHHHK....',
  '....KHHHHK....',
  '.....KSSK.....',
  '....KAAAAK....',
  '...KAAAAAAK...',
  '..KKAAAAAAKK..',
  '..KAKABBAKAK..',
  '..KAKABBAKAK..',
  '..KSKAAAAKSK..',
  '..KKKAAAAKKK..',
  '....KBBBBK....',
  '....KBBBBK....',
  '....KBKKBK....',
  '....KSK.KSK...',
  '....KSK.KSK...',
  '....KCK.KCK...',
  '....KCK.KCK...',
  '....KXK.KXK...',
  '....KKK.KKK...'
];
POSES.runBack = [
  '..............',
  '.....KKKK.....',
  '....KHHHHK....',
  '....KHHHHK....',
  '....KHHHHK....',
  '.....KSSK.....',
  '....KAAAAK....',
  '...KAAAAAAK...',
  '..KKAAAAAAKK..',
  '..KAKABBAKAK..',
  '..KSKABBAKAK..',
  '..KKKAAAAKSK..',
  '....KAAAAKKK..',
  '....KBBBBK....',
  '....KBBBBK....',
  '....KBKKBK....',
  '...KSK..KSK...',
  '...KSK...KSK..',
  '...KCK...KCK..',
  '..KCK.....KCK.',
  '..KXK.....KXK.',
  '..KKK.....KKK.'
];
POSES.kickBack = [
  '..............',
  '.....KKKK.....',
  '....KHHHHK....',
  '....KHHHHK....',
  '....KHHHHK....',
  '.....KSSK.....',
  '.K..KAAAAK..K.',
  'KSK.KAAAAK.KSK',
  'KAKKAAAAAAKKAK',
  '.KAKAABBAAKAK.',
  '..KKAABBAAKK..',
  '....KAAAAK....',
  '....KBBBBK....',
  '...KBBBBBBK...',
  '...KBKKKKBK...',
  '...KSK..KKSK..',
  '...KSK...KSSK.',
  '...KCK....KCK.',
  '...KCK....KXK.',
  '...KXK....KKK.',
  '...KKK........',
  '..............'
];
POSES.celebrate = [
  '.KSK......KSK.',
  '.KAK......KAK.',
  '.KAK.KKKK.KAK.',
  '..KAKHHHHKAK..',
  '..KKKHHHHKKK..',
  '...KSSEESSK...',
  '...KSSSSSSK...',
  '....KSKKSK....',
  '....KAAAAK....',
  '...KAABBAAK...',
  '...KAABBAAK...',
  '...KAAAAAAK...',
  '....KAAAAK....',
  '....KBBBBK....',
  '....KBBBBK....',
  '....KBKKBK....',
  '....KSK.KSK...',
  '....KSK.KSK...',
  '....KCK.KCK...',
  '....KCK.KCK...',
  '....KXK.KXK...',
  '....KKK.KKK...'
];
POSES.gkIdle = [
  '..............',
  '.....KKKK.....',
  '....KHHHHK....',
  '....KSSSSK....',
  '....KSESEK....',
  '....KSSSSK....',
  '.....KSSK.....',
  '..KKKAAAAKKK..',
  '.KGGKAAAAKGGK.',
  '.KGGKAAAAKGGK.',
  '..KKKAAAAKKK..',
  '....KAAAAK....',
  '....KAAAAK....',
  '....KBBBBK....',
  '....KBKKBK....',
  '....KSK.KSK...',
  '....KSK.KSK...',
  '....KCK.KCK...',
  '....KCK.KCK...',
  '....KXK.KXK...',
  '....KKK.KKK...',
  '..............'
];
POSES.gkReady = [
  '..............',
  '..............',
  '.....KKKK.....',
  '....KHHHHK....',
  '....KSSSSK....',
  '....KSESEK....',
  '....KSSSSK....',
  '.....KSSK.....',
  '..KKKAAAAKKK..',
  '.KGGKAAAAKGGK.',
  '.KGGKAAAAKGGK.',
  '..KKKAAAAKKK..',
  '....KAAAAK....',
  '....KBBBBK....',
  '....KBKKBK....',
  '...KSK..KSK...',
  '..KSK....KSK..',
  '..KCK....KCK..',
  '..KCK....KCK..',
  '..KXK....KXK..',
  '..KKK....KKK..',
  '..............'
];
// dives to the right; mirrored for left
POSES.gkDive = [
  '........................',
  '.............KKKK.......',
  '............KHHHHK..KK..',
  '............KSSSSK.KGGK.',
  '....KKKKKKKKKSESEKKKGGK.',
  '..KKAAAAAAAAKSSSSKKKKK..',
  '.KAAAAAAAAAAAKSSKKK.....',
  '.KAAAAAAAAAAAAAAKK......',
  '..KKBBBBKAAAAAKKK.......',
  '..KBBBBBKKKKKKK.........',
  '.KCKKKCK................',
  'KCK..KCK................',
  'KXK..KXK................',
  'KKK..KKK................',
  '........................'
];
POSES.gkCatch = [
  '..............',
  '....KKKKKK....',
  '...KGGKKGGK...',
  '...KGGKKGGK...',
  '....KKKKKK....',
  '.....KKKK.....',
  '....KHHHHK....',
  '....KSSSSK....',
  '....KSESEK....',
  '.....KSSK.....',
  '...KKAAAAKK...',
  '..KAKAAAAKAK..',
  '..KAKAAAAKAK..',
  '..KKKAAAAKKK..',
  '....KBBBBK....',
  '....KBKKBK....',
  '....KSK.KSK...',
  '....KSK.KSK...',
  '....KCK.KCK...',
  '....KCK.KCK...',
  '....KXK.KXK...',
  '....KKK.KKK...'
];

const spriteCache = {};
// pose in kit colors; skin/hair variants; flip mirrors
G.sprite = function (pose, kit, skin, hair, flip) {
  const key = pose + '|' + kit.a + kit.b + '|' + skin + '|' + hair + '|' + (flip ? 1 : 0);
  if (spriteCache[key]) return spriteCache[key];
  const cols = {
    K: C.ink, A: kit.a, B: kit.b, S: SKINS[skin], H: HAIRC[hair],
    C: kit.a === C.white ? C.cloud : kit.a, X: C.brown, G: C.white, E: C.ink, W: C.white
  };
  let c = buildSprite(POSES[pose], cols);
  if (flip) {
    const f = G.makeCanvas(c.width, c.height);
    const fx = f.getContext('2d');
    fx.translate(c.width, 0); fx.scale(-1, 1);
    fx.drawImage(c, 0, 0);
    c = f;
  }
  spriteCache[key] = c;
  return c;
};
G.drawSprite = function (pose, kit, skin, hair, x, y, opts) {
  opts = opts || {};
  const s = G.sprite(pose, kit, skin, hair, opts.flip);
  const sc = opts.scale || 1;
  G.ctx.drawImage(s, Math.round(x - s.width * sc / 2), Math.round(y - s.height * sc), s.width * sc, s.height * sc);
};

// ---------- ball ----------
G.ball = function (x, y, r, rot) {
  x = Math.round(x); y = Math.round(y);
  G.fillCircle(x, y, r + 1, C.ink);
  G.fillCircle(x, y, r, C.white);
  // rotating patch pixels
  const ph = Math.floor(rot * 4) % 4;
  const offs = [[[-1, -1], [1, 1]], [[1, -1], [-1, 1]], [[0, -1], [0, 1]], [[-1, 0], [1, 0]]][ph];
  const k = Math.max(1, Math.floor(r / 2.5));
  for (const [ox, oy] of offs) {
    G.rect(x + ox * k - Math.floor(k / 2), y + oy * k - Math.floor(k / 2), k, k, C.ink);
  }
  if (r >= 3) G.rect(x - 1, y - r + 1, 1, 1, C.cloud); // sheen
};

// ---------- faces (card portraits, 20x20) ----------
const faceCache = {};
G.face = function (seed, skin, hair) {
  const key = seed + '|' + skin + '|' + hair;
  if (faceCache[key]) return faceCache[key];
  const rng = G.mulberry(seed * 7919 + 13);
  const c = G.makeCanvas(20, 20);
  const x = c.getContext('2d');
  const S = SKINS[skin], Hh = HAIRC[hair];
  const dark = 'rgba(0,0,0,0.25)';
  // head
  x.fillStyle = C.ink; x.fillRect(4, 2, 12, 17);
  x.fillStyle = S; x.fillRect(5, 3, 10, 15);
  // jaw shade
  x.fillStyle = dark; x.fillRect(5, 16, 10, 2);
  // hair style
  const style = Math.floor(rng() * 6);
  x.fillStyle = Hh;
  if (style === 0) { // buzz
    x.fillRect(5, 3, 10, 3);
  } else if (style === 1) { // spiky
    x.fillRect(5, 3, 10, 3);
    for (let i = 0; i < 5; i++) x.fillRect(5 + i * 2, 1 + (i % 2), 2, 2);
  } else if (style === 2) { // fro
    x.fillRect(4, 1, 12, 5); x.fillRect(3, 3, 2, 5); x.fillRect(15, 3, 2, 5);
  } else if (style === 3) { // long
    x.fillRect(5, 3, 10, 3); x.fillRect(4, 4, 2, 10); x.fillRect(14, 4, 2, 10);
  } else if (style === 4) { // mohawk-ish crop
    x.fillRect(5, 3, 10, 2); x.fillRect(8, 1, 4, 3);
  } // 5 = bald
  // brows + eyes
  x.fillStyle = C.ink;
  x.fillRect(6, 8, 3, 1); x.fillRect(11, 8, 3, 1);
  x.fillRect(7, 10, 2, 2); x.fillRect(12, 10, 2, 2);
  x.fillStyle = C.white; x.fillRect(7, 10, 1, 1); x.fillRect(12, 10, 1, 1);
  // nose
  x.fillStyle = dark; x.fillRect(9, 12, 2, 2);
  // mouth
  x.fillStyle = C.ink;
  const mood = rng();
  if (mood < 0.5) x.fillRect(8, 15, 4, 1);
  else if (mood < 0.8) { x.fillRect(8, 15, 4, 1); x.fillRect(9, 16, 2, 1); }
  else x.fillRect(9, 15, 3, 1);
  // facial hair
  const fh = rng();
  if (fh < 0.2) { x.fillStyle = Hh; x.fillRect(7, 14, 6, 1); } // moustache
  else if (fh < 0.38) { x.fillStyle = Hh; x.fillRect(5, 14, 2, 4); x.fillRect(13, 14, 2, 4); x.fillRect(5, 17, 10, 1); } // beard
  faceCache[key] = c;
  return c;
};

// ---------- crest (16x18) ----------
const crestCache = {};
G.crest = function (crest, kit) {
  const key = crest.shape + '|' + crest.pat + '|' + kit.a + kit.b;
  if (crestCache[key]) return crestCache[key];
  const c = G.makeCanvas(16, 18);
  const x = c.getContext('2d');
  const a = kit.a, b = kit.b;
  // shape mask rows: [xStart, width] per row
  let rows;
  if (crest.shape === 0) { // shield
    rows = [[2, 12], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [2, 12], [2, 12], [3, 10], [4, 8], [5, 6], [6, 4], [7, 2]];
  } else if (crest.shape === 1) { // round
    rows = [[5, 6], [3, 10], [2, 12], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [2, 12], [3, 10], [5, 6]];
  } else if (crest.shape === 2) { // diamond
    rows = [[7, 2], [6, 4], [5, 6], [4, 8], [3, 10], [2, 12], [2, 12], [3, 10], [4, 8], [5, 6], [6, 4], [7, 2]];
  } else { // banner
    rows = [[1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [2, 12], [4, 8], [6, 4]];
  }
  const oy = 2;
  // outline
  x.fillStyle = C.ink;
  rows.forEach(([sx, w], i) => x.fillRect(sx - 1, oy + i - (i === 0 ? 1 : 0), w + 2, i === 0 ? 2 : 1));
  x.fillRect(rows[rows.length - 1][0], oy + rows.length, rows[rows.length - 1][1], 1);
  // fill with pattern
  rows.forEach(([sx, w], i) => {
    for (let px = 0; px < w; px++) {
      let col = a;
      if (crest.pat === 1) col = (sx + px) < 8 ? a : b;            // halves
      else if (crest.pat === 2) col = Math.floor((sx + px) / 3) % 2 ? b : a; // stripes
      else if (crest.pat === 3) col = (sx + px + i) % 7 < 3 ? b : a;         // sash
      x.fillRect(sx + px, oy + i, 1, 1);
      x.fillStyle = col; x.fillRect(sx + px, oy + i, 1, 1);
    }
  });
  // center pip
  x.fillStyle = crest.pat === 0 ? b : C.ink;
  x.fillRect(7, oy + 4, 2, 2);
  crestCache[key] = c;
  return c;
};
G.drawCrest = function (crest, kit, x, y, sc) {
  sc = sc || 1;
  const c = G.crest(crest, kit);
  G.ctx.drawImage(c, Math.round(x - 8 * sc), Math.round(y - 9 * sc), 16 * sc, 18 * sc);
};

// ---------- icons ----------
G.icon = function (name, x, y) {
  x = Math.round(x); y = Math.round(y);
  const r = G.rect;
  if (name === 'coin') {
    G.fillCircle(x + 3, y + 3, 3, C.ink);
    G.fillCircle(x + 3, y + 3, 2, C.gold);
    r(x + 2, y + 2, 1, 1, C.white);
    r(x + 3, y + 3, 1, 2, C.amber);
  } else if (name === 'cone') { // training cone
    r(x + 2, y, 2, 2, C.ember); r(x + 1, y + 2, 4, 2, C.amber);
    r(x + 1, y + 3, 4, 1, C.white);
    r(x, y + 4, 6, 2, C.ember); r(x - 1, y + 6, 8, 1, C.ink);
  } else if (name === 'bolt') {
    r(x + 2, y, 3, 3, C.gold); r(x + 1, y + 2, 3, 2, C.gold); r(x + 2, y + 4, 2, 3, C.amber);
  } else if (name === 'star') {
    r(x + 2, y, 2, 6, C.gold); r(x, y + 2, 6, 2, C.gold);
    r(x + 1, y + 1, 4, 4, C.gold);
  } else if (name === 'lock') {
    r(x + 1, y, 4, 3, C.fog); r(x + 2, y + 1, 2, 2, C.dusk);
    r(x, y + 3, 6, 4, C.fog); r(x + 2, y + 4, 2, 2, C.ink);
  } else if (name === 'snd') {
    r(x, y + 2, 2, 3, C.white); r(x + 2, y + 1, 2, 5, C.white);
    r(x + 5, y + 1, 1, 1, C.white); r(x + 6, y + 2, 1, 3, C.white); r(x + 5, y + 5, 1, 1, C.white);
  } else if (name === 'sndoff') {
    r(x, y + 2, 2, 3, C.fog); r(x + 2, y + 1, 2, 5, C.fog);
    r(x + 5, y + 2, 1, 1, C.red); r(x + 6, y + 3, 1, 1, C.red); r(x + 5, y + 4, 1, 1, C.red);
    r(x + 6, y + 2, 1, 1, C.red); r(x + 5, y + 3, 1, 1, C.red); r(x + 6, y + 4, 1, 1, C.red);
  } else if (name === 'glove') {
    r(x + 1, y, 4, 5, C.white); r(x, y + 1, 1, 3, C.white);
    r(x + 1, y + 5, 4, 2, C.gold);
    G.frameRect(x, y, 6, 7, C.ink);
  } else if (name === 'whistle') {
    r(x, y + 1, 5, 4, C.cloud); G.fillCircle(x + 2, y + 3, 2, C.cloud);
    r(x + 4, y, 3, 2, C.cloud); r(x + 2, y + 2, 1, 2, C.ink);
  } else if (name === 'zzz') {
    G.text('Z', x, y, { c: C.sky, s: 1 });
  }
};

// trait badge letters
G.TRAITICON = { CANNON: 'C', BULLSEYE: 'B', TRIVELA: 'T', KNUCKLE: 'K', CHIP: 'C', ICEVEINS: 'I', SPIDER: 'S', CAT: 'C', RADAR: 'R' };

// ---------- card ----------
// draws card w=54 h=76 at scale sc
G.CARDW = 54; G.CARDH = 76;
G.drawCard = function (card, x, y, sc, opts) {
  opts = opts || {};
  sc = sc || 1;
  const ctx2 = G.ctx;
  const w = G.CARDW * sc, h = G.CARDH * sc;
  x = Math.round(x); y = Math.round(y);
  const R = RAR[card.rarity];
  // frame
  G.rect(x + sc, y + 2 * sc, w, h, C.ink); // shadow
  G.panel(x, y, w, h, R.bg, C.ink);
  G.frameRect(x + sc, y + sc, w - 2 * sc, h - 2 * sc, R.c);
  if (card.rarity >= 2) G.frameRect(x + 2 * sc, y + 2 * sc, w - 4 * sc, h - 4 * sc, R.hi);
  // diagonal sheen for icons
  if (card.rarity === 3) {
    const t = Math.floor(G.time * 20) % (w * 2);
    ctx2.save(); ctx2.globalAlpha = 0.25; ctx2.fillStyle = C.gold;
    for (let i = 0; i < h; i += 2) {
      const px = x + ((t + i) % (w - 6 * sc)) + 3 * sc;
      ctx2.fillRect(px, y + i + 2, sc, 1);
    }
    ctx2.restore();
  }
  // rating + position
  G.text(card.rating, x + 4 * sc, y + 4 * sc, { c: R.hi, s: sc, outline: C.ink });
  G.text(card.pos, x + 4 * sc, y + 11 * sc, { c: C.cloud, s: sc });
  // trait badge
  if (card.trait) {
    G.rect(x + w - 11 * sc, y + 3 * sc, 8 * sc, 8 * sc, C.ink);
    G.rect(x + w - 10 * sc, y + 4 * sc, 6 * sc, 6 * sc, R.hi);
    G.text(G.TRAITICON[card.trait], x + w - 8.5 * sc, y + 4.5 * sc, { c: C.ink, s: sc });
  }
  // portrait
  const f = G.face(card.faceSeed, card.skin, card.hair);
  ctx2.drawImage(f, x + Math.round(w / 2) - 10 * sc, y + 6 * sc, 20 * sc, 20 * sc);
  // name band
  G.rect(x + 2 * sc, y + 28 * sc, w - 4 * sc, 8 * sc, C.ink);
  const nm = card.name.length > 12 ? card.name.slice(0, 12) : card.name;
  G.text(nm, x + w / 2, y + 29.5 * sc, { c: C.white, align: 'c', s: sc });
  // stats (2x2)
  const keys = card.gk ? ['REF', 'DIV', 'HAN', 'COM'] : ['POW', 'ACC', 'CUR', 'COM'];
  const vals = card.gk ? [card.stats.ref, card.stats.div, card.stats.han, card.stats.com]
    : [card.stats.pow, card.stats.acc, card.stats.cur, card.stats.com];
  for (let i = 0; i < 4; i++) {
    const cx0 = x + 4 * sc + (i % 2) * 25 * sc;
    const cy0 = y + 39 * sc + Math.floor(i / 2) * 8 * sc;
    G.text(keys[i], cx0, cy0, { c: C.fog, s: sc });
    G.text(vals[i], cx0 + 14 * sc, cy0, { c: C.white, s: sc });
  }
  // level pips
  const cap = G.D ? G.D.levelCap(card) : 5;
  for (let i = 0; i < cap; i++) {
    const lit = i < card.level;
    G.rect(x + 4 * sc + i * 5 * sc, y + 57 * sc, 3 * sc, 3 * sc, lit ? R.hi : C.dusk);
  }
  // stamina bar
  if (!opts.noStam) {
    const stw = w - 8 * sc;
    G.rect(x + 4 * sc, y + 63 * sc, stw, 4 * sc, C.dusk);
    const sk = card.stamina / 100;
    const scol = sk > 0.6 ? C.lime : sk > 0.3 ? C.amber : C.red;
    G.rect(x + 4 * sc, y + 63 * sc, Math.max(1, Math.round(stw * sk)), 4 * sc, scol);
    if (sk < 0.3) G.icon('zzz', x + w - 9 * sc, y + 68 * sc);
  }
  // rarity tag
  G.text(R.n, x + 4 * sc, y + 69 * sc, { c: R.hi, s: sc });
  if (opts.dim) {
    ctx2.save(); ctx2.globalAlpha = 0.55; ctx2.fillStyle = C.ink;
    ctx2.fillRect(x, y, w, h); ctx2.restore();
  }
  if (opts.sel) {
    G.frameRect(x - sc, y - sc, w + 2 * sc, h + 2 * sc, C.gold);
    G.frameRect(x - 2 * sc, y - 2 * sc, w + 4 * sc, h + 4 * sc, C.ink);
  }
};

// card back (for pack opening)
G.drawCardBack = function (x, y, sc, rarity) {
  const w = G.CARDW * sc, h = G.CARDH * sc;
  x = Math.round(x); y = Math.round(y);
  G.rect(x + sc, y + 2 * sc, w, h, C.ink);
  G.panel(x, y, w, h, C.dusk, C.ink);
  G.frameRect(x + sc, y + sc, w - 2 * sc, h - 2 * sc, C.slate);
  // diamond motif
  for (let i = 0; i < 5; i++) {
    const dy = y + 8 * sc + i * 13 * sc;
    G.rect(x + w / 2 - sc, dy, 2 * sc, 2 * sc, C.slate);
  }
  G.fillCircle(x + w / 2, y + h / 2, 8 * sc, C.slate);
  G.fillCircle(x + w / 2, y + h / 2, 7 * sc, C.dusk);
  G.text('G', x + w / 2 - 1 * sc, y + h / 2 - 2.5 * sc, { c: C.fog, s: sc, align: 'c' });
};

// pack sprite (36x46)
G.drawPack = function (tier, x, y, sc, ripped) {
  // tier: 0 bronze 1 silver 2 gold
  const cols = [[C.bronze, C.brown], [C.cloud, C.steel], [C.gold, C.amber]][tier];
  const w = 36 * sc, h = 46 * sc;
  x = Math.round(x - w / 2); y = Math.round(y - h / 2);
  G.rect(x + sc, y + 2 * sc, w, h, C.ink);
  G.panel(x, y, w, h, C.dusk, C.ink);
  // foil band
  G.rect(x + 2 * sc, y + 2 * sc, w - 4 * sc, 10 * sc, cols[0]);
  G.rect(x + 2 * sc, y + 10 * sc, w - 4 * sc, 2 * sc, cols[1]);
  if (!ripped) {
    // crimp top
    for (let i = 0; i < w - 4 * sc; i += 2 * sc) G.rect(x + 2 * sc + i, y + sc, sc, sc, cols[1]);
  }
  // ball graphic
  G.fillCircle(x + w / 2, y + 27 * sc, 9 * sc, C.ink);
  G.fillCircle(x + w / 2, y + 27 * sc, 8 * sc, C.white);
  G.rect(x + w / 2 - 2 * sc, y + 25 * sc, 4 * sc, 4 * sc, C.ink);
  G.text(['BRONZE', 'SILVER', 'GOLD'][tier], x + w / 2, y + 39 * sc, { c: cols[0], align: 'c', s: sc, outline: C.ink });
};

// ---------- stadium ----------
const SKIES = [
  { bands: ['#ffd97a', '#feae34', '#f77622'], sun: '#fff3c4', stars: false }, // golden afternoon
  { bands: ['#68386c', '#b55088', '#f77622'], sun: '#fee761', stars: false }, // sunset
  { bands: ['#181425', '#262b44', '#3a4466'], sun: null, stars: true }        // night
];
let crowdCv = null, crowdSeed = -1;

// draws full match backdrop. opts: {sky:0..2, kits:[us,them], excite:0..1}
G.stadium = function (opts) {
  opts = opts || {};
  const sky = SKIES[G.clamp(opts.sky || 0, 0, 2)];
  const ctx2 = G.ctx;
  // sky bands
  G.rect(0, 0, G.W, 18, sky.bands[0]);
  G.rect(0, 18, G.W, 16, sky.bands[1]);
  G.rect(0, 34, G.W, 14, sky.bands[2]);
  G.dither(0, 15, G.W, 4, sky.bands[1]);
  G.dither(0, 31, G.W, 4, sky.bands[2]);
  if (sky.sun) {
    G.fillCircle(172, 22, 8, sky.sun);
  }
  if (sky.stars) {
    ctx2.fillStyle = C.cloud;
    const rng = G.mulberry(42);
    for (let i = 0; i < 26; i++) ctx2.fillRect(Math.floor(rng() * G.W), Math.floor(rng() * 40), 1, 1);
  }
  // floodlights
  for (const fx of [26, 190]) {
    G.rect(fx - 1, 16, 2, 32, C.ink);
    G.rect(fx - 5, 12, 10, 6, C.ink);
    if (sky.stars) { G.rect(fx - 4, 13, 8, 2, C.gold); G.dither(fx - 6, 18, 12, 5, C.gold); }
    else G.rect(fx - 4, 13, 8, 2, C.slate);
  }
  // stands (crowd dither)
  if (!crowdCv || crowdSeed !== (opts.crowdSeed || 0)) {
    crowdSeed = opts.crowdSeed || 0;
    crowdCv = G.makeCanvas(G.W, 66);
    const cx2 = crowdCv.getContext('2d');
    const rng = G.mulberry(1000 + crowdSeed);
    const soft = c => (c === C.white || c === C.cloud || c === C.gold) ? C.fog : c;
    const kA = soft(opts.kits ? opts.kits[0].a : C.red);
    const kB = soft(opts.kits ? opts.kits[1].a : C.blue);
    for (let yy = 0; yy < 66; yy++) {
      for (let xx = 0; xx < G.W; xx++) {
        const r = rng();
        let col = (xx + yy) % 2 ? C.dusk : C.slate;
        if (r < 0.03) col = kA; else if (r < 0.06) col = kB;
        else if (r < 0.085) col = C.steel;
        cx2.fillStyle = col;
        cx2.fillRect(xx, yy, 1, 1);
      }
      if (yy % 11 === 0) { cx2.fillStyle = C.ink; cx2.fillRect(0, yy, G.W, 1); }
    }
  }
  ctx2.drawImage(crowdCv, 0, 48);
  // crowd excitement sparkles
  if (opts.excite) {
    ctx2.fillStyle = C.cloud;
    for (let i = 0; i < opts.excite * 18; i++) {
      ctx2.fillRect(G.irand(0, G.W), G.irand(50, 112), 1, 1);
    }
  }
  // stand roofline
  G.rect(0, 46, G.W, 2, C.ink);
  // adboards
  G.rect(0, 114, G.W, 14, C.ink);
  const ads = ['GOLAZO', 'BOOTCO', 'FIZZ COLA', 'PIX TV'];
  for (let i = 0; i < 4; i++) {
    const bx = 2 + i * 54;
    G.rect(bx, 116, 50, 10, i % 2 ? C.dusk : '#0d5f8a');
    G.text(ads[i], bx + 25, 119, { c: i % 2 ? C.fog : C.sky, align: 'c' });
  }
  // pitch: perspective mow bands
  let yy = 128;
  let bh = 7;
  let band = 0;
  while (yy < G.H) {
    G.rect(0, yy, G.W, bh, band % 2 ? C.grassL : C.grassD);
    yy += bh; bh += 2; band++;
  }
  // penalty box lines
  ctx2.fillStyle = 'rgba(255,255,255,0.5)';
  ctx2.fillRect(0, 149, G.W, 1);                    // goal line
  ctx2.fillRect(30, 196, G.W - 60, 1);              // box front
  line(30, 196, 12, 150); line(G.W - 30, 196, G.W - 12, 150);
  ctx2.fillRect(83, 172, 50, 1);                    // 6yd
  line(83, 172, 72, 150); line(133, 172, 144, 150);
  G.fillCircle(108, 240, 2, 'rgba(255,255,255,0.5)'); // pen spot
  function line(x1, y1, x2, y2) {
    const steps = Math.abs(y2 - y1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      ctx2.fillRect(Math.round(G.lerp(x1, x2, t)), Math.round(G.lerp(y1, y2, t)), 1, 1);
    }
  }
};

// goal frame + net. ripple: {x, t} net impact
G.GOAL = { cx: 108, y: 149, halfW: 46, barH: 46 }; // goal plane: gx in [-46,46], gy in [0,~40]
G.drawGoal = function (ripple) {
  const g = G.GOAL;
  const L = g.cx - g.halfW, R2 = g.cx + g.halfW, T = g.y - g.barH;
  const ctx2 = G.ctx;
  // net (dotted)
  ctx2.fillStyle = 'rgba(192,203,220,0.55)';
  for (let x = L + 3; x < R2 - 2; x += 4) {
    for (let y = T + 3; y < g.y; y += 2) {
      let ox = 0;
      if (ripple && ripple.t > 0) {
        const d = G.dist(x, y, ripple.x, ripple.y);
        if (d < 26) ox = Math.round(Math.sin(d * 0.5 - G.time * 30) * ripple.t * 2.5);
      }
      ctx2.fillRect(x + ox, y, 1, 1);
    }
  }
  for (let y = T + 4; y < g.y - 1; y += 4) {
    for (let x = L + 2; x < R2 - 1; x += 2) ctx2.fillRect(x, y, 1, 1);
  }
  // posts + bar
  G.rect(L - 2, T - 2, 3, g.barH + 2, C.white);
  G.rect(R2 - 1, T - 2, 3, g.barH + 2, C.white);
  G.rect(L - 2, T - 2, g.halfW * 2 + 3, 3, C.white);
  G.rect(L - 2, T + 1, g.halfW * 2 + 3, 1, C.fog);
  G.rect(L - 3, T - 3, 3, g.barH + 3, C.ink);
  ctx2.fillStyle = C.ink;
  ctx2.fillRect(R2 + 2, T - 3, 1, g.barH + 3);
  ctx2.fillRect(L - 3, T - 3, g.halfW * 2 + 6, 1);
};

// map goal-plane coords to screen
G.gp2s = function (gx, gy) {
  return { x: G.GOAL.cx + gx, y: G.GOAL.y - 2 - gy };
};

})(window.GD);

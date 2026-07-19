'use strict';
// GOLAZO DECK — roster, cards, packs, economy, league, save.
(function (G) {

const D = {};
G.D = D;

// ---------- name pools (roster is deterministic for everyone) ----------
const FIRST = ['KAI', 'MATEO', 'JIN', 'OMAR', 'LEO', 'TARIQ', 'NICO', 'ANDRE', 'YUKI', 'DIEGO',
  'SAMI', 'ERIK', 'JOAO', 'LUCA', 'KOFI', 'IVAN', 'RAUL', 'DENZEL', 'PAVEL', 'MARCO',
  'AYO', 'HUGO', 'SVEN', 'TOMAS', 'RYU', 'ABEL', 'DANTE', 'MILOS', 'ZANE', 'FELIX'];
const LAST = ['SILVA', 'OKAFOR', 'VOLKOV', 'TANAKA', 'MORENO', 'HAALDER', 'JENSEN', 'KANTE', 'ROSSI', 'DUARTE',
  'KIMURA', 'NDIAYE', 'PETROV', 'GARCIA', 'LINDQVIST', 'MENSAH', 'ALVES', 'KOVAC', 'SANTOS', 'BAKAYOKO',
  'FERRARO', 'ZIELINSKI', 'OSMAN', 'VEGA', 'STORM', 'ADEYEMI', 'CRUZ', 'BJORN', 'MAGALHAES', 'REYNA'];

const TRAITS_OUT = ['CANNON', 'BULLSEYE', 'TRIVELA', 'KNUCKLE', 'CHIP', 'ICEVEINS'];
const TRAITS_GK = ['SPIDER', 'CAT', 'RADAR'];
D.TRAITDESC = {
  CANNON: 'SHOTS FLY FASTER BUT SPREAD MORE',
  BULLSEYE: 'SHOT SPREAD REDUCED 30%',
  TRIVELA: 'CURL CAP RAISED 45%',
  KNUCKLE: 'KEEPERS MISJUDGE YOUR SHOTS',
  CHIP: 'TAP DURING FLIGHT TO CHIP THE KEEPER',
  ICEVEINS: 'LONGER SLOW-MO ON EVERY SHOT',
  SPIDER: 'BIGGER GLOVE REACH',
  CAT: 'FASTER GLOVE SPEED',
  RADAR: 'SHOT MARKER APPEARS SOONER'
};

// ---------- roster generation (fixed 96 players) ----------
// rarity: 0 C(44) 1 R(28) 2 E(16) 3 L(8)
const ROSTER = [];
D.ROSTER = ROSTER;
(function genRoster() {
  const rng = G.mulberry(777001);
  const counts = [44, 28, 16, 8];
  const posCycle = ['ST', 'WG', 'MID', 'GK', 'ST', 'WG', 'MID', 'ST', 'MID', 'GK'];
  const ranges = [[52, 68], [63, 78], [73, 88], [84, 97]];
  let pid = 0;
  const usedNames = {};
  for (let rar = 0; rar < 4; rar++) {
    for (let i = 0; i < counts[rar]; i++) {
      let name;
      do {
        name = FIRST[Math.floor(rng() * FIRST.length)] + ' ' + LAST[Math.floor(rng() * LAST.length)];
      } while (usedNames[name]);
      usedNames[name] = 1;
      const pos = posCycle[pid % posCycle.length];
      const gk = pos === 'GK';
      const [lo, hi] = ranges[rar];
      const roll = () => Math.round(lo + rng() * (hi - lo));
      let stats;
      if (gk) {
        stats = { ref: roll(), div: roll(), han: roll(), com: roll() };
      } else {
        stats = { pow: roll(), acc: roll(), cur: roll(), com: roll() };
        // positional identity: ST power/acc, WG curl, MID balanced+com
        if (pos === 'ST') { stats.pow = Math.min(99, stats.pow + 5); stats.acc = Math.min(99, stats.acc + 3); stats.cur = Math.max(lo - 6, stats.cur - 5); }
        if (pos === 'WG') { stats.cur = Math.min(99, stats.cur + 7); stats.pow = Math.max(lo - 6, stats.pow - 3); }
        if (pos === 'MID') { stats.com = Math.min(99, stats.com + 5); }
      }
      let trait = null;
      if (rar === 3) trait = gk ? TRAITS_GK[i % TRAITS_GK.length] : TRAITS_OUT[i % TRAITS_OUT.length];
      else if (rar === 2 && rng() < 0.75) trait = gk ? TRAITS_GK[Math.floor(rng() * TRAITS_GK.length)] : TRAITS_OUT[Math.floor(rng() * TRAITS_OUT.length)];
      ROSTER.push({
        pid, name, pos, gk, rarity: rar, baseStats: stats, trait,
        faceSeed: Math.floor(rng() * 99999),
        skin: Math.floor(rng() * G.SKINS.length),
        hair: Math.floor(rng() * G.HAIRC.length)
      });
      pid++;
    }
  }
})();

// ---------- card instances ----------
D.levelCap = card => [5, 6, 8, 10][card.rarity];
function makeCard(pid) {
  const t = ROSTER[pid];
  const c = {
    pid, name: t.name, pos: t.pos, gk: t.gk, rarity: t.rarity, trait: t.trait,
    faceSeed: t.faceSeed, skin: t.skin, hair: t.hair,
    level: 1, stamina: 100, boosts: {}
  };
  refreshStats(c);
  return c;
}
function refreshStats(c) {
  const t = ROSTER[c.pid];
  c.stats = {};
  for (const k in t.baseStats) {
    const lvlBonus = (c.level - 1) + (c.boosts[k] || 0) * 2;
    c.stats[k] = Math.min(99, t.baseStats[k] + lvlBonus);
  }
  const vals = Object.values(c.stats);
  c.rating = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
D.refreshStats = refreshStats;

// effective stat incl. fatigue
D.eff = function (card, key) {
  const v = card.stats[key];
  return card.stamina < 30 ? v * 0.82 : v;
};
D.tired = card => card.stamina < 30;

// ---------- save ----------
const KEY = 'golazo_deck_v1';
let S = null;
D.s = () => S;
D.hasSave = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
D.persist = function () {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
};
D.load = function () {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    S = JSON.parse(raw);
    S.cards.forEach(refreshStats);
    G.audio.setMuted(!S.sound);
    return true;
  } catch (e) { return false; }
};
D.wipe = function () { try { localStorage.removeItem(KEY); } catch (e) { } S = null; };

D.newGame = function (club) {
  S = {
    v: 1, club, coins: 300, cones: 0,
    div: 5, pts: 0, played: 0, matchSeed: G.irand(1, 99999),
    cards: [], tut: {}, sound: 1, freePack: true,
    stats: { played: 0, wins: 0, goals: 0, saves: 0, packs: 0, legend: 0 }
  };
  // starter squad: weakest commons of each role for a fair start
  const commons = ROSTER.filter(r => r.rarity === 0);
  const byPos = pos => commons.filter(r => r.pos === pos).sort((a, b) => avg(a) - avg(b));
  function avg(r) { const v = Object.values(r.baseStats); return v.reduce((x, y) => x + y, 0) / v.length; }
  const picks = [byPos('ST')[0], byPos('ST')[1], byPos('WG')[0], byPos('MID')[0], byPos('GK')[0]];
  const rares = ROSTER.filter(r => r.rarity === 1 && !r.gk).sort((a, b) => avg(a) - avg(b));
  picks.push(rares[0]);
  picks.forEach(p => S.cards.push(makeCard(p.pid)));
  D.persist();
};

D.owned = pid => S.cards.some(c => c.pid === pid);
D.collectionCount = function () {
  const per = [0, 0, 0, 0], tot = [0, 0, 0, 0];
  ROSTER.forEach(r => tot[r.rarity]++);
  S.cards.forEach(c => per[c.rarity]++);
  return { per, tot, owned: S.cards.length, all: ROSTER.length };
};

// ---------- packs ----------
D.PACKS = [
  { tier: 0, name: 'BRONZE PACK', price: 250, n: 3, odds: [0.78, 0.18, 0.035, 0.005], min: 0 },
  { tier: 1, name: 'SILVER PACK', price: 650, n: 4, odds: [0.45, 0.40, 0.13, 0.02], min: 1 },
  { tier: 2, name: 'GOLD PACK', price: 1600, n: 5, odds: [0.15, 0.45, 0.32, 0.08], min: 2 }
];
D.CONESFOR = [4, 10, 26, 70]; // dupe conversion by rarity

function rollRarity(odds) {
  let r = Math.random(), acc = 0;
  for (let i = 0; i < 4; i++) { acc += odds[i]; if (r < acc) return i; }
  return 0;
}
// returns [{card | dupe info}]
D.openPack = function (tier) {
  const P = D.PACKS[tier];
  const out = [];
  let bestRar = 0;
  for (let i = 0; i < P.n; i++) {
    let rar = rollRarity(P.odds);
    if (i === P.n - 1 && bestRar < P.min) rar = Math.max(rar, P.min); // guarantee
    bestRar = Math.max(bestRar, rar);
    const pool = ROSTER.filter(r => r.rarity === rar);
    const t = pool[G.irand(0, pool.length - 1)];
    if (D.owned(t.pid)) {
      const cones = D.CONESFOR[rar];
      S.cones += cones;
      out.push({ dupe: true, cones, card: makeCard(t.pid) });
    } else {
      const card = makeCard(t.pid);
      S.cards.push(card);
      out.push({ dupe: false, card });
    }
  }
  // sort reveal order: worst first, best last (drama)
  out.sort((a, b) => a.card.rarity - b.card.rarity);
  S.stats.packs++;
  D.persist();
  return out;
};

// ---------- upgrades ----------
D.upgradeCost = function (card) {
  const mult = [1, 1.5, 2.4, 4][card.rarity];
  return {
    coins: Math.round(50 * card.level * mult),
    cones: Math.round(3 * card.level * mult)
  };
};
D.canUpgrade = function (card) {
  if (card.level >= D.levelCap(card)) return false;
  const c = D.upgradeCost(card);
  return S.coins >= c.coins && S.cones >= c.cones;
};
D.upgrade = function (card, focusKey) {
  const c = D.upgradeCost(card);
  S.coins -= c.coins; S.cones -= c.cones;
  card.level++;
  card.boosts[focusKey] = (card.boosts[focusKey] || 0) + 1;
  refreshStats(card);
  D.persist();
};

// ---------- stamina ----------
D.useStamina = function (card, amt) {
  card.stamina = Math.max(0, card.stamina - amt);
};
D.recoverAll = function () {
  S.cards.forEach(c => { c.stamina = Math.min(100, c.stamina + 38); });
};

// ---------- moments / eligibility ----------
D.eligible = function (momentType) {
  let pool;
  if (momentType === 'defend') pool = S.cards.filter(c => c.gk);
  else if (momentType === 'oneonone') pool = S.cards.filter(c => !c.gk && (c.pos === 'ST' || c.pos === 'WG'));
  else if (momentType === 'volley') pool = S.cards.filter(c => !c.gk && (c.pos === 'ST' || c.pos === 'MID'));
  else pool = S.cards.filter(c => !c.gk);
  if (!pool.length) pool = momentType === 'defend' ? S.cards.filter(c => c.gk) : S.cards.filter(c => !c.gk);
  pool.sort((a, b) => (b.rating * (D.tired(b) ? 0.85 : 1)) - (a.rating * (D.tired(a) ? 0.85 : 1)));
  return pool.slice(0, 3);
};

// ---------- league / opponents ----------
const OPPNAMES = [
  // div 5 (index 0) .. div 1 (index 4)
  ['SOGGY MEADOW', 'OLD BOOT FC', 'RUSTY WHISTLE', 'DOG & DUCK', 'GRAVEL PITCH UTD', 'BUS STOP ROVERS'],
  ['IRONVALE', 'COALPORT TOWN', 'FOGGY HARBOR', 'BRICKYARD UTD', 'NORTH QUAY', 'STEAM MILL FC'],
  ['AZURE COAST', 'VALLE VERDE', 'SAINT BRUME', 'KESTREL CITY', 'ROYAL PONTE', 'DYNAMO KRAJ'],
  ['ATLETICO SOLAR', 'CRIMSON BAY', 'NORDHAVN', 'IMPERIAL VOLTA', 'CLUB MERIDIAN', 'FC AURORA'],
  ['REAL METEORA', 'GALAXIA CF', 'INVICTUS XI', 'BAYERN NOVA', 'OLYMPIQUE LUNE', 'AC LEGENDE']
];
// keeper you face + defensive pressure per division (5=easiest)
D.DIVCFG = {
  5: { rea: 0.32, spd: 52, reach: 10, err: 17, defT: 5.2, shotQ: 0.25, sky: 0, defN: 1, promo: 9 },
  4: { rea: 0.27, spd: 64, reach: 11, err: 13, defT: 4.6, shotQ: 0.4, sky: 0, defN: 1, promo: 9 },
  3: { rea: 0.23, spd: 78, reach: 12, err: 10, defT: 4.2, shotQ: 0.55, sky: 1, defN: 1, promo: 12 },
  2: { rea: 0.19, spd: 92, reach: 13, err: 7, defT: 3.8, shotQ: 0.72, sky: 1, defN: 2, promo: 12 },
  1: { rea: 0.155, spd: 108, reach: 14, err: 5, defT: 3.4, shotQ: 0.88, sky: 2, defN: 2, promo: 15 },
  0: { rea: 0.14, spd: 118, reach: 14, err: 4, defT: 3.2, shotQ: 1.0, sky: 2, defN: 2, promo: 15 }
};
D.opponent = function () {
  const div = S.div;
  const tier = G.clamp(5 - div, 0, 4);
  const rng = G.mulberry(S.matchSeed + S.played * 131);
  const names = OPPNAMES[tier];
  const name = names[Math.floor(rng() * names.length)];
  let kitIdx = Math.floor(rng() * G.KITS.length);
  if (kitIdx === S.club.kit) kitIdx = (kitIdx + 3) % G.KITS.length;
  return {
    name, kit: kitIdx,
    crest: { shape: Math.floor(rng() * 4), pat: Math.floor(rng() * 4) },
    cfg: D.DIVCFG[div] || D.DIVCFG[0],
    keeperName: LAST[Math.floor(rng() * LAST.length)],
    seed: Math.floor(rng() * 9999)
  };
};

D.promoNeed = () => (D.DIVCFG[S.div] || D.DIVCFG[0]).promo;
D.PROMOREWARD = { 5: { coins: 300, pack: 0 }, 4: { coins: 450, pack: 1 }, 3: { coins: 650, pack: 1 }, 2: { coins: 900, pack: 2 }, 1: { coins: 1500, pack: 2 } };

// result: {win, draw, goals, saves} → rewards + league progress. returns summary
D.applyResult = function (r) {
  const wasDiv = S.div;
  let pts = r.win ? 3 : (r.draw ? 1 : 0);
  S.pts += pts;
  S.played++;
  S.stats.played++;
  if (r.win) S.stats.wins++;
  S.stats.goals += r.goals; S.stats.saves += r.saves;
  const base = r.win ? 150 : r.draw ? 80 : 45;
  const coins = base + r.goals * 25 + r.saves * 35;
  S.coins += coins;
  D.recoverAll();
  let promo = null;
  if (S.pts >= D.promoNeed() && S.div >= 1) {
    promo = D.PROMOREWARD[S.div];
    S.coins += promo.coins;
    S.pts = 0; S.played = 0;
    S.div--;
    if (S.div === 0) S.stats.legend = 1;
  }
  D.persist();
  return { pts, coins, promo, fromDiv: wasDiv };
};

// club name parts for creator
D.CLUBA = ['FC', 'REAL', 'ATLETICO', 'UNITED', 'SPORTING', 'INTER', 'DYNAMO', 'RACING', 'OLYMPIC', 'CITY'];
D.CLUBB = ['PIXELIA', 'GOLAZO', 'THUNDER', 'MERIDIAN', 'AURORA', 'VOLTA', 'CASCADE', 'EMBER', 'ZENITH', 'HARBOR', 'BOREAL', 'SOLIS'];

})(window.GD);

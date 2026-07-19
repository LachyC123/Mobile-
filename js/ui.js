'use strict';
// GOLAZO DECK — menu scenes: title, club creator, home, squad, shop, packs, league, result.
(function (G) {

const C = G.C;
const D = () => G.D;

function coinsBar() {
  const s = D().s();
  G.panel(4, 3, 66, 13, C.dusk, C.ink);
  G.icon('coin', 8, 6);
  G.text(s.coins, 18, 7, { c: C.gold });
  G.panel(74, 3, 58, 13, C.dusk, C.ink);
  G.icon('cone', 78, 6);
  G.text(s.cones, 88, 7, { c: C.ember });
  // sound toggle
  if (G.button(190, 3, 22, 13, '', { fill: C.dusk, flat: true })) {
    s.sound = s.sound ? 0 : 1;
    G.audio.setMuted(!s.sound);
    D().persist();
  }
  G.icon(D().s().sound ? 'snd' : 'sndoff', 197, 6);
}

function menuBg(title) {
  G.rect(0, 0, G.W, G.H, C.ink);
  // subtle pitch backdrop
  let yy = 0, band = 0;
  while (yy < G.H) {
    G.rect(0, yy, G.W, 24, band % 2 ? C.dusk : '#1e1a30');
    yy += 24; band++;
  }
  if (title) {
    G.rect(0, 22, G.W, 16, C.dusk);
    G.rect(0, 22, 3, 16, C.amber);
    G.text(title, 108, 27, { c: '#ffffff', align: 'c', s: 1 });
  }
}

// ================= TITLE =================
G.reg('title', {
  enter() {
    this.ballY = -20; this.ballV = 0; this.confirmWipe = 0;
    G.audio.crowd(0);
  },
  update(dt) {
    this.ballV += 300 * dt;
    this.ballY += this.ballV * dt;
    if (this.ballY > 250) { this.ballY = 250; this.ballV = -Math.abs(this.ballV) * 0.75; if (Math.abs(this.ballV) > 40) G.audio.bounce(); }
    if (this.confirmWipe > 0) this.confirmWipe -= dt;
  },
  draw() {
    G.stadium({ sky: 1, kits: [G.KITS[0], G.KITS[1]], excite: 0.2 });
    G.drawGoal(null);
    G.rect(0, 132, G.W, 120, 'rgba(24,20,37,0.55)');
    // logo
    const bob = Math.sin(G.time * 2) * 2;
    G.text('GOLAZO', 108, 150 + bob, { c: C.gold, s: 4, align: 'c', outline: C.ink });
    G.panel(64, 184 + bob, 88, 16, C.red, C.ink);
    G.text('DECK', 108, 188 + bob, { c: '#ffffff', s: 2, align: 'c' });
    G.ball(174, this.ballY, 5, G.time * 2);
    // tap prompt
    G.text('TAP TO KICK OFF', 108, 280, { c: '#ffffff', align: 'c', outline: C.ink, alpha: 0.6 + 0.4 * Math.sin(G.time * 4) });
    G.text('COLLECT. FLICK. SCORE.', 108, 296, { c: C.cloud, align: 'c' });
    if (D().hasSave()) {
      if (G.button(64, 344, 88, 14, this.confirmWipe > 0 ? 'SURE?' : 'RESET CLUB', { fill: C.dusk, tc: C.fog })) {
        if (this.confirmWipe > 0) { D().wipe(); G.toast('SAVE CLEARED'); this.confirmWipe = 0; }
        else this.confirmWipe = 2.5;
      }
    }
    if (G.tapped(0, 0, G.W, 330)) {
      G.audio.unlock();
      if (D().load()) { G.audio.music(true); G.go('home'); }
      else G.go('create');
    }
  }
});

// ================= CREATE CLUB =================
G.reg('create', {
  enter() {
    this.a = G.irand(0, D().CLUBA.length - 1);
    this.b = G.irand(0, D().CLUBB.length - 1);
    this.kit = G.irand(0, G.KITS.length - 1);
    this.shape = G.irand(0, 3);
    this.pat = G.irand(0, 3);
  },
  update() { },
  draw() {
    menuBg('FOUND YOUR CLUB');
    const name = D().CLUBA[this.a] + ' ' + D().CLUBB[this.b];
    const kit = G.KITS[this.kit];
    const crest = { shape: this.shape, pat: this.pat };

    // preview
    G.drawCrest(crest, kit, 108, 74, 3);
    G.text(name, 108, 104, { c: '#ffffff', align: 'c', s: 1, outline: C.ink });
    G.drawSprite('celebrate', kit, 2, 0, 74, 178, { scale: 2 });
    G.drawSprite('idleBack', kit, 0, 3, 140, 176, { scale: 2 });

    // pickers
    picker.call(this, 200, 'NAME', () => { this.a = (this.a + 1) % D().CLUBA.length; }, () => { this.b = (this.b + 1) % D().CLUBB.length; }, name);
    picker.call(this, 232, 'KIT: ' + kit.n, () => { this.kit = (this.kit + G.KITS.length - 1) % G.KITS.length; }, () => { this.kit = (this.kit + 1) % G.KITS.length; });
    picker.call(this, 264, 'CREST', () => { this.shape = (this.shape + 1) % 4; }, () => { this.pat = (this.pat + 1) % 4; });

    function picker(y, label, onL, onR) {
      G.panel(16, y, 184, 24, C.dusk, C.ink);
      if (G.button(20, y + 4, 18, 16, '<', { fill: C.slate })) onL();
      if (G.button(178, y + 4, 18, 16, '>', { fill: C.slate })) onR();
      G.text(label, 108, y + 9, { c: C.cloud, align: 'c' });
    }

    if (G.button(38, 310, 140, 24, 'START CAREER', { fill: C.red, s: 1 })) {
      D().newGame({ name, kit: this.kit, crest });
      G.audio.fanfare();
      G.audio.music(true);
      G.go('home');
    }
    G.text('YOUR KIT COLORS SHOW ON THE PITCH', 108, 348, { c: C.fog, align: 'c' });
  }
});

// ================= HOME =================
G.reg('home', {
  enter() {
    this.opp = D().opponent();
    if (G.sceneName() === 'home') G.audio.crowd(0);
  },
  update() { },
  draw() {
    const s = D().s();
    menuBg();
    coinsBar();
    // club header
    G.drawCrest(s.club.crest, G.KITS[s.club.kit], 34, 44, 2);
    G.text(s.club.name, 60, 32, { c: '#ffffff', s: 1 });
    const divName = s.div === 0 ? 'LEGEND LEAGUE' : 'DIVISION ' + s.div;
    G.text(divName, 60, 44, { c: C.amber });
    G.text(s.stats.wins + ' WINS - ' + s.stats.goals + ' GOALS', 60, 54, { c: C.fog });

    // promotion progress
    const need = D().promoNeed();
    G.panel(16, 66, 184, 20, C.dusk, C.ink);
    G.text('PROMOTION', 22, 71, { c: C.cloud });
    G.text(s.pts + '/' + need + ' PTS', 194, 71, { c: C.gold, align: 'r' });
    G.rect(22, 79, 172, 4, C.ink);
    G.rect(22, 79, Math.round(172 * Math.min(1, s.pts / need)), 4, C.lime);

    // next match panel
    const o = this.opp;
    G.panel(16, 94, 184, 74, C.dusk, C.ink);
    G.text('NEXT MATCH', 108, 100, { c: C.fog, align: 'c' });
    G.drawCrest(s.club.crest, G.KITS[s.club.kit], 60, 130, 2);
    G.drawCrest(o.crest, G.KITS[o.kit], 156, 130, 2);
    G.text('VS', 108, 124, { c: C.gold, s: 2, align: 'c' });
    G.text(s.club.name.split(' ')[1] || s.club.name, 60, 152, { c: '#ffffff', align: 'c' });
    G.text(o.name, 156, 152, { c: '#ffffff', align: 'c' });

    if (G.button(38, 176, 140, 28, 'PLAY MATCH', { fill: C.red, s: 2 })) {
      G.audio.music(false);
      G.go('match');
    }

    // squad snapshot: top 3 cards
    const top = [...s.cards].sort((a, b) => b.rating - a.rating).slice(0, 3);
    for (let i = 0; i < top.length; i++) {
      G.drawCard(top[i], 19 + i * 62, 216, 1, { noStam: false });
    }
    if (G.tapped(16, 212, 184, 82)) G.go('squad');

    // nav
    if (G.button(16, 310, 56, 24, 'SQUAD', { fill: C.slate })) G.go('squad');
    if (G.button(80, 310, 56, 24, 'PACKS', { fill: C.amber, tc: C.ink })) G.go('shop');
    if (G.button(144, 310, 56, 24, 'LEAGUE', { fill: C.slate })) G.go('league');

    const col = D().collectionCount();
    G.text('COLLECTION ' + col.owned + '/' + col.all, 108, 344, { c: C.fog, align: 'c' });
    if (s.freePack) {
      G.text('FREE PACK WAITING IN PACKS!', 108, 356, { c: C.gold, align: 'c', alpha: 0.6 + 0.4 * Math.sin(G.time * 4) });
    }
  }
});

// ================= SQUAD =================
G.reg('squad', {
  enter() {
    this.scroll = 0; this.sel = null; this.focus = null;
    this.cards = [...D().s().cards].sort((a, b) => b.rating - a.rating);
  },
  update(dt) {
    if (this.sel) return;
    const P = G.P;
    if (P.down && P.moved > 8) this.scroll = G.clamp(this.scroll - P.dy, 0, this.maxScroll || 0);
  },
  draw() {
    menuBg('SQUAD');
    const s = D().s();
    if (this.sel) { this.drawDetail(); return; }
    this.cards = this.cards.filter(c => s.cards.includes(c));
    const col = D().collectionCount();
    G.text(col.owned + '/' + col.all + ' COLLECTED', 108, 44, { c: C.cloud, align: 'c' });
    for (let r = 0; r < 4; r++) {
      G.text(G.RAR[3 - r].n + ' ' + col.per[3 - r] + '/' + col.tot[3 - r], 24 + r * 46, 54, { c: G.RAR[3 - r].hi });
    }
    const y0 = 68 - this.scroll;
    const n = this.cards.length;
    this.maxScroll = Math.max(0, Math.ceil(n / 3) * 88 + 68 + 40 - G.H);
    for (let i = 0; i < n; i++) {
      const x = 19 + (i % 3) * 62;
      const y = y0 + Math.floor(i / 3) * 88;
      if (y < -90 || y > G.H) continue;
      G.drawCard(this.cards[i], x, y, 1);
      if (G.tapped(x, y, G.CARDW, G.CARDH) && G.P.moved < 9) { this.sel = this.cards[i]; G.audio.ui(); }
    }
    if (G.button(4, 3, 34, 13, '<BACK', { fill: C.dusk, tc: C.cloud })) G.go('home');
  },
  drawDetail() {
    const c = this.sel;
    G.rect(0, 0, G.W, G.H, 'rgba(24,20,37,0.85)');
    G.drawCard(c, 54, 28, 2, { noStam: false });
    const R = G.RAR[c.rarity];
    // trait
    let y = 192;
    if (c.trait) {
      G.panel(16, y, 184, 22, C.dusk, C.ink);
      G.text(c.trait, 22, y + 4, { c: R.hi });
      G.text(D().TRAITDESC[c.trait], 22, y + 12, { c: C.cloud });
      y += 26;
    }
    // upgrade
    const cap = D().levelCap(c);
    G.panel(16, y, 184, 62, C.dusk, C.ink);
    if (c.level >= cap) {
      G.text('MAX LEVEL', 108, y + 26, { c: C.gold, align: 'c', s: 1 });
    } else {
      const cost = D().upgradeCost(c);
      G.text('TRAIN TO LVL ' + (c.level + 1), 22, y + 5, { c: '#ffffff' });
      G.icon('coin', 120, y + 3); G.text(cost.coins, 130, y + 4, { c: C.gold });
      G.icon('cone', 160, y + 3); G.text(cost.cones, 170, y + 4, { c: C.ember });
      G.text('PICK A FOCUS STAT: +3 (OTHERS +1)', 22, y + 16, { c: C.fog });
      const keys = c.gk ? ['ref', 'div', 'han', 'com'] : ['pow', 'acc', 'cur', 'com'];
      const can = D().canUpgrade(c);
      for (let i = 0; i < 4; i++) {
        const bx = 22 + i * 44;
        if (G.button(bx, y + 28, 38, 24, keys[i].toUpperCase() + '+3', { fill: can ? C.blue : C.slate, disabled: !can })) {
          D().upgrade(c, keys[i]);
          G.audio.upgrade();
          G.burst(108, 120, { n: 14, c: [R.hi, C.gold, '#ffffff'], sp: 70, g: 60 });
          G.pop('LEVEL UP!', 108, 100, { c: C.gold, s: 2, outline: C.ink });
        }
      }
      if (!can && c.level < cap) G.text('NEED MORE COINS/CONES - DUPES = CONES', 108, y + 55, { c: C.fog, align: 'c' });
    }
    y += 66;
    G.text('STAMINA REFILLS AFTER EACH MATCH', 108, y + 4, { c: C.fog, align: 'c' });
    if (G.button(58, y + 16, 100, 20, 'CLOSE', { fill: C.slate })) this.sel = null;
  }
});

// ================= SHOP =================
G.reg('shop', {
  enter() { },
  update() { },
  draw() {
    menuBg('PACK SHOP');
    coinsBar();
    const s = D().s();
    let y = 46;
    if (s.freePack) {
      G.panel(16, y, 184, 30, C.dusk, C.gold);
      G.text('WELCOME GIFT: FREE BRONZE PACK', 24, y + 5, { c: C.gold });
      if (G.button(140, y + 15, 54, 12, 'CLAIM', { fill: C.gold, tc: C.ink })) {
        s.freePack = false;
        D().persist();
        G.go('pack', { tier: 0, free: true });
      }
      y += 36;
    }
    for (const P of D().PACKS) {
      G.panel(16, y, 184, 62, C.dusk, C.ink);
      G.drawPack(P.tier, 44, y + 31, 1, false);
      G.text(P.name, 74, y + 8, { c: '#ffffff', s: 1 });
      G.text(P.n + ' CARDS', 74, y + 20, { c: C.cloud });
      const oddsTxt = P.tier === 0 ? 'MOSTLY COMMON, RARE 18%' : P.tier === 1 ? 'RARE GUARANTEED, EPIC 13%' : 'EPIC GUARANTEED, ICON 8%';
      G.text(oddsTxt, 74, y + 30, { c: C.fog });
      const afford = s.coins >= P.price;
      G.icon('coin', 74, y + 41);
      G.text(P.price, 84, y + 42, { c: afford ? C.gold : C.red });
      if (G.button(140, y + 40, 54, 16, 'BUY', { fill: afford ? C.red : C.slate, disabled: !afford })) {
        s.coins -= P.price;
        G.audio.buy();
        D().persist();
        G.go('pack', { tier: P.tier });
      }
      y += 68;
    }
    G.text('DUPLICATES BECOME TRAINING CONES', 108, y + 4, { c: C.fog, align: 'c' });
    if (G.button(4, 3, 34, 13, '<BACK', { fill: C.dusk, tc: C.cloud })) G.go('home');
  }
});

// ================= PACK OPENING =================
G.reg('pack', {
  enter(args) {
    this.tier = args.tier;
    this.results = null;
    this.stage = 'seal'; // seal → cards
    this.flipped = [];
    this.shakeT = 0;
  },
  update(dt) { },
  draw() {
    menuBg();
    const t = this.tier;
    if (this.stage === 'seal') {
      const wob = Math.sin(G.time * 3) * 3;
      G.drawPack(t, 108, 170 + wob, 2, false);
      G.text('TAP TO RIP OPEN', 108, 264, { c: '#ffffff', align: 'c', outline: C.ink, alpha: 0.6 + 0.4 * Math.sin(G.time * 5) });
      if (G.tapped(0, 60, G.W, 260)) {
        this.results = D().openPack(t);
        this.stage = 'cards';
        this.flipped = this.results.map(() => false);
        G.audio.flip();
        G.addShake(0.35);
        G.burst(108, 170, { n: 20, c: [C.gold, C.cloud, '#ffffff'], sp: 90, life: 0.8 });
        G.vibrate(25);
      }
      return;
    }
    // cards laid out
    const res = this.results;
    const n = res.length;
    G.text('TAP CARDS TO REVEAL', 108, 30, { c: C.cloud, align: 'c' });
    const perRow = Math.min(3, n);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 3);
      const inRow = Math.min(3, n - row * 3);
      const totw = inRow * G.CARDW + (inRow - 1) * 8;
      const x = Math.round((G.W - totw) / 2) + (i % 3) * (G.CARDW + 8);
      const y = 48 + row * 92;
      const r = res[i];
      if (this.flipped[i]) {
        G.drawCard(r.card, x, y, 1, { noStam: true });
        if (r.dupe) {
          G.rect(x, y + 28, G.CARDW, 10, 'rgba(24,20,37,0.85)');
          G.text('DUPE +' + r.cones, x + G.CARDW / 2, y + 30, { c: C.ember, align: 'c' });
          G.icon('cone', x + G.CARDW / 2 + 24, y + 29);
        } else if (r.card.rarity >= 2) {
          G.text('NEW!', x + G.CARDW / 2, y - 8, { c: G.RAR[r.card.rarity].hi, align: 'c', outline: C.ink });
        }
      } else {
        const wob = Math.sin(G.time * 4 + i * 1.4) * 2;
        G.drawCardBack(x, y + wob, 1, r.card.rarity);
        // rarity tease glow for big pulls
        if (r.card.rarity >= 2) {
          G.frameRect(x - 2, y + wob - 2, G.CARDW + 4, G.CARDH + 4, r.card.rarity === 3 ? C.gold : C.violet);
        }
        if (G.tapped(x, y - 4, G.CARDW, G.CARDH + 8)) {
          this.flipped[i] = true;
          G.audio.reveal(r.card.rarity);
          const R = G.RAR[r.card.rarity];
          G.burst(x + G.CARDW / 2, y + G.CARDH / 2, { n: 10 + r.card.rarity * 8, c: [R.hi, '#ffffff'], sp: 60 + r.card.rarity * 25, life: 0.7 });
          if (r.card.rarity === 3) { G.flash('#ffffff', 0.2); G.addShake(0.5); G.vibrate([20, 30, 50]); G.audio.excite(1); }
          else if (r.card.rarity === 2) { G.addShake(0.25); G.vibrate(25); }
        }
      }
    }
    const allFlipped = this.flipped.every(f => f);
    if (allFlipped) {
      if (G.button(58, 330, 100, 24, 'DONE', { fill: C.red, s: 1 })) G.go('shop');
    } else {
      if (G.button(74, 334, 68, 16, 'FLIP ALL', { fill: C.slate, tc: C.cloud })) {
        for (let i = 0; i < n; i++) if (!this.flipped[i]) { this.flipped[i] = true; G.audio.reveal(res[i].card.rarity); }
      }
    }
  }
});

// ================= LEAGUE =================
G.reg('league', {
  enter() { },
  update() { },
  draw() {
    menuBg('THE CLIMB');
    const s = D().s();
    // ladder of divisions 5→1 + legend
    const rungs = [5, 4, 3, 2, 1, 0];
    for (let i = 0; i < rungs.length; i++) {
      const div = rungs[i];
      const y = 300 - i * 46;
      const here = s.div === div;
      const done = s.div < div;
      G.panel(30, y, 156, 38, here ? C.slate : C.dusk, here ? C.gold : C.ink);
      const label = div === 0 ? 'LEGEND LEAGUE' : 'DIVISION ' + div;
      G.text(label, 44, y + 6, { c: here ? C.gold : done ? C.lime : C.cloud, s: 1 });
      if (done) G.text('CONQUERED', 44, y + 18, { c: C.lime });
      else if (here) {
        const need = D().promoNeed();
        G.text(s.pts + '/' + need + ' PTS TO RISE', 44, y + 18, { c: '#ffffff' });
        G.rect(44, y + 27, 100, 4, C.ink);
        G.rect(44, y + 27, Math.round(100 * Math.min(1, s.pts / need)), 4, C.lime);
        G.drawCrest(s.club.crest, G.KITS[s.club.kit], 168, y + 19, 1);
      } else {
        const rw = D().PROMOREWARD[div + 1];
        if (rw) G.text('REWARD: ' + rw.coins + ' COINS + PACK', 44, y + 18, { c: C.fog });
        G.icon('lock', 168, y + 14);
      }
    }
    if (s.stats.legend) G.text('YOU ARE A LEGEND. KEEP SCORING.', 108, 36, { c: C.gold, align: 'c' });
    else G.text('WIN MATCHES. EARN PTS. RISE.', 108, 36, { c: C.cloud, align: 'c' });
    if (G.button(4, 3, 34, 13, '<BACK', { fill: C.dusk, tc: C.cloud })) G.go('home');
  }
});

// ================= RESULT =================
G.reg('result', {
  enter(args) {
    this.r = args;
    const win = args.us > args.them;
    const drew = args.us === args.them;
    this.sum = D().applyResult({ win, draw: drew, goals: args.us, saves: args.saves });
    this.win = win; this.drew = drew;
    this.t = 0;
    this.coinShown = 0;
    if (win) G.audio.fanfare(); else if (drew) G.audio.whistle(2); else G.audio.sad();
    if (this.sum.promo) G.audio.roar();
  },
  update(dt) {
    this.t += dt;
    const target = this.sum.coins + (this.sum.promo ? this.sum.promo.coins : 0);
    if (this.t > 0.8 && this.coinShown < target) {
      this.coinShown = Math.min(target, this.coinShown + dt * 300);
      if (Math.floor(this.coinShown) % 20 === 0) G.audio.tick();
    }
  },
  draw() {
    menuBg();
    const r = this.r;
    const s = D().s();
    const verdict = this.win ? 'VICTORY!' : this.drew ? 'DRAW' : 'DEFEAT';
    const vcol = this.win ? C.gold : this.drew ? C.cloud : C.red;
    const e = G.ease.outBack(Math.min(1, this.t * 2));
    G.ctx.save();
    G.ctx.translate(108, 60);
    G.ctx.scale(e, e);
    G.text(verdict, 0, -10, { c: vcol, s: 3, align: 'c', outline: C.ink });
    G.ctx.restore();

    // scoreline
    G.drawCrest(s.club.crest, G.KITS[s.club.kit], 40, 106, 2);
    G.drawCrest(r.opp.crest, G.KITS[r.opp.kit], 176, 106, 2);
    G.text(r.us + ' - ' + r.them, 108, 98, { c: '#ffffff', s: 3, align: 'c', outline: C.ink });
    G.text(s.club.name.slice(0, 13), 44, 128, { c: C.cloud, align: 'c' });
    G.text(r.opp.name.slice(0, 13), 172, 128, { c: C.cloud, align: 'c' });

    // moment recap pips
    const n = r.events.length;
    const px0 = 108 - (n * 12 - 4) / 2;
    for (let i = 0; i < n; i++) {
      const ev = r.events[i];
      const col = ev === 1 ? C.lime : ev === 2 ? C.steel : ev === 3 ? C.red : C.sky;
      G.rect(px0 + i * 12, 142, 8, 8, C.ink);
      G.rect(px0 + i * 12 + 1, 143, 6, 6, col);
    }

    // rewards
    G.panel(28, 162, 160, 56, C.dusk, C.ink);
    G.text('LEAGUE PTS', 36, 168, { c: C.cloud });
    G.text('+' + this.sum.pts, 180, 168, { c: C.lime, align: 'r' });
    G.text('COINS EARNED', 36, 182, { c: C.cloud });
    G.icon('coin', 152, 180);
    G.text('+' + Math.floor(this.coinShown), 180, 182, { c: C.gold, align: 'r' });
    G.text('SAVES ' + r.saves + '  GOALS ' + r.us, 36, 196, { c: C.fog });
    G.text('SQUAD STAMINA RESTORED', 36, 206, { c: C.fog });

    // promotion banner
    if (this.sum.promo && this.t > 1) {
      const pe = G.ease.outBack(Math.min(1, (this.t - 1) * 2));
      G.ctx.save();
      G.ctx.translate(108, 244);
      G.ctx.scale(pe, pe);
      G.panel(-90, -14, 180, 40, C.amber, C.ink);
      G.text('PROMOTED!', 0, -8, { c: C.ink, s: 2, align: 'c' });
      const newDiv = s.div === 0 ? 'LEGEND LEAGUE' : 'DIVISION ' + s.div;
      G.text('WELCOME TO ' + newDiv, 0, 10, { c: C.ink, align: 'c' });
      G.ctx.restore();
      if (this.t > 1.4 && Math.random() < 0.2) {
        G.burst(G.irand(20, 196), 240, { n: 3, c: [C.gold, C.red, C.sky, '#ffffff'], sp: 50, g: 80, life: 1, wob: 10 });
      }
      if (G.button(38, 290, 140, 26, 'OPEN REWARD PACK', { fill: C.gold, tc: C.ink, s: 1 })) {
        G.go('pack', { tier: this.sum.promo.pack });
      }
      if (G.button(58, 326, 100, 20, 'CONTINUE', { fill: C.slate })) G.go('home');
    } else {
      if (this.t > 1 && G.button(38, 260, 140, 26, 'CONTINUE', { fill: C.red, s: 1 })) G.go('home');
      if (this.t > 1 && G.button(58, 296, 100, 20, 'PLAY AGAIN', { fill: C.slate })) G.go('match');
    }
  }
});

})(window.GD);

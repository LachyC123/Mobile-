'use strict';
// GOLAZO DECK — WebAudio synth SFX, crowd ambience, tiny chiptune sequencer.
(function (G) {

let ac = null, master = null, crowdGain = null, crowdNode = null, crowdFilter = null;
let muted = false;
let musicOn = false, musicTimer = null, musicStep = 0, musicGain = null;

const A = {};
G.audio = A;

A.setMuted = m => {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.9;
};
A.isMuted = () => muted;

A.unlock = function () {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { return; }
  master = ac.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ac.destination);

  // crowd: looped filtered noise
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < len; i++) { v = v * 0.97 + (Math.random() * 2 - 1) * 0.15; d[i] = v; }
  crowdNode = ac.createBufferSource();
  crowdNode.buffer = buf; crowdNode.loop = true;
  crowdFilter = ac.createBiquadFilter();
  crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 620; crowdFilter.Q.value = 0.6;
  crowdGain = ac.createGain(); crowdGain.gain.value = 0;
  crowdNode.connect(crowdFilter); crowdFilter.connect(crowdGain); crowdGain.connect(master);
  crowdNode.start();
};

function tone(freq, dur, type, vol, slideTo, delay) {
  if (!ac) return;
  const t0 = ac.currentTime + (delay || 0);
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol || 0.12, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, freq, vol, delay, type) {
  if (!ac) return;
  const t0 = ac.currentTime + (delay || 0);
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t0); s.stop(t0 + dur + 0.02);
}

A.ui = () => { tone(660, 0.05, 'square', 0.06); };
A.back = () => { tone(440, 0.06, 'square', 0.06, 330); };
A.kick = () => { noise(0.09, 900, 0.25); tone(150, 0.1, 'sine', 0.3, 55); };
A.bounce = () => { tone(220, 0.06, 'square', 0.1, 180); };
A.whistle = (n) => {
  n = n || 1;
  for (let i = 0; i < n; i++) { tone(2350, 0.16, 'square', 0.05, 2300, i * 0.22); noise(0.14, 2600, 0.03, i * 0.22, 'bandpass'); }
};
A.whistleLong = () => { tone(2350, 0.55, 'square', 0.05, 2250); noise(0.5, 2600, 0.03, 0, 'bandpass'); };
A.post = () => { tone(680, 0.3, 'triangle', 0.2, 660); tone(1020, 0.22, 'triangle', 0.12, 990); noise(0.05, 3000, 0.1); };
A.saveThud = () => { noise(0.12, 500, 0.3); tone(190, 0.12, 'sine', 0.2, 90); };
A.swish = () => { noise(0.16, 4200, 0.08, 0, 'highpass'); };
A.flip = () => { noise(0.08, 3500, 0.08, 0, 'highpass'); tone(880, 0.05, 'square', 0.05, 1200); };
A.coin = () => { tone(988, 0.05, 'square', 0.07); tone(1319, 0.12, 'square', 0.07, 0, 0.05); };
A.buy = () => { tone(523, 0.06, 'square', 0.08); tone(659, 0.06, 'square', 0.08, 0, 0.06); tone(784, 0.1, 'square', 0.08, 0, 0.12); };
A.deny = () => { tone(180, 0.14, 'square', 0.1, 120); };
A.chip = () => { tone(520, 0.14, 'sine', 0.12, 900); };
A.ohh = () => { noise(0.5, 380, 0.16); A.excite(0.25); };
A.roar = () => {
  noise(0.8, 900, 0.2);
  A.excite(1);
  const notes = [523, 659, 784, 1046];
  notes.forEach((f, i) => tone(f, 0.14, 'square', 0.09, 0, 0.06 + i * 0.09));
};
A.fanfare = () => {
  const seq = [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36], [784, 0.52], [1046, 0.62]];
  seq.forEach(([f, d]) => { tone(f, 0.16, 'square', 0.1, 0, d); tone(f / 2, 0.16, 'triangle', 0.08, 0, d); });
};
A.sad = () => { tone(392, 0.2, 'triangle', 0.1); tone(330, 0.25, 'triangle', 0.1, 0, 0.2); tone(262, 0.4, 'triangle', 0.1, 0, 0.42); };
A.reveal = (rarity) => {
  const base = [440, 554, 659, 880];
  for (let i = 0; i <= rarity; i++) tone(base[i], 0.1, 'square', 0.08, 0, i * 0.07);
  if (rarity >= 3) { A.fanfare(); noise(0.5, 1500, 0.1, 0.4, 'bandpass'); }
  else if (rarity === 2) tone(1108, 0.2, 'square', 0.09, 0, 0.3);
};
A.upgrade = () => { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.09, 'square', 0.09, 0, i * 0.07)); };
A.tick = () => { tone(1200, 0.02, 'square', 0.04); };
A.slowmo = () => { tone(300, 0.3, 'sine', 0.08, 150); };

// crowd ambience level 0..1
let crowdLevel = 0, exciteT = 0;
A.crowd = lvl => { crowdLevel = lvl; };
A.excite = amt => { exciteT = Math.max(exciteT, amt); };
setInterval(() => {
  if (!crowdGain) return;
  exciteT = Math.max(0, exciteT - 0.05);
  const target = crowdLevel * (0.045 + exciteT * 0.22);
  crowdGain.gain.linearRampToValueAtTime(target, ac.currentTime + 0.1);
  crowdFilter.frequency.value = 620 + exciteT * 500;
}, 90);

// ---- menu music: bright 2-channel loop ----
const LEAD = [0, 0, 7, 0, 12, 0, 7, 0, 5, 0, 4, 0, 5, 7, 4, 0,
  0, 0, 7, 0, 12, 0, 14, 0, 12, 0, 7, 0, 5, 4, 2, 0];
const BASS = [0, 0, 0, 0, -5, -5, -5, -5, -7, -7, -7, -7, -5, -5, -3, -3];
const ROOT = 392; // G4
function n2f(n) { return ROOT * Math.pow(2, n / 12); }
A.music = function (on) {
  musicOn = on;
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (!on || !ac) return;
  musicStep = 0;
  musicTimer = setInterval(() => {
    if (!ac || muted) { musicStep++; return; }
    const i = musicStep % 32;
    const l = LEAD[i];
    if (l !== 0 || i % 8 === 0) tone(n2f(l), 0.12, 'square', 0.028);
    const b = BASS[Math.floor(i / 2) % 16];
    if (i % 2 === 0) tone(n2f(b) / 2, 0.14, 'triangle', 0.05);
    if (i % 4 === 2) noise(0.03, 6000, 0.015, 0, 'highpass');
    musicStep++;
  }, 140);
};

})(window.GD);

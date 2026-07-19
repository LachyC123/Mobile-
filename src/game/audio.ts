// RUSHLINE audio — everything is synthesized with Web Audio. No audio files.
// Music: tiny step-sequenced chiptune. SFX: layered osc/noise bursts.
// Crowd: looped filtered noise with swell control.

export interface AudioSettings {
  master: number; // 0..1
  music: number;
  sfx: number;
  muted: boolean;
}

type MusicMode = 'menu' | 'match' | 'tension' | 'off';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private crowdBus!: GainNode;
  private crowdGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private settings: AudioSettings = { master: 0.8, music: 0.7, sfx: 0.9, muted: false };
  private mode: MusicMode = 'off';
  private seqTimer: number | null = null;
  private step = 0;
  private started = false;

  /** Must be called from a real user gesture. */
  unlock() {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.crowdBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.crowdBus.connect(this.master);

    // 2s noise buffer, reused by everything
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish
      data[i] = last * 3.2;
    }

    this.startCrowd();
    this.applySettings(this.settings);
    this.started = true;
    if (this.mode !== 'off') this.startSequencer();
  }

  applySettings(s: AudioSettings) {
    this.settings = s;
    if (!this.started) return;
    const m = s.muted ? 0 : s.master;
    this.master.gain.value = m;
    this.musicBus.gain.value = s.music * 0.5;
    this.sfxBus.gain.value = s.sfx;
    this.crowdBus.gain.value = s.sfx * 0.35;
  }

  get ready() {
    return this.started;
  }

  /** Pause all sound (crowd bed included) when the tab is hidden. */
  suspend() {
    if (this.started && this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume() {
    if (this.started && this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  // ── crowd bed ────────────────────────────────────────────────
  private startCrowd() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.6;
    this.crowdGain = ctx.createGain();
    this.crowdGain.gain.value = 0.05;
    src.connect(filter).connect(this.crowdGain).connect(this.crowdBus);
    src.start();
    // slow LFO for restless crowd
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(this.crowdGain.gain);
    lfo.start();
  }

  crowdSwell(amount = 0.5, decay = 1.8) {
    if (!this.started) return;
    const t = this.ctx!.currentTime;
    this.crowdGain.gain.cancelScheduledValues(t);
    this.crowdGain.gain.setValueAtTime(Math.min(0.9, 0.08 + amount), t);
    this.crowdGain.gain.exponentialRampToValueAtTime(0.05, t + decay);
  }

  setCrowdLevel(v: number) {
    if (!this.started) return;
    this.crowdGain.gain.setTargetAtTime(v, this.ctx!.currentTime, 0.5);
  }

  // ── tiny synth helpers ───────────────────────────────────────
  private tone(opts: {
    freq: number; freqEnd?: number; type?: OscillatorType; dur: number;
    vol?: number; when?: number; bus?: GainNode; attack?: number;
  }) {
    if (!this.started) return;
    const ctx = this.ctx!;
    const t = (opts.when ?? 0) + ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t + opts.dur);
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.2;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    osc.connect(g).connect(opts.bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + opts.dur + 0.05);
  }

  private noise(opts: { dur: number; vol?: number; freq?: number; q?: number; when?: number; type?: BiquadFilterType }) {
    if (!this.started) return;
    const ctx = this.ctx!;
    const t = (opts.when ?? 0) + ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.value = opts.freq ?? 2000;
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.2;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + opts.dur + 0.05);
  }

  // ── named SFX (one recognisable signature per action) ────────
  sfx(name: string) {
    if (!this.started) return;
    switch (name) {
      case 'ui':
        this.tone({ freq: 880, dur: 0.06, vol: 0.12, type: 'square' });
        break;
      case 'select':
        this.tone({ freq: 660, dur: 0.07, vol: 0.14 });
        this.tone({ freq: 990, dur: 0.08, vol: 0.1, when: 0.05 });
        break;
      case 'move':
        this.noise({ dur: 0.09, vol: 0.1, freq: 1200, q: 2 });
        this.tone({ freq: 220, freqEnd: 330, dur: 0.09, vol: 0.08, type: 'triangle' });
        break;
      case 'pickup':
        this.tone({ freq: 523, dur: 0.07, vol: 0.14 });
        this.tone({ freq: 784, dur: 0.1, vol: 0.14, when: 0.06 });
        break;
      case 'pass':
        this.noise({ dur: 0.22, vol: 0.16, freq: 2600, q: 0.8, type: 'highpass' });
        this.tone({ freq: 440, freqEnd: 880, dur: 0.18, vol: 0.1, type: 'sine' });
        break;
      case 'catch':
        this.tone({ freq: 740, dur: 0.06, vol: 0.14 });
        this.tone({ freq: 1108, dur: 0.09, vol: 0.12, when: 0.05 });
        break;
      case 'intercept':
        this.tone({ freq: 392, dur: 0.12, vol: 0.2 });
        this.tone({ freq: 311, dur: 0.14, vol: 0.2, when: 0.09 });
        this.tone({ freq: 233, dur: 0.22, vol: 0.22, when: 0.18 });
        this.noise({ dur: 0.2, vol: 0.18, freq: 900, q: 1.5 });
        break;
      case 'shove':
        this.noise({ dur: 0.16, vol: 0.3, freq: 300, q: 1, type: 'lowpass' });
        this.tone({ freq: 140, freqEnd: 60, dur: 0.18, vol: 0.3, type: 'sine' });
        break;
      case 'ballLoose':
        this.tone({ freq: 500, freqEnd: 300, dur: 0.12, vol: 0.12, type: 'triangle' });
        break;
      case 'whistle':
        this.tone({ freq: 2350, dur: 0.35, vol: 0.16, type: 'square' });
        this.tone({ freq: 2450, dur: 0.3, vol: 0.1, type: 'square', when: 0.02 });
        break;
      case 'goal':
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.22, vol: 0.18, when: i * 0.09 }));
        this.noise({ dur: 0.5, vol: 0.12, freq: 3000, q: 0.5, type: 'highpass', when: 0.3 });
        break;
      case 'goalAgainst':
        [392, 370, 311, 262].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.25, vol: 0.16, when: i * 0.11, type: 'triangle' }));
        break;
      case 'flow':
        [880, 1174, 1760].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.12, vol: 0.12, when: i * 0.05, type: 'sine' }));
        break;
      case 'surge':
        [523, 784, 1046, 1568, 2093].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.14, vol: 0.13, when: i * 0.04 }));
        break;
      case 'win':
        [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.24, vol: 0.16, when: i * 0.11 }));
        break;
      case 'lose':
        [440, 415, 392, 330, 262].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.3, vol: 0.14, when: i * 0.14, type: 'triangle' }));
        break;
      case 'promote':
        [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.3, vol: 0.15, when: i * 0.1 }));
        break;
      case 'countdown':
        this.tone({ freq: 440, dur: 0.12, vol: 0.15 });
        break;
      case 'countdownGo':
        this.tone({ freq: 880, dur: 0.3, vol: 0.2 });
        break;
      case 'error':
        this.tone({ freq: 196, dur: 0.12, vol: 0.15, type: 'sawtooth' });
        break;
      case 'ap':
        this.tone({ freq: 1100, dur: 0.04, vol: 0.07 });
        break;
    }
  }

  // ── music: 16-step chiptune sequencer ────────────────────────
  setMusic(mode: MusicMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (!this.started) return;
    if (mode === 'off') {
      this.stopSequencer();
    } else {
      this.startSequencer();
    }
  }

  private stopSequencer() {
    if (this.seqTimer !== null) {
      window.clearInterval(this.seqTimer);
      this.seqTimer = null;
    }
  }

  private startSequencer() {
    this.stopSequencer();
    this.step = 0;
    // lookahead scheduler, 8th notes at 112bpm
    this.seqTimer = window.setInterval(() => this.tick(), 268);
  }

  private tick() {
    if (!this.started || this.mode === 'off') return;
    const s = this.step % 16;
    const bar = Math.floor(this.step / 16) % 4;
    this.step++;

    const menuLead = [0, -1, 7, -1, 5, -1, 3, -1, 0, -1, 7, -1, 10, -1, 7, -1];
    const matchLead = [0, -1, -1, 3, -1, -1, 5, -1, -1, 7, -1, -1, 3, -1, 0, -1];
    const roots = [0, 0, -4, 5]; // C C F G-ish movement (semitones from C3)
    const root = 130.81 * Math.pow(2, roots[bar] / 12);
    const scale = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
    const leadSeq = this.mode === 'menu' ? menuLead : matchLead;

    // bass on beats
    if (s % 4 === 0) {
      this.tone({ freq: root / 2, dur: 0.22, vol: 0.16, type: 'triangle', bus: this.musicBus });
    }
    if (s % 8 === 4) {
      this.tone({ freq: (root / 2) * Math.pow(2, 7 / 12), dur: 0.18, vol: 0.12, type: 'triangle', bus: this.musicBus });
    }
    // lead
    const deg = leadSeq[s];
    if (deg >= 0) {
      const f = root * 2 * Math.pow(2, scale[deg % scale.length] / 12);
      this.tone({ freq: f, dur: 0.16, vol: this.mode === 'menu' ? 0.09 : 0.06, type: 'square', bus: this.musicBus });
    }
    // hats
    if (s % 2 === 1) {
      this.noise({ dur: 0.03, vol: this.mode === 'tension' ? 0.05 : 0.028, freq: 8000, q: 1, type: 'highpass' });
    }
  }
}

export const audio = new AudioEngine();

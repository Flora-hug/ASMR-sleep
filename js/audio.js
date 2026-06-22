// audio.js - Web Audio API ASMR Sound Engine
class ASMRAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.nodes = {};
    this.active = {};
    this.mixer = { ambient: 0.4, atmosphere: 0.3, interaction: 0.6 };
    this.preset = 'rain';
    this.scene = 'paper';
    this.init();
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.ctx.destination);
    } catch(e) { console.warn('Audio not available', e); }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // === NOISE GENERATORS ===
  _createNoiseBuffer(type='white', len=0) {
    const length = len || this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      if (type === 'white') data[i] = Math.random() * 2 - 1;
      else if (type === 'pink') {
        // Pink noise approximation via white noise (simplified)
        data[i] = (Math.random() * 2 - 1) * 0.5 + (Math.random() * 2 - 1) * 0.3 + (Math.random() * 2 - 1) * 0.2;
      }
      else data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _noiseSource(type='white') {
    const buf = this._createNoiseBuffer(type);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  _filter(type, freq, Q) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q || 1;
    return f;
  }

  _gain(val) {
    const g = this.ctx.createGain();
    g.gain.value = val;
    return g;
  }

  _lfo(freq, gain) {
    const o = this.ctx.createOscillator();
    o.frequency.value = freq;
    o.type = 'sine';
    const g = this.ctx.createGain();
    g.gain.value = gain || 0.5;
    o.connect(g);
    o.start();
    return { osc: o, gain: g };
  }

  // === AMBIENT PRESETS ===
  startAmbient(preset) {
    this.stopAmbient();
    this.preset = preset || this.preset;
    if (!this.ctx) return;
    this.resume();

    const configs = {
      rain: [
        { noise: 'pink', filter: ['lowpass',800], gain: 0.35, label:'rain_base' },
        { noise: 'white', filter: ['highpass',3000], gain: 0.08, label:'rain_high' }
      ],
      forest: [
        { noise: 'pink', filter: ['bandpass',400,2], gain: 0.3, lfo: [0.3,200], label:'forest_wind' },
        { noise: 'white', filter: ['highpass',2000], gain: 0.04, label:'forest_leaves' }
      ],
      campfire: [
        { noise: 'pink', filter: ['lowpass',400], gain: 0.4, lfo: [3,150], label:'fire_crackle' },
        { noise: 'white', filter: ['bandpass',600,3], gain: 0.06, lfo: [7,300], label:'fire_pop' }
      ],
      ocean: [
        { noise: 'pink', filter: ['lowpass',200], gain: 0.4, lfo: [0.08,100], label:'ocean_rumble' },
        { noise: 'white', filter: ['bandpass',800,1.5], gain: 0.05, lfo: [0.15,600], label:'ocean_wash' }
      ]
    };

    const cfg = configs[this.preset] || configs.rain;
    cfg.forEach(c => {
      const src = this._noiseSource(c.noise);
      const flt = this._filter(c.filter[0], c.filter[1], c.filter[2]||1);
      const gain = this._gain(c.gain * this.mixer.ambient * 1.5);
      src.connect(flt);
      flt.connect(gain);
      // LFO modulation
      if (c.lfo) {
        const lfo = this._lfo(c.lfo[0], c.lfo[1]);
        lfo.gain.connect(flt.frequency);
        this.active['lfo_'+c.label] = lfo;
      }
      gain.connect(this.masterGain);
      this.active['ambient_'+c.label] = { src, gain, flt };
    });
  }

  stopAmbient() {
    Object.keys(this.active).forEach(k => {
      if (k.startsWith('ambient_')) {
        try { this.active[k].src.stop(); } catch(e){}
        try { this.active[k].src.disconnect(); } catch(e){}
        try { this.active[k].gain.disconnect(); } catch(e){}
        try { this.active[k].flt.disconnect(); } catch(e){}
        delete this.active[k];
      }
      if (k.startsWith('lfo_')) {
        try { this.active[k].osc.stop(); } catch(e){}
        try { this.active[k].osc.disconnect(); } catch(e){}
        delete this.active[k];
      }
    });
  }

  updateAmbientVolume(val) {
    this.mixer.ambient = val / 100;
    Object.keys(this.active).forEach(k => {
      if (k.startsWith('ambient_')) {
        this.active[k].gain.gain.setTargetAtTime(
          parseFloat(this.active[k].gain.gain.value.toString().match(/[\d.]+/)?.[0]||0.3) * (val/50) || val/100,
          this.ctx.currentTime, 0.1
        );
      }
    });
  }

  // === INTERACTION SOUNDS ===
  playPaperCrinkle(intensity) {
    if (!this.ctx || this.mixer.interaction < 0.01) return;
    this.resume();
    const vol = this.mixer.interaction * intensity;
    const duration = 0.05 + intensity * 0.15;

    // Short noise burst
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i/d.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this._filter('highpass', 2000 + intensity * 3000, 2);
    const bp = this._filter('bandpass', 4000, 4);
    const g = this._gain(vol * 0.5);
    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start();
    src.stop(this.ctx.currentTime + duration);
  }

  playSandSwish(speed) {
    if (!this.ctx || this.mixer.interaction < 0.01) return;
    this.resume();
    const vol = this.mixer.interaction * Math.min(1, speed * 3);
    const duration = 0.08;

    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/d.length, 2);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this._filter('bandpass', 3000 + speed * 4000, 2);
    const g = this._gain(vol * 0.4);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start();
    src.stop(this.ctx.currentTime + duration);
  }

  playClayPress(depth) {
    if (!this.ctx || this.mixer.interaction < 0.01) return;
    this.resume();
    const vol = this.mixer.interaction * Math.min(1, depth * 2);
    const duration = 0.1 + depth * 0.2;

    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/d.length, 1.5) * 0.6;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this._filter('lowpass', 200 + (1-depth) * 300, 2);
    const g = this._gain(vol * 0.6);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    src.start();
    src.stop(this.ctx.currentTime + duration);
  }

  // === ATMOSPHERE ===
  _atmoNodes = null;
  startAtmosphere() {
    this.stopAtmosphere();
    if (!this.ctx) return;
    this.resume();

    const src = this._noiseSource('pink');
    const lp = this._filter('lowpass', 180, 3);
    const lfo = this._lfo(0.15, 60);
    const g = this._gain(this.mixer.atmosphere * 0.25);
    lfo.gain.connect(lp.frequency);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    this._atmoNodes = { src, lp, g, lfo };
  }

  stopAtmosphere() {
    if (!this._atmoNodes) return;
    try { this._atmoNodes.src.stop(); } catch(e){}
    try { this._atmoNodes.lfo.osc.stop(); } catch(e){}
    this._atmoNodes = null;
  }

  updateAtmosphereVolume(val) {
    this.mixer.atmosphere = val / 100;
    if (this._atmoNodes) {
      this._atmoNodes.g.gain.setTargetAtTime(val/100 * 0.25, this.ctx.currentTime, 0.1);
    }
  }

  updateInteractionVolume(val) {
    this.mixer.interaction = val / 100;
  }

  setMixer(ambient, atmosphere, interaction) {
    this.updateAmbientVolume(ambient);
    this.updateAtmosphereVolume(atmosphere);
    this.updateInteractionVolume(interaction);
  }

  // === BREATH GUIDE SOUND ===
  _breathNodes = null;
  startBreath() {
    if (!this.ctx) return;
    this.stopBreath();
    this.resume();

    const src = this._noiseSource('pink');
    const bp = this._filter('bandpass', 220, 5);
    const g = this._gain(0);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    this._breathNodes = { src, bp, g };

    // Breath cycle: 4s inhale, 4s exhale
    const cycle = () => {
      if (!this._breathNodes) return;
      const now = this.ctx.currentTime;
      // Inhale - ramp up
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.06, now + 4);
      bp.frequency.setValueAtTime(180, now);
      bp.frequency.linearRampToValueAtTime(280, now + 4);
      // Exhale - ramp down
      g.gain.linearRampToValueAtTime(0.02, now + 6);
      g.gain.linearRampToValueAtTime(0, now + 8);
      bp.frequency.linearRampToValueAtTime(160, now + 8);
      this._breathTimer = setTimeout(cycle, 8000);
    };
    cycle();
  }

  stopBreath() {
    if (this._breathTimer) clearTimeout(this._breathTimer);
    if (this._breathNodes) {
      try { this._breathNodes.src.stop(); } catch(e){}
      this._breathNodes = null;
    }
  }

  // === CLEANUP ===
  stopAll() {
    this.stopAmbient();
    this.stopAtmosphere();
    this.stopBreath();
  }

  get isReady() { return !!this.ctx; }
}

const audio = new ASMRAudio();

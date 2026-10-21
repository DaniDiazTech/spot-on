/**
 * Sound effects with the Web Audio API, using Kenney's CC0 sound packs
 * (Impact Sounds, Interface Sounds, Digital Audio, Music Jingles).
 *
 *  - impacts pick a sample by material and loudness by impact speed
 *  - every play gets a small random pitch change, so repeats never sound
 *    identical
 *  - impacts are rate-limited so a collapsing tower does not turn to noise
 *
 * Browsers only allow audio after a user gesture: `unlock()` is called from
 * the first click / key press.
 */
const FILES = {
  launch: 'pluck_001',
  click: 'click_002',
  select: 'select_001',
  tick: 'tick_002',
  stick: 'drop_002',
  capture: 'confirmation_002',
  captureSpark: 'powerUp7',
  bumper: 'impactPlate_light_000',
  bumperZap: 'phaserUp3',
  boom: 'impactPunch_heavy_000',
  won: 'win',
  failed: 'lose',
  woodLight: 'impactWood_light_000',
  woodMedium: 'impactWood_medium_000',
  woodHeavy: 'impactWood_heavy_000',
  woodBreak: 'impactWood_heavy_001',
  glassLight: 'impactGlass_light_000',
  glassBreak: 'impactGlass_heavy_000',
  glassBreak2: 'impactGlass_heavy_002',
  metalLight: 'impactMetal_light_000',
  metalHeavy: 'impactMetal_heavy_000',
  stone: 'impactMining_000',
  stoneLight: 'impactGeneric_light_000',
  softMedium: 'impactSoft_medium_000',
  softHeavy: 'impactSoft_heavy_000',
  bell: 'impactBell_heavy_000',
};

export class Audio {
  constructor(muted = false) {
    this.muted = muted;
    this.context = null;
    this.buffers = {};
    this.lastPlayed = {};
  }

  /** Creates the audio context and starts decoding the samples. */
  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.context.destination);
    for (const [name, file] of Object.entries(FILES)) this.loadSample(name, file);
  }

  async loadSample(name, file) {
    try {
      const response = await fetch(`assets/audio/${file}.ogg`);
      const data = await response.arrayBuffer();
      this.buffers[name] = await this.context.decodeAudioData(data);
    } catch {
      // Unsupported format or offline: that sound is simply skipped.
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.context.currentTime, 0.02);
  }

  /**
   * Plays a sample.
   * @param {string} name
   * @param {{volume?: number, pitch?: number, spread?: number, cooldown?: number}} options
   */
  play(name, { volume = 0.6, pitch = 1, spread = 0.08, cooldown = 0 } = {}) {
    const buffer = this.buffers[name];
    if (!this.context || !buffer) return;
    const now = this.context.currentTime;
    if (cooldown && now - (this.lastPlayed[name] ?? -1) < cooldown) return;
    this.lastPlayed[name] = now;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitch * (1 + (Math.random() * 2 - 1) * spread);
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    source.start();
  }

  /** Impact sound for a material, louder for faster hits. */
  impact(material, speed) {
    const volume = Math.min(1, 0.15 + speed / 14);
    const heavy = speed > 7;
    const sample = {
      wood: heavy ? 'woodHeavy' : speed > 4 ? 'woodMedium' : 'woodLight',
      tnt: 'woodMedium',
      glass: 'glassLight',
      metal: heavy ? 'metalHeavy' : 'metalLight',
      stone: heavy ? 'stone' : 'stoneLight',
      ball: heavy ? 'softHeavy' : 'softMedium',
      ground: heavy ? 'softHeavy' : 'softMedium',
    }[material] ?? 'softMedium';
    this.play(sample, { volume, cooldown: 0.05 });
  }

  breakSound(material) {
    if (material === 'glass') this.play(Math.random() < 0.5 ? 'glassBreak' : 'glassBreak2', { volume: 0.7 });
    else if (material === 'stone') this.play('stone', { volume: 0.8, pitch: 0.8 });
    else this.play('woodBreak', { volume: 0.7 });
  }

  /** Sample punch plus a synthesized low rumble. */
  explosion() {
    this.play('boom', { volume: 1, pitch: 0.7 });
    if (!this.context) return;
    const ctx = this.context;
    const duration = 0.9;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
  }
}

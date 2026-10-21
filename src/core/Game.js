/**
 * Top-level controller: owns the current LevelSession and connects it to
 * rendering (p5), sound, input and the DOM interface.
 *
 * App states: menu -> levels -> playing <-> paused -> result
 */
import { LevelSession, SessionState } from './LevelSession.js';
import { Camera } from '../systems/Camera.js';
import { Input } from '../systems/Input.js';
import { Audio } from '../systems/Audio.js';
import { Storage } from '../systems/Storage.js';
import { BackgroundRenderer } from '../render/BackgroundRenderer.js';
import { GroundRenderer } from '../render/GroundRenderer.js';
import { BlockRenderer } from '../render/BlockRenderer.js';
import { MechanismRenderer } from '../render/MechanismRenderer.js';
import { SpotRenderer } from '../render/SpotRenderer.js';
import { BallRenderer } from '../render/BallRenderer.js';
import { SlingshotRenderer } from '../render/SlingshotRenderer.js';
import { Particles } from '../render/Particles.js';
import { PhysicsDebugRenderer } from '../render/PhysicsDebugRenderer.js';
import { Hud } from '../ui/Hud.js';
import { Screens } from '../ui/Screens.js';
import { LEVELS, levelById } from '../data/levels.js';
import { THEMES, EFFECTS } from '../render/palette.js';
import { RULES, SPOT, WORLD } from '../config.js';

export const AppState = Object.freeze({
  MENU: 'menu',
  LEVELS: 'levels',
  PLAYING: 'playing',
  PAUSED: 'paused',
  RESULT: 'result',
});

const DEBRIS = { glass: 'glass', wood: 'wood', tnt: 'wood', stone: 'stone' };
const CONFETTI = ['#ff5a5f', '#ffd23f', '#3ad3ff', '#7dffb0', '#ff7ab6', '#ffffff'];

export class Game {
  /** @param {p5} p  @param {Assets} assets */
  constructor(p, assets) {
    this.p = p;
    this.assets = assets;
    this.state = AppState.MENU;
    this.time = 0;
    this.alpha = 0;
    this.showPhysics = false;
    this.slowMotion = 0;
    this.pendingResult = null;

    this.storage = new Storage();
    this.audio = new Audio(this.storage.muted);
    this.camera = new Camera();
    this.camera.fit(p.width, p.height);
    this.particles = new Particles(p, assets);
    this.hud = new Hud();

    this.background = new BackgroundRenderer(p, assets);
    this.groundRenderer = new GroundRenderer(p, assets);
    this.blockRenderer = new BlockRenderer(p, assets);
    this.mechanismRenderer = new MechanismRenderer(p, assets);
    this.spotRenderer = new SpotRenderer(p, assets);
    this.ballRenderer = new BallRenderer(p, assets);
    this.slingshotRenderer = new SlingshotRenderer(p, assets, this.ballRenderer);
    this.physicsRenderer = new PhysicsDebugRenderer(p);

    this.screens = new Screens({
      onPlay: () => this.showLevels(),
      onSelectLevel: (id) => this.startLevel(id),
      onBack: () => this.showMenu(),
      onResume: () => this.resume(),
      onRestart: () => this.startLevel(this.session.level.id),
      onLevels: () => this.showLevels(),
      onNext: () => this.nextLevel(),
      onPause: () => this.pause(),
      onMute: () => this.toggleMute(),
    });
    this.screens.setMuted(this.audio.muted);

    this.input = new Input(p.canvas, {
      onPress: (point) => this.press(point),
      onDrag: (point) => this.drag(point),
      onRelease: () => this.release(),
      onCancel: () => this.cancelAim(),
      onAction: (action) => this.handleAction(action),
    });
    document.addEventListener('visibilitychange', () => document.hidden && this.pause());

    this.loadLevel(LEVELS[0]);
    this.showMenu();
  }

  // ---------------------------------------------------------------------------
  // Flow
  // ---------------------------------------------------------------------------

  loadLevel(level) {
    this.session?.destroy();
    this.session = new LevelSession(level);
    this.bindSessionEvents(this.session);
    const theme = THEMES[level.theme];
    this.camera.reset();
    this.camera.fit(this.p.width, this.p.height);
    this.background.setLevel(level, theme, this.camera);
    this.groundRenderer.setLevel(this.session.ground, theme);
    this.particles.clear();
    this.hud.clearToasts();
    this.hud.setLevel(level);
    this.aim = null;
    this.preview = null;
    this.slowMotion = 0;
    this.pendingResult = null;
    this.tickMarks = this.session.spots.map(() => SPOT.holdSeconds);
  }

  startLevel(id) {
    if (!this.storage.isUnlocked(id)) return;
    this.audio.unlock();
    this.audio.play('select', { volume: 0.5 });
    this.loadLevel(levelById(id));
    this.state = AppState.PLAYING;
    this.screens.show(null);
    this.hud.show(true);
    this.hud.toast(`Level ${id}: ${this.session.level.name}`, this.session.level.tagline, 'info');
  }

  nextLevel() {
    const next = levelById(this.session.level.id + 1);
    if (next) this.startLevel(next.id);
    else this.showLevels();
  }

  showMenu() {
    this.state = AppState.MENU;
    this.hud.show(false);
    this.screens.show('menu');
  }

  showLevels() {
    this.audio.unlock();
    this.audio.play('click', { volume: 0.5 });
    this.state = AppState.LEVELS;
    this.hud.show(false);
    this.screens.renderLevels(this.storage);
    this.screens.show('levels');
  }

  pause() {
    if (this.state !== AppState.PLAYING) return;
    this.cancelAim();
    this.state = AppState.PAUSED;
    this.screens.show('pause');
  }

  resume() {
    if (this.state !== AppState.PAUSED) return;
    this.state = AppState.PLAYING;
    this.screens.show(null);
  }

  toggleMute() {
    this.audio.unlock();
    const muted = !this.audio.muted;
    this.audio.setMuted(muted);
    this.storage.muted = muted;
    this.screens.setMuted(muted);
  }

  showResult(result) {
    const { level } = this.session;
    const newBest = result.outcome === 'won' && this.storage.recordStars(level.id, result.stars);
    this.state = AppState.RESULT;
    this.screens.setResult(result, { level, hasNext: Boolean(levelById(level.id + 1)), newBest });
    this.screens.show('result');
    this.audio.play(result.outcome === 'won' ? 'won' : 'failed', { volume: 0.7, spread: 0 });
  }

  handleAction(action) {
    this.audio.unlock();
    switch (action) {
      case 'action':
        if (this.state === AppState.PLAYING) this.session.detonate();
        else if (this.state === AppState.MENU) this.showLevels();
        break;
      case 'confirm':
        if (this.state === AppState.MENU) this.showLevels();
        else if (this.state === AppState.PAUSED) this.resume();
        else if (this.state === AppState.RESULT) {
          if (this.session.result?.outcome === 'won') this.nextLevel();
          else this.startLevel(this.session.level.id);
        }
        break;
      case 'restart':
        if ([AppState.PLAYING, AppState.PAUSED, AppState.RESULT].includes(this.state)) this.startLevel(this.session.level.id);
        break;
      case 'pause':
        if (this.state === AppState.PLAYING) this.pause();
        else if (this.state === AppState.PAUSED) this.resume();
        break;
      case 'mute':
        this.toggleMute();
        break;
      case 'physics':
        this.showPhysics = !this.showPhysics;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Aiming
  // ---------------------------------------------------------------------------

  press(screenPoint) {
    this.audio.unlock();
    if (this.state !== AppState.PLAYING || this.session.state !== SessionState.PLAYING) return;
    if (this.session.detonate()) return;
    if (!this.session.loaded) return;
    this.aim = { start: this.camera.screenToWorld(screenPoint) };
    this.session.slingshot.aiming = true;
  }

  drag(screenPoint) {
    if (!this.aim) return;
    const point = this.camera.screenToWorld(screenPoint);
    const before = this.session.slingshot.power;
    this.session.slingshot.setPull(point.x - this.aim.start.x, point.y - this.aim.start.y);
    // A soft creak while stretching the band.
    if (Math.floor(this.session.slingshot.power * 6) > Math.floor(before * 6)) {
      this.audio.play('tick', { volume: 0.15, pitch: 0.6 + this.session.slingshot.power * 0.8, cooldown: 0.04 });
    }
  }

  release() {
    if (!this.aim) return;
    this.aim = null;
    this.preview = null;
    this.session.launch();
  }

  cancelAim() {
    this.aim = null;
    this.preview = null;
    this.session?.slingshot.release();
  }

  // ---------------------------------------------------------------------------
  // Feedback for what happens in the simulation
  // ---------------------------------------------------------------------------

  bindSessionEvents(session) {
    const { events } = session;
    const puff = (x, y, size, alpha = 0.6) =>
      this.particles.emit({ x, y, shape: 'image', image: `fx/puff${['00', '04', '08', '12'][Math.floor(Math.random() * 4)]}`, size, grow: 2, spin: (Math.random() - 0.5) * 2, life: 0.6, gravity: -30, alpha });

    events.on('launch', ({ ball }) => {
      this.audio.play('launch', { volume: 0.7 });
      const { x, y } = ball.body.position;
      for (let i = 0; i < 4; i++) puff(x, y, 26, 0.4);
    });

    events.on('load', () => this.audio.play('click', { volume: 0.25, pitch: 1.3 }));

    events.on('impact', ({ x, y, speed, material }) => {
      this.audio.impact(material, speed);
      if (speed > 5) puff(x, y, 16 + speed * 2.5, Math.min(0.7, speed / 14));
      if (speed > 10) this.camera.shake(Math.min(8, speed * 0.35), 0.18);
    });

    events.on('crack', ({ block }) => {
      const { x, y } = block.body.position;
      this.debris(block.material, x, y, 3, 0.5);
    });

    events.on('break', ({ block, x, y }) => {
      this.audio.breakSound(block.material);
      this.debris(block.material, x, y, 8, 1);
      puff(x, y, 40, 0.5);
    });

    events.on('explosion', ({ x, y }) => {
      this.audio.explosion();
      this.camera.shake(16, 0.5);
      const frames = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `fx/explosion${i}`);
      this.particles.emit({ x, y: y - 10, shape: 'image', frames, size: 260, grow: 1.4, life: 0.6, gravity: 0, drag: 0 });
      this.particles.emit({ x, y, shape: 'ring', color: '#fff3c4', size: 40, grow: 12, life: 0.45, gravity: 0, drag: 0 });
      for (let i = 0; i < 6; i++) {
        this.particles.emit({
          x: x + (Math.random() - 0.5) * 70, y: y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 120, vy: -50 - Math.random() * 80,
          shape: 'image', image: `fx/smoke${['00', '04', '08', '12'][i % 4]}`, size: 90 + Math.random() * 50,
          grow: 2.2, spin: (Math.random() - 0.5) * 1.5, life: 1.4 + Math.random() * 0.6, gravity: -40, drag: 1, alpha: 0.75,
        });
      }
      this.particles.burst(x, y, 20, { speed: 600, color: EFFECTS.spark, size: 7, gravity: 700, life: 0.8, shape: 'star' });
    });

    events.on('stick', ({ ball }) => {
      this.audio.play('stick', { volume: 0.6 });
      const { x, y } = ball.body.position;
      this.particles.burst(x, y, 10, { speed: 160, color: '#ff7ab6', size: 8, gravity: 500, life: 0.5 });
    });

    events.on('bumper', ({ bumper }) => {
      this.audio.play('bumper', { volume: 0.7 });
      this.audio.play('bumperZap', { volume: 0.25, cooldown: 0.1 });
      const { x, y } = bumper.body.position;
      this.particles.emit({ x, y, shape: 'ring', color: '#ffd23f', size: bumper.radius * 2, grow: 2.4, life: 0.35, gravity: 0, drag: 0 });
    });

    events.on('progress', () => this.audio.play('tick', { volume: 0.4 }));

    events.on('capture', ({ spot, remaining }) => {
      const { x, y } = spot.position;
      this.audio.play('capture', { volume: 0.8, spread: 0 });
      this.audio.play('captureSpark', { volume: 0.35, spread: 0 });
      this.particles.emit({ x, y, shape: 'ring', color: EFFECTS.gold, size: spot.radius * 2, grow: 3.2, life: 0.6, gravity: 0, drag: 0 });
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        this.particles.emit({
          x, y, vx: Math.cos(angle) * 320, vy: Math.sin(angle) * 320 - 120,
          shape: 'image', image: 'icons/starGold', size: 22, grow: 0.6, spin: 4, life: 0.9, gravity: 500, drag: 1.2,
        });
      }
      if (remaining > 0) this.hud.toast('Spot captured!', `${remaining} to go`);
      else {
        this.slowMotion = RULES.slowMotionSeconds;
        this.camera.punchIn(spot.position, 1.1);
      }
    });

    events.on('won', (result) => {
      this.pendingResult = { result, delay: RULES.slowMotionSeconds + 0.3 };
      this.celebrate();
    });

    events.on('failed', (result) => {
      this.pendingResult = { result, delay: 0.6 };
    });
  }

  debris(material, x, y, count, strength) {
    const kind = DEBRIS[material];
    if (!kind) {
      this.particles.burst(x, y, count, { speed: 250 * strength, color: '#c9ced6', size: 6, gravity: 700, life: 0.6, shape: 'star' });
      return;
    }
    for (let i = 0; i < count; i++) {
      this.particles.emit({
        x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 520 * strength, vy: -120 - Math.random() * 380 * strength,
        shape: 'image', image: `debris/${kind}${1 + (i % 3)}`, size: 12 + Math.random() * 18, grow: 1,
        spin: (Math.random() - 0.5) * 12, life: 0.9 + Math.random() * 0.6, gravity: 1100, drag: 0.3,
      });
    }
  }

  /** Confetti rain over the whole level. */
  celebrate() {
    for (let i = 0; i < 90; i++) {
      this.particles.emit({
        x: Math.random() * WORLD.width, y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 120, vy: 80 + Math.random() * 160,
        shape: 'confetti', color: CONFETTI[i % CONFETTI.length], size: 10 + Math.random() * 8,
        spin: (Math.random() - 0.5) * 10, life: 3 + Math.random() * 1.5, gravity: 120, drag: 0.6,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------

  frame(deltaMs) {
    const dt = Math.min(deltaMs, 100) / 1000;
    this.time += dt;
    const { session } = this;

    if (this.state === AppState.PLAYING || this.state === AppState.RESULT) {
      const scale = this.slowMotion > 0 ? RULES.slowMotionScale : 1;
      this.slowMotion = Math.max(0, this.slowMotion - dt);
      if (this.slowMotion === 0) this.camera.zoomTarget = 1;
      this.alpha = session.advance(deltaMs * scale);
      this.particles.update(dt * (scale < 1 ? 0.5 : 1));
      this.countdownTicks();
    }
    if (this.pendingResult) {
      this.pendingResult.delay -= dt;
      if (this.pendingResult.delay <= 0 && this.state === AppState.PLAYING) {
        this.showResult(this.pendingResult.result);
        this.pendingResult = null;
      }
    }

    this.camera.update(dt);
    if (this.aim && session.slingshot.canLaunch) this.preview = session.slingshot.predict();
    else this.preview = null;

    this.render();
    if (this.state === AppState.PLAYING || this.state === AppState.PAUSED) this.hud.update(session);
  }

  /** A tick each time a charging spot passes a whole second. */
  countdownTicks() {
    this.session.spots.forEach((spot, i) => {
      const left = Math.ceil((1 - spot.progress) * SPOT.holdSeconds);
      if (!spot.captured && spot.progress > 0 && left < this.tickMarks[i]) {
        this.audio.play('tick', { volume: 0.45, pitch: 1 + (SPOT.holdSeconds - left) * 0.15, spread: 0 });
      }
      this.tickMarks[i] = spot.progress > 0 ? left : SPOT.holdSeconds;
    });
  }

  render() {
    const { p, session, camera, time } = this;
    this.background.draw(time);

    p.push();
    camera.apply(p);
    this.groundRenderer.drawDecor(session.level.decor);
    this.groundRenderer.draw(time);
    this.spotRenderer.drawGlows(session.spots, time);
    this.spotRenderer.drawBase(session.spots, time);
    this.slingshotRenderer.drawBack(session.slingshot);
    this.mechanismRenderer.draw(session.mechanisms, time);
    this.blockRenderer.draw(session.blocks);
    this.ballRenderer.draw(session.launched, time);
    this.slingshotRenderer.drawFront(session.slingshot, session.loaded, time, this.preview);
    this.spotRenderer.drawOverlay(session.spots, time, session.time);
    this.particles.draw();
    if (this.showPhysics) this.physicsRenderer.draw(session.physics.world, { left: -1000, right: 3000 });
    p.pop();
  }

  resize() {
    this.camera.fit(this.p.width, this.p.height);
    this.background.resize();
  }

  debugSnapshot() {
    return { appState: this.state, fps: Math.round(this.p.frameRate()), ...this.session.snapshot() };
  }
}

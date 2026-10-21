/**
 * One attempt at one level: physics world, level objects, balls and rules.
 *
 * Knows nothing about drawing, sound or the DOM. It reports what happened
 * through an EventBus:
 *
 *   'launch'   { ball }                    'load'     { ball }
 *   'impact'   { x, y, speed, material }   'crack'    { block }
 *   'break'    { block, x, y }             'explosion' { x, y }
 *   'stick'    { ball }                    'bumper'   { bumper }
 *   'capture'  { spot, ball, remaining }   'progress' { spot } (first touch)
 *   'won'      { stars, used }             'failed'   { }
 */
import { Matter } from '../lib/matter.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { EventBus } from './EventBus.js';
import { buildLevel } from '../world/LevelBuilder.js';
import { Ball } from '../entities/Ball.js';
import { Slingshot } from '../entities/Slingshot.js';
import { BALLS } from '../data/balls.js';
import { WORLD, SLING, BALL, DAMAGE, EXPLOSION, RULES } from '../config.js';

const { Body, Composite, Sleeping } = Matter;

/** Static bodies (the ground) hit like a body of this mass. */
const MAX_STRIKER_MASS = 40;

/** Physics steps simulated before play (0.75 s at 120 Hz). */
const SETTLE_STEPS = 90;

export const SessionState = Object.freeze({
  PLAYING: 'playing',
  WON: 'won',
  FAILED: 'failed',
});

export class LevelSession {
  /** @param {object} level  entry of data/levels.js */
  constructor(level) {
    this.level = level;
    this.events = new EventBus();
    this.physics = new PhysicsWorld();
    Object.assign(this, buildLevel(this.physics, level));

    this.slingshot = new Slingshot(level.sling);
    this.queue = level.ammo.map((id) => new Ball(BALLS[id]));
    /** Balls that have been launched (still in the world or gone). */
    this.launched = [];
    this.loaded = null;
    this.reloadTimer = 0;

    this.state = SessionState.PLAYING;
    this.time = 0;
    this.lastLaunchTime = 0;
    this.calmTime = 0;
    this.result = null;

    this.pendingBreaks = new Set();
    this.pendingExplosions = [];
    this.pendingWelds = [];

    this.registerCollisions();
    this.settle();
    this.loadNext();
  }

  /**
   * Lets every stack come to rest before play starts (with damage off), so
   * tiny placement errors never make a tower wobble or crack on its own.
   */
  settle() {
    this.settling = true;
    for (let i = 0; i < SETTLE_STEPS; i++) this.physics.advance(1000 / 120, (dt) => this.beforeStep(dt), () => {});
    this.settling = false;
    for (const block of this.blocks) block.health = block.maxHealth;
    for (const body of Composite.allBodies(this.physics.world)) {
      if (!body.isStatic && body.plugin.block) Sleeping.set(body, true);
    }
  }

  // ---------------------------------------------------------------------------
  // Shooting
  // ---------------------------------------------------------------------------

  get ballsInPlay() {
    return this.launched.filter((ball) => ball.isFlying);
  }

  get ballsLeft() {
    return this.queue.length + (this.loaded ? 1 : 0);
  }

  get ballsUsed() {
    return this.launched.length;
  }

  loadNext() {
    this.loaded = this.queue.shift() ?? null;
    if (this.loaded) {
      this.loaded.state = 'loaded';
      this.events.emit('load', { ball: this.loaded });
    }
  }

  /** Throws the loaded ball with the slingshot's current pull. */
  launch() {
    const { slingshot } = this;
    const ball = this.loaded;
    if (!ball || this.state !== SessionState.PLAYING || !slingshot.canLaunch) {
      slingshot.release();
      return false;
    }
    ball.launch(slingshot.ballPosition, slingshot.launchVelocity, this.time);
    this.physics.add(ball.body);
    this.launched.push(ball);
    this.loaded = null;
    this.reloadTimer = SLING.reloadSeconds;
    this.lastLaunchTime = this.time;
    slingshot.release();
    this.events.emit('launch', { ball });
    return true;
  }

  /** The most recent bomb ball still in the air, if any. */
  get armedBomb() {
    const last = this.launched[this.launched.length - 1];
    return last && last.isFlying && last.type.ability === 'bomb' && !last.capturedSpot ? last : null;
  }

  /** Detonates the flying bomb ball (tap again after launching it). */
  detonate() {
    const bomb = this.armedBomb;
    if (!bomb) return false;
    const at = { ...bomb.body.position };
    this.removeBall(bomb, 'exploded');
    this.explode(at);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Collisions
  // ---------------------------------------------------------------------------

  registerCollisions() {
    // collisionStart fires before Matter resolves the contact, so body
    // velocities are still the pre-impact ones: perfect for damage.
    this.physics.onCollision('start', (pair) => this.handleImpact(pair));
    this.physics.onCollision('start', (pair) => this.markTouching(pair));
    this.physics.onCollision('active', (pair) => this.markTouching(pair));
  }

  markTouching(pair) {
    for (const body of [pair.bodyA, pair.bodyB]) {
      const ball = body.parent.plugin.ball;
      if (ball) ball.touching = true;
    }
  }

  handleImpact(pair) {
    if (this.settling) return;
    const a = pair.bodyA.parent;
    const b = pair.bodyB.parent;
    const normal = pair.collision.normal;
    const relative = { x: a.velocity.x - b.velocity.x, y: a.velocity.y - b.velocity.y };
    const speed = Math.abs(relative.x * normal.x + relative.y * normal.y);

    // Effective mass of the impact: the geometric mean of the reduced mass
    // (what an elastic textbook collision exchanges) and the striker's own
    // mass (a heavy ball keeps pushing through). So a heavy ball really
    // smashes a light block, while a light ball barely dents a heavy one.
    const massA = a.isStatic ? Infinity : a.mass;
    const massB = b.isStatic ? Infinity : b.mass;
    const mu = !Number.isFinite(massA) ? massB : !Number.isFinite(massB) ? massA : (massA * massB) / (massA + massB);
    const strike = (striker) => Math.sqrt(mu * Math.min(striker, MAX_STRIKER_MASS));
    const energyOn = (striker) => (speed > DAMAGE.minSpeed ? 0.5 * strike(striker) * speed * speed : 0);

    for (const [self, other] of [[a, b], [b, a]]) {
      const ball = self.plugin.ball;
      if (ball) {
        ball.impact(speed, normal);
        if (ball.type.ability === 'stick' && !ball.stickUsed && !ball.stuckTo && ball.isFlying && !other.isSensor) {
          this.pendingWelds.push({ ball, other });
        }
      }
      const block = self.plugin.block;
      const energy = energyOn(self === a ? massB : massA);
      if (block && energy > 0) this.damageBlock(block, energy);
      const bumper = self.plugin.bumper;
      if (bumper) {
        bumper.flash = 1;
        this.events.emit('bumper', { bumper });
      }
    }

    if (speed > 2.5) {
      const point = pair.collision.supports?.[0] ?? a.position;
      const material = (a.plugin.block ?? b.plugin.block)?.material ?? (a.plugin.ball || b.plugin.ball ? 'ball' : 'ground');
      this.events.emit('impact', { x: point.x, y: point.y, speed, material });
    }
  }

  damageBlock(block, energy) {
    const outcome = block.damage(energy);
    if (outcome === 'crack') this.events.emit('crack', { block });
    if (outcome === 'break') this.pendingBreaks.add(block);
  }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

  /**
   * Advances by elapsed (already time-scaled) milliseconds.
   * @returns {number} interpolation factor for rendering
   */
  advance(elapsedMs) {
    return this.physics.advance(
      elapsedMs,
      (dt) => this.beforeStep(dt),
      (dt) => this.afterStep(dt),
    );
  }

  beforeStep(dt) {
    for (const mover of this.movers) mover.step(dt);
    for (const ball of this.launched) ball.beforeStep();
  }

  afterStep(dt) {
    this.time += dt;
    for (const ball of this.launched) ball.afterStep();
    for (const bumper of this.bumpers) bumper.flash = Math.max(0, bumper.flash - dt * 4);

    this.resolveWelds();
    this.resolveBreaks();
    this.resolveExplosions(dt);
    this.removeLostBalls();
    this.updateSpots(dt);
    this.updateReload(dt);
    this.checkOutcome(dt);
  }

  resolveWelds() {
    for (const { ball, other } of this.pendingWelds) {
      if (ball.stuckTo || ball.stickUsed || !ball.isFlying) continue;
      this.physics.add(ball.stickTo(other));
      this.events.emit('stick', { ball });
    }
    this.pendingWelds = [];
  }

  resolveBreaks() {
    for (const block of this.pendingBreaks) {
      if (!this.blocks.includes(block)) continue;
      this.blocks.splice(this.blocks.indexOf(block), 1);
      this.physics.remove(block.body);
      // Anything welded to the block falls free.
      for (const ball of this.launched) {
        if (ball.stuckTo === block.body && ball.weld) this.releaseWeld(ball);
      }
      const { x, y } = block.body.position;
      this.events.emit('break', { block, x, y });
      if (block.isExplosive) this.pendingExplosions.push({ at: { x, y }, fuse: EXPLOSION.chainDelay });
    }
    this.pendingBreaks.clear();
  }

  releaseWeld(ball) {
    this.physics.remove(ball.weld);
    ball.weld = null;
    ball.stuckTo = null;
  }

  resolveExplosions(dt) {
    const ready = this.pendingExplosions.filter((item) => (item.fuse -= dt) <= 0);
    this.pendingExplosions = this.pendingExplosions.filter((item) => item.fuse > 0);
    for (const item of ready) this.explode(item.at);
  }

  /**
   * Explosion: every movable body nearby gets a velocity kick away from the
   * centre (falling off linearly, stronger for light bodies) and blocks take
   * damage. TNT caught in the blast goes off a moment later.
   */
  explode(at) {
    const { radius, strength, damage } = EXPLOSION;
    for (const body of Composite.allBodies(this.physics.world)) {
      if (body.isStatic) continue;
      const dx = body.position.x - at.x;
      const dy = body.position.y - at.y - 20; // slightly below: things fly up
      const distance = Math.hypot(dx, dy) || 1;
      if (distance > radius) continue;
      const falloff = 1 - distance / radius;
      const kick = strength * falloff * Math.min(1.5, 8 / body.mass);
      Sleeping.set(body, false);
      // A blast tears welded (sticky) balls loose.
      const ball = body.plugin.ball;
      if (ball?.weld) this.releaseWeld(ball);
      Body.setVelocity(body, { x: body.velocity.x + (dx / distance) * kick, y: body.velocity.y + (dy / distance) * kick });
      Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.3 * falloff);
      const block = body.plugin.block;
      if (block) this.damageBlock(block, damage * falloff);
    }
    this.events.emit('explosion', at);
    // Blocks broken by this blast (including TNT) are processed right away.
    this.resolveBreaks();
  }

  removeLostBalls() {
    const margin = BALL.outOfBoundsMargin;
    for (const ball of this.ballsInPlay) {
      const { x, y } = ball.body.position;
      if (x < -margin || x > WORLD.width + margin || y > WORLD.height + margin) this.removeBall(ball, 'lost');
    }
  }

  removeBall(ball, reason) {
    if (ball.weld) this.physics.remove(ball.weld);
    this.physics.remove(ball.body);
    ball.state = reason;
  }

  updateSpots(dt) {
    const balls = this.ballsInPlay;
    for (const spot of this.spots) {
      const before = spot.progress;
      if (spot.update(balls, dt, this.time)) {
        const remaining = this.spots.filter((s) => !s.captured).length;
        this.events.emit('capture', { spot, ball: spot.ball, remaining });
      } else if (before === 0 && spot.progress > 0) {
        this.events.emit('progress', { spot });
      }
    }
  }

  updateReload(dt) {
    if (this.loaded || this.queue.length === 0 || this.state !== SessionState.PLAYING) return;
    this.reloadTimer -= dt;
    if (this.reloadTimer <= 0) this.loadNext();
  }

  checkOutcome(dt) {
    if (this.state !== SessionState.PLAYING) return;

    if (this.spots.every((spot) => spot.captured)) {
      const used = this.ballsUsed;
      const { three, two } = this.level.stars;
      const stars = used <= three ? 3 : used <= two ? 2 : 1;
      this.state = SessionState.WON;
      this.result = { outcome: 'won', stars, used };
      this.events.emit('won', this.result);
      return;
    }

    // Out of balls: wait until things calm down (and nothing is charging).
    if (this.ballsLeft > 0) return;
    const charging = this.spots.some((spot) => !spot.captured && spot.progress > 0);
    const moving = this.ballsInPlay.some((ball) => ball.speed > RULES.restSpeed && !ball.body.isStatic);
    this.calmTime = charging || moving ? 0 : this.calmTime + dt;
    const waitedTooLong = this.time - this.lastLaunchTime > RULES.maxWaitSeconds && !charging;
    if (this.calmTime >= RULES.restSeconds || waitedTooLong) {
      this.state = SessionState.FAILED;
      this.result = { outcome: 'failed', stars: 0, used: this.ballsUsed };
      this.events.emit('failed', this.result);
    }
  }

  /** Read-only summary for the HUD, tests and debugging. */
  snapshot() {
    return {
      state: this.state,
      level: this.level.id,
      time: this.time,
      ballsLeft: this.ballsLeft,
      ballsUsed: this.ballsUsed,
      loaded: this.loaded?.type.id ?? null,
      aiming: this.slingshot.aiming,
      spots: this.spots.map((spot) => ({ captured: spot.captured, progress: spot.progress, ...spot.position })),
      captured: this.spots.filter((spot) => spot.captured).length,
      blocks: this.blocks.length,
      inPlay: this.ballsInPlay.map((ball) => ({ type: ball.type.id, x: ball.body.position.x, y: ball.body.position.y, speed: ball.speed })),
      bodies: Composite.allBodies(this.physics.world).length,
      result: this.result,
    };
  }

  destroy() {
    this.physics.clear();
  }
}

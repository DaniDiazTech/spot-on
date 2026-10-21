/**
 * A ball (one of the aliens) shot from the slingshot.
 *
 * Life cycle:  queued -> loaded (in the pouch, not simulated yet)
 *              -> flying (a Matter.js circle) -> gone (out of bounds / exploded)
 *
 * Extra physics on top of Matter.js:
 *  - rolling resistance while touching something (Matter has none, so a
 *    ball would otherwise roll forever on flat ground)
 *  - coming to rest: a ball that has been almost still for a moment is set
 *    exactly still (no rocking between the facets of its polygon)
 *  - 'stick' ability: on its first contact the ball welds itself to what it
 *    hit with a pin constraint (static bodies too, so moving platforms carry
 *    it). The weld breaks with the block or in an explosion; it sticks once.
 */
import { Matter } from '../lib/matter.js';
import { BALL, COLLISION } from '../config.js';

const { Bodies, Body, Constraint } = Matter;

let nextId = 1;

export class Ball {
  /** @param {object} type  entry of data/balls.js */
  constructor(type) {
    this.id = nextId++;
    this.type = type;
    this.state = 'queued';
    this.body = null;
    /** Spot captured by this ball (one ball can capture one spot). */
    this.capturedSpot = null;
    this.touching = false;
    /** Consecutive slow steps (see BALL.restSteps). */
    this.restSteps = 0;
    /** Sticky balls stick only once. */
    this.stickUsed = false;
    this.stuckTo = null;
    this.weld = null;
    this.launchTime = 0;
    /** Recent positions, for the motion trail. */
    this.trail = [];
    /** Visual squash after impacts (0..1). */
    this.squash = 0;
    this.squashAngle = 0;
  }

  get radius() {
    return BALL.radius;
  }

  get position() {
    return this.body ? this.body.position : null;
  }

  get speed() {
    return this.body ? Math.hypot(this.body.velocity.x, this.body.velocity.y) : 0;
  }

  get isFlying() {
    return this.state === 'flying';
  }

  /** Creates the physics body and throws the ball. */
  launch(position, velocity, time) {
    const { type } = this;
    this.body = Bodies.circle(position.x, position.y, BALL.radius, {
      label: 'ball',
      density: type.density,
      restitution: type.restitution,
      friction: type.friction,
      frictionStatic: type.friction + 0.4,
      frictionAir: 0.0015,
      collisionFilter: { category: COLLISION.ball, mask: COLLISION.solid | COLLISION.ball },
    }, 64);
    // Balls never sleep: they may ride moving platforms and must keep
    // reporting their position to the spots.
    this.body.sleepThreshold = Infinity;
    this.body.plugin.ball = this;
    Body.setVelocity(this.body, velocity);
    this.state = 'flying';
    this.launchTime = time;
  }

  /** Called before every physics step. */
  beforeStep() {
    if (!this.isFlying || this.stuckTo) return;
    if (this.touching) {
      // Rolling resistance: lose a small fraction of the speed while in contact.
      const keep = 1 - BALL.rollingResistance;
      Body.setVelocity(this.body, { x: this.body.velocity.x * keep, y: this.body.velocity.y * keep });
      Body.setAngularVelocity(this.body, this.body.angularVelocity * keep);
      // Coming to rest: slow enough for a moment -> exactly still, so a
      // stopped ball never rocks between the facets of its polygon.
      const slow = this.speed < BALL.restSpeed && Math.abs(this.body.angularVelocity) < BALL.restSpin;
      this.restSteps = slow ? this.restSteps + 1 : 0;
      if (this.restSteps >= BALL.restSteps) {
        Body.setVelocity(this.body, { x: 0, y: 0 });
        Body.setAngularVelocity(this.body, 0);
      }
    } else {
      this.restSteps = 0;
    }
    this.touching = false;
  }

  /** Called after every physics step (visual bookkeeping). */
  afterStep() {
    if (!this.isFlying) return;
    this.squash = Math.max(0, this.squash - 0.04);
    this.trail.push({ x: this.body.position.x, y: this.body.position.y });
    if (this.trail.length > 26) this.trail.shift();
  }

  /** Records an impact for the squash-and-stretch effect. */
  impact(speed, normal) {
    this.squash = Math.min(1, Math.max(this.squash, speed / 18));
    this.squashAngle = Math.atan2(normal.y, normal.x);
  }

  /**
   * Sticky ball: weld to `other` at the current position.
   * @returns {Constraint} the weld
   */
  stickTo(other) {
    this.stuckTo = other;
    this.stickUsed = true;
    // Match the motion of what it hit; static bodies (ground, moving
    // platform) get a weld too, so the ball never stops obeying gravity.
    Body.setVelocity(this.body, { x: other.velocity.x, y: other.velocity.y });
    Body.setAngularVelocity(this.body, 0);
    // Pin the ball to the other body where they touch; it rides along.
    // (Matter's pointA is in world orientation and rotates with bodyA.)
    const offset = { x: this.body.position.x - other.position.x, y: this.body.position.y - other.position.y };
    this.weld = Constraint.create({
      bodyA: other,
      pointA: { x: offset.x, y: offset.y },
      bodyB: this.body,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 0.9,
      damping: 0.1,
    });
    return this.weld;
  }
}

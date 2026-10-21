/**
 * The slingshot: holds the loaded ball, turns a pull into a launch
 * velocity, and predicts the flight.
 *
 * Launch:   v = -(pull / maxPull) * maxSpeed   (pull back to throw forward)
 *
 * Preview:  instead of a textbook parabola we fly a "ghost" ball in a private
 *           Matter.js engine with the same timestep, gravity and air
 *           friction. The dots therefore match the real throw exactly
 *           (until the ball hits something).
 */
import { Matter } from '../lib/matter.js';
import { PHYSICS, SLING, BALL } from '../config.js';

const { Engine, Bodies, Body, Composite } = Matter;

export class Slingshot {
  /** @param {{x:number,y:number}} rest  pouch position (ball centre) */
  constructor(rest) {
    this.rest = rest;
    this.pull = { x: 0, y: 0 };
    this.aiming = false;

    // Ghost world for the trajectory preview (no other bodies in it).
    this.ghostEngine = Engine.create({ gravity: { x: 0, y: PHYSICS.gravityY } });
    this.ghost = Bodies.circle(rest.x, rest.y, BALL.radius, { frictionAir: 0.0015 });
    Composite.add(this.ghostEngine.world, this.ghost);
  }

  /** Where the loaded ball is drawn (pouch plus pull). */
  get ballPosition() {
    return { x: this.rest.x + this.pull.x, y: this.rest.y + this.pull.y };
  }

  /** Pull strength 0..1. */
  get power() {
    return Math.hypot(this.pull.x, this.pull.y) / SLING.maxPull;
  }

  /** Sets the pull from a drag vector (pointer offset), clamped to maxPull. */
  setPull(dx, dy) {
    const length = Math.hypot(dx, dy);
    const scale = length > SLING.maxPull ? SLING.maxPull / length : 1;
    this.pull = { x: dx * scale, y: dy * scale };
  }

  release() {
    this.aiming = false;
    this.pull = { x: 0, y: 0 };
  }

  get canLaunch() {
    return Math.hypot(this.pull.x, this.pull.y) >= SLING.minPull;
  }

  /** Launch velocity for the current pull (px per 1/60 s). */
  get launchVelocity() {
    const k = SLING.maxSpeed / SLING.maxPull;
    return { x: -this.pull.x * k, y: -this.pull.y * k };
  }

  /** Dots along the predicted flight path. */
  predict() {
    const { ghost, ghostEngine } = this;
    Body.setPosition(ghost, this.ballPosition);
    Body.setVelocity(ghost, this.launchVelocity);
    const points = [];
    for (let i = 1; i <= SLING.previewSteps; i++) {
      Engine.update(ghostEngine, PHYSICS.timestep);
      if (i % SLING.previewEvery === 0) points.push({ x: ghost.position.x, y: ghost.position.y });
    }
    return points;
  }
}

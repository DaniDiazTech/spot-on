/**
 * A target spot. A ball whose centre stays inside the circle for
 * SPOT.holdSeconds captures it; leaving early drains the progress. Once
 * captured a spot stays captured, and each ball can capture only one spot.
 *
 * A spot may be attached to a body (seesaw, moving platform): then it rides
 * along with it, following the body's position and rotation.
 */
import { SPOT } from '../config.js';

export class Spot {
  /**
   * @param {number} index
   * @param {{x,y}|null} position   fixed position, or null when attached
   * @param {object|null} attachment { body, offset } to ride on a body
   */
  constructor(index, position, attachment = null) {
    this.index = index;
    this.fixed = position;
    this.attachment = attachment;
    this.radius = SPOT.radius;
    this.progress = 0;
    this.captured = false;
    this.ball = null; // ball currently filling it, or the one that captured it
    this.capturedAt = 0;
  }

  /** Current centre of the spot (world px). */
  get position() {
    if (!this.attachment) return this.fixed;
    const { body, offset } = this.attachment;
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    return {
      x: body.position.x + offset.x * cos - offset.y * sin,
      y: body.position.y + offset.x * sin + offset.y * cos,
    };
  }

  get angle() {
    return this.attachment ? this.attachment.body.angle : 0;
  }

  contains(point) {
    const c = this.position;
    return Math.hypot(point.x - c.x, point.y - c.y) <= this.radius;
  }

  /**
   * Advances the capture timer.
   * @param {Ball[]} balls  balls in play
   * @returns {boolean} true on the step the spot gets captured
   */
  update(balls, dt, time) {
    if (this.captured) return false;
    const inside = balls.find((ball) => ball.isFlying && !ball.capturedSpot && ball.body && this.contains(ball.body.position));

    if (inside) {
      if (this.ball !== inside) this.ball = inside;
      this.progress = Math.min(1, this.progress + dt / SPOT.holdSeconds);
      if (this.progress >= 1) {
        this.captured = true;
        this.capturedAt = time;
        inside.capturedSpot = this;
        return true;
      }
    } else {
      this.progress = Math.max(0, this.progress - (dt * SPOT.drainFactor) / SPOT.holdSeconds);
      if (this.progress === 0) this.ball = null;
    }
    return false;
  }
}

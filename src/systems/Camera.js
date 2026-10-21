/**
 * Fits the 1600 x 900 level on any screen (letterboxing is filled by the
 * background), with screen shake and a slow-motion "punch-in" zoom.
 */
import { WORLD } from '../config.js';

export class Camera {
  constructor() {
    this.scale = 1;
    this.offset = { x: 0, y: 0 };
    this.shakeTime = 0;
    this.shakeStrength = 0;
    this.shakeOffset = { x: 0, y: 0 };
    this.zoom = 1;
    this.zoomTarget = 1;
    this.focus = { x: WORLD.width / 2, y: WORLD.height / 2 };
  }

  /** Recomputes the fit for a screen size. */
  fit(width, height) {
    this.scale = Math.min(width / WORLD.width, height / WORLD.height);
    this.offset = { x: (width - WORLD.width * this.scale) / 2, y: (height - WORLD.height * this.scale) / 2 };
    this.width = width;
    this.height = height;
  }

  shake(strength, seconds) {
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeTime = Math.max(this.shakeTime, seconds);
  }

  /** Gently zooms towards a world point (slow-motion moments). */
  punchIn(point, zoom) {
    this.focus = { ...point };
    this.zoomTarget = zoom;
  }

  reset() {
    this.zoom = this.zoomTarget = 1;
    this.shakeTime = 0;
  }

  update(dt) {
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 3);
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const strength = this.shakeStrength * Math.min(1, this.shakeTime * 4);
      this.shakeOffset = { x: (Math.random() * 2 - 1) * strength, y: (Math.random() * 2 - 1) * strength };
    } else {
      this.shakeOffset = { x: 0, y: 0 };
      this.shakeStrength = 0;
    }
  }

  /** World -> screen transform for p5 (call between push/pop). */
  apply(p) {
    p.translate(this.offset.x + this.shakeOffset.x, this.offset.y + this.shakeOffset.y);
    p.scale(this.scale);
    // Zoom around the focus point.
    p.translate(this.focus.x, this.focus.y);
    p.scale(this.zoom);
    p.translate(-this.focus.x, -this.focus.y);
  }

  worldToScreen({ x, y }) {
    const zx = this.focus.x + (x - this.focus.x) * this.zoom;
    const zy = this.focus.y + (y - this.focus.y) * this.zoom;
    return { x: this.offset.x + zx * this.scale, y: this.offset.y + zy * this.scale };
  }

  screenToWorld({ x, y }) {
    const zx = (x - this.offset.x) / this.scale;
    const zy = (y - this.offset.y) / this.scale;
    return { x: this.focus.x + (zx - this.focus.x) / this.zoom, y: this.focus.y + (zy - this.focus.y) / this.zoom };
  }
}

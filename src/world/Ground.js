/**
 * The ground of a level.
 *
 * The designer gives a handful of control points; a uniform Catmull-Rom
 * spline passes through all of them, producing a smooth curve. Matter.js
 * only handles convex shapes, so the curve becomes a chain of static
 * slabs: one parallelogram under every pair of neighbouring samples. They
 * share their top vertices, so the surface is continuous for rolling balls.
 */
import { Matter } from '../lib/matter.js';
import { catmullRom } from '../math/splines.js';
import { COLLISION } from '../config.js';

const { Bodies } = Matter;

const SAMPLES_PER_SPAN = 10;
const THICKNESS = 600;

export class Ground {
  /** @param {Array<[number, number]>} points  control points, sorted by x */
  constructor(points) {
    const controls = points.map(([x, y]) => ({ x, y }));
    // Repeat the ends so the spline reaches the first and last points.
    const padded = [controls[0], ...controls, controls[controls.length - 1]];

    /** Smooth surface points (sorted by x). */
    this.samples = [];
    for (let i = 1; i < padded.length - 2; i++) {
      const [p0, p1, p2, p3] = padded.slice(i - 1, i + 3);
      for (let s = i === 1 ? 0 : 1; s <= SAMPLES_PER_SPAN; s++) {
        this.samples.push(catmullRom(p0, p1, p2, p3, s / SAMPLES_PER_SPAN));
      }
    }

    this.bodies = [];
    for (let i = 0; i < this.samples.length - 1; i++) {
      this.bodies.push(slab(this.samples[i], this.samples[i + 1]));
    }
  }

  /** Surface height (y) at x, linearly interpolated between samples. */
  heightAt(x) {
    const { samples } = this;
    if (x <= samples[0].x) return samples[0].y;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].x >= x) {
        const a = samples[i - 1];
        const b = samples[i];
        return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
      }
    }
    return samples[samples.length - 1].y;
  }
}

function slab(a, b) {
  const vertices = [
    { x: a.x, y: a.y },
    { x: b.x, y: b.y },
    { x: b.x, y: b.y + THICKNESS },
    { x: a.x, y: a.y + THICKNESS },
  ];
  return Bodies.fromVertices((a.x + b.x) / 2, (a.y + b.y) / 2 + THICKNESS / 2, [vertices], {
    isStatic: true,
    label: 'ground',
    friction: 0.9,
    frictionStatic: 1.2,
    restitution: 0.2,
    collisionFilter: { category: COLLISION.solid },
  });
}

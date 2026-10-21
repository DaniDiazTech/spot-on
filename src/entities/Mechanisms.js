/**
 * Moving parts of a level, all real Matter.js physics:
 *
 *  Seesaw    a compound plank (with a little cup at each end) pinned to a
 *            static pivot by a constraint: it tips under weight.
 *  Pendulum  a stone wrecking ball hanging from a rope (distance constraint),
 *            swinging without air drag so it never stops.
 *  Mover     a static platform moved along a path every step. Its velocity
 *            is updated too, so friction carries balls resting on it.
 *  Bumper    a static disc with restitution above 1: it adds energy.
 */
import { Matter } from '../lib/matter.js';
import { MATERIALS, COLLISION } from '../config.js';

const { Bodies, Body, Constraint } = Matter;

const SOLID = { category: COLLISION.solid };

export class Seesaw {
  constructor({ id, x, y, length, pivotHeight }) {
    this.id = id;
    this.length = length;
    const plankHeight = 22;
    const cupHeight = 30;
    const wood = MATERIALS.wood;

    const plank = Bodies.rectangle(x, y, length, plankHeight, { label: 'plank', chamfer: { radius: 5 } });
    // Small walls at both ends keep a landed ball on the seesaw.
    const lipLeft = Bodies.rectangle(x - length / 2 + 7, y - plankHeight / 2 - cupHeight / 2 + 2, 14, cupHeight, { label: 'lip' });
    const lipRight = Bodies.rectangle(x + length / 2 - 7, y - plankHeight / 2 - cupHeight / 2 + 2, 14, cupHeight, { label: 'lip' });
    this.body = Body.create({
      parts: [plank, lipLeft, lipRight],
      label: 'seesaw',
      friction: wood.friction,
      frictionStatic: wood.friction + 0.3,
      restitution: 0.05,
      collisionFilter: SOLID,
    });
    Body.setDensity(this.body, wood.density * 1.6);

    // Static triangular pivot under the plank's centre.
    const top = { x, y: y + plankHeight / 2 };
    this.pivot = Bodies.fromVertices(x, top.y + pivotHeight * 0.66, [[
      { x, y: top.y },
      { x: x + pivotHeight * 0.55, y: top.y + pivotHeight },
      { x: x - pivotHeight * 0.55, y: top.y + pivotHeight },
    ]], { isStatic: true, label: 'pivot', friction: 0.6, collisionFilter: SOLID });

    // The pin: plank centre (on its underside) to the tip of the pivot.
    this.pin = Constraint.create({
      bodyA: this.body,
      pointA: { x: x - this.body.position.x, y: top.y - this.body.position.y },
      pointB: { x: top.x, y: top.y },
      length: 0,
      stiffness: 1,
    });
    this.plankSize = { w: length, h: plankHeight, cup: cupHeight };
    this.origin = { x, y };
  }

  get physicsObjects() {
    return [this.body, this.pivot, this.pin];
  }
}

export class Pendulum {
  constructor({ anchor, length, radius, angle }) {
    this.anchor = anchor;
    this.length = length;
    this.radius = radius;
    const stone = MATERIALS.stone;
    const x = anchor.x + Math.sin(angle) * length;
    const y = anchor.y + Math.cos(angle) * length;
    this.body = Bodies.circle(x, y, radius, {
      label: 'wrecking-ball',
      density: stone.density * 1.5,
      friction: 0.4,
      restitution: 0.2,
      frictionAir: 0, // a perfect pendulum keeps swinging
      collisionFilter: SOLID,
    }, 36);
    this.body.sleepThreshold = Infinity;
    this.rope = Constraint.create({ pointA: anchor, bodyB: this.body, length, stiffness: 1 });
  }

  get physicsObjects() {
    return [this.body, this.rope];
  }
}

export class Mover {
  constructor({ id, from, to, period, width }) {
    this.id = id;
    this.from = from;
    this.to = to;
    this.period = period;
    this.width = width;
    this.time = 0;
    const height = 20;
    const lipHeight = 26;
    const platform = Bodies.rectangle(from.x, from.y, width, height, { label: 'platform', chamfer: { radius: 4 } });
    const lipLeft = Bodies.rectangle(from.x - width / 2 + 6, from.y - height / 2 - lipHeight / 2 + 2, 12, lipHeight, { label: 'lip' });
    const lipRight = Bodies.rectangle(from.x + width / 2 - 6, from.y - height / 2 - lipHeight / 2 + 2, 12, lipHeight, { label: 'lip' });
    this.body = Body.create({
      parts: [platform, lipLeft, lipRight],
      isStatic: true,
      label: 'mover',
      friction: 0.9,
      frictionStatic: 1.2,
      restitution: 0.05,
      collisionFilter: SOLID,
    });
    // Offset from the compound centre of mass to the platform centre.
    this.centerOffset = { x: from.x - this.body.position.x, y: from.y - this.body.position.y };
    this.size = { w: width, h: height, lip: lipHeight };
  }

  /** Platform centre for a given time: smooth back-and-forth (cosine ease). */
  centerAt(time) {
    const t = (1 - Math.cos((time / this.period) * Math.PI * 2)) / 2;
    return { x: this.from.x + (this.to.x - this.from.x) * t, y: this.from.y + (this.to.y - this.from.y) * t };
  }

  step(dt) {
    this.time += dt;
    const center = this.centerAt(this.time);
    // updateVelocity = true: the platform carries what rests on it.
    Body.setPosition(this.body, { x: center.x - this.centerOffset.x, y: center.y - this.centerOffset.y }, true);
  }

  get physicsObjects() {
    return [this.body];
  }
}

export class Bumper {
  constructor({ x, y, radius }) {
    this.radius = radius;
    this.flash = 0;
    this.body = Bodies.circle(x, y, radius, {
      isStatic: true,
      label: 'bumper',
      restitution: 1.35,
      friction: 0,
      collisionFilter: SOLID,
    }, 32);
    this.body.plugin.bumper = this;
  }

  get physicsObjects() {
    return [this.body];
  }
}

/**
 * A building block made of wood, stone, glass, metal or TNT.
 *
 * Damage model: every impact carries kinetic energy E = 1/2 * mu * vn^2
 * (mu = reduced mass of the two bodies, vn = speed along the contact
 * normal). A block absorbs energy until its health runs out; past
 * DAMAGE.crackAt it shows its cracked sprite, at zero it breaks.
 * Toughness scales with area, so a big beam is harder to break than a brick.
 */
import { Matter } from '../lib/matter.js';
import { MATERIALS, DAMAGE, COLLISION } from '../config.js';

const { Bodies } = Matter;

/** Reference block area (70 x 70 px) for toughness. */
const REFERENCE_AREA = 70 * 70;

export class Block {
  /**
   * @param {object} spec  { material, x, y, w, h } or { material, x, y, r, round: true }
   *                       plus optional `static` and `angle`
   */
  constructor(spec) {
    this.spec = spec;
    this.material = spec.material;
    const material = MATERIALS[spec.material];
    const options = {
      label: spec.material,
      isStatic: Boolean(spec.static),
      density: material.density,
      friction: material.friction,
      frictionStatic: material.friction + 0.3,
      restitution: material.restitution,
      angle: spec.angle ?? 0,
      collisionFilter: { category: COLLISION.solid },
      // A little chamfer avoids snagging on corners and looks like the art.
      chamfer: spec.round ? undefined : { radius: Math.min(4, Math.min(spec.w, spec.h) * 0.12) },
    };
    this.body = spec.round
      ? Bodies.circle(spec.x, spec.y, spec.r, options, 32)
      : Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, options);
    this.body.plugin.block = this;

    const area = spec.round ? Math.PI * spec.r * spec.r : spec.w * spec.h;
    this.maxHealth = material.toughness * Math.max(0.35, area / REFERENCE_AREA);
    this.health = this.maxHealth;
    this.broken = false;
    /** Visual hit flash (0..1), set on impact and faded by the renderer. */
    this.flash = 0;
  }

  get isStatic() {
    return this.body.isStatic;
  }

  get breakable() {
    return Number.isFinite(this.maxHealth) && !this.isStatic;
  }

  get cracked() {
    return this.health < this.maxHealth * (1 - DAMAGE.crackAt);
  }

  get isExplosive() {
    return this.material === 'tnt';
  }

  /**
   * Applies impact energy.
   * @returns {'none'|'crack'|'break'} what visibly happened
   */
  damage(energy) {
    if (!this.breakable || this.broken) return 'none';
    this.flash = Math.min(1, 0.25 + energy / this.maxHealth);
    const wasCracked = this.cracked;
    this.health -= energy;
    if (this.health <= 0) {
      this.broken = true;
      return 'break';
    }
    return !wasCracked && this.cracked ? 'crack' : 'none';
  }
}

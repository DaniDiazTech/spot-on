/**
 * Every tunable number of the game lives here.
 *
 * Units: Matter.js works in pixels. Velocities are px per 1/60 s ("per step"
 * in Matter's base time unit), even though we simulate at 120 Hz.
 */

/** Every level is designed on this fixed canvas; the camera scales it to fit. */
export const WORLD = { width: 1600, height: 900 };

export const PHYSICS = {
  /** 120 Hz: smaller steps keep stacks stable and fast balls from tunnelling. */
  timestep: 1000 / 120,
  maxStepsPerFrame: 12,
  gravityY: 1,
  positionIterations: 12,
  velocityIterations: 10,
  constraintIterations: 4,
  /** Resting bodies fall asleep (cheap and rock-steady towers). */
  enableSleeping: true,
};

export const SLING = {
  /** Where the ball rests in the pouch (world px). Levels may override x/y. */
  maxPull: 150,
  /** Launch speed at full pull (px per 1/60 s). */
  maxSpeed: 25,
  /** Pull shorter than this cancels the shot. */
  minPull: 18,
  /** Seconds before the next ball is loaded. */
  reloadSeconds: 0.6,
  /** Trajectory preview length (simulation steps at 120 Hz) and dot spacing. */
  previewSteps: 110,
  previewEvery: 6,
};

export const BALL = {
  radius: 22,
  /** Rolling resistance: Matter.js has none, so a ball touching something
   *  loses this fraction of its speed per 120 Hz step. */
  rollingResistance: 0.004,
  /** A touching ball slower than these (px/step, rad/step) for restSteps
   *  steps (0.25 s) is set exactly still. */
  restSpeed: 0.04,
  restSpin: 0.003,
  restSteps: 30,
  /** Balls this far outside the world are gone. */
  outOfBoundsMargin: 300,
};

export const SPOT = {
  radius: 46,
  /** Seconds a ball must stay inside a spot to capture it. */
  holdSeconds: 3,
  /** How fast the progress drains (x hold speed) when the ball leaves. */
  drainFactor: 3,
};

/**
 * Materials. Toughness is how much impact energy a 70x70 block absorbs
 * before breaking (scaled by area for bigger blocks). The energy of a hit is
 * 1/2 * vn^2 * sqrt(mu * m), with vn the speed along the contact normal, mu
 * the reduced mass of the pair and m the striker's mass (see LevelSession).
 */
export const MATERIALS = {
  wood: { density: 0.0011, friction: 0.7, restitution: 0.08, toughness: 230, sound: 'wood' },
  stone: { density: 0.0028, friction: 0.85, restitution: 0.04, toughness: 650, sound: 'stone' },
  glass: { density: 0.0014, friction: 0.35, restitution: 0.12, toughness: 45, sound: 'glass' },
  metal: { density: 0.004, friction: 0.5, restitution: 0.1, toughness: Infinity, sound: 'metal' },
  tnt: { density: 0.0012, friction: 0.7, restitution: 0.08, toughness: 70, sound: 'wood' },
};

export const DAMAGE = {
  /** Contacts slower than this (px/step along the normal) do no damage. */
  minSpeed: 1.4,
  /** Fraction of health lost before the cracked sprite is shown. */
  crackAt: 0.4,
};

export const EXPLOSION = {
  radius: 240,
  /** Velocity change (px/step) at the centre, falling off linearly. */
  strength: 18,
  /** Damage dealt to blocks at the centre (falls off linearly). */
  damage: 900,
  chainDelay: 0.12,
};

export const RULES = {
  /** After the last ball, wait until everything is this calm (px/step)... */
  restSpeed: 0.12,
  /** ...for this long before declaring the level failed. */
  restSeconds: 1.5,
  /** Hard cap after the last shot, in case something keeps moving forever. */
  maxWaitSeconds: 14,
  /** Slow motion when the last spot is captured. */
  slowMotionScale: 0.3,
  slowMotionSeconds: 1.4,
};

/** Collision categories (bit flags) for Matter.js filtering. */
export const COLLISION = {
  solid: 0x0001,
  ball: 0x0002,
  sensor: 0x0004,
};

export const STORAGE_KEY = 'spot-on:v1';

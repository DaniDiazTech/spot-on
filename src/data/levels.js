/**
 * The three levels, designed on a 1600 x 900 canvas (y grows downwards).
 *
 *  ground     control points of the terrain; a Catmull-Rom spline passes
 *             through them and becomes the physical ground. Structures
 *             always stand on flat stretches.
 *  sling      where the ball rests in the slingshot pouch
 *  ammo       balls you get, in order (see data/balls.js)
 *  stars      maximum balls used for 3 and 2 stars (finishing = 1 star)
 *  spots      target zones: { x, y }, { x, ground: true } (resting on the
 *             ground) or { attach, offset } (riding a mechanism)
 *  blocks     material, centre (x, y) and size; `static` blocks never move
 *  tnt        explosive boxes
 *  mechanisms seesaw / pendulum / mover / bumper
 *  decor      scenery sprites standing on the ground (purely visual)
 *
 * Heights are computed from what each block rests on, so every stack
 * starts exactly at rest.
 */

/** A block of size w x h whose bottom sits at `bottom`. */
const on = (material, x, bottom, w, h, extra = {}) => ({ material, x, y: bottom - h / 2, w, h, ...extra });
const BALL_R = 22;

// --- Level 1 ------------------------------------------------------------------
const G1 = 760;
const LEDGE_TOP = G1 - 140 - 60; // pillars 140 high, slab 60 thick

// --- Level 2 ------------------------------------------------------------------
const G2 = 770;
const CUP_FLOOR = G2 - 220 - 18; // pillar 220, floor 18
const TOWER_DECK = G2 - 176 - 26; // pillars 176, plank 26

// --- Level 3 ------------------------------------------------------------------
const G3 = 770;
const SHELF_TOP = 262;

export const LEVELS = [
  {
    id: 1,
    name: 'First Contact',
    tagline: 'Land in the glowing spots and stay there for 3 seconds.',
    backdrop: 'backgrounds/grass',
    theme: 'grass',
    ground: [[-400, G1], [0, G1], [560, G1], [700, 780], [880, 806], [1060, 780], [1180, G1], [1250, G1], [1700, G1], [2100, G1]],
    sling: { x: 210, y: 610 },
    ammo: ['standard', 'standard', 'bouncy', 'standard'],
    stars: { three: 2, two: 3 },
    spots: [{ x: 880, ground: true }, { x: 1420, y: LEDGE_TOP - BALL_R }],
    blocks: [
      // Stone ledge on two pillars, with a metal backstop.
      on('stone', 1350, G1, 50, 140, { static: true }),
      on('stone', 1490, G1, 50, 140, { static: true }),
      on('stone', 1420, G1 - 140, 260, 60, { static: true }),
      on('metal', 1537, LEDGE_TOP, 26, 80, { static: true }),
      // Crates after the valley: a soft backstop for rolling balls.
      on('wood', 1272, G1, 50, 50),
      on('wood', 1324, G1, 50, 50),
      on('wood', 1298, G1 - 50, 50, 50),
      on('glass', 470, G1, 40, 40),
    ],
    tnt: [],
    mechanisms: [],
    decor: [
      { name: 'scenery/tree', x: 60, scale: 0.9 },
      { name: 'scenery/bush1', x: 400, scale: 0.7 },
      { name: 'scenery/bush3', x: 1000, scale: 0.6 },
      { name: 'scenery/treeLong', x: 1580, scale: 0.85 },
    ],
  },
  {
    id: 2,
    name: 'Glass Fortress',
    tagline: 'Break in. Heavy balls shatter glass, pink ones stick.',
    backdrop: 'backgrounds/desert',
    theme: 'desert',
    ground: [[-400, G2], [0, G2], [1000, G2], [1240, G2], [1330, 786], [1420, 806], [1510, 786], [1600, G2], [1700, G2], [2100, G2]],
    sling: { x: 200, y: 618 },
    ammo: ['heavy', 'standard', 'sticky', 'standard', 'bouncy'],
    stars: { three: 3, two: 4 },
    spots: [{ x: 640, y: CUP_FLOOR - BALL_R }, { x: 1000, y: TOWER_DECK - BALL_R }, { x: 1420, ground: true }],
    blocks: [
      // A metal cup on a stone pillar.
      on('stone', 640, G2, 46, 220, { static: true }),
      on('metal', 640, G2 - 220, 150, 18, { static: true }),
      on('metal', 574, CUP_FLOOR, 18, 52, { static: true }),
      on('metal', 706, CUP_FLOOR, 18, 52, { static: true }),
      // Wooden tower with a glass house on top.
      on('wood', 935, G2, 30, 176),
      on('wood', 1065, G2, 30, 176),
      on('wood', 1000, G2 - 176, 190, 26),
      on('glass', 938, TOWER_DECK, 18, 80),
      on('glass', 1062, TOWER_DECK, 18, 80),
      on('glass', 1000, TOWER_DECK - 80, 150, 18),
      // Wooden wall in front of the pit on the right.
      on('wood', 1180, G2, 46, 46),
      on('wood', 1180, G2 - 46, 46, 46),
      on('wood', 1180, G2 - 92, 46, 46),
      on('metal', 1570, G2, 24, 150, { static: true }),
    ],
    tnt: [{ x: 1120, y: G2 - 22 }],
    mechanisms: [],
    decor: [
      { name: 'scenery/cactus1', x: 80, scale: 0.8 },
      { name: 'scenery/cactus2', x: 430, scale: 0.7 },
      { name: 'scenery/treePalm', x: 820, scale: 0.75 },
      { name: 'scenery/cactus1', x: 1650, scale: 0.6 },
    ],
  },
  {
    id: 3,
    name: 'Clockwork',
    tagline: 'A seesaw, a wrecking ball and a moving platform. Timing is everything.',
    backdrop: 'backgrounds/shroom',
    theme: 'shroom',
    ground: [[-400, G3], [0, G3], [1700, G3], [2100, G3]],
    sling: { x: 200, y: 618 },
    ammo: ['standard', 'sticky', 'heavy', 'bomb', 'bouncy', 'standard'],
    stars: { three: 4, two: 5 },
    spots: [
      { attach: 'seesaw', offset: { x: 118, y: -11 - BALL_R } },
      { attach: 'platform', offset: { x: 0, y: -10 - BALL_R } },
      { x: 1478, y: SHELF_TOP - BALL_R },
    ],
    blocks: [
      // High shelf guarded by glass, with a metal back wall.
      { material: 'stone', x: 1478, y: SHELF_TOP + 22, w: 200, h: 44, static: true },
      on('metal', 1568, SHELF_TOP, 20, 64, { static: true }),
      on('glass', 1387, SHELF_TOP, 18, 64),
      on('glass', 1477, SHELF_TOP - 64, 200, 16),
      // Wooden block before the seesaw and a stone post by the TNT.
      on('wood', 520, G3, 44, 44),
      on('stone', 1210, G3, 40, 150, { static: true }),
    ],
    tnt: [{ x: 1290, y: G3 - 22 }, { x: 1336, y: G3 - 22 }],
    mechanisms: [
      { type: 'seesaw', id: 'seesaw', x: 760, y: G3 - 76 - 11, length: 300, pivotHeight: 76 },
      { type: 'pendulum', anchor: { x: 1030, y: 70 }, length: 330, radius: 36, angle: 0.95 },
      { type: 'mover', id: 'platform', from: { x: 1160, y: 520 }, to: { x: 1420, y: 520 }, period: 6, width: 170 },
      { type: 'bumper', x: 980, y: 620, radius: 30 },
    ],
    decor: [
      { name: 'scenery/treePine', x: 70, scale: 0.9 },
      { name: 'scenery/bush4', x: 400, scale: 0.7 },
      { name: 'scenery/treeOrange', x: 1600, scale: 0.8 },
    ],
  },
];

export const levelById = (id) => LEVELS.find((level) => level.id === id);

/**
 * Ball types (the alien sprites come from Kenney's "Physics Assets").
 *
 *  density      heavier balls push blocks harder and bounce less
 *  restitution  bounciness (0 = dead, 1 = perfectly elastic)
 *  friction     grip when rolling / sliding
 *  ability      'stick'  welds itself to the first thing it touches
 *               'bomb'   explodes when you tap again while it is flying
 */
export const BALLS = {
  standard: {
    id: 'standard',
    name: 'Blue',
    hint: 'All-rounder',
    sprite: 'balls/blue',
    color: '#5aa9e6',
    density: 0.004,
    restitution: 0.45,
    friction: 0.35,
  },
  bouncy: {
    id: 'bouncy',
    name: 'Yellow',
    hint: 'Super bouncy',
    sprite: 'balls/yellow',
    color: '#ffd23f',
    density: 0.003,
    restitution: 0.88,
    friction: 0.3,
  },
  heavy: {
    id: 'heavy',
    name: 'Beige',
    hint: 'Heavy: smashes blocks',
    sprite: 'balls/beige',
    color: '#d9c3a0',
    density: 0.016,
    restitution: 0.12,
    friction: 0.6,
  },
  sticky: {
    id: 'sticky',
    name: 'Pink',
    hint: 'Sticks where it lands',
    sprite: 'balls/pink',
    color: '#ff7ab6',
    density: 0.004,
    restitution: 0.05,
    friction: 0.9,
    ability: 'stick',
  },
  bomb: {
    id: 'bomb',
    name: 'Green',
    hint: 'Tap again to explode',
    sprite: 'balls/green',
    color: '#5bd77e',
    density: 0.005,
    restitution: 0.3,
    friction: 0.4,
    ability: 'bomb',
  },
};

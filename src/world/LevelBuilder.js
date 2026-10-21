/**
 * Turns a level description (data/levels.js) into physics objects.
 */
import { Ground } from './Ground.js';
import { Block } from '../entities/Block.js';
import { Spot } from '../entities/Spot.js';
import { Seesaw, Pendulum, Mover, Bumper } from '../entities/Mechanisms.js';
import { BALL } from '../config.js';

const TNT_SIZE = 44;

/**
 * @param {PhysicsWorld} physics
 * @param {object} level
 * @returns {{ ground, blocks, mechanisms, spots, movers, bumpers }}
 */
export function buildLevel(physics, level) {
  const ground = new Ground(level.ground);
  physics.add(ground.bodies);

  const blocks = [
    ...level.blocks.map((spec) => new Block(spec)),
    ...level.tnt.map(({ x, y }) => new Block({ material: 'tnt', x, y, w: TNT_SIZE, h: TNT_SIZE })),
  ];
  physics.add(blocks.map((block) => block.body));

  const mechanisms = level.mechanisms.map(createMechanism);
  for (const mechanism of mechanisms) physics.add(mechanism.physicsObjects);
  const byId = Object.fromEntries(mechanisms.filter((m) => m.id).map((m) => [m.id, m]));

  const spots = level.spots.map((spec, index) => {
    if (spec.ground) return new Spot(index, { x: spec.x, y: ground.heightAt(spec.x) - BALL.radius });
    if (!spec.attach) return new Spot(index, { x: spec.x, y: spec.y });
    const mechanism = byId[spec.attach];
    // Offsets in the level data are measured from the plank / platform
    // centre; Matter positions compound bodies by their centre of mass.
    const center = mechanism.origin ?? mechanism.from;
    const offset = {
      x: spec.offset.x + center.x - mechanism.body.position.x,
      y: spec.offset.y + center.y - mechanism.body.position.y,
    };
    return new Spot(index, null, { body: mechanism.body, offset });
  });

  return {
    ground,
    blocks,
    mechanisms,
    spots,
    movers: mechanisms.filter((m) => m instanceof Mover),
    bumpers: mechanisms.filter((m) => m instanceof Bumper),
  };
}

function createMechanism(spec) {
  switch (spec.type) {
    case 'seesaw':
      return new Seesaw(spec);
    case 'pendulum':
      return new Pendulum(spec);
    case 'mover':
      return new Mover(spec);
    case 'bumper':
      return new Bumper(spec);
    default:
      throw new Error(`Unknown mechanism: ${spec.type}`);
  }
}

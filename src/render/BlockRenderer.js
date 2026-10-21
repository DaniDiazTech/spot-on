/**
 * Draws blocks with Kenney "Physics Assets" sprites. Each sprite is the
 * material image closest in shape, stretched to the block; cracked blocks
 * switch to the damaged sprite, and fresh hits flash white for a moment.
 */
import { drawOnBody } from './draw.js';

export class BlockRenderer {
  constructor(p, assets) {
    this.p = p;
    this.assets = assets;
  }

  draw(blocks) {
    const { p, assets } = this;
    const ctx = p.drawingContext;
    for (const block of blocks) {
      const { spec, body } = block;
      const image = spec.round
        ? assets.get(`blocks/${block.material}_round`)
        : assets.blockSprite(block.material, spec.w, spec.h, block.cracked);
      drawOnBody(p, image, body);

      // Hit flash: the same sprite drawn additively, fading out.
      if (block.flash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = block.flash * 0.6;
        drawOnBody(p, image, body);
        ctx.restore();
        block.flash = Math.max(0, block.flash - 0.08);
      }
    }
  }
}

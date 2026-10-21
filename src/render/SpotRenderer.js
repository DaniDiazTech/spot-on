/**
 * Draws the target spots:
 *  - free:      a pulsing glow, a turning dashed ring
 *  - charging:  a thick progress arc and a countdown in the middle
 *  - captured:  golden disc, a flag planted on top, a slow shimmer
 */
import { SPOT } from '../config.js';

const FREE = { ring: '#3ad3ff' };
const GOLD = { ring: '#ffcc33' };

export class SpotRenderer {
  constructor(p, assets) {
    this.p = p;
    this.assets = assets;
  }

  /** Coloured glows under the balls and blocks. */
  drawGlows(spots, time) {
    const { p, assets } = this;
    const ctx = p.drawingContext;
    p.imageMode(p.CENTER);
    for (const spot of spots) {
      const { x, y } = spot.position;
      const pulse = 1 + Math.sin(time * 3 + spot.index) * 0.07;
      ctx.globalAlpha = spot.captured ? 0.9 : 0.55 + spot.progress * 0.45;
      const size = spot.radius * 3.4 * pulse * (1 + spot.progress * 0.25);
      p.image(assets.get(spot.captured ? 'fx/glowGold' : 'fx/glowCyan'), x, y, size, size);
    }
    ctx.globalAlpha = 1;
    p.imageMode(p.CORNER);
  }

  /** Disc and turning dashed ring, under the balls. */
  drawBase(spots, time) {
    const { p } = this;
    const ctx = p.drawingContext;
    for (const spot of spots) {
      const { x, y } = spot.position;
      const r = spot.radius;
      p.noStroke();
      p.fill(spot.captured ? 'rgba(255, 204, 51, 0.18)' : 'rgba(58, 211, 255, 0.12)');
      p.circle(x, y, r * 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * (spot.captured ? 0.3 : 0.8) + spot.angle);
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = (spot.captured ? GOLD : FREE).ring;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Progress arcs, countdowns and flags, on top of the balls.
   * @param {number} time         render clock (animations)
   * @param {number} sessionTime  simulation clock (capture pop-up)
   */
  drawOverlay(spots, time, sessionTime) {
    for (const spot of spots) {
      const { x, y } = spot.position;
      if (!spot.captured && spot.progress > 0) this.drawProgress(spot, x, y, spot.radius);
      if (spot.captured) this.drawFlag(spot, x, y, spot.radius, time, sessionTime - spot.capturedAt);
    }
  }

  drawProgress(spot, x, y, r) {
    const { p } = this;
    const ctx = p.drawingContext;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r + 9, 0, Math.PI * 2);
    ctx.stroke();
    const gradient = ctx.createLinearGradient(x - r, y, x + r, y);
    gradient.addColorStop(0, '#3ad3ff');
    gradient.addColorStop(1, '#7dffb0');
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r + 9, -Math.PI / 2, -Math.PI / 2 + spot.progress * Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Countdown: 3, 2, 1.
    const secondsLeft = Math.ceil((1 - spot.progress) * SPOT.holdSeconds);
    p.noStroke();
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textStyle(p.BOLD);
    p.textSize(30);
    p.drawingContext.shadowColor = 'rgba(0,0,0,0.45)';
    p.drawingContext.shadowBlur = 6;
    p.text(secondsLeft, x, y - r - 30);
    p.drawingContext.shadowBlur = 0;
  }

  drawFlag(spot, x, y, r, time, age) {
    const { p, assets } = this;
    const flag = assets.get('icons/flagGreen');
    // Pops up when captured, then waves.
    const grow = Math.min(1, age * 3);
    const scale = easeOutBack(grow) * 0.75;
    p.push();
    p.translate(x + r * 0.95, y + r * 0.45);
    p.rotate(Math.sin(time * 2.5 + spot.index) * 0.06);
    p.imageMode(p.CORNER);
    p.image(flag, -6, -flag.height * scale, flag.width * scale, flag.height * scale);
    p.pop();
  }
}

function easeOutBack(t) {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

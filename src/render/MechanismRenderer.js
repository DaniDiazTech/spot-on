/**
 * Draws the moving parts: seesaw (wood parts on a stone pivot), pendulum
 * (chain + stone wrecking ball), moving platform (metal on a dotted rail)
 * and bumpers (glossy discs that flash when hit).
 */
import { Seesaw, Pendulum, Mover, Bumper } from '../entities/Mechanisms.js';
import { drawOnBody, localSize } from './draw.js';

export class MechanismRenderer {
  constructor(p, assets) {
    this.p = p;
    this.assets = assets;
  }

  draw(mechanisms, time) {
    for (const mechanism of mechanisms) {
      if (mechanism instanceof Seesaw) this.drawSeesaw(mechanism);
      else if (mechanism instanceof Pendulum) this.drawPendulum(mechanism, time);
      else if (mechanism instanceof Mover) this.drawMover(mechanism, time);
      else if (mechanism instanceof Bumper) this.drawBumper(mechanism, time);
    }
  }

  /** Draws every convex part of a compound body with a material sprite. */
  drawParts(body, material) {
    for (const part of body.parts.slice(1)) {
      part.plugin.size ??= localSize(part, body.angle);
      const { w, h } = part.plugin.size;
      drawOnBody(this.p, this.assets.blockSprite(material, w, h, false), part, body.angle);
    }
  }

  drawSeesaw(seesaw) {
    const { p } = this;
    const v = seesaw.pivot.vertices;
    p.stroke('#5f6670');
    p.strokeWeight(3);
    p.fill('#9aa3ad');
    p.beginShape();
    for (const point of v) p.vertex(point.x, point.y);
    p.endShape(p.CLOSE);
    this.drawParts(seesaw.body, 'wood');
    // Bolt at the pin.
    const pin = seesaw.pin.pointB;
    p.noStroke();
    p.fill('#3d4048');
    p.circle(pin.x, pin.y - 4, 12);
    p.fill('#c9ced6');
    p.circle(pin.x, pin.y - 4, 5);
  }

  drawPendulum(pendulum) {
    const { p, assets } = this;
    const { anchor } = pendulum;
    const ball = pendulum.body.position;
    // Chain: small links along the rope.
    const dx = ball.x - anchor.x;
    const dy = ball.y - anchor.y;
    const length = Math.hypot(dx, dy);
    const links = Math.floor(length / 14);
    const angle = Math.atan2(dy, dx);
    p.noFill();
    p.strokeWeight(3);
    for (let i = 0; i < links; i++) {
      const t = (i + 0.5) / links;
      p.push();
      p.translate(anchor.x + dx * t, anchor.y + dy * t);
      p.rotate(angle + (i % 2 ? Math.PI / 2 : 0));
      p.stroke(i % 2 ? '#7d848f' : '#a7aeb8');
      p.ellipse(0, 0, 14, i % 2 ? 5 : 8);
      p.pop();
    }
    p.imageMode(p.CENTER);
    p.image(assets.get('blocks/metal_round'), anchor.x, anchor.y, 26, 26);
    p.push();
    p.translate(ball.x, ball.y);
    p.rotate(pendulum.body.angle);
    p.image(assets.get('blocks/stone_round'), 0, 0, pendulum.radius * 2 + 2, pendulum.radius * 2 + 2);
    p.pop();
    p.imageMode(p.CORNER);
  }

  drawMover(mover, time) {
    const { p } = this;
    const y = mover.from.y;
    // Rail with gears at both ends.
    p.stroke('rgba(60, 64, 72, 0.5)');
    p.strokeWeight(4);
    p.drawingContext.setLineDash([10, 10]);
    p.line(mover.from.x, y + 26, mover.to.x, y + 26);
    p.drawingContext.setLineDash([]);
    for (const end of [mover.from, mover.to]) {
      p.push();
      p.translate(end.x, y + 26);
      p.rotate(time * 1.5);
      p.noStroke();
      p.fill('#6b7280');
      for (let i = 0; i < 8; i++) {
        p.rotate(Math.PI / 4);
        p.rect(-3, -13, 6, 6, 1);
      }
      p.circle(0, 0, 20);
      p.fill('#c9ced6');
      p.circle(0, 0, 7);
      p.pop();
    }
    this.drawParts(mover.body, 'metal');
  }

  drawBumper(bumper, time) {
    const { p, assets } = this;
    const { x, y } = bumper.body.position;
    const r = bumper.radius * (1 + bumper.flash * 0.18 + Math.sin(time * 3) * 0.02);
    if (bumper.flash > 0) {
      const ctx = p.drawingContext;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = bumper.flash;
      p.imageMode(p.CENTER);
      p.image(assets.get('fx/glow'), x, y, r * 5, r * 5);
      p.imageMode(p.CORNER);
      ctx.restore();
    }
    p.noStroke();
    p.fill('#b3262f');
    p.circle(x, y, r * 2 + 8);
    p.fill(bumper.flash > 0.3 ? '#fff3b0' : '#ff4d5a');
    p.circle(x, y, r * 2);
    p.fill('#ffd23f');
    p.circle(x, y, r * 1.1);
    p.fill(255, 255, 255, 170);
    p.ellipse(x - r * 0.35, y - r * 0.4, r * 0.7, r * 0.45);
  }
}

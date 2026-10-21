/**
 * Draws the slingshot: a wooden Y-frame, two rubber bands and the pouch.
 * The bands are quadratic Bezier curves (De Casteljau) that sag when slack
 * and straighten as they are pulled. While aiming, dots show the exact
 * predicted flight (see Slingshot.predict).
 */
import { sampleBezier } from '../math/splines.js';
import { BALL } from '../config.js';

const BAND = '#5b2a17';

export class SlingshotRenderer {
  constructor(p, assets, ballRenderer) {
    this.p = p;
    this.assets = assets;
    this.ballRenderer = ballRenderer;
  }

  /** Frame geometry relative to the pouch rest position. */
  frame(slingshot) {
    const { x, y } = slingshot.rest;
    return {
      base: { x: x - 4, y: y + 150 },
      fork: { x: x - 4, y: y + 60 },
      back: { x: x - 30, y: y - 6 },
      front: { x: x + 22, y: y - 6 },
    };
  }

  /** Back half: rear prong, rear band and the pouch. Drawn before the ball. */
  drawBack(slingshot) {
    const { p } = this;
    const f = this.frame(slingshot);
    this.wood(f.fork, f.back, 15);
    this.wood(f.base, f.fork, 18);
    this.band(f.back, slingshot);
  }

  /** Loaded ball, then the front band and prong over it. */
  drawFront(slingshot, loaded, time, aimPreview) {
    const { p } = this;
    const f = this.frame(slingshot);
    if (aimPreview) this.drawPreview(aimPreview, slingshot);
    if (loaded) {
      const pos = slingshot.ballPosition;
      // Leather pouch behind the ball.
      p.noStroke();
      p.fill('#4a2a1a');
      p.ellipse(pos.x - 6, pos.y, 22, 30);
      this.ballRenderer.drawBall(loaded, pos, 0, time);
    }
    this.band(f.front, slingshot);
    this.wood(f.fork, f.front, 15);
    // Knot on the prong tips.
    p.fill('#3a1d10');
    p.circle(f.back.x, f.back.y, 9);
    p.circle(f.front.x, f.front.y, 9);
  }

  wood(a, b, width) {
    const { p } = this;
    p.stroke('#5a3518');
    p.strokeWeight(width + 4);
    p.line(a.x, a.y, b.x, b.y);
    p.stroke('#9b6334');
    p.strokeWeight(width);
    p.line(a.x, a.y, b.x, b.y);
    p.stroke('rgba(255, 220, 170, 0.35)');
    p.strokeWeight(width * 0.3);
    p.line(a.x - width * 0.2, a.y, b.x - width * 0.2, b.y);
  }

  /** Rubber band from a prong tip to the pouch, sagging when slack. */
  band(tip, slingshot) {
    const { p } = this;
    const pouch = slingshot.ballPosition;
    const tension = Math.min(1, slingshot.power);
    const mid = { x: (tip.x + pouch.x) / 2, y: (tip.y + pouch.y) / 2 + (1 - tension) * 14 };
    const points = sampleBezier([tip, mid, { x: pouch.x - BALL.radius * 0.5, y: pouch.y }], 12);
    p.noFill();
    p.stroke(BAND);
    p.strokeWeight(9 - tension * 4);
    p.beginShape();
    for (const point of points) p.vertex(point.x, point.y);
    p.endShape();
    p.noStroke();
  }

  drawPreview(points, slingshot) {
    const { p } = this;
    const power = slingshot.power;
    const color = p.color(power > 0.85 ? '#ff6b5a' : power > 0.5 ? '#ffd23f' : '#ffffff');
    p.noStroke();
    points.forEach((point, i) => {
      const t = 1 - i / points.length;
      color.setAlpha(230 * t);
      p.fill(color);
      p.circle(point.x, point.y, 4 + 6 * t);
    });
  }
}

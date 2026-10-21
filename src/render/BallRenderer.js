/**
 * Draws the balls (Kenney aliens):
 *  - a fading motion trail in the ball's colour
 *  - squash and stretch along the last impact normal
 *  - a golden halo around a ball that captured a spot
 *  - a blinking fuse light on a flying bomb
 */
import { BALL } from '../config.js';

export class BallRenderer {
  constructor(p, assets) {
    this.p = p;
    this.assets = assets;
  }

  draw(balls, time) {
    for (const ball of balls) {
      if (!ball.isFlying) continue;
      this.drawTrail(ball);
      this.drawBall(ball, ball.body.position, ball.body.angle, time);
    }
  }

  drawTrail(ball) {
    const { p } = this;
    const trail = ball.trail;
    if (trail.length < 2 || ball.speed < 2) return;
    const color = p.color(ball.type.color);
    for (let i = 1; i < trail.length; i++) {
      const t = i / trail.length;
      color.setAlpha(150 * t * Math.min(1, ball.speed / 8));
      p.stroke(color);
      p.strokeWeight(BALL.radius * 1.4 * t);
      p.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y);
    }
    p.noStroke();
  }

  /** Also used for the ball waiting in the slingshot. */
  drawBall(ball, position, angle, time) {
    const { p, assets } = this;
    const r = BALL.radius;
    const image = assets.get(ball.type.sprite);

    if (ball.capturedSpot) {
      p.noFill();
      p.stroke(255, 204, 51, 200 + 55 * Math.sin(time * 5));
      p.strokeWeight(4);
      p.circle(position.x, position.y, r * 2 + 10);
      p.noStroke();
    }

    p.push();
    p.translate(position.x, position.y);
    if (ball.squash > 0) {
      // Squash along the impact normal, stretch across it.
      p.rotate(ball.squashAngle);
      p.scale(1 - ball.squash * 0.28, 1 + ball.squash * 0.18);
      p.rotate(-ball.squashAngle);
    }
    p.rotate(angle);
    p.imageMode(p.CENTER);
    p.image(image, 0, 0, r * 2 + 2, r * 2 + 2);
    p.pop();

    if (ball.type.ability === 'bomb' && ball.isFlying) {
      const on = Math.sin(time * 14) > 0;
      p.fill(on ? '#ff3b30' : '#7a1a14');
      p.circle(position.x, position.y - r - 5, 8);
    }
    if (ball.stuckTo) {
      p.fill(255, 122, 182, 160);
      p.ellipse(position.x, position.y + r * 0.75, r * 1.6, r * 0.6);
    }
  }
}

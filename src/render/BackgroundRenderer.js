/**
 * Everything behind the level, in screen space:
 *
 *   backdrop  sky colour + the Kenney landscape, scaled so its horizon lines
 *             up with the level's ground. Rendered once per screen size into
 *             an off-screen buffer (retained mode) and stamped every frame.
 *   sun       glow sprite with slowly turning rays
 *   clouds    Kenney sprites drifting with the wind
 *   pollen    tiny glowing motes floating around (cheap ambient motion)
 */
import { createRandom } from '../math/random.js';

const CLOUDS = ['cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5', 'cloud6'];

export class BackgroundRenderer {
  /** @param {p5} p @param {Assets} assets */
  constructor(p, assets) {
    this.p = p;
    this.assets = assets;
  }

  /** @param {object} level  @param {object} theme  @param {Camera} camera */
  setLevel(level, theme, camera) {
    this.level = level;
    this.theme = theme;
    this.camera = camera;
    const random = createRandom(level.id * 7919);
    this.clouds = Array.from({ length: 6 }, (_, i) => ({
      name: CLOUDS[i % CLOUDS.length],
      x: random.range(0, 1),
      y: random.range(0.04, 0.32),
      scale: random.range(0.55, 1),
      speed: random.range(6, 16),
    }));
    this.pollen = Array.from({ length: 34 }, () => ({
      x: random.next(),
      y: random.range(0.1, 0.8),
      size: random.range(2, 5),
      speed: random.range(4, 14),
      phase: random.range(0, Math.PI * 2),
    }));
    this.resize();
  }

  resize() {
    const { p } = this;
    if (!this.level) return;
    this.buffer?.remove();
    this.buffer = p.createGraphics(Math.max(1, p.width), Math.max(1, p.height));
    const g = this.buffer;
    g.background(this.theme.sky);

    // Scale the 1024px landscape to the screen height (tiled sideways) so
    // that its hill line sits just behind the level's ground.
    const image = this.assets.get(this.level.backdrop);
    const groundScreenY = this.camera.worldToScreen({ x: 0, y: 760 }).y;
    const size = Math.max(560, groundScreenY * 1.02);
    const top = groundScreenY + size * 0.04 - size;
    for (let x = 0; x < p.width; x += size - 1) g.image(image, x, top, size, size);
    if (top > 0) {
      // Fill above the art with its own sky colour.
      g.noStroke();
      g.fill(this.theme.sky);
      g.rect(0, 0, p.width, top + 1);
    }
  }

  draw(time) {
    const { p } = this;
    p.image(this.buffer, 0, 0);
    this.drawSun(time);
    this.drawClouds(time);
    this.drawPollen(time);
  }

  drawSun(time) {
    const { p } = this;
    const x = p.width * 0.86;
    const y = p.height * 0.14;
    const r = Math.min(p.width, p.height) * 0.06;
    const ctx = p.drawingContext;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.05);
    ctx.fillStyle = 'rgba(255, 245, 200, 0.18)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, 0);
      ctx.lineTo(r * 0.25, 0);
      ctx.lineTo(0, r * 3.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    p.imageMode(p.CENTER);
    p.image(this.assets.get('fx/glow'), x, y, r * 4.5, r * 4.5);
    p.noStroke();
    p.fill('#fff6cf');
    p.circle(x, y, r * 1.6);
    p.fill('#ffffff');
    p.circle(x, y, r * 1.2);
    p.imageMode(p.CORNER);
  }

  drawClouds(time) {
    const { p } = this;
    const ctx = p.drawingContext;
    ctx.globalAlpha = 0.92;
    for (const cloud of this.clouds) {
      const image = this.assets.get(`scenery/${cloud.name}`);
      const w = image.width * cloud.scale * (p.height / 900) * 1.4;
      const h = image.height * cloud.scale * (p.height / 900) * 1.4;
      const span = p.width + w * 2;
      const x = ((cloud.x * span + time * cloud.speed) % span) - w;
      p.image(image, x, cloud.y * p.height, w, h);
    }
    ctx.globalAlpha = 1;
  }

  drawPollen(time) {
    const { p } = this;
    p.noStroke();
    for (const mote of this.pollen) {
      const x = ((mote.x * p.width + time * mote.speed) % (p.width + 20)) - 10;
      const y = mote.y * p.height + Math.sin(time * 0.8 + mote.phase) * 18;
      p.fill(255, 255, 240, 90 + 60 * Math.sin(time * 2 + mote.phase));
      p.circle(x, y, mote.size);
    }
  }
}

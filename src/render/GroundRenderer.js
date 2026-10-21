/**
 * Draws the ground (world space): a soil body filled with a generated,
 * seamless texture, darker bands deeper down, a grass band along the
 * Catmull-Rom surface (QUAD_STRIP) and swaying grass blades.
 */
const DEPTH_BANDS = [
  { depth: 70, alpha: 0.14 },
  { depth: 170, alpha: 0.24 },
];
const GRASS_DEPTH = 18;
const BOTTOM = 1600;

export class GroundRenderer {
  /** @param {p5} p @param {Assets} assets */
  constructor(p, assets) {
    this.p = p;
    this.assets = assets;
  }

  setLevel(ground, theme) {
    this.ground = ground;
    this.theme = theme;
    // Blade positions along the surface, chosen once.
    this.blades = [];
    for (let i = 0; i < ground.samples.length; i += 2) {
      const point = ground.samples[i];
      const h = hash(i);
      if (h < 0.55) this.blades.push({ x: point.x + h * 10, y: point.y, height: 7 + h * 12, phase: h * 20 });
    }
  }

  draw(time) {
    const { p, ground, theme } = this;
    const ctx = p.drawingContext;
    const samples = ground.samples;

    // Soil body with the generated texture (one path: no seams).
    ctx.beginPath();
    ctx.moveTo(samples[0].x, BOTTOM);
    for (const point of samples) ctx.lineTo(point.x, point.y);
    ctx.lineTo(samples[samples.length - 1].x, BOTTOM);
    ctx.closePath();
    ctx.fillStyle = this.assets.soilPattern(theme, ctx);
    ctx.fill();

    for (const band of DEPTH_BANDS) {
      ctx.beginPath();
      ctx.moveTo(samples[0].x, BOTTOM);
      for (const point of samples) ctx.lineTo(point.x, point.y + band.depth);
      ctx.lineTo(samples[samples.length - 1].x, BOTTOM);
      ctx.closePath();
      ctx.fillStyle = `rgba(40, 20, 10, ${band.alpha})`;
      ctx.fill();
    }

    // Grass band.
    p.stroke(theme.grassDark);
    p.strokeWeight(1);
    p.fill(theme.grassDark);
    p.beginShape(p.QUAD_STRIP);
    for (const point of samples) {
      p.vertex(point.x, point.y - 2);
      p.vertex(point.x, point.y + GRASS_DEPTH);
    }
    p.endShape();
    p.stroke(theme.grass);
    p.fill(theme.grass);
    p.beginShape(p.QUAD_STRIP);
    for (const point of samples) {
      p.vertex(point.x, point.y - 3);
      p.vertex(point.x, point.y + GRASS_DEPTH * 0.55);
    }
    p.endShape();

    // Blades swaying in the wind.
    p.stroke(theme.grass);
    p.strokeWeight(3);
    for (const blade of this.blades) {
      const sway = Math.sin(time * 1.8 + blade.phase + blade.x * 0.01) * 3;
      p.line(blade.x, blade.y, blade.x + sway, blade.y - blade.height);
    }
    p.noStroke();
  }

  /** Scenery sprites standing on the ground, behind everything else. */
  drawDecor(decor) {
    const { p, ground } = this;
    for (const item of decor) {
      const image = this.assets.get(item.name);
      const w = image.width * item.scale;
      const h = image.height * item.scale;
      p.image(image, item.x - w / 2, ground.heightAt(item.x) - h + 8, w, h);
    }
  }
}

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Small drawing helpers shared by the world renderers. */

/** Width and height of a convex part in its own (unrotated) frame. */
export function localSize(body, angle = body.angle) {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of body.vertices) {
    const dx = v.x - body.position.x;
    const dy = v.y - body.position.y;
    const x = dx * cos - dy * sin;
    const y = dx * sin + dy * cos;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { w: maxX - minX, h: maxY - minY };
}

/**
 * Draws `image` stretched over a (part of a) body, rotated with `angle`.
 * The size is measured once and cached on the body.
 */
export function drawOnBody(p, image, body, angle = body.angle, pad = 2) {
  body.plugin.size ??= localSize(body, angle);
  const { w, h } = body.plugin.size;
  p.push();
  p.translate(body.position.x, body.position.y);
  p.rotate(angle);
  p.imageMode(p.CENTER);
  p.image(image, 0, 0, w + pad, h + pad);
  p.pop();
}

/**
 * Loads every image the game uses and prepares derived (retained) images:
 * anything expensive (the soil texture, the slingshot wood, glow sprites)
 * is generated ONCE here instead of every frame.
 *
 * Art: Kenney (kenney.nl), CC0 — see assets/CREDITS.md.
 */
const BASE = 'assets/';

export const BLOCK_SIZES = [
  [70, 70], [140, 70], [220, 70], [70, 140], [140, 140], [220, 140], [70, 220], [140, 220],
];
const MATERIALS = ['wood', 'stone', 'glass', 'metal'];

const MANIFEST = {
  ...Object.fromEntries(['blue', 'yellow', 'beige', 'pink', 'green'].map((n) => [`balls/${n}`, `balls/${n}.png`])),
  ...Object.fromEntries(['grass', 'desert', 'shroom', 'land'].map((n) => [`backgrounds/${n}`, `backgrounds/${n}.png`])),
  ...Object.fromEntries(
    MATERIALS.flatMap((m) =>
      BLOCK_SIZES.flatMap(([w, h]) => [
        [`blocks/${m}_${w}x${h}`, `blocks/${m}_${w}x${h}.png`],
        [`blocks/${m}_${w}x${h}_damaged`, `blocks/${m}_${w}x${h}_damaged.png`],
      ]),
    ),
  ),
  'blocks/wood_round': 'blocks/wood_round.png',
  'blocks/stone_round': 'blocks/stone_round.png',
  'blocks/metal_round': 'blocks/metal_round.png',
  'blocks/tnt': 'blocks/tnt.png',
  ...Object.fromEntries(['glass', 'wood', 'stone'].flatMap((m) => [1, 2, 3].map((i) => [`debris/${m}${i}`, `debris/${m}${i}.png`]))),
  ...Object.fromEntries(['starGold', 'starSilver', 'starBronze', 'flagRed', 'flagGreen', 'flagBlue', 'flagYellow'].map((n) => [`icons/${n}`, `icons/${n}.png`])),
  ...Object.fromEntries(
    ['cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5', 'cloud6', 'bush1', 'bush2', 'bush3', 'bush4', 'bushOrange1', 'bushOrange2',
      'cactus1', 'cactus2', 'tree', 'treePine', 'treeLong', 'treePalm', 'treeOrange', 'fence'].map((n) => [`scenery/${n}`, `scenery/${n}.png`]),
  ),
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`fx/explosion${i}`, `fx/explosion${i}.png`])),
  ...Object.fromEntries(['00', '04', '08', '12'].flatMap((i) => [[`fx/smoke${i}`, `fx/smoke${i}.png`], [`fx/puff${i}`, `fx/puff${i}.png`]])),
};

export class Assets {
  constructor(p) {
    this.p = p;
    this.images = {};
  }

  get(name) {
    const image = this.images[name];
    if (!image) throw new Error(`Unknown image: ${name}`);
    return image;
  }

  /** Loads everything; `onProgress(fraction)` after each file. */
  async load(onProgress = () => {}) {
    const entries = Object.entries(MANIFEST);
    let done = 0;
    await Promise.all(
      entries.map(
        ([name, file]) =>
          new Promise((resolve, reject) => {
            this.p.loadImage(
              BASE + file,
              (image) => {
                this.images[name] = image;
                onProgress(++done / entries.length);
                resolve();
              },
              () => reject(new Error(`Could not load ${file}`)),
            );
          }),
      ),
    );
    this.prepare();
    return this;
  }

  prepare() {
    this.images['fx/glow'] = radialSprite(this.p, 128, [[0, 'rgba(255,255,255,0.9)'], [0.35, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
    this.images['fx/glowCyan'] = radialSprite(this.p, 128, [[0, 'rgba(120,235,255,0.75)'], [0.45, 'rgba(58,211,255,0.35)'], [1, 'rgba(58,211,255,0)']]);
    this.images['fx/glowGold'] = radialSprite(this.p, 128, [[0, 'rgba(255,240,170,0.85)'], [0.45, 'rgba(255,204,51,0.4)'], [1, 'rgba(255,204,51,0)']]);
  }

  /**
   * Sprite for a block: the Kenney element whose aspect ratio is closest to
   * the block's (it is then stretched to the exact size).
   */
  blockSprite(material, w, h, damaged) {
    if (material === 'tnt') return this.get('blocks/tnt');
    const ratio = Math.log(w / h);
    let best = BLOCK_SIZES[0];
    for (const size of BLOCK_SIZES) {
      if (Math.abs(Math.log(size[0] / size[1]) - ratio) < Math.abs(Math.log(best[0] / best[1]) - ratio)) best = size;
    }
    return this.get(`blocks/${material}_${best[0]}x${best[1]}${damaged ? '_damaged' : ''}`);
  }

  /**
   * A seamless soil texture for a theme, generated once: base colour,
   * blotches, pebbles and specks, each wrapped across the tile edges.
   */
  soilPattern(theme, ctx) {
    this.soil ??= {};
    if (!this.soil[theme.id]) {
      const size = 256;
      const g = this.p.createGraphics(size, size);
      g.pixelDensity(1);
      g.background(theme.dirt);
      g.noStroke();
      const random = mulberry(theme.id.length * 977 + 13);
      const wrapped = (draw) => {
        for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) draw(dx, dy);
      };
      const shade = this.p.color(theme.dirtDark);
      shade.setAlpha(80);
      for (let i = 0; i < 24; i++) {
        const x = random() * size, y = random() * size, w = 30 + random() * 60, h = 12 + random() * 24;
        g.fill(shade);
        wrapped((dx, dy) => g.ellipse(x + dx, y + dy, w, h));
      }
      const pebble = this.p.color(theme.rock);
      for (let i = 0; i < 30; i++) {
        const x = random() * size, y = random() * size, r = 3 + random() * 6;
        wrapped((dx, dy) => {
          g.fill(0, 0, 0, 45);
          g.ellipse(x + dx + 1, y + dy + 2, r * 2.2, r * 1.6);
          g.fill(pebble);
          g.ellipse(x + dx, y + dy, r * 2.2, r * 1.6);
          g.fill(255, 255, 255, 50);
          g.ellipse(x + dx - r * 0.4, y + dy - r * 0.3, r * 0.9, r * 0.6);
        });
      }
      for (let i = 0; i < 240; i++) {
        g.fill(0, 0, 0, 20 + random() * 30);
        g.rect(random() * size, random() * size, 2, 2);
      }
      this.soil[theme.id] = ctx.createPattern(g.elt, 'repeat');
      g.remove();
    }
    return this.soil[theme.id];
  }
}

/** A square sprite with a radial gradient (glows, soft shadows). */
function radialSprite(p, size, stops) {
  const g = p.createGraphics(size, size);
  g.pixelDensity(1);
  const ctx = g.drawingContext;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return g;
}

/** Tiny seeded random generator (textures look the same on every visit). */
function mulberry(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

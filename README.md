# Spot On! 🎯

A physics slingshot puzzle made with **p5.js** and **Matter.js** for *Visual Computing (UNAL)*.
Fling the aliens and land them in the glowing spots. A ball has to **stay inside a spot for 3 seconds** to capture it.

**▶ Play:** https://danidiaztech.github.io/spot-on/

## How to play

| Input | Action |
| --- | --- |
| Drag (mouse or finger) | Pull back the slingshot. Release to shoot. The dots show the exact flight. |
| Tap / `Space` | Explode the green bomb ball mid-air |
| `R` | Restart |
| `P` / `Esc` | Pause |
| `M` | Mute |
| `V` | Physics view (draws the Matter.js bodies) |

- Capture **every spot** to finish a level. A captured spot stays captured, and each ball can capture only one spot.
- **Stars** depend on how many balls you used. Finishing a level unlocks the next one.

| Ball | Behaviour |
| --- | --- |
| 🔵 Blue | All-rounder |
| 🟡 Yellow | Very bouncy (restitution 0.88) |
| 🟤 Beige | Heavy (4× density): smashes blocks |
| 🩷 Pink | Sticky: welds itself to whatever it touches first |
| 🟢 Green | Bomb: tap to explode |

## Levels

| # | Level | Spots | Balls | ★★★ with | New ideas |
| --- | --- | --- | --- | --- | --- |
| 1 | First Contact | 2 | 4 | 2 balls | A valley and a ledge |
| 2 | Glass Fortress | 3 | 5 | 3 balls | Glass house, metal cup, wooden wall, TNT |
| 3 | Clockwork | 3 | 6 | 4 balls | Seesaw, wrecking ball, moving platform, bumper |

## Physics

| Feature | How it works |
| --- | --- |
| Simulation | Matter.js at a fixed **120 Hz** with extra solver iterations. Resting bodies sleep, so towers stay rock-steady. |
| Level start | Each level is pre-settled for 0.75 s with damage off, so every stack starts truly at rest. |
| Trajectory preview | A "ghost" ball flies in a private Matter.js engine with the same timestep, gravity and air friction. The dots match the real throw to under half a pixel. |
| Rolling | Matter.js has no rolling resistance, so balls in contact lose 0.4 % of their speed per step and come to rest naturally. |
| Damage | A hit carries energy ½·vₙ²·√(μ·m): normal speed vₙ, reduced mass μ, striker mass m. Blocks crack, then break. Glass is fragile, wood medium, stone tough, metal unbreakable. |
| Explosions | A radial velocity kick that falls off with distance and is stronger for light bodies, plus damage. TNT caught in a blast goes off a moment later (chain reactions). |
| Sticky ball | On first contact it creates a pin **constraint** to the body it hit (or freezes on static ground), so it rides seesaws and platforms. |
| Seesaw | A compound plank pinned to a pivot with a constraint |
| Pendulum | A stone ball on a distance constraint with no air drag |
| Moving platform | A static body moved every step with its velocity updated, so friction carries the balls on it |
| Bumper | Restitution 1.35 (adds energy) |

## Course topics used

| Topic | Where |
| --- | --- |
| Physics engines | Matter.js bodies, compound bodies, constraints, sleeping, collision events and filtering |
| Catmull-Rom splines | Level ground through designer control points (`src/world/Ground.js`) |
| De Casteljau / Bézier | Slingshot rubber bands (`src/render/SlingshotRenderer.js`) |
| `QUAD_STRIP` | Grass along the ground (`src/render/GroundRenderer.js`) |
| Retained mode | Backdrop, soil texture and glow sprites rendered once into buffers (`src/render/Assets.js`, `BackgroundRenderer.js`) |

## Run locally

It's a static site with no build step:

```bash
npx http-server .     # or: python3 -m http.server
```

## Code map

```
src/
  config.js        all tuning numbers
  data/            levels.js, balls.js
  main.js          p5 sketch → Game
  core/            Game (screens, input, effects), LevelSession (rules + physics), EventBus
  physics/         Matter.js engine wrapper (fixed timestep)
  world/           Ground (Catmull-Rom), LevelBuilder
  entities/        Ball, Block, Spot, Slingshot, Mechanisms (seesaw, pendulum, mover, bumper)
  systems/         Camera, Input, Audio, Storage
  render/          Assets, Background, Ground, Blocks, Mechanisms, Spots, Balls, Slingshot, Particles, physics view
  ui/              HUD and screens (DOM)
assets/            Kenney CC0 art and sound (see assets/CREDITS.md)
lib/               p5.min.js, matter.min.js (vendored)
```

Made by Daniel Díaz · Visual Computing 2026-2 · Universidad Nacional de Colombia

/**
 * Entry point: creates the p5 sketch (instance mode), loads the artwork with
 * a progress bar, then hands every frame to the Game controller.
 */
import { Game } from './core/Game.js';
import { Assets } from './render/Assets.js';

new window.p5((p) => {
  let game;

  p.setup = async () => {
    const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent('stage');
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    // No spaces: p5 would wrap the whole list in quotes as a single family name.
    p.textFont('Fredoka,sans-serif');

    const bar = document.getElementById('loading-fill');
    const assets = await new Assets(p).load((progress) => (bar.style.transform = `scaleX(${progress})`));
    document.getElementById('loading-screen').hidden = true;
    game = new Game(p, assets);

    // Read-only hook for automated tests and the browser console.
    window.spotOn = { snapshot: () => game.debugSnapshot() };
    // Extra controls for testing, only with ?debug=1 in the URL.
    if (new URLSearchParams(window.location.search).has('debug')) {
      window.spotOn.debug = {
        get game() {
          return game;
        },
        get session() {
          return game.session;
        },
        unlockAll: () => game.storage.unlockAll(),
        /** Fires the loaded ball with a launch angle (deg) and power (0..1). */
        shoot: (angleDeg, power) => {
          const { session } = game;
          const a = (angleDeg * Math.PI) / 180;
          const pull = 150 * power;
          session.slingshot.setPull(-Math.cos(a) * pull, -Math.sin(a) * pull);
          return session.launch();
        },
      };
    }
  };

  p.draw = () => {
    if (game) game.frame(p.deltaTime);
    else p.background('#1d2a3a');
  };

  p.windowResized = () => {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
    game?.resize();
  };
});

/**
 * Heads-up display (DOM over the canvas): level name, spot counter,
 * star target and the tray of remaining balls.
 */
const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.root = $('hud');
    this.level = $('hud-level');
    this.spots = $('hud-spots');
    this.target = $('hud-target');
    this.tray = $('ball-tray');
    this.hint = $('ball-hint');
    this.toasts = $('toasts');
    this.key = '';
  }

  show(visible) {
    this.root.hidden = !visible;
    $('ball-panel').hidden = !visible;
  }

  setLevel(level) {
    this.level.textContent = `${level.id} · ${level.name}`;
    this.target.textContent = `★★★ with ${level.stars.three} balls or fewer`;
    this.key = '';
  }

  /** @param {LevelSession} session */
  update(session) {
    // Rebuild only when something visible changed.
    const key = [
      session.spots.map((spot) => (spot.captured ? 1 : 0)).join(''),
      session.loaded?.id ?? '-',
      session.queue.map((ball) => ball.id).join(','),
      session.armedBomb ? 'bomb' : '',
    ].join('|');
    if (key === this.key) return;
    this.key = key;

    this.spots.replaceChildren(
      ...session.spots.map((spot) => {
        const dot = document.createElement('span');
        dot.className = `spot-dot${spot.captured ? ' is-captured' : ''}`;
        return dot;
      }),
    );
    this.spots.dataset.captured = String(session.spots.filter((spot) => spot.captured).length);

    const balls = [session.loaded, ...session.queue].filter(Boolean);
    this.tray.replaceChildren(
      ...balls.map((ball, i) => {
        const img = document.createElement('img');
        img.src = `assets/${ball.type.sprite}.png`;
        img.alt = ball.type.name;
        img.className = i === 0 && session.loaded ? 'tray-ball is-current' : 'tray-ball';
        return img;
      }),
    );
    this.tray.dataset.count = String(balls.length);

    const current = session.loaded;
    this.hint.textContent = session.armedBomb
      ? 'Tap to explode!'
      : current
        ? `${current.type.name}: ${current.type.hint}`
        : balls.length
          ? 'Reloading…'
          : 'No balls left';
  }

  toast(title, detail = '', tone = 'good') {
    const element = document.createElement('div');
    element.className = `toast toast--${tone}`;
    element.innerHTML = `<strong></strong>${detail ? '<span></span>' : ''}`;
    element.querySelector('strong').textContent = title;
    if (detail) element.querySelector('span').textContent = detail;
    this.toasts.append(element);
    element.addEventListener('animationend', () => element.remove());
    while (this.toasts.children.length > 3) this.toasts.firstElementChild.remove();
  }

  clearToasts() {
    this.toasts.replaceChildren();
  }
}

/**
 * Menu, level select, pause and result overlays (one visible at a time).
 */
import { LEVELS } from '../data/levels.js';

const $ = (id) => document.getElementById(id);

export class Screens {
  /** @param {{ onPlay, onSelectLevel, onBack, onResume, onRestart, onLevels, onNext, onPause, onMute }} actions */
  constructor(actions) {
    this.actions = actions;
    this.screens = {
      menu: $('menu-screen'),
      levels: $('levels-screen'),
      pause: $('pause-screen'),
      result: $('result-screen'),
    };
    const bind = (id, handler) => $(id).addEventListener('click', handler);
    bind('play-button', actions.onPlay);
    bind('levels-back-button', actions.onBack);
    bind('resume-button', actions.onResume);
    bind('pause-restart-button', actions.onRestart);
    bind('pause-levels-button', actions.onLevels);
    bind('next-button', actions.onNext);
    bind('retry-button', actions.onRestart);
    bind('result-levels-button', actions.onLevels);
    bind('pause-button', actions.onPause);
    bind('restart-button', actions.onRestart);
    bind('mute-button', actions.onMute);
  }

  show(name) {
    for (const [key, element] of Object.entries(this.screens)) element.hidden = key !== name;
    const primary = name && [...this.screens[name].querySelectorAll('.button--primary')].find((b) => !b.hidden && !b.disabled);
    primary?.focus({ preventScroll: true });
  }

  /** @param {Storage} storage */
  renderLevels(storage) {
    $('level-cards').replaceChildren(
      ...LEVELS.map((level) => {
        const locked = !storage.isUnlocked(level.id);
        const stars = storage.starsFor(level.id);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `level-card${locked ? ' is-locked' : ''}`;
        card.dataset.testid = `level-${level.id}`;
        card.disabled = locked;
        card.style.backgroundImage = `url(assets/${level.backdrop}.png)`;
        card.innerHTML = `
          <span class="level-card__number"></span>
          <span class="level-card__name"></span>
          <span class="level-card__stars"></span>`;
        card.querySelector('.level-card__number').textContent = locked ? '🔒' : String(level.id);
        card.querySelector('.level-card__name').textContent = level.name;
        card.querySelector('.level-card__stars').innerHTML = [1, 2, 3]
          .map((n) => `<span class="star${n <= stars ? ' is-on' : ''}">★</span>`)
          .join('');
        card.addEventListener('click', () => this.actions.onSelectLevel(level.id));
        return card;
      }),
    );
  }

  /**
   * @param {{ outcome, stars, used }} result
   * @param {{ level, hasNext, newBest }} info
   */
  setResult(result, { level, hasNext, newBest }) {
    const won = result.outcome === 'won';
    $('result-title').textContent = won ? (hasNext ? 'Level complete!' : 'You beat every level!') : 'Out of balls';
    $('result-subtitle').textContent = won
      ? `${level.name} · ${result.used} ${result.used === 1 ? 'ball' : 'balls'} used`
      : 'Every spot needs a ball resting in it for 3 seconds.';
    const stars = $('result-stars');
    stars.hidden = !won;
    stars.replaceChildren(
      ...[1, 2, 3].map((n) => {
        const star = document.createElement('span');
        star.className = `big-star${n <= result.stars ? ' is-on' : ''}`;
        star.style.animationDelay = `${0.25 + n * 0.25}s`;
        star.textContent = '★';
        return star;
      }),
    );
    stars.dataset.stars = String(result.stars);
    $('result-badge').hidden = !newBest;
    $('next-button').hidden = !won;
    $('next-button').textContent = hasNext ? 'Next level' : 'All levels';
    $('retry-button').textContent = won ? 'Replay' : 'Try again';
    $('retry-button').classList.toggle('button--primary', !won);
  }

  setMuted(muted) {
    const button = $('mute-button');
    button.setAttribute('aria-pressed', String(muted));
    button.textContent = muted ? '🔇' : '🔊';
  }
}

/**
 * Saves the best stars per level and settings in localStorage. Storage may
 * be unavailable (private mode), so every access is wrapped.
 */
import { STORAGE_KEY } from '../config.js';

export class Storage {
  constructor() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    } catch {
      saved = {};
    }
    this.data = { stars: {}, muted: false, ...saved };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Progress simply won't survive a reload.
    }
  }

  starsFor(levelId) {
    return this.data.stars[levelId] ?? 0;
  }

  /** Level n is open once level n - 1 has at least one star. */
  isUnlocked(levelId) {
    return levelId === 1 || this.starsFor(levelId - 1) > 0;
  }

  /** @returns {boolean} true if this is a new best */
  recordStars(levelId, stars) {
    const best = this.starsFor(levelId);
    if (stars <= best) return false;
    this.data.stars[levelId] = stars;
    this.save();
    return true;
  }

  get muted() {
    return this.data.muted;
  }

  set muted(value) {
    this.data.muted = value;
    this.save();
  }

  unlockAll() {
    for (const id of [1, 2]) this.data.stars[id] = Math.max(1, this.starsFor(id));
    this.save();
  }
}

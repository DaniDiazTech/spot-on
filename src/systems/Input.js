/**
 * Pointer (mouse / touch / pen) and keyboard input.
 *
 * Aiming: press anywhere on the playfield and drag; the ball follows the
 * drag (pull back to throw forward). Releasing throws. While a bomb ball is
 * flying, a tap (or Space) detonates it.
 */
const ACTION_KEYS = {
  Space: 'action',
  Enter: 'confirm',
  KeyR: 'restart',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
  KeyV: 'physics',
};

export class Input {
  /**
   * @param {HTMLElement} surface  element receiving pointer events (the canvas)
   * @param {{ onPress, onDrag, onRelease, onCancel, onAction }} handlers
   */
  constructor(surface, handlers) {
    this.handlers = handlers;
    this.pointerId = null;

    surface.addEventListener('pointerdown', (event) => {
      if (this.pointerId !== null) return;
      this.pointerId = event.pointerId;
      try {
        surface.setPointerCapture?.(event.pointerId);
      } catch {
        // Capture can fail for synthetic or already-released pointers; dragging still works.
      }
      event.preventDefault();
      handlers.onPress(point(event));
    });
    surface.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.pointerId) return;
      handlers.onDrag(point(event));
    });
    const end = (event) => {
      if (event.pointerId !== this.pointerId) return;
      this.pointerId = null;
      handlers.onRelease(point(event));
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', (event) => {
      if (event.pointerId !== this.pointerId) return;
      this.pointerId = null;
      handlers.onCancel();
    });
    surface.addEventListener('contextmenu', (event) => event.preventDefault());

    window.addEventListener('keydown', (event) => {
      const action = ACTION_KEYS[event.code];
      if (!action || event.repeat) return;
      event.preventDefault();
      handlers.onAction(action);
    });
    window.addEventListener('blur', () => {
      if (this.pointerId !== null) {
        this.pointerId = null;
        handlers.onCancel();
      }
    });
  }
}

function point(event) {
  const rect = event.target.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

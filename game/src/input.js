// input.js — keyboard and mouse state for the whole game.
// Held keys and the mouse are polled every frame; one-shot presses (interact, pause,
// confirm, weapon swap) are queued as bit flags and taken exactly once by the loop,
// so a press between frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_WEAPON_NEXT = 8;
export const ACTION_RESTART = 16;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const INTERACT = new Set(['KeyF', 'KeyE']);
const WEAPON_NEXT = new Set(['KeyQ', 'Tab']);
const RESTART = new Set(['KeyR']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false };

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (INTERACT.has(event.code)) { if (!event.repeat) actions |= ACTION_INTERACT; }
    else if (WEAPON_NEXT.has(event.code)) { if (!event.repeat) actions |= ACTION_WEAPON_NEXT; }
    else if (RESTART.has(event.code)) { if (!event.repeat) actions |= ACTION_RESTART; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { held.delete(event.code); });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => { held.clear(); mouse.down = false; });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouse.down = true;
    mouse.x = event.offsetX;
    mouse.y = event.offsetY;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    /** True while a key code (for example 'KeyW') is held down. */
    down(code) { return held.has(code); },
    /** Movement axes from WASD or the arrow keys: x right, y down, each -1..1. */
    moveAxis() {
      const x = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      const y = (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) - (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    sprint() { return held.has('ShiftLeft') || held.has('ShiftRight'); },
    brake() { return held.has('Space'); },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

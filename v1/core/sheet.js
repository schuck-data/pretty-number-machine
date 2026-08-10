// Phone bottom-sheet behaviour: initial state and drag-to-resize.
//
// Deliberately separate from panel.js. This owns *where the sheet sits*, not
// what is in it, and panel.js is already coupled tightly enough to the markup
// without adding layout state to it.
//
// The single source of truth is the CSS custom property --sheet-h. The CSS
// uses it for both the sheet's height and the viewport's bottom edge, so
// changing it here moves both together and they cannot drift apart. The
// renderer picks up the new viewport size through its own ResizeObserver — no
// wiring needed between this file and the scene.

const PHONE = '(max-width: 640px)';

// Bounds as a fraction of viewport height. Below the minimum the sheet is
// too small to hold a section; above the maximum there is no visualisation
// left to look at, which defeats the point of resizing it.
const MIN_FRACTION = 0.25;
const MAX_FRACTION = 0.85;

let grip = null;

const isPhone = () => window.matchMedia(PHONE).matches;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function currentSheetPx() {
  const panel = document.getElementById('panel');
  // Read the rendered height rather than parsing the custom property: the
  // property may still be the CSS default (a vh string) and never have been
  // set by us at all.
  return panel ? panel.getBoundingClientRect().height : 0;
}

function setSheetPx(px) {
  const bounded = clamp(px, window.innerHeight * MIN_FRACTION,
                            window.innerHeight * MAX_FRACTION);
  document.documentElement.style.setProperty('--sheet-h', `${Math.round(bounded)}px`);
}

function beginDrag(startEvent) {
  if (!isPhone()) return;
  const panel = document.getElementById('panel');
  if (!panel || panel.classList.contains('collapsed')) return;

  startEvent.preventDefault();
  const startY = startEvent.clientY;
  const startPx = currentSheetPx();

  grip.classList.add('dragging');
  document.documentElement.classList.add('sheet-resizing');
  grip.setPointerCapture(startEvent.pointerId);

  const onMove = (e) => {
    // Dragging up grows the sheet, so the delta is inverted.
    setSheetPx(startPx + (startY - e.clientY));
  };

  const onEnd = () => {
    grip.classList.remove('dragging');
    document.documentElement.classList.remove('sheet-resizing');
    grip.removeEventListener('pointermove', onMove);
    grip.removeEventListener('pointerup', onEnd);
    grip.removeEventListener('pointercancel', onEnd);
  };

  grip.addEventListener('pointermove', onMove);
  grip.addEventListener('pointerup', onEnd);
  grip.addEventListener('pointercancel', onEnd);
}

export function initSheet() {
  const panel = document.getElementById('panel');
  if (!panel) return;

  // Open to the visualisation, not to a wall of controls. Runs before the
  // renderer initialises so the scene is never sized against the wrong box.
  // Matches the CSS breakpoint above — keep the two in step.
  if (isPhone()) {
    panel.classList.add('collapsed');
    const toggle = document.getElementById('panel-toggle');
    if (toggle) toggle.textContent = '▸';
  }

  grip = document.createElement('div');
  grip.id = 'sheet-grip';
  grip.setAttribute('role', 'separator');
  grip.setAttribute('aria-orientation', 'horizontal');
  grip.setAttribute('aria-label', 'Resize control panel');
  grip.setAttribute('title', 'Drag to resize');
  grip.addEventListener('pointerdown', beginDrag);
  // Sibling of #panel so the CSS sibling selectors that position it against
  // the sheet keep working.
  panel.parentNode.insertBefore(grip, panel.nextSibling);

  // An explicit pixel height set in portrait is wrong after a rotation, and a
  // height set on a phone is meaningless once the layout is a desktop
  // sidebar. Re-clamp on resize, and drop the override entirely off-phone.
  window.addEventListener('resize', () => {
    if (!isPhone()) {
      document.documentElement.style.removeProperty('--sheet-h');
      return;
    }
    const set = document.documentElement.style.getPropertyValue('--sheet-h');
    if (set) setSheetPx(parseFloat(set));
  });
}

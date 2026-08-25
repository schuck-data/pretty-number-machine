// PNM — sliders that do not steal a scroll.
//
// DEV: the problem, measured on a Pixel 7 rather than assumed. A range input
// sets its value on touch-DOWN, jumping the thumb to wherever the finger
// landed. So merely resting a finger on a slider to begin scrolling the panel
// teleports the value, before any direction has been expressed. `touch-action:
// pan-y` does NOT fix this: it stops the slider capturing the vertical drag,
// which it does correctly, but the jump has already happened.
//
// DEV: and it cannot be prevented. Probing the live events gives
//
//     pointerdown  cancelable=true   pointerType=touch  defaultPrevented=true
//     touchstart   cancelable=false
//
// -- preventDefault() on pointerdown runs and changes nothing, because the
// value is set on the touchstart path, and Chrome has made touchstart NON-
// CANCELABLE precisely because touch-action already declared that panning is
// allowed. There is no event left to cancel.
//
// So the input must not receive the touch at all. index.html gives every range
// input `pointer-events: none` and this module drives them instead:
//
//   TOUCH  needs a horizontal drag. A press that goes vertical is a scroll and
//          the slider never moves; a press that goes nowhere does nothing.
//          Dragging is how a slider is used on a phone anyway.
//   MOUSE  keeps click-to-position and drag, because a mouse has no scroll
//          gesture to be confused with.
//
// Values are written to the real input and a real `input` event is dispatched,
// so every listener panel.js already registered fires unchanged. Same shape as
// core/dropdown.js: drive the native control, do not replace it.

const THUMB_W = 12;          // matches ::-webkit-slider-thumb in index.html
const INTENT = 6;            // px of travel before a gesture has a direction

function sliderAt(x, y) {
  for (const el of document.querySelectorAll('input[type=range]')) {
    if (el.disabled) continue;
    const r = el.getBoundingClientRect();
    if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el;
  }
  return null;
}

function valueAt(el, clientX) {
  const r = el.getBoundingClientRect();
  const min = el.min === '' ? 0 : +el.min;
  const max = el.max === '' ? 100 : +el.max;
  const step = el.step === '' || el.step === 'any' ? 1 : +el.step;
  // The thumb has width, so the track a value can occupy is inset by half of it
  // at each end -- without this the extremes are unreachable and everything in
  // between is off by a few pixels.
  const usable = Math.max(1, r.width - THUMB_W);
  const frac = Math.max(0, Math.min(1, (clientX - (r.left + THUMB_W / 2)) / usable));
  const raw = min + frac * (max - min);
  const snapped = Math.round(raw / step) * step;
  // toFixed then unary + : 0.1 steps otherwise accumulate float dust and the
  // value reads as 1.7000000000000002 in the label beside it.
  return String(Math.max(min, Math.min(max, +snapped.toFixed(6))));
}

export function installSliderGuard() {
  // THE pan-y HAS TO MOVE WITH THE TOUCH. It used to sit on the input, which
  // was right while the input received the gesture. It no longer does --
  // pointer-events: none sends the touch to the PARENT, and a parent at the
  // default `touch-action: auto` lets the browser claim horizontal panning.
  // Measured: a drag from the thumb travelled ten pixels and then the browser
  // fired pointercancel and took the gesture, so the slider moved 1 -> 1.1 and
  // stopped. Declaring pan-y on the element that actually gets touched tells
  // the browser that vertical is its business and horizontal is ours.
  //
  // Done in JS rather than CSS so it follows the sliders, including the ones
  // modules build for themselves, instead of relying on a selector matching
  // every container anybody ever wraps one in.
  const claim = () => {
    for (const el of document.querySelectorAll('input[type=range]')) {
      const host = el.parentElement;
      if (host && host.style.touchAction !== 'pan-y') host.style.touchAction = 'pan-y';
    }
  };
  claim();
  // Module controls are built after this runs, so sweep again once the panel
  // has settled. Cheap, and it saves an ordering dependency.
  setTimeout(claim, 0);
  window.addEventListener('load', claim, { once: true });

  let g = null;   // the gesture in progress

  const write = (el, x) => {
    const v = valueAt(el, x);
    if (el.value === v) return;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  document.addEventListener('pointerdown', (e) => {
    const el = sliderAt(e.clientX, e.clientY);
    if (!el) return;
    g = { el, x0: e.clientX, y0: e.clientY, id: e.pointerId, armed: e.pointerType === 'mouse', moved: false };
    if (g.armed) { write(el, e.clientX); g.moved = true; }
  }, { capture: true });

  window.addEventListener('pointermove', (e) => {
    if (!g || e.pointerId !== g.id) return;
    if (!g.armed) {
      const dx = Math.abs(e.clientX - g.x0), dy = Math.abs(e.clientY - g.y0);
      // Vertical first means the panel wanted this gesture. Let go completely:
      // the browser is already scrolling, and the slider must not join in later
      // when the finger inevitably drifts sideways.
      if (dy > dx && dy > INTENT) { g = null; return; }
      if (dx <= INTENT) return;
      g.armed = true;
    }
    g.moved = true;
    write(g.el, e.clientX);
  });

  const finish = () => {
    if (g && g.moved) g.el.dispatchEvent(new Event('change', { bubbles: true }));
    g = null;
  };
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
}

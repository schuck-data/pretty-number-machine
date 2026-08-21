// PNM — Notices: the fatal error boundary.
//
// DEV: this file used to hold two things, an update prompt and an error
// boundary. The prompt is gone in the app build. It existed to tell an
// installed web app that its service worker had cached a newer version, and
// neither half of that sentence is true here: there is no service worker, and
// updates arrive through the Play Store, which announces them itself. Keeping
// it would have meant a button offering to "reload" into the same code.
//
// The boundary stays, and matters more here than it did on the web. A web page
// that breaks still has an address bar, a reload button and a console. An
// installed app has a black rectangle and no way out.
//
// DEV: deliberately dependency-free — no Three.js, no state.js, no event bus.
// This module has to be able to run when the rest of the app has already
// failed, so it must not import anything that could be the thing that failed.
// Adding an import here is almost always a mistake.

const ACCENT = 'rgba(191, 199, 209, 0.9)';
const BG = 'rgba(12, 12, 15, 0.92)';
const TEXT = '#e0ddd5';
const FONT = "'Space Grotesk', system-ui, -apple-system, sans-serif";

// ============================================================
// FATAL ERROR BOUNDARY  (V1-PLAN item 8)
// ============================================================
// Modules already fail safely — the registry disables a module that throws and
// the app carries on. The uncovered case is the renderer itself: if buildScene()
// or init() throws, every catch in the project is upstream of the failure and
// the user gets a black screen with no explanation.
//
// This does not attempt recovery. It tells the truth and offers the one action
// that sometimes helps, which is worth more than a blank rectangle.

let fatalEl = null;

export function showFatalError(err) {
  if (fatalEl) return;                        // first failure wins; later ones
                                              // are usually consequences of it

  fatalEl = document.createElement('div');
  fatalEl.id = 'pnm-fatal';
  fatalEl.setAttribute('role', 'alert');
  fatalEl.style.cssText = `
    position: fixed; inset: 0; z-index: 300;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; background: #0c0c0f;
    font-family: ${FONT}; color: ${TEXT};
  `;

  const box = document.createElement('div');
  box.style.cssText = 'max-width: 30rem; text-align: left;';

  const h = document.createElement('h1');
  h.textContent = 'Pretty Number Machine could not start.';
  h.style.cssText = `
    margin: 0 0 0.6em; font-size: clamp(1.15rem, 1rem + 1vw, 1.5rem);
    font-weight: 500; line-height: 1.25; color: ${ACCENT};
  `;

  const p = document.createElement('p');
  p.textContent = 'Something went wrong while building the visualisation. '
    + 'Reloading usually fixes it. If it keeps happening, the details below '
    + 'are what to send on.';
  p.style.cssText = 'margin: 0 0 1.2em; line-height: 1.6; font-weight: 300;';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Reload';
  btn.style.cssText = `
    min-height: 40px; padding: 0 18px; margin-bottom: 1.4em;
    background: transparent; border: 1px solid ${ACCENT}; border-radius: 8px;
    color: ${ACCENT}; font-family: inherit; font-size: 14px; font-weight: 600;
    cursor: pointer;
  `;
  // DEV: still location.reload() in the shell. Capacitor serves the bundled
  // assets from https://localhost, so this re-requests them from the APK — a
  // genuine fresh start of the web layer, not a no-op.
  btn.addEventListener('click', () => location.reload());

  // DEV: textContent, never innerHTML: this string comes from an exception, and
  // an error boundary that can itself be an injection vector is worse than none.
  const detail = document.createElement('pre');
  detail.textContent = String((err && (err.stack || err.message)) || err || 'Unknown error');
  detail.style.cssText = `
    margin: 0; padding: 12px; max-height: 40vh; overflow: auto;
    background: rgba(200,220,230,0.04);
    border: 1px solid rgba(180,200,210,0.12); border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px; line-height: 1.5; color: rgba(224,221,213,0.6);
    white-space: pre-wrap; word-break: break-word;
  `;

  box.append(h, p, btn, detail);
  fatalEl.appendChild(box);
  document.body.appendChild(fatalEl);
}

// Catches failures that escape the bootstrap's own try/catch — an exception
// thrown from a later animation frame, or a rejected promise nobody awaited.
//
// Gated on `hasRendered`: once the app is up and drawing, a stray rejection
// from some peripheral feature must NOT blank a working visualisation. This
// boundary is for "never started", not for "hit a bump while running".
let hasRendered = false;
export function markRendered() { hasRendered = true; }

export function installGlobalErrorBoundary() {
  addEventListener('error', (e) => {
    if (!hasRendered) showFatalError(e.error || e.message);
  });
  addEventListener('unhandledrejection', (e) => {
    if (!hasRendered) showFatalError(e.reason);
  });
}

// BG is retained above because the update prompt used it and a later notice
// (an achievement toast, say — docs/ANDROID-BUILD.md §3) will want the same
// surface treatment. If nothing claims it by the time achievements land,
// delete it.
void BG;

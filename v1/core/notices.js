// PNM V5 — Notices: the update prompt and the fatal error boundary.
//
// Both are chrome that lives OUTSIDE the scene, and both exist for the same
// reason: an installed app has no browser furniture to fall back on. A web page
// that breaks still has an address bar, a reload button and a console. A TWA
// has a black rectangle and no way out.
//
// Deliberately dependency-free — no Three.js, no state.js, no event bus. This
// module has to be able to run when the rest of the app has already failed, so
// it must not import anything that could be the thing that failed.

const ACCENT = 'rgba(61, 219, 217, 0.9)';
const BG = 'rgba(12, 12, 15, 0.92)';
const TEXT = '#e0ddd5';
const FONT = "'Space Grotesk', system-ui, -apple-system, sans-serif";

// ============================================================
// UPDATE PROMPT  (V1-PLAN item 5)
// ============================================================
// Since v0.14.4 the service worker activates a new version immediately but does
// not claim pages already running, so a browser picks up an update on its next
// navigation. That is fine for a tab and useless for an installed app: a TWA
// has no refresh button, and someone can leave it open for weeks. Without this
// prompt, such a copy never learns there is anything newer.
//
// The prompt does not reload anything on its own. Swapping the app under a live
// WebGL scene is the failure the whole worker design avoids, so the reload is a
// deliberate tap, taken when the user is ready.

let promptEl = null;

export function showUpdatePrompt(onReload) {
  if (promptEl) return;                       // never stack two

  promptEl = document.createElement('div');
  promptEl.id = 'pnm-update-prompt';
  promptEl.setAttribute('role', 'status');
  // polite, not assertive: this is worth knowing, not worth interrupting.
  promptEl.setAttribute('aria-live', 'polite');
  promptEl.style.cssText = `
    position: fixed; z-index: 200;
    top: calc(12px + env(safe-area-inset-top));
    left: 50%; transform: translateX(-50%) translateY(-12px);
    display: flex; align-items: center; gap: 12px;
    max-width: min(92vw, 420px);
    padding: 10px 12px 10px 16px;
    background: ${BG}; backdrop-filter: blur(16px);
    border: 1px solid ${ACCENT}; border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    font-family: ${FONT}; font-size: 14px; font-weight: 300; color: ${TEXT};
    opacity: 0; transition: opacity 0.25s, transform 0.25s;
  `;

  const label = document.createElement('span');
  label.textContent = 'A new version is ready.';
  label.style.cssText = 'flex: 1; line-height: 1.3;';

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Reload';
  reload.style.cssText = `
    flex-shrink: 0; min-height: 34px; padding: 0 14px;
    background: transparent; border: 1px solid ${ACCENT}; border-radius: 7px;
    color: ${ACCENT}; font-family: inherit; font-size: 13px; font-weight: 600;
    cursor: pointer;
  `;
  reload.addEventListener('click', () => {
    dismissUpdatePrompt();
    if (onReload) onReload(); else location.reload();
  });

  const later = document.createElement('button');
  later.type = 'button';
  later.setAttribute('aria-label', 'Dismiss');
  later.textContent = '×';
  later.style.cssText = `
    flex-shrink: 0; width: 30px; height: 30px; padding: 0;
    background: transparent; border: none; border-radius: 6px;
    color: rgba(224,221,213,0.5); font-family: inherit; font-size: 20px;
    line-height: 1; cursor: pointer;
  `;
  later.addEventListener('click', dismissUpdatePrompt);

  promptEl.append(label, reload, later);
  document.body.appendChild(promptEl);

  // Next frame, so the transition has a start state to animate from.
  requestAnimationFrame(() => {
    if (!promptEl) return;
    promptEl.style.opacity = '1';
    promptEl.style.transform = 'translateX(-50%) translateY(0)';
  });
}

export function dismissUpdatePrompt() {
  if (!promptEl) return;
  const el = promptEl;
  promptEl = null;
  el.style.opacity = '0';
  el.style.transform = 'translateX(-50%) translateY(-12px)';
  setTimeout(() => el.remove(), 300);
}

// Wire the prompt to a service worker registration.
//
// Two ways an update becomes visible, and both are needed:
//
//   1. It lands while this page is open — `updatefound`, then the new worker
//      reaches 'activated'. Note we cannot listen for `controllerchange`,
//      because the worker deliberately does NOT claim running pages.
//
//   2. It landed before this page loaded. The page is then controlled by the
//      OLD worker while the registration's active worker is already the new
//      one. Comparing the two catches what no event will fire for.
//
// Both are guarded on there being a controller at all: on a first-ever visit
// the worker is simply installing, and announcing "a new version is ready"
// to someone who just arrived would be nonsense.
export function watchForUpdates(registration) {
  if (!registration || !navigator.serviceWorker) return;

  // The signal is the `updatefound` EVENT, and the question is whether this
  // page was already controlled at the moment it fired.
  //
  // That timing is the whole trick, and it took four attempts to find. The
  // failures are recorded because each looked obviously right:
  //
  //   1. "Is there a controller when the new worker ACTIVATES?" — fires on a
  //      first visit. The worker calls clients.claim() during its own
  //      activation, so a controller exists by then, and brand-new arrivals
  //      were told a new version was ready.
  //
  //   2. "Was there a controller when watching began?" — suppresses a real
  //      update. On a first visit that is false for the whole session, so an
  //      update arriving minutes later was silently swallowed.
  //
  //   3. "Which worker was in charge when watching began?" — same failure via
  //      a null baseline being read as "first install, never announce".
  //
  //   4. "Does registration.active differ from navigator.serviceWorker
  //      .controller?" — the tidiest-looking of the lot, and it never fires.
  //      Both generations are served from the same script URL, and the browser
  //      hands back the SAME ServiceWorker object for both, so the comparison
  //      is always false. Object identity cannot see a version change here.
  //
  // `updatefound` fires when a new worker starts installing, which is BEFORE
  // any activation and therefore before any claim. So at that instant the
  // controller is null on a first install and non-null on a genuine update —
  // exactly the distinction needed, with no identity comparison at all.
  const announceIfUpdate = (wasControlled) => {
    if (wasControlled) showUpdatePrompt();
  };

  // An update that landed BEFORE this page loaded needs no prompt: with
  // skipWaiting the new worker is already active, so the navigation that
  // created this page was served by it. The page is the new version already.
  //
  // So there is only one case to handle — an update arriving while we are open.
  registration.addEventListener('updatefound', () => {
    // Sampled here, at `updatefound`, and not later. See the note above: this
    // is the one moment that reliably distinguishes a first install from an
    // update, because no claim has run yet.
    const wasControlled = !!navigator.serviceWorker.controller;

    const incoming = registration.installing;
    if (!incoming) return;

    incoming.addEventListener('statechange', () => {
      // 'activated' rather than 'installed': skipWaiting() sends the new worker
      // straight through, and at 'installed' its cache is not yet the one that
      // would be served, so offering a reload then could hand back the old
      // version anyway.
      if (incoming.state === 'activated') announceIfUpdate(wasControlled);
    });
  });
}

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
  btn.addEventListener('click', () => location.reload());

  // textContent, never innerHTML: this string comes from an exception, and an
  // error boundary that can itself be an injection vector is worse than none.
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

// PNM V5 — Side Panel UI
import {
  state, emit, getModules, MAX_N, SLIDER_MAX_N, AUTO_N_MAX,
  HOT_KEYS, DEFAULT_CONFIG,
} from './state.js';
import { FIRST_PRIMES, getPrimeRGB, GOLDEN_ANGLE } from './math.js';
import { getShapes, getMaxDim, getMinDim } from './positions.js';
import {
  update, resolveN, getInfo, buildScene, resetMorph, setCameraTopDown, resetCamera,
} from './renderer.js';

const $ = id => document.getElementById(id);

// The grid offers 32 of the 33 primes math.js knows about. 137 is omitted so
// the fully expanded grid ends exactly on All / None / Less instead of
// spilling one lone button onto a sixth row. FIRST_PRIMES itself is left
// intact — info.js derives prime ordinals from it by index, and truncating it
// would silently break the readout for 137.
const SELECTABLE_PRIMES = FIRST_PRIMES.slice(0, 32);

// How many prime buttons are visible at each expansion step. Chosen so that
// each step plus the three trailing buttons fills whole rows of seven, which
// is what a phone fits. A narrower panel wraps differently; the counts stay
// sensible, the row arithmetic just stops being exact.
const PRIME_TIERS = [11, 18, 25, SELECTABLE_PRIMES.length];
let primeTier = 0;

// Node size is auto-derived from N until the user moves the slider, after
// which it is theirs and we stop touching it.
let nodeSizeUserSet = false;

let selectedPrimes = [...state.primes];
let rebuildTimeout = null;

function scheduleRebuild() {
  if (rebuildTimeout) clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(() => {
    state.primes = [...selectedPrimes];
    const N = resolveN();
    state.N = $('auto-n').checked ? null : Math.max(1, +$('n-input').value || 1);
    state.colorScheme = $('color-scheme').value;
    state.backgroundStyle = $('background-style').value;
    state.nodeSize = +$('node-size').value;
    state.showNodes = $('show-nodes').checked;
    state.showAllIntegers = $('show-all-integers').checked;
    state.showZero = $('show-zero').checked;
    state.showOne = $('show-one').checked;
    state.showPrimes = $('filter-primes').checked;
    state.showPowers = $('filter-powers').checked;
    state.showComposites = $('filter-composites').checked;
    state.showCurves = $('show-curves').checked;
    state.primeGlow = $('prime-glow').checked;
    state.primeGlowIntensity = +$('prime-glow-intensity').value;
    state.zeroGlow = $('zero-glow').checked;
    state.zeroGlowIntensity = +$('zero-glow-intensity').value;
    state.lineWidth = +$('line-width').value;

    buildScene();
    updatePrimeColors();
    updateStatus();
    updateModuleStates();
  }, 120);
}

function updateStatus() {
  const info = getInfo();
  $('status').textContent = `${info.nodeCount} nodes · N=${info.N} · primes: ${info.primes.join(', ')}`;
}

// ============================================================
// PRIME GRID
// ============================================================
function buildPrimeGrid() {
  const grid = $('prime-grid');
  SELECTABLE_PRIMES.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'prime-btn';
    btn.textContent = p;
    btn.dataset.prime = p;
    if (selectedPrimes.includes(p)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      updateSelectedPrimes();
      scheduleRebuild();
    });
    grid.appendChild(btn);
  });

  const allBtn = document.createElement('button');
  allBtn.className = 'grid-btn';
  allBtn.id = 'all-btn';
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', () => {
    grid.querySelectorAll('.prime-btn').forEach(b => b.classList.add('active'));
    // Selecting everything while most of it is hidden would be a lie about
    // what is switched on, so expand to show what was just selected.
    primeTier = PRIME_TIERS.length - 1;
    applyPrimeTier();
    updateSelectedPrimes();
    scheduleRebuild();
  });
  grid.appendChild(allBtn);

  const noneBtn = document.createElement('button');
  noneBtn.className = 'grid-btn';
  noneBtn.textContent = 'None';
  noneBtn.addEventListener('click', () => {
    grid.querySelectorAll('.prime-btn').forEach(b => b.classList.remove('active'));
    updateSelectedPrimes();
    scheduleRebuild();
  });
  grid.appendChild(noneBtn);

  const moreBtn = document.createElement('button');
  moreBtn.className = 'grid-btn';
  moreBtn.id = 'more-btn';
  moreBtn.addEventListener('click', () => {
    primeTier = (primeTier >= PRIME_TIERS.length - 1)
      ? smallestTierShowingSelection()   // "Less" — but never hide a live prime
      : primeTier + 1;
    applyPrimeTier();
  });
  grid.appendChild(moreBtn);

  applyPrimeTier();
}

// Collapsing must never leave a selected prime switched on but invisible —
// the render would show factors the user cannot see or unselect. So "Less"
// falls back to the smallest step that still displays everything active.
function smallestTierShowingSelection() {
  const needed = selectedPrimes.reduce(
    (max, p) => Math.max(max, SELECTABLE_PRIMES.indexOf(p) + 1), 0);
  const i = PRIME_TIERS.findIndex(t => t >= needed);
  return i === -1 ? PRIME_TIERS.length - 1 : i;
}

function applyPrimeTier() {
  const grid = $('prime-grid');
  const shown = PRIME_TIERS[primeTier];
  grid.querySelectorAll('.prime-btn').forEach((btn, i) => {
    btn.classList.toggle('tier-hidden', i >= shown);
  });
  const moreBtn = $('more-btn');
  if (moreBtn) {
    const expanded = primeTier >= PRIME_TIERS.length - 1;
    moreBtn.textContent = expanded ? 'Less' : 'More';
    moreBtn.title = expanded
      ? 'Show fewer primes'
      : `Show more primes (${PRIME_TIERS[primeTier + 1] - shown} more)`;
  }
}

function updateSelectedPrimes() {
  const grid = $('prime-grid');
  selectedPrimes = [];
  grid.querySelectorAll('.prime-btn.active').forEach(b => {
    if (b.dataset.prime) selectedPrimes.push(+b.dataset.prime);
  });
  selectedPrimes.sort((a, b) => a - b);
  updatePrimeColors();
  updateAllBtnHighlight();
  updateN();
}

function updateAllBtnHighlight() {
  const allBtn = $('all-btn');
  if (!allBtn) return;
  const allActive = selectedPrimes.length === SELECTABLE_PRIMES.length;
  allBtn.classList.toggle('active', allActive);
}

function updatePrimeColors() {
  const grid = $('prime-grid');
  const colors = getPrimeRGB(selectedPrimes, $('color-scheme').value);
  grid.querySelectorAll('.prime-btn').forEach(btn => {
    const p = +btn.dataset.prime;
    if (selectedPrimes.includes(p) && colors[p]) {
      const c = colors[p];
      const r = Math.round(c[0] * 255), g = Math.round(c[1] * 255), b = Math.round(c[2] * 255);
      const tooFaint = r + g + b < 180;
      if (tooFaint) {
        btn.style.background = 'rgba(255,255,255,0.12)';
        btn.style.borderColor = 'rgba(255,255,255,0.4)';
        btn.style.color = 'rgba(224,221,213,0.8)';
      } else {
        btn.style.background = `rgba(${r},${g},${b},0.3)`;
        btn.style.borderColor = `rgba(${r},${g},${b},0.7)`;
        btn.style.color = `rgb(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)})`;
      }
    } else {
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  });
}

// ============================================================
// N CONTROLS
// ============================================================
function updateN() {
  $('n-input').max = MAX_N;
  $('n-slider').max = SLIDER_MAX_N;

  let n;
  if ($('auto-n').checked && selectedPrimes.length > 0) {
    n = selectedPrimes.reduce((a, b) => a * b, 1);
    if (n > AUTO_N_MAX) n = AUTO_N_MAX;
    if (n < 1) n = 1;
  } else {
    n = Math.max(1, Math.min(MAX_N, +$('n-input').value || 1));
  }

  $('n-input').value = n;

  // Above SLIDER_MAX_N the slider cannot represent N. Park it at its
  // maximum but disable it, so it reads as "out of range" instead of
  // silently claiming N is 2500 and yanking it down on the next nudge.
  const beyondSlider = n > SLIDER_MAX_N;
  $('n-slider').value = Math.min(n, SLIDER_MAX_N);
  $('n-slider').disabled = beyondSlider;
  $('n-slider').style.opacity = beyondSlider ? '0.35' : '';
  $('n-slider').title = beyondSlider
    ? `Above ${SLIDER_MAX_N.toLocaleString()} — type a value to change N`
    : '';

  $('n-display').textContent = n.toLocaleString();
  applyAutoNodeSize(n);
}

// Node spacing shrinks as N grows, so a fixed node size that looks right at
// N=30 turns into overlapping blobs at N=2500 and swallows the parastichy
// lines entirely. Scale the default down with N — gently, since the layout is
// roughly area-filling, so radius wants about the fourth root.
//
//   N=30 -> 1.0    N=500 -> 0.5    N=2500 -> 0.3    N=10000 -> 0.2
//
// Once the user moves the slider the value is theirs and this stops firing.
function autoNodeSizeFor(n) {
  const raw = Math.pow(30 / Math.max(n, 1), 0.25);
  const stepped = Math.round(raw * 10) / 10;   // slider step is 0.1
  return Math.min(1.0, Math.max(0.2, stepped));
}

function applyAutoNodeSize(n) {
  if (nodeSizeUserSet) return;
  const size = autoNodeSizeFor(n);
  const el = $('node-size');
  if (!el || +el.value === size) return;
  el.value = size;
  $('node-size-display').textContent = size.toFixed(1);
}

// ============================================================
// DIMENSION — keyframe stickiness
// ============================================================
// The transport used to scrub by writing to a #dimension slider and firing its
// input event, so that this file stayed the single owner of what a dimension
// change means. Removing the Shape section took that slider away, and leaving
// a hidden input behind purely as a message bus would have been a phantom
// control nobody could find. The rule moved here instead; the transport calls
// it directly. Still one implementation, no DOM in the middle of it.
let shapeKeyframes = null;

export function setDimension(val) {
  shapeKeyframes ??= getShapes().map(s => s[0]);

  // Setting the dimension by hand means you want it to stay there, so hold the
  // animation rather than let the morph immediately drag it away. The
  // transport's play button resumes it.
  if (!state.paused) update({ paused: true });

  let v = Math.min(getMaxDim(), Math.max(getMinDim(), val));
  for (const key of shapeKeyframes) {
    if (Math.abs(v - key) < 0.02) { v = key; break; }
  }
  update({ dimension: v });
}

// ============================================================
// MODULE SECTIONS
// ============================================================
// Module DOM refs for dynamic state updates
const moduleRows = new Map(); // moduleName → { header, content, controlEls, capMsg }

// Set one of a module's toggles, in the UI and in the module, as though a
// person had tapped it.
//
// Addressed by LABEL rather than by index. `controlEls` runs parallel to
// `mod.controls`, so an index would work today and would silently target the
// wrong control the moment someone inserts a toggle above it — and the failure
// would be a preset quietly changing the wrong setting, which nothing tests
// for. The label is what the preset actually means.
function setModuleToggle(moduleName, label, value) {
  const mod = getModules().get(moduleName);
  const refs = moduleRows.get(moduleName);
  if (!mod || !refs) return;
  const idx = (mod.controls || []).findIndex(c => c.label === label);
  if (idx < 0) return;
  const el = refs.controlEls[idx];
  if (!el || el.type !== 'checkbox') return;
  el.checked = value;
  // The module holds its own copy of the flag, so writing the checkbox is only
  // half of it — without this the control would read "off" while the behaviour
  // stayed on.
  mod.controls[idx].onChange?.(value);
}

function buildModuleSections() {
  const resetBtn = $('reset-btn');
  if (!resetBtn) return;
  // Remove any previously built module sections
  for (const [, refs] of moduleRows) {
    refs.header.remove();
    refs.content.remove();
  }
  moduleRows.clear();

  for (const [name, mod] of getModules()) {
    // Modules can opt out of having a panel section at all. Info does: its
    // whole interface is right-click on the canvas and tap-through-the-lens,
    // so the section was a header over a single line of hint text.
    //
    // This has to be an explicit flag rather than "skip modules with no
    // controls" — Lens is also controls-only-a-hint, and it earns its section
    // because the hint is the only place the handle is explained.
    if (mod.hidden) continue;

    // Create a proper collapsible section like the built-in ones
    const header = document.createElement('h2');
    header.className = 'section-header';
    header.textContent = mod.label || name;

    const content = document.createElement('div');
    content.className = 'section-content';

    header.addEventListener('click', () => header.classList.toggle('open'));

    // Cap message (shown once at top when N exceeds limit)
    const capMsg = document.createElement('div');
    capMsg.className = 'module-cap-msg';
    capMsg.style.cssText = 'display:none; opacity:0.5; font-size:0.7rem; margin:4px 0';
    capMsg.textContent = '(too many nodes)';
    content.appendChild(capMsg);

    // Auto-enable the module backend — individual controls gate features
    mod.enabled = true;

    // All controls rendered as peers (no nesting)
    const controlEls = [];
    for (const ctrl of (mod.controls || [])) {
      if (ctrl.type === 'toggle') {
        const tgl = document.createElement('label');
        tgl.className = 'toggle';
        tgl.innerHTML = `
          <input type="checkbox" ${ctrl.default ? 'checked' : ''}>
          <span class="toggle-track"></span>
          ${ctrl.label}
        `;
        const cb = tgl.querySelector('input');
        cb.addEventListener('change', () => {
          if (ctrl.onChange) ctrl.onChange(cb.checked);
          if (ctrl.hot) {
            update({ [ctrl.key]: cb.checked });
          } else {
            state[ctrl.key] = cb.checked;
            scheduleRebuild();
          }
        });
        controlEls.push(cb);
        content.appendChild(tgl);
      } else if (ctrl.type === 'slider') {
        const wrapper = document.createElement('div');
        wrapper.className = 'control-row';
        wrapper.innerHTML = `
          <div class="control-label">${ctrl.label} <span class="value">${ctrl.default}</span></div>
          <div class="control-line">
            <input type="range" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${ctrl.default}">
          </div>
        `;
        const slider = wrapper.querySelector('input[type=range]');
        const display = wrapper.querySelector('.value');
        slider.addEventListener('input', () => {
          display.textContent = slider.value;
          if (ctrl.onChange) ctrl.onChange(+slider.value);
          if (ctrl.hot) {
            update({ [ctrl.key]: +slider.value });
          } else {
            state[ctrl.key] = +slider.value;
            scheduleRebuild();
          }
        });
        controlEls.push(slider);
        content.appendChild(wrapper);
      } else if (ctrl.type === 'select') {
        const wrapper = document.createElement('div');
        wrapper.style.margin = '4px 0';
        const label = document.createElement('label');
        label.textContent = ctrl.label;
        label.style.fontSize = '0.72rem';
        const select = document.createElement('select');
        for (const opt of ctrl.options) {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          if (opt.value === ctrl.default) o.selected = true;
          select.appendChild(o);
        }
        select.addEventListener('change', () => {
          if (ctrl.onChange) ctrl.onChange(select.value);
          state[ctrl.key] = select.value;
          scheduleRebuild();
        });
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        controlEls.push(select);
        content.appendChild(wrapper);
      } else if (ctrl.type === 'button') {
        const btn = document.createElement('button');
        btn.textContent = ctrl.label;
        btn.style.cssText = 'width:100%; padding:5px; margin-top:6px; background:transparent; border:1px solid var(--border); color:var(--text-faint); font-size:10px; font-family:inherit; cursor:pointer; border-radius:6px; transition:all 0.2s; letter-spacing:0.05em;';
        btn.addEventListener('mouseenter', () => { btn.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)'; btn.style.color = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6)'; });
        btn.addEventListener('mouseleave', () => { btn.style.borderColor = ''; btn.style.color = 'var(--text-faint)'; });
        btn.addEventListener('click', () => { if (ctrl.onClick) ctrl.onClick(); });
        controlEls.push(btn);
        content.appendChild(btn);
      }
    }

    // Optional hint text
    if (mod.hint) {
      const hintEl = document.createElement('div');
      hintEl.style.cssText = 'font-size:0.7rem; color:var(--text-dim); margin:4px 0; font-style:italic;';
      hintEl.textContent = mod.hint;
      content.appendChild(hintEl);
    }

    moduleRows.set(name, { header, content, controlEls, capMsg });
    const anchor = mod.insertBefore ? $(mod.insertBefore) : resetBtn;
    anchor.parentNode.insertBefore(header, anchor);
    anchor.parentNode.insertBefore(content, anchor);
  }
}

function updateModuleStates() {
  const N = resolveN();
  for (const [name, mod] of getModules()) {
    const refs = moduleRows.get(name);
    if (!refs) continue;
    const capped = mod.maxN && N > mod.maxN;
    const wasCapped = refs.wasCapped === true;
    refs.wasCapped = capped;

    refs.header.style.opacity = capped ? '0.4' : '';
    refs.content.style.opacity = capped ? '0.4' : '';
    refs.capMsg.style.display = capped ? '' : 'none';
    if (capped) {
      mod.enabled = false;
      try { mod.disable?.(); } catch (e) { console.error(`[PNM] Module "${name}" disable error:`, e); }
    } else {
      mod.enabled = true;
    }
    for (const el of refs.controlEls) {
      el.disabled = capped;
      if (capped && el.type === 'checkbox' && el.checked) {
        el.checked = false;
        // Fire onChange so the module internal flag updates
        el.dispatchEvent(new Event('change'));
      }
    }

    // Coming back down into range, put the module back the way it was found.
    //
    // Going over the cap unchecks the toggles AND dispatches change, which
    // sets the module's own internal flags false — physics' touchEnabled and
    // collisionEnabled. Re-enabling the module and re-enabling the inputs did
    // not undo any of that: the boxes stayed unchecked, the flags stayed
    // false, and the springs were never rebuilt, so physics came back dead and
    // stayed dead until a manual toggle. Restore on the transition only, or
    // this would overwrite the user's choices on every rebuild.
    if (!capped && wasCapped) {
      let i = 0;
      for (const ctrl of (mod.controls || [])) {
        const el = refs.controlEls[i++];
        if (!el) continue;
        if (ctrl.type === 'toggle' && el.type === 'checkbox') {
          el.checked = !!ctrl.default;
          el.dispatchEvent(new Event('change'));
        } else if (ctrl.type === 'slider') {
          el.value = ctrl.default;
          const display = el.closest('.control-row')?.querySelector('.value');
          if (display) display.textContent = ctrl.default;
          el.dispatchEvent(new Event('input'));
        }
      }
      // buildScene() already ran with mod.enabled still false, so build() bailed
      // before wiring the spring network. enable() is what puts it back.
      try { mod.enable?.(); } catch (e) { console.error(`[PNM] Module "${name}" enable error:`, e); }
    }
  }
}

// ============================================================
// WIRE EVERYTHING
// ============================================================
export function initPanel() {
  // Bring the two motion toggles into line with the actual defaults before
  // anything else runs.
  //
  // Their `checked` attributes are hardcoded in index.html, which was fine
  // while the defaults were constants. Under reduced motion (core/state.js)
  // they are not: state would say the morph is off while the checkbox insisted
  // it was on, and the first click would appear to do nothing because it would
  // be turning OFF something already off.
  $('shape-drift').checked = DEFAULT_CONFIG.shapeDrift;
  $('auto-rotate').checked = DEFAULT_CONFIG.autoRotate;

  // Collapsible sections
  document.querySelectorAll('.section-header').forEach(h => {
    h.addEventListener('click', () => h.classList.toggle('open'));
  });

  // Prime grid
  buildPrimeGrid();
  updatePrimeColors();
  updateAllBtnHighlight();

  // N controls
  $('auto-n').addEventListener('change', () => {
    const auto = $('auto-n').checked;
    $('n-input').disabled = auto;
    updateN();
    scheduleRebuild();
  });
  $('n-input').addEventListener('change', () => {
    $('n-slider').value = $('n-input').value;
    updateN();
    scheduleRebuild();
  });
  // Disable only the number input when auto is on — keep slider always enabled
  $('n-slider').disabled = false;
  $('n-slider').addEventListener('input', () => {
    if ($('auto-n').checked) {
      $('auto-n').checked = false;
      $('n-input').disabled = false;
    }
    $('n-input').value = $('n-slider').value;
    updateN();
    scheduleRebuild();
  });

  // Node size slider (real-time rebuild on drag)
  $('node-size').addEventListener('input', () => {
    nodeSizeUserSet = true;   // hands off from here — this is their value now
    $('node-size-display').textContent = $('node-size').value;
    scheduleRebuild();
  });

  // Toggles that trigger rebuild
  for (const id of [
    'color-scheme', 'background-style',
    'show-nodes', 'show-all-integers', 'show-zero', 'show-one',
    'show-curves',
    'prime-glow', 'zero-glow', 'pulse',
  ]) {
    $(id).addEventListener('change', () => { updateN(); scheduleRebuild(); });
  }

  // Line width slider (hot — no rebuild needed)
  $('line-width').addEventListener('input', () => {
    // One decimal, so 0 and 12 do not read as a different kind of value from
    // the halves in between.
    $('line-width-display').textContent = (+$('line-width').value).toFixed(1);
    update({ lineWidth: +$('line-width').value });
  });

  // Prime filter toggles — auto-enable "All Nodes" when turned on
  for (const id of ['filter-primes', 'filter-powers', 'filter-composites']) {
    $(id).addEventListener('change', () => {
      if ($(id).checked && !$('show-nodes').checked) {
        $('show-nodes').checked = true;
      }
      updateN();
      scheduleRebuild();
    });
  }

  // Prime glow intensity slider
  $('prime-glow-intensity').addEventListener('input', () => {
    $('prime-glow-display').textContent = $('prime-glow-intensity').value;
    scheduleRebuild();
  });

  // Zero glow intensity slider
  $('zero-glow-intensity').addEventListener('input', () => {
    $('zero-glow-display').textContent = $('zero-glow-intensity').value;
    scheduleRebuild();
  });

  // Drift speed + auto-rotate
  $('auto-rotate').addEventListener('change', () => {
    update({ autoRotate: $('auto-rotate').checked });
  });
  $('drift-speed').addEventListener('input', () => {
    $('drift-speed-display').textContent = $('drift-speed').value;
    update({ driftSpeed: +$('drift-speed').value });
  });

  // Morph. Governs whether the transport's Play animates the shape; every
  // other motion it resumes is gated on `paused` alone, so this leaves the
  // figure still while pulses, colour drift and rotation carry on.
  $('shape-drift').addEventListener('change', () => {
    update({ shapeDrift: $('shape-drift').checked });
  });

  // Pulse (hot key — updates without rebuild)
  $('pulse').addEventListener('change', () => {
    update({ pulse: $('pulse').checked });
  });
  $('line-pulse').addEventListener('change', () => {
    update({ linePulse: $('line-pulse').checked });
  });
  $('pulse-speed').addEventListener('input', () => {
    $('pulse-speed-display').textContent = $('pulse-speed').value;
    update({ pulseSpeed: +$('pulse-speed').value });
  });

  // Color drift (hot key — animation loop handles it)
  $('color-drift').addEventListener('change', () => {
    update({ colorDrift: $('color-drift').checked });
  });
  $('color-drift-speed').addEventListener('input', () => {
    $('color-drift-speed-display').textContent = $('color-drift-speed').value;
    update({ colorDriftSpeed: +$('color-drift-speed').value });
  });

  // ============================================================
  // CONSTANTS — the divergence angle
  // ============================================================
  // DEV: the panel talks DEGREES and the renderer talks RADIANS, and these two
  // helpers are the only place the two meet. Scattering `* Math.PI / 180`
  // through the handlers is how a control ends up off by a factor of 57 in one
  // branch that nobody exercises.
  const degToRad = d => d * Math.PI / 180;
  const radToDeg = r => r * 180 / Math.PI;

  // Writes the readout and the slider position from a value in radians.
  // `moveSlider` is false while the user is dragging: reassigning .value
  // mid-drag fights the pointer on some browsers and makes the handle stutter.
  function showDivergence(radians, moveSlider = true) {
    const deg = radToDeg(radians);
    $('divergence-angle-display').textContent = `${deg.toFixed(2)}°`;
    if (moveSlider) $('divergence-angle').value = deg.toFixed(2);
  }

  $('divergence-angle').addEventListener('input', () => {
    // Moving the slider by hand stops the sweep. Leaving it running would drag
    // the handle out from under the finger holding it.
    if ($('angle-drift').checked) {
      $('angle-drift').checked = false;
      update({ angleDrift: false });
    }
    const rad = degToRad(+$('divergence-angle').value);
    showDivergence(rad, false);
    update({ divergenceAngle: rad });
  });

  // EDU: this restores the exact constant π(3 − √5), NOT the 137.51 the slider
  // can represent. The difference is about four thousandths of a degree and it
  // matters: the golden angle's whole virtue is being maximally irrational, and
  // 13751/36000 is a perfectly ordinary rational number that produces visible
  // spoking once N is large enough to expose it. A control that "returned to
  // phi" by snapping to the nearest slider step would be quietly lying.
  $('divergence-reset').addEventListener('click', () => {
    if ($('angle-drift').checked) {
      $('angle-drift').checked = false;
      update({ angleDrift: false });
    }
    showDivergence(GOLDEN_ANGLE);
    update({ divergenceAngle: GOLDEN_ANGLE });
  });

  $('angle-drift').addEventListener('change', () => {
    update({ angleDrift: $('angle-drift').checked });
  });

  // DEV: the sweep speed slider is logarithmic. Its `value` is a position from
  // 0 to 100 and means nothing on its own; the multiplier stored in state is
  // derived from it here, and nowhere else.
  //
  // The range spans a factor of 300 because the useful range genuinely does.
  // The same angular rate is a slow drift at N=30 and a blur at N=1000: the
  // outer nodes are further from the centre, so a given change in angle sweeps
  // them through a proportionally greater distance. A linear control cannot
  // cover that — the slow end, which is where anyone watching a large figure
  // wants to be, would occupy the first one percent of the travel.
  //
  // A geometric mapping gives every part of the slider the same PROPORTIONAL
  // sensitivity instead: one step is always about a 6% change in speed,
  // whether you are at 0.02x or at 2x. That is the property a speed control
  // wants, and it is the same reasoning behind logarithmic volume faders.
  // The floor is 0.0001x — 0.0006 degrees per second, a full turn in roughly
  // 10,000 minutes, which is about a week. That is not a mistake and not a joke
  // value.
  //
  // The reasoning is that at the top of the N range the figure is enormous in
  // node count and the outermost nodes sit far from the centre, so the angular
  // rate that reads as a crawl at the middle of the disk is still real movement
  // at its rim. The floor is not meant to be a speed you sit and watch — it is
  // meant to be slow enough that the arrangement is effectively still while you
  // study it, and yet genuinely different when you come back to it. A setting
  // you notice only by its results.
  //
  // The span is now a factor of 30,000, which is the entire argument for the
  // geometric mapping below. A linear slider across that range would put every
  // value from the floor to 0.01x inside the first three pixels of travel.
  const SWEEP_MIN = 0.0001, SWEEP_MAX = 3;
  const sweepPosToSpeed = pos => SWEEP_MIN * Math.pow(SWEEP_MAX / SWEEP_MIN, pos / 100);
  const sweepSpeedToPos = spd =>
    Math.round(100 * Math.log(spd / SWEEP_MIN) / Math.log(SWEEP_MAX / SWEEP_MIN));

  // Enough decimals to show that a drag did something, at every scale. Two is
  // right for most of the range, but the readout has to keep up as the floor
  // drops or the slider appears dead exactly where the finest control lives —
  // a wall of 0.00x tells you nothing about whether you moved anything.
  const fmtSweep = (spd) => {
    const dp = spd < 0.001 ? 4 : spd < 0.01 ? 3 : 2;
    return `${spd.toFixed(dp)}×`;
  };

  function showSweepSpeed(speed, moveSlider = true) {
    $('angle-drift-speed-display').textContent = fmtSweep(speed);
    if (moveSlider) $('angle-drift-speed').value = sweepSpeedToPos(speed);
  }

  $('angle-drift-speed').addEventListener('input', () => {
    const spd = sweepPosToSpeed(+$('angle-drift-speed').value);
    showSweepSpeed(spd, false);
    update({ angleDriftSpeed: spd });
  });

  // Sync both Constants readouts to state at startup rather than trusting the
  // literals in the markup. The angle is exact rather than the slider's
  // two-decimal approximation of it, and the sweep slider's position is derived
  // from the mapping instead of being a hand-computed constant that would go
  // stale the moment SWEEP_MIN or SWEEP_MAX moved.
  showDivergence(state.divergenceAngle);
  showSweepSpeed(state.angleDriftSpeed);

  // DEV: the sweep advances state.divergenceAngle inside the render loop, which
  // knows nothing about the DOM. So the panel follows it the same way the
  // transport follows state.dimension — by polling on its own frame loop rather
  // than by having the renderer reach into the panel. One rAF that idles unless
  // the value actually moved.
  let shownDivergence = null;
  (function pollDivergence() {
    requestAnimationFrame(pollDivergence);
    if (state.divergenceAngle === shownDivergence) return;
    shownDivergence = state.divergenceAngle;
    // Not while dragging: the pointer owns the handle then.
    if (document.activeElement !== $('divergence-angle')) {
      showDivergence(state.divergenceAngle);
    } else {
      showDivergence(state.divergenceAngle, false);
    }
  })();

  // The idle timer that used to switch morphing on after 3s of quiet is gone.
  // It existed because morphing had no visible control and had to start
  // itself; the transport bar is that control now, and the shape morphs from
  // load until you pause it.

  // Reset
  // Named rather than inline so the panel's Reset and the corner Reset share
  // one implementation instead of one of them quietly drifting.
  function resetToDefaults() {
    const grid = $('prime-grid');
    grid.querySelectorAll('.prime-btn').forEach(btn => {
      btn.classList.toggle('active', [2, 3, 5].includes(+btn.dataset.prime));
    });
    $('color-scheme').value = 'rgb';
    $('background-style').value = 'black';
    $('auto-n').checked = true;
    $('n-input').disabled = true;
    // Clear the out-of-range slider state too, or resetting from N > 2500
    // leaves the slider dimmed and dead. Set explicitly rather than calling
    // updateN(), which would read selectedPrimes — and reset does not
    // currently update that (see docs/PLAN.md §6).
    $('n-slider').disabled = false;
    $('n-slider').style.opacity = '';
    $('n-slider').title = '';
    $('show-nodes').checked = true;
    $('show-all-integers').checked = false;
    $('show-zero').checked = true;
    $('show-one').checked = true;
    $('show-curves').checked = true;
    $('line-width').value = 2;
    $('line-width-display').textContent = '2.0';
    // Read from DEFAULT_CONFIG, not a literal `true`. Under reduced motion
    // these two default to off (core/state.js), and a Reset that hardcoded them
    // on would hand the motion straight back to someone who asked the OS not to
    // have it. The rest of this function still uses literals; these are the two
    // the preference touches.
    $('auto-rotate').checked = DEFAULT_CONFIG.autoRotate;
    $('prime-glow').checked = true;
    $('prime-glow-intensity').value = 0.3;
    $('prime-glow-display').textContent = '0.3';
    $('zero-glow').checked = true;
    $('zero-glow-intensity').value = 1.1;
    $('zero-glow-display').textContent = '1.1';
    $('pulse').checked = false;
    $('line-pulse').checked = false;
    $('pulse-speed').value = 1.0;
    $('pulse-speed-display').textContent = '1.0';
    $('color-drift').checked = false;
    $('color-drift-speed').value = 1.0;
    $('color-drift-speed-display').textContent = '1.0';
    $('shape-drift').checked = DEFAULT_CONFIG.shapeDrift;   // see note above
    $('filter-primes').checked = true;
    $('filter-powers').checked = true;
    $('filter-composites').checked = true;
    // Hand node size back to the automatic curve, and re-collapse the grid.
    nodeSizeUserSet = false;
    primeTier = 0;
    applyPrimeTier();
    $('node-size').value = 1.0;
    $('node-size-display').textContent = '1.0';
    $('drift-speed').value = 0.3;
    $('drift-speed-display').textContent = '0.3';

    // Constants. The state side of these is handled by the HOT_KEYS sweep near
    // the end of this function — it reads DEFAULT_CONFIG, so the angle returns
    // to the exact golden constant without a literal here. What that sweep
    // cannot do is repaint the DOM, which is this file's standing trap: "Reset
    // does not reset everything" has been a bug twice, both times because a new
    // control was wired up and not added to this list.
    showDivergence(DEFAULT_CONFIG.divergenceAngle);
    $('angle-drift').checked = DEFAULT_CONFIG.angleDrift;
    // Through the mapping, not straight into .value — the slider carries a
    // position, not a speed. Assigning 1.0 here would park the handle at the
    // far left and mean 0.01x.
    showSweepSpeed(DEFAULT_CONFIG.angleDriftSpeed);

    // Reset module controls to defaults
    for (const [name, mod] of getModules()) {
      const refs = moduleRows.get(name);
      if (!refs) continue;
      let ctrlIdx = 0;
      for (const ctrl of (mod.controls || [])) {
        const el = refs.controlEls[ctrlIdx++];
        if (!el) continue;
        if (ctrl.type === 'toggle' && el.type === 'checkbox') {
          el.checked = !!ctrl.default;
          if (ctrl.onChange) ctrl.onChange(!!ctrl.default);
        } else if (ctrl.type === 'slider') {
          el.value = ctrl.default;
          const display = el.closest('.control-row')?.querySelector('.value');
          if (display) display.textContent = ctrl.default;
          if (ctrl.onChange) ctrl.onChange(+ctrl.default);
        }
      }
    }

    updateSelectedPrimes();

    // Put the morph itself back to the start of its travel. Without this the
    // dimension below is overwritten from the morph's own stale position on the
    // very next frame and the figure never returns to Line — see resetMorph().
    resetMorph();

    // Every hot key, in one call, read straight from DEFAULT_CONFIG.
    //
    // This is the fix for "Reset does not reset everything". scheduleRebuild()
    // reads only the COLD keys — the ones that need a scene rebuild — which is
    // correct for what it is for, but it meant every hot control was repainted
    // in the UI and never written to state. Colour drift, both pulses, rotation
    // and all four of their speeds survived a Reset: the toggle went off and
    // the effect kept running. Driving it from DEFAULT_CONFIG rather than a
    // list of literals means a hot key added later is covered here for free.
    const hotDefaults = {};
    for (const key of HOT_KEYS) {
      if (key in DEFAULT_CONFIG) hotDefaults[key] = DEFAULT_CONFIG[key];
    }
    // `paused` is a runtime flag, not saved config, so it has no default to
    // read. A reset that left the scene frozen would look like a breakage.
    hotDefaults.paused = false;
    update(hotDefaults);

    scheduleRebuild();

    // The view goes home too. Reset restored every setting but left the camera
    // wherever it had been dragged, so resetting from an odd angle produced a
    // correct figure that still looked wrong — the one part of the state a
    // person can change without touching a control was the one part Reset did
    // not undo.
    //
    // Ordering against scheduleRebuild() is not delicate, but it is worth
    // stating so nobody "fixes" it later. buildScene() snapshots the camera at
    // the TOP of its run and restores it at the bottom, so it preserves
    // whatever the camera is when it actually executes — and scheduleRebuild()
    // is debounced, so it has not executed yet here. The rebuild therefore
    // picks up the reset position and puts it back. Dazzle's setCameraTopDown()
    // call sits in exactly the same relationship and works for the same reason.
    resetCamera();
  }

  // Dazzle — Reset with a different normal.
  //
  // Built ON TOP of resetToDefaults() rather than beside it. A second list of
  // forty control writes would drift out of step with the first the moment
  // either changed, and Reset is the one thing in this file that has to stay
  // exhaustive. This way Dazzle states only where it differs from a clean
  // slate. scheduleRebuild() is debounced, so the reset's queued rebuild is
  // replaced by ours rather than running twice.
  function applyDazzle() {
    resetToDefaults();

    // Every prime, with the grid expanded to show them. A prime switched on
    // but hidden would colour the figure with no way to see or unset it —
    // the same rule the All button follows.
    $('prime-grid').querySelectorAll('.prime-btn').forEach(b => b.classList.add('active'));
    primeTier = PRIME_TIERS.length - 1;
    applyPrimeTier();

    // N by hand, so Auto stops deriving it from the primes — with all 32
    // selected their product is astronomical and would just clamp.
    $('auto-n').checked = false;
    $('n-input').disabled = false;
    $('n-input').value = 1000;

    // Claim the node size BEFORE updateN() runs. Otherwise the auto curve
    // owns it and picks 0.4 for N=1000, and the figure comes out sparse
    // rather than dense.
    // Was 2.0. At 1.6 the individual nodes stay distinct instead of fusing into
    // a single sheet of colour — the point of Dazzle is a thousand numbers, and
    // at 2.0 you could no longer see that they were separate ones.
    nodeSizeUserSet = true;
    $('node-size').value = 1.6;
    $('node-size-display').textContent = '1.6';

    updateSelectedPrimes();          // → updateN(), which now respects the size

    // Every integer in range, and no parastichy lines. Seen from overhead the
    // curves read as clutter across the face of the disk rather than as
    // structure, and filling in the gaps between the selected multiples is
    // what makes it a solid field of colour instead of a lattice.
    $('show-all-integers').checked = true;
    $('show-curves').checked = false;

    $('pulse').checked = true;
    // Pinned rather than inherited. It happens to equal the default right now,
    // but it is a stated part of this preset, so it should not follow the
    // default if that ever moves. Switching pulse ON is the real difference.
    $('pulse-speed').value = 1;
    $('pulse-speed-display').textContent = '1.0';
    $('line-pulse').checked = true;
    $('color-drift').checked = true;
    $('color-drift-speed').value = 2.5;
    $('color-drift-speed-display').textContent = '2.5';
    // Dazzle is an explicit request for the showiest state the app has, but the
    // OS preference is a standing instruction and outranks a single tap. Under
    // reduced motion Dazzle still gives every prime, a thousand nodes and the
    // colour drift — it just does not also spin the camera. The toggle is right
    // there for anyone who wants it back.
    $('auto-rotate').checked = DEFAULT_CONFIG.autoRotate;
    $('drift-speed').value = 0.3;
    $('drift-speed-display').textContent = '0.3';
    $('shape-drift').checked = false;

    // The divergence sweep, at the floor. This is the one Dazzle setting that
    // is not about being showy — it is the slowest motion in the app by four
    // orders of magnitude, a full turn in something like a week.
    //
    // Deliberately SWEEP_MIN rather than a pinned number: "the lowest setting"
    // is the specification, so if the floor moves this follows it down. It has
    // already followed it once.
    //
    // It pairs with `shapeDrift: false` above rather than fighting it. Dazzle
    // holds the SHAPE still and moves everything else, so the field is a stable
    // dome you can actually look at; against that, a divergence crawl slowly
    // reorganises which node sits where without the arrangement ever appearing
    // to move. Watch it for a minute and the spiral arms have quietly changed
    // count. Anything faster and it stops being the background process it is
    // meant to be and starts competing with the colour drift.
    $('angle-drift').checked = true;
    showSweepSpeed(SWEEP_MIN);

    // Physics off. Dazzle is a picture, not a toy: the value of it is a
    // thousand nodes holding a precise arrangement, and the whole point of the
    // physics module is to let you pull that arrangement out of shape. One
    // stray drag across the field and the thing you came to look at is dented,
    // with no obvious way back short of Reset — which would also undo Dazzle.
    //
    // Both toggles, not just Touch. Collision keeps simulating even when
    // dragging is off, and at N=1000 that is a spring network doing work
    // nobody asked for on top of a scene already running colour drift, two
    // pulses and a camera orbit.
    setModuleToggle('physics', 'Touch', false);
    setModuleToggle('physics', 'Collision', false);

    update({
      // Disk, with the faintest dome toward Sphere.
      //
      // Disk now sits at 2.0, the top of the travel, and Sphere at 1.5 — so a
      // nudge toward Sphere is DOWNWARD from Disk, where it used to be upward.
      // The blend is unchanged: 0.0125 out of the 0.5 between them, the same
      // 2.5% of the way it has always been. Only the sign moved, because the
      // morph order did (core/positions.js).
      //
      // Straight down onto a true plane there is no depth cue at all and the
      // rotation reads as a spinning image rather than an object, so the field
      // still domes, but only just enough to say it is a surface.
      //
      // History, because the number has only ever moved one way: the dome was
      // 0.1 of the gap, then 0.05, and is now 0.0125. Flatter each time, and
      // the phyllotaxis easier to read each time, which is what Dazzle is for.
      dimension: 1.9875,
      shapeDrift: false,     // the shape holds; everything else moves
      paused: false,
      pulse: true,
      pulseSpeed: 1,
      linePulse: true,
      colorDrift: true,
      colorDriftSpeed: 2.5,
      // Must track the checkbox set above, or state and UI disagree: the scene
      // would spin while the control claimed rotation was off.
      autoRotate: DEFAULT_CONFIG.autoRotate,
      driftSpeed: 0.3,
      // The sweep, matching the two controls set above. Note this is NOT gated
      // on reduced motion the way autoRotate is: at the floor the angle moves
      // about six thousandths of a degree per second, which is below the
      // threshold of anything a vestibular preference is protecting against.
      // The camera spin is the thing that had to stand down, and it does.
      angleDrift: true,
      angleDriftSpeed: SWEEP_MIN,
    });

    // Last, so it frames the shape the settings above just chose. With the
    // camera overhead, autoRotate spins the disk in its own plane.
    setCameraTopDown();
    scheduleRebuild();
  }

  $('reset-btn').addEventListener('click', resetToDefaults);
  $('corner-reset')?.addEventListener('click', resetToDefaults);
  $('dazzle-btn')?.addEventListener('click', applyDazzle);


  // Update N display
  updateN();

  // Build module sections
  buildModuleSections();
  updateModuleStates();

  emit('panelReady', { panelEl: $('panel') });

}

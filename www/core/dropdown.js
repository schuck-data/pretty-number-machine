// PNM — a dropdown the app draws itself.
//
// DEV: the reason this file exists. A native <select>'s POPUP is rendered by
// the operating system, not by the page. None of the panel's styling reaches
// it, so on Android it opens as a stark Material list that belongs to a
// different application — and, more importantly, an <option> can only contain
// text. Colour schemes and backgrounds are exactly the case where the option
// needs to SHOW you the thing rather than name it.
//
// DEV: this ENHANCES a real <select> rather than replacing it. The select stays
// in the DOM, keeps its id, and remains the source of truth: panel.js reads
// `$('color-scheme').value`, Reset writes it, and tools/check.mjs scans the
// markup for its <option> values. All of that keeps working untouched, and if
// this module ever fails to load the app degrades to a plain working dropdown
// rather than to no control at all.
import { PALETTES, getPrimeRGB, BACKGROUNDS } from './math.js';

const SAMPLE_PRIMES = [2, 3, 5, 7, 11];   // enough chips to read a palette by
const hex = ([r, g, b]) => '#' + [r, g, b].map(v =>
  Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

// The colours to show beside one option value.
function chipsFor(kind, value, customColor) {
  if (kind === 'background') {
    if (value === 'custom') return [customColor || '#0c0c0f'];
    const bg = BACKGROUNDS[value];
    return bg ? ['#' + bg.map(v => v.toString(16).padStart(2, '0')).join('')] : ['#0c0c0f'];
  }
  // A scheme is previewed by asking it the same question the renderer asks,
  // rather than by keeping a second copy of the palette here.
  const map = getPrimeRGB(SAMPLE_PRIMES, value);
  return SAMPLE_PRIMES.map(p => hex(map[p]));
}

const syncers = [];
export function syncDropdowns() { for (const s of syncers) s(); }

export function enhanceSelect(sel, kind, getCustomColor = () => '#0c0c0f') {
  if (!sel || sel.dataset.enhanced) return;
  sel.dataset.enhanced = '1';

  const wrap = document.createElement('div');
  wrap.className = 'dd';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  sel.classList.add('dd-native');
  // Hidden from assistive tech and from the tab order, because the button and
  // listbox below carry the roles now. Leaving it exposed would give a screen
  // reader two controls for one setting and put two stops in the tab order.
  sel.setAttribute('aria-hidden', 'true');
  sel.tabIndex = -1;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dd-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  const list = document.createElement('div');
  list.className = 'dd-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  wrap.append(btn, list);

  const options = [...sel.querySelectorAll('option')];
  const rowFor = (opt) => {
    const row = document.createElement('div');
    row.className = 'dd-opt';
    row.setAttribute('role', 'option');
    row.dataset.value = opt.value;
    row.append(swatchStrip(opt.value));
    const label = document.createElement('span');
    label.className = 'dd-label';
    label.textContent = opt.textContent;
    row.append(label);
    // A row is a click target inside a SCROLLING panel, so a scroll that
    // happens to begin on one would otherwise land as a selection when the
    // finger lifts. Only a gesture that stayed put counts as a tap. This is
    // the same hazard `touch-action: pan-y` handles for the sliders, but a
    // slider is dragged and a row is tapped, so it needs the other remedy.
    let downAt = null;
    row.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
    row.addEventListener('pointerup', (e) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
      downAt = null;
      if (moved <= 10) choose(opt.value);      // 10px: a tap, not a scroll
    });
    return row;
  };
  function swatchStrip(value) {
    const strip = document.createElement('span');
    strip.className = 'dd-chips';
    for (const c of chipsFor(kind, value, getCustomColor())) {
      const chip = document.createElement('i');
      chip.style.backgroundColor = c;
      strip.append(chip);
    }
    return strip;
  }

  // Build rows, preserving <optgroup> as headings.
  for (const child of sel.children) {
    if (child.tagName === 'OPTGROUP') {
      const h = document.createElement('div');
      h.className = 'dd-group';
      h.textContent = child.label;
      list.append(h);
      for (const o of child.children) list.append(rowFor(o));
    } else if (child.tagName === 'OPTION') {
      list.append(rowFor(child));
    }
  }

  function sync() {
    const opt = options.find(o => o.value === sel.value) || options[0];
    btn.replaceChildren(swatchStrip(sel.value),
      Object.assign(document.createElement('span'), { className: 'dd-label', textContent: opt.textContent }));
    for (const row of list.querySelectorAll('.dd-opt')) {
      const on = row.dataset.value === sel.value;
      row.classList.toggle('is-on', on);
      row.setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }
  syncers.push(sync);

  function open(yes) {
    list.hidden = !yes;
    btn.setAttribute('aria-expanded', yes ? 'true' : 'false');
    wrap.classList.toggle('is-open', yes);
    if (yes) list.querySelector('.is-on')?.scrollIntoView({ block: 'nearest' });
  }
  function choose(value) {
    sel.value = value;
    // The native event, so every listener panel.js already registered fires
    // exactly as it would have. This module adds a face, not a behaviour.
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
    open(false);
    btn.focus();
  }

  btn.addEventListener('click', () => open(list.hidden));
  // Same rule as the ads tray: anything landing outside closes it, written as
  // OUTSIDE rather than as a list of things that should.
  document.addEventListener('pointerdown', (e) => {
    if (!list.hidden && !wrap.contains(e.target)) open(false);
  }, { capture: true });

  wrap.addEventListener('keydown', (e) => {
    const rows = [...list.querySelectorAll('.dd-opt')];
    const i = rows.findIndex(r => r.dataset.value === sel.value);
    if (e.key === 'Escape' && !list.hidden) { open(false); btn.focus(); e.preventDefault(); }
    else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') ) {
      e.preventDefault();
      if (list.hidden) return open(true);
      const next = rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (next) choose(next.dataset.value), open(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && !list.hidden) {
      e.preventDefault(); open(false);
    }
  });

  // Anything that writes sel.value directly (Reset does) calls syncDropdowns().
  sel.addEventListener('change', sync);
  sync();
}

// PNM — Platform Adapter
//
// The single seam between this app and anything native. Nothing in core/ or
// modules/ may import a Capacitor plugin directly; they import this, and this
// decides what is really underneath.
//
// DEV: the rule that makes iOS cheap later is that STORE IDS LIVE ONLY IN THIS
// FILE. A Play Games achievement id and a Game Center achievement id are
// different opaque strings for the same idea, and the moment one of them is
// written anywhere else — a module, a template, a saved game — the second shell
// stops being paperwork and becomes a migration. See docs/ANDROID-BUILD.md §8.
//
// DEV: there are two implementations behind one shape. `stub` is in-memory and
// always available, so the app runs identically on a dev server in a desktop
// browser with achievements and billing simply not doing anything. `native`
// talks to plugins. Which plugins is still an open decision (ANDROID-BUILD.md
// §4 and §7), so the native path currently resolves to null and falls through
// to the stub with one warning. That is deliberate: a fake plugin binding that
// silently pretends to work would be worse than no binding at all, because it
// would look like step 4 was done.

// ============================================================
// STORE ID MAP
// ============================================================
// PNM id → per-store id. The PNM id is the stable key: it is what the ledger
// writes to localStorage and what every predicate is named by, and it must
// survive a display-name change. TREK! was renamed 1701! during design and its
// id stayed `trek`; had the id been the display name, every unlock a player
// already held would have been orphaned by a cosmetic edit.
//
// DEV: 101 ids, taken straight from modules/achievements-data.js so this map
// cannot drift from the design. `pgs` is empty for every entry because Play
// Console has not issued them.
// It assigns an opaque string (they look like `CgkI…`) when the achievement is
// created in the console, and that is a §6 task. `gamecenter` is pre-filled
// with the reverse-DNS convention Apple uses, since those are author-chosen
// rather than issued — but nothing reads them yet.
const STORE_IDS = {};
for (const id of [
  'first', 'exhaustive', 'parawhat', 'art', 'bophades',
  'maximalist', 'ceiling', 'zoomies', 'boing', 'trippy',
  'nerd', 'ouch', 'oops', 'night', 'void',
  'empty-set', 'fibonacci', 'lucas', 'perfect', 'twinning',
  'cousins', 'sexy', 'germain', 'emirp', 'mersenne',
  'fermat', 'neat', 'louder', 'smart', 'balanced',
  'stride', 'all-prime', 'super-prime', 'goldbach', 'collatz',
  'run', 'stairs', 'square-up', 'nice', 'dude',
  'meme', 'oil', 'catch', 'route', 'cards',
  'jackpot', 'heinz', 'slurpee', 'sparta', 'jumbo',
  'deck', 'beast', 'angel', 'lucky', 'unlucky',
  'enigma', 'masonic', 'thelema', 'other-beast', 'rest',
  'eightfold', 'sator', 'choirs', 'not-found', 'teapot',
  'bradbury', 'trek', 'localhost', 'rawr', 'best',
  'concert-a', 'lightspeed', 'memory', 'skeleton', 'inherited',
  'elements', 'freezing', 'body-heat', 'boiling', 'year',
  'leap', 'months', 'moon', 'metonic', 'quarter',
  'shortest', 'longest', 'help', 'central', 'ny',
  'space-city', 'graceland', 'motor-city', 'vice', 'bay',
  'aloha', 'nola', 'phi', 'pi', 'tau',
  'unity',
]) {
  STORE_IDS[id] = { pgs: '', gamecenter: `com.schuckdata.pnm.${id.replace(/-/g, '_')}` };
}

export function storeId(pnmId, store = 'pgs') {
  return STORE_IDS[pnmId]?.[store] || null;
}

export function knownIds() {
  return Object.keys(STORE_IDS);
}

// ============================================================
// IN-APP PRODUCTS
// ============================================================
// Two non-consumables, and the same shape as STORE_IDS above: the app's own id
// on the left, the store's on the right, and the store's is blank until the
// console issues it. Play product ids are author-chosen (unlike PGS achievement
// ids, which Play assigns), so these are filled in — but they become permanent
// at first upload, exactly like the package name.
//
// DEV: `billing` was written for ONE product and took no id, because the plan
// at the time was a single $0.99 unlock. There are two now and there will
// plausibly be more, so every call takes a product id. The stub still answers
// for all of them.
const PRODUCT_IDS = {
  'ads-addition':       { play: 'ads_addition',       appstore: 'com.schuckdata.pnm.ads_addition' },
  'ads-multiplication': { play: 'ads_multiplication', appstore: 'com.schuckdata.pnm.ads_multiplication' },
};

export function productId(pnmId, store = 'play') {
  return PRODUCT_IDS[pnmId]?.[store] || null;
}

export function knownProducts() {
  return Object.keys(PRODUCT_IDS);
}

// ============================================================
// NATIVE DETECTION
// ============================================================
// DEV: guarded rather than assumed. `Capacitor` is injected by the shell and is
// simply absent in a browser, and this module is imported at startup on both.
function detectNative() {
  try {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

const IS_NATIVE = detectNative();

// DEV: step 4 wires this up and nothing else in the file needs to change. It
// should return an object with the plugin methods, or null if no plugin is
// available. Until a plugin is chosen it returns null on purpose.
function getGamesPlugin() {
  return null;
}

function getBillingPlugin() {
  return null;
}

let warnedNoPlugin = false;
function warnOnce() {
  if (warnedNoPlugin) return;
  warnedNoPlugin = true;
  if (IS_NATIVE) {
    console.warn('[PNM] Native shell detected but no games/billing plugin is wired. ' +
                 'Falling back to the in-memory stub — see ANDROID-BUILD.md §4.');
  }
}

// ============================================================
// STUB IMPLEMENTATION
// ============================================================
// In-memory, plus localStorage for saves so a browser reload behaves like a
// device would. Every method resolves; none of them throw. A caller cannot tell
// the difference except that nothing appears in the Play Games app.
const SAVE_KEY = 'pnm-platform-save-v1';

const stubUnlocked = new Set();
const stubCounters = new Map();

const stub = {
  achievements: {
    async unlock(id) { stubUnlocked.add(id); return true; },
    async reveal(id) { return true; },
    async increment(id, n) {
      stubCounters.set(id, (stubCounters.get(id) || 0) + n);
      return stubCounters.get(id);
    },
    async loadUnlocked() { return new Set(stubUnlocked); },
    async showUI() { return false; },
    async isAuthenticated() { return false; },
    async signIn() { return false; },
  },
  saves: {
    async write(blob) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
        return true;
      } catch { return false; }
    },
    async read() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    },
  },
  billing: {
    // DEV: the stub is what a BROWSER gets, and a browser has no store. It says
    // "unavailable" rather than pretending to succeed, and modules/ads.js shows
    // that state honestly instead of quietly entitling anybody. There is no
    // development bypass here on purpose: a backdoor that entitles a player is
    // a backdoor that ships. Seed the local entitlement record instead when
    // something needs to be looked at — docs/ADS.md says how.
    async getProduct() { return null; },
    async purchase() { return { ok: false, reason: 'unavailable' }; },
    // `available` is the important field and it is NOT decoration. "There is no
    // store here" and "the store says you own nothing" are different answers,
    // and collapsing them into an empty list costs a player their purchase:
    // modules/ads.js overwrites its cached entitlement whenever a store
    // answers, so a stub that answers `{entitled: []}` wipes it on every
    // launch. Found on a Pixel 7, where it silently un-bought the product.
    async restore() { return { available: false, entitled: [] }; },
  },
};

// ============================================================
// NATIVE IMPLEMENTATION
// ============================================================
// DEV: written against the adapter's own vocabulary rather than any one
// plugin's, so that step 4 is a matter of filling in getGamesPlugin() and
// mapping four or five call names. Every method falls back to the stub rather
// than throwing, because an achievement that cannot reach Play Games must still
// land in the local ledger — the ledger is the source of truth and PGS is the
// public copy, not the other way round.
const native = {
  achievements: {
    async unlock(id) {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.achievements.unlock(id); }
      const sid = storeId(id, 'pgs');
      if (!sid) { console.warn(`[PNM] No PGS id mapped for "${id}"`); return false; }
      try { await p.unlockAchievement({ achievementID: sid }); return true; }
      catch (e) { console.error('[PNM] PGS unlock failed:', e); return false; }
    },
    async reveal(id) {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.achievements.reveal(id); }
      const sid = storeId(id, 'pgs');
      if (!sid) return false;
      try { await p.revealAchievement({ achievementID: sid }); return true; }
      catch (e) { console.error('[PNM] PGS reveal failed:', e); return false; }
    },
    async increment(id, n) {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.achievements.increment(id, n); }
      const sid = storeId(id, 'pgs');
      if (!sid) return 0;
      try { await p.incrementAchievement({ achievementID: sid, pointsToIncrement: n }); return n; }
      catch (e) { console.error('[PNM] PGS increment failed:', e); return 0; }
    },
    // Returns PNM ids, not store ids. The reverse lookup happens here so that
    // nothing outside this file ever holds a store id.
    async loadUnlocked() {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.achievements.loadUnlocked(); }
      try {
        const res = await p.loadAchievements();
        const byStore = new Map(Object.entries(STORE_IDS).map(([k, v]) => [v.pgs, k]));
        const out = new Set();
        for (const a of (res?.achievements || [])) {
          if (!a?.unlocked) continue;
          const pnm = byStore.get(a.achievementID);
          if (pnm) out.add(pnm);
        }
        return out;
      } catch (e) {
        console.error('[PNM] PGS load failed:', e);
        return new Set();
      }
    },
    async showUI() {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.achievements.showUI(); }
      try { await p.showAchievements(); return true; } catch { return false; }
    },
    async isAuthenticated() {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.achievements.isAuthenticated(); }
      try { return (await p.isAuthenticated())?.isAuthenticated === true; } catch { return false; }
    },
    async signIn() {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.achievements.signIn(); }
      try { await p.signIn(); return true; } catch { return false; }
    },
  },
  // DEV: Saved Games. One snapshot named `ledger`, holding the ledger JSON.
  // Conflict resolution is the ledger's business, not the adapter's — see
  // modules/achievements.js mergeLedgers(): union of unlocks, max of counters.
  saves: {
    async write(blob) {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.saves.write(blob); }
      try { await p.saveGame({ name: 'ledger', data: JSON.stringify(blob) }); return true; }
      catch (e) { console.error('[PNM] Saved Games write failed:', e); return false; }
    },
    async read() {
      const p = getGamesPlugin();
      if (!p) { warnOnce(); return stub.saves.read(); }
      try {
        const res = await p.loadGame({ name: 'ledger' });
        return res?.data ? JSON.parse(res.data) : null;
      } catch { return null; }
    },
  },
  billing: {
    // Each takes the app's own product id and maps it at the boundary, so
    // nothing above this file ever handles a store string.
    async getProduct(pnmId) {
      const p = getBillingPlugin();
      if (!p) { warnOnce(); return stub.billing.getProduct(pnmId); }
      return null;
    },
    async purchase(pnmId) {
      const p = getBillingPlugin();
      if (!p) { warnOnce(); return stub.billing.purchase(pnmId); }
      return { ok: false, reason: 'unimplemented' };
    },
    // Returns the list of owned app-ids. An array rather than a boolean because
    // there is more than one product now, and because "restore" on a fresh
    // install has to be able to say "these two, not that one".
    async restore() {
      const p = getBillingPlugin();
      if (!p) { warnOnce(); return stub.billing.restore(); }
      // Until a plugin is wired this is still not a real answer, so it must not
      // claim to be one. `available: false` is what stops it being treated as
      // proof that the player owns nothing. See the note on the stub above.
      return { available: false, entitled: [] };
    },
  },
};

// ============================================================
// PUBLIC
// ============================================================
const impl = IS_NATIVE ? native : stub;

export const platform = {
  isNative: IS_NATIVE,
  achievements: impl.achievements,
  saves: impl.saves,
  billing: impl.billing,
};

export default platform;

// current.js — the page current, version 1.
//
// A contract between independent things that move on the same page, so that
// they move in the same current: a field of lines drawn on a 2D canvas and a
// form made of particles in WebGL, for instance. Neither imports the other.
// Each joins the one object this module keeps on `globalThis`, publishes what
// it knows, and reads what the others published.
//
// THIS FILE IS SHARED VERBATIM between linefield (`shared/current.js`) and
// Forma (`src/bridge/current.js`). Both repos pin its SHA-256 in a test; a
// change must land in both, and anything that changes meaning must bump
// CURRENT_VERSION (two different versions on one page ignore each other).
//
// Its top-level names all start with `current`/`CURRENT_`: linefield's bake
// inlines every shared module into one script, where a common name would
// collide. No imports, no state outside the one object, nothing drawn, and no
// listeners at all until a second member joins: something alone on a page
// behaves exactly as if this file did not exist.
//
// Everything is in CSS pixels of the viewport ("client" coordinates, y down),
// the one space every element on a page shares.
//
//   pointer  { x, y, active }            the cursor, wherever it is on the page
//   cursor   { mode, strength, reach }   what the cursor does to matter:
//            mode 'push' | 'attract' | 'vortex' | 'scatter' | 'wake' | 'off',
//            strength 0..1.5, reach in px (the falloff radius)
//   body     { x, y, r, disperse, form } an object sitting in the field:
//            centre and radius in px, disperse 0 (whole) .. 1 (fully apart),
//            form 'solid' | 'liquid' | 'gas'
//   palette  { a, b, dark, name }        two colour stops as [r, g, b] 0..255,
//            dark true for light marks on a dark ground, name an optional
//            preset from CURRENT_PRESETS
//   field    { sample(x, y, t, out) }    the flow: writes a direction into
//            out[0], out[1] (y down), length 0..1 where 1 is the publisher's
//            own full speed, and returns out. Must be cheap and must not
//            allocate: it is called hundreds of times a frame.

export const CURRENT_VERSION = 1;
export const CURRENT_CHANNELS = ['cursor', 'body', 'palette', 'field'];
/** Preset names that mean the same intent on both sides. */
export const CURRENT_PRESETS = ['whisper', 'ink', 'neon', 'drift', 'dense'];
/** Cursor modes that mean the same thing on both sides. */
export const CURRENT_CURSOR_MODES = ['push', 'attract', 'vortex', 'scatter', 'wake', 'off'];

const CURRENT_KEY = '__pageCurrent__';

function createCurrent() {
  const members = new Map(); // id -> name
  const owners = {}; // channel -> member id
  let nextId = 1;
  let listening = false;

  const current = {
    version: CURRENT_VERSION,
    pointer: { x: 0, y: 0, active: false },
    cursor: null,
    body: null,
    palette: null,
    field: null,

    /** Seconds on a clock every member shares. */
    now() {
      return performance.now() / 1000;
    },

    /** Names of the members on the page right now. */
    get members() {
      return [...members.values()];
    },

    /** True while a member called `name` is on the page. */
    has(name) {
      for (const n of members.values()) if (n === name) return true;
      return false;
    },

    /** Joins the current. Publish through the returned handle, and `leave()`
     * when torn down: that clears whatever this member had published. */
    join(name) {
      const id = nextId++;
      members.set(id, String(name));
      listen();
      return {
        name: String(name),
        /** True while a member with another name is on the page. A member
         * that is alone should behave as if there were no current. */
        get accompanied() {
          for (const [other, n] of members) if (other !== id && n !== name) return true;
          return false;
        },
        /** Sets a channel (see the list at the top), or clears it with null.
         * The last publisher owns the channel. */
        publish(channel, value) {
          if (!CURRENT_CHANNELS.includes(channel) || !members.has(id)) return;
          if (value == null) {
            if (owners[channel] === id) { current[channel] = null; delete owners[channel]; }
            return;
          }
          current[channel] = value;
          owners[channel] = id;
        },
        leave() {
          if (!members.delete(id)) return;
          for (const channel of CURRENT_CHANNELS) {
            if (owners[channel] === id) { current[channel] = null; delete owners[channel]; }
          }
          listen();
        },
      };
    },

    /** What the cursor alone does at a point: adds to `out` ([vx, vy], y down)
     * and returns it. Push, Attract and Vortex move things; the other modes
     * break a form apart where it stands and add nothing here. */
    cursorAt(x, y, out) {
      const cursor = current.cursor;
      const p = current.pointer;
      if (!cursor || !p.active || !(cursor.reach > 0)) return out;
      const mode = cursor.mode;
      if (mode !== 'push' && mode !== 'attract' && mode !== 'vortex') return out;
      const dx = x - p.x, dy = y - p.y;
      const d2 = dx * dx + dy * dy;
      const fall = Math.exp(-d2 / (cursor.reach * cursor.reach)) * (cursor.strength ?? 1);
      if (fall < 1e-3) return out;
      const d = Math.sqrt(d2) || 1;
      const ax = dx / d, ay = dy / d; // away from the cursor
      if (mode === 'push') { out[0] += ax * fall; out[1] += ay * fall; }
      else if (mode === 'attract') {
        const near = Math.min(1, d / (cursor.reach * 0.3)); // settle at the cursor, don't overshoot
        out[0] -= ax * fall * near; out[1] -= ay * fall * near;
      } else { // vortex: around the cursor, drawn slightly in
        out[0] += (ay * 0.75 - ax * 0.15) * fall;
        out[1] += (-ax * 0.75 - ay * 0.15) * fall;
      }
      return out;
    },

    /** The flow at a point: the published field plus what the cursor does
     * there. Lines and particles that both follow this move together.
     * `t` is `now()`; a publisher that animates on its own clock may ignore
     * it. Writes into and returns `out`. */
    flowAt(x, y, t, out) {
      out[0] = 0; out[1] = 0;
      const field = current.field;
      if (field) field.sample(x, y, t, out);
      return current.cursorAt(x, y, out);
    },
  };

  // One pointer for the page, tracked only while there is company: an overlay
  // on top of a canvas would otherwise hide the cursor from whatever is under it.
  function onMove(e) { const p = current.pointer; p.x = e.clientX; p.y = e.clientY; p.active = true; }
  function onGone() { current.pointer.active = false; }
  function listen() {
    if (typeof addEventListener !== 'function') return;
    const want = new Set(members.values()).size > 1;
    if (want === listening) return;
    listening = want;
    if (want) {
      addEventListener('pointermove', onMove, { passive: true });
      addEventListener('pointerdown', onMove, { passive: true });
      addEventListener('blur', onGone);
      document.documentElement.addEventListener('pointerleave', onGone);
    } else {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onMove);
      removeEventListener('blur', onGone);
      document.documentElement.removeEventListener('pointerleave', onGone);
      current.pointer.active = false;
    }
  }

  return current;
}

/** The page's one current. Another copy of this file, loaded by something
 * else on the page, returns the same object. */
export function pageCurrent() {
  const existing = globalThis[CURRENT_KEY];
  if (existing) {
    // A different version is a different contract: don't half-understand it.
    return existing.version === CURRENT_VERSION ? existing : createCurrent();
  }
  const made = createCurrent();
  Object.defineProperty(globalThis, CURRENT_KEY, { value: made, configurable: true });
  return made;
}

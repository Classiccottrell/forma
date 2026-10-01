import type { Composition } from '../types.js';
import { shapeRegistry } from '../registry/instances.js';

/** Shape ids that once shipped and were later removed. A composition saved
 * against one of them (an exported file, a homepage preset in localStorage, an
 * embed snippet) must still open, so it falls back to this stand-in at the
 * library's entry points instead of failing with `unknown id`. */
const RETIRED_SHAPE_IDS: ReadonlySet<string> = new Set(['hoodie', 'polo', 'cap']);
const STAND_IN_SHAPE_ID = 'sphere';

/** Swaps a retired shape for the stand-in at its default parameters; returns
 * any other composition unchanged. Only the shape slot is touched. */
export function replaceRetiredShape(c: Composition): Composition {
  if (!RETIRED_SHAPE_IDS.has(c.shapeId)) return c;
  return {
    ...c,
    shapeId: STAND_IN_SHAPE_ID,
    shapeParams: { ...shapeRegistry.require(STAND_IN_SHAPE_ID).defaultParameters },
  };
}

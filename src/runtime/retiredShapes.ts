import type { Composition } from '../types.js';
import { shapeRegistry } from '../registry/instances.js';

/** Shape ids that once shipped and were later removed, with the shape that stands in
 * for each. A composition saved against one of them (an exported file, a homepage
 * preset in localStorage, an embed snippet) must still open, so it falls back to the
 * stand-in at the library's entry points instead of failing with `unknown id`. */
const RETIRED: Readonly<Record<string, string>> = {
  hoodie: 'sphere',
  polo: 'sphere',
  cap: 'sphere',
  'bevelled-box': 'box',
};

/** Shapes that kept their id but were rebuilt with different parameters. A saved
 * composition still carrying exactly the old parameter keys gets the new defaults, so it
 * opens (as the new shape) instead of failing the importer's exact-key check. */
const RESHAPED: Readonly<Record<string, readonly string[]>> = {
  gem: ['facets', 'radius'], // was Faceted Gem, now Quartz Crystal
  badge: ['depth', 'height', 'roundness', 'smoothness', 'width'], // was Badge, now Coin
};

/** Brings a composition saved against an older shape catalogue up to date: a retired
 * shape becomes its stand-in, and a reshaped one with its old parameters gets the new
 * defaults. Any other composition is returned unchanged. Only the shape slot is touched. */
export function replaceRetiredShape(c: Composition): Composition {
  const standIn = RETIRED[c.shapeId];
  if (standIn) {
    return { ...c, shapeId: standIn, shapeParams: { ...shapeRegistry.require(standIn).defaultParameters } };
  }
  const legacy = RESHAPED[c.shapeId];
  if (legacy && c.shapeParams && sameKeys(Object.keys(c.shapeParams), legacy)) {
    return { ...c, shapeParams: { ...shapeRegistry.require(c.shapeId).defaultParameters } };
  }
  return c;
}

function sameKeys(keys: string[], expected: readonly string[]): boolean {
  return keys.length === expected.length && [...keys].sort().every((k, i) => k === expected[i]);
}

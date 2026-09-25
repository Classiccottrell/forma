import type { Composition } from '../types.js';
import { shapeRegistry, materialRegistry, environmentRegistry, effectRegistry } from '../registry/instances.js';

/** "Surprise me" (roadmap §5): a coherent random combination, not a fully unweighted
 * random pick across the cartesian product — pure independent randomness can land on
 * pairings the vision explicitly calls out as looking bad (e.g. `wireframe` material
 * on an already-sparse organic shape, or a reflective material with no environment
 * suited to showing it off). Implemented as small compatibility rule tables consulted
 * only here — `RegistryEntryBase` stays untouched (roadmap §5 option 1). */

// Shapes too visually sparse for a wireframe material to read as anything but noise.
const SPARSE_SHAPES = new Set(['soft-blob', 'spiral', 'ring', 'cross']);

// Materials whose look depends on strong directional/reflective lighting — biased
// toward the two lighting-style environments rather than flat backdrop environments.
const REFLECTIVE_MATERIALS = new Set(['chrome', 'gold', 'copper', 'metal', 'obsidian', 'pearl']);

// Materials that read best against a moody/dark backdrop.
const COOL_MATERIALS = new Set(['glass', 'frosted-glass', 'ice', 'obsidian', 'wireframe', 'rubber']);

// Materials that pair well with a saturated/stylized backdrop.
const STYLIZED_MATERIALS = new Set(['toon', 'neon-plastic', 'velvet']);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Weighted-random environment choice for a given materialId, falling back to a
 * uniform pick across all registered environments if none of the bias rules match
 * (keeps this forward-compatible with new environments added later). */
function pickEnvironmentFor(materialId: string): string {
  const allIds = environmentRegistry.list().map((e) => e.id);
  const has = (id: string) => allIds.includes(id);

  let preferred: string[] = [];
  if (REFLECTIVE_MATERIALS.has(materialId)) preferred = ['studio', 'softbox'].filter(has);
  else if (COOL_MATERIALS.has(materialId)) preferred = ['midnight', 'gradient-sky'].filter(has);
  else if (STYLIZED_MATERIALS.has(materialId)) preferred = ['neon-room', 'sunset'].filter(has);

  return preferred.length > 0 ? pick(preferred) : pick(allIds);
}

/** Generates a valid, registry-resolvable `Composition` biased toward pairings that
 * look intentional. Must run after content registration. `applyComposition` consumes
 * the result directly — no new runtime method needed (roadmap §5). */
export function surpriseMe(): Composition {
  const shapeIds = shapeRegistry.list().map((s) => s.id).filter((id) => id !== 'svg-extrude');
  const materialIds = materialRegistry.list().map((m) => m.id);

  let shapeId = pick(shapeIds);
  let materialId = pick(materialIds);

  // Re-roll material once if it lands on a bad shape/material combo (wireframe + sparse
  // shape) — cheap coherence check, not a full constraint solver.
  if (materialId === 'wireframe' && SPARSE_SHAPES.has(shapeId)) {
    materialId = pick(materialIds.filter((id) => id !== 'wireframe'));
  }

  const environmentId = pickEnvironmentFor(materialId);

  const shapeDef = shapeRegistry.require(shapeId);
  const materialDef = materialRegistry.require(materialId);
  const environmentDef = environmentRegistry.require(environmentId);

  // Effects: bias toward zero or one, never stack several at once (keeps the result
  // readable rather than chaotic) — 50% none, 50% one real effect.
  const realEffectIds = effectRegistry.list().map((e) => e.id).filter((id) => id !== 'none');
  const effectIds: string[] = Math.random() < 0.5 || realEffectIds.length === 0 ? [] : [pick(realEffectIds)];
  const effectParams: Composition['effectParams'] = {};
  for (const id of effectIds) {
    effectParams[id] = { ...effectRegistry.require(id).defaultParameters };
  }

  return {
    shapeId,
    shapeParams: { ...shapeDef.defaultParameters },
    materialId,
    materialParams: { ...materialDef.defaultParameters },
    textureId: 'none',
    textureParams: {},
    environmentId,
    environmentParams: { ...environmentDef.defaultParameters },
    effectIds,
    effectParams,
  };
}

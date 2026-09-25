import type { Composition, Preset } from '../types.js';
import { shapeRegistry, materialRegistry, environmentRegistry, effectRegistry } from '../registry/instances.js';

const PRESET_VERSION = 1;

/** A preset's shape/material/environment/effect params are always built from that
 * definition's *current* `defaultParameters`, optionally overridden per-key — this
 * keeps a preset valid (round-trips through `deserializeComposition`'s key-match
 * check) even as a definition's schema gains/loses params over time, rather than
 * hand-authoring a params object that can silently drift out of sync. */
function composition(spec: {
  shapeId: string;
  shapeOverrides?: Record<string, Composition['shapeParams'][string]>;
  materialId: string;
  materialOverrides?: Record<string, Composition['materialParams'][string]>;
  environmentId: string;
  effectIds?: string[];
  effectOverrides?: Record<string, Record<string, Composition['shapeParams'][string]>>;
}): Composition {
  const shapeDef = shapeRegistry.require(spec.shapeId);
  const materialDef = materialRegistry.require(spec.materialId);
  const environmentDef = environmentRegistry.require(spec.environmentId);
  const effectIds = spec.effectIds ?? [];
  const effectParams: Composition['effectParams'] = {};
  for (const id of effectIds) {
    const def = effectRegistry.require(id);
    effectParams[id] = { ...def.defaultParameters, ...(spec.effectOverrides?.[id] ?? {}) };
  }
  return {
    shapeId: spec.shapeId,
    shapeParams: { ...shapeDef.defaultParameters, ...(spec.shapeOverrides ?? {}) },
    materialId: spec.materialId,
    materialParams: { ...materialDef.defaultParameters, ...(spec.materialOverrides ?? {}) },
    textureId: 'none',
    textureParams: {},
    environmentId: spec.environmentId,
    environmentParams: { ...environmentDef.defaultParameters },
    effectIds,
    effectParams,
  };
}

interface PresetSpec {
  id: string;
  name: string;
  tags?: string[];
  spec: Parameters<typeof composition>[0];
}

/** Curated built-in preset specs — reviewable/extensible without touching runtime
 * code (roadmap §5). Hand-picked combinations chosen for visual coherence: material
 * reflectivity matched to environment, effect chosen to complement the mood. */
const BUILT_IN_PRESET_SPECS: PresetSpec[] = [
  {
    id: 'clay-pill-softbox',
    name: 'Soft Clay Pill',
    tags: ['ui', 'soft', 'studio'],
    spec: { shapeId: 'pill', materialId: 'clay', environmentId: 'softbox' },
  },
  {
    id: 'ceramic-card-studio',
    name: 'Ceramic UI Card',
    tags: ['ui', 'matte', 'studio'],
    spec: { shapeId: 'card', materialId: 'ceramic', environmentId: 'studio' },
  },
  {
    id: 'chrome-badge-studio',
    name: 'Chrome Badge',
    tags: ['ui', 'reflective', 'studio'],
    spec: { shapeId: 'badge', materialId: 'chrome', environmentId: 'studio' },
  },
  {
    id: 'frosted-notched-card-softbox',
    name: 'Frosted Notched Card',
    tags: ['ui', 'glass', 'softbox'],
    spec: { shapeId: 'notched-card', materialId: 'frosted-glass', environmentId: 'softbox' },
  },
  {
    id: 'ice-blob-sunset',
    name: 'Ice Blob at Sunset',
    tags: ['organic', 'glass', 'warm'],
    spec: { shapeId: 'soft-blob', materialId: 'ice', environmentId: 'sunset' },
  },
  {
    id: 'obsidian-gem-midnight',
    name: 'Obsidian Gem at Midnight',
    tags: ['faceted', 'reflective', 'moody'],
    spec: { shapeId: 'gem', materialId: 'obsidian', environmentId: 'midnight', effectIds: ['vignette'] },
  },
  {
    id: 'toon-star-gradient-sky',
    name: 'Toon Star in Gradient Sky',
    tags: ['stylized', 'playful', 'colorful'],
    spec: { shapeId: 'star', materialId: 'toon', environmentId: 'gradient-sky' },
  },
  {
    id: 'gold-torus-softbox',
    name: 'Gold Torus in Softbox',
    tags: ['reflective', 'metallic', 'studio'],
    spec: { shapeId: 'torus', materialId: 'gold', environmentId: 'softbox' },
  },
];

/** Builds the curated built-in preset list. Must be called after
 * `registerAllContent()` — resolves each spec's ids against the live registries
 * (`composition()` throws on an unknown id, failing loudly rather than shipping a
 * preset that silently references a nonexistent shape/material/environment/effect). */
export function builtInPresets(): Preset[] {
  return BUILT_IN_PRESET_SPECS.map(({ id, name, tags, spec }) => ({
    version: PRESET_VERSION,
    id,
    name,
    tags,
    composition: composition(spec),
  }));
}

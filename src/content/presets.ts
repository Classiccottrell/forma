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
  environmentRegistry.require(spec.environmentId); // validates id, no params on env today
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
    environmentId: spec.environmentId,
    environmentParams: {},
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
    id: 'gold-knot-softbox',
    name: 'Gold Torus Knot',
    tags: ['warm', 'metallic', 'studio'],
    spec: { shapeId: 'knot', materialId: 'gold', environmentId: 'softbox' },
  },
  {
    id: 'frosted-gem-midnight-vignette',
    name: 'Frosted Gem at Midnight',
    tags: ['cool', 'glass', 'moody'],
    spec: {
      shapeId: 'gem',
      materialId: 'frosted-glass',
      environmentId: 'midnight',
      effectIds: ['vignette'],
    },
  },
  {
    id: 'chrome-sphere-studio',
    name: 'Chrome Sphere',
    tags: ['metallic', 'studio', 'classic'],
    spec: { shapeId: 'sphere', materialId: 'chrome', environmentId: 'studio' },
  },
  {
    id: 'neon-plastic-spiral-neon-room',
    name: 'Neon Spiral',
    tags: ['warm', 'stylized', 'party'],
    spec: { shapeId: 'spiral', materialId: 'neon-plastic', environmentId: 'neon-room' },
  },
  {
    id: 'obsidian-dodecahedron-midnight',
    name: 'Obsidian Dodecahedron',
    tags: ['cool', 'moody', 'geometric'],
    spec: {
      shapeId: 'dodecahedron',
      materialId: 'obsidian',
      environmentId: 'midnight',
      effectIds: ['vignette'],
      effectOverrides: { vignette: { darkness: 1.0, radius: 0.6 } },
    },
  },
  {
    id: 'ice-blob-sunset',
    name: 'Ice Blob at Sunset',
    tags: ['cool', 'organic', 'glass'],
    spec: { shapeId: 'soft-blob', materialId: 'ice', environmentId: 'sunset' },
  },
  {
    id: 'copper-torus-softbox',
    name: 'Copper Torus',
    tags: ['warm', 'metallic', 'studio'],
    spec: { shapeId: 'torus', materialId: 'copper', environmentId: 'softbox' },
  },
  {
    id: 'velvet-star-sunset-duotone',
    name: 'Velvet Star',
    tags: ['warm', 'stylized'],
    spec: { shapeId: 'star', materialId: 'velvet', environmentId: 'sunset', effectIds: ['duotone'] },
  },
  {
    id: 'wireframe-knot-studio',
    name: 'Wireframe Knot',
    tags: ['geometric', 'technical'],
    spec: { shapeId: 'knot', materialId: 'wireframe', environmentId: 'studio' },
  },
  {
    id: 'clay-capsule-studio',
    name: 'Clay Capsule',
    tags: ['warm', 'soft', 'studio'],
    spec: { shapeId: 'capsule', materialId: 'clay', environmentId: 'studio' },
  },
  {
    id: 'carbon-gem-neon-room-grayscale',
    name: 'Carbon Gem',
    tags: ['cool', 'faceted', 'stylized'],
    spec: {
      shapeId: 'gem',
      materialId: 'carbon',
      environmentId: 'neon-room',
      effectIds: ['grayscale'],
      effectOverrides: { grayscale: { intensity: 0.6 } },
    },
  },
  {
    id: 'toon-icosahedron-gradient-sky',
    name: 'Toon Icosahedron',
    tags: ['stylized', 'playful'],
    spec: { shapeId: 'icosahedron', materialId: 'toon', environmentId: 'gradient-sky' },
  },
  {
    id: 'holographic-vase-aurora',
    name: 'Holographic Vase',
    tags: ['iridescent', 'atmospheric', 'lathe'],
    spec: { shapeId: 'vase', materialId: 'holographic', environmentId: 'aurora-atmosphere' },
  },
  {
    id: 'ceramic-pyramid-sunset',
    name: 'Ceramic Pyramid',
    tags: ['chalk', 'faceted', 'warm'],
    spec: { shapeId: 'pyramid', materialId: 'ceramic', environmentId: 'sunset' },
  },
  {
    id: 'plastic-spring-chromatic',
    name: 'Plastic Spring',
    tags: ['playful', 'parametric', 'prismatic'],
    spec: { shapeId: 'spring', materialId: 'plastic', environmentId: 'aurora-atmosphere', effectIds: ['chromatic-aberration'] },
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

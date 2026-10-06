import { replaceRetiredShape, shapeRegistry, materialRegistry, textureRegistry, environmentRegistry, effectRegistry, type Composition } from 'forma';

export type HomepageTarget = 'studio' | 'gallery';
export interface HomepagePreset { id: string; name: string; target: HomepageTarget; composition: Composition; }
interface HomepagePresetState { entries: HomepagePreset[]; selected: Partial<Record<HomepageTarget, string>>; }

const STORAGE_KEY = 'forma-homepage-presets';

export function readHomepagePresets(): HomepagePresetState {
  if (typeof window === 'undefined') return { entries: [], selected: {} };
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<HomepagePresetState>;
    return { entries: Array.isArray(value.entries) ? value.entries : [], selected: value.selected ?? {} };
  } catch { return { entries: [], selected: {} }; }
}

export function writeHomepagePresets(state: HomepagePresetState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function selectedHomepageComposition(target: HomepageTarget, fallback: Composition): Composition {
  const state = readHomepagePresets();
  const preset = state.entries.find((entry) => entry.id === state.selected[target] && entry.target === target);
  if (!preset || typeof preset.composition !== 'object' || preset.composition === null) return fallback;
  const composition = replaceRetiredShape(preset.composition);
  return referencesKnownContent(composition) ? composition : fallback;
}

/** Presets live in localStorage and skip `deserializeComposition` (its exact
 * param-key check would reject presets the shapes still read leniently), so
 * only check that every id still resolves — the runtime throws on one that
 * doesn't, which would take the whole homepage down. */
function referencesKnownContent(c: Composition): boolean {
  return Boolean(
    shapeRegistry.get(c.shapeId)
    && materialRegistry.get(c.materialId)
    && textureRegistry.get(c.textureId ?? 'none')
    && environmentRegistry.get(c.environmentId)
    && Array.isArray(c.effectIds) && c.effectIds.every((id) => effectRegistry.get(id)),
  );
}

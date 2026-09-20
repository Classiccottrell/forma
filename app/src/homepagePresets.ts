import type { Composition } from 'forma';

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
  return preset?.composition ?? fallback;
}

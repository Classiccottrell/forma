import type { Preset } from 'forma';

export interface PresetGalleryProps {
  presets: Preset[];
  onSelect(preset: Preset): void;
}

/** Grid of built-in `Preset` entries (roadmap §5/§6). Click applies the preset's full
 * `Composition` via `onSelect` in one action — no per-slot state, just the whole
 * composition swapped at once through the same `apply()` the rest of the app uses. */
export function PresetGallery({ presets, onSelect }: PresetGalleryProps) {
  return (
    <div className="picker-grid" data-testid="preset-gallery">
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          className="picker-cell"
          onClick={() => onSelect(p)}
          title={(p.tags ?? []).join(', ')}
          data-testid={`preset-${p.id}`}
        >
          <span className="preset-thumb" data-preset={p.id} aria-hidden="true" />
          {p.name}
        </button>
      ))}
    </div>
  );
}

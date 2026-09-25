import { environmentRegistry, materialRegistry, shapeRegistry } from 'forma';
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
        (() => {
          const { shapeId, materialId, environmentId, effectIds } = p.composition;
          const shape = shapeRegistry.require(shapeId);
          const material = materialRegistry.require(materialId);
          const environment = environmentRegistry.require(environmentId);
          const effect = effectIds[0] ?? 'none';
          return (
        <button
          key={p.id}
          type="button"
          className="picker-cell"
          onClick={() => onSelect(p)}
          title={`${shape.label} · ${material.label} · ${environment.label}`}
          aria-label={`${p.name}: ${shape.label}, ${material.label}, ${environment.label}${effect !== 'none' ? `, ${effect}` : ''}`}
          data-testid={`preset-${p.id}`}
        >
          <span
            className="preset-thumb"
            data-preset={p.id}
            data-shape={shapeId}
            data-material={materialId}
            data-environment={environmentId}
            data-effect={effect}
            aria-hidden="true"
          />
          <span className="picker-name">{p.name}</span>
          <span className="picker-category">{shape.label} · {material.label}</span>
        </button>
          );
        })()
      ))}
    </div>
  );
}

import { useMemo, useRef } from 'react';
import type { Composition, ParamValue } from 'forma';
import { materialRegistry, shapeRegistry } from 'forma';
import { builtInPresets, registerAllContent } from 'forma/content';
import { useFormaRuntime } from './hooks/useFormaRuntime';
import { Viewport } from './components/Viewport';
import { selectedHomepageComposition } from './homepagePresets';

registerAllContent();

const studioPreset = builtInPresets().find((preset) => preset.id === 'clay-pill-softbox')!;
const studioComposition: Composition = {
  ...studioPreset.composition,
  materialId: 'pearl',
  materialParams: { ...materialRegistry.require('pearl').defaultParameters },
};
const galleryPresetIds = ['clay-pill-softbox', 'ceramic-card-studio', 'chrome-badge-studio', 'frosted-notched-card-softbox'] as const;

function updateParam(current: Composition, apply: (patch: Partial<Composition>) => void, slot: 'shapeParams' | 'materialParams', key: string, value: ParamValue) {
  apply({ [slot]: { ...current[slot], [key]: value } } as Partial<Composition>);
}

function ControlCard({ current, apply }: { current: Composition; apply: (patch: Partial<Composition>) => void }) {
  const shape = shapeRegistry.require(current.shapeId);
  const material = materialRegistry.require(current.materialId);
  const roundness = shape.parameterSchema.roundness;
  const surface = material.parameterSchema.roughness ?? material.parameterSchema.metalness;
  if (roundness?.kind !== 'number' || surface?.kind !== 'number') return null;
  return (
    <div className="home-control-card" aria-label="Live composition controls">
      <div className="home-card-kicker">Live controls</div>
      <label>
        <span>Roundness <output>{Number(current.shapeParams.roundness).toFixed(2)}</output></span>
        <input type="range" min={roundness.min} max={roundness.max} step={roundness.step} value={Number(current.shapeParams.roundness)} aria-label="Roundness" onChange={(event) => updateParam(current, apply, 'shapeParams', 'roundness', Number(event.target.value))} />
      </label>
      <label>
        <span>{material.parameterSchema.roughness ? 'Roughness' : 'Metalness'} <output>{Number(current.materialParams[material.parameterSchema.roughness ? 'roughness' : 'metalness']).toFixed(2)}</output></span>
        <input type="range" min={surface.min} max={surface.max} step={surface.step} value={Number(current.materialParams[material.parameterSchema.roughness ? 'roughness' : 'metalness'])} aria-label={material.parameterSchema.roughness ? 'Roughness' : 'Metalness'} onChange={(event) => updateParam(current, apply, 'materialParams', material.parameterSchema.roughness ? 'roughness' : 'metalness', Number(event.target.value))} />
      </label>
      <div className="home-card-meta"><span>{shape.label}</span><span>{material.label}</span><span>{current.environmentId}</span></div>
    </div>
  );
}

export default function HomePage({ gallery = false }: { gallery?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const presets = useMemo(() => builtInPresets().filter((preset) => galleryPresetIds.includes(preset.id as (typeof galleryPresetIds)[number])), []);
  const initialFallback = gallery ? presets[1]?.composition ?? studioComposition : studioComposition;
  const initial = selectedHomepageComposition(gallery ? 'gallery' : 'studio', initialFallback);
  const { scene, scheduler, current, apply } = useFormaRuntime(hostRef, initial);

  return (
    <main className={`home-shell${gallery ? ' home-gallery' : ' home-studio'}`}>
      <Viewport hostRef={hostRef} scene={scene} scheduler={scheduler} defaultAutoSpin />
      <header className="home-nav">
        <a className="brand" href="/">for<em>ma</em></a>
        <nav aria-label="Homepage navigation">
          <a href={gallery ? '/' : '/?variant=gallery'}>{gallery ? 'Studio view' : 'Gallery view'}</a>
          <a className="home-nav-cta" href="/editor">Open editor <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      {gallery ? (
        <section className="home-gallery-content" aria-labelledby="gallery-title">
          <div className="home-gallery-intro"><p className="eyebrow">Forma / object studies</p><h1 id="gallery-title">Designed in space.</h1><p>Shape, material, light, export. A small system for making dimensional ideas feel inevitable.</p><a className="home-button" href="/editor">Build your own <span aria-hidden="true">→</span></a></div>
          <div className="home-presets" aria-label="Curated presets">
            <p className="eyebrow">Curated presets</p>
            {presets.map((preset) => <button type="button" className={`home-preset${current.shapeId === preset.composition.shapeId && current.materialId === preset.composition.materialId ? ' is-active' : ''}`} key={preset.id} onClick={() => apply(preset.composition)}><span className="home-preset-swatch" data-shape={preset.composition.shapeId} data-material={preset.composition.materialId} /><span><strong>{preset.name}</strong><small>{preset.composition.shapeId} · {preset.composition.materialId}</small></span><span aria-hidden="true">↗</span></button>)}
          </div>
        </section>
      ) : (
        <section className="home-studio-content" aria-labelledby="studio-title">
          <div className="home-studio-copy"><p className="eyebrow">A quiet place for form</p><h1 id="studio-title">Make the invisible<br /><i>feel tangible.</i></h1><p>Forma turns shape, surface, and light into a living design material.</p><a className="home-button" href="/editor">Enter the studio <span aria-hidden="true">→</span></a></div>
          <div className="home-type-map" aria-label="Live type mapped to the rotating 3D object"><span>LIVE TYPE / 01</span><strong>FORMA</strong><small>mapped to the current object</small></div>
          <ControlCard current={current} apply={apply} />
        </section>
      )}
      <footer className="home-footer"><span>FORMA / 2026</span><span>WebGL object studio</span></footer>
    </main>
  );
}

import { useMemo, useState } from 'react';
import { shapeRegistry, materialRegistry, textureRegistry, environmentRegistry, effectRegistry, type Composition } from 'forma';
import { builtInPresets } from 'forma/content';
import { DefinitionPicker } from './DefinitionPicker';
import { ParamGroup } from './ParamGroup';
import { ExportPanel } from './ExportPanel';
import { SvgImport } from './SvgImport';
import { PresetGallery } from './PresetGallery';
import type { FormaScene } from 'forma';
import type { PresentationState } from './Viewport';

export interface ControlPanelProps {
  collapsed: boolean;
  composition: Composition;
  scene: FormaScene | null;
  onSlotSelect(slot: 'shapeId' | 'materialId' | 'textureId' | 'environmentId', id: string): void;
  onParamChange(slot: 'shapeParams' | 'materialParams' | 'textureParams' | 'environmentParams', key: string, value: Composition['shapeParams'][string]): void;
  onEffectStageSelect(stageIds: string[], id: string): void;
  onEffectParamChange(id: string, key: string, value: Composition['shapeParams'][string]): void;
  onSvgImport(svgText: string): void;
  onApplyComposition(composition: Composition): void;
  onImportComposition(composition: Composition): void;
  presentation: PresentationState;
  onPresentationChange(patch: Partial<PresentationState>): void;
}

type SectionId = 'presets' | 'shape' | 'material' | 'texture' | 'environment' | 'effects' | 'camera' | 'export';
type ShapeFilter = 'all' | 'solid' | 'flat' | 'yours';

/** Collapsible sections container: Shape / Material / Environment / Effects / Export.
 * Search box filters visible definitions by label/category (roadmap §6). */
export function ControlPanel(props: ControlPanelProps) {
  const { collapsed, composition, scene, presentation, onPresentationChange, onSlotSelect, onParamChange, onEffectStageSelect, onEffectParamChange, onSvgImport, onApplyComposition, onImportComposition } = props;
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    presets: false,
    shape: true,
    material: true,
    texture: false,
    environment: false,
    effects: false,
    camera: false,
    export: false,
  });
  const [search, setSearch] = useState('');
  const [shapeFilter, setShapeFilter] = useState<ShapeFilter>('all');
  const [materialTab, setMaterialTab] = useState<'library' | 'settings'>('library');
  const presets = useMemo(() => builtInPresets(), []);

  function toggle(id: SectionId) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }

  const shapeDef = shapeRegistry.require(composition.shapeId);
  const materialDef = materialRegistry.require(composition.materialId);
  const textureDef = textureRegistry.require(composition.textureId ?? 'none');
  const shapeEntries = shapeRegistry.list().filter((entry) => {
    if (shapeFilter === 'yours') return entry.id === 'svg-extrude';
    if (shapeFilter === 'solid') return ['primitive', 'organic', 'faceted', 'parametric', 'lathe'].includes(entry.category);
    if (shapeFilter === 'flat') return ['ui', 'extruded', 'symbol', 'emoji symbol'].includes(entry.category);
    return true;
  });

  // While searching, force-open any section with a match instead of mutating `open`
  // (keeps the user's manual collapse/expand choices intact once search clears).
  const q = search.trim().toLowerCase();
  function matches(entries: { label: string; category: string }[]): boolean {
    return entries.some((e) => e.label.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }
  const isOpen = (id: SectionId, entries?: { label: string; category: string }[]) =>
    open[id] || (q.length > 0 && !!entries && matches(entries));

  const effectEntries = effectRegistry.list().map((d) => ({ label: d.label, category: 'effect' }));

  return (
    <div id="forma-control-panel" className={`control-panel${collapsed ? ' collapsed' : ''}`} data-testid="control-panel">
      <input
        className="search-input"
        type="search"
        aria-label="Search shapes, materials, textures, environments, and effects"
        placeholder="Search shapes, materials…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 14 }}
        data-testid="search-input"
      />

      <Section id="presets" title="Presets" open={open.presets} onToggle={toggle}>
        <PresetGallery presets={presets} onSelect={(p) => onApplyComposition(p.composition)} />
      </Section>

      <Section id="texture" title="Texture" open={isOpen('texture', textureRegistry.list())} onToggle={toggle}>
        <DefinitionPicker entries={textureRegistry.list()} selectedId={composition.textureId ?? 'none'} onSelect={(id) => onSlotSelect('textureId', id)} filter={search} kind="texture" />
        <div style={{ marginTop: 10 }}>
          <ParamGroup schema={textureDef.parameterSchema} values={composition.textureParams ?? {}} onChange={(k, v) => onParamChange('textureParams', k, v)} />
        </div>
      </Section>

      <Section id="shape" title="Shape" open={isOpen('shape', shapeRegistry.list())} onToggle={toggle}>
        <div className="filter-tabs" role="tablist" aria-label="Shape categories">
          {(['all', 'solid', 'flat', 'yours'] as ShapeFilter[]).map((filter) => (
            <button key={filter} type="button" role="tab" aria-selected={shapeFilter === filter} className={shapeFilter === filter ? 'active' : ''} onClick={() => setShapeFilter(filter)}>
              {filter[0].toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <DefinitionPicker
          entries={shapeEntries}
          selectedId={composition.shapeId}
          onSelect={(id) => onSlotSelect('shapeId', id)}
          filter={search}
          kind="shape"
        />
        <div style={{ marginTop: 10 }}>
          <ParamGroup schema={shapeDef.parameterSchema} values={composition.shapeParams} onChange={(k, v) => onParamChange('shapeParams', k, v)} />
        </div>
        <div style={{ marginTop: 14 }}>
          <SvgImport onImport={onSvgImport} />
        </div>
      </Section>

      <Section id="material" title="Material" open={isOpen('material', materialRegistry.list())} onToggle={toggle}>
        <div className="filter-tabs material-tabs" role="tablist" aria-label="Material views">
          {(['library', 'settings'] as const).map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={materialTab === tab} className={materialTab === tab ? 'active' : ''} onClick={() => setMaterialTab(tab)}>
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {materialTab === 'library' ? (
          <DefinitionPicker entries={materialRegistry.list()} selectedId={composition.materialId} onSelect={(id) => onSlotSelect('materialId', id)} filter={search} kind="material" />
        ) : (
          <div className="material-settings">
            <div className="selected-definition">{materialDef.label}<span>{materialDef.category}</span></div>
            <SurfacePresets selectedId={composition.textureId ?? 'none'} onSelect={(id) => onSlotSelect('textureId', id)} />
            <ParamGroup schema={materialDef.parameterSchema} values={composition.materialParams} onChange={(k, v) => onParamChange('materialParams', k, v)} />
          </div>
        )}
      </Section>

      <Section id="environment" title="Environment" open={isOpen('environment', environmentRegistry.list())} onToggle={toggle}>
        <DefinitionPicker
          entries={environmentRegistry.list()}
          selectedId={composition.environmentId}
          onSelect={(id) => onSlotSelect('environmentId', id)}
          filter={search}
          kind="environment"
        />
        <div style={{ marginTop: 10 }}>
          <ParamGroup
            schema={environmentRegistry.require(composition.environmentId).parameterSchema}
            values={{ ...environmentRegistry.require(composition.environmentId).defaultParameters, ...composition.environmentParams }}
            onChange={(key, value) => onParamChange('environmentParams', key, value)}
          />
          {String(composition.environmentParams.lightingMode ?? 'environment') === 'directional' && (
            <DirectionalPad
              x={Number(composition.environmentParams.lightX ?? 0.45)}
              y={Number(composition.environmentParams.lightY ?? 0.65)}
              onChange={(key, value) => onParamChange('environmentParams', key, value)}
            />
          )}
        </div>
      </Section>

      <Section id="effects" title="Effects" open={isOpen('effects', effectEntries)} onToggle={toggle}>
        <EffectPipeline composition={composition} search={search} onSelect={onEffectStageSelect} onParamChange={onEffectParamChange} />
      </Section>

      <Section id="camera" title="Presentation" open={open.camera} onToggle={toggle}>
        <PresentationControls value={presentation} onChange={onPresentationChange} />
        <CameraControls value={presentation} onChange={onPresentationChange} />
      </Section>

      <Section id="export" title="Export" open={open.export} onToggle={toggle}>
        <ExportPanel scene={scene} composition={composition} onImportComposition={onImportComposition} />
      </Section>
    </div>
  );
}

// One effect may be active per stage, so stages are what decide which effects
// can be combined. Bloom gets its own rather than joining Finish: bloom plus a
// vignette is the combination that reads premium, and sharing a stage would
// make them mutually exclusive.
const EFFECT_STAGES = [
  { label: 'Texture', ids: ['none'] },
  { label: 'Colour', ids: ['duotone', 'grayscale', 'invert', 'color-grade'] },
  { label: 'Glow', ids: ['bloom'] },
  { label: 'Finish', ids: ['vignette', 'chromatic-aberration', 'film-grain'] },
] as const;

/** Sorts effect ids into stage order, which is the order the runtime creates
 * their passes in. Without this, `effectIds` kept the order effects happened to
 * be picked in: choose a Finish effect, then Bloom, and Bloom would process the
 * already-finished image — while the panel above claimed the reverse. The
 * displayed pipeline has to be the rendered one. Ids outside every stage keep
 * their relative order at the end (the sort is stable). */
export function orderByStage(effectIds: readonly string[]): string[] {
  const rank = (id: string): number => {
    const index = EFFECT_STAGES.findIndex((stage) => (stage.ids as readonly string[]).includes(id));
    return index === -1 ? EFFECT_STAGES.length : index;
  };
  return [...effectIds].sort((a, b) => rank(a) - rank(b));
}

function EffectPipeline({ composition, search, onSelect, onParamChange }: { composition: Composition; search: string; onSelect(stageIds: string[], id: string): void; onParamChange(id: string, key: string, value: Composition['shapeParams'][string]): void }) {
  return <div className="effect-pipeline">
    {EFFECT_STAGES.map((stage, stageIndex) => {
      const entries = stage.ids.map((id) => effectRegistry.require(id)).filter((def) => !search || def.label.toLowerCase().includes(search.toLowerCase()));
      const selectedId = stage.ids.find((id) => composition.effectIds.includes(id)) ?? 'none';
      const selected = selectedId === 'none' ? null : effectRegistry.require(selectedId);
      return <div className="effect-stage" key={stage.label}>
        <div className="effect-stage-heading"><span>{stage.label}</span><span>{String(stageIndex + 1).padStart(2, '0')} / {EFFECT_STAGES.length}</span></div>
        <select aria-label={`${stage.label} effect`} value={selectedId} onChange={(event) => onSelect([...stage.ids], event.target.value)}>
          <option value="none">None</option>
          {entries.filter((def) => def.id !== 'none').map((def) => <option key={def.id} value={def.id}>{def.label}</option>)}
        </select>
        {selected && <ParamGroup schema={selected.parameterSchema} values={composition.effectParams[selected.id] ?? selected.defaultParameters} onChange={(key, value) => onParamChange(selected.id, key, value)} />}
      </div>;
    })}
  </div>;
}

function SurfacePresets({ selectedId, onSelect }: { selectedId: string; onSelect(id: string): void }) {
  const ids = ['none', 'linen-blue', 'book-pattern', 'fine-grained-wood', 'brushed-metal', 'mineral-matte'];
  return <div className="surface-presets" aria-label="Surface presets">
    <div className="param-label"><span>Surface</span><span className="value">{textureRegistry.require(selectedId).label}</span></div>
    <div className="surface-preset-grid" role="listbox" aria-label="Surface preset options">
      {ids.map((id) => {
        const texture = textureRegistry.get(id);
        if (!texture) return null;
        return <button key={id} type="button" className={`surface-preset${id === selectedId ? ' selected' : ''}`} onClick={() => onSelect(id)} role="option" aria-selected={id === selectedId}>
          <span className="surface-swatch" data-surface={id} aria-hidden="true" />
          <span>{texture.label.replace(/\s+(Normal|Roughness)$/i, '')}</span>
        </button>;
      })}
    </div>
  </div>;
}

function CameraControls({ value, onChange }: { value: PresentationState; onChange(patch: Partial<PresentationState>): void }) {
  const controls = [
    ['fov', 'Lens', 25, 80, 1, '°'],
    ['azimuth', 'Turn', -180, 180, 1, '°'],
    ['elevation', 'Tilt', -80, 80, 1, '°'],
    ['zoom', 'Zoom', 0.75, 1.5, 0.01, '×'],
  ] as const;
  return <div className="camera-controls">
    {controls.map(([key, label, min, max, step, suffix]) => (
      <label className="param-row" key={key}>
        <span className="param-label"><span>{label}</span><span className="value">{value[key]}{suffix}</span></span>
        <input type="range" min={min} max={max} step={step} value={value[key]} aria-label={label} onChange={(event) => onChange({ [key]: Number(event.target.value) })} />
      </label>
    ))}
    <p className="control-help">Lens and view direction shape the presentation without changing the object.</p>
  </div>;
}

function PresentationControls({ value, onChange }: { value: PresentationState; onChange(patch: Partial<PresentationState>): void }) {
  return <div className="presentation-controls">
    <label className="param-row"><span className="param-label"><span>Backdrop</span></span><select aria-label="Backdrop" value={value.backdrop} onChange={(event) => onChange({ backdrop: event.target.value as PresentationState['backdrop'] })}><option value="environment">Environment</option><option value="gradient">Gradient</option><option value="transparent">Transparent</option></select></label>
    <label className="param-label" style={{ cursor: 'pointer' }}><span>Floor shadow</span><input type="checkbox" checked={value.floorShadow} onChange={(event) => onChange({ floorShadow: event.target.checked })} /></label>
    {value.floorShadow && <>
      <label className="param-row"><span className="param-label"><span>Shadow strength</span><span className="value">{value.shadowStrength.toFixed(2)}</span></span><input type="range" min="0" max="1" step="0.01" value={value.shadowStrength} aria-label="Shadow strength" onChange={(event) => onChange({ shadowStrength: Number(event.target.value) })} /></label>
      <label className="param-row"><span className="param-label"><span>Shadow softness</span><span className="value">{value.shadowSoftness.toFixed(2)}</span></span><input type="range" min="0" max="1" step="0.01" value={value.shadowSoftness} aria-label="Shadow softness" onChange={(event) => onChange({ shadowSoftness: Number(event.target.value) })} /></label>
    </>}
  </div>;
}

function DirectionalPad({ x, y, onChange }: { x: number; y: number; onChange(key: string, value: number): void }) {
  function update(event: React.PointerEvent<HTMLDivElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = Math.round((Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * 2 - 1) * 100) / 100;
    const nextY = Math.round((1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))) * 100) / 100;
    onChange('lightX', nextX);
    onChange('lightY', nextY);
  }
  return (
    <div className="directional-pad-wrap">
      <div className="directional-pad-label">Directional position</div>
      <div
        className="directional-pad"
        role="img"
        aria-label={`Directional light position: horizontal ${x.toFixed(2)}, vertical ${y.toFixed(2)}`}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
        onPointerMove={(event) => { if (event.buttons === 1) update(event); }}
      >
        <span className="directional-pad-orb" style={{ left: `${((x + 1) / 2) * 100}%`, top: `${(1 - y) * 100}%` }} aria-hidden="true" />
      </div>
      <p className="control-help">Drag the lamp across the pad. Sliders above remain keyboard accessible.</p>
    </div>
  );
}

function Section({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle(id: SectionId): void;
  children: React.ReactNode;
}) {
  return (
    <div className="section">
      <button
        type="button"
        className="section-header"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`section-body-${id}`}
        data-testid={`section-header-${id}`}
      >
        <span>{title}</span>
        <span className="section-icon" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="section-body" id={`section-body-${id}`}>{children}</div>}
    </div>
  );
}

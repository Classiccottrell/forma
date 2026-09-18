import { useMemo, useState } from 'react';
import { shapeRegistry, materialRegistry, environmentRegistry, effectRegistry, type Composition } from 'forma';
import { builtInPresets } from 'forma/content';
import { DefinitionPicker } from './DefinitionPicker';
import { ParamGroup } from './ParamGroup';
import { ExportPanel } from './ExportPanel';
import { SvgImport } from './SvgImport';
import { PresetGallery } from './PresetGallery';
import type { FormaScene } from 'forma';

export interface ControlPanelProps {
  collapsed: boolean;
  composition: Composition;
  scene: FormaScene | null;
  onSlotSelect(slot: 'shapeId' | 'materialId' | 'environmentId', id: string): void;
  onParamChange(slot: 'shapeParams' | 'materialParams', key: string, value: Composition['shapeParams'][string]): void;
  onEffectToggle(id: string, enabled: boolean): void;
  onEffectParamChange(id: string, key: string, value: Composition['shapeParams'][string]): void;
  onSvgImport(svgText: string): void;
  onApplyComposition(composition: Composition): void;
}

type SectionId = 'presets' | 'shape' | 'material' | 'environment' | 'effects' | 'export';

/** Collapsible sections container: Shape / Material / Environment / Effects / Export.
 * Search box filters visible definitions by label/category (roadmap §6). */
export function ControlPanel(props: ControlPanelProps) {
  const { collapsed, composition, scene, onSlotSelect, onParamChange, onEffectToggle, onEffectParamChange, onSvgImport, onApplyComposition } = props;
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    presets: false,
    shape: true,
    material: true,
    environment: false,
    effects: false,
    export: false,
  });
  const [search, setSearch] = useState('');
  const presets = useMemo(() => builtInPresets(), []);

  function toggle(id: SectionId) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }

  const shapeDef = shapeRegistry.require(composition.shapeId);
  const materialDef = materialRegistry.require(composition.materialId);

  // While searching, force-open any section with a match instead of mutating `open`
  // (keeps the user's manual collapse/expand choices intact once search clears).
  const q = search.trim().toLowerCase();
  function matches(entries: { label: string; category: string }[]): boolean {
    return entries.some((e) => e.label.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }
  const isOpen = (id: SectionId, entries?: { label: string; category: string }[]) =>
    open[id] || (q.length > 0 && !!entries && matches(entries));

  const effectEntries = effectRegistry.list().map((d) => ({ label: d.label, category: 'effect' }));
  const visibleEffects = q ? effectRegistry.list().filter((d) => d.label.toLowerCase().includes(q)) : effectRegistry.list();

  return (
    <div className={`control-panel${collapsed ? ' collapsed' : ''}`} data-testid="control-panel">
      <input
        className="search-input"
        placeholder="Search shapes, materials…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 14 }}
        data-testid="search-input"
      />

      <Section id="presets" title="Presets" open={open.presets} onToggle={toggle}>
        <PresetGallery presets={presets} onSelect={(p) => onApplyComposition(p.composition)} />
      </Section>

      <Section id="shape" title="Shape" open={isOpen('shape', shapeRegistry.list())} onToggle={toggle}>
        <DefinitionPicker
          entries={shapeRegistry.list()}
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
        <DefinitionPicker
          entries={materialRegistry.list()}
          selectedId={composition.materialId}
          onSelect={(id) => onSlotSelect('materialId', id)}
          filter={search}
          kind="material"
        />
        <div style={{ marginTop: 10 }}>
          <ParamGroup
            schema={materialDef.parameterSchema}
            values={composition.materialParams}
            onChange={(k, v) => onParamChange('materialParams', k, v)}
          />
        </div>
      </Section>

      <Section id="environment" title="Environment" open={isOpen('environment', environmentRegistry.list())} onToggle={toggle}>
        <DefinitionPicker
          entries={environmentRegistry.list()}
          selectedId={composition.environmentId}
          onSelect={(id) => onSlotSelect('environmentId', id)}
          filter={search}
          kind="environment"
        />
      </Section>

      <Section id="effects" title="Effects" open={isOpen('effects', effectEntries)} onToggle={toggle}>
        {visibleEffects.map((def) => {
          const enabled = composition.effectIds.includes(def.id);
          return (
            <div key={def.id} style={{ marginBottom: 10 }}>
              <label className="param-label" style={{ cursor: 'pointer' }}>
                <span className="effect-label"><span className="effect-swatch" data-effect={def.id} aria-hidden="true" />{def.label}</span>
                <input type="checkbox" checked={enabled} onChange={(e) => onEffectToggle(def.id, e.target.checked)} />
              </label>
              {enabled && (
                <ParamGroup
                  schema={def.parameterSchema}
                  values={composition.effectParams[def.id] ?? def.defaultParameters}
                  onChange={(k, v) => onEffectParamChange(def.id, k, v)}
                />
              )}
            </div>
          );
        })}
      </Section>

      <Section id="export" title="Export" open={open.export} onToggle={toggle}>
        <ExportPanel scene={scene} composition={composition} />
      </Section>
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
      <div className="section-header" onClick={() => onToggle(id)} data-testid={`section-header-${id}`}>
        <span>{title}</span>
        <span>{open ? '−' : '+'}</span>
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

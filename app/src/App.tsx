import { useRef, useState } from 'react';
import type { Composition, ParamValue } from 'forma';
import { shapeRegistry, materialRegistry, effectRegistry } from 'forma';
const SVG_EXTRUDE_SHAPE_ID = 'svg-extrude';
import { useFormaRuntime } from './hooks/useFormaRuntime';
import { Viewport } from './components/Viewport';
import { ControlPanel } from './components/ControlPanel';

/** Top-level layout: viewport + ControlPanel + top bar (roadmap §6). Holds
 * Composition state via useFormaRuntime, passes apply(patch) down. */
export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { scene, apply, current } = useFormaRuntime(hostRef);
  const [collapsed, setCollapsed] = useState(false);

  function onSlotSelect(slot: 'shapeId' | 'materialId' | 'environmentId', id: string) {
    if (slot === 'shapeId') {
      apply({ shapeId: id, shapeParams: { ...shapeRegistry.require(id).defaultParameters } });
    } else if (slot === 'materialId') {
      apply({ materialId: id, materialParams: { ...materialRegistry.require(id).defaultParameters } });
    } else {
      apply({ environmentId: id, environmentParams: {} });
    }
  }

  function onParamChange(slot: 'shapeParams' | 'materialParams', key: string, value: ParamValue) {
    apply({ [slot]: { ...current[slot], [key]: value } } as Partial<Composition>);
  }

  function onEffectToggle(id: string, enabled: boolean) {
    const effectIds = enabled ? [...current.effectIds, id] : current.effectIds.filter((e) => e !== id);
    const effectParams = { ...current.effectParams };
    if (enabled && !effectParams[id]) effectParams[id] = { ...effectRegistry.require(id).defaultParameters };
    apply({ effectIds, effectParams });
  }

  function onSvgImport(svgText: string) {
    apply({
      shapeId: SVG_EXTRUDE_SHAPE_ID,
      shapeParams: { ...shapeRegistry.require(SVG_EXTRUDE_SHAPE_ID).defaultParameters, svg: svgText },
    });
  }

  function onEffectParamChange(id: string, key: string, value: ParamValue) {
    apply({
      effectParams: {
        ...current.effectParams,
        [id]: { ...(current.effectParams[id] ?? effectRegistry.require(id).defaultParameters), [key]: value },
      },
    });
  }

  return (
    <div className="app-shell">
      <Viewport hostRef={hostRef} scene={scene} />

      <div className="topbar">
        <div className="brand">
          for<em>ma</em>
        </div>
        <button type="button" className="btn panel-collapse-btn" onClick={() => setCollapsed((c) => !c)} data-testid="panel-toggle">
          {collapsed ? '☰ Panel' : '✕ Panel'}
        </button>
      </div>

      <ControlPanel
        collapsed={collapsed}
        composition={current}
        scene={scene}
        onSlotSelect={onSlotSelect}
        onParamChange={onParamChange}
        onEffectToggle={onEffectToggle}
        onEffectParamChange={onEffectParamChange}
        onSvgImport={onSvgImport}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { Composition, ParamValue } from 'forma';
import { shapeRegistry, materialRegistry, effectRegistry } from 'forma';
const SVG_EXTRUDE_SHAPE_ID = 'svg-extrude';
import { useFormaRuntime, defaultComposition } from './hooks/useFormaRuntime';
import { Viewport } from './components/Viewport';
import { ControlPanel } from './components/ControlPanel';
import { SurpriseMeButton } from './components/SurpriseMeButton';
import { OnboardingHint } from './components/OnboardingHint';

/** True while a shortcut should NOT fire — focus is in a text input, textarea,
 * select, or contenteditable element (search box, SVG-paste textarea, etc.). */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.('input, textarea, select, [contenteditable]');
}

/** Top-level layout: viewport + ControlPanel + top bar (roadmap §6). Holds
 * Composition state via useFormaRuntime, passes apply(patch) down. */
export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { scene, scheduler, apply, current } = useFormaRuntime(hostRef);
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640);

  // `H` toggles the control panel. No modifiers (Cmd/Ctrl+H would hide the browser
  // window on macOS), and never fires while a text input/textarea/select has focus
  // (search box, SVG-paste textarea) — roadmap M3 item 2.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'h' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      setCollapsed((c) => !c);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Debug hook for real (non-DOM-proxy) camera-state verification — app layer only,
  // not published in `forma`'s package.
  useEffect(() => {
    (window as unknown as { __formaDebug?: unknown }).__formaDebug = scene ? { camera: scene.camera } : undefined;
  }, [scene]);

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

  function applyComposition(composition: Composition) {
    apply(composition);
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
      <Viewport hostRef={hostRef} scene={scene} scheduler={scheduler} />
      <OnboardingHint />

      <div className="topbar">
        <div className="brand">
          for<em>ma</em>
        </div>
        <SurpriseMeButton onApply={applyComposition} />
        <button
          type="button"
          className="btn"
          onClick={() => applyComposition(defaultComposition())}
          title="Reset composition to the default sphere/matte/studio setup"
          data-testid="reset-composition"
        >
          Reset composition
        </button>
        <button
          type="button"
          className="btn panel-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="forma-control-panel"
          title="Toggle panel (H)"
          data-testid="panel-toggle"
        >
          {collapsed ? 'Open panel' : 'Close panel'}
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
        onApplyComposition={applyComposition}
      />
    </div>
  );
}

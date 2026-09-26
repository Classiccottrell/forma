import { useEffect, useRef, useState } from 'react';
import type { Composition, ParamValue } from 'forma';
import { shapeRegistry, materialRegistry, textureRegistry, environmentRegistry, effectRegistry } from 'forma';
const SVG_EXTRUDE_SHAPE_ID = 'svg-extrude';
import { useFormaRuntime, defaultComposition } from './hooks/useFormaRuntime';
import { DEFAULT_PRESENTATION, Viewport, type PresentationState } from './components/Viewport';
import { ControlPanel, orderByStage } from './components/ControlPanel';
import { SurpriseMeButton } from './components/SurpriseMeButton';
import { OnboardingHint } from './components/OnboardingHint';
import HomePage from './HomePage';
import CreatorPanel from './components/CreatorPanel';

/** True while a shortcut should NOT fire — focus is in a text input, textarea,
 * select, or contenteditable element (search box, SVG-paste textarea, etc.). */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.('input, textarea, select, [contenteditable]');
}

/** Top-level layout: viewport + ControlPanel + top bar (roadmap §6). Holds
 * Composition state via useFormaRuntime, passes apply(patch) down. */
export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname !== '/editor') {
    return <HomePage gallery={new URLSearchParams(window.location.search).get('variant') === 'gallery'} />;
  }
  const hostRef = useRef<HTMLDivElement>(null);
  const { scene, scheduler, apply, current, contextLost } = useFormaRuntime(hostRef);
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 640);
  const [creatorMode, setCreatorMode] = useState(false);
  const [presentation, setPresentation] = useState<PresentationState>(DEFAULT_PRESENTATION);
  const historyRef = useRef<{ past: Composition[]; future: Composition[] }>({ past: [], future: [] });

  function applyTracked(patch: Partial<Composition>): void {
    historyRef.current.past.push(current);
    historyRef.current.future = [];
    apply(patch);
  }

  function undo(): void {
    const previous = historyRef.current.past.pop();
    if (!previous) return;
    historyRef.current.future.unshift(current);
    apply(previous);
  }

  function redo(): void {
    const next = historyRef.current.future.shift();
    if (!next) return;
    historyRef.current.past.push(current);
    apply(next);
  }

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

  function onSlotSelect(slot: 'shapeId' | 'materialId' | 'textureId' | 'environmentId', id: string) {
    if (slot === 'shapeId') {
      applyTracked({ shapeId: id, shapeParams: { ...shapeRegistry.require(id).defaultParameters } });
    } else if (slot === 'materialId') {
      applyTracked({ materialId: id, materialParams: { ...materialRegistry.require(id).defaultParameters } });
    } else if (slot === 'textureId') {
      applyTracked({ textureId: id, textureParams: { ...textureRegistry.require(id).defaultParameters } });
    } else {
      applyTracked({ environmentId: id, environmentParams: { ...environmentRegistry.require(id).defaultParameters } });
    }
  }

  function onParamChange(slot: 'shapeParams' | 'materialParams' | 'textureParams' | 'environmentParams', key: string, value: ParamValue) {
    const base = slot === 'environmentParams'
      ? environmentRegistry.require(current.environmentId).defaultParameters
      : current[slot];
    applyTracked({ [slot]: { ...base, [key]: value } } as Partial<Composition>);
  }

  function onEffectStageSelect(stageIds: string[], id: string) {
    const effectIds = current.effectIds.filter((effectId) => !stageIds.includes(effectId));
    const effectParams = { ...current.effectParams };
    if (id !== 'none') {
      effectIds.push(id);
      if (!effectParams[id]) effectParams[id] = { ...effectRegistry.require(id).defaultParameters };
    }
    applyTracked({ effectIds: orderByStage(effectIds), effectParams });
  }

  function onSvgImport(svgText: string) {
    applyTracked({
      shapeId: SVG_EXTRUDE_SHAPE_ID,
      shapeParams: { ...shapeRegistry.require(SVG_EXTRUDE_SHAPE_ID).defaultParameters, svg: svgText },
    });
  }

  function applyComposition(composition: Composition) {
    applyTracked(composition);
  }

  function importComposition(composition: Composition) {
    applyTracked(composition);
  }

  function onEffectParamChange(id: string, key: string, value: ParamValue) {
    applyTracked({
      effectParams: {
        ...current.effectParams,
        [id]: { ...(current.effectParams[id] ?? effectRegistry.require(id).defaultParameters), [key]: value },
      },
    });
  }

  return (
    <div className="app-shell" data-environment={current.environmentId} data-backdrop={presentation.backdrop} data-floor-shadow={presentation.floorShadow ? 'true' : 'false'} style={{ '--shadow-strength': presentation.shadowStrength, '--shadow-softness': `${presentation.shadowSoftness * 28}px` } as React.CSSProperties}>
      <Viewport hostRef={hostRef} scene={scene} scheduler={scheduler} contextLost={contextLost} environmentId={current.environmentId} presentation={presentation} onPresentationChange={(patch) => setPresentation((current) => ({ ...current, ...patch }))} />
      <OnboardingHint />

      <div className="topbar">
        <div className="brand">
          for<em>ma</em>
        </div>
        <SurpriseMeButton onApply={applyComposition} />
        <button type="button" className="btn" onClick={undo} disabled={historyRef.current.past.length === 0} aria-label="Undo last change">Undo</button>
        <button type="button" className="btn" onClick={redo} disabled={historyRef.current.future.length === 0} aria-label="Redo last change">Redo</button>
        <button
          type="button"
          className="btn"
          onClick={() => applyComposition(defaultComposition())}
          title="Reset composition to the default sphere/matte/studio setup"
          data-testid="reset-composition"
        >
          Reset composition
        </button>
        <button type="button" className={`btn${creatorMode ? ' toggle-on' : ''}`} onClick={() => setCreatorMode((v) => !v)} aria-pressed={creatorMode} data-testid="creator-mode-toggle">
          Creator mode: {creatorMode ? 'On' : 'Off'}
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
        onEffectStageSelect={onEffectStageSelect}
        onEffectParamChange={onEffectParamChange}
        onSvgImport={onSvgImport}
        onApplyComposition={applyComposition}
        onImportComposition={importComposition}
        presentation={presentation}
        onPresentationChange={(patch) => setPresentation((current) => ({ ...current, ...patch }))}
      />
      {creatorMode && <CreatorPanel composition={current} />}
    </div>
  );
}

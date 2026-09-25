import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FormaScene, FrameScheduler } from 'forma';
import { useReducedMotion } from '../hooks/useReducedMotion';

export interface ViewportProps {
  hostRef: React.RefObject<HTMLDivElement>;
  scene: FormaScene | null;
  scheduler: FrameScheduler | null;
  contextLost: boolean;
  environmentId?: string;
  presentation?: PresentationState;
  onPresentationChange?: (patch: Partial<PresentationState>) => void;
  defaultAutoSpin?: boolean;
}

export interface PresentationState {
  fov: number;
  azimuth: number;
  elevation: number;
  zoom: number;
  backdrop: 'environment' | 'gradient' | 'transparent';
  floorShadow: boolean;
  shadowStrength: number;
  shadowSoftness: number;
}

export const DEFAULT_PRESENTATION: PresentationState = { fov: 50, azimuth: 0, elevation: 0, zoom: 1, backdrop: 'environment', floorShadow: true, shadowStrength: 0.45, shadowSoftness: 0.5 };

/** Mounts the canvas host div, wires OrbitControls (pointer+touch) + auto-spin once
 * `scene` is ready. `prefers-reduced-motion` forces auto-spin off regardless of the
 * toggle state (roadmap §6). */
export function Viewport({ hostRef, scene, scheduler, contextLost, environmentId, presentation, onPresentationChange, defaultAutoSpin = false }: ViewportProps) {
  const reducedMotion = useReducedMotion();
  const [autoSpin, setAutoSpin] = useState(() => defaultAutoSpin && !reducedMotion);
  const [spinSpeed, setSpinSpeed] = useState(2.2);
  const [localPresentation, setLocalPresentation] = useState(DEFAULT_PRESENTATION);
  const activePresentation = presentation ?? localPresentation;
  const wasAutoSpinning = useRef(false);
  const controlsRef = useRef<OrbitControls | null>(null);
  const autoSpinRef = useRef(autoSpin);
  const reducedMotionRef = useRef(reducedMotion);
  autoSpinRef.current = autoSpin;
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    if (!scene) return;
    const controls = new OrbitControls(scene.camera, scene.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;
    const onStart = () => {
      wasAutoSpinning.current = autoSpinRef.current && !reducedMotionRef.current;
      controls.autoRotate = false;
    };
    const onEnd = () => {
      controls.autoRotate = wasAutoSpinning.current && !reducedMotionRef.current;
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [scene]);

  useEffect(() => {
    if (!scene) return;
    const camera = scene.camera as THREE.PerspectiveCamera;
    const controls = controlsRef.current;
    camera.fov = activePresentation.fov;
    camera.zoom = activePresentation.zoom;
    camera.updateProjectionMatrix();
    if (!controls) return;
    const radius = Math.max(camera.position.length(), 0.1);
    const phi = THREE.MathUtils.degToRad(90 - Math.max(-80, Math.min(80, activePresentation.elevation)));
    const theta = THREE.MathUtils.degToRad(activePresentation.azimuth);
    camera.position.set(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
    controls.target.set(0, 0, 0);
    controls.update();
  }, [scene, activePresentation]);

  useEffect(() => {
    if (!scene || activePresentation.backdrop === 'environment') return;
    const environmentBackground = scene.scene.background;
    scene.scene.background = null;
    return () => {
      if (scene.scene.background === null) scene.scene.background = environmentBackground;
    };
  }, [scene, environmentId, activePresentation.backdrop]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.autoRotate = autoSpin && !reducedMotion;
    controls.autoRotateSpeed = spinSpeed;
  }, [autoSpin, reducedMotion, spinSpeed, scene]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !scheduler) return;
    return scheduler.addTask(() => controls.update());
  }, [scene, scheduler]);

  function changePresentation(patch: Partial<PresentationState>): void {
    if (onPresentationChange) onPresentationChange(patch);
    else setLocalPresentation((current) => ({ ...current, ...patch }));
  }

  return (
    <>
      <div ref={hostRef} className="viewport-host" data-testid="viewport-host" />
      {contextLost && <div className="viewport-fallback" role="status">Renderer recovering…</div>}
      <div className="toolbelt">
        <button
          type="button"
          className={`btn${autoSpin ? ' toggle-on' : ''}`}
          onClick={() => setAutoSpin((v) => !v)}
          disabled={reducedMotion}
          title={reducedMotion ? 'Disabled — prefers-reduced-motion is on' : 'Toggle auto-spin'}
          data-testid="auto-spin-toggle"
        >
          {autoSpin ? 'Auto-spin: On' : 'Auto-spin: Off'}
        </button>
        <label className="spin-speed" htmlFor="spin-speed">
          <span>Speed {spinSpeed.toFixed(1)}</span>
          <input
            id="spin-speed"
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={spinSpeed}
            aria-label="Auto-spin speed"
            onChange={(e) => setSpinSpeed(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const controls = controlsRef.current;
            if (!controls) return;
            // OrbitControls.reset() snaps the camera position/target back, but does
            // NOT clear residual rotation momentum accumulated from damping
            // (`_sphericalDelta`/`_panOffset`) — that momentum still fully applies
            // over the following frames regardless of damping factor, dragging the
            // camera away from the reset position again. These fields are
            // intentionally private (no public API for this) — zeroing them directly
            // is the documented workaround for this known OrbitControls behavior.
            const internals = controls as unknown as { _sphericalDelta?: { set(t: number, p: number, r: number): void }; _panOffset?: { set(x: number, y: number, z: number): void } };
            internals._sphericalDelta?.set(0, 0, 0);
            internals._panOffset?.set(0, 0, 0);
            controls.reset();
            changePresentation({ fov: DEFAULT_PRESENTATION.fov, azimuth: DEFAULT_PRESENTATION.azimuth, elevation: DEFAULT_PRESENTATION.elevation, zoom: DEFAULT_PRESENTATION.zoom });
          }}
          title="Reset camera to default orbit"
          data-testid="reset-camera"
        >
          Reset view
        </button>
      </div>
    </>
  );
}

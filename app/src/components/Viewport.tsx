import { useEffect, useRef, useState } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FormaScene, FrameScheduler } from 'forma';
import { useReducedMotion } from '../hooks/useReducedMotion';

export interface ViewportProps {
  hostRef: React.RefObject<HTMLDivElement>;
  scene: FormaScene | null;
  scheduler: FrameScheduler | null;
}

/** Mounts the canvas host div, wires OrbitControls (pointer+touch) + auto-spin once
 * `scene` is ready. `prefers-reduced-motion` forces auto-spin off regardless of the
 * toggle state (roadmap §6). */
export function Viewport({ hostRef, scene, scheduler }: ViewportProps) {
  const reducedMotion = useReducedMotion();
  const [autoSpin, setAutoSpin] = useState(false);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!scene) return;
    const controls = new OrbitControls(scene.camera, scene.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [scene]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.autoRotate = autoSpin && !reducedMotion;
    controls.autoRotateSpeed = 2.2;
  }, [autoSpin, reducedMotion, scene]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !scheduler) return;
    return scheduler.addTask(() => controls.update());
  }, [scene, scheduler]);

  return (
    <>
      <div ref={hostRef} className="viewport-host" data-testid="viewport-host" />
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

import * as THREE from 'three';
import { pageCurrent, type CurrentBody, type CurrentCursor, type CurrentPalette } from './current.js';
import type { FormaRuntime } from '../runtime/FormaRuntime.js';
import type { MatterSettings } from '../types.js';
import { DEFAULT_SUBJECT_RADIUS } from '../scene/framing.js';

export interface PageBridgeOptions {
  /** The element the scene is drawn in. */
  el: HTMLElement;
  camera: THREE.PerspectiveCamera;
  runtime: FormaRuntime;
  /** The composition's matter settings as they are now (for the cursor's mode and reach). */
  matter: () => MatterSettings | undefined;
  /** World radius the object is framed to. */
  subjectRadius?: number;
  /** How far the page's flow carries dispersed matter, in viewport heights. Default 0.9. */
  flowGain?: number;
  /** Take matter's colours from the page's palette. Default true. */
  followPalette?: boolean;
}

export interface PageBridge {
  /** True while something else (linefield, say) shares the page's current. */
  readonly accompanied: boolean;
  /** Call once per frame, before the runtime's update. */
  step(): void;
  dispose(): void;
}

/** Forma's side of the page current (`current.js`, shared verbatim with linefield).
 *
 * While something else has joined the current, Forma tells it where the object is and
 * how far it has come apart, and what the cursor does; and it takes from the page the
 * pointer (an object laid over a background would otherwise hide the cursor from one of
 * them), the flow its dispersed matter rides, and the palette that matter is coloured
 * with. Alone on a page, `step()` does nothing and nothing is listened to. */
export function joinPageCurrent(options: PageBridgeOptions): PageBridge {
  const { el, camera, runtime } = options;
  const current = pageCurrent();
  const me = current.join('forma');
  const radius = options.subjectRadius ?? DEFAULT_SUBJECT_RADIUS;
  const body: CurrentBody = { x: 0, y: 0, r: 0, disperse: 0, form: 'solid' };
  const cursor: CurrentCursor = { mode: 'off', strength: 1, reach: 0 };
  const rect = { left: 0, top: 0, width: 1, height: 1 };
  const centre = new THREE.Vector3();
  const side = new THREE.Vector3();
  const scratch: [number, number] = [0, 0];
  let engaged = false;
  let flowing = false;
  let palette: CurrentPalette | null = null;

  const sampleFlow = (u: number, v: number, out: [number, number]) => {
    const field = current.field;
    if (!field) return;
    scratch[0] = 0; scratch[1] = 0;
    field.sample(rect.left + u * rect.width, rect.top + (1 - v) * rect.height, current.now(), scratch);
    out[0] = scratch[0];
    out[1] = -scratch[1]; // the page is y down, the viewport's flow y up
  };

  const release = () => {
    if (!engaged) return;
    engaged = false;
    flowing = false;
    palette = null;
    runtime.setMatterFlow(null);
    runtime.setMatterPalette(null);
    runtime.setMatterPointer(null);
    me.publish('body', null);
    me.publish('cursor', null);
  };

  return {
    get accompanied() { return me.accompanied; },
    step() {
      if (!me.accompanied) { release(); return; }
      engaged = true;
      const r = el.getBoundingClientRect();
      rect.left = r.left; rect.top = r.top; rect.width = r.width || 1; rect.height = r.height || 1;

      // Where the object is on the page, and how whole.
      camera.updateMatrixWorld();
      centre.set(0, 0, 0).project(camera);
      side.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(radius).project(camera);
      body.x = rect.left + ((centre.x + 1) / 2) * rect.width;
      body.y = rect.top + ((1 - centre.y) / 2) * rect.height;
      body.r = (Math.abs(side.x - centre.x) / 2) * rect.width;
      const state = runtime.matterState;
      body.disperse = state ? state.disperse : 0;
      body.form = state ? state.form : 'solid';
      me.publish('body', body);

      // What the cursor does, in the page's terms: reach is `radius` in units of half
      // the element's height, as the matter shader measures it.
      const matter = options.matter();
      cursor.mode = matter ? matter.cursor : 'off';
      cursor.strength = matter ? matter.strength : 1;
      cursor.reach = matter ? matter.radius * rect.height * 0.5 : 0;
      me.publish('cursor', cursor);

      // The page's pointer, in this element's normalized device coordinates.
      const p = current.pointer;
      const inside = p.active && p.x >= rect.left && p.x <= rect.left + rect.width && p.y >= rect.top && p.y <= rect.top + rect.height;
      runtime.setMatterPointer(inside ? { x: ((p.x - rect.left) / rect.width) * 2 - 1, y: -((p.y - rect.top) / rect.height) * 2 + 1 } : null);

      const hasField = !!current.field;
      if (hasField !== flowing) {
        flowing = hasField;
        runtime.setMatterFlow(hasField ? sampleFlow : null, options.flowGain ?? 0.9);
      }
      if (options.followPalette !== false && current.palette !== palette) {
        palette = current.palette;
        runtime.setMatterPalette(palette ? { a: palette.a, b: palette.b } : null);
      }
    },
    dispose() {
      release();
      me.leave();
    },
  };
}

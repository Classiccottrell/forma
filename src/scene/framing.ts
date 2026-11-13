import type * as THREE from 'three';

/** Pixels of the canvas covered by UI (an editor panel, a top bar). The object is
 * framed in what is left. */
export interface FramingInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface Framing {
  /** World-space radius of the object being framed. `FormaRuntime` scales every shape
   * to a bounding radius of 1.2, so that is the default. */
  subjectRadius?: number;
  /** Share of the visible area's shorter half-extent the subject's radius takes.
   * Below 0.5 leaves room for dispersed matter (gas, the liquid puddle) around it. */
  fill?: number;
  insets?: FramingInsets;
  /** Where in the canvas the object sits, as fractions of its width and height (y down).
   * Default the middle of the visible area, { x: 0.5, y: 0.5 }. For an object laid over
   * a larger composition, which has its own place for it. */
  anchor?: { x: number; y: number };
}

export const DEFAULT_SUBJECT_RADIUS = 1.2;
export const DEFAULT_FRAMING_FILL = 0.42;

/** An inset that would leave less than this share of the canvas is ignored, so a
 * full-width phone panel doesn't squeeze the object into nothing behind it. */
const MIN_VISIBLE_SHARE = 0.4;

export interface FramingResult {
  /** Camera distance from the orbit target. */
  distance: number;
  /** View offset (px) that centres the subject in the visible area. */
  offsetX: number;
  offsetY: number;
}

/** Camera distance and projection shift that put a sphere of `subjectRadius`, centred
 * at the orbit target, in the middle of the visible area at `fill` of its size. */
export function computeFraming(fovDeg: number, width: number, height: number, framing: Framing = {}): FramingResult {
  const radius = framing.subjectRadius ?? DEFAULT_SUBJECT_RADIUS;
  const fill = framing.fill ?? DEFAULT_FRAMING_FILL;
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  let { top = 0, right = 0, bottom = 0, left = 0 } = framing.insets ?? {};
  if (w - left - right < w * MIN_VISIBLE_SHARE) left = right = 0;
  if (h - top - bottom < h * MIN_VISIBLE_SHARE) top = bottom = 0;
  const visible = Math.min(w - left - right, h - top - bottom);
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  // Vertical fov: one world unit at distance d spans h / (2·d·tanHalf) px.
  const distance = (radius * h) / (fill * visible * tanHalf);
  const ax = clampUnit(framing.anchor?.x, 0.5);
  const ay = clampUnit(framing.anchor?.y, 0.5);
  return { distance, offsetX: (right - left) / 2 + (0.5 - ax) * w, offsetY: (bottom - top) / 2 + (0.5 - ay) * h };
}

function clampUnit(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

/** Applies a framing result to the camera: distance along its current direction from
 * `target`, and the projection shift. Leaves `camera.zoom` (the user's zoom) alone. */
export function applyFraming(camera: THREE.PerspectiveCamera, target: THREE.Vector3, width: number, height: number, result: FramingResult): void {
  const dir = camera.position.clone().sub(target);
  if (dir.lengthSq() < 1e-12) dir.set(0, 0, 1);
  camera.position.copy(target).addScaledVector(dir.normalize(), result.distance);
  if (result.offsetX === 0 && result.offsetY === 0) camera.clearViewOffset();
  else camera.setViewOffset(width, height, result.offsetX, result.offsetY, width, height);
  camera.updateProjectionMatrix();
}

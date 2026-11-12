import * as THREE from 'three';
import { deserializeComposition, serializeComposition, type Composition, type EmbedView, type FormaScene } from 'forma';
import type { PresentationState } from './components/Viewport';

/** A scene link carries the composition and its view in the URL hash, so it opens the
 * exact scene and never reaches a server. */
const KEY = 'scene';

export interface SharedScene {
  composition: Composition;
  view: EmbedView;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function sceneLink(editorUrl: string, composition: Composition, view: EmbedView): string {
  const payload = JSON.stringify({ c: JSON.parse(serializeComposition(composition)), v: view });
  return `${editorUrl}#${KEY}=${toBase64Url(payload)}`;
}

/** Reads a scene from a location hash, or null if there is none or it doesn't validate. */
export function readSceneLink(hash: string): SharedScene | null {
  const match = new RegExp(`^#${KEY}=([A-Za-z0-9_-]+)$`).exec(hash);
  if (!match) return null;
  try {
    const payload = JSON.parse(fromBase64Url(match[1]!)) as { c?: unknown; v?: unknown };
    const composition = deserializeComposition(JSON.stringify(payload.c));
    return { composition, view: sanitizeView(payload.v) };
  } catch {
    return null;
  }
}

const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;

/** Keeps only known view fields, clamped to their ranges. */
export function sanitizeView(value: unknown): EmbedView {
  if (typeof value !== 'object' || value === null) return {};
  const v = value as Record<string, unknown>;
  const out: EmbedView = {};
  if (v.backdrop === 'transparent' || v.backdrop === 'environment') out.backdrop = v.backdrop;
  const fields = { azimuth: [-360, 360], elevation: [-80, 80], fov: [20, 100], zoom: [0.25, 4], spin: [-60, 60], fill: [0.15, 0.9] } as const;
  for (const [key, [min, max]] of Object.entries(fields) as [keyof typeof fields, readonly [number, number]][]) {
    const n = num(v[key], min, max);
    if (n !== undefined) out[key] = n;
  }
  const s = v.shadow as Record<string, unknown> | undefined;
  if (s && typeof s === 'object' && typeof s.enabled === 'boolean') {
    out.shadow = { enabled: s.enabled, strength: num(s.strength, 0, 1) ?? 0.45, softness: num(s.softness, 0, 1) ?? 0.5 };
  }
  return out;
}

/** The view as it is on screen now: the live camera angle (including any orbiting by
 * hand), lens, zoom, backdrop, shadow and auto-spin. */
export function currentView(scene: FormaScene | null, presentation: PresentationState, spin: number): EmbedView {
  const view: EmbedView = {
    fov: presentation.fov,
    zoom: presentation.zoom,
    shadow: { enabled: presentation.floorShadow, strength: presentation.shadowStrength, softness: presentation.shadowSoftness },
  };
  if (presentation.backdrop !== 'environment') view.backdrop = 'transparent';
  if (spin) view.spin = spin;
  if (scene) {
    const p = scene.camera.position;
    const r = Math.max(p.length(), 1e-6);
    view.azimuth = round(THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z)));
    view.elevation = round(THREE.MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, p.y / r)))));
  } else {
    view.azimuth = presentation.azimuth;
    view.elevation = presentation.elevation;
  }
  return view;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Back to editor Presentation state, for opening a scene link. */
export function presentationFromView(view: EmbedView, base: PresentationState): PresentationState {
  return {
    ...base,
    fov: view.fov ?? base.fov,
    zoom: view.zoom ?? base.zoom,
    azimuth: view.azimuth ?? base.azimuth,
    elevation: view.elevation ?? base.elevation,
    backdrop: view.backdrop === 'transparent' ? 'transparent' : 'environment',
    floorShadow: view.shadow?.enabled ?? base.floorShadow,
    shadowStrength: view.shadow?.strength ?? base.shadowStrength,
    shadowSoftness: view.shadow?.softness ?? base.shadowSoftness,
  };
}

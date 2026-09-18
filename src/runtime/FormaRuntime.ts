import * as THREE from 'three';
import { ResourceRegistry } from 'cc-webgl';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { Composition, EnvironmentHandle, EffectHandle } from '../types.js';
import { shapeRegistry, materialRegistry, environmentRegistry, effectRegistry } from '../registry/instances.js';
import { slotKey, changedHotKeys } from './diff.js';

interface Slot<H> {
  registry: ResourceRegistry;
  handle: H | null;
}

export interface FormaRuntimeOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  /** Shared post-processing composer (M1) — passed through to effect `create()`.
   * Optional so headless/test runtimes without a real GL context (see
   * `tests/testUtils.ts`) stay constructible; only pass-based effects need it. */
  composer?: EffectComposer;
  /** Scene-lifetime registry owning the long-lived Mesh wrapper (blueprint §3 pt.3).
   * Caller-supplied so it can be the same instance as a cc-webgl SceneContext's
   * ctx.resources; a fresh one is created if omitted (e.g. headless tests). */
  resources?: ResourceRegistry;
  /** Optional owner cleanup for the scene/bootstrap paired with this runtime. */
  disposeExternal?: () => void;
}

/** Orchestrates the four slots (shape/material/environment/effects) + the single
 * long-lived Mesh, per blueprint §0/§3/§4. Never touches an unrelated slot on a
 * partial composition change. */
export class FormaRuntime {
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly renderer: THREE.WebGLRenderer;
  readonly composer?: EffectComposer;
  readonly resources: ResourceRegistry;
  readonly mesh: THREE.Mesh;
  private readonly disposeExternal?: () => void;

  private shapeSlot: Slot<THREE.BufferGeometry> = { registry: new ResourceRegistry(), handle: null };
  private materialSlot: Slot<THREE.Material> = { registry: new ResourceRegistry(), handle: null };
  private environmentSlot: Slot<EnvironmentHandle> = { registry: new ResourceRegistry(), handle: null };
  private effectsSlot: Slot<EffectHandle[]> = { registry: new ResourceRegistry(), handle: null };

  private _current: Composition | null = null;

  constructor(opts: FormaRuntimeOptions) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.renderer = opts.renderer;
    this.composer = opts.composer;
    this.resources = opts.resources ?? new ResourceRegistry();
    this.disposeExternal = opts.disposeExternal;
    this.mesh = new THREE.Mesh();
    // THREE.Mesh's no-arg ctor defaults to a fresh BufferGeometry + MeshBasicMaterial.
    // applyComposition() reassigns both on first call, orphaning the defaults —
    // dispose them explicitly here rather than tracking (they're never the mesh's
    // real geometry/material and must not appear in report()).
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.resources.track(this.mesh);
    this.scene.add(this.mesh);
  }

  get currentComposition(): Composition | null {
    return this._current;
  }

  /** Test/introspection hook — used to assert an unchanged slot's registry instance
   * identity is preserved across a switch (BRIEF acceptance criterion). */
  getSlotRegistry(slot: 'shape' | 'material' | 'environment' | 'effects'): ResourceRegistry {
    switch (slot) {
      case 'shape':
        return this.shapeSlot.registry;
      case 'material':
        return this.materialSlot.registry;
      case 'environment':
        return this.environmentSlot.registry;
      case 'effects':
        return this.effectsSlot.registry;
    }
  }

  /** Merges scene-lifetime + all four slot reports into one array (blueprint §4). */
  report(): { kind: string; count: number }[] {
    const merged = new Map<string, number>();
    for (const r of [
      this.resources.report(),
      this.shapeSlot.registry.report(),
      this.materialSlot.registry.report(),
      this.environmentSlot.registry.report(),
      this.effectsSlot.registry.report(),
    ]) {
      for (const { kind, count } of r) merged.set(kind, (merged.get(kind) ?? 0) + count);
    }
    return Array.from(merged.entries()).map(([kind, count]) => ({ kind, count }));
  }

  reportTotal(): number {
    return this.report().reduce((sum, r) => sum + r.count, 0);
  }

  applyComposition(next: Composition): void {
    const prev = this._current;
    const shapeChanged = !prev || slotKey('shape', next) !== slotKey('shape', prev);
    const materialChanged = !prev || slotKey('material', next) !== slotKey('material', prev);
    const envChanged = !prev || slotKey('environment', next) !== slotKey('environment', prev);
    const effectsChanged = !prev || slotKey('effects', next) !== slotKey('effects', prev);

    if (shapeChanged) this.rebuildShapeSlot(next);
    else if (prev) this.updateShapeSlotIfHotParamsChanged(prev, next);

    if (materialChanged) this.rebuildMaterialSlot(next);
    else if (prev) this.updateMaterialSlotIfHotParamsChanged(prev, next);

    if (envChanged) this.rebuildEnvironmentSlot(next);
    else if (prev) this.updateEnvironmentSlotIfHotParamsChanged(prev, next);

    if (effectsChanged) this.rebuildEffectsSlot(next);
    else if (prev) this.updateEffectsSlotIfHotParamsChanged(prev, next);

    this._current = next;
  }

  dispose(): void {
    this.shapeSlot.registry.disposeAll();
    this.materialSlot.registry.disposeAll();
    this.environmentSlot.registry.disposeAll();
    this.effectsSlot.registry.disposeAll();
    this.resources.disposeAll();
    this.disposeExternal?.();
  }

  // --- shape ---------------------------------------------------------------

  private rebuildShapeSlot(next: Composition): void {
    this.shapeSlot.registry.disposeAll();
    this.shapeSlot.registry = new ResourceRegistry();
    const def = shapeRegistry.require(next.shapeId);
    const geometry = def.create(next.shapeParams as any, { registry: this.shapeSlot.registry });
    this.shapeSlot.handle = geometry;
    this.mesh.geometry = geometry;
    this.frameShape();
  }

  /** Keeps very different geometries legible in one viewport without per-shape UI tuning. */
  private frameShape(): void {
    this.mesh.geometry.computeBoundingSphere();
    const sphere = this.mesh.geometry.boundingSphere;
    if (!sphere || sphere.radius <= 0) return;
    const scale = 1.2 / sphere.radius;
    this.mesh.position.copy(sphere.center).multiplyScalar(-scale);
    this.mesh.scale.setScalar(scale);
  }

  private updateShapeSlotIfHotParamsChanged(prev: Composition, next: Composition): void {
    const def = shapeRegistry.get(next.shapeId);
    if (!def || !def.update || !this.shapeSlot.handle) return;
    const hot = changedHotKeys(def.parameterSchema, prev.shapeParams, next.shapeParams);
    if (hot.length === 0) return;
    def.update(this.shapeSlot.handle, next.shapeParams as any);
  }

  // --- material --------------------------------------------------------------

  private rebuildMaterialSlot(next: Composition): void {
    this.materialSlot.registry.disposeAll();
    this.materialSlot.registry = new ResourceRegistry();
    const def = materialRegistry.require(next.materialId);
    const material = def.create(next.materialParams as any, { registry: this.materialSlot.registry });
    this.materialSlot.handle = material;
    this.mesh.material = material;
  }

  private updateMaterialSlotIfHotParamsChanged(prev: Composition, next: Composition): void {
    const def = materialRegistry.get(next.materialId);
    if (!def || !def.update || !this.materialSlot.handle) return;
    const hot = changedHotKeys(def.parameterSchema, prev.materialParams, next.materialParams);
    if (hot.length === 0) return;
    def.update(this.materialSlot.handle, next.materialParams as any);
  }

  // --- environment -------------------------------------------------------

  private rebuildEnvironmentSlot(next: Composition): void {
    this.environmentSlot.registry.disposeAll();
    this.environmentSlot.registry = new ResourceRegistry();
    const def = environmentRegistry.require(next.environmentId);
    const handle = def.create(next.environmentParams as any, { registry: this.environmentSlot.registry, scene: this.scene });
    this.environmentSlot.registry.track(() => handle.dispose());
    this.environmentSlot.handle = handle;
  }

  private updateEnvironmentSlotIfHotParamsChanged(prev: Composition, next: Composition): void {
    const def = environmentRegistry.get(next.environmentId);
    if (!def || !def.update || !this.environmentSlot.handle) return;
    const hot = changedHotKeys(def.parameterSchema, prev.environmentParams, next.environmentParams);
    if (hot.length === 0) return;
    def.update(this.environmentSlot.handle, next.environmentParams as any);
  }

  // --- effects -------------------------------------------------------------

  private rebuildEffectsSlot(next: Composition): void {
    this.effectsSlot.registry.disposeAll();
    this.effectsSlot.registry = new ResourceRegistry();
    const handles: EffectHandle[] = [];
    for (const id of next.effectIds) {
      const def = effectRegistry.require(id);
      const params = next.effectParams[id] ?? def.defaultParameters;
      const handle = def.create(params as any, {
        registry: this.effectsSlot.registry,
        scene: this.scene,
        camera: this.camera,
        renderer: this.renderer,
        composer: this.composer,
      });
      this.effectsSlot.registry.track(() => handle.dispose());
      handles.push(handle);
    }
    this.effectsSlot.handle = handles;
  }

  private updateEffectsSlotIfHotParamsChanged(prev: Composition, next: Composition): void {
    const handles = this.effectsSlot.handle;
    if (!handles) return;
    next.effectIds.forEach((id, i) => {
      const def = effectRegistry.get(id);
      const handle = handles[i];
      if (!def || !def.update || !handle) return;
      const prevParams = prev.effectParams[id] ?? def.defaultParameters;
      const nextParams = next.effectParams[id] ?? def.defaultParameters;
      const hot = changedHotKeys(def.parameterSchema, prevParams, nextParams);
      if (hot.length === 0) return;
      def.update(handle, nextParams as any);
    });
  }
}

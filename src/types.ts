import type * as THREE from 'three';
import type { ResourceRegistry } from 'cc-webgl';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';

// --- Composition: single source of truth (blueprint §0) -------------------

export type ParamValue = number | string | boolean;

export interface Composition {
  shapeId: string;
  shapeParams: Record<string, ParamValue>;
  materialId: string;
  materialParams: Record<string, ParamValue>;
  environmentId: string;
  environmentParams: Record<string, ParamValue>;
  effectIds: string[]; // ordered; empty array is valid (no effects)
  effectParams: Record<string, Record<string, ParamValue>>; // keyed by effectId
}

// --- Parameter schema (blueprint §1.1) --------------------------------------

export interface NumberParamSchema {
  kind: 'number';
  min: number;
  max: number;
  step: number;
  default: number;
  rebuild: boolean;
}

export interface EnumParamSchema<T extends string = string> {
  kind: 'enum';
  options: readonly T[];
  default: T;
  rebuild: boolean;
}

export interface BooleanParamSchema {
  kind: 'boolean';
  default: boolean;
  rebuild: boolean;
}

export interface ColorParamSchema {
  kind: 'color'; // hex string, e.g. '#7f78ff'
  default: string;
  rebuild: boolean;
}

export type ParamSchema = NumberParamSchema | EnumParamSchema | BooleanParamSchema | ColorParamSchema;

export type ParamSchemaMap = Record<string, ParamSchema>;

export type ParamsOf<S extends ParamSchemaMap> = { [K in keyof S]: S[K]['default'] extends infer D ? D : never };

// --- Definition interfaces (blueprint §1.2) ---------------------------------

export interface RegistryEntryBase<S extends ParamSchemaMap> {
  id: string;
  label: string;
  category: string;
  parameterSchema: S;
  defaultParameters: ParamsOf<S>;
}

export interface ShapeCreateContext {
  registry: ResourceRegistry;
}

export interface MaterialCreateContext {
  registry: ResourceRegistry;
}

export interface EnvironmentCreateContext {
  registry: ResourceRegistry;
  scene: THREE.Scene;
}

export interface EffectCreateContext {
  registry: ResourceRegistry;
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  /** Shared post-processing composer (M1 addition — roadmap §2 item 5/§3). Optional:
   * a headless/test runtime without a real GL context omits it, and effects that
   * don't need a screen-space pass (e.g. the `none` stub) never touch it. A real
   * pass-based effect MUST call `composer.addPass(pass)` itself in `create()` and
   * `composer.removePass(pass)` in the returned handle's `dispose()` — this keeps the
   * composer's pass list authoritative on the composer, not duplicated in Forma. */
  composer?: EffectComposer;
}

export interface EnvironmentHandle {
  dispose(): void;
}

export interface EffectHandle {
  dispose(): void;
  /** The composer pass this effect added, if any (M1 addition) — exposed so the
   * runtime/export path can confirm a pass-based effect is actually wired into the
   * shared composer rather than silently doing nothing. Not required to be read by
   * anything today; documents the contract for future effects. */
  pass?: Pass;
}

export interface ShapeDefinition<S extends ParamSchemaMap = ParamSchemaMap> extends RegistryEntryBase<S> {
  /** Builds geometry only — no material, no scene insertion. MUST track the returned
   * geometry (and any intermediate buffers) via ctx.registry.track(...) itself. */
  create(params: ParamsOf<S>, ctx: ShapeCreateContext): THREE.BufferGeometry;
  update?(geometry: THREE.BufferGeometry, params: ParamsOf<S>): void;
}

export interface MaterialDefinition<S extends ParamSchemaMap = ParamSchemaMap> extends RegistryEntryBase<S> {
  /** MUST track the returned material and any owned textures individually via
   * ctx.registry.track(...) — texture disposal is not inferred by the registry here. */
  create(params: ParamsOf<S>, ctx: MaterialCreateContext): THREE.Material;
  update?(material: THREE.Material, params: ParamsOf<S>): void;
}

export interface EnvironmentDefinition<S extends ParamSchemaMap = ParamSchemaMap> extends RegistryEntryBase<S> {
  create(params: ParamsOf<S>, ctx: EnvironmentCreateContext): EnvironmentHandle;
  update?(handle: EnvironmentHandle, params: ParamsOf<S>): void;
}

export interface EffectDefinition<S extends ParamSchemaMap = ParamSchemaMap> extends RegistryEntryBase<S> {
  create(params: ParamsOf<S>, ctx: EffectCreateContext): EffectHandle;
  update?(handle: EffectHandle, params: ParamsOf<S>): void;
}

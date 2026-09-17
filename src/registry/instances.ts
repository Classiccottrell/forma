import { DefinitionRegistry } from './DefinitionRegistry.js';
import type { ShapeDefinition, MaterialDefinition, EnvironmentDefinition, EffectDefinition, ParamSchemaMap } from '../types.js';

// Four typed singletons (blueprint §2). Populated by harness/* (or any future
// consumer) via .register(); empty at construction — src/ owns the registry shape,
// not the content.
export const shapeRegistry = new DefinitionRegistry<ShapeDefinition>();
export const materialRegistry = new DefinitionRegistry<MaterialDefinition>();
export const environmentRegistry = new DefinitionRegistry<EnvironmentDefinition>();
export const effectRegistry = new DefinitionRegistry<EffectDefinition>();

/** Identity helpers (not in blueprint text, added so authored definitions keep their
 * concrete ParamSchemaMap generic instead of widening to ParamSchemaMap when assigned
 * to a `const x: ShapeDefinition = {...}` literal — see README "Known deviations"). */
export function defineShape<S extends ParamSchemaMap>(def: ShapeDefinition<S>): ShapeDefinition<S> {
  return def;
}
export function defineMaterial<S extends ParamSchemaMap>(def: MaterialDefinition<S>): MaterialDefinition<S> {
  return def;
}
export function defineEnvironment<S extends ParamSchemaMap>(def: EnvironmentDefinition<S>): EnvironmentDefinition<S> {
  return def;
}
export function defineEffect<S extends ParamSchemaMap>(def: EffectDefinition<S>): EffectDefinition<S> {
  return def;
}

import type { Composition } from '../types.js';
import { shapeRegistry, materialRegistry, environmentRegistry, effectRegistry } from '../registry/instances.js';

export function serializeComposition(c: Composition): string {
  return JSON.stringify(c);
}

/** Shape-of-data check only (blueprint §5.4) — not a validation library. Confirms
 * each *Id resolves in its registry and each params object's keys match that
 * definition's parameterSchema keys. Throws on mismatch. */
export function deserializeComposition(s: string): Composition {
  const c = JSON.parse(s) as Composition;

  const shapeDef = shapeRegistry.require(c.shapeId);
  assertKeysMatch('shapeParams', c.shapeParams, shapeDef.parameterSchema);

  const materialDef = materialRegistry.require(c.materialId);
  assertKeysMatch('materialParams', c.materialParams, materialDef.parameterSchema);

  const envDef = environmentRegistry.require(c.environmentId);
  assertKeysMatch('environmentParams', c.environmentParams, envDef.parameterSchema);

  for (const id of c.effectIds) {
    const def = effectRegistry.require(id);
    assertKeysMatch(`effectParams.${id}`, c.effectParams[id] ?? {}, def.parameterSchema);
  }

  return c;
}

function assertKeysMatch(label: string, params: Record<string, unknown>, schema: Record<string, unknown>): void {
  const paramKeys = Object.keys(params).sort();
  const schemaKeys = Object.keys(schema).sort();
  const mismatch = paramKeys.length !== schemaKeys.length || paramKeys.some((k, i) => k !== schemaKeys[i]);
  if (mismatch) {
    throw new Error(`deserializeComposition: ${label} keys [${paramKeys}] do not match schema keys [${schemaKeys}]`);
  }
}

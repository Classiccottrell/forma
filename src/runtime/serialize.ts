import type { Composition } from '../types.js';
import { shapeRegistry, materialRegistry, textureRegistry, environmentRegistry, effectRegistry } from '../registry/instances.js';

export function serializeComposition(c: Composition): string {
  return JSON.stringify({ ...c, textureId: c.textureId ?? 'none', textureParams: c.textureParams ?? {} });
}

/** Shape-of-data check only (blueprint §5.4) — not a validation library. Confirms
 * each *Id resolves in its registry and each params object's keys match that
 * definition's parameterSchema keys. Throws on mismatch. */
export function deserializeComposition(s: string): Composition {
  let value: unknown;
  try {
    value = JSON.parse(s);
  } catch {
    throw new Error('deserializeComposition: invalid JSON');
  }
  assertCompositionShape(value);
  const c = value;

  const shapeDef = shapeRegistry.require(c.shapeId);
  assertKeysMatch('shapeParams', c.shapeParams, shapeDef.parameterSchema);

  const materialDef = materialRegistry.require(c.materialId);
  assertKeysMatch('materialParams', c.materialParams, materialDef.parameterSchema);

  const textureId = c.textureId ?? 'none';
  const textureParams = c.textureParams ?? {};
  const textureDef = textureRegistry.require(textureId);
  assertKeysMatch('textureParams', textureParams, textureDef.parameterSchema);

  const envDef = environmentRegistry.require(c.environmentId);
  assertKeysMatch('environmentParams', c.environmentParams, envDef.parameterSchema);

  for (const id of c.effectIds) {
    const def = effectRegistry.require(id);
    assertKeysMatch(`effectParams.${id}`, c.effectParams[id] ?? {}, def.parameterSchema);
  }

  return { ...c, textureId, textureParams };
}

function assertCompositionShape(value: unknown): asserts value is Composition {
  if (!isRecord(value)) throw new Error('deserializeComposition: composition must be an object');

  assertString(value, 'shapeId');
  assertParams(value.shapeParams, 'shapeParams');
  assertString(value, 'materialId');
  assertParams(value.materialParams, 'materialParams');
  if (value.textureId !== undefined) assertString(value, 'textureId');
  if (value.textureParams !== undefined) assertParams(value.textureParams, 'textureParams');
  assertString(value, 'environmentId');
  assertParams(value.environmentParams, 'environmentParams');

  if (!Array.isArray(value.effectIds)) {
    throw new Error('deserializeComposition: effectIds must be an array');
  }
  if (value.effectIds.some((id) => typeof id !== 'string')) {
    throw new Error('deserializeComposition: effectIds must contain only strings');
  }
  if (!isRecord(value.effectParams)) {
    throw new Error('deserializeComposition: effectParams must be an object');
  }
  for (const [id, params] of Object.entries(value.effectParams)) {
    assertParams(params, `effectParams.${id}`);
  }
}

function assertString(record: Record<string, unknown>, key: string): void {
  if (typeof record[key] !== 'string') {
    throw new Error(`deserializeComposition: ${key} must be a string`);
  }
}

function assertParams(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`deserializeComposition: ${label} must be an object`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKeysMatch(label: string, params: Record<string, unknown>, schema: Record<string, unknown>): void {
  const paramKeys = Object.keys(params).sort();
  const schemaKeys = Object.keys(schema).sort();
  const mismatch = paramKeys.length !== schemaKeys.length || paramKeys.some((k, i) => k !== schemaKeys[i]);
  if (mismatch) {
    throw new Error(`deserializeComposition: ${label} keys [${paramKeys}] do not match schema keys [${schemaKeys}]`);
  }
}

import type { Composition, ParamSchemaMap, ParamValue } from '../types.js';
import { shapeRegistry, materialRegistry, textureRegistry, environmentRegistry, effectRegistry } from '../registry/instances.js';

export type SlotName = 'shape' | 'material' | 'texture' | 'environment' | 'effects';

/** Deterministic hash: sorted keys, JSON.stringify. Only `rebuild:true` params are
 * included — a change to a rebuild:false (hot) param must NOT change the slot key,
 * or the diff engine would rebuild instead of routing to update(). */
function stableHash(params: Record<string, ParamValue>, schema: ParamSchemaMap): string {
  const coldKeys = Object.keys(schema)
    .filter((k) => schema[k]!.rebuild === true)
    .sort();
  const picked: Record<string, ParamValue> = {};
  for (const k of coldKeys) picked[k] = params[k];
  return JSON.stringify(picked);
}

function effectsKey(c: Composition): string {
  return c.effectIds
    .map((id) => {
      const def = effectRegistry.require(id);
      return `${id}:${stableHash(c.effectParams[id] ?? {}, def.parameterSchema)}`;
    })
    .join('|');
}

/** slotKey hashes only the rebuild:true params for that slot's id + params — two
 * compositions differing solely in a hot (rebuild:false) param produce the SAME
 * slotKey (blueprint §2.3). */
export function slotKey(slot: SlotName, c: Composition): string {
  switch (slot) {
    case 'shape': {
      const def = shapeRegistry.require(c.shapeId);
      return `${c.shapeId}:${stableHash(c.shapeParams, def.parameterSchema)}`;
    }
    case 'material': {
      const def = materialRegistry.require(c.materialId);
      return `${c.materialId}:${stableHash(c.materialParams, def.parameterSchema)}`;
    }
    case 'texture': {
      const id = c.textureId ?? 'none';
      const def = textureRegistry.require(id);
      return `${id}:${stableHash(c.textureParams ?? {}, def.parameterSchema)}`;
    }
    case 'environment': {
      const def = environmentRegistry.require(c.environmentId);
      return `${c.environmentId}:${stableHash(c.environmentParams, def.parameterSchema)}`;
    }
    case 'effects':
      return effectsKey(c);
  }
}

/** Keys among `schema` whose rebuild:false and whose value differs between prev/next. */
export function changedHotKeys(schema: ParamSchemaMap, prev: Record<string, ParamValue>, next: Record<string, ParamValue>): string[] {
  return Object.keys(schema).filter((k) => schema[k]!.rebuild === false && prev[k] !== next[k]);
}

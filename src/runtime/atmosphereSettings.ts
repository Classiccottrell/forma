import type { AtmosphereSettings } from '../types.js';

export const ATMOSPHERE_DEFAULTS: Readonly<AtmosphereSettings> = { haze: 0.5, dust: 0.5 };

/** Validates a saved `atmosphere` object: missing keys take defaults; unknown keys and
 * values outside 0..1 are rejected (the importer's exact-key policy). */
export function parseAtmosphereSettings(value: unknown, label = 'atmosphere'): AtmosphereSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const record = value as Record<string, unknown>;
  const out: AtmosphereSettings = { ...ATMOSPHERE_DEFAULTS };
  for (const key of Object.keys(record)) {
    if (!(key in ATMOSPHERE_DEFAULTS)) throw new Error(`${label}.${key} is not an atmosphere setting`);
    const v = record[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) throw new Error(`${label}.${key} must be a number from 0 to 1`);
    out[key as keyof AtmosphereSettings] = v;
  }
  return out;
}

import type { MatterSettings } from '../types.js';

export const MATTER_DEFAULTS: Readonly<MatterSettings> = {
  form: 'solid', disperse: 0, motion: 'manual', cursor: 'push', strength: 1, radius: 0.22, density: 'medium',
};

const CHOICES = {
  form: ['solid', 'liquid', 'gas'],
  motion: ['manual', 'loop', 'hover'],
  cursor: ['push', 'attract', 'vortex', 'scatter', 'wake', 'off'],
  density: ['low', 'medium', 'high'],
} as const;
const RANGES = { disperse: [0, 1], strength: [0, 1.5], radius: [0.08, 0.5] } as const;

/** Validates a saved `matter` object. Missing keys take their defaults (so settings added
 * later don't break older files); unknown keys, wrong types and out-of-range numbers are
 * rejected, in keeping with the importer's exact-key policy for everything else. */
export function parseMatterSettings(value: unknown, label = 'matter'): MatterSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const record = value as Record<string, unknown>;
  const known = Object.keys(MATTER_DEFAULTS);
  for (const key of Object.keys(record)) {
    if (!known.includes(key)) throw new Error(`${label}.${key} is not a matter setting`);
  }
  const out: MatterSettings = { ...MATTER_DEFAULTS };
  for (const [key, options] of Object.entries(CHOICES) as [keyof typeof CHOICES, readonly string[]][]) {
    if (record[key] === undefined) continue;
    if (typeof record[key] !== 'string' || !options.includes(record[key] as string)) {
      throw new Error(`${label}.${key} must be one of ${options.join(', ')}`);
    }
    (out as unknown as Record<string, unknown>)[key] = record[key];
  }
  for (const [key, [min, max]] of Object.entries(RANGES) as [keyof typeof RANGES, readonly [number, number]][]) {
    if (record[key] === undefined) continue;
    const v = record[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
      throw new Error(`${label}.${key} must be a number from ${min} to ${max}`);
    }
    out[key] = v;
  }
  return out;
}

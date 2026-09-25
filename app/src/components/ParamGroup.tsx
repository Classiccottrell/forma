import type { ParamSchemaMap, ParamValue } from 'forma';
import { ParamControl } from './ParamControl';

export interface ParamGroupProps {
  schema: ParamSchemaMap;
  values: Record<string, ParamValue>;
  onChange(key: string, next: ParamValue): void;
}

/** Maps every entry of a definition's `parameterSchema` through `ParamControl`
 * (roadmap §6) — the piece that makes ParamControl reusable across shape / material /
 * environment / effect slots without per-slot wiring. */
export function ParamGroup({ schema, values, onChange }: ParamGroupProps) {
  const keys = Object.keys(schema);
  if (keys.length === 0) return <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>No parameters.</div>;
  return (
    <>
      {keys.map((key) => (
        <ParamControl
          key={key}
          id={key}
          label={key === 'ior' ? 'IOR' : key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase())}
          schema={schema[key]!}
          value={values[key] ?? schema[key]!.default}
          onChange={(next) => onChange(key, next)}
        />
      ))}
    </>
  );
}

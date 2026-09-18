import type { ParamSchema, ParamValue } from 'forma';

export interface ParamControlProps {
  id: string;
  label: string;
  schema: ParamSchema;
  value: ParamValue;
  onChange(next: ParamValue): void;
}

/** Load-bearing generic control (roadmap §6). Dispatches on `ParamSchema.kind` — one
 * component renders every current and future param across all registry entries with
 * zero per-definition UI code. Typed against the loose `ParamSchema`/`ParamValue`
 * union, NOT `ParamsOf<S>` — the latter narrows to literal types per-definition
 * (e.g. `'3' | '5'`), which is unusable for a component meant to be generic across
 * every definition (advisor guidance). */
export function ParamControl({ id, label, schema, value, onChange }: ParamControlProps): JSX.Element {
  switch (schema.kind) {
    case 'number':
      return (
        <div className="param-row">
          <div className="param-label">
            <span>{label}</span>
            <span className="value">{Number(value).toFixed(2)}</span>
          </div>
          <input
            id={id}
            aria-label={label}
            type="range"
            min={schema.min}
            max={schema.max}
            step={schema.step}
            value={Number(value)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    case 'enum':
      return (
        <div className="param-row">
          <div className="param-label">
            <span>{label}</span>
          </div>
          <select id={id} aria-label={label} value={String(value)} onChange={(e) => onChange(e.target.value)}>
            {schema.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case 'boolean':
      return (
        <div className="param-row">
          <label className="param-label" htmlFor={id} style={{ cursor: 'pointer' }}>
            <span>{label}</span>
            <input id={id} type="checkbox" aria-label={label} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          </label>
        </div>
      );
    case 'color':
      return (
        <div className="param-row">
          <div className="param-label">
            <span>{label}</span>
            <span className="value">{String(value)}</span>
          </div>
          <input id={id} type="color" aria-label={label} value={String(value)} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'string':
      return (
        <div className="param-row">
          <div className="param-label">
            <span>{label}</span>
          </div>
          <textarea
            id={id}
            className="param-textarea"
            rows={schema.multiline === false ? 1 : 4}
            defaultValue={String(value)}
            onBlur={(e) => onChange(e.target.value)}
            data-testid={`param-string-${id}`}
          />
        </div>
      );
    default: {
      const _exhaustive: never = schema;
      return _exhaustive;
    }
  }
}

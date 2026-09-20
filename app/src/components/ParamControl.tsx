import { useEffect, useState } from 'react';
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
    case 'number': {
      const numericValue = Number(value);
      const [draft, setDraft] = useState(String(numericValue));
      useEffect(() => setDraft(String(numericValue)), [numericValue]);
      const commit = (raw: string) => {
        if (raw.trim() === '') {
          setDraft(String(numericValue));
          return;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          setDraft(String(numericValue));
          return;
        }
        const clamped = Math.min(schema.max, Math.max(schema.min, parsed));
        const stepped = schema.min + Math.round((clamped - schema.min) / schema.step) * schema.step;
        const next = Math.min(schema.max, Math.max(schema.min, Number(stepped.toFixed(10))));
        setDraft(String(next));
        if (next !== numericValue) onChange(next);
      };
      return (
        <div className="param-row">
          <div className="param-label">
            <span>{label}</span>
            <input
              className="param-number"
              type="number"
              aria-label={`${label} exact value`}
              min={schema.min}
              max={schema.max}
              step={schema.step}
              value={draft}
              onChange={(e) => {
                const raw = e.target.value;
                setDraft(raw);
                if (raw.trim() !== '' && Number.isFinite(Number(raw))) commit(raw);
              }}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(e.currentTarget.value); } }}
            />
          </div>
          <input
            id={id}
            aria-label={label}
            type="range"
            min={schema.min}
            max={schema.max}
            step={schema.step}
            value={numericValue}
            style={{ '--range-pct': `${((numericValue - schema.min) / (schema.max - schema.min)) * 100}%` } as React.CSSProperties}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    }
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

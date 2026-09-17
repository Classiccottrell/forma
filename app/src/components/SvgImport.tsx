import { useRef, useState } from 'react';

const MAX_SVG_BYTES = 100_000; // roadmap §4 guard — inlined SVG text lives in Composition JSON

export interface SvgImportProps {
  onImport(svgText: string): void;
}

/** File-drop/upload entry point for the `svg-extrude` shape (roadmap §4). Reads the
 * file as text in the UI layer (async), then hands the parsed string up — `create()`
 * on the registry entry itself stays synchronous. Additive to the Shape picker, not a
 * replacement for it. */
export function SvgImport({ onImport }: SvgImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function acceptFile(file: File | undefined | null) {
    if (!file) return;
    if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
      setError('Not an SVG file');
      return;
    }
    if (file.size > MAX_SVG_BYTES) {
      setError(`SVG too large (max ${Math.round(MAX_SVG_BYTES / 1000)}KB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (!text.trim()) {
        setError('Empty SVG file');
        return;
      }
      setError(null);
      onImport(text);
    };
    reader.onerror = () => setError('Could not read file');
    reader.readAsText(file);
  }

  return (
    <div
      className={`svg-import${dragOver ? ' drag-over' : ''}`}
      data-testid="svg-import"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        acceptFile(e.dataTransfer.files[0]);
      }}
    >
      <div className="section-header" style={{ cursor: 'default' }}>
        <span>Import SVG</span>
      </div>
      <div className="section-body">
        <p style={{ margin: '0 0 8px', fontSize: 12, opacity: 0.75 }}>Drop an .svg file here, or</p>
        <button type="button" className="btn" onClick={() => inputRef.current?.click()} data-testid="svg-import-browse">
          Choose file…
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".svg,image/svg+xml"
          style={{ display: 'none' }}
          data-testid="svg-import-input"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
        {error && (
          <p style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }} data-testid="svg-import-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { deserializeComposition, exportPNG, generateEmbedCode, type Composition, type FormaScene } from 'forma';

export interface ExportPanelProps {
  scene: FormaScene | null;
  composition: Composition;
  onImportComposition(composition: Composition): void;
}

const MAX_IMPORT_BYTES = 1024 * 1024;

/** PNG export (size input + trigger) and Copy Code — calls `exportPNG`/
 * `generateEmbedCode` from Forma's public API (roadmap §6). */
export function ExportPanel({ scene, composition, onImportComposition }: ExportPanelProps) {
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setStatus('import failed: composition file must be 1 MB or smaller');
      return;
    }
    try {
      const imported = deserializeComposition(await file.text());
      onImportComposition(imported);
      setStatus(`imported ${file.name}`);
    } catch (err) {
      setStatus(`import failed: ${(err as Error).message}`);
    }
  }

  async function handleExportPNG() {
    if (!scene) return;
    setStatus('exporting…');
    try {
      const blob = await exportPNG(
        { renderer: scene.renderer, scene: scene.scene, camera: scene.camera, composer: scene.composer },
        { width, height, transparentBackground: true }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'forma-export.png';
      a.click();
      setStatus(`exported ${width}×${height} PNG`);
    } catch (err) {
      setStatus(`export failed: ${(err as Error).message}`);
    }
  }

  function handleCopyCode() {
    const code = generateEmbedCode(composition);
    setOutput(code);
    navigator.clipboard?.writeText(code).catch(() => {});
    setStatus('embed code copied');
  }

  return (
    <div className="section-body">
      <div className="export-row">
        <label className="sr-only" htmlFor="export-width">Export width</label>
        <input id="export-width" type="number" aria-label="Export width" value={width} min={64} max={4096} onChange={(e) => setWidth(Number(e.target.value))} data-testid="export-width" />
        <span style={{ alignSelf: 'center', color: 'var(--text-dim)' }} aria-hidden="true">by</span>
        <label className="sr-only" htmlFor="export-height">Export height</label>
        <input id="export-height" type="number" aria-label="Export height" value={height} min={64} max={4096} onChange={(e) => setHeight(Number(e.target.value))} data-testid="export-height" />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" className="btn primary" onClick={handleExportPNG} data-testid="export-png-btn">
          Export PNG
        </button>
        <button type="button" className="btn" onClick={handleCopyCode} data-testid="copy-code-btn">
          Copy Code
        </button>
      </div>
      <div className="import-row">
        <button type="button" className="btn" onClick={() => importInputRef.current?.click()}>
          Import JSON
        </button>
        <input
          id="import-composition"
          ref={importInputRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={handleImportChange}
          data-testid="import-composition"
        />
        <span className="field-help">Validated composition file, max 1 MB</span>
      </div>
      {status && <div className={`status-message ${status.includes('failed') ? '' : 'success'}`} data-kind={status.includes('failed') ? 'error' : 'success'} role={status.includes('failed') ? 'alert' : 'status'} aria-live="polite">{status}</div>}
      {output && <textarea className="copy-output" readOnly value={output} data-testid="embed-output" />}
    </div>
  );
}

import { useState } from 'react';
import { exportPNG, generateEmbedCode, type Composition, type FormaScene } from 'forma';

export interface ExportPanelProps {
  scene: FormaScene | null;
  composition: Composition;
}

/** PNG export (size input + trigger) and Copy Code — calls `exportPNG`/
 * `generateEmbedCode` from Forma's public API (roadmap §6). */
export function ExportPanel({ scene, composition }: ExportPanelProps) {
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState('');

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
        <input type="number" value={width} min={64} max={4096} onChange={(e) => setWidth(Number(e.target.value))} data-testid="export-width" />
        <span style={{ alignSelf: 'center', color: 'var(--text-dim)' }}>×</span>
        <input type="number" value={height} min={64} max={4096} onChange={(e) => setHeight(Number(e.target.value))} data-testid="export-height" />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" className="btn primary" onClick={handleExportPNG} data-testid="export-png-btn">
          Export PNG
        </button>
        <button type="button" className="btn" onClick={handleCopyCode} data-testid="copy-code-btn">
          Copy Code
        </button>
      </div>
      {status && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>{status}</div>}
      {output && <textarea className="copy-output" readOnly value={output} data-testid="embed-output" />}
    </div>
  );
}

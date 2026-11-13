import { useRef, useState } from 'react';
import { bakeJoinsCurrent, composeScene, deserializeComposition, exportPNG, generateEmbedCode, generateStandaloneHtml, serializeComposition, type Composition, type EmbedOptions, type EmbedView, type FormaScene } from 'forma';
import { composedScenes, LINEFIELD_PIECES, type LinefieldPiece } from 'forma/content';
import type { PresentationState } from './Viewport';
import { currentView, sceneLink } from '../sceneLink';
import { EDITOR_PATH } from '../base';

export interface ExportPanelProps {
  scene: FormaScene | null;
  composition: Composition;
  presentation: PresentationState;
  /** Auto-spin as degrees per second (0 off). */
  spin: number;
  onImportComposition(composition: Composition): void;
}

const MAX_IMPORT_BYTES = 1024 * 1024;
const HEIGHTS = [['480px', '480 px'], ['640px', '640 px'], ['100vh', 'Full screen']] as const;
const SCALES = [1, 2, 4] as const;
/** The editor's Gradient backdrop, reproduced behind a transparent embed. */
const GRADIENT_BACKDROP = 'linear-gradient(180deg,#202634,#7b7088 58%,#d49a7f)';

/** Where the hosted bundle and assets live: next to this app, wherever it is deployed. */
function hosted(): Pick<EmbedOptions, 'libraryUrl' | 'assetBase'> {
  return {
    libraryUrl: new URL(`embed/forma.v${__FORMA_VERSION__}.js`, document.baseURI).href,
    assetBase: new URL('./', document.baseURI).href,
  };
}

/** Where linefield's baked pieces are published. A composed scene is built on one. */
const LINEFIELD_DOWNLOADS = (import.meta.env.VITE_LINEFIELD_DOWNLOADS as string | undefined) ?? 'https://classiccottrell.github.io/linefield/downloads/';
const PIECES = Object.entries(LINEFIELD_PIECES) as [LinefieldPiece, (typeof LINEFIELD_PIECES)[LinefieldPiece]][];

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Export: embed code (hosted bundle), a standalone HTML page (bundle inlined), PNG at
 * 1×/2×/4×, a link to the exact scene, and composition JSON in and out. */
export function ExportPanel({ scene, composition, presentation, spin, onImportComposition }: ExportPanelProps) {
  const [height, setHeight] = useState<(typeof HEIGHTS)[number][0]>('480px');
  const [width, setWidth] = useState(1024);
  const [pngHeight, setPngHeight] = useState(1024);
  const [scale, setScale] = useState<(typeof SCALES)[number]>(2);
  const [transparent, setTransparent] = useState(true);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [output, setOutput] = useState('');
  const [piece, setPiece] = useState<LinefieldPiece>('flow-field');
  const importInputRef = useRef<HTMLInputElement>(null);
  const maxSide = scene?.renderer.capabilities.maxTextureSize ?? 4096;

  const embedOptions = (): EmbedOptions => ({
    ...hosted(),
    view: currentView(scene, presentation, spin),
    height,
  });
  const background = presentation.backdrop === 'gradient' ? GRADIENT_BACKDROP : undefined;
  const embedCode = () => {
    const code = generateEmbedCode(composition, embedOptions());
    return background ? code.replace('height:', `background:${GRADIENT_BACKDROP};height:`) : code;
  };

  async function standalonePage(): Promise<string> {
    const library = await fetch(hosted().libraryUrl!).then((r) => {
      if (!r.ok) throw new Error(`could not load the embed bundle (${r.status})`);
      return r.text();
    });
    const page = generateStandaloneHtml(composition, { ...embedOptions(), height: '100vh', inlineLibrary: library, title: 'Forma scene' });
    return background ? page.replace('height:100vh', `background:${GRADIENT_BACKDROP};height:100vh`) : page;
  }

  /** One page: a linefield piece as the background and a Forma object over it, the
   * bundle pasted in. `showcase` picks one of the built-in composed scenes; otherwise it
   * is the scene in the editor, placed where the chosen piece keeps its focus. */
  async function composedPage(showcase?: string): Promise<{ html: string; reacts: boolean; name: string }> {
    const show = showcase ? composedScenes().find((s) => s.id === showcase) : undefined;
    const slug = show?.piece ?? piece;
    const spot = LINEFIELD_PIECES[slug];
    const [bake, library] = await Promise.all([
      fetch(new URL(`${slug}.html`, LINEFIELD_DOWNLOADS)).then((r) => {
        if (!r.ok) throw new Error(`could not load the linefield piece (${r.status})`);
        return r.text();
      }),
      fetch(hosted().libraryUrl!).then((r) => {
        if (!r.ok) throw new Error(`could not load the embed bundle (${r.status})`);
        return r.text();
      }),
    ]);
    const view: EmbedView = show ? show.view : { ...currentView(scene, presentation, spin), anchor: spot.anchor, fill: spot.fill };
    const html = composeScene(bake, show?.composition ?? composition, {
      ...hosted(),
      view,
      linefield: show?.linefield,
      flowGain: show?.flowGain ?? spot.flowGain,
      inlineLibrary: library,
      title: show?.name ?? `Forma on ${spot.title}`,
    });
    return { html, reacts: bakeJoinsCurrent(bake), name: show?.id ?? `forma-on-${slug}` };
  }
  const composedNote = (reacts: boolean) => (reacts ? '' : ' This linefield build is older than the bridge, so the two won\'t react to each other yet.');

  async function handleComposedDownload() {
    setStatus({ text: 'Building the page…' });
    try {
      const page = await composedPage();
      download(new Blob([page.html], { type: 'text/html' }), `${page.name}.html`);
      setStatus({ text: `Downloaded ${page.name}.html: the background and the object in one file.${composedNote(page.reacts)}` });
    } catch (err) {
      setStatus({ text: `Download failed: ${(err as Error).message}`, error: true });
    }
  }

  async function handleComposedPreview(showcase?: string) {
    const tab = window.open('', '_blank');
    if (!tab) {
      setStatus({ text: 'Preview was blocked. Allow pop-ups for this site, or use Download HTML.', error: true });
      return;
    }
    try {
      const page = await composedPage(showcase);
      const url = URL.createObjectURL(new Blob([page.html], { type: 'text/html' }));
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus({ text: `Preview opened in a new tab.${composedNote(page.reacts)}` });
    } catch (err) {
      tab.close();
      setStatus({ text: `Preview failed: ${(err as Error).message}`, error: true });
    }
  }

  async function handleCopyCode() {
    const code = embedCode();
    setOutput(code);
    setStatus({ text: (await copy(code)) ? 'Embed code copied. Paste it into any page.' : 'Embed code below. Select it and copy.' });
  }

  async function handleDownloadHtml() {
    setStatus({ text: 'Building the page…' });
    try {
      download(new Blob([await standalonePage()], { type: 'text/html' }), 'forma-scene.html');
      setStatus({ text: 'Downloaded forma-scene.html. It opens on its own, no server needed.' });
    } catch (err) {
      setStatus({ text: `Download failed: ${(err as Error).message}`, error: true });
    }
  }

  async function handlePreview() {
    // Opened first, inside the click, or popup blockers stop it.
    const tab = window.open('', '_blank');
    if (!tab) {
      setStatus({ text: 'Preview was blocked. Allow pop-ups for this site, or use Download HTML.', error: true });
      return;
    }
    try {
      const url = URL.createObjectURL(new Blob([await standalonePage()], { type: 'text/html' }));
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus({ text: 'Preview opened in a new tab.' });
    } catch (err) {
      tab.close();
      setStatus({ text: `Preview failed: ${(err as Error).message}`, error: true });
    }
  }

  async function handleCopyLink() {
    const editorUrl = new URL(EDITOR_PATH, window.location.origin).href;
    const link = sceneLink(editorUrl, composition, currentView(scene, presentation, spin));
    setOutput(link);
    setStatus({ text: (await copy(link)) ? 'Scene link copied. It opens this exact scene in the editor.' : 'Scene link below. Select it and copy.' });
  }

  async function handleExportPNG() {
    if (!scene) return;
    const w = Math.min(maxSide, Math.round(width * scale));
    const h = Math.min(maxSide, Math.round(pngHeight * scale));
    setStatus({ text: 'Rendering…' });
    try {
      const blob = await exportPNG(
        { renderer: scene.renderer, scene: scene.scene, camera: scene.camera, composer: scene.composer, framing: scene.framing },
        { width: w, height: h, transparentBackground: transparent },
      );
      download(blob, `forma-${w}x${h}.png`);
      setStatus({ text: `Exported a ${w}×${h} PNG${w < width * scale || h < pngHeight * scale ? ` (capped at ${maxSide} px, this device's limit)` : ''}.` });
    } catch (err) {
      setStatus({ text: `Export failed: ${(err as Error).message}`, error: true });
    }
  }

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setStatus({ text: 'Import failed: the file must be 1 MB or smaller.', error: true });
      return;
    }
    try {
      onImportComposition(deserializeComposition(await file.text()));
      setStatus({ text: `Imported ${file.name}.` });
    } catch (err) {
      setStatus({ text: `Import failed: ${(err as Error).message}`, error: true });
    }
  }

  return (
    <div className="section-body export-panel">
      <div className="export-group" role="group" aria-labelledby="export-embed-title">
        <div className="export-group-title" id="export-embed-title">Embed on a site</div>
        <div className="filter-tabs" role="radiogroup" aria-label="Embed height">
          {HEIGHTS.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={height === value} className={height === value ? 'active' : ''} onClick={() => setHeight(value)}>{label}</button>
          ))}
        </div>
        <div className="export-buttons">
          <button type="button" className="btn primary" onClick={handleCopyCode} data-testid="copy-code-btn">Copy code</button>
          <button type="button" className="btn" onClick={handleDownloadHtml} data-testid="download-html-btn">Download HTML</button>
          <button type="button" className="btn" onClick={handlePreview} data-testid="preview-embed-btn">Preview</button>
        </div>
        <p className="field-help">Carries this view: camera angle, spin, backdrop and shadow. Animates, follows the pointer and scroll, and pauses when off-screen.</p>
      </div>

      <div className="export-group" role="group" aria-labelledby="export-composed-title">
        <div className="export-group-title" id="export-composed-title">On a linefield background</div>
        <div className="filter-tabs" role="radiogroup" aria-label="linefield piece">
          {PIECES.map(([slug, info]) => (
            <button key={slug} type="button" role="radio" aria-checked={piece === slug} className={piece === slug ? 'active' : ''} onClick={() => setPiece(slug)}>{info.title}</button>
          ))}
        </div>
        <div className="export-buttons">
          <button type="button" className="btn primary" onClick={handleComposedDownload} data-testid="composed-download-btn">Download HTML</button>
          <button type="button" className="btn" onClick={() => handleComposedPreview()} data-testid="composed-preview-btn">Preview</button>
        </div>
        <p className="field-help">One file: the lines as the background, this object over them. With Matter on, what comes apart rides the lines' flow in their colour, and the lines make room for the object.</p>
        <div className="export-buttons" aria-label="Showcase scenes">
          {composedScenes().map((s) => (
            <button key={s.id} type="button" className="btn" title={s.blurb} onClick={() => handleComposedPreview(s.id)} data-testid={`composed-scene-${s.id}`}>{s.name}</button>
          ))}
        </div>
      </div>

      <div className="export-group" role="group" aria-labelledby="export-image-title">
        <div className="export-group-title" id="export-image-title">Image</div>
        <div className="export-row">
          <label className="sr-only" htmlFor="export-width">Export width</label>
          <input id="export-width" type="number" aria-label="Export width" value={width} min={64} max={4096} onChange={(e) => setWidth(Number(e.target.value))} data-testid="export-width" />
          <span className="export-by" aria-hidden="true">by</span>
          <label className="sr-only" htmlFor="export-height">Export height</label>
          <input id="export-height" type="number" aria-label="Export height" value={pngHeight} min={64} max={4096} onChange={(e) => setPngHeight(Number(e.target.value))} data-testid="export-height" />
        </div>
        <div className="filter-tabs" role="radiogroup" aria-label="PNG scale">
          {SCALES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={scale === s} className={scale === s ? 'active' : ''} onClick={() => setScale(s)}>{s}×</button>
          ))}
        </div>
        <label className="export-check">
          <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> Transparent background
        </label>
        <button type="button" className="btn primary" onClick={handleExportPNG} disabled={!scene} data-testid="export-png-btn">
          Export PNG · {Math.min(maxSide, width * scale)}×{Math.min(maxSide, pngHeight * scale)}
        </button>
      </div>

      <div className="export-group" role="group" aria-labelledby="export-share-title">
        <div className="export-group-title" id="export-share-title">Share and save</div>
        <div className="export-buttons">
          <button type="button" className="btn" onClick={handleCopyLink} data-testid="copy-link-btn">Copy scene link</button>
          <button type="button" className="btn" onClick={() => download(new Blob([JSON.stringify(JSON.parse(serializeComposition(composition)), null, 2)], { type: 'application/json' }), 'forma-scene.json')} data-testid="save-json-btn">Save JSON</button>
          <button type="button" className="btn" onClick={() => importInputRef.current?.click()}>Import JSON</button>
        </div>
        <input id="import-composition" ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={handleImportChange} data-testid="import-composition" />
      </div>

      {status && <div className={`status-message ${status.error ? '' : 'success'}`} data-kind={status.error ? 'error' : 'success'} role={status.error ? 'alert' : 'status'} aria-live="polite">{status.text}</div>}
      {output && <textarea className="copy-output" readOnly value={output} aria-label="Export output" data-testid="embed-output" onFocus={(e) => e.currentTarget.select()} />}
    </div>
  );
}

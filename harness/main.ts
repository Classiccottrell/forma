import {
  FormaRuntime,
  createFormaScene,
  shapeRegistry,
  materialRegistry,
  environmentRegistry,
  serializeComposition,
  deserializeComposition,
  generateEmbedCode,
  exportPNG,
  type Composition,
} from '../src/index.js';
import { registerAllContent } from '../src/content/index.js';
import { runLeakCheck, type Combo } from './leak-check.js';

registerAllContent();

const app = document.getElementById('app')!;
const canvasHost = document.createElement('div');
canvasHost.style.cssText = 'position:absolute;inset:0;';
app.appendChild(canvasHost);

const { scene, camera, renderer, composer, render, ensureOutputPassLast } = createFormaScene({ el: canvasHost });

const runtime = new FormaRuntime({ scene, camera, renderer, composer, ensureOutputPassLast });

let current: Composition = {
  shapeId: 'sphere',
  shapeParams: shapeRegistry.require('sphere').defaultParameters,
  materialId: 'matte',
  materialParams: materialRegistry.require('matte').defaultParameters,
  environmentId: 'studio',
  environmentParams: {},
  effectIds: [],
  effectParams: {},
};
runtime.applyComposition(current);

function apply(patch: Partial<Composition>) {
  current = { ...current, ...patch };
  runtime.applyComposition(current);
  renderReport();
}

// --- UI ----------------------------------------------------------------

const panel = document.createElement('div');
panel.style.cssText =
  'position:fixed;top:8px;left:8px;z-index:10;font:12px/1.5 monospace;color:#fff;background:rgba(0,0,0,0.7);padding:10px;border-radius:6px;max-width:360px;white-space:pre-wrap;';
app.appendChild(panel);

function row(label: string, ids: string[], onPick: (id: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.marginBottom = '6px';
  const l = document.createElement('div');
  l.textContent = label;
  wrap.appendChild(l);
  for (const id of ids) {
    const btn = document.createElement('button');
    btn.textContent = id;
    btn.style.cssText = 'cursor:pointer;margin:2px;';
    btn.addEventListener('click', () => onPick(id));
    wrap.appendChild(btn);
  }
  return wrap;
}

panel.appendChild(
  row('shape', shapeRegistry.list().map((d) => d.id), (id) =>
    apply({ shapeId: id, shapeParams: shapeRegistry.require(id).defaultParameters })
  )
);
panel.appendChild(
  row('material', materialRegistry.list().map((d) => d.id), (id) =>
    apply({ materialId: id, materialParams: materialRegistry.require(id).defaultParameters })
  )
);
panel.appendChild(
  row('environment', environmentRegistry.list().map((d) => d.id), (id) => apply({ environmentId: id, environmentParams: {} }))
);

const actions = document.createElement('div');
actions.style.marginTop = '8px';
panel.appendChild(actions);

function actionButton(label: string, onClick: () => void) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = 'cursor:pointer;margin:2px;';
  btn.addEventListener('click', onClick);
  actions.appendChild(btn);
}

const jsonBox = document.createElement('textarea');
jsonBox.style.cssText = 'width:100%;height:60px;margin-top:6px;font:11px monospace;';
panel.appendChild(jsonBox);

actionButton('Copy JSON', () => {
  jsonBox.value = serializeComposition(current);
  navigator.clipboard?.writeText(jsonBox.value).catch(() => {});
});
actionButton('Paste JSON -> Apply', () => {
  const next = deserializeComposition(jsonBox.value);
  current = next;
  runtime.applyComposition(current);
  renderReport();
});
actionButton('Copy Embed Code', () => {
  jsonBox.value = generateEmbedCode(current);
  navigator.clipboard?.writeText(jsonBox.value).catch(() => {});
});
actionButton('Export PNG', async () => {
  const blob = await exportPNG({ renderer, scene, camera, composer });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'forma-export.png';
  a.click();
  verifyAlpha(blob);
});
actionButton('Run Leak Check (>=50 cycles)', () => runLeakCheckUI());

const reportBox = document.createElement('div');
reportBox.style.marginTop = '8px';
panel.appendChild(reportBox);

function renderReport() {
  reportBox.textContent = 'report: ' + JSON.stringify(runtime.report());
}
renderReport();

async function verifyAlpha(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bitmap.width;
  c.height = bitmap.height;
  const g = c.getContext('2d')!;
  g.drawImage(bitmap, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i]! < 255) {
      hasAlpha = true;
      break;
    }
  }
  const status = document.createElement('div');
  status.textContent = `PNG alpha channel present: ${hasAlpha}`;
  reportBox.appendChild(status);
}

const hud = document.createElement('div');
hud.style.cssText =
  'position:fixed;bottom:8px;left:8px;z-index:10;font:12px/1.5 monospace;color:#fff;background:rgba(0,0,0,0.7);padding:10px;border-radius:6px;max-width:420px;white-space:pre;';
app.appendChild(hud);

function runLeakCheckUI() {
  const combos: Combo[] = [];
  for (const s of shapeRegistry.list()) {
    for (const m of materialRegistry.list()) {
      for (const e of environmentRegistry.list()) {
        combos.push({ shapeId: s.id, materialId: m.id, environmentId: e.id });
      }
    }
  }
  const result = runLeakCheck(
    runtime,
    combos,
    (id) => shapeRegistry.require(id).defaultParameters,
    (id) => materialRegistry.require(id).defaultParameters,
    50
  );
  hud.textContent = `leak-check: ${result.pass ? 'PASS' : 'FAIL'}\nbaseline=${result.baseline} maxEndTotal=${result.maxEndTotal} maxMidTotal=${result.maxMidTotal} cycles=${result.cycles.length}\n${result.failures.join('\n')}`;
  console.log('[forma leak-check]', result);
  // Restore visible composition to combo 0's shape/material/env
  apply({
    shapeId: combos[0]!.shapeId,
    shapeParams: shapeRegistry.require(combos[0]!.shapeId).defaultParameters,
    materialId: combos[0]!.materialId,
    materialParams: materialRegistry.require(combos[0]!.materialId).defaultParameters,
    environmentId: combos[0]!.environmentId,
    environmentParams: {},
  });
}

function loop() {
  requestAnimationFrame(loop);
  render();
}
loop();

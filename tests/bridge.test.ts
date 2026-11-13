import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { pageCurrent } from '../src/bridge/current.js';
import { joinPageCurrent } from '../src/bridge/pageBridge.js';
import { composeScene, isLinefieldBake } from '../src/runtime/compose.js';
import { computeFraming } from '../src/scene/framing.js';
import type { FormaRuntime } from '../src/runtime/FormaRuntime.js';
import type { FlowSampler } from '../src/runtime/MatterLayer.js';
import { MATTER_DEFAULTS } from '../src/runtime/matterSettings.js';
import type { Composition } from '../src/types.js';

const defaultTestComposition = (): Composition => ({ shapeId: 'sphere', shapeParams: {}, materialId: 'matte', materialParams: {}, environmentId: 'studio', environmentParams: {}, effectIds: [], effectParams: {} });

/** linefield ships the same bytes as shared/current.js and pins the same hash in
 * tools/test-current.mjs. If this fails the contract changed: land the identical file in
 * both repos, then update both pins. */
const PINNED = '3832ff3993e64f75153bfc347bc601b27a7e18ccf76a13756ab6556b1dc9e84c';

describe('the page current', () => {
  it('is the file linefield ships, byte for byte', () => {
    const sha = createHash('sha256').update(readFileSync(resolve(__dirname, '../src/bridge/current.js'))).digest('hex');
    expect(sha).toBe(PINNED);
  });
});

function fakeRuntime() {
  const calls = { flow: [] as (FlowSampler | null)[], palette: [] as unknown[], pointer: [] as unknown[] };
  const runtime = {
    matterState: { disperse: 0.4, form: 'gas' } as { disperse: number; form: 'solid' | 'liquid' | 'gas' } | null,
    setMatterFlow: (f: FlowSampler | null) => calls.flow.push(f),
    setMatterPalette: (p: unknown) => calls.palette.push(p),
    setMatterPointer: (p: unknown) => calls.pointer.push(p),
  };
  return { runtime, calls };
}

function fakeElement(rect: { left: number; top: number; width: number; height: number }): HTMLElement {
  return { getBoundingClientRect: () => rect } as unknown as HTMLElement;
}

describe('joinPageCurrent', () => {
  const leavers: { leave(): void }[] = [];
  afterEach(() => { for (const m of leavers.splice(0)) m.leave(); });

  function setup() {
    const camera = new THREE.PerspectiveCamera(50, 1200 / 800, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const { runtime, calls } = fakeRuntime();
    const el = fakeElement({ left: 100, top: 50, width: 1200, height: 800 });
    const matter = { ...MATTER_DEFAULTS, cursor: 'vortex' as const, strength: 1.2, radius: 0.25 };
    const bridge = joinPageCurrent({ el, camera, runtime: runtime as unknown as FormaRuntime, matter: () => matter });
    leavers.push({ leave: () => bridge.dispose() });
    return { bridge, runtime, calls, camera };
  }

  it('does nothing while Forma is alone on the page', () => {
    const { bridge, calls } = setup();
    bridge.step();
    expect(bridge.accompanied).toBe(false);
    expect(pageCurrent().body).toBeNull();
    expect(calls.flow).toEqual([]);
    expect(calls.pointer).toEqual([]);
  });

  it('publishes the object and cursor, and takes the pointer, flow and palette', () => {
    const { bridge, calls } = setup();
    const current = pageCurrent();
    const lines = current.join('linefield');
    leavers.push(lines);
    lines.publish('field', { sample(x, y, _t, out) { out[0] = x > 700 ? 1 : 0; out[1] = 0.5; return out; } });
    lines.publish('palette', { a: [255, 255, 255], b: [0, 0, 255], dark: true });
    current.pointer.x = 700; current.pointer.y = 450; current.pointer.active = true;
    bridge.step();

    // The object: centred in the element, at the radius the camera gives 1.2 world units.
    expect(current.body!.x).toBeCloseTo(700, 4);
    expect(current.body!.y).toBeCloseTo(450, 4);
    const expectedR = (1.2 / (6 * Math.tan(THREE.MathUtils.degToRad(25)))) * 400;
    expect(current.body!.r).toBeCloseTo(expectedR, 1);
    expect(current.body!.disperse).toBe(0.4);
    expect(current.body!.form).toBe('gas');
    // The cursor: reach is the matter radius in half-heights of the element.
    expect(current.cursor).toEqual({ mode: 'vortex', strength: 1.2, reach: 100 });
    // The page pointer in the element's NDC (centre here).
    const ndc = calls.pointer.at(-1) as { x: number; y: number };
    expect(ndc.x).toBeCloseTo(0, 9);
    expect(ndc.y).toBeCloseTo(0, 9);
    // The flow: page y-down becomes viewport y-up, sampled at the right page position.
    expect(calls.flow).toHaveLength(1);
    const out: [number, number] = [0, 0];
    calls.flow[0]!(0.75, 0.5, out);
    expect(out).toEqual([1, -0.5]);
    calls.flow[0]!(0.25, 0.5, out);
    expect(out).toEqual([0, -0.5]);
    expect(calls.palette).toEqual([{ a: [255, 255, 255], b: [0, 0, 255] }]);

    // Steady state: nothing is set again.
    bridge.step();
    expect(calls.flow).toHaveLength(1);
    expect(calls.palette).toHaveLength(1);

    // The pointer leaves the element.
    current.pointer.x = 20;
    bridge.step();
    expect(calls.pointer.at(-1)).toBeNull();
  });

  it('lets go of everything when the company leaves', () => {
    const { bridge, calls } = setup();
    const current = pageCurrent();
    const lines = current.join('linefield');
    lines.publish('field', { sample: (_x, _y, _t, out) => out });
    bridge.step();
    expect(current.body).not.toBeNull();
    lines.leave();
    bridge.step();
    expect(current.body).toBeNull();
    expect(current.cursor).toBeNull();
    expect(calls.flow.at(-1)).toBeNull();
    expect(calls.palette.at(-1)).toBeNull();
  });
});

describe('framing anchor', () => {
  it('places the object at a chosen point of the canvas without changing its size', () => {
    const centred = computeFraming(50, 1200, 800, { fill: 0.4 });
    const placed = computeFraming(50, 1200, 800, { fill: 0.4, anchor: { x: 0.75, y: 0.3 } });
    expect(placed.distance).toBe(centred.distance);
    const camera = new THREE.PerspectiveCamera(50, 1200 / 800, 0.1, 100);
    camera.position.set(0, 0, placed.distance);
    camera.setViewOffset(1200, 800, placed.offsetX, placed.offsetY, 1200, 800);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const p = new THREE.Vector3().project(camera);
    expect(((p.x + 1) / 2) * 1200).toBeCloseTo(900, 3);
    expect(((1 - p.y) / 2) * 800).toBeCloseTo(240, 3);
  });
});

describe('composeScene', () => {
  const bake = '<!doctype html>\n<html><head><title>linefield — flow-field</title></head><body><canvas id="canvas"></canvas>'
    + '<script>window.__LF_BAKED_VALUES__ = {"scale":1.75,"speed":1,"colorA":"#00aaff"};\nconsole.log(1);</script></body></html>';

  it('refuses a page that is not a linefield bake', () => {
    expect(isLinefieldBake('<html><body>hello</body></html>')).toBe(false);
    expect(() => composeScene('<html><body>hello</body></html>', defaultTestComposition())).toThrow(/linefield baked export/);
  });

  it('lays a click-through, transparent Forma embed over the background', () => {
    const html = composeScene(bake, defaultTestComposition(), { libraryUrl: 'https://example.test/forma.js', view: { anchor: { x: 0.6, y: 0.4 }, backdrop: 'environment' } });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('position:fixed;inset:0;pointer-events:none;z-index:1');
    expect(html).toContain('<script src="https://example.test/forma.js"></script>');
    expect(html).toContain('"backdrop":"transparent"');
    expect(html).toContain('"anchor":{"x":0.6,"y":0.4}');
    expect(html).toContain('"shadow":{"enabled":false');
    expect(html.indexOf('Forma.embed(')).toBeLessThan(html.lastIndexOf('</body>'));
    expect(html.indexOf('Forma.embed(')).toBeGreaterThan(html.indexOf('__LF_BAKED_VALUES__'));
  });

  it('overrides the piece\'s baked values and the title, escaping both', () => {
    const html = composeScene(bake, defaultTestComposition(), { linefield: { scale: 0.9, note: '</script><b>' }, title: 'A <scene>', flowGain: 1.2 });
    expect(html).toContain('window.__LF_BAKED_VALUES__ = {"scale":0.9,"speed":1,"colorA":"#00aaff","note":"\\u003c/script>\\u003cb>"};');
    expect(html).toContain('<title>A &lt;scene></title>');
    expect(html).toContain('"flowGain":1.2');
    expect(html.match(/<\/script>/g)!.length).toBe(3);
  });
});

describe('composed scenes', () => {
  it('are valid compositions on pieces that take part in the current', async () => {
    const { registerAllContent, composedScenes, LINEFIELD_PIECES } = await import('../src/content/index.js');
    const { serializeComposition, deserializeComposition } = await import('../src/runtime/serialize.js');
    registerAllContent();
    const scenes = composedScenes();
    expect(scenes.map((s) => s.piece).sort()).toEqual(['flow-field', 'funnel', 'grain-field']);
    for (const scene of scenes) {
      expect(LINEFIELD_PIECES[scene.piece]).toBeDefined();
      expect(scene.composition.matter).toBeDefined();
      expect(deserializeComposition(serializeComposition(scene.composition))).toEqual(scene.composition);
      expect(scene.view.anchor).toBeDefined();
    }
  });

  it('can inline the bundle so a composed page needs no network for scripts', async () => {
    const { composeScene: compose, bakeJoinsCurrent } = await import('../src/runtime/compose.js');
    const bake = '<html><body><script>window.__LF_BAKED_VALUES__ = {"scale":1};\nconst k = "__pageCurrent__";</script></body></html>';
    expect(bakeJoinsCurrent(bake)).toBe(true);
    expect(bakeJoinsCurrent(bake.replace('__pageCurrent__', 'x'))).toBe(false);
    const html = compose(bake, defaultTestComposition(), { libraryUrl: 'https://example.test/f.js', inlineLibrary: 'window.Forma={};//</script>\n//# sourceMappingURL=f.js.map\n' });
    expect(html).not.toContain('example.test');
    expect(html).toContain('window.Forma={};//<\\/script>');
    expect(html).not.toContain('sourceMappingURL');
  });
});

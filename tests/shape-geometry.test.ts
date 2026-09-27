import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { shapeRegistry } from '../src/index.js';
import { ensureHarnessContentRegistered } from './testUtils.js';

// Geometry guarantees for the hand-built shapes, across every corner of each
// parameter box — not just the defaults the smoke test covers. These shapes are
// built from explicit face lists and hand-set winding, where the failure mode is
// silent: under `side: FrontSide` a back-facing face is invisible, so a winding
// mistake ships as a hole. Each check here was first confirmed failing against
// the bug it guards (an inverted `lowerHalves`, a folding vase profile, a brim
// with reversed end caps) before being trusted.

type Params = Record<string, number | string | boolean>;

function build(id: string, params: Params = {}): THREE.BufferGeometry {
  const def = shapeRegistry.require(id);
  return def.create({ ...def.defaultParameters, ...params } as never, { registry: { track: () => {} } as never });
}

/** Every corner of the box spanned by `keys`, plus the defaults. */
function corners(id: string, keys: string[]): Params[] {
  const schema = shapeRegistry.require(id).parameterSchema as Record<string, { min: number; max: number }>;
  const out: Params[] = [{}];
  for (let mask = 0; mask < 1 << keys.length; mask++) {
    const params: Params = {};
    keys.forEach((k, i) => (params[k] = (mask >> i) & 1 ? schema[k].max : schema[k].min));
    out.push(params);
  }
  return out;
}

interface Tri { keys: [string, string, string]; v: [THREE.Vector3, THREE.Vector3, THREE.Vector3] }

/** Non-degenerate triangles, vertices keyed by quantised position so coincident
 * vertices across faces (and lathe seams) count as one. */
function triangles(geometry: THREE.BufferGeometry): { tris: Tri[]; finite: boolean } {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.getAttribute('position');
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
  const tris: Tri[] = [];
  let finite = true;
  for (let t = 0; t < pos.count / 3; t++) {
    const ids = [3 * t, 3 * t + 1, 3 * t + 2];
    const v = ids.map((i) => new THREE.Vector3().fromBufferAttribute(pos, i)) as Tri['v'];
    if (v.some((p) => !Number.isFinite(p.x + p.y + p.z))) finite = false;
    const keys = ids.map(key) as Tri['keys'];
    const area = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(v[1], v[0]), new THREE.Vector3().subVectors(v[2], v[0])).length();
    // Zero-area triangles (lathe and sphere poles) have coincident vertices
    // that would otherwise read as duplicated edges.
    if (area > 1e-12 && new Set(keys).size === 3) tris.push({ keys, v });
  }
  if (g !== geometry) g.dispose();
  return { tris, finite };
}

/** Per connected part: closed and consistently wound — every directed edge used
 * exactly once, with its reverse present — and positive signed volume. Together
 * those prove every face points outward, for convex and non-convex solids alike. */
function solidProblems(geometry: THREE.BufferGeometry): string[] {
  const { tris, finite } = triangles(geometry);
  const problems = finite ? [] : ['non-finite positions'];
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    while (parent.get(k) !== k) k = parent.get(k)!;
    return k;
  };
  for (const { keys } of tris) {
    for (const k of keys) if (!parent.has(k)) parent.set(k, k);
    parent.set(find(keys[0]), find(keys[1]));
    parent.set(find(keys[1]), find(keys[2]));
  }
  const parts = new Map<string, { edges: Map<string, number>; volume: number }>();
  for (const { keys, v } of tris) {
    const root = find(keys[0]);
    if (!parts.has(root)) parts.set(root, { edges: new Map(), volume: 0 });
    const part = parts.get(root)!;
    part.volume += v[0].dot(new THREE.Vector3().crossVectors(v[1], v[2])) / 6;
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]] as const) {
      const e = `${keys[a]}|${keys[b]}`;
      part.edges.set(e, (part.edges.get(e) ?? 0) + 1);
    }
  }
  for (const part of parts.values()) {
    let open = 0, doubled = 0;
    for (const [e, count] of part.edges) {
      if (count > 1) doubled++;
      const [a, b] = e.split('|');
      if (!part.edges.has(`${b}|${a}`)) open++;
    }
    if (open) problems.push(`${open} open edges`);
    if (doubled) problems.push(`${doubled} doubled edges`);
    if (!(part.volume > 0)) problems.push(`part volume ${part.volume}`);
  }
  return problems;
}

/** Convex solids additionally have every vertex on or behind every face plane. */
function isConvex(geometry: THREE.BufferGeometry): boolean {
  const { tris } = triangles(geometry);
  const verts = new Map<string, THREE.Vector3>();
  for (const { keys, v } of tris) keys.forEach((k, i) => verts.set(k, v[i]));
  const all = [...verts.values()];
  return tris.every(({ v }) => {
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(v[1], v[0]), new THREE.Vector3().subVectors(v[2], v[0])).normalize();
    const d = n.dot(v[0]);
    return all.every((p) => n.dot(p) - d <= 1e-4);
  });
}

describe('hand-built shape geometry, across each parameter box', () => {
  ensureHarnessContentRegistered();

  const cases: [string, string[], boolean][] = [
    ['diamond', ['tablePercent', 'crownPercent', 'pavilionPercent', 'girdlePercent', 'starLength', 'lowerHalves'], true],
    ['bevelled-box', ['size', 'depth', 'bevel'], true],
    ['hoodie', ['thickness', 'roundness', 'smoothing'], false],
    ['polo', ['thickness', 'roundness', 'smoothing'], false],
    ['cap', ['crownHeight', 'brimLength', 'brimTilt', 'brimCurve', 'seams'], false],
  ];
  for (const [id, keys, convex] of cases) {
    it(`${id}: closed, consistently wound, outward-facing${convex ? ' and convex' : ''}`, () => {
      for (const params of corners(id, keys)) {
        // bevelled-box at bevel 0 falls back to BoxGeometry, which is not a
        // single welded solid; its chamfered range is what this checks.
        if (id === 'bevelled-box' && params.bevel === 0) continue;
        const geometry = build(id, params);
        expect(solidProblems(geometry), `${id} ${JSON.stringify(params)}`).toEqual([]);
        if (convex) expect(isConvex(geometry), `${id} ${JSON.stringify(params)} convex`).toBe(true);
        geometry.dispose();
      }
    });
  }

  it('diamond: lower girdle halves reach lowerHalves of the way toward the culet', () => {
    const radii = [0.55, 0.77, 0.9].map((lowerHalves) => {
      const geometry = build('diamond', { radius: 1, lowerHalves });
      const { tris } = triangles(geometry);
      const pts = tris.flatMap((t) => t.v);
      const culet = Math.min(...pts.map((p) => p.y));
      const girdleBottom = Math.min(...pts.filter((p) => Math.hypot(p.x, p.z) > 0.999).map((p) => p.y));
      const junction = pts.filter((p) => p.y > culet + 1e-6 && p.y < girdleBottom - 1e-6);
      geometry.dispose();
      expect(junction.length).toBeGreaterThan(0);
      for (const p of junction) expect(Math.hypot(p.x, p.z)).toBeCloseTo(1 - lowerHalves, 4);
      return Math.hypot(junction[0].x, junction[0].z);
    });
    // Regression: the control once worked backwards.
    expect(radii[0]).toBeGreaterThan(radii[1]);
    expect(radii[1]).toBeGreaterThan(radii[2]);
  });

  it('vase: profile heights never decrease, so the lathe cannot fold', () => {
    const segments = 12;
    for (const params of corners('vase', ['height', 'baseRadius', 'bellyRadius', 'neckRadius', 'bellyHeight', 'lipFlare'])) {
      const geometry = build('vase', { ...params, radialSegments: segments });
      const pos = geometry.getAttribute('position');
      // LatheGeometry lays vertices out ring by ring: the first `points` are
      // the profile at angle 0.
      const points = pos.count / (segments + 1);
      for (let j = 1; j < points; j++) {
        expect(pos.getY(j), `vase ${JSON.stringify(params)} sample ${j}`).toBeGreaterThanOrEqual(pos.getY(j - 1) - 1e-9);
      }
      geometry.dispose();
    }
  });
});

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { defineShape, shapeRegistry } from '../registry/instances.js';

// Four shape definitions (blueprint §5.1). All params are rebuild:true — geometry
// regeneration is inherently a buffer swap; no `update` is provided on any of these
// (intentional — documents shapes commonly have zero hot params).

const sphere = defineShape({
  id: 'sphere',
  label: 'Sphere',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.2, max: 2, step: 0.05, default: 1, rebuild: true },
    detail: { kind: 'number', min: 1, max: 6, step: 1, default: 3, rebuild: true },
  },
  defaultParameters: { radius: 1, detail: 3 },
  create(params, ctx) {
    const geometry = new THREE.SphereGeometry(params.radius, params.detail * 8, params.detail * 6);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const box = defineShape({
  id: 'box',
  label: 'Box',
  category: 'primitive',
  parameterSchema: {
    size: { kind: 'number', min: 0.2, max: 2, step: 0.05, default: 1, rebuild: true },
    segments: { kind: 'number', min: 1, max: 8, step: 1, default: 1, rebuild: true },
    roundness: { kind: 'number', min: 0, max: 0.5, step: 0.01, default: 0, rebuild: true },
  },
  defaultParameters: { size: 1, segments: 1, roundness: 0 },
  create(params, ctx) {
    const radius = Math.max(0, Math.min(params.roundness ?? 0, params.size * 0.5));
    const geometry = radius === 0
      ? new THREE.BoxGeometry(params.size, params.size, params.size, params.segments, params.segments, params.segments)
      : new RoundedBoxGeometry(params.size, params.size, params.size, params.segments, radius);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const pill = defineShape({
  id: 'pill',
  label: 'Pill',
  category: 'primitive',
  parameterSchema: {
    width: { kind: 'number', min: 0.2, max: 3, step: 0.05, default: 1.8, rebuild: true },
    height: { kind: 'number', min: 0.2, max: 3, step: 0.05, default: 0.65, rebuild: true },
    depth: { kind: 'number', min: 0.1, max: 2, step: 0.05, default: 0.3, rebuild: true },
    roundness: { kind: 'number', min: 0, max: 1.5, step: 0.01, default: 0.3, rebuild: true },
    smoothness: { kind: 'number', min: 1, max: 8, step: 1, default: 6, rebuild: true },
  },
  defaultParameters: { width: 1.8, height: 0.65, depth: 0.3, roundness: 0.3, smoothness: 6 },
  create(params, ctx) {
    const radius = Math.max(0, Math.min(params.roundness, params.width / 2, params.height / 2));
    const geometry = new RoundedBoxGeometry(params.width, params.height, params.depth, Math.max(1, Math.round(params.smoothness)), radius);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const card = defineShape({
  id: 'card',
  label: 'Card',
  category: 'primitive',
  parameterSchema: {
    width: { kind: 'number', min: 0.2, max: 3, step: 0.05, default: 1.6, rebuild: true },
    height: { kind: 'number', min: 0.2, max: 3, step: 0.05, default: 1.1, rebuild: true },
    depth: { kind: 'number', min: 0.1, max: 2, step: 0.05, default: 0.22, rebuild: true },
    roundness: { kind: 'number', min: 0, max: 1.5, step: 0.01, default: 0.14, rebuild: true },
    smoothness: { kind: 'number', min: 1, max: 8, step: 1, default: 4, rebuild: true },
  },
  defaultParameters: { width: 1.6, height: 1.1, depth: 0.22, roundness: 0.14, smoothness: 4 },
  create(params, ctx) {
    const radius = Math.max(0, Math.min(params.roundness, params.width / 2, params.height / 2));
    const geometry = new RoundedBoxGeometry(params.width, params.height, params.depth, Math.max(1, Math.round(params.smoothness)), radius);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const badge = defineShape({
  id: 'badge',
  label: 'Badge',
  category: 'ui',
  parameterSchema: {
    width: { kind: 'number', min: 0.2, max: 3, step: 0.05, default: 1.2, rebuild: true },
    height: { kind: 'number', min: 0.2, max: 2, step: 0.05, default: 0.55, rebuild: true },
    depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.16, rebuild: true },
    roundness: { kind: 'number', min: 0, max: 1.5, step: 0.01, default: 0.2, rebuild: true },
    smoothness: { kind: 'number', min: 1, max: 8, step: 1, default: 6, rebuild: true },
  },
  defaultParameters: { width: 1.2, height: 0.55, depth: 0.16, roundness: 0.2, smoothness: 6 },
  create(params, ctx) {
    const radius = Math.max(0, Math.min(params.roundness, params.width / 2, params.height / 2, params.depth / 2));
    const geometry = new RoundedBoxGeometry(params.width, params.height, params.depth, Math.max(1, Math.round(params.smoothness)), radius);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const tab = defineShape({
  id: 'tab',
  label: 'Tab',
  category: 'ui',
  parameterSchema: {
    width: { kind: 'number', min: 0.2, max: 3, step: 0.05, default: 1.6, rebuild: true },
    height: { kind: 'number', min: 0.2, max: 2, step: 0.05, default: 0.48, rebuild: true },
    depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.14, rebuild: true },
    roundness: { kind: 'number', min: 0, max: 1.5, step: 0.01, default: 0.12, rebuild: true },
    smoothness: { kind: 'number', min: 1, max: 8, step: 1, default: 5, rebuild: true },
  },
  defaultParameters: { width: 1.6, height: 0.48, depth: 0.14, roundness: 0.12, smoothness: 5 },
  create(params, ctx) {
    const radius = Math.max(0, Math.min(params.roundness, params.width / 2, params.height / 2, params.depth / 2));
    const geometry = new RoundedBoxGeometry(params.width, params.height, params.depth, Math.max(1, Math.round(params.smoothness)), radius);
    ctx.registry.track(geometry);
    return geometry;
  },
});

function makeNotchedCardShape(width: number, height: number, notch: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  return new THREE.Shape()
    .moveTo(-w + notch, -h)
    .lineTo(w - notch, -h)
    .lineTo(w - notch, -h + notch)
    .lineTo(w, -h + notch)
    .lineTo(w, h - notch)
    .lineTo(w - notch, h - notch)
    .lineTo(w - notch, h)
    .lineTo(-w + notch, h)
    .lineTo(-w + notch, h - notch)
    .lineTo(-w, h - notch)
    .lineTo(-w, -h + notch)
    .lineTo(-w + notch, -h + notch)
    .closePath();
}

const notchedCard = defineShape({
  id: 'notched-card',
  label: 'Notched Card',
  category: 'ui',
  parameterSchema: {
    width: { kind: 'number', min: 0.2, max: 3, step: 0.05, default: 1.6, rebuild: true },
    height: { kind: 'number', min: 0.2, max: 3, step: 0.05, default: 1.1, rebuild: true },
    depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.18, rebuild: true },
    notch: { kind: 'number', min: 0.01, max: 0.5, step: 0.01, default: 0.1, rebuild: true },
    bevel: { kind: 'number', min: 0, max: 0.2, step: 0.01, default: 0.03, rebuild: true },
  },
  defaultParameters: { width: 1.6, height: 1.1, depth: 0.18, notch: 0.1, bevel: 0.03 },
  create(params, ctx) {
    const notch = Math.max(0.001, Math.min(params.notch, params.width / 2 - 0.001, params.height / 2 - 0.001));
    const bevel = Math.max(0, Math.min(params.bevel, params.width / 4, params.height / 4, params.depth / 2));
    const geometry = new THREE.ExtrudeGeometry(makeNotchedCardShape(params.width, params.height, notch), {
      depth: params.depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      steps: 1,
    });
    geometry.center();
    ctx.registry.track(geometry);
    return geometry;
  },
});

const torus = defineShape({
  id: 'torus',
  label: 'Torus',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 1.5, step: 0.05, default: 0.8, rebuild: true },
    tube: { kind: 'number', min: 0.05, max: 0.6, step: 0.05, default: 0.3, rebuild: true },
    radialSegments: { kind: 'number', min: 6, max: 32, step: 1, default: 16, rebuild: true },
  },
  defaultParameters: { radius: 0.8, tube: 0.3, radialSegments: 16 },
  create(params, ctx) {
    const geometry = new THREE.TorusGeometry(params.radius, params.tube, params.radialSegments, 32);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const icosahedron = defineShape({
  id: 'icosahedron',
  label: 'Icosahedron',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 2, step: 0.05, default: 1, rebuild: true },
    detail: { kind: 'number', min: 0, max: 3, step: 1, default: 0, rebuild: true },
  },
  defaultParameters: { radius: 1, detail: 0 },
  create(params, ctx) {
    const geometry = new THREE.IcosahedronGeometry(params.radius, params.detail);
    ctx.registry.track(geometry);
    return geometry;
  },
});

/** Deterministic hash-noise (blueprint deviation from SimplexNoise per roadmap M1
 * advice: zero extra module-resolution risk, and a pure hash is trivially
 * deterministic — same params always produce the same geometry, required for
 * embed-code reproducibility). 3D value-noise via smoothed integer-lattice hash. */
function hash3(x: number, y: number, z: number): number {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
}
function valueNoise3(x: number, y: number, z: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = x - x0, fy = y - y0, fz = z - z0;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  let acc = 0;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
        acc += w * hash3(x0 + dx, y0 + dy, z0 + dz);
      }
    }
  }
  return acc;
}

const softBlob = defineShape({
  id: 'soft-blob',
  label: 'Soft Blob',
  category: 'organic',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 2, step: 0.05, default: 1, rebuild: true },
    detail: { kind: 'number', min: 2, max: 6, step: 1, default: 4, rebuild: true },
    strength: { kind: 'number', min: 0, max: 0.6, step: 0.02, default: 0.25, rebuild: true },
    frequency: { kind: 'number', min: 0.5, max: 4, step: 0.1, default: 1.6, rebuild: true },
  },
  defaultParameters: { radius: 1, detail: 4, strength: 0.25, frequency: 1.6 },
  create(params, ctx) {
    const geometry = new THREE.IcosahedronGeometry(params.radius, params.detail);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const n = valueNoise3(v.x * params.frequency * 3, v.y * params.frequency * 3, v.z * params.frequency * 3);
      const displaced = params.radius + (n - 0.5) * 2 * params.strength;
      v.multiplyScalar(displaced);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    ctx.registry.track(geometry);
    return geometry;
  },
});

const capsule = defineShape({
  id: 'capsule',
  label: 'Capsule',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.1, max: 1, step: 0.05, default: 0.4, rebuild: true },
    length: { kind: 'number', min: 0.1, max: 2, step: 0.05, default: 0.8, rebuild: true },
    radialSegments: { kind: 'number', min: 4, max: 32, step: 1, default: 16, rebuild: true },
  },
  defaultParameters: { radius: 0.4, length: 0.8, radialSegments: 16 },
  create(params, ctx) {
    const geometry = new THREE.CapsuleGeometry(params.radius, params.length, 6, params.radialSegments);
    ctx.registry.track(geometry);
    return geometry;
  },
});

// A faceted icosahedron, not a cut stone — `diamond` below is the real brilliant
// cut. The label says so; the `id` stays `gem` because presets reference it and
// serialized compositions are keyed by id.
const gem = defineShape({
  id: 'gem',
  label: 'Faceted Gem',
  category: 'faceted',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 2, step: 0.05, default: 1, rebuild: true },
    facets: { kind: 'number', min: 0, max: 2, step: 1, default: 0, rebuild: true },
  },
  defaultParameters: { radius: 1, facets: 0 },
  create(params, ctx) {
    const geometry = new THREE.IcosahedronGeometry(params.radius, params.facets);
    // Flat facets: de-index so each triangle owns its own vertices, then recompute
    // per-face normals — this is the shape-side half of "faceted look" (material's
    // flatShading alone won't facet a shared-vertex geometry).
    const nonIndexed = geometry.toNonIndexed();
    nonIndexed.computeVertexNormals();
    geometry.dispose();
    ctx.registry.track(nonIndexed);
    return nonIndexed;
  },
});

const knot = defineShape({
  id: 'knot',
  label: 'Torus Knot',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 1.5, step: 0.05, default: 0.7, rebuild: true },
    tube: { kind: 'number', min: 0.05, max: 0.4, step: 0.02, default: 0.2, rebuild: true },
    p: { kind: 'number', min: 1, max: 8, step: 1, default: 2, rebuild: true },
    q: { kind: 'number', min: 1, max: 8, step: 1, default: 3, rebuild: true },
  },
  defaultParameters: { radius: 0.7, tube: 0.2, p: 2, q: 3 },
  create(params, ctx) {
    const geometry = new THREE.TorusKnotGeometry(params.radius, params.tube, 128, 16, params.p, params.q);
    ctx.registry.track(geometry);
    return geometry;
  },
});

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private turns: number, private radius: number, private height: number) {
    super();
  }
  getPoint(t: number, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const angle = t * Math.PI * 2 * this.turns;
    return target.set(Math.cos(angle) * this.radius, (t - 0.5) * this.height, Math.sin(angle) * this.radius);
  }
}

const spiral = defineShape({
  id: 'spiral',
  label: 'Spiral',
  category: 'parametric',
  parameterSchema: {
    turns: { kind: 'number', min: 1, max: 8, step: 0.5, default: 3, rebuild: true },
    radius: { kind: 'number', min: 0.2, max: 1.2, step: 0.05, default: 0.6, rebuild: true },
    height: { kind: 'number', min: 0.5, max: 3, step: 0.1, default: 1.6, rebuild: true },
    tube: { kind: 'number', min: 0.02, max: 0.3, step: 0.01, default: 0.08, rebuild: true },
  },
  defaultParameters: { turns: 3, radius: 0.6, height: 1.6, tube: 0.08 },
  create(params, ctx) {
    const curve = new HelixCurve(params.turns, params.radius, params.height);
    const geometry = new THREE.TubeGeometry(curve, Math.max(32, Math.round(params.turns * 24)), params.tube, 8, false);
    ctx.registry.track(geometry);
    return geometry;
  },
});

function makeStarShape(points: number, outerRadius: number, innerRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

const star = defineShape({
  id: 'star',
  label: 'Star',
  category: 'extruded',
  parameterSchema: {
    points: { kind: 'number', min: 3, max: 12, step: 1, default: 5, rebuild: true },
    outerRadius: { kind: 'number', min: 0.3, max: 1.5, step: 0.05, default: 1, rebuild: true },
    innerRadius: { kind: 'number', min: 0.1, max: 1, step: 0.05, default: 0.45, rebuild: true },
    depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.3, rebuild: true },
    bevelEnabled: { kind: 'boolean', default: true, rebuild: true },
  },
  defaultParameters: { points: 5, outerRadius: 1, innerRadius: 0.45, depth: 0.3, bevelEnabled: true },
  create(params, ctx) {
    const shape = makeStarShape(params.points, params.outerRadius, params.innerRadius);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: params.depth,
      bevelEnabled: params.bevelEnabled,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      steps: 1,
    });
    geometry.center();
    ctx.registry.track(geometry);
    return geometry;
  },
});

function makeHeartShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -2.5;
  const y = -5;
  shape.moveTo(x + 2.5, y + 2.5);
  shape.bezierCurveTo(x + 2.5, y + 2.5, x + 2, y, x, y);
  shape.bezierCurveTo(x - 3, y, x - 3, y + 3.5, x - 3, y + 3.5);
  shape.bezierCurveTo(x - 3, y + 5.5, x - 1.5, y + 7.7, x + 2.5, y + 9.5);
  shape.bezierCurveTo(x + 6, y + 7.7, x + 8, y + 4.5, x + 8, y + 3.5);
  shape.bezierCurveTo(x + 8, y + 3.5, x + 8, y, x + 5, y);
  shape.bezierCurveTo(x + 3.5, y, x + 2.5, y + 2.5, x + 2.5, y + 2.5);
  return shape;
}

function makeArrowShape(): THREE.Shape {
  return new THREE.Shape()
    .moveTo(-0.9, -0.28)
    .lineTo(0.1, -0.28)
    .lineTo(0.1, -0.62)
    .lineTo(0.95, 0)
    .lineTo(0.1, 0.62)
    .lineTo(0.1, 0.28)
    .lineTo(-0.9, 0.28)
    .closePath();
}

function extrudedSymbol(shape: THREE.Shape, params: { width: number; height: number; depth: number; roundness: number; bevelEnabled: boolean }, ctx: Parameters<NonNullable<typeof star['create']>>[1]): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: params.depth, bevelEnabled: params.bevelEnabled, bevelSize: params.roundness, bevelThickness: params.roundness, steps: 1 });
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  geometry.scale(params.width / Math.max(bounds.max.x - bounds.min.x, 1e-6), -params.height / Math.max(bounds.max.y - bounds.min.y, 1e-6), 1);
  geometry.center();
  ctx.registry.track(geometry);
  return geometry;
}

const heart = defineShape({
  id: 'heart', label: 'Heart', category: 'symbol', parameterSchema: { width: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.5, rebuild: true }, height: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.3, rebuild: true }, depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.4, rebuild: true }, roundness: { kind: 'number', min: 0, max: 0.25, step: 0.005, default: 0.12, rebuild: true }, bevelEnabled: { kind: 'boolean', default: true, rebuild: true } },
  defaultParameters: { width: 1.5, height: 1.3, depth: 0.4, roundness: 0.12, bevelEnabled: true },
  create(params, ctx) {
    const sourceWidth = 11;
    const sourceHeight = 9.5;
    const scale = Math.min(params.width / sourceWidth, params.height / sourceHeight);
    const bevel = Math.min(params.roundness / scale, 0.12);
    const geometry = new THREE.ExtrudeGeometry(makeHeartShape(), {
      curveSegments: 24,
      steps: 2,
      depth: params.depth / scale,
      bevelEnabled: params.bevelEnabled,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
    });
    geometry.scale(scale, -scale, scale);
    geometry.center();
    ctx.registry.track(geometry);
    return geometry;
  },
});

const plus = defineShape({
  id: 'plus', label: 'Plus', category: 'symbol', parameterSchema: { width: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.4, rebuild: true }, height: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.4, rebuild: true }, depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.3, rebuild: true }, roundness: { kind: 'number', min: 0, max: 0.15, step: 0.005, default: 0.03, rebuild: true }, bevelEnabled: { kind: 'boolean', default: true, rebuild: true } },
  defaultParameters: { width: 1.4, height: 1.4, depth: 0.3, roundness: 0.03, bevelEnabled: true },
  create(params, ctx) { return extrudedSymbol(makeCrossShape(0.5, 1.6), params, ctx); },
});

const arrow = defineShape({
  id: 'arrow', label: 'Arrow', category: 'symbol', parameterSchema: { width: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.8, rebuild: true }, height: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 0.9, rebuild: true }, depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.3, rebuild: true }, roundness: { kind: 'number', min: 0, max: 0.15, step: 0.005, default: 0.03, rebuild: true }, bevelEnabled: { kind: 'boolean', default: true, rebuild: true } },
  defaultParameters: { width: 1.8, height: 0.9, depth: 0.3, roundness: 0.03, bevelEnabled: true },
  create(params, ctx) { return extrudedSymbol(makeArrowShape(), params, ctx); },
});

function makeFallbackGlyphShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.85, 0, Math.PI * 2, false);
  for (const x of [-0.28, 0.28]) {
    const eye = new THREE.Path();
    eye.absarc(x, 0.22, 0.1, 0, Math.PI * 2, false);
    shape.holes.push(eye);
  }
  const mouth = new THREE.Path();
  mouth.absarc(0, -0.05, 0.4, Math.PI * 0.18, Math.PI * 0.82, false);
  shape.holes.push(mouth);
  return shape;
}

function makeSparkleShape(): THREE.Shape {
  return makeStarShape(4, 1, 0.18);
}

const sparkle = defineShape({
  id: 'sparkle', label: 'Sparkle', category: 'emoji symbol', parameterSchema: { width: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.4, rebuild: true }, height: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.4, rebuild: true }, depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.3, rebuild: true }, roundness: { kind: 'number', min: 0, max: 0.15, step: 0.005, default: 0.03, rebuild: true }, bevelEnabled: { kind: 'boolean', default: true, rebuild: true } },
  defaultParameters: { width: 1.4, height: 1.4, depth: 0.3, roundness: 0.03, bevelEnabled: true },
  create(params, ctx) { return extrudedSymbol(makeSparkleShape(), params, ctx); },
});

const cone = defineShape({
  id: 'cone',
  label: 'Cone',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.2, max: 1.5, step: 0.05, default: 0.8, rebuild: true },
    height: { kind: 'number', min: 0.3, max: 3, step: 0.05, default: 1.4, rebuild: true },
    radialSegments: { kind: 'number', min: 3, max: 32, step: 1, default: 24, rebuild: true },
  },
  defaultParameters: { radius: 0.8, height: 1.4, radialSegments: 24 },
  create(params, ctx) {
    const geometry = new THREE.ConeGeometry(params.radius, params.height, params.radialSegments);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const cylinder = defineShape({
  id: 'cylinder',
  label: 'Cylinder',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.2, max: 1.5, step: 0.05, default: 0.7, rebuild: true },
    height: { kind: 'number', min: 0.3, max: 3, step: 0.05, default: 1.4, rebuild: true },
    radialSegments: { kind: 'number', min: 3, max: 32, step: 1, default: 24, rebuild: true },
  },
  defaultParameters: { radius: 0.7, height: 1.4, radialSegments: 24 },
  create(params, ctx) {
    const geometry = new THREE.CylinderGeometry(params.radius, params.radius, params.height, params.radialSegments);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const octahedron = defineShape({
  id: 'octahedron',
  label: 'Octahedron',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 2, step: 0.05, default: 1, rebuild: true },
    detail: { kind: 'number', min: 0, max: 3, step: 1, default: 0, rebuild: true },
  },
  defaultParameters: { radius: 1, detail: 0 },
  create(params, ctx) {
    const geometry = new THREE.OctahedronGeometry(params.radius, params.detail);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const dodecahedron = defineShape({
  id: 'dodecahedron',
  label: 'Dodecahedron',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 2, step: 0.05, default: 1, rebuild: true },
    detail: { kind: 'number', min: 0, max: 2, step: 1, default: 0, rebuild: true },
  },
  defaultParameters: { radius: 1, detail: 0 },
  create(params, ctx) {
    const geometry = new THREE.DodecahedronGeometry(params.radius, params.detail);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const tetrahedron = defineShape({
  id: 'tetrahedron',
  label: 'Tetrahedron',
  category: 'primitive',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 2, step: 0.05, default: 1.1, rebuild: true },
    detail: { kind: 'number', min: 0, max: 2, step: 1, default: 0, rebuild: true },
  },
  defaultParameters: { radius: 1.1, detail: 0 },
  create(params, ctx) {
    const geometry = new THREE.TetrahedronGeometry(params.radius, params.detail);
    ctx.registry.track(geometry);
    return geometry;
  },
});

function makeRingShape(outerRadius: number, innerRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

const ring = defineShape({
  id: 'ring',
  label: 'Ring',
  category: 'extruded',
  parameterSchema: {
    outerRadius: { kind: 'number', min: 0.4, max: 1.5, step: 0.05, default: 1, rebuild: true },
    innerRadius: { kind: 'number', min: 0.1, max: 1.2, step: 0.05, default: 0.6, rebuild: true },
    depth: { kind: 'number', min: 0.05, max: 0.8, step: 0.05, default: 0.25, rebuild: true },
    bevelEnabled: { kind: 'boolean', default: true, rebuild: true },
  },
  defaultParameters: { outerRadius: 1, innerRadius: 0.6, depth: 0.25, bevelEnabled: true },
  create(params, ctx) {
    const shape = makeRingShape(params.outerRadius, params.innerRadius);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: params.depth,
      bevelEnabled: params.bevelEnabled,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      steps: 1,
      curveSegments: 32,
    });
    geometry.center();
    ctx.registry.track(geometry);
    return geometry;
  },
});

function makeCrossShape(armWidth: number, armLength: number): THREE.Shape {
  const w = armWidth / 2;
  const l = armLength / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -l);
  shape.lineTo(w, -l);
  shape.lineTo(w, -w);
  shape.lineTo(l, -w);
  shape.lineTo(l, w);
  shape.lineTo(w, w);
  shape.lineTo(w, l);
  shape.lineTo(-w, l);
  shape.lineTo(-w, w);
  shape.lineTo(-l, w);
  shape.lineTo(-l, -w);
  shape.lineTo(-w, -w);
  shape.closePath();
  return shape;
}

const cross = defineShape({
  id: 'cross',
  label: 'Cross',
  category: 'extruded',
  parameterSchema: {
    armWidth: { kind: 'number', min: 0.2, max: 1, step: 0.05, default: 0.5, rebuild: true },
    armLength: { kind: 'number', min: 0.6, max: 2.5, step: 0.05, default: 1.6, rebuild: true },
    depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.3, rebuild: true },
    bevelEnabled: { kind: 'boolean', default: true, rebuild: true },
  },
  defaultParameters: { armWidth: 0.5, armLength: 1.6, depth: 0.3, bevelEnabled: true },
  create(params, ctx) {
    const shape = makeCrossShape(params.armWidth, params.armLength);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: params.depth,
      bevelEnabled: params.bevelEnabled,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      steps: 1,
    });
    geometry.center();
    ctx.registry.track(geometry);
    return geometry;
  },
});

const pyramid = defineShape({
  id: 'pyramid',
  label: 'Pyramid',
  category: 'faceted',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 1.8, step: 0.05, default: 1, rebuild: true },
    height: { kind: 'number', min: 0.3, max: 2.6, step: 0.05, default: 1.6, rebuild: true },
    sides: { kind: 'number', min: 3, max: 8, step: 1, default: 4, rebuild: true },
  },
  defaultParameters: { radius: 1, height: 1.6, sides: 4 },
  create(params, ctx) {
    const geometry = new THREE.ConeGeometry(params.radius, params.height, params.sides);
    ctx.registry.track(geometry);
    return geometry;
  },
});

// --- designed solids -------------------------------------------------------
//
// The shapes above are math primitives, rounded boxes or 2D-profile extrusions.
// These are built facet by facet from a named face list, because the thing that
// makes a diamond read as a diamond (rather than as a lumpy sphere) is the
// *pattern* of its facets, not just its silhouette.
//
// Two shared decisions, both deliberate:
//
// 1. `THREE.ConvexGeometry` looks like the obvious tool and is not usable here.
//    In three r185 it walks each hull face's half-edge loop and pushes every
//    vertex with no triangulation, so any face with more than three edges comes
//    out as garbage; and `ConvexHull` silently discards points that sit within
//    tolerance of an existing face plane, which is exactly what a brilliant
//    cut's coplanar table corners and star points do. An explicit face list has
//    no tolerance behaviour at all.
// 2. Faces are emitted as a triangle soup and de-indexed by construction, so
//    `computeVertexNormals()` gives one flat normal per triangle. That is the
//    shape-side half of a faceted look — the same reason `gem` calls
//    `toNonIndexed()` (a material's `flatShading` alone cannot facet a
//    shared-vertex geometry).

type Tri = [THREE.Vector3, THREE.Vector3, THREE.Vector3];

/** Splits a planar quad `a-b-c-d` (in order around its rim) into two triangles. */
function quad(out: Tri[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3): void {
  out.push([a, b, c], [a, c, d]);
}

/** Point at `radius` from the Y axis, at height `y`, azimuth `angle`. */
function polar(radius: number, y: number, angle: number): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}

/**
 * Builds a non-indexed, flat-shaded geometry from a triangle soup, flipping any
 * triangle whose winding faces inward.
 *
 * Both solids below are convex with the origin strictly inside, so every face
 * plane satisfies `normal · point > 0` for the outward normal — which makes
 * "does this triangle's normal point away from the origin?" an exact test, not
 * a heuristic. That in turn means the face lists can be written in whatever
 * order reads clearest without tracking winding by hand, which is where
 * hand-built geometry usually goes wrong (a back-facing facet is invisible
 * under `side: FrontSide`, so it shows up as a hole, not as a wrong colour).
 */
function facetedGeometry(triangles: Tri[]): THREE.BufferGeometry {
  const positions = new Float32Array(triangles.length * 9);
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  let i = 0;
  for (const [a, b, c] of triangles) {
    normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    const flip = normal.dot(centroid) < 0;
    const second = flip ? c : b;
    const third = flip ? b : c;
    positions[i++] = a.x; positions[i++] = a.y; positions[i++] = a.z;
    positions[i++] = second.x; positions[i++] = second.y; positions[i++] = second.z;
    positions[i++] = third.x; positions[i++] = third.y; positions[i++] = third.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A real round brilliant: 1 table + 8 bezels + 8 stars + 16 upper girdle halves
 * + 8 pavilion mains + 16 lower girdle halves = the canonical 57 facets, plus a
 * 16-sided girdle band, and a pointed culet (modern ideal cuts have no culet
 * facet). Built at girdle radius 1 and scaled afterwards so the proportions are
 * scale-invariant.
 *
 * Gemmology quotes every proportion as a percentage of the girdle *diameter*,
 * which is how the parameters below are expressed and why each one is doubled
 * on the way in. Defaults are the modern ideal cut: 55% table, 16.2% crown,
 * 43.1% pavilion, 3% girdle.
 *
 * The one piece of real geometry here is where the star points go. A star point
 * is the intersection of two adjacent bezel planes, so rather than guessing its
 * height it is solved for: given the bezel plane through the table edge and the
 * girdle (symmetric about its own meridian, so its normal lies in that
 * meridian), a point at azimuth ±22.5° off that meridian and radius `starR`
 * lies on the plane at exactly the height below. Doing it this way keeps every
 * bezel kite perfectly planar, which is what makes the crown catch light in
 * eight clean panels instead of eight subtly-warped ones. The pavilion mains
 * are solved identically against the culet.
 */
function brilliantTriangles(p: {
  tableRatio: number;
  crownHeight: number;
  pavilionDepth: number;
  girdleThickness: number;
  starRatio: number;
  lowerRatio: number;
}): Tri[] {
  const SECTORS = 8;
  const step = (Math.PI * 2) / SECTORS;
  const half = step / 2;
  const cosHalf = Math.cos(half);

  const yGirdleTop = p.girdleThickness / 2;
  const yGirdleBottom = -yGirdleTop;
  const yTable = yGirdleTop + p.crownHeight;
  const yCulet = yGirdleBottom - p.pavilionDepth;

  // Bezel plane through (tableRatio, yTable) and (1, yGirdleTop) in meridian
  // (radius, height) coordinates; `bezelSlope` is |dy|/dr, the normal's ratio.
  const bezelSlope = (yTable - yGirdleTop) / (1 - p.tableRatio);
  const starR = p.tableRatio + p.starRatio * (1 - p.tableRatio);
  const yStar = yTable - bezelSlope * (starR * cosHalf - p.tableRatio);

  // Pavilion main plane through the culet (0, yCulet) and (1, yGirdleBottom).
  // `lowerRatio` is how far the lower girdle halves reach from the girdle
  // toward the culet — the gemmological "lower half" percentage, ~75-80% on an
  // ideal cut — so their tips sit at radius 1 - lowerRatio. (Using lowerRatio
  // as the radius directly inverted the control: the default 0.77 reached only
  // 23% of the way, and a larger value gave shorter facets.)
  const pavR = 1 - p.lowerRatio;
  const yPav = yCulet + p.pavilionDepth * pavR * cosHalf;

  const A: THREE.Vector3[] = []; // table corners
  const S: THREE.Vector3[] = []; // star / upper-girdle junctions
  const Bt: THREE.Vector3[] = []; // girdle top, under a bezel
  const Mt: THREE.Vector3[] = []; // girdle top, between bezels
  const Bb: THREE.Vector3[] = [];
  const Mb: THREE.Vector3[] = [];
  const P: THREE.Vector3[] = []; // pavilion / lower-girdle junctions
  for (let k = 0; k < SECTORS; k++) {
    const a = k * step;
    A.push(polar(p.tableRatio, yTable, a));
    S.push(polar(starR, yStar, a + half));
    Bt.push(polar(1, yGirdleTop, a));
    Mt.push(polar(1, yGirdleTop, a + half));
    Bb.push(polar(1, yGirdleBottom, a));
    Mb.push(polar(1, yGirdleBottom, a + half));
    P.push(polar(pavR, yPav, a + half));
  }
  const culet = new THREE.Vector3(0, yCulet, 0);
  const next = (k: number) => (k + 1) % SECTORS;
  const prev = (k: number) => (k + SECTORS - 1) % SECTORS;

  const tris: Tri[] = [];
  for (let k = 1; k < SECTORS - 1; k++) tris.push([A[0], A[k], A[k + 1]]); // table
  for (let k = 0; k < SECTORS; k++) {
    tris.push([A[k], A[next(k)], S[k]]); // star facet
    quad(tris, A[k], S[k], Bt[k], S[prev(k)]); // bezel kite
    tris.push([S[k], Bt[k], Mt[k]], [S[k], Mt[k], Bt[next(k)]]); // upper girdle halves
    quad(tris, Bt[k], Mt[k], Mb[k], Bb[k]); // girdle band
    quad(tris, Mt[k], Bt[next(k)], Bb[next(k)], Mb[k]);
    tris.push([P[k], Bb[k], Mb[k]], [P[k], Mb[k], Bb[next(k)]]); // lower girdle halves
    quad(tris, Bb[k], P[k], culet, P[prev(k)]); // pavilion main
  }
  return tris;
}

const diamond = defineShape({
  id: 'diamond',
  label: 'Diamond',
  category: 'faceted',
  parameterSchema: {
    radius: { kind: 'number', min: 0.3, max: 2, step: 0.05, default: 1, rebuild: true },
    // All four below are percentages of the girdle diameter, as gemmology quotes
    // them. Ranges bracket real cut grades rather than being arbitrary.
    tablePercent: { kind: 'number', min: 0.4, max: 0.7, step: 0.01, default: 0.55, rebuild: true },
    crownPercent: { kind: 'number', min: 0.08, max: 0.26, step: 0.002, default: 0.162, rebuild: true },
    pavilionPercent: { kind: 'number', min: 0.3, max: 0.58, step: 0.002, default: 0.431, rebuild: true },
    girdlePercent: { kind: 'number', min: 0.005, max: 0.09, step: 0.005, default: 0.03, rebuild: true },
    // How far the star facets reach from the table edge toward the girdle, and
    // how far the lower girdle facets reach from the girdle toward the culet.
    starLength: { kind: 'number', min: 0.3, max: 0.8, step: 0.01, default: 0.55, rebuild: true },
    lowerHalves: { kind: 'number', min: 0.55, max: 0.9, step: 0.01, default: 0.77, rebuild: true },
  },
  defaultParameters: {
    radius: 1,
    tablePercent: 0.55,
    crownPercent: 0.162,
    pavilionPercent: 0.431,
    girdlePercent: 0.03,
    starLength: 0.55,
    lowerHalves: 0.77,
  },
  create(params, ctx) {
    const geometry = facetedGeometry(
      brilliantTriangles({
        tableRatio: params.tablePercent,
        // Diameter percentages -> girdle-radius units.
        crownHeight: params.crownPercent * 2,
        pavilionDepth: params.pavilionPercent * 2,
        girdleThickness: params.girdlePercent * 2,
        starRatio: params.starLength,
        lowerRatio: params.lowerHalves,
      }),
    );
    geometry.scale(params.radius, params.radius, params.radius);
    ctx.registry.track(geometry);
    return geometry;
  },
});

/**
 * Chamfered box: 6 rectangles + 12 edge chamfers + 8 corner chamfers = 26 faces.
 * Every vertex is a permutation of the half-extents with one axis at full size
 * and the other two pulled in by the chamfer, which is the exact vertex set of a
 * chamfered box — so the faces are planar by construction and the chamfer is
 * uniform on all twelve edges.
 *
 * That last part is why this is no longer an `ExtrudeGeometry` with
 * `bevelEnabled`: extrusion bevels only the front and back rims and leaves the
 * four side edges sharp, so the shape read "bevelled" from one axis and
 * hard-edged from the other two.
 */
function chamferedBoxTriangles(hx: number, hy: number, hz: number, chamfer: number): Tri[] {
  const h = [hx, hy, hz];
  // Keep every reduced extent strictly positive — the parameter ranges allow a
  // chamfer larger than the smallest half-extent, which would invert the solid.
  const c = Math.min(chamfer, 0.98 * Math.min(hx, hy, hz));
  // Coordinates are assembled per-axis so the three families of faces can be
  // written once and rotated, rather than three times by hand. In the frame for
  // family `a`: `major` is axis a, `u` is axis (a+1)%3, `v` is axis (a+2)%3.
  const axis = (a: number, major: number, u: number, v: number): THREE.Vector3 =>
    a === 0 ? new THREE.Vector3(major, u, v) : a === 1 ? new THREE.Vector3(v, major, u) : new THREE.Vector3(u, v, major);

  const tris: Tri[] = [];
  for (let a = 0; a < 3; a++) {
    const H = h[a];
    const U = h[(a + 1) % 3] - c;
    const V = h[(a + 2) % 3] - c;
    for (const sa of [1, -1]) {
      // Rectangular face on axis `a`.
      quad(tris, axis(a, sa * H, U, V), axis(a, sa * H, -U, V), axis(a, sa * H, -U, -V), axis(a, sa * H, U, -V));
      for (const sb of [1, -1]) {
        // Edge chamfer between face (a, sa) and its `u`-axis neighbour
        // (axis (a+1)%3, sign sb) — written entirely in the `a` frame, which is
        // why each axis pair is visited exactly once across the outer loop.
        quad(
          tris,
          axis(a, sa * H, sb * U, V),
          axis(a, sa * H, sb * U, -V),
          axis(a, sa * (H - c), sb * (U + c), -V),
          axis(a, sa * (H - c), sb * (U + c), V),
        );
      }
    }
  }
  // Corner chamfers: one triangle per octant, through the three vertices that
  // carry the full half-extent on a different axis each.
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      for (const sz of [1, -1]) {
        tris.push([
          new THREE.Vector3(sx * hx, sy * (hy - c), sz * (hz - c)),
          new THREE.Vector3(sx * (hx - c), sy * hy, sz * (hz - c)),
          new THREE.Vector3(sx * (hx - c), sy * (hy - c), sz * hz),
        ]);
      }
    }
  }
  return tris;
}

const bevelledBox = defineShape({
  id: 'bevelled-box',
  label: 'Bevelled Box',
  category: 'faceted',
  parameterSchema: {
    size: { kind: 'number', min: 0.4, max: 2.4, step: 0.05, default: 1.2, rebuild: true },
    depth: { kind: 'number', min: 0.2, max: 2.4, step: 0.05, default: 1.2, rebuild: true },
    bevel: { kind: 'number', min: 0, max: 0.2, step: 0.01, default: 0.08, rebuild: true },
  },
  defaultParameters: { size: 1.2, depth: 1.2, bevel: 0.08 },
  create(params, ctx) {
    // At zero chamfer the 12 edge faces and 8 corner faces collapse to
    // degenerate triangles, whose normals are undefined — fall back to the
    // primitive the shape is a chamfered version of.
    const geometry = params.bevel <= 0
      ? new THREE.BoxGeometry(params.size, params.size, params.depth)
      : facetedGeometry(chamferedBoxTriangles(params.size / 2, params.size / 2, params.depth / 2, params.bevel));
    ctx.registry.track(geometry);
    return geometry;
  },
});

const spring = defineShape({
  id: 'spring',
  label: 'Spring',
  category: 'parametric',
  parameterSchema: {
    turns: { kind: 'number', min: 2, max: 12, step: 0.5, default: 6, rebuild: true },
    radius: { kind: 'number', min: 0.2, max: 1.1, step: 0.05, default: 0.55, rebuild: true },
    height: { kind: 'number', min: 0.6, max: 3, step: 0.1, default: 1.8, rebuild: true },
    tube: { kind: 'number', min: 0.02, max: 0.2, step: 0.01, default: 0.08, rebuild: true },
  },
  defaultParameters: { turns: 6, radius: 0.55, height: 1.8, tube: 0.08 },
  create(params, ctx) {
    const curve = new HelixCurve(params.turns, params.radius, params.height);
    const geometry = new THREE.TubeGeometry(curve, Math.max(48, Math.round(params.turns * 24)), params.tube, 8, false);
    ctx.registry.track(geometry);
    return geometry;
  },
});

/** Where the profile pulls in to the neck, as a fraction of total height. */
const NECK_HEIGHT = 0.8;

const VASE_DEFAULTS = { height: 1.8, baseRadius: 0.3, bellyRadius: 0.74, neckRadius: 0.22, bellyHeight: 0.34, lipFlare: 1.35, radialSegments: 32 };

/**
 * Resolves vase parameters defensively. Homepage presets are stored in
 * localStorage and applied without going through `deserializeComposition`, so
 * a vase saved against the original `{height, radius, neck}` schema reaches
 * `create()` as-is — and used to build NaN geometry. The old keys map onto the
 * new ones and anything missing falls back to its default. (The validated
 * import path still rejects the old key set, deliberately: that check is exact
 * by design.) `bellyHeight` is also kept inside the range that leaves the four
 * control heights strictly increasing, which the profile below relies on.
 */
function vaseParams(raw: Record<string, unknown>): typeof VASE_DEFAULTS {
  const num = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
    return undefined;
  };
  return {
    height: Math.max(0.1, num('height') ?? VASE_DEFAULTS.height),
    baseRadius: num('baseRadius') ?? VASE_DEFAULTS.baseRadius,
    bellyRadius: num('bellyRadius', 'radius') ?? VASE_DEFAULTS.bellyRadius,
    neckRadius: num('neckRadius', 'neck') ?? VASE_DEFAULTS.neckRadius,
    bellyHeight: Math.min(NECK_HEIGHT - 0.05, Math.max(0.05, num('bellyHeight') ?? VASE_DEFAULTS.bellyHeight)),
    lipFlare: num('lipFlare') ?? VASE_DEFAULTS.lipFlare,
    radialSegments: Math.max(3, Math.round(num('radialSegments') ?? VASE_DEFAULTS.radialSegments)),
  };
}

/**
 * The vessel's profile as radius *as a function of height*: a cubic Hermite
 * through the control points, with finite-difference tangents (Catmull-Rom for
 * uneven spacing), sampled at evenly spaced heights.
 *
 * Writing it as r(y) is what guarantees it cannot fold. `LatheGeometry` joins
 * profile rings in order, so the heights must only ever go up. The previous
 * version ran a 2D spline through the same points, and with the belly low
 * (`bellyHeight` 0.1) its height dipped between samples, folding a strip of
 * surface back on itself with its facing reversed. Radius can still overshoot
 * below zero between a wide belly and a narrow neck, so it is clamped.
 */
function monotoneProfile(ys: number[], rs: number[], samples: number): THREE.Vector2[] {
  const last = ys.length - 1;
  const tangents = ys.map((_, i) => {
    const a = Math.max(0, i - 1);
    const b = Math.min(last, i + 1);
    return (rs[b] - rs[a]) / (ys[b] - ys[a]);
  });
  const points: THREE.Vector2[] = [];
  for (let s = 0; s <= samples; s++) {
    const y = (ys[last] * s) / samples;
    let k = 0;
    while (k < last - 1 && y > ys[k + 1]) k++;
    const span = ys[k + 1] - ys[k];
    const t = (y - ys[k]) / span;
    const t2 = t * t;
    const t3 = t2 * t;
    const r =
      (2 * t3 - 3 * t2 + 1) * rs[k] +
      (t3 - 2 * t2 + t) * span * tangents[k] +
      (-2 * t3 + 3 * t2) * rs[k + 1] +
      (t3 - t2) * span * tangents[k + 1];
    points.push(new THREE.Vector2(Math.max(r, 1e-4), y));
  }
  return points;
}

/**
 * A lathed vessel — vase, bottle, lamp or goblet from one definition, which is
 * the point: a profile curve gives a whole family of designed silhouettes for
 * the cost of one shape.
 *
 * The profile is flat base -> curved body -> flat top, so the solid is closed.
 * That matters because Forma's materials render `side: FrontSide`: the previous
 * fixed profile ended at the mouth without returning to the axis, so the vase
 * was open and showed through to its own inside back wall.
 *
 * The body runs through four control heights, not three. Belly straight to lip
 * gives a smooth onion with no neck at all — the shoulder point at `NECK_HEIGHT`
 * is what makes the profile turn in and then run up, which is the difference
 * between a vase and a balloon. `lipFlare` then opens the mouth back out, and is
 * most of what separates a goblet from a bottle.
 */
const vase = defineShape({
  id: 'vase',
  label: 'Vase',
  category: 'lathe',
  parameterSchema: {
    height: { kind: 'number', min: 0.6, max: 3, step: 0.05, default: 1.8, rebuild: true },
    baseRadius: { kind: 'number', min: 0.08, max: 1, step: 0.02, default: 0.3, rebuild: true },
    bellyRadius: { kind: 'number', min: 0.15, max: 1.2, step: 0.02, default: 0.74, rebuild: true },
    neckRadius: { kind: 'number', min: 0.04, max: 0.9, step: 0.02, default: 0.22, rebuild: true },
    bellyHeight: { kind: 'number', min: 0.1, max: 0.7, step: 0.02, default: 0.34, rebuild: true },
    // Mouth radius as a multiple of the neck: 1 is a straight bottle, above that
    // a vase or goblet, below it a closed flask.
    lipFlare: { kind: 'number', min: 0.6, max: 2.2, step: 0.05, default: 1.35, rebuild: true },
    radialSegments: { kind: 'number', min: 6, max: 48, step: 1, default: 32, rebuild: true },
  },
  defaultParameters: VASE_DEFAULTS,
  create(params, ctx) {
    const p = vaseParams(params as Record<string, unknown>);
    const h = p.height;
    const body = monotoneProfile(
      [0, p.bellyHeight * h, NECK_HEIGHT * h, h],
      [p.baseRadius, p.bellyRadius, p.neckRadius, p.neckRadius * p.lipFlare],
      48,
    );
    const profile = [new THREE.Vector2(0, 0), ...body, new THREE.Vector2(0, h)];
    const geometry = new THREE.LatheGeometry(profile, p.radialSegments);
    geometry.center();
    ctx.registry.track(geometry);
    return geometry;
  },
});

// --- apparel -----------------------------------------------------------------
//
// The TerryTime merch as parametric shapes. The hoodie and polo outlines are
// the traced front silhouettes the Blender pipeline built the store's GLBs
// from — the actual base meshes in terrytime-assets.blend (Hoodie_Body, 33
// points; Polo_Body, 19), normalised to unit height. Those GLBs are flat
// cutouts only 3-8 cm deep, so an extrusion loses nothing, and the garments
// stay tiny, synchronous and embeddable like every other shape — no model
// loading, no hosting. The cap is the one genuinely 3D piece, so it is
// designed rather than traced, sized to the proportions of the store's dad hat.
// The logo is deliberately not part of these shapes; SVG Import covers it.

/** Traced silhouettes as flat [x0, y0, x1, y1, …], unit height, centred. */
const HOODIE_OUTLINE = [
  -0.3668, -0.5, -0.3668, -0.4402, -0.3886, -0.4185, -0.3886, -0.2337, -0.3342, 0.2174, -0.2908, 0.3207, -0.2636, 0.3424,
  -0.1821, 0.3696, -0.1495, 0.462, -0.1114, 0.4891, -0.0734, 0.4946, -0.0679, 0.5, 0.0516, 0.5, 0.1332, 0.4728, 0.1712, 0.375,
  0.2473, 0.3478, 0.2908, 0.2989, 0.3234, 0.2011, 0.3832, -0.1902, 0.3886, -0.3804, 0.3832, -0.413, 0.356, -0.4456, 0.3614,
  -0.4946, 0.2853, -0.5, 0.2636, -0.4456, 0.2527, -0.4674, 0.2255, -0.4837, -0.2255, -0.4783, -0.2418, -0.4674, -0.2418, -0.413,
  -0.2527, -0.4076, -0.2799, -0.4294, -0.2853, -0.5,
];
const POLO_OUTLINE = [
  0.2431, -0.5, -0.2431, -0.4945, -0.232, -0.2735, -0.2376, -0.0083, -0.3757, 0.0249, -0.3757, 0.0414, -0.2707, 0.3564, -0.2155,
  0.395, -0.0994, 0.4337, -0.0718, 0.4724, -0.0387, 0.4945, -0.0332, 0.5, 0.0774, 0.4889, 0.1271, 0.4282, 0.2431, 0.3895,
  0.2928, 0.3564, 0.3757, 0.0801, 0.3757, 0.0414, 0.2376, -0.0028,
];

/**
 * Chaikin corner-cutting on a closed polygon: each edge PQ becomes the points
 * ¾P + ¼Q and ¼P + ¾Q. It is the curve analogue of the Subdivision Surface
 * modifier the Blender pipeline ran on these garments — it rounds corners but,
 * unlike a spline through the same points, never overshoots them, which matters
 * at sharp cuffs, hems and the notch between sleeve and body.
 */
function chaikin(points: THREE.Vector2[], iterations: number): THREE.Vector2[] {
  let pts = points;
  for (let i = 0; i < iterations; i++) {
    const next: THREE.Vector2[] = [];
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      const q = pts[(k + 1) % pts.length];
      next.push(new THREE.Vector2().lerpVectors(p, q, 0.25), new THREE.Vector2().lerpVectors(p, q, 0.75));
    }
    pts = next;
  }
  return pts;
}

function garmentGeometry(outline: number[], p: { size: number; thickness: number; roundness: number; smoothing: number }): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  for (let i = 0; i < outline.length; i += 2) points.push(new THREE.Vector2(outline[i], outline[i + 1]));
  const shape = new THREE.Shape(chaikin(points, Math.round(p.smoothing)));
  // A rounded edge rather than a hard one is what keeps a flat cutout from
  // reading as a cookie cutter. It is capped in absolute terms because the
  // bevel grows outward and the outlines have narrow features — cuffs, the gap
  // between sleeve and hem — where a wide one would fold through itself.
  const bevel = Math.min(p.roundness * p.thickness * 0.5, 0.02);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: p.thickness,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.6,
    bevelSegments: 4,
    steps: 1,
  });
  geometry.center();
  geometry.scale(p.size, p.size, p.size);
  return geometry;
}

const GARMENT_SCHEMA = {
  size: { kind: 'number', min: 0.5, max: 2.5, step: 0.05, default: 1.6, rebuild: true },
  // Real garments are ~1.6% as thick as they are tall, which reads as paper at
  // playground scale; the default is a chunkier "3D icon" slab.
  thickness: { kind: 'number', min: 0.02, max: 0.4, step: 0.01, default: 0.1, rebuild: true },
  roundness: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.8, rebuild: true },
  // Chaikin passes over the traced outline: 0 is the raw trace, corners and all.
  smoothing: { kind: 'number', min: 0, max: 3, step: 1, default: 2, rebuild: true },
} as const;
// `as const` like the schema, the same pattern as the environments' shared
// lighting schema: ParamsOf narrows each param to its default's literal type.
const GARMENT_DEFAULTS = { size: 1.6, thickness: 0.1, roundness: 0.8, smoothing: 2 } as const;

const hoodie = defineShape({
  id: 'hoodie',
  label: 'Hoodie',
  category: 'apparel',
  parameterSchema: GARMENT_SCHEMA,
  defaultParameters: GARMENT_DEFAULTS,
  create(params, ctx) {
    const geometry = garmentGeometry(HOODIE_OUTLINE, params);
    ctx.registry.track(geometry);
    return geometry;
  },
});

const polo = defineShape({
  id: 'polo',
  label: 'Polo Shirt',
  category: 'apparel',
  parameterSchema: GARMENT_SCHEMA,
  defaultParameters: GARMENT_DEFAULTS,
  create(params, ctx) {
    const geometry = garmentGeometry(POLO_OUTLINE, params);
    ctx.registry.track(geometry);
    return geometry;
  },
});

/**
 * A six-panel dad hat, built at crown radius 1: a lathed hollow crown with
 * seam grooves, a pre-curved brim, and a button. The crown follows the store's
 * hat (0.94 as tall as its radius); its brim reached 0.74 of the radius past
 * the crown and hung steeply, and the defaults sit a little shorter and
 * flatter, which read better as a standalone object.
 *
 * The brim is the only hand-built surface in the file that is not convex, so
 * the diamond's "outward means away from the origin" winding test does not
 * apply. Its winding is set by construction instead, face by face, and the
 * geometry sweep proves it: every directed edge used exactly once with its
 * reverse present, and positive volume for each connected part.
 */
function capGeometry(p: { crownHeight: number; brimLength: number; brimTilt: number; brimCurve: number; seams: number }): THREE.BufferGeometry {
  // --- crown: a hollow shell. One closed cross-section — down the inside from
  // the apex, across the rim, up the outside — lathed around the axis. Traced
  // in that order, the inner surface faces the cavity and the outer one faces
  // out, so the shell is a closed solid with every face pointing out of the
  // fabric. (A solid dome has a flat disc across its base, which from below
  // reads as a bowl, not a cap.)
  const SHELL = 0.04;
  const STEPS = 24;
  const dome = (scale: number, t: number) =>
    new THREE.Vector2(t >= Math.PI / 2 ? 0 : Math.cos(t) * scale, p.crownHeight * Math.sin(t) * scale);
  const profile: THREE.Vector2[] = [];
  for (let i = STEPS; i >= 0; i--) profile.push(dome(1 - SHELL, (i / STEPS) * (Math.PI / 2)));
  for (let i = 0; i <= STEPS; i++) profile.push(dome(1, (i / STEPS) * (Math.PI / 2)));
  // LatheGeometry's seam falls at phiStart: put it at the back, out of sight.
  const crown = new THREE.LatheGeometry(profile, 96, Math.PI);
  // Six panels meet in seams running from the rim to the button, one at front
  // centre. Pull the surface in along each seam; the pull scales with radius,
  // so the grooves converge to nothing at the button.
  const depth = 0.035 * p.seams;
  if (depth > 0) {
    const PANEL = Math.PI / 3;
    const pos = crown.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const along = ((Math.atan2(x, z) % PANEL) + PANEL) % PANEL;
      const toSeam = Math.min(along, PANEL - along);
      const pull = 1 - depth * Math.exp(-((toSeam / 0.05) ** 2));
      pos.setX(i, x * pull);
      pos.setZ(i, z * pull);
    }
  }
  crown.computeVertexNormals();

  // --- button
  const button = new THREE.SphereGeometry(0.075, 16, 8);
  button.scale(1, 0.55, 1);
  button.translate(0, p.crownHeight, 0);

  // --- brim: a thin slab over the front arc, tilted down and pre-curved.
  const U = 36;
  const V = 10;
  const ARC = 1.05; // half-width of the front arc, radians (~60°) — wider reads as a sun visor
  const THICK = 0.035;
  const tilt = Math.tan(THREE.MathUtils.degToRad(p.brimTilt));
  const positions: number[] = [];
  const index: number[] = [];
  const vertex = (v: THREE.Vector3): number => {
    positions.push(v.x, v.y, v.z);
    return positions.length / 3 - 1;
  };
  // Grid of the brim's top surface. It starts just inside the crown (0.97) so
  // the seam grooves at the rim never open a gap between crown and brim, and
  // its reach never quite falls to zero at the ends (0.87 below) so the side
  // faces are real quads rather than slivers.
  const top: THREE.Vector3[][] = [];
  for (let i = 0; i <= U; i++) {
    const phi = ARC * ((2 * i) / U - 1);
    const reach = p.brimLength * Math.cos((phi / ARC) * (Math.PI / 2) * 0.87) + 0.03;
    const row: THREE.Vector3[] = [];
    for (let j = 0; j <= V; j++) {
      const v = j / V;
      const rho = 0.97 + v * reach;
      // Tilt drops the brim as it reaches forward; the curve bends it down
      // across its width, like a pre-curved visor. Both vanish at the inner
      // edge so the brim stays attached to the rim.
      const lateral = Math.sin(phi) * rho;
      const drop = Math.max(0, rho - 1) * tilt + p.brimCurve * 0.45 * lateral ** 2 * v;
      row.push(new THREE.Vector3(Math.sin(phi) * rho, -drop, Math.cos(phi) * rho));
    }
    top.push(row);
  }
  const below = (v: THREE.Vector3) => new THREE.Vector3(v.x, v.y - THICK, v.z);
  // Each part gets its own vertices so the slab's edges stay crisp.
  const surface = (rows: THREE.Vector3[][], flip: boolean): void => {
    const ids = rows.map((row) => row.map(vertex));
    for (let i = 0; i < U; i++) {
      for (let j = 0; j < V; j++) {
        const a = ids[i][j], b = ids[i + 1][j], c = ids[i][j + 1], d = ids[i + 1][j + 1];
        // Along i runs +x, along j runs outward: (a, c, b) faces +y.
        if (flip) index.push(a, b, c, c, b, d);
        else index.push(a, c, b, c, d, b);
      }
    }
  };
  surface(top, false);
  surface(top.map((row) => row.map(below)), true);
  const strip = (pairs: [THREE.Vector3, THREE.Vector3][], flip: boolean): void => {
    const ids = pairs.map(([t, b]) => [vertex(t), vertex(b)]);
    for (let k = 0; k < ids.length - 1; k++) {
      const [t0, b0] = ids[k];
      const [t1, b1] = ids[k + 1];
      if (flip) index.push(t0, t1, b0, t1, b1, b0);
      else index.push(t0, b0, t1, t1, b0, b1);
    }
  };
  strip(top.map((row) => [row[V], below(row[V])]), false); // outer edge
  strip(top.map((row) => [row[0], below(row[0])]), true); // inner edge
  // The ends face away from the brim along the arc: -u at the left, +u at the
  // right, which is why they take opposite windings.
  strip(top[0].map((v) => [v, below(v)]), false); // left end
  strip(top[U].map((v) => [v, below(v)]), true); // right end
  const brim = new THREE.BufferGeometry();
  brim.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  brim.setIndex(index);
  brim.computeVertexNormals();

  // One mesh, one material: merge the three solids. Their UVs differ (and the
  // brim has none), so drop them all — the runtime's ensureGeometryUVs gives
  // the merged result a consistent set.
  const parts = [crown, button, brim];
  for (const part of parts) part.deleteAttribute('uv');
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('cap: parts could not be merged');
  // Posed three-quarter and slightly from above, the classic product shot.
  // Head-on, a brim pointing at the camera turns the cap into a bell; the flat
  // garments face front instead, because their silhouettes are the point.
  merged.rotateY(0.65);
  merged.rotateX(0.22);
  merged.center();
  return merged;
}

const cap = defineShape({
  id: 'cap',
  label: 'Cap',
  category: 'apparel',
  parameterSchema: {
    size: { kind: 'number', min: 0.5, max: 2.5, step: 0.05, default: 1.4, rebuild: true },
    // Crown height as a multiple of its radius.
    crownHeight: { kind: 'number', min: 0.5, max: 1.3, step: 0.02, default: 0.94, rebuild: true },
    // How far the brim reaches past the crown, as a multiple of its radius.
    brimLength: { kind: 'number', min: 0.3, max: 1.5, step: 0.05, default: 0.7, rebuild: true },
    brimTilt: { kind: 'number', min: 0, max: 40, step: 1, default: 8, rebuild: true },
    brimCurve: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.6, rebuild: true },
    seams: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.5, rebuild: true },
  },
  defaultParameters: { size: 1.4, crownHeight: 0.94, brimLength: 0.7, brimTilt: 8, brimCurve: 0.6, seams: 0.5 },
  create(params, ctx) {
    const geometry = capGeometry(params);
    geometry.scale(params.size, params.size, params.size);
    ctx.registry.track(geometry);
    return geometry;
  },
});

// Small built-in glyph (a rounded square with a notch) — the svg-extrude default. Kept
// tiny and always-valid so a freshly-selected shape (before any file is imported) and
// the leak-check's defaultParameters pass never hit an empty/garbage SVG path.
const DEFAULT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<path d="M20 20 L80 20 L80 60 L60 60 L60 80 L20 80 Z" /></svg>';

function createSvgGeometry(params: { svg: string; size: number; depth: number; bevelEnabled: boolean; bevelSize: number; curveSegments: number }, ctx: Parameters<NonNullable<typeof star['create']>>[1], fallback: string): THREE.BufferGeometry {
  let geometry: THREE.BufferGeometry;
  try {
    const loader = new SVGLoader();
    const parsed = loader.parse(params.svg);
    const shapes = parsed.paths.flatMap((path) => path.toShapes());
    if (shapes.length === 0) throw new Error('no paths parsed from SVG');
    geometry = new THREE.ExtrudeGeometry(shapes, { depth: params.depth, bevelEnabled: params.bevelEnabled, bevelSize: params.bevelSize, bevelThickness: params.bevelSize, curveSegments: params.curveSegments, steps: 1 });
  } catch {
    try {
      const parsed = new SVGLoader().parse(fallback);
      geometry = new THREE.ExtrudeGeometry(parsed.paths.flatMap((path) => path.toShapes()), { depth: params.depth, bevelEnabled: params.bevelEnabled, bevelSize: params.bevelSize, bevelThickness: params.bevelSize, curveSegments: params.curveSegments, steps: 1 });
    } catch {
      // ponytail: headless DOMParser fallback; browser path remains the real SVG extrusion.
      geometry = new THREE.ExtrudeGeometry(makeFallbackGlyphShape(), { depth: params.depth, bevelEnabled: params.bevelEnabled, bevelSize: params.bevelSize, bevelThickness: params.bevelSize, curveSegments: params.curveSegments, steps: 1 });
    }
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const scale = params.size / Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, 1e-6);
  geometry.scale(scale, -scale, scale);
  geometry.center();
  geometry.computeVertexNormals();
  ctx.registry.track(geometry);
  return geometry;
}

const svgExtrude = defineShape({
  id: 'svg-extrude',
  label: 'SVG Import',
  category: 'svg',
  parameterSchema: {
    svg: { kind: 'string', default: DEFAULT_SVG, rebuild: true, multiline: true },
    size: { kind: 'number', min: 0.5, max: 3, step: 0.1, default: 1.5, rebuild: true },
    depth: { kind: 'number', min: 0.02, max: 1, step: 0.02, default: 0.25, rebuild: true },
    bevelEnabled: { kind: 'boolean', default: true, rebuild: true },
    bevelSize: { kind: 'number', min: 0, max: 0.15, step: 0.005, default: 0.02, rebuild: true },
    curveSegments: { kind: 'number', min: 4, max: 32, step: 1, default: 12, rebuild: true },
  },
  defaultParameters: { svg: DEFAULT_SVG, size: 1.5, depth: 0.25, bevelEnabled: true, bevelSize: 0.02, curveSegments: 12 },
  create(params, ctx) { return createSvgGeometry(params, ctx, DEFAULT_SVG); },
});

export function registerShapes(): void {
  for (const def of [
    sphere,
    box,
    pill,
    card,
    badge,
    tab,
    notchedCard,
    torus,
    icosahedron,
    softBlob,
    capsule,
    gem,
    knot,
    spiral,
    star,
    heart,
    plus,
    arrow,
    sparkle,
    cone,
    cylinder,
    octahedron,
    dodecahedron,
    tetrahedron,
    ring,
    cross,
    pyramid,
    diamond,
    bevelledBox,
    spring,
    vase,
    hoodie,
    polo,
    cap,
    svgExtrude,
  ]) {
    if (!shapeRegistry.get(def.id)) shapeRegistry.register(def);
  }
}

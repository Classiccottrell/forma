import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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

const gem = defineShape({
  id: 'gem',
  label: 'Gem',
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

function makeHeartShape(size: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, -size * 0.9);
  shape.bezierCurveTo(-size * 1.2, -size * 0.15, -size * 0.9, size * 0.8, 0, size * 1.25);
  shape.bezierCurveTo(size * 0.9, size * 0.8, size * 1.2, -size * 0.15, 0, -size * 0.9);
  shape.closePath();
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
  geometry.scale(params.width / Math.max(bounds.max.x - bounds.min.x, 1e-6), params.height / Math.max(bounds.max.y - bounds.min.y, 1e-6), 1);
  geometry.center();
  ctx.registry.track(geometry);
  return geometry;
}

const heart = defineShape({
  id: 'heart', label: 'Heart', category: 'symbol', parameterSchema: { width: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.4, rebuild: true }, height: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.4, rebuild: true }, depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.3, rebuild: true }, roundness: { kind: 'number', min: 0, max: 0.15, step: 0.005, default: 0.03, rebuild: true }, bevelEnabled: { kind: 'boolean', default: true, rebuild: true } },
  defaultParameters: { width: 1.4, height: 1.4, depth: 0.3, roundness: 0.03, bevelEnabled: true },
  create(params, ctx) { return extrudedSymbol(makeHeartShape(0.8), params, ctx); },
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

function makeSmileyShape(): THREE.Shape {
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

const smiley = defineShape({
  id: 'smiley', label: 'Smiley', category: 'emoji symbol', parameterSchema: { width: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.5, rebuild: true }, height: { kind: 'number', min: 0.4, max: 2.5, step: 0.05, default: 1.5, rebuild: true }, depth: { kind: 'number', min: 0.05, max: 1, step: 0.05, default: 0.3, rebuild: true }, roundness: { kind: 'number', min: 0, max: 0.15, step: 0.005, default: 0.03, rebuild: true }, bevelEnabled: { kind: 'boolean', default: true, rebuild: true } },
  defaultParameters: { width: 1.5, height: 1.5, depth: 0.3, roundness: 0.03, bevelEnabled: true },
  create(params, ctx) { return extrudedSymbol(makeSmileyShape(), params, ctx); },
});

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

const bevelledBox = defineShape({
  id: 'bevelled-box',
  label: 'Bevelled Box',
  category: 'extruded',
  parameterSchema: {
    size: { kind: 'number', min: 0.4, max: 2.4, step: 0.05, default: 1.2, rebuild: true },
    depth: { kind: 'number', min: 0.2, max: 2.4, step: 0.05, default: 1.2, rebuild: true },
    bevel: { kind: 'number', min: 0, max: 0.2, step: 0.01, default: 0.08, rebuild: true },
  },
  defaultParameters: { size: 1.2, depth: 1.2, bevel: 0.08 },
  create(params, ctx) {
    const half = params.size / 2;
    const shape = new THREE.Shape()
      .moveTo(-half, -half)
      .lineTo(half, -half)
      .lineTo(half, half)
      .lineTo(-half, half)
      .closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: params.depth,
      bevelEnabled: params.bevel > 0,
      bevelSize: params.bevel,
      bevelThickness: params.bevel,
      steps: 1,
    });
    geometry.center();
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

const vase = defineShape({
  id: 'vase',
  label: 'Vase',
  category: 'lathe',
  parameterSchema: {
    height: { kind: 'number', min: 0.6, max: 2.8, step: 0.1, default: 1.8, rebuild: true },
    radius: { kind: 'number', min: 0.3, max: 1.2, step: 0.05, default: 0.75, rebuild: true },
    neck: { kind: 'number', min: 0.15, max: 0.7, step: 0.05, default: 0.35, rebuild: true },
  },
  defaultParameters: { height: 1.8, radius: 0.75, neck: 0.35 },
  create(params, ctx) {
    const half = params.height / 2;
    const points = [
      new THREE.Vector2(0.18, -half),
      new THREE.Vector2(params.radius * 0.82, -half + params.height * 0.08),
      new THREE.Vector2(params.radius, -half + params.height * 0.35),
      new THREE.Vector2(params.radius * 0.78, half - params.height * 0.2),
      new THREE.Vector2(params.neck, half - params.height * 0.08),
      new THREE.Vector2(params.neck, half),
    ];
    const geometry = new THREE.LatheGeometry(points, 48);
    geometry.center();
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
      geometry = new THREE.ExtrudeGeometry(makeSmileyShape(), { depth: params.depth, bevelEnabled: params.bevelEnabled, bevelSize: params.bevelSize, bevelThickness: params.bevelSize, curveSegments: params.curveSegments, steps: 1 });
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
    smiley,
    sparkle,
    cone,
    cylinder,
    octahedron,
    dodecahedron,
    tetrahedron,
    ring,
    cross,
    pyramid,
    bevelledBox,
    spring,
    vase,
    svgExtrude,
  ]) {
    if (!shapeRegistry.get(def.id)) shapeRegistry.register(def);
  }
}

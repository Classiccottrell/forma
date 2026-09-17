import * as THREE from 'three';
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
  },
  defaultParameters: { size: 1, segments: 1 },
  create(params, ctx) {
    const geometry = new THREE.BoxGeometry(params.size, params.size, params.size, params.segments, params.segments, params.segments);
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

export function registerShapes(): void {
  for (const def of [sphere, box, torus, icosahedron, softBlob, capsule, gem, knot, spiral, star]) {
    if (!shapeRegistry.get(def.id)) shapeRegistry.register(def);
  }
}

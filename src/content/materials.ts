import * as THREE from 'three';
import { defineMaterial, materialRegistry } from '../registry/instances.js';

// Four material definitions (blueprint §5.2). Every `update()` mutates the live
// material in place (no disposeAll) — proves requirement 3's allocation-avoidance
// path for hot color/roughness/metalness/transmission tweaks.

/** 3- or 5-step gradient DataTexture for MeshToonMaterial (blueprint deviation: a
 * CanvasTexture would need a 2D canvas context, unreliable under happy-dom; a
 * DataTexture is GL/DOM-independent and keeps the leak-check runnable headless). */
function makeGradientTexture(steps: 3 | 5): THREE.DataTexture {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round((255 * (i + 1)) / steps);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const matte = defineMaterial({
  id: 'matte',
  label: 'Matte',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#7f78ff', rebuild: false },
    roughness: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.9, rebuild: false },
  },
  defaultParameters: { color: '#7f78ff', roughness: 0.9 },
  create(params, ctx) {
    const material = new THREE.MeshStandardMaterial({ color: params.color, roughness: params.roughness, metalness: 0 });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshStandardMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});

const metal = defineMaterial({
  id: 'metal',
  label: 'Metal',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#cfd6e6', rebuild: false },
    metalness: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.9, rebuild: false },
  },
  defaultParameters: { color: '#cfd6e6', metalness: 0.9 },
  create(params, ctx) {
    const material = new THREE.MeshStandardMaterial({ color: params.color, metalness: params.metalness, roughness: 0.3 });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshStandardMaterial;
    m.color.set(params.color);
    m.metalness = params.metalness;
    m.needsUpdate = true;
  },
});

const glass = defineMaterial({
  id: 'glass',
  label: 'Glass',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#ffffff', rebuild: false },
    transmission: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.9, rebuild: false },
  },
  defaultParameters: { color: '#ffffff', transmission: 0.9 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({
      color: params.color,
      transmission: params.transmission,
      roughness: 0.05,
      thickness: 0.5,
    });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.transmission = params.transmission;
    m.needsUpdate = true;
  },
});

const toon = defineMaterial({
  id: 'toon',
  label: 'Toon',
  category: 'stylized',
  parameterSchema: {
    color: { kind: 'color', default: '#ff8f5a', rebuild: false },
    gradientMapSteps: { kind: 'enum', options: ['3', '5'] as const, default: '3', rebuild: true },
  },
  defaultParameters: { color: '#ff8f5a', gradientMapSteps: '3' },
  create(params, ctx) {
    const steps = params.gradientMapSteps === '5' ? 5 : 3;
    const gradientMap = makeGradientTexture(steps);
    ctx.registry.track(gradientMap);
    const material = new THREE.MeshToonMaterial({ color: params.color, gradientMap });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshToonMaterial;
    m.color.set(params.color);
    m.needsUpdate = true;
  },
});

const chrome = defineMaterial({
  id: 'chrome',
  label: 'Chrome',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#e8ebf2', rebuild: false },
    roughness: { kind: 'number', min: 0, max: 0.3, step: 0.01, default: 0.05, rebuild: false },
  },
  defaultParameters: { color: '#e8ebf2', roughness: 0.05 },
  create(params, ctx) {
    const material = new THREE.MeshStandardMaterial({ color: params.color, metalness: 1, roughness: params.roughness });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshStandardMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});

const frostedGlass = defineMaterial({
  id: 'frosted-glass',
  label: 'Frosted Glass',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#ffffff', rebuild: false },
    transmission: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.9, rebuild: false },
    roughness: { kind: 'number', min: 0.1, max: 0.8, step: 0.05, default: 0.4, rebuild: false },
  },
  defaultParameters: { color: '#ffffff', transmission: 0.9, roughness: 0.4 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({
      color: params.color,
      transmission: params.transmission,
      roughness: params.roughness,
      thickness: 0.6,
    });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.transmission = params.transmission;
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});

const ice = defineMaterial({
  id: 'ice',
  label: 'Ice',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#cdeeff', rebuild: false },
    transmission: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.85, rebuild: false },
    iridescence: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.4, rebuild: false },
  },
  defaultParameters: { color: '#cdeeff', transmission: 0.85, iridescence: 0.4 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({
      color: params.color,
      transmission: params.transmission,
      roughness: 0.15,
      thickness: 0.5,
      iridescence: params.iridescence,
    });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.transmission = params.transmission;
    m.iridescence = params.iridescence;
    m.needsUpdate = true;
  },
});

/** Procedural checkerboard-weave normal map (same DataTexture technique as the toon
 * gradient above / gradient-sky background — no external texture assets). */
function makeCarbonNormalTexture(): THREE.DataTexture {
  const size = 8;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const weave = (x + y) % 2 === 0 ? 1 : -1;
      const i = (y * size + x) * 4;
      data[i + 0] = 128 + weave * 20; // nx
      data[i + 1] = 128 + weave * 20; // ny
      data[i + 2] = 255; // nz (mostly-flat)
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.needsUpdate = true;
  return tex;
}

const carbon = defineMaterial({
  id: 'carbon',
  label: 'Carbon Fiber',
  category: 'stylized',
  parameterSchema: {
    color: { kind: 'color', default: '#14161c', rebuild: false },
    roughness: { kind: 'number', min: 0.1, max: 0.9, step: 0.05, default: 0.4, rebuild: false },
  },
  defaultParameters: { color: '#14161c', roughness: 0.4 },
  create(params, ctx) {
    const normalMap = makeCarbonNormalTexture();
    ctx.registry.track(normalMap);
    const material = new THREE.MeshStandardMaterial({
      color: params.color,
      roughness: params.roughness,
      metalness: 0.2,
      normalMap,
    });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshStandardMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});

export function registerMaterials(): void {
  for (const def of [matte, metal, glass, toon, chrome, frostedGlass, ice, carbon]) {
    if (!materialRegistry.get(def.id)) materialRegistry.register(def);
  }
}

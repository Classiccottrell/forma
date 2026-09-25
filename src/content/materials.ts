import * as THREE from 'three';
import { defineMaterial, materialRegistry } from '../registry/instances.js';

// Registry-native material definitions (blueprint §5.2). Every `update()` mutates the live
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

const velvet = defineMaterial({
  id: 'velvet',
  label: 'Velvet',
  category: 'stylized',
  parameterSchema: {
    color: { kind: 'color', default: '#8a1c3a', rebuild: false },
    roughness: { kind: 'number', min: 0.5, max: 1, step: 0.05, default: 0.95, rebuild: false },
  },
  defaultParameters: { color: '#8a1c3a', roughness: 0.95 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({ color: params.color, roughness: params.roughness, metalness: 0, sheen: 1 });
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

const gold = defineMaterial({
  id: 'gold',
  label: 'Gold',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#d4af37', rebuild: false },
    roughness: { kind: 'number', min: 0, max: 0.5, step: 0.02, default: 0.2, rebuild: false },
  },
  defaultParameters: { color: '#d4af37', roughness: 0.2 },
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

const copper = defineMaterial({
  id: 'copper',
  label: 'Copper',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#b5643a', rebuild: false },
    roughness: { kind: 'number', min: 0, max: 0.6, step: 0.02, default: 0.3, rebuild: false },
  },
  defaultParameters: { color: '#b5643a', roughness: 0.3 },
  create(params, ctx) {
    const material = new THREE.MeshStandardMaterial({ color: params.color, metalness: 0.85, roughness: params.roughness });
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

const clay = defineMaterial({
  id: 'clay',
  label: 'Clay',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#c98a5e', rebuild: false },
    roughness: { kind: 'number', min: 0.4, max: 1, step: 0.05, default: 0.85, rebuild: false },
  },
  defaultParameters: { color: '#c98a5e', roughness: 0.85 },
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

const neonPlastic = defineMaterial({
  id: 'neon-plastic',
  label: 'Neon Plastic',
  category: 'stylized',
  parameterSchema: {
    color: { kind: 'color', default: '#39ff88', rebuild: false },
    emissiveIntensity: { kind: 'number', min: 0, max: 3, step: 0.1, default: 1.2, rebuild: false },
  },
  defaultParameters: { color: '#39ff88', emissiveIntensity: 1.2 },
  create(params, ctx) {
    const material = new THREE.MeshStandardMaterial({
      color: params.color,
      emissive: new THREE.Color(params.color),
      emissiveIntensity: params.emissiveIntensity,
      roughness: 0.3,
      metalness: 0,
    });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshStandardMaterial;
    m.color.set(params.color);
    m.emissive.set(params.color);
    m.emissiveIntensity = params.emissiveIntensity;
    m.needsUpdate = true;
  },
});

const wireframe = defineMaterial({
  id: 'wireframe',
  label: 'Wireframe',
  category: 'stylized',
  parameterSchema: {
    color: { kind: 'color', default: '#7f78ff', rebuild: false },
  },
  defaultParameters: { color: '#7f78ff' },
  create(params, ctx) {
    const material = new THREE.MeshBasicMaterial({ color: params.color, wireframe: true });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshBasicMaterial;
    m.color.set(params.color);
    m.needsUpdate = true;
  },
});

const obsidian = defineMaterial({
  id: 'obsidian',
  label: 'Obsidian',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#0c0c12', rebuild: false },
    roughness: { kind: 'number', min: 0, max: 0.4, step: 0.02, default: 0.1, rebuild: false },
  },
  defaultParameters: { color: '#0c0c12', roughness: 0.1 },
  create(params, ctx) {
    const material = new THREE.MeshStandardMaterial({ color: params.color, roughness: params.roughness, metalness: 0.4 });
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

const plastic = defineMaterial({
  id: 'plastic',
  label: 'Plastic',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#4f8cff', rebuild: false },
    roughness: { kind: 'number', min: 0.1, max: 0.8, step: 0.05, default: 0.28, rebuild: false },
  },
  defaultParameters: { color: '#4f8cff', roughness: 0.28 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({ color: params.color, roughness: params.roughness, clearcoat: 0.35, clearcoatRoughness: 0.2 });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});

const ceramic = defineMaterial({
  id: 'ceramic',
  label: 'Chalk Ceramic',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#e7d7c8', rebuild: false },
    roughness: { kind: 'number', min: 0.55, max: 1, step: 0.05, default: 0.82, rebuild: false },
  },
  defaultParameters: { color: '#e7d7c8', roughness: 0.82 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({ color: params.color, roughness: params.roughness, sheen: 0.15, sheenColor: '#fff4e8' });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});

const holographic = defineMaterial({
  id: 'holographic',
  label: 'Holographic',
  category: 'stylized',
  parameterSchema: {
    color: { kind: 'color', default: '#d9e7ff', rebuild: false },
    iridescence: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.9, rebuild: false },
    roughness: { kind: 'number', min: 0, max: 0.5, step: 0.05, default: 0.16, rebuild: false },
  },
  defaultParameters: { color: '#d9e7ff', iridescence: 0.9, roughness: 0.16 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({
      color: params.color,
      roughness: params.roughness,
      metalness: 0.25,
      iridescence: params.iridescence,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [120, 640],
    });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.iridescence = params.iridescence;
    m.needsUpdate = true;
  },
});

const rubber = defineMaterial({
  id: 'rubber',
  label: 'Rubber',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#17191f', rebuild: false },
    roughness: { kind: 'number', min: 0.7, max: 1, step: 0.05, default: 0.92, rebuild: false },
  },
  defaultParameters: { color: '#17191f', roughness: 0.92 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({
      color: params.color,
      roughness: params.roughness,
      metalness: 0,
      specularIntensity: 0.22,
    });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});

const pearl = defineMaterial({
  id: 'pearl',
  label: 'Pearl',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#fff4ea', rebuild: false },
    iridescence: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.35, rebuild: false },
    roughness: { kind: 'number', min: 0.05, max: 0.5, step: 0.05, default: 0.18, rebuild: false },
  },
  defaultParameters: { color: '#fff4ea', iridescence: 0.35, roughness: 0.18 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial({
      color: params.color,
      roughness: params.roughness,
      metalness: 0,
      iridescence: params.iridescence,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [180, 520],
      sheen: 0.25,
      sheenColor: '#ffd9ed',
    });
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.iridescence = params.iridescence;
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});

const physicalStudio = defineMaterial({
  id: 'physical-studio',
  label: 'Physical Studio',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#d9e2f2', rebuild: false },
    roughness: { kind: 'number', min: 0, max: 1, step: 0.01, default: 0.28, rebuild: false },
    metalness: { kind: 'number', min: 0, max: 1, step: 0.01, default: 0.15, rebuild: false },
    clearcoat: { kind: 'number', min: 0, max: 1, step: 0.01, default: 0.2, rebuild: false },
    transmission: { kind: 'number', min: 0, max: 1, step: 0.01, default: 0, rebuild: false },
    thickness: { kind: 'number', min: 0, max: 5, step: 0.05, default: 0.5, rebuild: false },
    ior: { kind: 'number', min: 1, max: 2.5, step: 0.01, default: 1.5, rebuild: false },
    sheen: { kind: 'number', min: 0, max: 1, step: 0.01, default: 0.1, rebuild: false },
    iridescence: { kind: 'number', min: 0, max: 1, step: 0.01, default: 0, rebuild: false },
  },
  defaultParameters: { color: '#d9e2f2', roughness: 0.28, metalness: 0.15, clearcoat: 0.2, transmission: 0, thickness: 0.5, ior: 1.5, sheen: 0.1, iridescence: 0 },
  create(params, ctx) {
    const material = new THREE.MeshPhysicalMaterial(params);
    ctx.registry.track(material);
    return material;
  },
  update(material, params) {
    const m = material as THREE.MeshPhysicalMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.metalness = params.metalness;
    m.clearcoat = params.clearcoat;
    m.transmission = params.transmission;
    m.thickness = params.thickness;
    m.ior = params.ior;
    m.sheen = params.sheen;
    m.iridescence = params.iridescence;
    m.needsUpdate = true;
  },
});

export function registerMaterials(): void {
  for (const def of [
    matte,
    metal,
    glass,
    toon,
    chrome,
    frostedGlass,
    ice,
    carbon,
    velvet,
    gold,
    copper,
    clay,
    neonPlastic,
    wireframe,
    obsidian,
    physicalStudio,
    plastic,
    ceramic,
    holographic,
    rubber,
    pearl,
  ]) {
    if (!materialRegistry.get(def.id)) materialRegistry.register(def);
  }
}

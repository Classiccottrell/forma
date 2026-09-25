import * as THREE from 'three';
import { defineTexture, textureRegistry } from '../registry/instances.js';
import { texturePackCatalog } from './texturePacks.js';
import type { TextureHandle, TextureMapSet } from '../types.js';

function dataTexture(size: number, sample: (x: number, y: number) => number): THREE.DataTexture {
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) data[y * size + x] = sample(x, y);
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function isPbrMaterial(material: THREE.Material): material is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial;
}

function clearMaps(material: THREE.Material): void {
  if ('map' in material) material.map = null;
  if (isPbrMaterial(material)) {
    material.normalMap = null;
    material.roughnessMap = null;
  }
}

function textureHandle(texture: THREE.Texture | null, apply: (material: THREE.Material, texture: THREE.Texture | null) => void, applyPack?: TextureHandle['applyPack']): TextureHandle {
  let disposed = false;
  return {
    texture,
    apply(material) { if (!disposed) apply(material, texture); },
    applyPack(material, maps, intensity, scale) { if (!disposed) applyPack?.(material, maps, intensity, scale); },
    dispose() { disposed = true; },
  };
}

const none = defineTexture({
  id: 'none', label: 'None', category: 'none', parameterSchema: {}, defaultParameters: {},
  create() { return textureHandle(null, (material) => { clearMaps(material); material.needsUpdate = true; }); },
});

const checkerNormal = defineTexture({
  id: 'checker-normal', label: 'Checker Normal', category: 'normal',
  parameterSchema: { scale: { kind: 'number', min: 1, max: 16, step: 1, default: 4, rebuild: true }, strength: { kind: 'number', min: 0, max: 2, step: 0.05, default: 0.5, rebuild: false } },
  defaultParameters: { scale: 4, strength: 0.5 },
  create(params, ctx) {
    const texture = dataTexture(16, (x, y) => ((Math.floor(x / params.scale) + Math.floor(y / params.scale)) % 2 ? 255 : 0));
    ctx.registry.track(texture);
    let handle!: TextureHandle;
    handle = textureHandle(texture, (material, map) => {
      clearMaps(material);
      if (isPbrMaterial(material)) material.normalMap = map;
      const strength = checkerStrength.get(handle) ?? params.strength;
      if (isPbrMaterial(material)) material.normalScale.set(strength, strength);
      material.needsUpdate = true;
    });
    checkerStrength.set(handle, params.strength);
    return handle;
  },
  update(handle, params) {
    checkerStrength.set(handle, params.strength);
  },
});

const checkerStrength = new WeakMap<TextureHandle, number>();

const weaveRoughness = defineTexture({
  id: 'weave-roughness', label: 'Weave Roughness', category: 'roughness',
  parameterSchema: { scale: { kind: 'number', min: 1, max: 16, step: 1, default: 3, rebuild: true }, contrast: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.65, rebuild: false } },
  defaultParameters: { scale: 3, contrast: 0.65 },
  create(params, ctx) {
    const texture = dataTexture(16, (x, y) => {
      const stripe = (x % params.scale === 0 || y % params.scale === 0) ? 1 : 0;
      return Math.round(255 * (stripe ? params.contrast : 1 - params.contrast));
    });
    ctx.registry.track(texture);
    return textureHandle(texture, (material, map) => {
      clearMaps(material);
      if (isPbrMaterial(material)) material.roughnessMap = map;
      material.needsUpdate = true;
    });
  },
  update(handle, params) {
    const texture = handle.texture as THREE.DataTexture | null;
    const data = texture?.image?.data as Uint8Array | undefined;
    if (!texture || !data) return;
    const size = Math.sqrt(data.length);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const stripe = x % params.scale === 0 || y % params.scale === 0;
      data[y * size + x] = Math.round(255 * (stripe ? params.contrast : 1 - params.contrast));
    }
    texture.needsUpdate = true;
  },
});

function colorTexture(rgb: [number, number, number]): THREE.DataTexture {
  const data = new Uint8Array([...rgb, 255, ...rgb.map((v) => Math.min(255, v + 18)), 255]);
  const texture = new THREE.DataTexture(data, 2, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const packParams = new WeakMap<TextureHandle, { scale: number; intensity: number }>();

function packTexture(id: string, label: string, colors: [number, number, number]): ReturnType<typeof defineTexture> {
  const manifest = texturePackCatalog.find((entry) => entry.id === id);
  if (!manifest) throw new Error(`Missing texture pack catalog entry: ${id}`);
  return defineTexture({
    id, label, category: 'PBR pack', pack: manifest,
    parameterSchema: {
      scale: { kind: 'number', min: 1, max: 12, step: 1, default: 2, rebuild: false },
      intensity: { kind: 'number', min: 0, max: 2, step: 0.05, default: 1, rebuild: false },
    },
    defaultParameters: { scale: 2, intensity: 1 },
    create(params, ctx) {
      const maps: TextureMapSet = { color: colorTexture(colors), normal: dataTexture(16, (x, y) => ((x + y) % 2 ? 160 : 96)), roughness: dataTexture(16, (x, y) => ((x + y) % params.scale ? 220 : 120)) };
      for (const map of Object.values(maps)) ctx.registry.track(map!);
      const applyMaps = (material: THREE.Material, loaded: TextureMapSet, intensity: number, scale: number) => {
        const pbr = isPbrMaterial(material);
        clearMaps(material);
        if (id === 'linen-blue' && 'map' in material) material.map = loaded.color ?? null;
        if (pbr) {
          material.normalMap = loaded.normal ?? null;
          material.roughnessMap = loaded.roughness ?? null;
          material.normalScale.set(intensity, intensity);
        }
        const appliedMaps = pbr
          ? [id === 'linen-blue' ? loaded.color : undefined, loaded.normal, loaded.roughness]
          : [id === 'linen-blue' ? loaded.color : undefined];
        for (const map of appliedMaps) if (map) {
          map.wrapS = map.wrapT = THREE.RepeatWrapping;
          map.repeat.set(scale, scale);
          if (map === loaded.color) map.colorSpace = THREE.SRGBColorSpace;
          map.needsUpdate = true;
        }
        material.needsUpdate = true;
      };
      let handle!: TextureHandle;
      handle = textureHandle(maps.color!, (material) => {
        const current = packParams.get(handle)!;
        applyMaps(material, maps, manifest.defaultIntensity * current.intensity, current.scale);
      }, applyMaps);
      packParams.set(handle, { scale: Number(params.scale), intensity: Number(params.intensity) });
      return handle;
    },
    update(handle, params) {
      packParams.set(handle, { scale: Number(params.scale), intensity: Number(params.intensity) });
    },
  });
}

const localPacks = [
  packTexture('linen-blue', 'Linen Blue', [68, 104, 132]),
  packTexture('book-pattern', 'Book Pattern', [104, 82, 68]),
  packTexture('fine-grained-wood', 'Fine Grained Wood', [132, 94, 58]),
  packTexture('brushed-metal', 'Brushed Metal', [132, 138, 143]),
  packTexture('mineral-matte', 'Mineral Matte', [116, 110, 103]),
];

export function registerTextures(): void {
  for (const def of [none, checkerNormal, weaveRoughness, ...localPacks]) if (!textureRegistry.get(def.id)) textureRegistry.register(def);
}

import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { TexturePackLoader, resolveTextureUrl, textureRegistry } from '../src/index.js';
import { registerAllContent, texturePackCatalog } from '../src/content/index.js';

const manifest = { id: 'paper-fiber', source: 'https://example.test/paper', license: 'CC0', use: 'grain', color: 'paper/color.jpg', defaultIntensity: 0.2 } as const;

describe('texture pack delivery', () => {
  registerAllContent();

  it('catalogs the staged packs with all local maps', () => {
    for (const id of ['book-pattern', 'fine-grained-wood']) {
      const entry = texturePackCatalog.find((pack) => pack.id === id);
      expect(entry).toMatchObject({
        active: true,
        color: `${id}/color.jpg`,
        normal: `${id}/normal.jpg`,
        roughness: `${id}/roughness.jpg`,
      });
      expect(textureRegistry.get(id)).toBeDefined();
    }
  });

  it('resolves relative and absolute asset URLs', () => {
    expect(resolveTextureUrl('maps/color.jpg', 'https://assets.test/packs/')).toBe('https://assets.test/packs/maps/color.jpg');
    expect(resolveTextureUrl('https://cdn.test/color.jpg', 'https://assets.test/packs/')).toBe('https://cdn.test/color.jpg');
  });

  it('loads requested maps once and reuses the URL cache', async () => {
    const load = vi.spyOn(THREE.ImageLoader.prototype, 'load').mockImplementation((url, onLoad) => {
      onLoad?.(document.createElement('img'));
      return document.createElement('img');
    });
    const loader = new TexturePackLoader();
    const first = await loader.loadTexturePack(manifest, 'https://assets.test/packs/');
    const second = await loader.loadTexturePack(manifest, 'https://assets.test/packs/');
    expect(load).toHaveBeenCalledTimes(1);
    expect(first.color).toBe(second.color);
    first.dispose();
    second.dispose();
    load.mockRestore();
  });

  it('rejects malformed manifests before loading', () => {
    const loader = new TexturePackLoader();
    expect(() => loader.loadTexturePack({ ...manifest, defaultIntensity: -1 }, '/assets/')).toThrow(/defaultIntensity/);
    expect(() => loader.loadTexturePack({ ...manifest, normal: ' ' }, '/assets/')).toThrow(/normal/);
  });

  it('disposes cached textures on clear', async () => {
    const load = vi.spyOn(THREE.ImageLoader.prototype, 'load').mockImplementation((url, onLoad) => {
      onLoad?.(document.createElement('img'));
      return document.createElement('img');
    });
    const loader = new TexturePackLoader();
    const pack = await loader.loadTexturePack(manifest, 'https://assets.test/');
    const dispose = vi.spyOn(pack.color!, 'dispose');
    loader.clear();
    expect(dispose).toHaveBeenCalledOnce();
    load.mockRestore();
  });

  it.each(['book-pattern', 'fine-grained-wood', 'brushed-metal', 'mineral-matte'])('preserves authored base color for %s while applying supported PBR maps', (id) => {
    const texture = textureRegistry.require(id).create(textureRegistry.require(id).defaultParameters, { registry: { track: () => {} } } as never);
    const material = new THREE.MeshStandardMaterial({ color: '#123456' });
    const color = material.color.getHex();
    const maps = { color: new THREE.Texture(), normal: new THREE.Texture(), roughness: new THREE.Texture() };
    texture.applyPack?.(material, maps, 0.3, 2);
    expect(material.color.getHex()).toBe(color);
    expect(material.map).toBeNull();
    expect(material.normalMap).toBe(maps.normal);
    expect(material.roughnessMap).toBe(maps.roughness);
    material.dispose();
    texture.dispose();
  });
});

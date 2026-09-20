import * as THREE from 'three';
import type { TexturePackManifest, TexturePackMap } from '../types.js';

export interface LoadedTexturePack {
  manifest: TexturePackManifest;
  intensity: number;
  color?: THREE.Texture;
  normal?: THREE.Texture;
  roughness?: THREE.Texture;
  dispose(): void;
}

export interface TexturePackLoadOptions {
  signal?: AbortSignal;
}

interface CacheEntry {
  refs: number;
  disposed?: boolean;
  texture?: THREE.Texture;
  promise: Promise<THREE.Texture>;
  abort: () => void;
}

const mapNames: readonly TexturePackMap[] = ['color', 'normal', 'roughness'];

export function resolveTextureUrl(path: string, baseUrl: string): string {
  if (!path.trim()) throw new Error('Texture asset path must not be empty');
  try {
    return new URL(path, baseUrl).href;
  } catch {
    throw new Error(`Invalid texture base URL: ${baseUrl}`);
  }
}

export function assertTexturePackManifest(value: unknown): asserts value is TexturePackManifest {
  if (!value || typeof value !== 'object') throw new Error('Invalid texture pack manifest');
  const manifest = value as Partial<TexturePackManifest>;
  for (const key of ['id', 'source', 'license', 'use'] as const) {
    if (typeof manifest[key] !== 'string' || !manifest[key].trim()) throw new Error(`Invalid texture pack manifest: ${key}`);
  }
  if (typeof manifest.defaultIntensity !== 'number' || !Number.isFinite(manifest.defaultIntensity) || manifest.defaultIntensity < 0) {
    throw new Error('Invalid texture pack manifest: defaultIntensity');
  }
  for (const map of mapNames) if (manifest[map] !== undefined && (typeof manifest[map] !== 'string' || !manifest[map].trim())) {
    throw new Error(`Invalid texture pack manifest: ${map}`);
  }
}

export class TexturePackLoader {
  private readonly cache = new Map<string, CacheEntry>();

  loadTexturePack(manifest: TexturePackManifest, baseUrl: string, options: TexturePackLoadOptions = {}): Promise<LoadedTexturePack> {
    assertTexturePackManifest(manifest);
    const requested = mapNames.filter((map) => manifest[map]).map((map) => [map, resolveTextureUrl(manifest[map]!, baseUrl)] as const);
    const entries = requested.map(([map, url]) => [map, this.acquire(url)] as const);
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      for (const [, entry] of entries) this.release(entry);
    };
    const loaded = Promise.all(entries.map(async ([map, entry]) => [map, await this.awaitWithSignal(entry.promise, options.signal)] as const))
      .then((maps) => ({ manifest, intensity: manifest.defaultIntensity, ...Object.fromEntries(maps), dispose } as LoadedTexturePack));
    return loaded.catch((error) => { dispose(); throw error; });
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      entry.disposed = true;
      entry.abort();
      entry.texture?.dispose();
    }
    this.cache.clear();
  }

  private acquire(url: string): CacheEntry {
    const existing = this.cache.get(url);
    if (existing) { existing.refs++; return existing; }
    let request: HTMLImageElement | undefined;
    let resolveTexture!: (texture: THREE.Texture) => void;
    let rejectTexture!: (error: unknown) => void;
    const promise = new Promise<THREE.Texture>((resolve, reject) => { resolveTexture = resolve; rejectTexture = reject; });
    const entry: CacheEntry = { refs: 1, promise, abort: () => { if (request) request.src = ''; } };
    this.cache.set(url, entry);
    request = new THREE.ImageLoader().load(url, (image) => {
      const texture = new THREE.Texture(image);
      texture.needsUpdate = true;
      if (entry.disposed) { texture.dispose(); return; }
      entry.texture = texture;
      resolveTexture(texture);
    }, undefined, rejectTexture);
    return entry;
  }

  private release(entry: CacheEntry): void {
    if (entry.disposed) return;
    entry.refs--;
    if (entry.refs > 0) return;
    entry.disposed = true;
    entry.abort();
    entry.texture?.dispose();
    for (const [url, cached] of this.cache) if (cached === entry) this.cache.delete(url);
  }

  private awaitWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(new DOMException('Texture pack load aborted', 'AbortError'));
    return new Promise<T>((resolve, reject) => {
      const abort = () => reject(new DOMException('Texture pack load aborted', 'AbortError'));
      signal.addEventListener('abort', abort, { once: true });
      promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }
}

const defaultLoader = new TexturePackLoader();
export function loadTexturePack(manifest: TexturePackManifest, baseUrl: string, options?: TexturePackLoadOptions): Promise<LoadedTexturePack> {
  return defaultLoader.loadTexturePack(manifest, baseUrl, options);
}
export function clearTexturePackCache(): void { defaultLoader.clear(); }

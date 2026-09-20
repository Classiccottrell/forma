import * as THREE from 'three';
import { defineEnvironment, environmentRegistry } from '../registry/instances.js';
import type { EnvironmentHandle } from '../types.js';

// Environment definitions configure scene.background + lights; Studio/Softbox also
// declare the app-hosted HDR used for reflective image-based lighting.

interface LightHandle extends EnvironmentHandle {
  lights: THREE.Object3D[];
}

const studio = defineEnvironment({
  id: 'studio',
  label: 'Studio',
  category: 'lighting',
  hdrPath: 'studio-small-01.hdr',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    // The app owns the Studio backdrop so the published library stays renderer-agnostic.
    ctx.scene.background = null;
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(0.4, 0.6, 1);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-0.6, 0.2, -0.4);
    ctx.scene.add(ambient, keyLight, fillLight);
    const lights = [ambient, keyLight, fillLight];
    let disposed = false;
    const handle: LightHandle = {
      lights,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.scene.remove(...lights);
        ctx.scene.background = null;
      },
    };
    return handle;
  },
});

/** Gradient background via a DataTexture (blueprint deviation, same reasoning as
 * materials.ts's toon gradient: a CanvasTexture needs a 2D context, unreliable under
 * happy-dom; a DataTexture is GL/DOM-independent for the leak-check to run headless). */
function makeGradientBackgroundTexture(): THREE.DataTexture {
  const height = 32;
  const data = new Uint8Array(height * 4);
  const top = [0x1c, 0x1f, 0x2b];
  const bottom = [0x6a, 0x63, 0xff];
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    data[y * 4 + 0] = Math.round(top[0]! + (bottom[0]! - top[0]!) * t);
    data[y * 4 + 1] = Math.round(top[1]! + (bottom[1]! - top[1]!) * t);
    data[y * 4 + 2] = Math.round(top[2]! + (bottom[2]! - top[2]!) * t);
    data[y * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 1, height, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const gradientSky = defineEnvironment({
  id: 'gradient-sky',
  label: 'Gradient Sky',
  category: 'backdrop',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    const texture = makeGradientBackgroundTexture();
    ctx.registry.track(texture);
    ctx.scene.background = texture;
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    ctx.scene.add(ambient);
    let disposed = false;
    const handle: LightHandle = {
      lights: [ambient],
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.scene.remove(ambient);
        ctx.scene.background = null;
      },
    };
    return handle;
  },
});

/** Magenta/cyan gradient backdrop, same DataTexture technique as gradient-sky. */
function makeNeonBackgroundTexture(): THREE.DataTexture {
  const height = 32;
  const data = new Uint8Array(height * 4);
  const top = [0xff, 0x2a, 0xc8];
  const bottom = [0x1a, 0xe8, 0xff];
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    data[y * 4 + 0] = Math.round(top[0]! + (bottom[0]! - top[0]!) * t);
    data[y * 4 + 1] = Math.round(top[1]! + (bottom[1]! - top[1]!) * t);
    data[y * 4 + 2] = Math.round(top[2]! + (bottom[2]! - top[2]!) * t);
    data[y * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 1, height, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const neonRoom = defineEnvironment({
  id: 'neon-room',
  label: 'Neon Room',
  category: 'backdrop',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    const texture = makeNeonBackgroundTexture();
    ctx.registry.track(texture);
    ctx.scene.background = texture;
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    const magenta = new THREE.PointLight(0xff2ac8, 6, 8);
    magenta.position.set(-1.2, 0.6, 1.2);
    const cyan = new THREE.PointLight(0x1ae8ff, 6, 8);
    cyan.position.set(1.2, -0.4, 1.4);
    ctx.scene.add(ambient, magenta, cyan);
    const lights = [ambient, magenta, cyan];
    let disposed = false;
    const handle: LightHandle = {
      lights,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.scene.remove(...lights);
        ctx.scene.background = null;
      },
    };
    return handle;
  },
});

const sunset = defineEnvironment({
  id: 'sunset',
  label: 'Sunset',
  category: 'backdrop',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    const height = 32;
    const data = new Uint8Array(height * 4);
    const top = [0x2b, 0x1a, 0x3f];
    const bottom = [0xff, 0x8a, 0x3d];
    for (let y = 0; y < height; y++) {
      const t = y / (height - 1);
      data[y * 4 + 0] = Math.round(top[0]! + (bottom[0]! - top[0]!) * t);
      data[y * 4 + 1] = Math.round(top[1]! + (bottom[1]! - top[1]!) * t);
      data[y * 4 + 2] = Math.round(top[2]! + (bottom[2]! - top[2]!) * t);
      data[y * 4 + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, 1, height, THREE.RGBAFormat);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    ctx.registry.track(texture);
    ctx.scene.background = texture;
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const key = new THREE.DirectionalLight(0xffb066, 1.3);
    key.position.set(0.6, 0.3, 0.8);
    ctx.scene.add(ambient, key);
    const lights = [ambient, key];
    let disposed = false;
    const handle: LightHandle = {
      lights,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.scene.remove(...lights);
        ctx.scene.background = null;
      },
    };
    return handle;
  },
});

const midnight = defineEnvironment({
  id: 'midnight',
  label: 'Midnight',
  category: 'lighting',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    ctx.scene.background = new THREE.Color(0x05060c);
    const ambient = new THREE.AmbientLight(0x3040ff, 0.25);
    const rim = new THREE.DirectionalLight(0x6f8bff, 1.1);
    rim.position.set(-0.4, 0.5, -0.6);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(0.5, 0.3, 0.7);
    ctx.scene.add(ambient, rim, fill);
    const lights = [ambient, rim, fill];
    let disposed = false;
    const handle: LightHandle = {
      lights,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.scene.remove(...lights);
        ctx.scene.background = null;
      },
    };
    return handle;
  },
});

const softbox = defineEnvironment({
  id: 'softbox',
  label: 'Softbox',
  category: 'lighting',
  hdrPath: 'studio-small-01.hdr',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    ctx.scene.background = new THREE.Color(0xe9ebf2);
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const top = new THREE.DirectionalLight(0xffffff, 0.6);
    top.position.set(0, 1, 0.2);
    const front = new THREE.DirectionalLight(0xffffff, 0.4);
    front.position.set(0.2, 0.1, 1);
    ctx.scene.add(ambient, top, front);
    const lights = [ambient, top, front];
    let disposed = false;
    const handle: LightHandle = {
      lights,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.scene.remove(...lights);
        ctx.scene.background = null;
      },
    };
    return handle;
  },
});

function makeAuroraBackgroundTexture(): THREE.DataTexture {
  const width = 64;
  const height = 32;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    for (let x = 0; x < width; x++) {
      const wave = Math.sin(x * 0.25 + y * 0.18) * 0.5 + 0.5;
      const i = (y * width + x) * 4;
      data[i] = Math.round(10 + 36 * wave + 22 * (1 - t));
      data[i + 1] = Math.round(18 + 105 * wave + 30 * (1 - t));
      data[i + 2] = Math.round(48 + 130 * (1 - t) + 34 * wave);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const aurora = defineEnvironment({
  id: 'aurora-atmosphere',
  label: 'Aurora Atmosphere',
  category: 'backdrop',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    const texture = makeAuroraBackgroundTexture();
    ctx.registry.track(texture);
    ctx.scene.background = texture;
    const ambient = new THREE.AmbientLight(0x8fd8ff, 0.45);
    const green = new THREE.PointLight(0x62ffca, 5, 7);
    green.position.set(-1.4, 1.2, 1.2);
    const violet = new THREE.DirectionalLight(0x8b7dff, 1.2);
    violet.position.set(0.8, 0.6, -0.6);
    ctx.scene.add(ambient, green, violet);
    const lights = [ambient, green, violet];
    let disposed = false;
    const handle: LightHandle = {
      lights,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.scene.remove(...lights);
        ctx.scene.background = null;
      },
    };
    return handle;
  },
});

export function registerEnvironments(): void {
  for (const def of [studio, gradientSky, neonRoom, sunset, midnight, softbox, aurora]) {
    if (!environmentRegistry.get(def.id)) environmentRegistry.register(def);
  }
}

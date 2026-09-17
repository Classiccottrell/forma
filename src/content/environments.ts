import * as THREE from 'three';
import { defineEnvironment, environmentRegistry } from '../registry/instances.js';
import type { EnvironmentHandle } from '../types.js';

// Two environment definitions (blueprint §5.3). Both configure scene.background +
// lights only — no IBL/PMREM in pre-work scope.

interface LightHandle extends EnvironmentHandle {
  lights: THREE.Object3D[];
}

const studio = defineEnvironment({
  id: 'studio',
  label: 'Studio',
  category: 'lighting',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    ctx.scene.background = new THREE.Color(0x3a3d45);
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

export function registerEnvironments(): void {
  for (const def of [studio, gradientSky, neonRoom]) {
    if (!environmentRegistry.get(def.id)) environmentRegistry.register(def);
  }
}

import * as THREE from 'three';
import { defineEnvironment, environmentRegistry } from '../registry/instances.js';
import type { EnvironmentCreateContext, EnvironmentHandle } from '../types.js';

// Environment definitions configure scene.background + lights; Studio/Softbox also
// declare the app-hosted HDR used for reflective image-based lighting.

interface LightHandle extends EnvironmentHandle {
  lights: THREE.Object3D[];
  baseIntensities?: number[];
}

const LIGHTING_SCHEMA = {
  lightingMode: { kind: 'enum', options: ['environment', 'directional'] as const, default: 'environment', rebuild: false },
  environmentStrength: { kind: 'number', min: 0, max: 2, step: 0.01, default: 1, rebuild: false },
  environmentRotation: { kind: 'number', min: -180, max: 180, step: 1, default: 0, rebuild: false },
  lightIntensity: { kind: 'number', min: 0, max: 2, step: 0.01, default: 1, rebuild: false },
  lightColor: { kind: 'color', default: '#ffffff', rebuild: false },
  lightX: { kind: 'number', min: -1, max: 1, step: 0.01, default: 0.45, rebuild: false },
  lightY: { kind: 'number', min: 0, max: 1, step: 0.01, default: 0.65, rebuild: false },
} as const;

const DEFAULT_LIGHTING = { lightingMode: 'environment', environmentStrength: 1, environmentRotation: 0, lightIntensity: 1, lightColor: '#ffffff', lightX: 0.45, lightY: 0.65 } as const;

function updateLighting(handle: EnvironmentHandle, params: typeof DEFAULT_LIGHTING): void {
  const lights = handle as LightHandle;
  if (!lights.baseIntensities) lights.baseIntensities = lights.lights.map((light) => light instanceof THREE.Light ? light.intensity : 1);
  lights.lights.forEach((light, index) => {
    if (light instanceof THREE.Light) {
      light.intensity = lights.baseIntensities![index]! * params.lightIntensity;
      light.color.set(params.lightColor);
    }
  });
  const directional = lights.lights[lights.lights.length - 1];
  if (directional instanceof THREE.DirectionalLight) {
    directional.visible = String(params.lightingMode) === 'directional';
    directional.position.set(params.lightX * 2, params.lightY * 2, 2.4);
  }
}

function createDirectional(ctx: EnvironmentCreateContext, params: typeof DEFAULT_LIGHTING): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(params.lightColor, 1.25);
  light.visible = String(params.lightingMode) === 'directional';
  light.position.set(params.lightX * 2, params.lightY * 2, 2.4);
  ctx.scene.add(light);
  return light;
}

function makeThemeGradient(top: [number, number, number], bottom: [number, number, number]): THREE.DataTexture {
  const height = 32;
  const data = new Uint8Array(height * 4);
  for (let y = 0; y < height; y++) {
    const t = y / (height - 1);
    const i = y * 4;
    data[i] = Math.round(top[0] + (bottom[0] - top[0]) * t);
    data[i + 1] = Math.round(top[1] + (bottom[1] - top[1]) * t);
    data[i + 2] = Math.round(top[2] + (bottom[2] - top[2]) * t);
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, 1, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createTheme(ctx: EnvironmentCreateContext, params: typeof DEFAULT_LIGHTING, background: THREE.Color | THREE.DataTexture, ambientColor: number, keyColor: number): LightHandle {
  if (background instanceof THREE.DataTexture) ctx.registry.track(background);
  ctx.scene.background = background;
  const ambient = new THREE.AmbientLight(ambientColor, 0.45);
  const key = new THREE.DirectionalLight(keyColor, 1.1);
  key.position.set(0.5, 0.7, 1);
  const directional = createDirectional(ctx, params);
  ctx.scene.add(ambient, key);
  const lights = [ambient, key, directional];
  return {
    lights,
    dispose() {
      ctx.scene.remove(...lights);
      ctx.scene.background = null;
    },
  };
}

const studio = defineEnvironment({
  id: 'studio',
  label: 'Studio',
  category: 'lighting',
  hdrPath: 'studio-small-01.hdr',
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
    // The app owns the Studio backdrop so the published library stays renderer-agnostic.
    ctx.scene.background = null;
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(0.4, 0.6, 1);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-0.6, 0.2, -0.4);
    const directional = createDirectional(ctx, params);
    ctx.scene.add(ambient, keyLight, fillLight);
    const lights = [ambient, keyLight, fillLight, directional];
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
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
    const texture = makeGradientBackgroundTexture();
    ctx.registry.track(texture);
    ctx.scene.background = texture;
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const directional = createDirectional(ctx, params);
    ctx.scene.add(ambient);
    let disposed = false;
    const handle: LightHandle = {
      lights: [ambient, directional],
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
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
    const texture = makeNeonBackgroundTexture();
    ctx.registry.track(texture);
    ctx.scene.background = texture;
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    const magenta = new THREE.PointLight(0xff2ac8, 6, 8);
    magenta.position.set(-1.2, 0.6, 1.2);
    const cyan = new THREE.PointLight(0x1ae8ff, 6, 8);
    cyan.position.set(1.2, -0.4, 1.4);
    const directional = createDirectional(ctx, params);
    ctx.scene.add(ambient, magenta, cyan);
    const lights = [ambient, magenta, cyan, directional];
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
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
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
    const directional = createDirectional(ctx, params);
    ctx.scene.add(ambient, key);
    const lights = [ambient, key, directional];
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
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
    ctx.scene.background = new THREE.Color(0x05060c);
    const ambient = new THREE.AmbientLight(0x3040ff, 0.25);
    const rim = new THREE.DirectionalLight(0x6f8bff, 1.1);
    rim.position.set(-0.4, 0.5, -0.6);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(0.5, 0.3, 0.7);
    const directional = createDirectional(ctx, params);
    ctx.scene.add(ambient, rim, fill);
    const lights = [ambient, rim, fill, directional];
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
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
    ctx.scene.background = new THREE.Color(0xe9ebf2);
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const top = new THREE.DirectionalLight(0xffffff, 0.6);
    top.position.set(0, 1, 0.2);
    const front = new THREE.DirectionalLight(0xffffff, 0.4);
    front.position.set(0.2, 0.1, 1);
    const directional = createDirectional(ctx, params);
    ctx.scene.add(ambient, top, front);
    const lights = [ambient, top, front, directional];
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

const duskRose = defineEnvironment({
  id: 'dusk-rose',
  label: 'Dusk Rose',
  category: 'backdrop',
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
    return createTheme(ctx, params, makeThemeGradient([0x1b, 0x1b, 0x32], [0xd9, 0x7d, 0x80]), 0xbbb8ff, 0xffb0a0);
  },
});

const paperWarm = defineEnvironment({
  id: 'paper-warm',
  label: 'Warm Paper',
  category: 'backdrop',
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
    return createTheme(ctx, params, makeThemeGradient([0xf5, 0xf0, 0xe6], [0xb7, 0xa9, 0x98]), 0xfff8e9, 0xfff0d0);
  },
});

const forestNight = defineEnvironment({
  id: 'forest-night',
  label: 'Forest Night',
  category: 'backdrop',
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
  create(params, ctx) {
    return createTheme(ctx, params, makeThemeGradient([0x08, 0x16, 0x1b], [0x2f, 0x5e, 0x4e]), 0x9bd7c0, 0xb5ffd9);
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
  parameterSchema: LIGHTING_SCHEMA,
  defaultParameters: DEFAULT_LIGHTING,
  update: updateLighting,
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
  for (const def of [studio, gradientSky, neonRoom, sunset, midnight, softbox, aurora, duskRose, paperWarm, forestNight]) {
    if (!environmentRegistry.get(def.id)) environmentRegistry.register(def);
  }
}

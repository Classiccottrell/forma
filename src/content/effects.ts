import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { defineEffect, effectRegistry } from '../registry/instances.js';
import type { EffectHandle } from '../types.js';

// Two effect definitions (M1 expansion, roadmap §3). 'none' proves the registry's
// shape compiles with zero pipeline cost; 'duotone' proves the real composer wiring
// (createFormaScene's shared EffectComposer, roadmap §2 item 5) end-to-end, including
// through PNG export which renders via the same composer.
const none = defineEffect({
  id: 'none',
  label: 'None',
  category: 'stub',
  parameterSchema: {},
  defaultParameters: {},
  create() {
    return { dispose() {} };
  },
});

// Full-screen luminance-remap shader. Alpha is passed through unmodified
// (`gl_FragColor.a = texel.a`) — a naive duotone pass that hardcodes alpha to 1.0
// would silently kill transparent PNG export (roadmap §3's flagged regression).
const duotoneShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    shadowColor: { value: new THREE.Color('#1a1440') },
    highlightColor: { value: new THREE.Color('#ff9d5c') },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 shadowColor;
    uniform vec3 highlightColor;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      vec3 duo = mix(shadowColor, highlightColor, luma);
      gl_FragColor = vec4(duo, texel.a);
    }
  `,
};

const duotone = defineEffect({
  id: 'duotone',
  label: 'Duotone',
  category: 'post',
  parameterSchema: {
    shadowColor: { kind: 'color', default: '#1a1440', rebuild: false },
    highlightColor: { kind: 'color', default: '#ff9d5c', rebuild: false },
  },
  defaultParameters: { shadowColor: '#1a1440', highlightColor: '#ff9d5c' },
  create(params, ctx) {
    const pass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        shadowColor: { value: new THREE.Color(params.shadowColor) },
        highlightColor: { value: new THREE.Color(params.highlightColor) },
      },
      vertexShader: duotoneShader.vertexShader,
      fragmentShader: duotoneShader.fragmentShader,
    });
    ctx.composer?.addPass(pass);
    let disposed = false;
    const handle: EffectHandle = {
      pass,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.composer?.removePass(pass);
        pass.dispose();
      },
    };
    return handle;
  },
  update(handle, params) {
    const pass = handle.pass as InstanceType<typeof ShaderPass> | undefined;
    if (!pass) return;
    (pass.uniforms.shadowColor!.value as THREE.Color).set(params.shadowColor);
    (pass.uniforms.highlightColor!.value as THREE.Color).set(params.highlightColor);
  },
});

const grayscale = defineEffect({
  id: 'grayscale',
  label: 'Grayscale',
  category: 'post',
  parameterSchema: {
    intensity: { kind: 'number', min: 0, max: 1, step: 0.05, default: 1, rebuild: false },
  },
  defaultParameters: { intensity: 1 },
  create(params, ctx) {
    const pass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, intensity: { value: params.intensity } },
      vertexShader: duotoneShader.vertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
          vec3 gray = mix(texel.rgb, vec3(luma), intensity);
          gl_FragColor = vec4(gray, texel.a);
        }
      `,
    });
    ctx.composer?.addPass(pass);
    let disposed = false;
    const handle: EffectHandle = {
      pass,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.composer?.removePass(pass);
        pass.dispose();
      },
    };
    return handle;
  },
  update(handle, params) {
    const pass = handle.pass as InstanceType<typeof ShaderPass> | undefined;
    if (!pass) return;
    pass.uniforms.intensity!.value = params.intensity;
  },
});

const vignette = defineEffect({
  id: 'vignette',
  label: 'Vignette',
  category: 'post',
  parameterSchema: {
    darkness: { kind: 'number', min: 0, max: 1.5, step: 0.05, default: 0.8, rebuild: false },
    radius: { kind: 'number', min: 0.2, max: 1.2, step: 0.05, default: 0.7, rebuild: false },
  },
  defaultParameters: { darkness: 0.8, radius: 0.7 },
  create(params, ctx) {
    const pass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, darkness: { value: params.darkness }, radius: { value: params.radius } },
      vertexShader: duotoneShader.vertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float darkness;
        uniform float radius;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          float d = distance(vUv, vec2(0.5));
          float vig = smoothstep(radius, radius - 0.4, d);
          vec3 shaded = mix(texel.rgb * (1.0 - darkness), texel.rgb, vig);
          gl_FragColor = vec4(shaded, texel.a);
        }
      `,
    });
    ctx.composer?.addPass(pass);
    let disposed = false;
    const handle: EffectHandle = {
      pass,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.composer?.removePass(pass);
        pass.dispose();
      },
    };
    return handle;
  },
  update(handle, params) {
    const pass = handle.pass as InstanceType<typeof ShaderPass> | undefined;
    if (!pass) return;
    pass.uniforms.darkness!.value = params.darkness;
    pass.uniforms.radius!.value = params.radius;
  },
});

const invert = defineEffect({
  id: 'invert',
  label: 'Invert',
  category: 'post',
  parameterSchema: {},
  defaultParameters: {},
  create(_params, ctx) {
    const pass = new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: duotoneShader.vertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          gl_FragColor = vec4(1.0 - texel.rgb, texel.a);
        }
      `,
    });
    ctx.composer?.addPass(pass);
    let disposed = false;
    const handle: EffectHandle = {
      pass,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.composer?.removePass(pass);
        pass.dispose();
      },
    };
    return handle;
  },
});

export function registerEffects(): void {
  for (const def of [none, duotone, grayscale, vignette, invert]) {
    if (!effectRegistry.get(def.id)) effectRegistry.register(def);
  }
}

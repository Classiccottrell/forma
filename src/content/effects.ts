import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
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

const chromaticAberration = defineEffect({
  id: 'chromatic-aberration',
  label: 'Chromatic Aberration',
  category: 'post',
  parameterSchema: {
    offset: { kind: 'number', min: 0, max: 0.02, step: 0.001, default: 0.006, rebuild: false },
  },
  defaultParameters: { offset: 0.006 },
  create(params, ctx) {
    const pass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, offset: { value: params.offset } },
      vertexShader: duotoneShader.vertexShader,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float offset;
        varying vec2 vUv;
        void main() {
          vec2 shift = vec2(offset, 0.0);
          vec4 texel = texture2D(tDiffuse, vUv);
          float red = texture2D(tDiffuse, vUv + shift).r;
          float blue = texture2D(tDiffuse, vUv - shift).b;
          gl_FragColor = vec4(red, texel.g, blue, texel.a);
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
    pass.uniforms.offset!.value = params.offset;
  },
});

// --- Cinematic tier (roadmap V1) --------------------------------------------
// The five effects above are colour filters operating on the final image.
// These three are what actually read as "premium" in this product category:
// bloom, colour grading and grain. Same registry contract — addPass in
// create(), removePass in the handle's dispose().
//
// Depth of field was prototyped and deliberately NOT shipped in this batch.
// three's BokehPass re-renders the scene with a depth override material and
// composites opaquely: against Forma's transparent canvas it both destroyed
// the alpha channel and shifted hue. That needs a bokeh implementation that
// respects alpha, not a patch — tracked as a roadmap decision rather than
// shipped broken.

/** Resolution for passes that allocate internal render targets. Falls back to a
 * sane size when there's no real renderer.
 *
 * The method is feature-detected rather than the object null-checked, because
 * headless callers pass a *stub* renderer rather than omitting it —
 * `tests/content-smoke.test.ts` constructs every effect with
 * `{} as THREE.WebGLRenderer`. `renderer?.getSize` is not enough there: the
 * object exists, so optional chaining proceeds and throws on the missing
 * method. */
function passResolution(renderer: THREE.WebGLRenderer | undefined): THREE.Vector2 {
  const size = new THREE.Vector2(1280, 720);
  if (typeof renderer?.getSize === 'function') renderer.getSize(size);
  return size;
}

const bloom = defineEffect({
  id: 'bloom',
  label: 'Bloom',
  category: 'post',
  parameterSchema: {
    // UnrealBloomPass reads these as plain properties every frame, so all three
    // are live-mutable — no rebuild on a slider drag.
    strength: { kind: 'number', min: 0, max: 3, step: 0.05, default: 0.8, rebuild: false },
    radius: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.4, rebuild: false },
    threshold: { kind: 'number', min: 0, max: 1, step: 0.01, default: 0.85, rebuild: false },
  },
  defaultParameters: { strength: 0.8, radius: 0.4, threshold: 0.85 },
  create(params, ctx) {
    const pass = new UnrealBloomPass(
      passResolution(ctx.renderer),
      params.strength,
      params.radius,
      params.threshold,
    );
    // Forma renders on a transparent canvas (`alpha: true` + `setClearAlpha(0)`
    // in createFormaScene) so the page backdrop shows through and PNG export can
    // be transparent. When UnrealBloomPass renders to screen it first blits the
    // base image with an internal MeshBasicMaterial that has `transparent`
    // false, so blending is off and it writes alpha = 1 across the whole quad —
    // the canvas becomes an opaque black rectangle, the page backdrop vanishes,
    // and a "transparent" PNG export comes out opaque.
    //
    // The field is `_basic` (private) in three r185; there is no public API for
    // this, so reach for it defensively and skip the tweak if a future version
    // renames it rather than throwing.
    const basicBlit = (pass as unknown as { _basic?: THREE.Material })._basic;
    if (basicBlit) {
      basicBlit.transparent = true;
      // Keep the source alpha rather than compositing against an opaque black
      // clear — otherwise the blit is still effectively opaque.
      basicBlit.blending = THREE.NormalBlending;
      basicBlit.premultipliedAlpha = true;
      basicBlit.needsUpdate = true;
    }
    ctx.composer?.addPass(pass);
    let disposed = false;
    const handle: EffectHandle = {
      pass,
      dispose() {
        if (disposed) return;
        disposed = true;
        ctx.composer?.removePass(pass);
        // UnrealBloomPass owns several render targets and a set of materials;
        // its own dispose() releases them.
        pass.dispose();
      },
    };
    return handle;
  },
  update(handle, params) {
    const pass = handle.pass as InstanceType<typeof UnrealBloomPass> | undefined;
    if (!pass) return;
    pass.strength = params.strength;
    pass.radius = params.radius;
    pass.threshold = params.threshold;
  },
});

const colorGradeShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Lift / gamma / gain, plus saturation and temperature — the standard
  // colourist controls, which is what "colour grading" means in the tools we
  // are measuring against.
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float lift;
    uniform float gamma;
    uniform float gain;
    uniform float saturation;
    uniform float temperature;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 c = texel.rgb;

      c = c + lift;                                   // shadows
      c = pow(max(c, vec3(0.0)), vec3(1.0 / max(gamma, 0.001)));  // midtones
      c = c * gain;                                   // highlights

      // Warm/cool: push red up and blue down (or the reverse).
      c.r += temperature;
      c.b -= temperature;

      float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(luma), c, saturation);

      // Deliberately NOT clamped: the composer buffer is half-float, so a
      // brightly lit saturated colour legitimately carries channels above 1.0
      // and clipping them here would skew hue. Only the negative side is
      // guarded, which pow() already needs anyway.
      //
      // NOTE: at neutral defaults this shader is a mathematical identity, yet
      // enabling it still visibly shifts colour. That is NOT this shader — it
      // is a pre-existing Forma issue: ANY pass in the composer chain shifts
      // colour, because the chain never applies the renderer's output
      // colour-space/tone-mapping conversion (no OutputPass). Verified by
      // enabling the untouched vignette effect, whose centre is
      // mathematically unmodified and which shifts identically. Fixing it
      // means keeping an OutputPass last in the chain, which needs runtime
      // pass-ordering — tracked on the roadmap, not patched here.
      gl_FragColor = vec4(max(c, 0.0), texel.a);
    }
  `,
};

const colorGrade = defineEffect({
  id: 'color-grade',
  label: 'Colour Grade',
  category: 'post',
  parameterSchema: {
    lift: { kind: 'number', min: -0.2, max: 0.2, step: 0.01, default: 0, rebuild: false },
    gamma: { kind: 'number', min: 0.5, max: 2, step: 0.01, default: 1, rebuild: false },
    gain: { kind: 'number', min: 0.5, max: 2, step: 0.01, default: 1, rebuild: false },
    saturation: { kind: 'number', min: 0, max: 2, step: 0.05, default: 1, rebuild: false },
    temperature: { kind: 'number', min: -0.1, max: 0.1, step: 0.005, default: 0, rebuild: false },
  },
  defaultParameters: { lift: 0, gamma: 1, gain: 1, saturation: 1, temperature: 0 },
  create(params, ctx) {
    const pass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        lift: { value: params.lift },
        gamma: { value: params.gamma },
        gain: { value: params.gain },
        saturation: { value: params.saturation },
        temperature: { value: params.temperature },
      },
      vertexShader: colorGradeShader.vertexShader,
      fragmentShader: colorGradeShader.fragmentShader,
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
    pass.uniforms.lift!.value = params.lift;
    pass.uniforms.gamma!.value = params.gamma;
    pass.uniforms.gain!.value = params.gain;
    pass.uniforms.saturation!.value = params.saturation;
    pass.uniforms.temperature!.value = params.temperature;
  },
});

const filmGrainShader = {
  vertexShader: colorGradeShader.vertexShader,
  // Grain plus optional chromatic aberration: both are "imperfection" cues that
  // stop a render reading as a sterile tech demo. Kept in one pass because they
  // are almost always wanted together and one pass is cheaper than two.
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float aberration;
    uniform float time;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 dir = vUv - 0.5;
      vec4 texel;
      if (aberration > 0.0) {
        // Split the channels radially — strongest at the edges, like a lens.
        vec2 off = dir * aberration;
        texel.r = texture2D(tDiffuse, vUv + off).r;
        texel.g = texture2D(tDiffuse, vUv).g;
        texel.b = texture2D(tDiffuse, vUv - off).b;
        texel.a = texture2D(tDiffuse, vUv).a;
      } else {
        texel = texture2D(tDiffuse, vUv);
      }

      float n = rand(vUv + fract(time)) - 0.5;
      gl_FragColor = vec4(clamp(texel.rgb + n * amount, 0.0, 1.0), texel.a);
    }
  `,
};

const filmGrain = defineEffect({
  id: 'film-grain',
  label: 'Film Grain',
  category: 'post',
  parameterSchema: {
    amount: { kind: 'number', min: 0, max: 0.4, step: 0.01, default: 0.08, rebuild: false },
    aberration: { kind: 'number', min: 0, max: 0.02, step: 0.001, default: 0, rebuild: false },
    animate: { kind: 'boolean', default: true, rebuild: false },
  },
  defaultParameters: { amount: 0.08, aberration: 0, animate: true },
  create(params, ctx) {
    const pass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        amount: { value: params.amount },
        aberration: { value: params.aberration },
        time: { value: 0 },
      },
      vertexShader: filmGrainShader.vertexShader,
      fragmentShader: filmGrainShader.fragmentShader,
    });
    ctx.composer?.addPass(pass);

    // Static grain looks like a texture; moving grain looks like film. Drive it
    // off the clock rather than the frame counter so it is framerate-independent.
    let raf = 0;
    // Explicitly boolean: ParamsOf<S> narrows a `default: true` schema to the
    // literal type `true`, so an inferred `let` here could never be set false.
    let animating: boolean = params.animate;
    const tick = () => {
      if (!animating) return;
      pass.uniforms.time!.value = performance.now() / 1000;
      raf = requestAnimationFrame(tick);
    };
    if (typeof requestAnimationFrame === 'function' && animating) raf = requestAnimationFrame(tick);

    let disposed = false;
    const handle: EffectHandle = {
      pass,
      dispose() {
        if (disposed) return;
        disposed = true;
        animating = false;
        if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
        ctx.composer?.removePass(pass);
        pass.dispose();
      },
    };
    return handle;
  },
  update(handle, params) {
    const pass = handle.pass as InstanceType<typeof ShaderPass> | undefined;
    if (!pass) return;
    pass.uniforms.amount!.value = params.amount;
    pass.uniforms.aberration!.value = params.aberration;
    if (!params.animate) pass.uniforms.time!.value = 0;
  },
});

export function registerEffects(): void {
  for (const def of [none, duotone, grayscale, vignette, invert, chromaticAberration, bloom, colorGrade, filmGrain]) {
    if (!effectRegistry.get(def.id)) effectRegistry.register(def);
  }
}

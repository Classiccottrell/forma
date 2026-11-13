import * as THREE from 'three';
import { MATTER_GLSL, seededRandom } from 'cc-webgl/matter';
import type { AtmosphereSettings } from '../types.js';

const HAZE_COUNT = 220;
const DUST_COUNT = 3500;
/** World radius the runtime frames every shape to. */
const SUBJECT_RADIUS = 1.2;

/** Space around the object instead of a flat backdrop behind it: a soft haze of large,
 * very faint glow sprites drifting around the object (tinted by the environment, and
 * thicker as matter turns to gas), and a field of fine dust far out around the camera.
 * Additive and depth-tested against nothing, so it never hides the object. */
export class AtmosphereLayer {
  private readonly haze: THREE.Points;
  private readonly dust: THREE.Points;
  private readonly hazeUniforms = {
    uTime: { value: 0 }, uAmount: { value: 0 }, uScale: { value: 400 }, uPixelRatio: { value: 1 },
    uColor: { value: new THREE.Color(0.7, 0.68, 0.9) },
  };
  /** Additive glow reads far stronger on a dark backdrop; this evens it out. */
  private backdropGain = 1;
  private readonly dustTexture: THREE.Texture;
  private settings: AtmosphereSettings | null = null;
  private readonly size = new THREE.Vector2();

  constructor(private readonly scene: THREE.Scene) {
    const rand = seededRandom(11);
    const hazePos = new Float32Array(HAZE_COUNT * 3);
    const hazeSeed = new Float32Array(HAZE_COUNT);
    for (let i = 0; i < HAZE_COUNT; i++) {
      const r = (0.6 + rand() * 2.6) * SUBJECT_RADIUS;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      hazePos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th)], i * 3);
      hazeSeed[i] = rand();
    }
    const hazeGeometry = new THREE.BufferGeometry();
    hazeGeometry.setAttribute('position', new THREE.BufferAttribute(hazePos, 3));
    hazeGeometry.setAttribute('aSeed', new THREE.BufferAttribute(hazeSeed, 1));
    hazeGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    this.haze = new THREE.Points(hazeGeometry, new THREE.ShaderMaterial({
      uniforms: this.hazeUniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `uniform float uTime, uScale, uPixelRatio; attribute float aSeed; varying float vSeed;
${MATTER_GLSL}
void main(){
  vec3 p = position + field(position * .3 + aSeed * 4., uTime * .05) * .6;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.3 + aSeed * 1.9) * uPixelRatio * uScale / -mv.z;
  vSeed = aSeed;
}`,
      fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uAmount; varying float vSeed;
void main(){ vec2 c = gl_PointCoord - .5; float r = dot(c, c) * 4.; if (r > 1.) discard;
  gl_FragColor = vec4(uColor, exp(-r * 2.6) * .028 * uAmount * (.5 + vSeed)); }`,
    }));
    this.haze.renderOrder = 2;
    this.haze.frustumCulled = false;

    const dustPos = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      const r = 14 + rand() * 22;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      dustPos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dustTexture = roundDot();
    this.dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      size: 0.11, map: this.dustTexture, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.dust.frustumCulled = false;

    this.haze.visible = this.dust.visible = false;
    scene.add(this.haze, this.dust);
  }

  apply(settings: AtmosphereSettings | undefined): void {
    this.settings = settings ?? null;
    this.haze.visible = this.dust.visible = this.settings !== null;
  }

  /** Haze and dust colour, and how bright the backdrop is (0..1), from the environment
   * (see `environmentTint`). */
  setTint(color: THREE.Color, backdropLuminance = 0.5): void {
    this.hazeUniforms.uColor.value.copy(color);
    this.backdropGain = 0.3 + 0.7 * Math.min(1, Math.max(0, backdropLuminance));
    (this.dust.material as THREE.PointsMaterial).color.copy(color).lerp(new THREE.Color(1, 1, 1), 0.6);
  }

  /** Per frame. `gas` (0..1) thickens the haze as matter turns to gas. */
  update(elapsed: number, renderer: THREE.WebGLRenderer, camera: THREE.Camera, gas: number): void {
    const s = this.settings;
    if (!s) return;
    if (typeof renderer.getSize === 'function') {
      renderer.getSize(this.size);
      const tanHalf = camera instanceof THREE.PerspectiveCamera ? Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) : 1;
      this.hazeUniforms.uScale.value = this.size.y / (2 * tanHalf);
      this.hazeUniforms.uPixelRatio.value = renderer.getPixelRatio();
    }
    this.hazeUniforms.uTime.value = elapsed;
    this.hazeUniforms.uAmount.value = s.haze * (1 + gas * 0.6) * this.backdropGain;
    (this.dust.material as THREE.PointsMaterial).opacity = 0.6 * s.dust;
    this.dust.rotation.y = elapsed * 0.01;
  }

  dispose(): void {
    this.scene.remove(this.haze, this.dust);
    this.haze.geometry.dispose();
    (this.haze.material as THREE.Material).dispose();
    this.dust.geometry.dispose();
    (this.dust.material as THREE.Material).dispose();
    this.dustTexture.dispose();
  }
}

/** A haze colour for an environment, and how bright its backdrop is. The colour comes
 * from the background (a flat colour, or the middle of a gradient texture); a near-black
 * background has no usable hue, so the key light's hue is used instead. Either way it is
 * set to a moderate lightness with some saturation, so haze reads as coloured light
 * rather than grey fog. */
export function environmentTint(background: THREE.Color | THREE.Texture | null, keyColor: THREE.Color): { color: THREE.Color; luminance: number } {
  let base: THREE.Color | null = null;
  if (background instanceof THREE.Color) base = background.clone();
  else if (background instanceof THREE.DataTexture && background.image?.data) {
    const { data, width, height } = background.image as { data: ArrayLike<number>; width: number; height: number };
    const i = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
    base = new THREE.Color(data[i]! / 255, data[i + 1]! / 255, data[i + 2]! / 255);
  }
  const hsl = { h: 0, s: 0, l: 0 };
  (base ?? keyColor).getHSL(hsl);
  const luminance = base ? hsl.l : 0.5;
  if (hsl.l < 0.12) keyColor.getHSL(hsl); // too dark to carry a hue
  const color = new THREE.Color().setHSL(hsl.h, Math.max(hsl.s, 0.35), 0.6);
  return { color, luminance };
}

function roundDot(): THREE.Texture {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const a = Math.max(0, 1 - d);
      data.set([255, 255, 255, Math.round(a * a * 255)], (y * size + x) * 4);
    }
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.needsUpdate = true;
  return t;
}


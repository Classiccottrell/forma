import * as THREE from 'three';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {
  sampleMatter, seededRandom, createMatterUniforms, createMatterMaterial, FluidPass, matterFormWeights,
  MatterCursor, MATTER_GLSL, WAKE_TRAIL_LENGTH, type MatterUniforms,
} from 'cc-webgl/matter';
import type { MatterSettings } from '../types.js';

const FORM_STATE = { solid: 0, liquid: 1, gas: 2 } as const;
const DENSITY = { low: 25_000, medium: 60_000, high: 120_000 } as const;
/** Gas draws this many times the chosen count, at a finer size. */
const GAS_EXTRA = 1.6;
/** World radius the runtime frames every shape to (see FormaRuntime.frameShape). */
const FRAMED_RADIUS = 1.2;
/** Liquid pools on this height in the shape's unit space; above the bottom of the view. */
const FLOOR = -1.1;
/** Seconds a Wake mark takes to heal. */
const TRAIL_LIFE = 1.4;
/** How each shape's inside is filled, so a broken form has body without particles
 * escaping it. Most shapes are filled by moving surface particles part-way toward the
 * centre, which stays inside any shape a straight line to the centre stays inside. Tubes
 * have no material at their centre, so they push in along the normal by at most the tube
 * radius; Ring (a hole at the centre) and Vase (a lip wider than its neck) push in a
 * little. Pushing in along the normal from near a sharp tip or edge exits through the
 * opposite face, which is why it isn't the default. */
type Fill = { mode: 'center' } | { mode: 'normal'; depth: number };
function fillFor(shapeId: string, params: Record<string, unknown>, radius: number): Fill {
  if (['torus', 'knot', 'spiral', 'spring'].includes(shapeId)) {
    const tube = typeof params.tube === 'number' ? params.tube : 0.1 * radius;
    return { mode: 'normal', depth: 0.95 * tube };
  }
  if (shapeId === 'ring' || shapeId === 'vase') return { mode: 'normal', depth: 0.1 * radius };
  return { mode: 'center' };
}

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** The matter view of the current shape: particles that can hold together, shatter, melt
 * or diffuse, drawn with cc-webgl/matter. Owned by FormaRuntime; inactive (nothing drawn,
 * nothing extra in the composer) while the composition has no `matter` settings. */
export class MatterLayer {
  readonly uniforms: MatterUniforms = createMatterUniforms();
  private readonly points: THREE.Points;
  private readonly spriteMaterial: THREE.ShaderMaterial;
  private readonly fluid: FluidPass | null;
  private readonly crack = {
    uBreak: { value: 0 }, uHoleMode: { value: 0 }, uBuf: { value: new THREE.Vector2(1, 1) },
    uCenter: { value: new THREE.Vector3() }, uRadiusInv: { value: 1 },
  };
  private settings: MatterSettings | null = null;
  private source: { geometry: THREE.BufferGeometry; shapeId: string; params: Record<string, unknown> } | null = null;
  private sampledFor: { geometry: THREE.BufferGeometry; density: number; version: number } | null = null;
  private geometryVersion = 0;
  private resampleAt = 0;
  private formNow = 0;
  private disperseNow = 0;
  private loopT = 0;
  private elapsed = 0;
  private pointer = new THREE.Vector2(9, 9);
  private pointerActive = false;
  private readonly screenCentre = new THREE.Vector3();
  private readonly trail: { x: number; y: number; born: number }[] = [];
  private readonly reducedMotion: boolean;
  private readonly size = new THREE.Vector2();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly renderer: THREE.WebGLRenderer,
    private readonly composer?: EffectComposer,
    private readonly ensureOutputPassLast?: () => void,
  ) {
    this.spriteMaterial = createMatterMaterial(this.uniforms);
    this.points = new THREE.Points(new THREE.BufferGeometry(), this.spriteMaterial);
    this.points.visible = false;
    this.points.scale.setScalar(FRAMED_RADIUS);
    this.points.renderOrder = 1;
    scene.add(this.points);
    this.uniforms.uFloor.value = FLOOR;
    // World sizes from the prototype, scaled to the framed radius.
    this.uniforms.uSize.value = 0.022 * FRAMED_RADIUS;
    if (composer && camera instanceof THREE.PerspectiveCamera) {
      this.fluid = new FluidPass(camera, this.uniforms);
      this.fluid.liquidUniforms.uRadius.value = 0.062 * FRAMED_RADIUS;
      this.fluid.enabled = false;
      composer.insertPass(this.fluid, 1); // straight after the scene render, before effects
      ensureOutputPassLast?.();
    } else {
      this.fluid = null;
    }
    this.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  get active(): boolean {
    return this.settings !== null;
  }

  /** The shape's own geometry (unframed), id and params. Call again after a hot geometry update. */
  setShape(geometry: THREE.BufferGeometry, shapeId: string, params: Record<string, unknown>): void {
    const changed = this.source?.geometry !== geometry;
    this.source = { geometry, shapeId, params };
    this.geometryVersion++;
    geometry.computeBoundingSphere();
    const bs = geometry.boundingSphere!;
    this.crack.uCenter.value.copy(bs.center);
    this.crack.uRadiusInv.value = bs.radius > 0 ? 1 / bs.radius : 1;
    // A new shape resamples now; edits to the same shape wait for the edit to settle.
    this.resampleAt = changed ? 0 : performance.now() + 150;
  }

  /** Adds the crack-away and cursor holes to a mesh material. Idempotent per material. */
  patchMaterial(material: THREE.Material): void {
    const tagged = material as THREE.Material & { __formaMatter?: true };
    if (tagged.__formaMatter) return;
    tagged.__formaMatter = true;
    const u = this.uniforms;
    const crack = this.crack;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, crack, {
        uPointer: u.uPointer, uAspect: u.uAspect, uPush: u.uPush, uStrength: u.uStrength, uReachK: u.uReachK, uTrail: u.uTrail,
      });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vMatterObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMatterObj = position;');
      shader.fragmentShader = shader.fragmentShader.replace(/void main\(\)\s*\{/, `
uniform float uBreak, uAspect, uPush, uStrength, uReachK, uRadiusInv; uniform int uHoleMode; uniform vec2 uBuf, uPointer;
uniform vec3 uTrail[${WAKE_TRAIL_LENGTH}], uCenter; varying vec3 vMatterObj;
${MATTER_GLSL}
float matterHash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main() {
  // Breaking: the surface stays opaque but cracks away in ragged patches (never a
  // see-through shell with the particle form inside it).
  if(uBreak>0.){ vec3 q=(vMatterObj-uCenter)*uRadiusInv; float k=snoise(q*2.3)*.5+.5+snoise(q*7.5)*.12; if(k<uBreak) discard; }
  // Cursor holes: Push/Attract/Vortex loosen a little; Scatter and Wake open it.
  if(uHoleMode>0){
    vec2 ndc=gl_FragCoord.xy/uBuf*2.-1.; float h=0.;
    if(uHoleMode<=4) h=reachAt(ndc,uPointer,uAspect,uReachK)*uPush*(uHoleMode==4?1.:.45);
    if(uHoleMode==5){for(int i=0;i<${WAKE_TRAIL_LENGTH};i++){h=max(h,reachAt(ndc,uTrail[i].xy,uAspect,uReachK*1.4)*uTrail[i].z);}}
    vec2 f=gl_FragCoord.xy; float wob=sin(f.x*.11+sin(f.y*.05)*2.)*sin(f.y*.13+sin(f.x*.04)*2.);
    if(h*uStrength>.24+.1*wob+.05*matterHash(f)) discard;
  }`);
    };
    const previousKey = material.customProgramCacheKey.bind(material);
    material.customProgramCacheKey = () => `${previousKey()}|forma-matter`;
    material.needsUpdate = true;
  }

  /** Colours from the current mesh material, so matter matches the object it came from.
   * `palette` (bright, highlight, deep) overrides the colours derived from `color`. */
  setColor(color: THREE.Color, palette?: readonly [string, string, string]): void {
    const white = new THREE.Color(1, 1, 1);
    if (palette) {
      this.uniforms.uColA.value.set(palette[0]);
      this.uniforms.uColB.value.set(palette[1]);
      this.uniforms.uColC.value.set(palette[2]);
    } else {
      this.uniforms.uColA.value.copy(color).lerp(white, 0.35);
      this.uniforms.uColB.value.copy(color).lerp(white, 0.85);
      this.uniforms.uColC.value.copy(color).multiplyScalar(0.5);
    }
    const tint = palette ? new THREE.Color(palette[0]) : color;
    this.fluid?.setPalette(tint, tint.clone().multiplyScalar(0.15), white.clone().multiplyScalar(0.55));
  }

  apply(settings: MatterSettings | undefined): void {
    const wasActive = this.settings !== null;
    this.settings = settings ?? null;
    if (!this.settings) {
      this.points.visible = false;
      if (this.fluid) this.fluid.enabled = false;
      this.crack.uBreak.value = 0;
      this.crack.uHoleMode.value = 0;
      return;
    }
    if (!wasActive) this.formNow = FORM_STATE[this.settings.form]; // appear in place, don't ease in from Solid
    const u = this.uniforms;
    u.uStrength.value = this.settings.strength;
    u.uReachK.value = 1 / (this.settings.radius * this.settings.radius);
  }

  setPointer(ndc: { x: number; y: number } | null): void {
    if (!ndc) { this.pointerActive = false; return; }
    this.pointer.set(ndc.x, ndc.y);
    this.pointerActive = true;
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - ndc.x, last.y - ndc.y) > 0.035) {
      this.trail.push({ x: ndc.x, y: ndc.y, born: this.elapsed });
      if (this.trail.length > WAKE_TRAIL_LENGTH) this.trail.shift();
    }
  }

  /** Per frame, before rendering. `dt` and `elapsed` in seconds. */
  update(dt: number, elapsed: number): void {
    this.elapsed = elapsed;
    const s = this.settings;
    if (!s || !this.source) return;
    this.resampleIfNeeded(s);
    const u = this.uniforms;

    // Disperse: from the slider, a 9 s breathe, or the pointer's distance from the
    // object's centre on screen (not the canvas centre: framing can shift it clear of a panel).
    if (s.motion === 'loop' && !this.reducedMotion) {
      this.loopT = (this.loopT + dt / 9) % 1;
      const p = this.loopT;
      this.disperseNow = p < 0.18 ? 0 : p < 0.45 ? ease((p - 0.18) / 0.27) : p < 0.7 ? 1 : p < 0.97 ? 1 - ease((p - 0.7) / 0.27) : 0;
    } else if (s.motion === 'hover' && !this.reducedMotion) {
      const centre = this.screenCentre.set(0, 0, 0).project(this.camera);
      const target = this.pointerActive ? clamp01(1.25 - Math.hypot(this.pointer.x - centre.x, this.pointer.y - centre.y) * 1.6) : 0;
      this.disperseNow += (target - this.disperseNow) * Math.min(1, dt * 2.2);
    } else {
      this.disperseNow = s.disperse;
    }
    const target = FORM_STATE[s.form];
    this.formNow += (target - this.formNow) * Math.min(1, dt * 3);
    if (Math.abs(target - this.formNow) < 0.01) this.formNow = target; // arrive exactly: a sliver of Liquid would leave its surface on
    const w = matterFormWeights(this.formNow);
    const d = this.disperseNow;

    this.renderer.getSize(this.size);
    const tanHalf = this.camera instanceof THREE.PerspectiveCamera ? Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) : 1;
    u.uScale.value = this.size.y / (2 * tanHalf);
    u.uPixelRatio.value = this.renderer.getPixelRatio();
    u.uAspect.value = this.size.x / Math.max(this.size.y, 1);
    this.renderer.getDrawingBufferSize(this.crack.uBuf.value);
    u.uTime.value = this.reducedMotion ? 0 : elapsed;
    u.uState.value = this.formNow;
    u.uDisperse.value = d;
    u.uPointer.value.copy(this.pointer);
    u.uPush.value += ((this.pointerActive && !this.reducedMotion ? 1 : 0) - u.uPush.value) * Math.min(1, dt * 4);
    const cursor = this.reducedMotion ? 'off' : s.cursor;
    u.uMode.value = MatterCursor[cursor];
    this.crack.uHoleMode.value = cursor === 'off' ? 0 : MatterCursor[cursor] + 1;
    for (let i = 0; i < WAKE_TRAIL_LENGTH; i++) {
      const mark = this.trail[this.trail.length - 1 - i];
      const life = mark && cursor === 'wake' ? clamp01(1 - (elapsed - mark.born) / TRAIL_LIFE) : 0;
      u.uTrail.value[i]!.set(mark ? mark.x : 9, mark ? mark.y : 9, ease(life));
    }

    // Solid cracks away over the first third of Disperse; changing Form dissolves it too.
    this.crack.uBreak.value = Math.min(1.2, Math.max((d / 0.33) * 1.2, (1 - w.solid) * 1.2));

    const density = DENSITY[s.density];
    const drawn = Math.round(density * (1 + (GAS_EXTRA - 1) * w.gas));
    this.points.geometry.setDrawRange(0, drawn);
    this.points.visible = true;
    const gain = Math.sqrt(25_000 / drawn);
    u.uOpacity.value = gain * (0.035 + 0.2 * Math.max(Math.min(1, d * 2.5), w.gas * 0.8)) * (1 + w.gas * d * 0.5);
    if (this.fluid) {
      this.fluid.enabled = w.liquid > 0.01;
      this.fluid.mix = w.liquid;
      this.fluid.time = elapsed;
      this.fluid.shimmer = w.liquid * ease(clamp01((d - 0.6) / 0.4));
    }
  }

  /** The sampled particles, in the shape's unit space (test/introspection hook). */
  get particleGeometry(): THREE.BufferGeometry {
    return this.points.geometry;
  }

  /** Whether the mesh should draw at all this frame (it is fully cracked away otherwise). */
  get meshVisible(): boolean {
    return this.crack.uBreak.value < 1.15;
  }

  private resampleIfNeeded(s: MatterSettings): void {
    const src = this.source!;
    const count = Math.round(DENSITY[s.density] * GAS_EXTRA);
    const current = this.sampledFor;
    const fresh = current && current.geometry === src.geometry && current.density === count && current.version === this.geometryVersion;
    if (fresh || performance.now() < this.resampleAt) return;
    const bs = src.geometry.boundingSphere!;
    const r = bs.radius > 0 ? bs.radius : 1;
    const fill = fillFor(src.shapeId, src.params, r);
    const g = fill.mode === 'normal'
      ? sampleMatter(src.geometry, count, { seed: 1, volumeDepth: Math.max(fill.depth, 0.001) })
      : sampleMatter(src.geometry, count, { seed: 1, volumeShare: 0, volumeDepth: 0.5 * r });
    // Into unit space around the shape's centre; the Points' scale puts it back on the mesh.
    for (const name of ['position', 'aChunkC']) {
      const a = g.getAttribute(name) as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) {
        a.setXYZ(i, (a.getX(i) - bs.center.x) / r, (a.getY(i) - bs.center.y) / r, (a.getZ(i) - bs.center.z) / r);
      }
    }
    if (fill.mode === 'center') {
      // A third of the particles move part-way toward the centre (same spread as the
      // normal push: most stay near the surface).
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      const rand = seededRandom(7);
      for (let i = 0; i < pos.count; i++) {
        if (rand() >= 0.33) continue;
        const k = 1 - rand() * rand() * 0.85;
        pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
      }
    }
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    this.points.geometry.dispose();
    this.points.geometry = g;
    this.fluid?.setGeometry(g);
    this.sampledFor = { geometry: src.geometry, density: count, version: this.geometryVersion };
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.spriteMaterial.dispose();
    if (this.fluid) {
      this.composer?.removePass(this.fluid);
      this.fluid.dispose();
    }
  }
}

import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';

/** Render layer the shadow camera sees. Only objects that should cast a contact shadow
 * enable it, so particles, the ground plane itself and helpers stay out of the shadow. */
export const SHADOW_CASTER_LAYER = 1;

export interface ContactShadowSettings {
  enabled: boolean;
  /** 0..1: how dark the shadow is directly under the object. */
  strength: number;
  /** 0..1: how far it blurs out. */
  softness: number;
}

/** A soft contact shadow taken from the object's real footprint (three.js's contact
 * shadows technique): an orthographic camera under the object renders it as darkness
 * that fades with height, the result is blurred, and it is shown on a ground plane just
 * below the object. It lives in world space, so it stays put while the camera orbits and
 * is part of any PNG export. */
export class ContactShadow {
  readonly plane: THREE.Mesh;
  private readonly target: THREE.WebGLRenderTarget;
  private readonly blurTarget: THREE.WebGLRenderTarget;
  private readonly camera: THREE.OrthographicCamera;
  private readonly depthMaterial: THREE.MeshDepthMaterial;
  private readonly hBlur: THREE.ShaderMaterial;
  private readonly vBlur: THREE.ShaderMaterial;
  private readonly blurPlane: THREE.Mesh;
  private readonly planeMaterial: THREE.MeshBasicMaterial;
  private readonly size = 4.2;
  // How far up the object counts toward the shadow: taller reaches a broader, grounding shadow.
  private readonly height = 2.6;
  private settings: ContactShadowSettings = { enabled: true, strength: 0.45, softness: 0.5 };
  private fade = 1;

  constructor(scene: THREE.Scene, resolution = 512) {
    this.target = new THREE.WebGLRenderTarget(resolution, resolution);
    this.target.texture.generateMipmaps = false;
    this.blurTarget = new THREE.WebGLRenderTarget(resolution, resolution);
    this.blurTarget.texture.generateMipmaps = false;

    this.planeMaterial = new THREE.MeshBasicMaterial({ map: this.target.texture, transparent: true, depthWrite: false, toneMapped: false });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), this.planeMaterial);
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.renderOrder = -1;
    this.plane.visible = false; // until the first render (embeds without a frame loop never show it)
    // The shadow image is rendered looking up, so flip it to read right side up from above.
    this.plane.scale.y = -1;
    scene.add(this.plane);

    this.camera = new THREE.OrthographicCamera(-this.size / 2, this.size / 2, this.size / 2, -this.size / 2, 0, this.height);
    this.camera.rotation.x = Math.PI / 2; // look up from the ground plane
    this.camera.layers.set(SHADOW_CASTER_LAYER);
    scene.add(this.camera);

    // Black, with alpha from depth: darkest at the ground, fading out by `height`.
    this.depthMaterial = new THREE.MeshDepthMaterial();
    this.depthMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.darkness = { value: 1 };
      shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );',
      )}`;
    };
    this.depthMaterial.depthTest = false;
    this.depthMaterial.depthWrite = false;

    this.hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    this.hBlur.depthTest = false;
    this.vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    this.vBlur.depthTest = false;
    this.blurPlane = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size));
    this.blurPlane.rotation.x = Math.PI / 2; // face the upward-looking camera
    this.blurPlane.visible = false;
    this.blurPlane.layers.set(SHADOW_CASTER_LAYER);
    scene.add(this.blurPlane);
  }

  set(settings: ContactShadowSettings): void {
    this.settings = { ...settings };
  }

  /** Puts the ground plane just under `object`'s world bounds. Call after its geometry or
   * framing changes. */
  placeUnder(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    const centre = box.getCenter(new THREE.Vector3());
    const y = box.min.y - 0.01;
    this.plane.position.set(centre.x, y, centre.z);
    this.camera.position.set(centre.x, y, centre.z);
    // Just inside the camera's near plane, or it is clipped.
    this.blurPlane.position.set(centre.x, y + 0.01, centre.z);
  }

  /** 0..1 multiplier on strength, e.g. as the solid surface cracks away under matter. */
  setFade(fade: number): void {
    this.fade = Math.min(1, Math.max(0, fade));
  }

  /** Renders the shadow for this frame. Skips quietly on renderers without WebGL. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const opacity = this.settings.enabled ? this.settings.strength * this.fade : 0;
    this.plane.visible = opacity > 0.001;
    if (!this.plane.visible || typeof renderer.setRenderTarget !== 'function') return;
    this.planeMaterial.opacity = Math.min(1, opacity * 2);

    const background = scene.background;
    const overrideMaterial = scene.overrideMaterial;
    const clearAlpha = renderer.getClearAlpha();
    const previousTarget = renderer.getRenderTarget();
    scene.background = null;
    scene.overrideMaterial = this.depthMaterial;
    renderer.setClearAlpha(0);
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, this.camera);
    scene.overrideMaterial = null;

    // Two rounds of separable blur, wider for higher softness.
    const amount = 1.5 + this.settings.softness * 11;
    this.blurPlane.visible = true;
    for (const round of [amount, amount * 0.4]) {
      this.blurPlane.material = this.hBlur;
      this.hBlur.uniforms.tDiffuse!.value = this.target.texture;
      this.hBlur.uniforms.h!.value = round / 256;
      renderer.setRenderTarget(this.blurTarget);
      renderer.render(this.blurPlane, this.camera);
      this.blurPlane.material = this.vBlur;
      this.vBlur.uniforms.tDiffuse!.value = this.blurTarget.texture;
      this.vBlur.uniforms.v!.value = round / 256;
      renderer.setRenderTarget(this.target);
      renderer.render(this.blurPlane, this.camera);
    }
    this.blurPlane.visible = false;

    renderer.setRenderTarget(previousTarget);
    renderer.setClearAlpha(clearAlpha);
    scene.background = background;
    scene.overrideMaterial = overrideMaterial;
  }

  dispose(): void {
    this.plane.removeFromParent();
    this.camera.removeFromParent();
    this.blurPlane.removeFromParent();
    this.plane.geometry.dispose();
    this.blurPlane.geometry.dispose();
    this.planeMaterial.dispose();
    this.depthMaterial.dispose();
    this.hBlur.dispose();
    this.vBlur.dispose();
    this.target.dispose();
    this.blurTarget.dispose();
  }
}

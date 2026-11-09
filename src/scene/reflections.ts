import * as THREE from 'three';

/** Builds a prefiltered environment map from an environment's own look, so reflective
 * materials (chrome, glass, gold) have a world to reflect in every environment, not
 * only the two that load an HDR. The map is a sphere showing the environment's
 * background, plus two soft-box panels (a key in the key light's colour and a cooler
 * rim) that put readable highlights on curved metal.
 *
 * Returns null where it can't be built (a headless renderer without WebGL), so callers
 * simply keep the environment's lights as the only lighting. */
export function createReflectionMap(
  renderer: THREE.WebGLRenderer,
  background: THREE.Color | THREE.Texture | null,
  keyColor: THREE.Color,
  /** 0..1 lightness of the backdrop. Dark backdrops get a horizon band and floor glow,
   * or a mirror finish reflects nothing and the object's body disappears. */
  backdropLuminance = 0.5,
): THREE.WebGLRenderTarget | null {
  const scene = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];
  try {
    const skyMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, toneMapped: false });
    if (background instanceof THREE.Texture) skyMaterial.map = background;
    else skyMaterial.color.copy(background ?? new THREE.Color(0x3a3d48));
    const skyGeometry = new THREE.SphereGeometry(10, 48, 24);
    disposables.push(skyMaterial, skyGeometry);
    scene.add(new THREE.Mesh(skyGeometry, skyMaterial));

    // Soft boxes: values above 1 survive into the half-float map, so they read as light
    // sources in reflections rather than as a pale patch of the background.
    const panelGeometry = new THREE.PlaneGeometry(1, 1);
    disposables.push(panelGeometry);
    const panel = (color: THREE.Color, w: number, h: number, pos: [number, number, number]) => {
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false });
      disposables.push(material);
      const mesh = new THREE.Mesh(panelGeometry, material);
      mesh.scale.set(w, h, 1);
      mesh.position.set(...pos);
      mesh.lookAt(0, 0, 0);
      scene.add(mesh);
    };
    panel(keyColor.clone().lerp(new THREE.Color(1, 1, 1), 0.5).multiplyScalar(2.4), 5, 3.5, [-5, 5, 5]);
    panel(new THREE.Color(0.75, 0.82, 1).multiplyScalar(1.3), 2, 6, [6, 1, -5]);

    const darkness = Math.min(1, Math.max(0, 1 - backdropLuminance / 0.3));
    if (darkness > 0) {
      const glow = keyColor.clone().lerp(new THREE.Color(1, 1, 1), 0.4);
      const bandMaterial = new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(0.55 * darkness), side: THREE.BackSide, toneMapped: false });
      const bandGeometry = new THREE.CylinderGeometry(9, 9, 1.6, 48, 1, true);
      const floorMaterial = new THREE.MeshBasicMaterial({ color: glow.clone().multiplyScalar(0.18 * darkness), side: THREE.DoubleSide, toneMapped: false });
      const floorGeometry = new THREE.CircleGeometry(8, 48);
      disposables.push(bandMaterial, bandGeometry, floorMaterial, floorGeometry);
      const band = new THREE.Mesh(bandGeometry, bandMaterial);
      band.position.y = -0.4;
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -4;
      scene.add(band, floor);
    }

    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromScene(scene, 0.03);
    pmrem.dispose();
    return target;
  } catch {
    return null;
  } finally {
    for (const d of disposables) d.dispose();
  }
}

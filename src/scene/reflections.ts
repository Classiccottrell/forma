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

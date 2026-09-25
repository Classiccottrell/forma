import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { shapeRegistry } from 'forma';
import type { ShapeCreateContext } from 'forma';
import type { DefinitionPickerEntry } from './DefinitionPicker';

interface ShapePreviewGridProps {
  entries: DefinitionPickerEntry[];
  selectedId: string;
  onSelect(id: string): void;
}

/** One renderer serves every visible cell; failed captures leave the CSS preview in place. */
export function ShapePreviewGrid({ entries, selectedId, onSelect }: ShapePreviewGridProps) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    let disposed = false;
    const next: Record<string, string> = {};
    let renderer: THREE.WebGLRenderer | undefined;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'low-power',
      });
      renderer.setSize(64, 64, false);
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xf4f0e8, 0x7b756b, 1.8));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(3, 4, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xd9d4ca, 1.2);
      fill.position.set(-4, 1, 2);
      scene.add(fill);
      const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
      const material = new THREE.MeshStandardMaterial({ color: 0xe6e0d6, roughness: 0.48, metalness: 0.02 });

      for (const entry of entries) {
        const geometries: THREE.BufferGeometry[] = [];
        const resources = { track(resource: THREE.BufferGeometry) { geometries.push(resource); } };
        let mesh: THREE.Mesh | undefined;
        try {
          const definition = shapeRegistry.require(entry.id);
          const geometry = definition.create(definition.defaultParameters as never, { registry: resources as unknown as ShapeCreateContext['registry'] });
          geometry.computeBoundingSphere();
          const sphere = geometry.boundingSphere;
          if (!sphere || !Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error('invalid preview bounds');
          mesh = new THREE.Mesh(geometry, material);
          mesh.position.copy(sphere.center).multiplyScalar(-1);
          scene.add(mesh);
          const distance = Math.max(sphere.radius * 2.7, 0.5);
          camera.position.set(distance * 0.72, distance * 0.48, distance);
          camera.lookAt(0, 0, 0);
          camera.near = Math.max(0.01, distance - sphere.radius * 2);
          camera.far = distance + sphere.radius * 2;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
          next[entry.id] = renderer.domElement.toDataURL('image/png');
        } catch {
          // CSS thumbnail remains the safe fallback for unsupported/custom shapes.
        } finally {
          if (mesh) scene.remove(mesh);
          for (const geometry of geometries) geometry.dispose();
        }
      }
      material.dispose();
    } catch {
      // WebGL can be unavailable in Safari privacy mode, tests, or low-power embeds.
    } finally {
      renderer?.dispose();
      renderer?.forceContextLoss();
    }

    if (!disposed) setPreviews(next);
    return () => { disposed = true; };
  }, [entries.map((entry) => entry.id).join('|')]);

  return (
    <div className="picker-grid" role="listbox" aria-label="shape options">
      {entries.length === 0 && <div className="empty-state">No shape options match this search.</div>}
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={`picker-cell${entry.id === selectedId ? ' selected' : ''}`}
          onClick={() => onSelect(entry.id)}
          title={entry.category}
          role="option"
          aria-selected={entry.id === selectedId}
          aria-label={`${entry.label}, ${entry.category}${entry.id === selectedId ? ', selected' : ''}`}
        >
          {previews[entry.id] ? (
            <img className="picker-thumb shape-preview" src={previews[entry.id]} alt="" aria-hidden="true" />
          ) : (
            <span className="picker-thumb" data-kind="shape" data-id={entry.id} aria-hidden="true" />
          )}
          <span className="picker-name">{entry.label}</span>
          <span className="picker-category">{entry.category}</span>
        </button>
      ))}
    </div>
  );
}

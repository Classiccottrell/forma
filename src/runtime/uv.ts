import * as THREE from 'three';

/** Adds deterministic spherical UVs only for custom geometry that omitted them. */
export function ensureGeometryUVs(geometry: THREE.BufferGeometry): boolean {
  if (geometry.getAttribute('uv')) return false;
  const position = geometry.getAttribute('position');
  if (!position) return false;

  geometry.computeBoundingSphere();
  const center = geometry.boundingSphere?.center ?? new THREE.Vector3();
  const radius = geometry.boundingSphere?.radius || 1;
  const uv = new Float32Array(position.count * 2);
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i).sub(center).divideScalar(radius);
    uv[i * 2] = 0.5 + Math.atan2(vertex.z, vertex.x) / (Math.PI * 2);
    uv[i * 2 + 1] = 0.5 - Math.asin(Math.max(-1, Math.min(1, vertex.y))) / Math.PI;
  }
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return true;
}

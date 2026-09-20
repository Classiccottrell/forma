import type { TexturePackManifest } from '../types.js';

export interface TexturePackCatalogEntry extends TexturePackManifest {
  notes: string;
  active: boolean;
}

/** Catalog metadata; only active entries are registry-native loadable packs. */
export const texturePackCatalog: readonly TexturePackCatalogEntry[] = [
  { id: 'paper-fiber', source: 'https://polyhaven.com/a/paper_rough', license: 'CC0 1.0', use: 'light paper grain', defaultIntensity: 0.2, notes: 'Quiet light grain for UI surfaces; staged pending local assets.', active: false },
  { id: 'linen-blue', source: 'https://polyhaven.com/a/rough_linen', license: 'CC0 1.0', use: 'cool woven accent', color: 'linen-blue/color.jpg', normal: 'linen-blue/normal.jpg', roughness: 'linen-blue/roughness.jpg', defaultIntensity: 0.28, notes: 'Local 1K review pack; blue treatment is applied by the material.', active: true },
  { id: 'glass-noise', source: 'https://polyhaven.com/', license: 'CC0 1.0', use: 'subtle translucent breakup', defaultIntensity: 0.08, notes: 'Metadata placeholder; select a low-frequency noise source before activation.', active: false },
  { id: 'book-pattern', source: 'https://polyhaven.com/a/book_pattern', license: 'CC0 1.0', use: 'quiet woven book-cover fabric', color: 'book-pattern/color.jpg', normal: 'book-pattern/normal.jpg', roughness: 'book-pattern/roughness.jpg', defaultIntensity: 0.22, notes: 'Local 1K review pack; preserve authored material color while applying surface maps.', active: true },
  { id: 'fine-grained-wood', source: 'https://polyhaven.com/a/fine_grained_wood', license: 'CC0 1.0', use: 'subtle authored wood grain', color: 'fine-grained-wood/color.jpg', normal: 'fine-grained-wood/normal.jpg', roughness: 'fine-grained-wood/roughness.jpg', defaultIntensity: 0.3, notes: 'Local 1K review pack; preserve authored material color while applying surface maps.', active: true },
  { id: 'brushed-metal', source: 'https://polyhaven.com/a/metal_plate_02', license: 'CC0 1.0', use: 'high-contrast industrial accent', color: 'brushed-metal/color.jpg', normal: 'brushed-metal/normal.jpg', roughness: 'brushed-metal/roughness.jpg', defaultIntensity: 0.35, notes: 'Local 1K review pack; keep out of default UI backgrounds.', active: true },
  { id: 'mineral-matte', source: 'https://polyhaven.com/a/granular_concrete', license: 'CC0 1.0', use: 'quiet mineral matte breakup', color: 'mineral-matte/color.jpg', normal: 'mineral-matte/normal.jpg', roughness: 'mineral-matte/roughness.jpg', defaultIntensity: 0.24, notes: 'Local 1K review pack; reserved for material studies.', active: true },
];

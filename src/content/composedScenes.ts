import type { Composition } from '../types.js';
import type { EmbedView } from '../runtime/embedPlayer.js';
import { composition } from './presets.js';

/** linefield pieces that take part in the page current: they make room for a Forma
 * object and publish the flow its matter rides. Any other piece still works as a
 * background; it just doesn't react. `anchor` is where the object sits in each, `fill`
 * its size there, and `flowGain` how far that piece's flow carries dispersed matter. */
export const LINEFIELD_PIECES = {
  'flow-field': { title: 'Flow Field', anchor: { x: 0.58, y: 0.46 }, fill: 0.34, flowGain: 1.1 },
  'grain-field': { title: 'Grain Field', anchor: { x: 0.66, y: 0.48 }, fill: 0.3, flowGain: 0.38 },
  funnel: { title: 'Funnel', anchor: { x: 0.56, y: 0.3 }, fill: 0.22, flowGain: 1.3 },
} as const;
export type LinefieldPiece = keyof typeof LINEFIELD_PIECES;

/** A Forma object and a linefield background that belong together: which piece, the
 * values to set on it, the object, and how it sits on the page. */
export interface ComposedScene {
  id: string;
  name: string;
  blurb: string;
  piece: LinefieldPiece;
  /** Values over the ones the piece is baked with. */
  linefield: Record<string, number | string | boolean>;
  composition: Composition;
  view: EmbedView;
  /** How far the background's flow carries dispersed matter, in viewport heights. */
  flowGain: number;
}

/** The composed showcase scenes. Call after `registerAllContent()`. */
export function composedScenes(): ComposedScene[] {
  return [
    {
      id: 'riding-the-current',
      name: 'Riding the Current',
      blurb: 'A form in the quiet eye of Flow Field. Come near and it lets go: its matter joins the ribbons and the lines run through where it stood.',
      piece: 'flow-field',
      linefield: {},
      composition: composition({ shapeId: 'soft-blob', materialId: 'chrome', environmentId: 'studio', matter: { form: 'gas', motion: 'hover', cursor: 'vortex', density: 'medium' } }),
      view: { anchor: LINEFIELD_PIECES['flow-field'].anchor, fill: 0.34, spin: 6 },
      flowGain: 1.1,
    },
    {
      id: 'thinning-into-dust',
      name: 'Thinning into Dust',
      blurb: 'Grain Field gathers around a solid shape, parted by its edge. The shape breathes out into gas and the dust closes in to meet it.',
      piece: 'grain-field',
      linefield: { density: 1.5 },
      composition: composition({ shapeId: 'dodecahedron', materialId: 'pearl', environmentId: 'softbox', matter: { form: 'gas', motion: 'loop', cursor: 'attract', density: 'medium' } }),
      view: { anchor: { x: 0.66, y: 0.48 }, fill: 0.3, spin: 8, elevation: 12 },
      flowGain: 0.38,
    },
    {
      id: 'into-the-well',
      name: 'Into the Well',
      blurb: 'A stone rests in the mouth of Funnel. It cracks, crumbles, and the dust is drawn down the throat to the point where every ring meets.',
      piece: 'funnel',
      linefield: { scale: 0.95 },
      composition: composition({ shapeId: 'diamond', materialId: 'ice', environmentId: 'studio', matter: { form: 'solid', motion: 'loop', cursor: 'wake', density: 'medium' } }),
      view: { anchor: LINEFIELD_PIECES.funnel.anchor, fill: 0.22, spin: 10, elevation: 8 },
      flowGain: 1.3,
    },
  ];
}

// Types for current.js, the page current: a file shared verbatim with linefield
// (`shared/current.js` there). The contract is documented at the top of that file.

export declare const CURRENT_VERSION: 1;
export declare const CURRENT_CHANNELS: readonly ['cursor', 'body', 'palette', 'field'];
export declare const CURRENT_PRESETS: readonly ['whisper', 'ink', 'neon', 'drift', 'dense'];
export declare const CURRENT_CURSOR_MODES: readonly ['push', 'attract', 'vortex', 'scatter', 'wake', 'off'];

export type CurrentCursorMode = (typeof CURRENT_CURSOR_MODES)[number];
export type CurrentPresetName = (typeof CURRENT_PRESETS)[number];
export type Rgb = readonly [number, number, number];

/** Everything is in CSS pixels of the viewport, y down. */
export interface CurrentPointer { x: number; y: number; active: boolean }
export interface CurrentCursor { mode: CurrentCursorMode; strength: number; reach: number }
export interface CurrentBody { x: number; y: number; r: number; disperse: number; form: 'solid' | 'liquid' | 'gas' }
export interface CurrentPalette { a: Rgb; b: Rgb; dark: boolean; name?: CurrentPresetName | null }
export interface CurrentField {
  /** Writes a direction (y down, length 0..1) into `out` and returns it. */
  sample(x: number, y: number, t: number, out: [number, number]): [number, number];
}

export interface CurrentChannels {
  cursor: CurrentCursor;
  body: CurrentBody;
  palette: CurrentPalette;
  field: CurrentField;
}

export interface CurrentMember {
  readonly name: string;
  /** True while a member with another name is on the page. */
  readonly accompanied: boolean;
  publish<K extends keyof CurrentChannels>(channel: K, value: CurrentChannels[K] | null): void;
  leave(): void;
}

export interface PageCurrent {
  readonly version: number;
  readonly pointer: CurrentPointer;
  readonly cursor: CurrentCursor | null;
  readonly body: CurrentBody | null;
  readonly palette: CurrentPalette | null;
  readonly field: CurrentField | null;
  readonly members: string[];
  now(): number;
  has(name: string): boolean;
  join(name: string): CurrentMember;
  cursorAt(x: number, y: number, out: [number, number]): [number, number];
  flowAt(x: number, y: number, t: number, out: [number, number]): [number, number];
}

export declare function pageCurrent(): PageCurrent;

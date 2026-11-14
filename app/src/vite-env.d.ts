/// <reference types="vite/client" />

/** Forma's package version, injected by app/vite.config.ts; names the hosted embed bundle. */
declare const __FORMA_VERSION__: string;

declare module 'virtual:forma-scenes' {
  /** The composed showcase scenes, each built as `scenes/<id>.html` (app/vite.config.ts). */
  export const scenes: readonly { id: string; name: string; blurb: string; piece: string }[];
}

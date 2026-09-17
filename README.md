# Forma (ShapeLab)

Typed shape/material/environment/effect composition engine built on `cc-webgl`.
Architecture: see `.architect-blueprint.md`.

## Setup

```bash
npm install   # cc-webgl consumed as file:../cc-webgl; three pinned to ^0.185.1
cd app && npm install   # editor product app — its own package.json, React + forma (file:..)
```

## Scripts (library — `Projects/Forma/`)

- `npm run dev` — serves `harness/` (live switching UI, JSON round-trip, PNG export, embed-code, leak-check button + HUD) at the printed localhost URL.
- `npm run build` — `tsc --emitDeclarationOnly && vite build`, library output to `dist/`. Run this before `app/`'s typecheck/build — the app resolves `forma`/`forma/content` through `dist/` in production (dev mode aliases straight to `src/` for iteration speed, see `app/vite.config.ts`).
- `npm test` — vitest (happy-dom, logic-only, no WebGL). Includes a ≥40-cycle leak-check run (`tests/leak-check.test.ts`) against a stratified 360-combo sample of the content set (18 shapes × 15 materials × 6 environments, M2 scale — a full cartesian product is 1620 combos, too slow to cycle repeatedly), asserting the merged `FormaRuntime.report()` total returns to its post-warm-up baseline every cycle. `svg-extrude` is excluded from the leak-check/smoke-test shape lists (happy-dom's `DOMParser` doesn't support `image/svg+xml`); it's covered instead by headless-browser Playwright checks. `tests/content-smoke.test.ts` separately guards that every shape/material creates cleanly from its own defaults.
- `npm run typecheck` — `src/` only.
- `npm run typecheck:harness` — `harness/` (excluded from the published package, mirrors `cc-webgl/example/`).

## Scripts (product app — `Projects/Forma/app/`)

- `npm run dev` — Vite dev server for the real editor UI (`ControlPanel`, `Viewport` with orbit/auto-spin, PNG export, Copy Code). Requires the library's own `npm install` to have run first (sibling `node_modules`).
- `npm run build` — `tsc --noEmit && vite build`; requires the library's `npm run build` to have run first so `forma`'s `dist/` exists for the production resolve path.
- `npm run typecheck` — `app/` only.

`app/` is a separate consumer of the published `forma` package (`"forma": "file:.."` in `app/package.json`) — `src/` itself stays framework-agnostic, no React dependency inside the library.

### Editor UX (M3)

- **Search** (`ControlPanel`'s search box) filters shape/material/environment/effect picker grids live; a section with a match auto-expands while searching, without disturbing the user's manual collapse/expand state.
- **Keyboard shortcut**: `H` toggles the control panel. Inert while a text input/textarea/select/contenteditable has focus (search box, SVG-paste textarea) and requires no modifier keys (so it never collides with a browser/OS shortcut).
- **Reset actions**: "↺ Reset" (topbar) restores the default sphere/matte/studio composition; "⌂ Reset view" (viewport toolbelt) restores the default camera orbit — including clearing residual OrbitControls damping momentum, which `OrbitControls.reset()` alone does not do (see code comment in `app/src/components/Viewport.tsx`).
- **Mobile**: panel defaults collapsed under 640px width, goes full-width when opened; topbar wraps; OrbitControls' built-in touch handling drives orbit/zoom.
- **`prefers-reduced-motion`**: auto-spin toggle is disabled outright when the OS preference is set (`app/src/hooks/useReducedMotion.ts`).
- **Onboarding**: a small dismissible hint ("drag to orbit…") shows on first load only, tracked via `localStorage`.
- Verification: `app/e2e/verify-m3.mjs` is a real headless-Playwright script (not a checked-in test framework — no e2e harness existed before this pass) covering all six items above. Run `npm run dev -- --port 5183 --strictPort` in `app/`, then `node e2e/verify-m3.mjs` in a second shell.

## Known deviations from `.architect-blueprint.md`

1. **PNG export mechanism (§5.4).** The blueprint's literal mechanism — enqueue a
   one-shot `FrameTask` on `SceneManager`'s `FrameScheduler` — is not reachable:
   `SceneManager.scheduler` is a private field with no accessor. `exportPNG()`
   instead calls `renderer.render(...)` and `canvas.toBlob(...)` in the same
   synchronous block; `toBlob` snapshots the drawing buffer synchronously at call
   time, so no `preserveDrawingBuffer` / RAF-timing race exists between the two
   statements. See `src/export/exportPNG.ts`.
2. **Gradient textures use `THREE.DataTexture`, not `THREE.CanvasTexture`.** Both
   `src/content/materials.ts` (toon gradient map) and `src/content/environments.ts`
   (gradient-sky background) build their texture from raw pixel data rather than a
   2D canvas context, so the full pipeline — including the leak-check — runs
   headless under vitest+happy-dom without a real browser 2D context.
3. **`defineShape`/`defineMaterial`/`defineEnvironment`/`defineEffect` identity
   helpers** (`src/registry/instances.ts`) were added, not in the blueprint's file
   list. Without them, a `const x: ShapeDefinition = {...}` literal widens its
   generic to `ShapeDefinition<ParamSchemaMap>` and the discriminated `kind` field
   loses literal narrowing — typechecks but the typing is worthless. Every harness
   definition is authored through these helpers with no type annotation instead.
4. **`src/registry/instances.ts`** hosts the four `DefinitionRegistry` singletons
   (blueprint §2 describes them as part of the registry's public shape but doesn't
   name a file). Kept separate from `DefinitionRegistry.ts` (the generic class) to
   avoid a circular import between `runtime/diff.ts` (needs the singletons) and
   `index.ts` (which re-exports everything).
5. **`harness/leak-check.ts`'s `runLeakCheck()`** is a pure function of
   `(runtime, combos, ...)` with no DOM/GL dependency, so it is imported by both
   `harness/main.ts` (browser HUD) and `tests/leak-check.test.ts` (real ≥50-cycle
   numeric proof, no mocking) — the same code path, not a reimplementation for tests.
6. **`mountForma()`** (`src/index.ts`) — a convenience one-shot mount used by
   `generateEmbedCode()`'s output — was added so the generated embed snippet is
   directly runnable; not named in the blueprint's literal file list. Since M0 it
   builds on the shared `createFormaScene()` bootstrap (`src/scene/`), the same one
   `harness/main.ts` uses — see BRIEF.md Constraints.
7. **Content lives in `src/content/**`** (shapes/materials/environments/effects),
   published via the `./content` `exports` subpath and consumed via an explicit
   `registerAllContent()` call — not a side-effect import, since
   `package.json`'s `"sideEffects": false` would let a bundler drop a bare
   `import 'forma/content'` with no observable effect. `harness/main.ts` and any
   generated embed snippet both call `registerAllContent()` explicitly.

## Manual verification checklist (harness, `npm run dev`)

Confirmed via headless Playwright (chromium) against a live `npm run dev` server,
2026-09-17 (see BRIEF.md Status log for detail):

- [x] Switch shape / material / environment buttons — mesh updates live, no page
      errors. (Automated leak-check below is stronger evidence than a manual click
      through all 4×4×2 = 32 combinations — it exercises every combination
      programmatically.)
- [x] "Copy JSON" then "Paste JSON -> Apply" round-trips the current composition.
- [x] "Export PNG" downloads a PNG; on-screen readout reports whether an alpha < 255
      pixel was found in the exported blob (readout mechanism itself confirmed
      working — the `studio` environment's opaque background means `false` is the
      expected value for the default composition, not a failure).
- [x] "Copy Embed Code" produces a real, runnable snippet (`mountForma` +
      `registerAllContent` imports resolve through `package.json`'s `exports` map;
      no more broken `forma/harness-content` import).
- [x] "Run Leak Check (>=50 cycles)" HUD reports `PASS` with `maxEndTotal === baseline`.

## M1 additions (editor MVP, 2026-09-17)

- **`app/`** — real React ControlPanel UI: collapsible Shape/Material/Environment/
  Effects/Export sections, searchable picker grids, generic schema-driven
  `ParamControl` (`app/src/components/ParamControl.tsx` — dispatches on
  `ParamSchema.kind`, zero per-definition UI code), OrbitControls + auto-spin toggle
  (`prefers-reduced-motion`-aware), PNG export with target size, Copy Code.
- **Content expanded to MVP scale**: 10 shapes / 8 materials / 3 environments / 2
  effects (`src/content/*.ts`) — see roadmap §3 for the full list and technique notes
  (deterministic value-noise for `soft-blob`, `toNonIndexed()` faceting for `gem`,
  procedural `DataTexture`s for `carbon`/`neon-room`, no external asset pipeline).
- **Post-processing composer**: `createFormaScene()` now owns a shared
  `THREE.EffectComposer` (`RenderPass` always present); `FormaRuntime` passes it to
  `EffectCreateContext` so a pass-based effect (`duotone`) can `addPass`/`removePass`
  itself. Both the live render loop and `exportPNG()` render through the *same*
  composer — required so an active effect doesn't silently vanish from PNG export.
- **`exportPNG()` signature changed** (breaking, M1): now
  `exportPNG({ renderer, scene, camera, composer? }, { width?, height?, transparentBackground? })`
  instead of positional `(renderer, scene, camera)`. Defaults to nulling
  `scene.background` for the capture and restoring it after — needed because several
  environments (e.g. `studio`) set an opaque `scene.background`, which would
  otherwise silently defeat "transparent PNG export."

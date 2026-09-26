# Forma (ShapeLab)

Typed shape/material/texture/environment/effect composition engine built on `cc-webgl`.
Architecture: see `.architect-blueprint.md`.

The product app uses `cc-webgl`'s `FrameScheduler` for its single render loop;
the scheduler pauses hidden tabs and clamps post-background delta time.

## Setup

```bash
npm install   # cc-webgl consumed as file:../cc-webgl; three pinned to ^0.185.1
cd app && npm install   # editor product app — its own package.json, React + forma (file:..)
```

## Scripts (library — `Projects/Forma/`)

- `npm run dev` — serves `harness/` (live switching UI, JSON round-trip, PNG export, embed-code, leak-check button + HUD) at the printed localhost URL.
- `npm run build` — emits the library plus versioned `dist/forma.browser.v<package-version>.js` IIFE. Run this before `app/`'s typecheck/build — the app resolves `forma`/`forma/content` through `dist/` in production (dev mode aliases straight to `src/` for iteration speed, see `app/vite.config.ts`).
- `npm test` — vitest (happy-dom, logic-only, no WebGL). Includes a ≥50-cycle leak-check run (`tests/leak-check.test.ts`) against a stratified 360-combo sample of the content set (31 shapes × 20 materials × 6 environments, H3 scale — a full cartesian product is 3720 combos, too slow to cycle repeatedly), asserting the merged `FormaRuntime.report()` total returns to its post-warm-up baseline every cycle. `svg-extrude` is excluded from the leak-check/smoke-test shape lists (happy-dom's `DOMParser` doesn't support `image/svg+xml`); it's covered instead by headless-browser Playwright checks. `tests/content-smoke.test.ts` separately guards that every shape/material/texture creates cleanly from its own defaults.
- `npm run typecheck` — `src/` only.
- `npm run typecheck:harness` — `harness/` (excluded from the published package, mirrors `cc-webgl/example/`).

## Scripts (product app — `Projects/Forma/app/`)

- `npm run dev` — Vite dev server for the real editor UI (`ControlPanel`, `Viewport` with orbit/auto-spin, PNG export, Copy Code). Requires the library's own `npm install` to have run first (sibling `node_modules`).
- `npm run build` — `tsc --noEmit && vite build`; requires the library's `npm run build` to have run first so `forma`'s `dist/` exists for the production resolve path.
- `npm run typecheck` — `app/` only.

`app/` is a separate consumer of the published `forma` package (`"forma": "file:.."` in `app/package.json`) — `src/` itself stays framework-agnostic, no React dependency inside the library.

### Current H3 roadmap status

The H3 polish slice remains active across the 32-shape catalog. Remaining work includes
picker reference-card polish, broader content expansion, lifecycle hardening, and final
browser QA. Reference-driven next slices add control taxonomy, material settings,
lighting direction, ordered effect stages, presentation controls, and history/export
workflow. Generic SVG import remains a separate upload path.

The first reference-driven UI slice is complete: Shape now supports All/Solid/Flat/Yours
filters, and Presentation exposes lens, turn, tilt, and zoom controls.

Material now also has Library/Settings views with registry-backed surface presets.

The versioned browser bundle contract is `dist/forma.browser.v<package-version>.js`. Copy that file beside generated embed HTML, or pass a hosted URL
to `generateEmbedCode(composition, { libraryUrl })`. See `examples/embed/index.html` for a local example.

### Texture pack delivery

`TexturePackManifest` and `TexturePackLoader` provide a host-controlled asset
contract. Call `loadTexturePack(manifest, explicitBaseUrl)` for the selected pack;
only declared color/normal/roughness maps load, URLs are cached, and the returned
pack exposes `dispose()`. `FormaRuntimeOptions.textureBaseUrl` enables the same
async replacement path while omitted URLs retain synchronous/headless procedural
fallbacks. The app passes its explicit `/textures/` base URL. Local 1K packs are
attributed to their Poly Haven source URLs in `src/content/texturePacks.ts`; the
`paper-fiber` and `glass-noise` entries remain metadata-only until assets are staged.

Local review: run `npm run build` at the library root, then `cd app && npm run dev`.
Select Linen Blue, Brushed Metal, or Mineral Matte in the Texture picker and verify
the three maps load from `app/public/textures/`; failed requests leave the
procedural preview active.

The catalog also records Poly Haven's Book Pattern and Fine Grained Wood packs;
they remain inactive metadata-only entries until their local 1K maps are staged.

Pack color maps are intentionally material-aware: Linen Blue may tint the authored
surface, while Brushed Metal and Mineral Matte provide normal/roughness detail only.
Pack UV scale defaults to 2; runtime shape creation supplies stable spherical UVs only
when a geometry has none.

The app keeps its restrained dusk-sky image as the visible viewport backdrop.
Studio and Softbox use the staged `environments/studio-small-01.hdr` only for
true PMREM image-based lighting (IBL) reflections on metal and glass. The HDR is
a 1K CC0 asset sourced from [Poly Haven Studio Small 01](https://polyhaven.com/a/studio_small_01).
The CSS backdrop and `scene.environment` are separate, so transparent PNG exports
stay transparent; hosts must pass `FormaRuntimeOptions.environmentBaseUrl` to enable
HDR loading, while omitted URLs retain the synchronous light fallback.

### Editor UX (M3)

- **Search** (`ControlPanel`'s search box) filters shape/material/texture/environment/effect picker grids live; a section with a match auto-expands while searching, without disturbing the user's manual collapse/expand state.
- **Keyboard shortcut**: `H` toggles the control panel. Inert while a text input/textarea/select/contenteditable has focus (search box, SVG-paste textarea) and requires no modifier keys (so it never collides with a browser/OS shortcut).
- **Reset actions**: "↺ Reset" (topbar) restores the default sphere/matte/studio composition; "⌂ Reset view" (viewport toolbelt) restores the default camera orbit — including clearing residual OrbitControls damping momentum, which `OrbitControls.reset()` alone does not do (see code comment in `app/src/components/Viewport.tsx`).
- **Mobile**: panel defaults collapsed under 640px width, goes full-width when opened; topbar wraps; OrbitControls' built-in touch handling drives orbit/zoom.
- **`prefers-reduced-motion`**: auto-spin toggle is disabled outright when the OS preference is set (`app/src/hooks/useReducedMotion.ts`).
- **Onboarding**: a small dismissible hint ("drag to orbit…") shows on first load only, tracked via `localStorage`.
- Verification: `app/e2e/verify-m3.mjs` is a real headless-Playwright script (not a checked-in test framework — no e2e harness existed before this pass) covering all six items above. Run `npm run dev -- --port 5183 --strictPort` in `app/`, then `node e2e/verify-m3.mjs` in a second shell.

## Deployment

`app/` builds to a static site (`npm run build` -> `app/dist/`, no server-side
code). See `app/README.md`'s "Deployment" section for full walkthroughs
(GitHub Pages, Cloudflare Pages, Vercel), including the `FORMA_BASE` env var
GitHub Pages *project* sites need (`app/vite.config.ts` sets
`base: process.env.FORMA_BASE ?? '/'` — a config addition made in the M4 docs
pass, since no `base` config existed before and a project-site deploy would
have 404'd on assets). A GitHub Actions workflow
(`.github/workflows/deploy-gh-pages.yml`) publishes `app/dist/` to
`https://classiccottrell.github.io/forma/` on push to `main`. It checks out
`cc-webgl` as a sibling of `forma/` (the `file:../cc-webgl` dependency) and
builds it first. Requires Settings -> Pages -> Source = "GitHub Actions", and
while `Classiccottrell/cc-webgl` is private, a `CC_WEBGL_TOKEN` repo secret
(fine-grained PAT, read-only Contents on that repo); once it is public the
workflow falls back to the default token. The base-path build and a headless
load of it were verified locally; the **GitHub Actions run itself is
unverified** — no live runner was available, so check the first run's logs.

## Browser support & performance

- **WebGL2 required.** `three` is pinned to `^0.185.1`;
  `src/scene/createFormaScene.ts` constructs a plain `THREE.WebGLRenderer` with
  no WebGL1 fallback. Any evergreen desktop/mobile browser with WebGL2 works.
- **Mobile**: verified working in M3 (touch orbit/zoom via OrbitControls,
  responsive collapsed panel under 640px — see "Editor UX (M3)" above).
- **Bundle size**: `app/`'s production build is a single ~812 KB JS chunk
  (~219 KB gzipped), which triggers Vite/Rollup's default >500KB chunk-size
  warning. This is a single-page tool with one route and no lazy-loadable
  sub-pages — the whole app *is* "above the fold." Code-splitting (dynamic
  `import()`, `manualChunks`) would add complexity (loading states, waterfall
  requests) for a tool where the user already waits once on first load and
  then interacts entirely client-side with no navigation. Treated as an
  explicit non-goal, not deferred work.
- **SVG extrusion cap**: uploaded SVGs over 100KB are rejected in favor of the
  built-in default glyph (M2) — prevents pathological `ExtrudeGeometry` cost
  from adversarial input.
- **`svg-extrude` test coverage gap**: excluded from `tests/leak-check.test.ts`
  and `tests/content-smoke.test.ts`'s automated shape lists because happy-dom's
  `DOMParser` doesn't support `image/svg+xml` parsing (returns a null
  `documentElement` — a happy-dom limitation, not a Forma bug). Covered instead
  by real headless-browser Playwright checks (see M2 log entry in `BRIEF.md`).

## Contributing

See `CONTRIBUTING.md` — local setup, the `defineShape`/`defineMaterial`/
`defineEnvironment`/`defineEffect` + registry pattern for adding content,
testing philosophy (real headless-browser verification required for UI/render
claims, not just typecheck), and PR expectations. MIT licensed (`LICENSE`).

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
   `generateEmbedCode()`'s output. Disposing the returned runtime also disposes
   the owned renderer and resize observer. Since M0 it builds on the shared
   `createFormaScene()` bootstrap (`src/scene/`), the same path the harness uses.
7. **Content lives in `src/content/**`** (shapes/materials/textures/environments/effects),
   published via the `./content` `exports` subpath and consumed via an explicit
   `registerAllContent()` call — not a side-effect import, since
   `package.json`'s `"sideEffects": false` would let a bundler drop a bare
   `import 'forma/content'` with no observable effect. `harness/main.ts` and any
   generated embed snippet both call `registerAllContent()` explicitly. See
   `CONTRIBUTING.md`'s "How code export works" section for the full
   `generateEmbedCode()`/`embed.ts` walkthrough.

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
- [x] "Copy Embed Code" produces a package-consumer snippet (`mountForma` +
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

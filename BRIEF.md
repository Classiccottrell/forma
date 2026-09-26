# BRIEF — Forma (ShapeLab)

## Goal
Forma is a free, open-source, browser-based/self-hostable 3D shape playground — an
original implementation of the "pick a shape, apply material + lighting, optionally
extrude an SVG, export a transparent PNG or self-contained embed snippet" concept.
MIT licensed, no signup, runs client-side. Built on a typed
shape/material/environment/effect composition engine (`src/`, already proven via a
dev harness) now growing a real product UI and content library on top of that proven
core.

## Non-Goals (explicit Phase 5 deferrals)
- GLTF/model export — later.
- Animation timeline — later.
- Advanced post-processing beyond the MVP effect set (§ content plan) — later.
- Community preset sharing (server-backed) — later; local/curated presets only for now.
- A React *adapter subpath shipped inside the `forma` package itself* — still
  deferred. (Distinct from: the product's own editor app, which IS built in React,
  as a separate app layer consuming `forma`'s public API — see `app/` roadmap.)
- IBL/HDRI environment lighting is now used by Studio/Softbox for reflective
  materials; the restrained dusk-sky CSS backdrop remains visually separate from `scene.environment`.

## Constraints
- `src/` (the published library) stays framework-agnostic — no React/UI framework
  dependency inside `src/`. The `app/` directory is a separate consumer.
- Scene bootstrap is owned by Forma (`src/scene/createFormaScene.ts`), not
  `cc-webgl`'s `SceneManager` — `cc-webgl` contributes `ResourceRegistry` only.
  (Revises the prior constraint that claimed full `cc-webgl` scene-lifecycle
  consumption — that claim did not match implementation and is corrected here, not
  carried forward.) Confirmed as of M0: `createFormaScene` is the single bootstrap
  used by both `harness/main.ts` and `mountForma` (`src/index.ts`) — no duplicated
  scene/camera/renderer construction remains anywhere in the repo.
- Content (shape/material/environment/effect definitions) lives in `src/content/**`,
  published as part of the package via `package.json`'s `./content` export — not in
  `harness/`, which remains the disposable architecture-validation rig only.
- Parameter schema stays a small typed discriminated union (no zod/yup) — unchanged
  from pre-work phase.
- `three` version pinned to match across `src/`, `app/`, and any future subpaths.
- MIT license — `LICENSE` file present at repo root; `"license": "MIT"` in
  `package.json`.

## Stack
- TypeScript, Vite, Vitest (`src/` — unchanged).
- React + Vite (`app/` — M1, present).
- `cc-webgl` (`ResourceRegistry` only), `three` (incl. `three/examples/jsm`
  `EffectComposer`/`RenderPass`/`ShaderPass`/`OrbitControls`, M1).

## Milestones & Acceptance Criteria

### M0 — Close out pre-work (DONE)
- [x] Live headless-browser verification of the harness (shape/material switching,
      JSON round-trip, embed-code copy, PNG export + alpha readout, leak-check HUD).
      Run via Playwright (chromium, `--use-gl=angle --enable-unsafe-swiftshader`)
      against the real `npm run dev` server — same pattern as
      `Perspective/vitest.browser.config.ts`. All five items confirmed working:
      switching (no page errors), JSON round-trip (valid JSON in/out), embed-code
      copy (generates real `mountForma`/`registerAllContent` code, no broken
      `forma/harness-content` import), PNG export (alpha-readout line rendered;
      `false` for the default opaque-background `studio` composition — expected,
      not a bug, since `studio` sets `scene.background` to a solid color), and
      leak-check HUD (`PASS`, 50 cycles). Full 32-combination manual click-through
      was not exhaustively repeated by hand; the automated leak-check button already
      exercises every shape×material×environment combination programmatically and
      reports PASS/FAIL, which is stronger evidence than a manual subset.
| 2026-09-17 | M4 executed (docs-only, per `.expansion-roadmap.md` M4 + this task's
      brief): `app/README.md` (new) — local dev, the `file:..`/`dist` resolve gotcha,
      production build, deployment walkthroughs for GitHub Pages/Cloudflare
      Pages/Vercel, browser support, known limitations. `CONTRIBUTING.md` (new) —
      annotated `sphere`/`matte` registry-entry walkthrough, registration mechanism,
      `generateEmbedCode()`/`embed.ts` explainer, testing philosophy (real
      headless-browser verification required for UI/render claims), PR expectations.
      Root `README.md` extended (not duplicated) with Deployment/Browser
      support & performance/Contributing sections and a pointer from deviation #7 to
      `CONTRIBUTING.md`'s embed-code walkthrough. Config change: `app/vite.config.ts`
      gained `base: process.env.FORMA_BASE ?? '/'` — no `base` config existed
      before, and a GitHub Pages project-site deploy would have 404'd on asset
      URLs without it; verified by building with `FORMA_BASE=/forma/` and
      confirming `dist/index.html` emitted `/forma/assets/...` paths, then
      rebuilt with the default before committing. `.github/workflows/deploy-gh-pages.yml`
      added — originally built library then app and published `app/dist/` via
      `actions/deploy-pages`, validated for YAML syntax only (`npx js-yaml`).
      Since revised (branch `forma-pages-deploy`): it now checks out `cc-webgl`
      as a sibling of `forma/` (`CC_WEBGL_TOKEN` secret while cc-webgl is
      private), builds it, then the library and app, copies the shell to
      `editor/index.html` (Pages has no SPA fallback; it 301s `/forma/editor`
      to `/forma/editor/` and serves that index with 200), and uploads
      `forma/app/dist`. Editor routing/links now honour Vite's `BASE_URL`.
      Base-path build, homepage and `/forma/editor` route verified locally
      (vite preview + headless Chromium, plus a Pages-style static server);
      the Actions run itself is still not executed — no live runner available. Confirmed both `npm run build`
      (library, `Projects/Forma/`) and `npm run build` (app) still pass after the
      `vite.config.ts` change (812.08 kB / 219.20 kB gzip single JS chunk, same
      pre-existing >500KB warning — documented in README as an explicit non-goal,
      not new regression). No other source changes.
- [x] Fixed the broken "Copy Code" export: `embed.ts` previously imported
      `forma/harness-content`, a subpath absent from `package.json`'s `exports` map.
      Content relocated from `harness/*.ts` to `src/content/**` (published, `./content`
      export added); `embed.ts` now emits an explicit `registerAllContent()` call
      (not a bare side-effect import, which `"sideEffects": false` would let a
      bundler drop) before `mountForma()` runs. Regression test added:
      `tests/embed.test.ts` asserts every import specifier in the generated snippet
      has a real `exports` entry, and that entry's build target exists on disk.
- [x] Consolidated the two divergent raw-three scene bootstraps
      (`harness/main.ts`, `src/index.ts`'s `mountForma`) into one owned
      `src/scene/createFormaScene.ts`, used by both call sites. `cc-webgl`'s
      contribution to Forma stays narrowed to `ResourceRegistry` only.
- [x] Add `LICENSE` (MIT) + `"license"` field to `package.json`.

### M1 — Editor MVP (DONE)
- [x] React `app/` scaffolded: `ControlPanel`, `ParamControl` (generic, schema-driven),
      `Viewport` with orbit/zoom/auto-spin, `prefers-reduced-motion` respected.
- [x] Content library at MVP scale: 10 shapes, 8 materials, 3 environments, 2 effects
      (1 stub + `duotone`), per the expansion roadmap's §3 list.
- [x] `exportPNG` accepts a target size param; effects route through an
      `EffectComposer` so PNG export reflects active effects.
- [x] `npm run build`/`typecheck`/`test` pass in both `src/` and `app/`.

### M2 — Full content + SVG extrusion (COMPLETE)
- [x] Content expanded toward target scale (58 shapes / 63 materials / 18
      environments / 11 effects) — incremental, not required all-at-once. Landed:
      22 shapes / 20 materials / 7 environments / 6 effects.
- [x] `svg-extrude` shape definition (registry entry, not a special case) per roadmap
      §4; drag-and-drop upload (+ file-input fallback) in `app/`.
- [x] Preset system (`Preset` wrapper type, versioned) + curated preset gallery.
      `src/types.ts` (`Preset`), `src/content/presets.ts` (8 curated presets built
      from live registry defaults), `app/src/components/PresetGallery.tsx`.
- [x] "Surprise me" coherent-random-combo button. `src/content/surpriseMe.ts`
      (material/environment compatibility rules, not uniform-random),
      `app/src/components/SurpriseMeButton.tsx`.

### M3 — Polish/UX
- [x] Searchable `ControlPanel`, keyboard shortcuts, full mobile touch support.
- [x] Onboarding flow for first-time users.

### M4 — Self-hosting docs (COMPLETE)
- [x] Deployment guide (static hosting — Vite build is fully client-side).
- [x] Contribution docs: "how to add a shape/material/environment/effect" (points at
      `src/content/**`'s registry-entry pattern).
- [x] Browser support notes.

## Status
**M0, M1, M2, M3, M4 complete. H3 content expansion remains active.**

## Product hardening roadmap

### H1 — Lifecycle and delivery correctness (in progress)

- Make every public mount disposable, including renderer and resize-observer ownership.
- [x] Remove duplicate context-loss wiring and define one recovery owner.
- Make FALLBACK a real remount boundary; never leave a live WebGL scene mislabeled FALLBACK.
- Use the shared `cc-webgl` `FrameScheduler` in the product app for visibility pause and delta clamping.
- Keep OrbitControls updates inside that scheduler; no second product RAF loop.
- Make generated embed output browser-runnable through a published browser bundle, not bare package imports.

### H2 — Resource and export safety

- Finish AssetLoader cancellation with request identity and underlying-load cancellation where supported.
- Dispose complete GLTF ownership graphs, including material textures and shared-resource policy.
- Restore renderer pixel ratio, composer size, camera state, and background on every export failure path.
- Add browser tests for repeated mount/unmount, export failure cleanup, context loss, and high-DPI output.

### H3 — Product completeness

- **Polish slice (in progress):** prioritize a small set of visibly distinct shapes,
  environments, materials, presets, and browser thumbnails before broad library expansion.
- Add visual-reference cards to every picker so selection communicates appearance, not only labels.
- Normalize shape framing automatically so geometry changes stay legible in one viewport.
- Expand toward the source plan: 30–40 shapes, 20+ materials, 6–8 environments, 5–6 effects.
- Use cc-webgl lifecycle/quality/reduced-motion contracts directly, or explicitly split Forma into a separate renderer package.
- Add real empty-state/import UX, accessible controls, preset thumbnails, and mobile export verification.
- [x] Add validated composition JSON import through the Export section with a 1 MB guard.
- Define composition/preset migrations and validate malformed user JSON at the input boundary.
- **Texture-layer slice (COMPLETE):** one optional first-class DataTexture slot between
  material and post-processing; `none`, `checker-normal`, and `weave-roughness` are
  registry-native definitions. No external loader, fetched asset, or multi-layer stack.
- **Texture pack replacement (NEXT):** retire the procedural checker/weave visuals as
  primary content. Curate a small CC0 PBR pack from Poly Haven at 1K review size:
  `rough_linen` for clean textile detail, `metal_plate_02` for worn industrial contrast,
  and `granular_concrete` for mineral matte breakup. Each pack entry should own a
  color/normal/roughness bundle, use OpenGL normal maps, expose UV scale + intensity,
  and load through one cancellable asset loader with an explicit `textureBaseUrl` for
  both the editor and generated embeds. Keep procedural DataTextures as offline/test
  fallbacks. Do not add a multi-layer stack until these three materials read well.
- **UI texture selection rule:** prefer quiet, low-frequency surfaces that survive text
  and controls over photoreal detail. First catalog should be `paper-fiber` (light
  grain), `linen-blue` (cool woven accent), `glass-noise` (very subtle translucency),
  and `brushed-metal` (one high-contrast accent). Reject busy concrete, rusty metal,
  and obvious tiling for default UI backgrounds; reserve them for hero art or cards.
- **Modular delivery rule:** ship texture metadata and no bytes in the core bundle.
  A `TexturePackManifest` maps stable IDs to optional color/normal/roughness URLs,
  license/source, recommended use, and default intensity. `loadTexturePack(id, baseUrl)`
  lazy-loads only the selected pack, caches it per URL, aborts unused requests, and
  keeps `none`/procedural fallbacks for offline tests. The embed API receives the same
  `baseUrl` explicitly so website hosts control CDN/static asset placement.

### Reference-driven roadmap additions (2026-09-21)

Use the Vanta 3D Shape Generator as a workflow reference, not a feature-count
target. Add in this order:

- **Control taxonomy:** Shape filters (`All`, `Solid`, `Flat`, `Yours`) plus
  stronger category labels and searchable visual cards.
- **Material studio:** split material `Library` from `Settings`; add a small
  surface preset row and advanced physical controls for color, roughness,
  metalness, clearcoat, transmission, thickness, IOR, sheen, and iridescence.
- **Lighting rig:** environment gallery, environment strength/blur/rotation,
  light color/intensity, and an optional directional-light placement pad.
- **Effect pipeline:** ordered `Texture → Colour → Finish` stages with one
  selectable effect per stage while preserving the registry-native effect model.
- **Backdrop and presentation:** solid/gradient/transparent backdrop modes,
  floor shadow toggle, shadow strength/softness, and camera controls for lens,
  zoom, turn, tilt, and auto-spin.
- **History and delivery:** undo/redo for composition changes, one reset-all
  action, and an export menu covering PNG, JSON, and generated embed code.

First slice: add the control taxonomy and camera/presentation state without
expanding the content catalog. Validate the interaction model before adding
advanced material parameters or a directional-light rig.

**Implementation slice (2026-09-22):** environment controls now expose strength,
rotation, light intensity, and light colour through the existing registry-native parameter path;
HDR environment intensity/rotation and synchronous light intensity update live.
Legacy empty environment parameter objects remain readable.

Material controls now split into Library and Settings views, keeping the existing
registry-native physical parameters in one focused panel.

Added `Physical Studio`, a registry-native MeshPhysicalMaterial exposing color,
roughness, metalness, clearcoat, transmission, thickness, IOR, sheen, and iridescence.

Effects now present as ordered Texture, Colour, and Finish stages with one selected
effect per stage; registry IDs and composer ordering remain unchanged.

Presentation now supports environment, gradient, and transparent backdrops, floor
shadow strength/softness, and composition undo/redo controls.

Added three curated environments: Dusk Rose, Warm Paper, and Forest Night.

Directional lighting now has an Environment/Directional mode and pointer pad;
horizontal and vertical placement remain available through keyboard-operable sliders.

  **Implementation slice (2026-09-18):** `TexturePackManifest` and the staged
  `texturePackCatalog` now live in the published library. `TexturePackLoader` uses
  `ImageLoader`, loads only declared maps from an explicit base URL, caches by
  resolved URL, supports caller abort signals where practical, and exposes pack
  disposal plus cache clearing. The app now ships local 1K color/normal/roughness
  packs for `linen-blue`, `brushed-metal`, and `mineral-matte`, with OpenGL
  normal-map assignments and procedural fallback on failure. `paper-fiber` and
  `glass-noise` remain metadata-only. Local review is documented in the root and
  app READMEs; pack attribution points to the Poly Haven source URLs. No CDN bytes
  are bundled.

  **Texture quality decision (2026-09-19):** Pack color maps are material-aware:
  Linen Blue may tint authored color, while Brushed Metal and Mineral Matte supply
  only normal/roughness detail. Runtime shape creation fills missing UVs with stable
  spherical coordinates without replacing authored UV attributes; pack scale defaults
  to 2 for broader, quieter coverage.

### Parked future ideas

- Transparent PNG hero art for landing pages and product headers.
- Responsive embeddable canvas for interactive website hero sections.
- Lightweight 3D UI decoration for cards, empty states, and navigation moments.
- Theme hooks for site tokens, color modes, motion preferences, and brand palettes.

### H4 — Release readiness

- [x] Add browser support matrix and tested deployment targets.
- [x] Publish versioned browser bundles and embeddable examples.
- [x] Add executable performance budgets, bundle-size policy, and release checklist.
- Re-run full browser QA before marking the project shipped.

`npm run typecheck` / `typecheck:harness` / `test` (17/17) / `build` all pass. Embed
code generation confirmed genuinely working end-to-end (resolves through the real
`exports` map from an external `node_modules/forma` symlink, syntactically valid as
a standalone ES module, registers content and mounts without runtime errors). Scene
bootstrap consolidated to a single owned path.

| Date       | Update |
|------------|--------|
| 2026-09-23 | Reference-driven material slice: split Material into accessible Library/Settings views and added registry-backed surface presets for None, Linen Blue, Book Pattern, Fine Grained Wood, Brushed Metal, and Mineral Matte. App typecheck/build and browser selection review pass. |
| 2026-09-21 | Reference review: added staged roadmap for control taxonomy, material settings, lighting rig, ordered effects, backdrop/camera presentation, and history/export workflow. First slice is taxonomy plus camera/presentation state; no catalog expansion yet. |
| 2026-09-21 | Reference-driven UI slice: added accessible Shape filters (`All`, `Solid`, `Flat`, `Yours`) and a Presentation section with live lens, turn, tilt, and zoom controls routed through the existing OrbitControls scene. App typecheck/build and browser review pass. |
| 2026-09-20 | H1 lifecycle slice: Forma scene bootstrap now owns WebGL context-loss listeners, pauses its scheduler while lost, shows an accessible recovery fallback, and remounts the scene after restoration so recovered canvases never reuse stale GPU resources. Library and app builds pass. |
| 2026-09-20 | H3 catalog slice: corrected the registry-native Heart to use the supplied Three.js path and kept it as a beveled solid extrusion. Removed the toilet and Smiley candidates after review rather than shipping weak silhouettes. Content total is now 31 shapes / 20 materials / 7 environments / 6 effects. |
| 2026-09-19 | H3 UI-shape slice: added registry-native Badge and Tab rounded panels plus a centered Notched Card ExtrudeGeometry path with typed rebuild parameters, safe radius/notch/bevel clamping, focused finite-geometry smoke coverage, and truthful CSS picker thumbnails. Content total is now 27 shapes / 20 materials / 7 environments / 6 effects. |
| 2026-09-19 | H3 shape slice: added registry-native Pill and Card rounded panels with typed rebuild parameters, radius clamping, focused finite-geometry smoke coverage, and truthful CSS picker thumbnails. Content total is now 24 shapes / 20 materials / 7 environments / 6 effects. |
| 2026-09-19 | H3 material slice: added registry-native Rubber and Pearl materials with in-place parameter updates, native Three physical shading, compatibility-aware Surprise Me biasing, and CSS picker thumbnails. Content total is now 22 shapes / 20 materials / 7 environments / 6 effects. |
| 2026-09-18 | Reflective lighting slice: added Poly Haven's CC0 Studio Small 01 tonemapped image as the app-owned Studio/Softbox backdrop plus its staged 1K HDR. FormaRuntime now loads PMREM IBL through an explicit app `environmentBaseUrl`, with stale-load/disposal guards and headless light fallback. |
| 2026-09-18 | Texture audit: current procedural checker/weave set is a placeholder, not a convincing material library. Selected Poly Haven's CC0 `rough_linen`, `metal_plate_02`, and `granular_concrete` as the first real PBR pack; replacement requires a cancellable loader and explicit asset base URL for embeds. |
| 2026-09-18 | H3 texture polish: added instant CSS reference thumbnails for `none`, `checker-normal`, and `weave-roughness` so the texture layer reads visually in the shared picker without preview scenes or asset loading. App typecheck/build and bundle budget pass. |
| 2026-09-18 | Texture-layer slice complete: added legacy-normalized `textureId`/`textureParams`, typed texture definitions/handles, isolated runtime texture lifecycle with hot/cold diffing and material-rebuild reapply, procedural DataTexture content (`none`, `checker-normal`, `weave-roughness`), serialization validation, app Texture picker/params, focused registry/serialization/isolation/leak coverage. Website/hero ideas remain parked. |
| 2026-09-18 | H4 browser distribution slice: versioned the IIFE output as `dist/forma.browser.v<package-version>.js`, aligned generated embed code, added `examples/embed/index.html`, and documented the local review path. Library/app typecheck, tests (45/45), builds, bundle budget, and localhost static smoke check pass. |
| 2026-09-17 | H4 release-readiness slice: added Node-stdlib-only `app/npm run check:bundle`, enforcing 900,000 JavaScript-byte and 250,000 summed-gzip-byte budgets against an existing build; documented release checks, deployment/browser matrix, and current browser-QA caveat. Current baseline: 823,283 JavaScript bytes / 221,807 summed gzip bytes. |
| 2026-09-17 | H3 hardening: `deserializeComposition()` now validates the JSON object and required field/container types at the input boundary, prefixes parse/shape errors with `deserializeComposition:`, preserves registry and schema-key validation, and adds focused malformed-input coverage. Library/app verification passes. |
| 2026-09-17 | H3 content expansion: added four registry-native shapes (`pyramid`, `bevelled-box`, `spring`, `vase`), three materials (`plastic`, `ceramic`, `holographic`), procedural `aurora-atmosphere` DataTexture environment, lightweight `chromatic-aberration` ShaderPass, three curated presets, and picker rules. Registry smoke coverage now creates/disposes every environment and effect from defaults; content totals are 22 shapes / 18 materials / 7 environments / 6 effects. |
| 2026-09-17 | H2/H3 review slice: Studio now leaves the published scene background transparent so the app's default view can show `app/public/backgrounds/dusk-sky.png` as a restrained cover backdrop while alternate environments remain scene-owned. Hardened `exportPNG()` restoration for renderer pixel ratio/size, composer size, camera state, and scene background across success and encoding failure; added focused Vitest coverage. Library tests/typecheck/build and app typecheck/build pass. |
| 2026-09-17 | H1 lifecycle slice: made `FormaRuntime.dispose()` idempotent, ensured external scene cleanup runs once, and removed duplicate `formaScene.dispose()` from the React hook cleanup. Added a regression test for repeated disposal; library tests (31/31), typecheck, builds, and app typecheck/build pass. |
| 2026-09-16 | Architecture blueprint written; pre-work implementation complete (registries, Composition, disposal, 4-shape/4-material/2-env harness, 75-cycle leak check). |
| 2026-09-17 | Expansion roadmap written (`.expansion-roadmap.md`) reconciling pre-work architecture against the full-product vision. BRIEF rewritten for multi-milestone tracking. |
| 2026-09-17 | M0 executed: fixed broken embed-code export (content relocated to `src/content/**`, `./content` export added, `embed.ts` emits explicit `registerAllContent()` call, regression test added); consolidated the two divergent raw-three scene bootstraps into `src/scene/createFormaScene.ts`; added MIT `LICENSE` + `package.json` license field; ran live headless-browser (Playwright/chromium) verification of switching, JSON round-trip, embed-code copy, PNG export+alpha readout, and the 50-cycle leak-check HUD — all confirmed passing. `typecheck`/`typecheck:harness`/`test` (17/17)/`build` all green. |
| 2026-09-17 | M2 completed: preset system (`Preset` wrapper type in `src/types.ts`, versioned/additive, wrapping `Composition` — no new serialization mechanism, round-trips through existing `serializeComposition`/`deserializeComposition`) + 12 curated built-in presets (`src/content/presets.ts`, built from each definition's live `defaultParameters` so a preset stays valid as schemas evolve) + `PresetGallery.tsx` picker wired into `ControlPanel`. "Surprise me" (`src/content/surpriseMe.ts`) generates a coherent random `Composition` via compatibility rules, not uniform-random across all axes — reflective materials (chrome/gold/copper/metal/obsidian) biased toward lighting-style environments, glass/dark materials toward moody environments, stylized materials toward saturated ones, `wireframe` re-rolled off already-sparse organic shapes, `svg-extrude` excluded (no default SVG content to extrude); `SurpriseMeButton.tsx` in the app topbar. Fixed a pre-existing topbar overlap bug surfaced by the new button (`panel-collapse-btn`'s stray `position:absolute` was floating over flex-laid-out siblings). `typecheck`/`test`(28/28)/`build` green in `src/`; `typecheck`/`build` green in `app/`. Verified genuinely working via headless Playwright against the real `app` dev server: clicking Surprise-me repeatedly changes the selected shape/material each time with zero console errors; selecting "Ice Blob at Sunset" from the preset gallery applies Soft Blob + Ice + Sunset exactly. |
| 2026-09-17 | M2 partial: added `StringParamSchema` (`kind: 'string'`, additive to `ParamSchema`) for SVG source params; `svg-extrude` registered as an ordinary `ShapeDefinition` (`SVGLoader().parse()` → `path.toShapes()` → `ExtrudeGeometry`, then bounding-box-normalized scale + Y-flip + `center()` + recomputed normals; wrapped in try/catch, falls back to a built-in glyph default so bad user SVG never white-screens). `ParamControl` given an explicit return type + `never`-exhaustiveness default branch before adding the `string`/`textarea` case (guards against the kind silently rendering nothing). New `app/src/components/SvgImport.tsx` (drop zone + `<input type=file>`, 100KB cap, wired into `App.tsx`/`ControlPanel.tsx` alongside the existing Shape picker — additive, not a replacement). Content expanded: shapes 10→18 (`cone`, `cylinder`, `octahedron`, `dodecahedron`, `tetrahedron`, `ring`/`cross` via the `star`-style `ExtrudeGeometry` path, `svg-extrude`), materials 8→15 (`velvet`, `gold`, `copper`, `clay`, `neon-plastic`, `wireframe`, `obsidian`), environments 3→6 (`sunset`, `midnight`, `softbox`), effects 2→5 (`grayscale`, `vignette`, `invert`, alpha passed through unmodified on all three per the `duotone` precedent). `tests/leak-check.test.ts` switched from a full 240-combo cartesian product to a bounded 360-combo stratified sample (18×15×6 cartesian would be 1620, too slow to cycle 40-75x) — `svg-extrude` excluded from the leak-check/smoke-test shape lists because happy-dom's `DOMParser` doesn't support `image/svg+xml` (returns a null `documentElement`), same class of gap already documented for `CanvasTexture` in `materials.ts`/`environments.ts`; covered instead by real headless-browser Playwright checks. New `tests/content-smoke.test.ts` (registry-wide guard: every shape/material creates cleanly from its own defaults with finite, non-empty geometry) — the guard that would have caught an empty/NaN SVG default before it reached the picker UI. `typecheck`/`typecheck:harness`/`test` (19/19)/`build` green in `src/`; `typecheck`/`build` green in `app/`. Verified genuinely working via headless Playwright (`playwright-cli`) against the real `app` dev server: the `svg-extrude` shape's built-in default glyph renders (distinct from `sphere`); uploading a real external heart-shaped `.svg` file via the file-input control replaces it with a correctly oriented (right-side-up, Y-flip confirmed), non-degenerate 3D mesh, pixel-distinct from both the sphere and the default glyph; switching the Material picker (`Metal`) on the imported SVG mesh visibly re-shades it, confirming the import path is a real registry entry participating normally in the composition, not a special-cased one-off; all four picker grids (18 shapes / 15 materials / 6 environments / 5 effects) render and remain clickable at the new scale. Preset system and "Surprise me" (also listed under M2 in this BRIEF) were **not** part of this pass — left open, M2 marked partial rather than complete. |
| 2026-09-17 | M3 executed (polish only, no new product features): Effects section's picker was the one grid not wired to `search` — fixed; sections with a search match now auto-expand without mutating the user's manual open/closed state. Added a `H` keyboard shortcut (no modifiers, inert while any input/textarea/select/contenteditable has focus) toggling the control panel, discoverable via the toggle button's title. Added explicit "↺ Reset" (topbar, restores default sphere/matte/studio composition via the already-exported `defaultComposition()`) and "⌂ Reset view" (viewport toolbelt, restores default camera orbit) actions — the latter required directly zeroing `OrbitControls`' private `_sphericalDelta`/`_panOffset` fields, since `reset()` alone snaps position but leaves residual damping momentum that drags the camera away again over the next frames (documented in `Viewport.tsx`). Added `@media (max-width: 640px)` rules to `global.css` (panel full-width, topbar wraps, panel defaults collapsed under 640px on mount) — OrbitControls' own touch handling needed no changes. `prefers-reduced-motion` wiring (`useReducedMotion` + disabled spin toggle) was already real, confirmed rather than rebuilt. Added a dismissible `OnboardingHint` ("drag to orbit · scroll to zoom · try Surprise Me"), shown once via `localStorage`. `typecheck`/`build` green in both `src/` and `app/`. Verified genuinely working via a new headless-Playwright script (`app/e2e/verify-m3.mjs`, 12 checks, 12/12 passing): search reveals an Environment-section match while narrowing the Shape grid; `H` toggles the panel and is provably inert while the search input has focus; a drag-then-reset-camera sequence confirms the camera returns to within 0.01 units of the exact default position (not just "some reset happened"); a shape-change-then-reset-composition sequence confirms the Sphere selection returns; a 390px-viewport context confirms the panel starts collapsed, opens full-width within the viewport, and that a pointer drag orbits the camera (position provably changes); a `reducedMotion:'reduce'` context confirms the spin toggle is disabled while a `'no-preference'` context confirms enabling spin actually moves the camera over time (paired test, not a vacuous no-preference-absent check); a fresh context confirms the onboarding hint appears once and stays dismissed across reload. |
| 2026-09-17 | M1 executed: `createFormaScene()` now owns a shared `EffectComposer` (`RenderPass` base pass); `FormaRuntime`/`EffectCreateContext` carry it through so pass-based effects can wire themselves in; `exportPNG()` rewritten to a `(target, opts)` signature — target size param, renders through the same composer as the live loop, nulls `scene.background` for transparent capture by default. Content expanded to MVP scale: shapes 4→10 (`soft-blob` deterministic value-noise displacement, `capsule`, `gem` via `toNonIndexed()` faceting, `knot`, `spiral` via a hand-rolled `THREE.Curve` helix + `TubeGeometry`, `star` via hand-authored `THREE.Shape` + `ExtrudeGeometry`), materials 4→8 (`chrome`, `frosted-glass`, `ice` with `MeshPhysicalMaterial.iridescence`, `carbon` with a procedural `DataTexture` normal map), environments 2→3 (`neon-room`), effects 1→2 (`duotone`, a `ShaderPass` luminance-remap that passes alpha through unmodified). Scaffolded `app/` — React+Vite product editor consuming `forma` as a `file:..` dependency (dev-aliased to `src/` for iteration speed), with `ControlPanel`/`ParamControl`(generic, schema-driven, typed against `ParamSchema`/`ParamValue` not `ParamsOf<S>`)/`DefinitionPicker`/`Viewport`(OrbitControls + auto-spin, `prefers-reduced-motion`-aware)/`ExportPanel`(PNG size param + Copy Code)/`useFormaRuntime`/`useReducedMotion`. `src/` typecheck/harness-typecheck/test(17/17, leak-check now covers 240 combos)/build all green; `app/` typecheck/build both green. Verified genuinely working end-to-end via headless Playwright (chromium, `--use-gl=angle --enable-unsafe-swiftshader`) against the real `app` dev server: shape/material/environment switching via the picker UI (screenshots confirm live 3D re-render), a radius slider provably changes rendered pixels, `duotone` visibly recolors the scene and survives PNG export (decoded: 1024×1024, alpha channel present), Copy Code produces a real runnable snippet, and the harness leak-check passes 50 cycles over the full 240-combo content set with zero failures and zero page errors. |

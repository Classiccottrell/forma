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
- IBL/HDRI environment lighting — deferred until an environment genuinely needs it
  (e.g. `chrome` material's mirror quality); flat-lighting + gradient/DataTexture
  environments remain the technique through MVP and full content-library phases.

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
      added — builds library then app and publishes `app/dist/` via
      `actions/deploy-pages`; validated for YAML syntax only (`npx js-yaml`), not
      executed — no live Actions runner available. Confirmed both `npm run build`
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
      18 shapes / 15 materials / 6 environments / 5 effects.
- [x] `svg-extrude` shape definition (registry entry, not a special case) per roadmap
      §4; drag-and-drop upload (+ file-input fallback) in `app/`.
- [x] Preset system (`Preset` wrapper type, versioned) + curated preset gallery.
      `src/types.ts` (`Preset`), `src/content/presets.ts` (12 curated presets built
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
**M0, M1, M2, M3, M4 complete. All roadmap milestones closed out.**

## Product hardening roadmap

### H1 — Lifecycle and delivery correctness (in progress)

- Make every public mount disposable, including renderer and resize-observer ownership.
- Remove duplicate context-loss wiring and define one recovery owner.
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
- Define composition/preset migrations and validate malformed user JSON at the input boundary.

### H4 — Release readiness

- Add browser support matrix and tested deployment targets.
- Publish versioned browser bundles and embeddable examples.
- Add performance budgets, bundle-size policy, and release checklist.
- Re-run full browser QA before marking the project shipped.

`npm run typecheck` / `typecheck:harness` / `test` (17/17) / `build` all pass. Embed
code generation confirmed genuinely working end-to-end (resolves through the real
`exports` map from an external `node_modules/forma` symlink, syntactically valid as
a standalone ES module, registers content and mounts without runtime errors). Scene
bootstrap consolidated to a single owned path.

| Date       | Update |
|------------|--------|
| 2026-09-16 | Architecture blueprint written; pre-work implementation complete (registries, Composition, disposal, 4-shape/4-material/2-env harness, 75-cycle leak check). |
| 2026-09-17 | Expansion roadmap written (`.expansion-roadmap.md`) reconciling pre-work architecture against the full-product vision. BRIEF rewritten for multi-milestone tracking. |
| 2026-09-17 | M0 executed: fixed broken embed-code export (content relocated to `src/content/**`, `./content` export added, `embed.ts` emits explicit `registerAllContent()` call, regression test added); consolidated the two divergent raw-three scene bootstraps into `src/scene/createFormaScene.ts`; added MIT `LICENSE` + `package.json` license field; ran live headless-browser (Playwright/chromium) verification of switching, JSON round-trip, embed-code copy, PNG export+alpha readout, and the 50-cycle leak-check HUD — all confirmed passing. `typecheck`/`typecheck:harness`/`test` (17/17)/`build` all green. |
| 2026-09-17 | M2 completed: preset system (`Preset` wrapper type in `src/types.ts`, versioned/additive, wrapping `Composition` — no new serialization mechanism, round-trips through existing `serializeComposition`/`deserializeComposition`) + 12 curated built-in presets (`src/content/presets.ts`, built from each definition's live `defaultParameters` so a preset stays valid as schemas evolve) + `PresetGallery.tsx` picker wired into `ControlPanel`. "Surprise me" (`src/content/surpriseMe.ts`) generates a coherent random `Composition` via compatibility rules, not uniform-random across all axes — reflective materials (chrome/gold/copper/metal/obsidian) biased toward lighting-style environments, glass/dark materials toward moody environments, stylized materials toward saturated ones, `wireframe` re-rolled off already-sparse organic shapes, `svg-extrude` excluded (no default SVG content to extrude); `SurpriseMeButton.tsx` in the app topbar. Fixed a pre-existing topbar overlap bug surfaced by the new button (`panel-collapse-btn`'s stray `position:absolute` was floating over flex-laid-out siblings). `typecheck`/`test`(28/28)/`build` green in `src/`; `typecheck`/`build` green in `app/`. Verified genuinely working via headless Playwright against the real `app` dev server: clicking Surprise-me repeatedly changes the selected shape/material each time with zero console errors; selecting "Ice Blob at Sunset" from the preset gallery applies Soft Blob + Ice + Sunset exactly. |
| 2026-09-17 | M2 partial: added `StringParamSchema` (`kind: 'string'`, additive to `ParamSchema`) for SVG source params; `svg-extrude` registered as an ordinary `ShapeDefinition` (`SVGLoader().parse()` → `path.toShapes()` → `ExtrudeGeometry`, then bounding-box-normalized scale + Y-flip + `center()` + recomputed normals; wrapped in try/catch, falls back to a built-in glyph default so bad user SVG never white-screens). `ParamControl` given an explicit return type + `never`-exhaustiveness default branch before adding the `string`/`textarea` case (guards against the kind silently rendering nothing). New `app/src/components/SvgImport.tsx` (drop zone + `<input type=file>`, 100KB cap, wired into `App.tsx`/`ControlPanel.tsx` alongside the existing Shape picker — additive, not a replacement). Content expanded: shapes 10→18 (`cone`, `cylinder`, `octahedron`, `dodecahedron`, `tetrahedron`, `ring`/`cross` via the `star`-style `ExtrudeGeometry` path, `svg-extrude`), materials 8→15 (`velvet`, `gold`, `copper`, `clay`, `neon-plastic`, `wireframe`, `obsidian`), environments 3→6 (`sunset`, `midnight`, `softbox`), effects 2→5 (`grayscale`, `vignette`, `invert`, alpha passed through unmodified on all three per the `duotone` precedent). `tests/leak-check.test.ts` switched from a full 240-combo cartesian product to a bounded 360-combo stratified sample (18×15×6 cartesian would be 1620, too slow to cycle 40-75x) — `svg-extrude` excluded from the leak-check/smoke-test shape lists because happy-dom's `DOMParser` doesn't support `image/svg+xml` (returns a null `documentElement`), same class of gap already documented for `CanvasTexture` in `materials.ts`/`environments.ts`; covered instead by real headless-browser Playwright checks. New `tests/content-smoke.test.ts` (registry-wide guard: every shape/material creates cleanly from its own defaults with finite, non-empty geometry) — the guard that would have caught an empty/NaN SVG default before it reached the picker UI. `typecheck`/`typecheck:harness`/`test` (19/19)/`build` green in `src/`; `typecheck`/`build` green in `app/`. Verified genuinely working via headless Playwright (`playwright-cli`) against the real `app` dev server: the `svg-extrude` shape's built-in default glyph renders (distinct from `sphere`); uploading a real external heart-shaped `.svg` file via the file-input control replaces it with a correctly oriented (right-side-up, Y-flip confirmed), non-degenerate 3D mesh, pixel-distinct from both the sphere and the default glyph; switching the Material picker (`Metal`) on the imported SVG mesh visibly re-shades it, confirming the import path is a real registry entry participating normally in the composition, not a special-cased one-off; all four picker grids (18 shapes / 15 materials / 6 environments / 5 effects) render and remain clickable at the new scale. Preset system and "Surprise me" (also listed under M2 in this BRIEF) were **not** part of this pass — left open, M2 marked partial rather than complete. |
| 2026-09-17 | M3 executed (polish only, no new product features): Effects section's picker was the one grid not wired to `search` — fixed; sections with a search match now auto-expand without mutating the user's manual open/closed state. Added a `H` keyboard shortcut (no modifiers, inert while any input/textarea/select/contenteditable has focus) toggling the control panel, discoverable via the toggle button's title. Added explicit "↺ Reset" (topbar, restores default sphere/matte/studio composition via the already-exported `defaultComposition()`) and "⌂ Reset view" (viewport toolbelt, restores default camera orbit) actions — the latter required directly zeroing `OrbitControls`' private `_sphericalDelta`/`_panOffset` fields, since `reset()` alone snaps position but leaves residual damping momentum that drags the camera away again over the next frames (documented in `Viewport.tsx`). Added `@media (max-width: 640px)` rules to `global.css` (panel full-width, topbar wraps, panel defaults collapsed under 640px on mount) — OrbitControls' own touch handling needed no changes. `prefers-reduced-motion` wiring (`useReducedMotion` + disabled spin toggle) was already real, confirmed rather than rebuilt. Added a dismissible `OnboardingHint` ("drag to orbit · scroll to zoom · try Surprise Me"), shown once via `localStorage`. `typecheck`/`build` green in both `src/` and `app/`. Verified genuinely working via a new headless-Playwright script (`app/e2e/verify-m3.mjs`, 12 checks, 12/12 passing): search reveals an Environment-section match while narrowing the Shape grid; `H` toggles the panel and is provably inert while the search input has focus; a drag-then-reset-camera sequence confirms the camera returns to within 0.01 units of the exact default position (not just "some reset happened"); a shape-change-then-reset-composition sequence confirms the Sphere selection returns; a 390px-viewport context confirms the panel starts collapsed, opens full-width within the viewport, and that a pointer drag orbits the camera (position provably changes); a `reducedMotion:'reduce'` context confirms the spin toggle is disabled while a `'no-preference'` context confirms enabling spin actually moves the camera over time (paired test, not a vacuous no-preference-absent check); a fresh context confirms the onboarding hint appears once and stays dismissed across reload. |
| 2026-09-17 | M1 executed: `createFormaScene()` now owns a shared `EffectComposer` (`RenderPass` base pass); `FormaRuntime`/`EffectCreateContext` carry it through so pass-based effects can wire themselves in; `exportPNG()` rewritten to a `(target, opts)` signature — target size param, renders through the same composer as the live loop, nulls `scene.background` for transparent capture by default. Content expanded to MVP scale: shapes 4→10 (`soft-blob` deterministic value-noise displacement, `capsule`, `gem` via `toNonIndexed()` faceting, `knot`, `spiral` via a hand-rolled `THREE.Curve` helix + `TubeGeometry`, `star` via hand-authored `THREE.Shape` + `ExtrudeGeometry`), materials 4→8 (`chrome`, `frosted-glass`, `ice` with `MeshPhysicalMaterial.iridescence`, `carbon` with a procedural `DataTexture` normal map), environments 2→3 (`neon-room`), effects 1→2 (`duotone`, a `ShaderPass` luminance-remap that passes alpha through unmodified). Scaffolded `app/` — React+Vite product editor consuming `forma` as a `file:..` dependency (dev-aliased to `src/` for iteration speed), with `ControlPanel`/`ParamControl`(generic, schema-driven, typed against `ParamSchema`/`ParamValue` not `ParamsOf<S>`)/`DefinitionPicker`/`Viewport`(OrbitControls + auto-spin, `prefers-reduced-motion`-aware)/`ExportPanel`(PNG size param + Copy Code)/`useFormaRuntime`/`useReducedMotion`. `src/` typecheck/harness-typecheck/test(17/17, leak-check now covers 240 combos)/build all green; `app/` typecheck/build both green. Verified genuinely working end-to-end via headless Playwright (chromium, `--use-gl=angle --enable-unsafe-swiftshader`) against the real `app` dev server: shape/material/environment switching via the picker UI (screenshots confirm live 3D re-render), a radius slider provably changes rendered pixels, `duotone` visibly recolors the scene and survives PNG export (decoded: 1024×1024, alpha channel present), Copy Code produces a real runnable snippet, and the harness leak-check passes 50 cycles over the full 240-combo content set with zero failures and zero page errors. |

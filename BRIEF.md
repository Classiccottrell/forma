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

### M2 — Full content + SVG extrusion
- [ ] Content expanded toward target scale (58 shapes / 63 materials / 18
      environments / 11 effects) — incremental, not required all-at-once.
- [ ] `svg-extrude` shape definition (registry entry, not a special case) per roadmap
      §4; drag-and-drop upload in `app/`.
- [ ] Preset system (`Preset` wrapper type, versioned) + curated preset gallery.
- [ ] "Surprise me" coherent-random-combo button.

### M3 — Polish/UX
- [ ] Searchable `ControlPanel`, keyboard shortcuts, full mobile touch support.
- [ ] Onboarding flow for first-time users.

### M4 — Self-hosting docs
- [ ] Deployment guide (static hosting — Vite build is fully client-side).
- [ ] Contribution docs: "how to add a shape/material/environment/effect" (points at
      `src/content/**`'s registry-entry pattern).
- [ ] Browser support notes.

## Status
**M0 and M1 complete — M2 not yet started.**

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
| 2026-09-17 | M1 executed: `createFormaScene()` now owns a shared `EffectComposer` (`RenderPass` base pass); `FormaRuntime`/`EffectCreateContext` carry it through so pass-based effects can wire themselves in; `exportPNG()` rewritten to a `(target, opts)` signature — target size param, renders through the same composer as the live loop, nulls `scene.background` for transparent capture by default. Content expanded to MVP scale: shapes 4→10 (`soft-blob` deterministic value-noise displacement, `capsule`, `gem` via `toNonIndexed()` faceting, `knot`, `spiral` via a hand-rolled `THREE.Curve` helix + `TubeGeometry`, `star` via hand-authored `THREE.Shape` + `ExtrudeGeometry`), materials 4→8 (`chrome`, `frosted-glass`, `ice` with `MeshPhysicalMaterial.iridescence`, `carbon` with a procedural `DataTexture` normal map), environments 2→3 (`neon-room`), effects 1→2 (`duotone`, a `ShaderPass` luminance-remap that passes alpha through unmodified). Scaffolded `app/` — React+Vite product editor consuming `forma` as a `file:..` dependency (dev-aliased to `src/` for iteration speed), with `ControlPanel`/`ParamControl`(generic, schema-driven, typed against `ParamSchema`/`ParamValue` not `ParamsOf<S>`)/`DefinitionPicker`/`Viewport`(OrbitControls + auto-spin, `prefers-reduced-motion`-aware)/`ExportPanel`(PNG size param + Copy Code)/`useFormaRuntime`/`useReducedMotion`. `src/` typecheck/harness-typecheck/test(17/17, leak-check now covers 240 combos)/build all green; `app/` typecheck/build both green. Verified genuinely working end-to-end via headless Playwright (chromium, `--use-gl=angle --enable-unsafe-swiftshader`) against the real `app` dev server: shape/material/environment switching via the picker UI (screenshots confirm live 3D re-render), a radius slider provably changes rendered pixels, `duotone` visibly recolors the scene and survives PNG export (decoded: 1024×1024, alpha channel present), Copy Code produces a real runnable snippet, and the harness leak-check passes 50 cycles over the full 240-combo content set with zero failures and zero page errors. |

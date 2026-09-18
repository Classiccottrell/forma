# Contributing to Forma

Forma is MIT licensed and open to contributions. This doc covers local setup,
how to add content, testing philosophy, and PR expectations.

## Setup

```bash
npm install        # library root
npm run build       # -> dist/, required before app/ resolves 'forma'
cd app && npm install
```

See root `README.md`'s "Setup"/"Scripts" sections and `app/README.md` for the
full local-dev and deployment picture.

## Adding a shape, material, environment, or effect

All four content kinds follow the same pattern: an object built with
`defineShape`/`defineMaterial`/`defineEnvironment`/`defineEffect`
(`src/registry/instances.ts`), registered into the matching singleton registry
from `src/content/{shapes,materials,environments,effects}.ts`.

### Example: a shape (`sphere`, `src/content/shapes.ts`)

```ts
const sphere = defineShape({
  id: 'sphere',                 // stable identifier — used in presets/serialized JSON, don't rename after publishing
  label: 'Sphere',               // display name in the picker UI
  category: 'primitive',
  parameterSchema: {
    // Every param needs a ParamSchema entry (kind/min/max/step/default/rebuild).
    // rebuild:true = changing this param means the geometry must be rebuilt
    // from scratch (calls create() again); rebuild:false = an in-place update()
    // is possible instead (see the material example below).
    radius: { kind: 'number', min: 0.2, max: 2, step: 0.05, default: 1, rebuild: true },
    detail: { kind: 'number', min: 1, max: 6, step: 1, default: 3, rebuild: true },
  },
  defaultParameters: { radius: 1, detail: 3 },  // must match parameterSchema defaults
  create(params, ctx) {
    const geometry = new THREE.SphereGeometry(params.radius, params.detail * 8, params.detail * 6);
    ctx.registry.track(geometry);   // required — lets FormaRuntime dispose it on swap/unmount, prevents leaks
    return geometry;
  },
  // no update() here — shapes commonly have zero hot (rebuild:false) params
});
```

### Example: a material with a hot-updatable param (`matte`, `src/content/materials.ts`)

```ts
const matte = defineMaterial({
  id: 'matte',
  label: 'Matte',
  category: 'pbr',
  parameterSchema: {
    color: { kind: 'color', default: '#7f78ff', rebuild: false },
    roughness: { kind: 'number', min: 0, max: 1, step: 0.05, default: 0.9, rebuild: false },
  },
  defaultParameters: { color: '#7f78ff', roughness: 0.9 },
  create(params, ctx) {
    const material = new THREE.MeshStandardMaterial({ color: params.color, roughness: params.roughness, metalness: 0 });
    ctx.registry.track(material);
    return material;
  },
  // rebuild:false on both params means dragging a slider calls update(), not
  // create() — no geometry/material churn, no dispose/recreate per frame.
  update(material, params) {
    const m = material as THREE.MeshStandardMaterial;
    m.color.set(params.color);
    m.roughness = params.roughness;
    m.needsUpdate = true;
  },
});
```

Materials/environments/effects follow the identical shape (`defineX` +
`create`/optional `update`); see `src/content/environments.ts` and
`src/content/effects.ts` for those two kinds specifically (environments set
`scene.background`/lighting, effects add/remove an `EffectComposer` pass).

### Registering the new entry

Add it to the array in the matching `registerX()` function at the bottom of
the same file, e.g. `shapes.ts`'s `registerShapes()`:

```ts
export function registerShapes(): void {
  for (const def of [sphere, box, torus, /* ...existing entries..., */ myNewShape]) {
    if (!shapeRegistry.get(def.id)) shapeRegistry.register(def);
  }
}
```

That's the whole contract — one `defineX` object, one entry in the registration
array. `registerAllContent()` (`src/content/index.ts`) calls all four
`registerX()` functions; every consumer (harness, `app/`, generated embed
snippets) calls it explicitly once at startup.

### Guardrails to run after adding content

```bash
npm run typecheck        # src/ types
npm test                  # vitest — includes tests/content-smoke.test.ts,
                           # which asserts every registered shape/material
                           # creates cleanly from its own defaults (finite,
                           # non-empty geometry) — this is what catches a
                           # broken new entry before it reaches the UI
npm run build              # confirms dist/ output is still clean
```

If you add a *shape*, also add its `id` to `tests/leak-check.test.ts`'s sample
list unless it's SVG-based (see "Known limitations" below for why
`svg-extrude` is excluded).

## How code export works (`Copy Code` button)

`generateEmbedCode()` (`src/runtime/embed.ts`) serializes the current
`Composition` to JSON (`serializeComposition`) and references the bundled
`forma.browser.js` IIFE:

```html
<div id="forma-mount"></div>
<script src="./forma.browser.js"></script>
<script>
  Forma.registerAllContent();
  const composition = { /* ...serialized shape/material/environment/effect ids + params... */ };
  Forma.mountForma(document.getElementById('forma-mount'), composition);
</script>
```

Two things make this snippet actually runnable, both fixed in M0 after being
broken pre-work:

1. **`registerAllContent()` is called explicitly, not imported for its side
   effects.** `package.json` sets `"sideEffects": false` so bundlers are free
   to tree-shake a bare `import 'forma/content'` that appears to do nothing at
   the call site — an explicit function call survives tree-shaking.
2. **The browser IIFE contains Forma, content, Three.js, and cc-webgl.** No
   bundler or import map is required on the consuming page.

## Testing philosophy

- **`npm test` (vitest, `src/`)** covers pure logic — registries,
  serialization, diffing, the leak-check numeric proof — under happy-dom, which
  has no real WebGL context. It is necessary but not sufficient for UI claims.
- **Real headless-browser verification (Playwright/chromium) is required for
  any claim about actual rendering, user interaction, or exported output** —
  typecheck and vitest passing is not evidence a button works, a mesh renders
  correctly, or an exported PNG has the right pixels. Every milestone in this
  repo's `BRIEF.md` was verified this way against a live `npm run dev` server
  before being marked done; see `app/e2e/verify-m3.mjs` for a worked example
  (12 assertions against a real Playwright session) and the root README's
  "Manual verification checklist" for the harness-level equivalent.
- New UI-facing PRs should include or extend a Playwright check for the
  behavior they add, not just a passing typecheck.

## Known limitations relevant to contributors

- SVG import (`svg-extrude`) caps uploads at 100KB and falls back to a
  built-in default glyph on parse failure — don't remove the cap without
  discussing performance implications for very large paths.
- `svg-extrude` is excluded from `tests/leak-check.test.ts` and
  `tests/content-smoke.test.ts`'s shape lists — happy-dom's `DOMParser`
  doesn't support `image/svg+xml` (returns a null `documentElement`). This is
  a happy-dom gap, not a Forma bug; SVG behavior is covered by Playwright
  checks against a real browser DOM instead. Any other SVG-dependent content
  you add will hit the same gap and needs the same treatment.

## PR expectations

- Keep `src/` framework-agnostic — no React or other UI-framework dependency
  inside `src/`. UI-only work belongs in `app/`.
- Run `npm run typecheck`, `npm test`, and `npm run build` in `src/` (and the
  matching `typecheck`/`build` in `app/` if you touched it) before opening a
  PR; state the results in the PR description.
- For anything touching rendering/interaction/export, include a description of
  how you verified it in a real browser (Playwright script, manual check with
  steps, or both) — see "Testing philosophy" above.
- Licensed MIT (`LICENSE`); by submitting a PR you agree your contribution is
  provided under the same license.

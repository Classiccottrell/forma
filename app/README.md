# Forma app — editor product UI

React + Vite product editor consuming the published `forma` library
(`Projects/Forma/`, one directory up) as `"forma": "file:.."`. `src/` itself stays
framework-agnostic; this app is the only React layer in the repo.

## Local development

```bash
# from Projects/Forma/ (the library root), once, before anything in app/ works:
npm install
npm run build        # tsc --emitDeclarationOnly && vite build -> dist/

cd app
npm install
npm run dev           # Vite dev server, printed localhost URL
```

**Why `npm run build` first, even for `npm run dev`.** `app/package.json`
declares `"forma": "file:.."` — a real npm dependency resolved through the
library's `package.json` `exports` map, which points at `./dist/index.js` and
`./dist/content/index.js`. If `dist/` doesn't exist yet (fresh clone, or after
`git pull`/`npm ci` in the library), `app/`'s Vite dev server and every build
step will fail to resolve `forma`/`forma/content` — this has been hit multiple
times during development.

`app/vite.config.ts` *does* alias `forma`/`forma/content` straight to `../src/`
in dev mode (`NODE_ENV === 'development'`) as an ergonomics shortcut — so once
`dist/` exists at least once, subsequent `npm run dev` sessions pick up live
edits to the library's `src/` without a rebuild each time. But that alias is
dev-only; it does not remove the one-time requirement to have run the library's
`npm run build` at least once (its `.d.ts` output is still needed for
`tsc --noEmit`, and `npm run build` in `app/` always resolves through `dist/`,
never the dev alias).

**Rule of thumb:** if `app/`'s dev server or build fails with a "Cannot find
module 'forma'" or similar resolution error, `cd .. && npm run build` first.

## Production build

```bash
cd app
npm run build   # tsc --noEmit && vite build -> app/dist/ (static assets)
```

Requires the library's own `npm run build` to have already produced `../dist/`
(see above — the production build path always resolves through `dist/`, never
the dev alias). Output is a fully static site: `app/dist/index.html` + hashed
`assets/*.js`/`*.css`. No server-side code, no API routes — copy `app/dist/` to
any static host.

`npm run preview` serves the built `app/dist/` locally for a final check before
deploying.

## Release checks

Run from `app/` after the library has been built:

```bash
npm run build
npm run check:bundle
npm run typecheck
cd .. && npm test && npm run typecheck && npm run typecheck:harness && npm run build
```

`check:bundle` measures the existing `dist/assets/*.js` output and fails above
900,000 JavaScript bytes or 250,000 summed gzip bytes. It does not build.

| Target | Status | Caveat |
| --- | --- | --- |
| Chrome / Edge / Firefox / Safari | Supported | Recent WebGL2-enabled versions |
| GitHub Pages project site | Supported | Build with `FORMA_BASE=/<repo>/` |
| Cloudflare Pages | Supported | Root directory must include library and app |
| Vercel | Supported | Root directory must include library and app |
| Browser QA | Required before release | Local Chromium is currently blocked by macOS `bootstrap_check_in` permissions |

## Deployment

`app/vite.config.ts` sets `base: process.env.FORMA_BASE ?? '/'`. Most hosts
serve from the domain root and need no change. GitHub Pages *project* sites
(`https://<user>.github.io/<repo>/`) are the exception — set `FORMA_BASE` to
`/<repo>/` at build time or asset URLs will 404.

### GitHub Pages

```bash
cd Projects/Forma && npm run build
cd app && FORMA_BASE=/forma/ npm run build   # replace 'forma' with the actual repo name
```

Then publish `app/dist/` as the Pages source — either:

- **Manual:** push `app/dist/`'s contents to a `gh-pages` branch (e.g. via the
  `gh-pages` npm package or `git subtree push`), and set the repo's Pages source
  to that branch in Settings -> Pages.
- **Actions:** this repo ships `.github/workflows/deploy-gh-pages.yml`, which
  builds and deploys `app/dist/` on push to `main` using
  `actions/deploy-pages`. **Unverified beyond YAML syntax** — there is no live
  GitHub Actions runner available in this environment to actually execute it;
  review it before relying on it, and enable Pages -> "GitHub Actions" as the
  source in the repo's Settings first.

If served from a *user/org* Pages site (`https://<user>.github.io/`, repo named
`<user>.github.io`) rather than a project site, use `FORMA_BASE=/` (the
default) instead.

### Cloudflare Pages

- Framework preset: None / Vite.
- Build command: `cd .. && npm run build && cd app && npm run build`
  (or split into two Cloudflare "build steps" if the dashboard supports it —
  the library must build before the app).
- Build output directory: `app/dist`
- Root directory: `/` (repo root) — Cloudflare needs to see both `Projects/Forma`'s
  library and `app/` in the same checkout; do not set root to `app/` alone or
  the `file:..` dependency won't resolve during `npm install`.
- `FORMA_BASE` env var: leave unset (defaults to `/`) — Cloudflare Pages serves
  from the domain/subdomain root.

### Vercel

- Framework preset: Vite.
- Root directory: repo root (same reasoning as Cloudflare — `file:..` needs the
  library present in the checkout).
- Build command override:
  `npm install && npm run build && cd app && npm install && npm run build`
- Output directory: `app/dist`
- `FORMA_BASE`: leave unset (Vercel serves from the domain root).

## Testing this app

`app/` has no separate unit-test suite — parameter-schema/registry logic is
covered by the library's own `npm test` (root `Projects/Forma/`, vitest,
happy-dom). UI behavior is verified with real headless-browser scripts, not
mocked DOM tests, because WebGL/OrbitControls/PNG-export/clipboard behavior
does not exist under happy-dom:

```bash
npm run dev -- --port 5183 --strictPort   # shell 1, from app/
node e2e/verify-m3.mjs                     # shell 2, from app/
```

See the root README's "Editor UX (M3)" section for what `verify-m3.mjs`
actually checks (12 assertions against a live Playwright/chromium session).

## Browser support

Requires WebGL2 (`three` is pinned to `^0.185.1`, which targets WebGL2 —
`src/scene/createFormaScene.ts` constructs a plain `THREE.WebGLRenderer`, no
WebGL1 fallback path exists or is planned). Any evergreen desktop or mobile
browser with WebGL2 enabled works — Chrome/Edge/Firefox/Safari (recent
versions). Mobile touch support (orbit/zoom via OrbitControls' built-in touch
handling, responsive collapsed panel under 640px) verified in M3 — see root
README.

## Known limitations

- SVG import (`svg-extrude` shape) caps uploads at 100KB; oversized or
  malformed SVGs fall back to a built-in default glyph rather than failing
  silently (M2).
- `svg-extrude` is excluded from the library's automated leak-check and
  content-smoke tests — happy-dom's `DOMParser` doesn't support
  `image/svg+xml` parsing (returns a null `documentElement`), not a Forma bug.
  Covered instead by the Playwright scripts above, against a real browser DOM.
- Production bundle is a single ~812 KB (219 KB gzipped) JS chunk — see the
  root README's "Bundle size" note for why this is treated as expected, not a
  regression to fix.

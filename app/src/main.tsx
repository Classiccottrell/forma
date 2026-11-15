import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import HomePage from './HomePage';
import './global.css';
import { EDITOR_PATH } from './base';

// Asset URLs below resolve against document.baseURI, so `<base>/editor/` (Pages'
// directory URL for editor/index.html) must drop its trailing slash before they
// are computed.
if (window.location.pathname === `${EDITOR_PATH}/`) {
  history.replaceState(null, '', EDITOR_PATH + window.location.search + window.location.hash);
}

document.documentElement.style.setProperty(
  '--forma-sky-url',
  `url(${new URL('backgrounds/dusk-sky.png', document.baseURI).href})`,
);
for (const [name, path] of [
  ['linen', 'textures/linen-blue/color.jpg'],
  ['brushed-metal', 'textures/brushed-metal/color.jpg'],
  ['mineral', 'textures/mineral-matte/color.jpg'],
] as const) {
  document.documentElement.style.setProperty(
    `--forma-texture-${name}-url`,
    `url(${new URL(path, document.baseURI).href})`,
  );
}

// Two pages, one entry. The editor (and with it three.js) is its own chunk, loaded only
// on its route; every other path is the homepage.
const isEditor = window.location.pathname === EDITOR_PATH;
const Editor = lazy(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isEditor ? <Suspense fallback={<div className="route-loading" role="status">Loading the editor…</div>}><Editor /></Suspense> : <HomePage />}
  </StrictMode>
);

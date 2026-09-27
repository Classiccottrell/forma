import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

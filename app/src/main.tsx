import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './global.css';

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

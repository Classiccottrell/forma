import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './global.css';

document.documentElement.style.setProperty(
  '--forma-sky-url',
  `url(${new URL('backgrounds/dusk-sky.png', document.baseURI).href})`,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

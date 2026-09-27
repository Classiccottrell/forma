/** Vite `base` — '/' by default, '/<repo>/' on a GitHub Pages project site
 * (FORMA_BASE). Always ends with '/'. Root-absolute hrefs would escape it. */
export const BASE_URL = import.meta.env.BASE_URL;
export const EDITOR_PATH = `${BASE_URL}editor`;

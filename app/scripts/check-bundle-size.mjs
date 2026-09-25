import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const assetsDir = new URL('../dist/assets/', import.meta.url);
const jsBudget = 900_000;
const gzipBudget = 250_000;

let files;
try {
  files = (await readdir(assetsDir)).filter((file) => file.endsWith('.js')).sort();
} catch {
  console.error('Bundle check failed: app/dist/assets is missing. Run `npm run build` first.');
  process.exit(1);
}

if (files.length === 0) {
  console.error('Bundle check failed: no JavaScript assets found in app/dist/assets. Run `npm run build` first.');
  process.exit(1);
}

let jsBytes = 0;
let gzipBytes = 0;
for (const file of files) {
  const path = join(assetsDir.pathname, file);
  const bytes = await stat(path).then(({ size }) => size);
  jsBytes += bytes;
  gzipBytes += gzipSync(await readFile(path)).length;
}

console.log(`JavaScript: ${jsBytes.toLocaleString()} bytes / ${jsBudget.toLocaleString()} budget`);
console.log(`Gzip:       ${gzipBytes.toLocaleString()} bytes / ${gzipBudget.toLocaleString()} budget`);

const failures = [];
if (jsBytes > jsBudget) failures.push(`JavaScript exceeds ${jsBudget.toLocaleString()} bytes`);
if (gzipBytes > gzipBudget) failures.push(`gzip exceeds ${gzipBudget.toLocaleString()} bytes`);
if (failures.length) {
  console.error(`Bundle check failed: ${failures.join('; ')}.`);
  process.exit(1);
}

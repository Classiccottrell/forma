import * as THREE from 'three';
import { FormaRuntime } from '../src/index.js';
import { registerAllContent } from '../src/content/index.js';

let registered = false;
export function ensureHarnessContentRegistered(): void {
  if (registered) return;
  registerAllContent();
  registered = true;
}

/** Headless FormaRuntime — no real WebGL context. Effects created by the harness
 * ('none' stub) never touch `renderer`, so a minimal mock satisfies the type without
 * needing a browser GL context (advisor guidance: keep renderer refs out of the
 * shape/material/environment paths so this stays constructible in vitest+happy-dom). */
export function makeHeadlessRuntime(): FormaRuntime {
  ensureHarnessContentRegistered();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const renderer = {} as THREE.WebGLRenderer;
  return new FormaRuntime({ scene, camera, renderer });
}

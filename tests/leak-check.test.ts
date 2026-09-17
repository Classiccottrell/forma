import { describe, it, expect } from 'vitest';
import { shapeRegistry, materialRegistry, environmentRegistry } from '../src/index.js';
import { runLeakCheck, type Combo } from '../harness/leak-check.js';
import { makeHeadlessRuntime } from './testUtils.js';

// Seeded PRNG so the run is reproducible but still exercises many combos.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('leak-free repeated-switching stress test (blueprint §5.5)', () => {
  it('merged report returns to post-warm-up baseline every cycle, across >=50 cycles', () => {
    const runtime = makeHeadlessRuntime();
    // `svg-extrude` excluded: SVGLoader.parse() needs a real 'image/svg+xml'-capable
    // DOMParser, which happy-dom doesn't support (see content-smoke.test.ts) — covered
    // instead by real headless-browser Playwright checks against a live dev server.
    const shapes = shapeRegistry.list().filter((s) => s.id !== 'svg-extrude');
    const materials = materialRegistry.list();
    const environments = environmentRegistry.list();
    // M2 expansion (roadmap §2/§3): full cartesian product would be
    // 18 x 15 x 6 = 1620 combos, too slow to cycle 50-75x in a unit test. Instead
    // sample a stratified set sized to guarantee every shape/material/environment
    // is exercised multiple times (round-robin with decorrelated offsets), same
    // stress-test intent at a bounded cost.
    const sampleSize = 360;
    const combos: Combo[] = [];
    for (let i = 0; i < sampleSize; i++) {
      const s = shapes[i % shapes.length]!;
      const m = materials[(i + Math.floor(i / shapes.length)) % materials.length]!;
      const e = environments[i % environments.length]!;
      combos.push({ shapeId: s.id, materialId: m.id, environmentId: e.id });
    }
    expect(combos.length).toBe(sampleSize);
    // Every third combo also carries the 'none' stub effect — exercises the
    // effects slot's create()/dispose() path (otherwise never invoked since
    // effectIds: [] is the harness default everywhere else).
    combos.forEach((c, i) => {
      if (i % 3 === 0) c.effectIds = ['none'];
    });

    const result = runLeakCheck(
      runtime,
      combos,
      (id) => shapeRegistry.require(id).defaultParameters,
      (id) => materialRegistry.require(id).defaultParameters,
      40,
      mulberry32(42)
    );

    // eslint-disable-next-line no-console
    console.log(
      `[forma leak-check] pass=${result.pass} baseline=${result.baseline} maxEndTotal=${result.maxEndTotal} maxMidTotal=${result.maxMidTotal} maxSlotConcurrencyBound=${result.maxSlotConcurrency} cycles=${result.cycles.length} failures=${result.failures.length}`
    );

    expect(result.cycles.length).toBe(40);
    expect(result.failures).toEqual([]);
    expect(result.maxEndTotal).toBe(result.baseline);
    expect(result.pass).toBe(true);
  });
});

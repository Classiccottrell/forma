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
    const combos: Combo[] = [];
    for (const s of shapeRegistry.list()) {
      for (const m of materialRegistry.list()) {
        for (const e of environmentRegistry.list()) {
          combos.push({ shapeId: s.id, materialId: m.id, environmentId: e.id });
        }
      }
    }
    // 10 shapes x 8 materials x 3 environments = 240 combinations (M1 expansion,
    // roadmap §3 — was 32 at pre-work/M0 scale).
    expect(combos.length).toBe(240);
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
      75,
      mulberry32(42)
    );

    // eslint-disable-next-line no-console
    console.log(
      `[forma leak-check] pass=${result.pass} baseline=${result.baseline} maxEndTotal=${result.maxEndTotal} maxMidTotal=${result.maxMidTotal} maxSlotConcurrencyBound=${result.maxSlotConcurrency} cycles=${result.cycles.length} failures=${result.failures.length}`
    );

    expect(result.cycles.length).toBe(75);
    expect(result.failures).toEqual([]);
    expect(result.maxEndTotal).toBe(result.baseline);
    expect(result.pass).toBe(true);
  });
});

import type { FormaRuntime } from '../src/index.js';
import type { Composition } from '../src/index.js';

export interface Combo {
  shapeId: string;
  materialId: string;
  environmentId: string;
  effectIds?: string[];
}

export function buildComposition(combo: Combo, shapeParams: Record<string, any>, materialParams: Record<string, any>): Composition {
  const effectIds = combo.effectIds ?? [];
  const effectParams: Record<string, Record<string, any>> = {};
  for (const id of effectIds) effectParams[id] = {};
  return {
    shapeId: combo.shapeId,
    shapeParams,
    materialId: combo.materialId,
    materialParams,
    environmentId: combo.environmentId,
    environmentParams: {},
    effectIds,
    effectParams,
  };
}

export interface CycleLog {
  cycle: number;
  comboIndex: number;
  endTotal: number;
  maxDuringCycle: number;
}

export interface LeakCheckResult {
  baseline: number;
  maxSlotConcurrency: number;
  cycles: CycleLog[];
  maxEndTotal: number;
  maxMidTotal: number;
  pass: boolean;
  failures: string[];
}

/**
 * Leak-free repeated-switching stress test (blueprint §5.5). Deliberately different
 * assertion shape than cc-webgl's Cube Stress Test: this mount is never unmounted —
 * environment/mesh resources persist by design — so the assertion is "merged report
 * returns to post-warm-up baseline every cycle", not "post-dispose total === 0".
 */
export function runLeakCheck(
  runtime: FormaRuntime,
  combos: Combo[],
  defaultShapeParamsFor: (shapeId: string) => Record<string, any>,
  defaultMaterialParamsFor: (materialId: string) => Record<string, any>,
  cycles = 50,
  rng: () => number = Math.random
): LeakCheckResult {
  const applyCombo = (combo: Combo) => {
    runtime.applyComposition(
      buildComposition(combo, defaultShapeParamsFor(combo.shapeId), defaultMaterialParamsFor(combo.materialId))
    );
  };

  // 1. Warm-up: apply every combo in sequence, end back on combo 0. Not asserted.
  for (const combo of combos) applyCombo(combo);
  applyCombo(combos[0]!);

  // 2. Baseline immediately after warm-up settles on combo 0.
  const baseline = runtime.reportTotal();

  // Sanity bound (hand-chosen, not derived from combos): three independently
  // switchable slots participate in each cycle's inner apply (shape, material,
  // environment — effects only append when a combo opts in). A single mid-cycle
  // switch never rebuilds more than one slot at a time in applyComposition's
  // sequential shape->material->environment->effects pass, so a transient bump of
  // more than 3 report() entries above baseline mid-switch would indicate two
  // slots' old+new resources coexisting simultaneously — the double-allocation bug
  // this bound exists to catch.
  const maxSlotConcurrency = 3;

  const failures: string[] = [];
  const cycleLogs: CycleLog[] = [];
  let maxEndTotal = baseline;

  for (let cycle = 1; cycle <= cycles; cycle++) {
    const comboIndex = Math.floor(rng() * combos.length);
    const combo = combos[comboIndex]!;

    applyCombo(combo);
    const mid = runtime.reportTotal();
    if (mid > baseline + maxSlotConcurrency) {
      failures.push(`cycle ${cycle}: mid-switch total ${mid} exceeded baseline+${maxSlotConcurrency} (${baseline + maxSlotConcurrency})`);
    }

    applyCombo(combos[0]!);
    const endTotal = runtime.reportTotal();
    if (endTotal !== baseline) {
      failures.push(`cycle ${cycle}: end-of-cycle total ${endTotal} !== baseline ${baseline}`);
    }
    maxEndTotal = Math.max(maxEndTotal, endTotal);

    cycleLogs.push({ cycle, comboIndex, endTotal, maxDuringCycle: Math.max(mid, endTotal) });
  }

  // Non-monotonic-increasing across the full run: the max end-of-cycle total across
  // all N cycles must equal baseline (no slow accumulation a single-cycle check could
  // miss).
  if (maxEndTotal !== baseline) {
    failures.push(`run: max end-of-cycle total across all cycles ${maxEndTotal} !== baseline ${baseline}`);
  }

  const maxMidTotal = cycleLogs.length ? Math.max(...cycleLogs.map((c) => c.maxDuringCycle)) : baseline;

  return {
    baseline,
    maxSlotConcurrency,
    cycles: cycleLogs,
    maxEndTotal,
    maxMidTotal,
    pass: failures.length === 0,
    failures,
  };
}

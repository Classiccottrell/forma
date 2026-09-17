import type { ParamSchemaMap, RegistryEntryBase } from '../types.js';

/** Generic registry class (blueprint §2). One instantiation per definition kind. */
export class DefinitionRegistry<D extends RegistryEntryBase<any>> {
  private entries = new Map<string, D>();

  register(def: D): void {
    if (this.entries.has(def.id)) throw new Error(`duplicate id: ${def.id}`);
    this.entries.set(def.id, def);
  }
  get(id: string): D | undefined {
    return this.entries.get(id);
  }
  require(id: string): D {
    const d = this.get(id);
    if (!d) throw new Error(`unknown id: ${id}`);
    return d;
  }
  list(): D[] {
    return Array.from(this.entries.values());
  }
  listByCategory(category: string): D[] {
    return this.list().filter((d) => d.category === category);
  }
}

// Re-export for convenience where only the schema-map generic constraint is needed.
export type { ParamSchemaMap };

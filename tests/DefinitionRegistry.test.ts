import { describe, it, expect } from 'vitest';
import { DefinitionRegistry } from '../src/registry/DefinitionRegistry.js';
import type { RegistryEntryBase } from '../src/types.js';

interface Dummy extends RegistryEntryBase<Record<string, never>> {}

function dummy(id: string, category = 'x'): Dummy {
  return { id, label: id, category, parameterSchema: {}, defaultParameters: {} };
}

describe('DefinitionRegistry', () => {
  it('registers and gets', () => {
    const r = new DefinitionRegistry<Dummy>();
    r.register(dummy('a'));
    expect(r.get('a')?.id).toBe('a');
    expect(r.get('missing')).toBeUndefined();
  });

  it('require throws on unknown id', () => {
    const r = new DefinitionRegistry<Dummy>();
    expect(() => r.require('nope')).toThrow(/unknown id/);
  });

  it('register throws on duplicate id', () => {
    const r = new DefinitionRegistry<Dummy>();
    r.register(dummy('a'));
    expect(() => r.register(dummy('a'))).toThrow(/duplicate id/);
  });

  it('list and listByCategory', () => {
    const r = new DefinitionRegistry<Dummy>();
    r.register(dummy('a', 'cat1'));
    r.register(dummy('b', 'cat2'));
    r.register(dummy('c', 'cat1'));
    expect(r.list().map((d) => d.id).sort()).toEqual(['a', 'b', 'c']);
    expect(r.listByCategory('cat1').map((d) => d.id).sort()).toEqual(['a', 'c']);
  });
});

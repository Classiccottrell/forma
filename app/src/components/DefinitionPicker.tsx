export interface DefinitionPickerEntry {
  id: string;
  label: string;
  category: string;
}

export interface DefinitionPickerProps {
  entries: DefinitionPickerEntry[];
  selectedId: string;
  onSelect(id: string): void;
  filter?: string;
}

/** Generic grid of registry entries for one slot — reused for shapes, materials,
 * environments, effects via a plain data prop (roadmap §6). Thumbnail is a label
 * glyph (no rendered preview asset in M1 — an acceptable scope narrowing; the
 * picker's job is fast switching, not gallery imagery). */
export function DefinitionPicker({ entries, selectedId, onSelect, filter }: DefinitionPickerProps) {
  const visible = filter
    ? entries.filter((e) => e.label.toLowerCase().includes(filter.toLowerCase()) || e.category.toLowerCase().includes(filter.toLowerCase()))
    : entries;
  return (
    <div className="picker-grid">
      {visible.map((e) => (
        <button
          key={e.id}
          type="button"
          className={`picker-cell${e.id === selectedId ? ' selected' : ''}`}
          onClick={() => onSelect(e.id)}
          title={e.category}
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}

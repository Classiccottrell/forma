import { useMemo, useState } from 'react';
import type { Composition } from 'forma';
import { readHomepagePresets, writeHomepagePresets, type HomepageTarget } from '../homepagePresets';

export default function CreatorPanel({ composition }: { composition: Composition }) {
  const [state, setState] = useState(readHomepagePresets);
  const [name, setName] = useState('New composition');
  const [target, setTarget] = useState<HomepageTarget>('studio');
  const entries = useMemo(() => state.entries.filter((entry) => entry.target === target), [state.entries, target]);

  function save() {
    const entry = { id: `${target}-${Date.now()}`, name: name.trim() || 'Untitled composition', target, composition };
    const next = { entries: [...state.entries, entry], selected: { ...state.selected, [target]: entry.id } };
    writeHomepagePresets(next);
    setState(next);
  }

  function select(id: string) {
    const next = { ...state, selected: { ...state.selected, [target]: id } };
    writeHomepagePresets(next);
    setState(next);
  }

  return <aside className="creator-panel" aria-label="Creator mode panel">
    <div className="home-card-kicker">Creator / local only</div>
    <p>Save the current composition as a homepage configuration.</p>
    <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Homepage<select value={target} onChange={(event) => setTarget(event.target.value as HomepageTarget)}><option value="studio">Studio</option><option value="gallery">Gallery</option></select></label>
    <button type="button" className="btn primary" onClick={save}>Save current composition</button>
    <label>Use saved configuration<select value={state.selected[target] ?? ''} onChange={(event) => select(event.target.value)}><option value="">Built-in default</option>{entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
  </aside>;
}

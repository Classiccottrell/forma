import type { KeyboardEvent, RefObject } from 'react';

/** Keyboard movement for a grid of role="option" buttons (the WAI-ARIA listbox pattern).
 * The grid is one tab stop: the selected option, or the first when nothing is selected
 * (see `optionTabIndex`), and the arrow keys move focus between the rest. Left and right
 * step one option; up and down step one row; Home and End go to the ends. */
export function useOptionKeys(ref: RefObject<HTMLElement>): (event: KeyboardEvent<HTMLElement>) => void {
  return (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const root = ref.current;
    if (!root) return;
    const options = Array.from(root.querySelectorAll<HTMLElement>('[role="option"]'));
    const current = options.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;
    // Options per row: how many share the first option's top edge.
    const firstTop = options[0]!.offsetTop;
    const rowLength = options.findIndex((option) => option.offsetTop !== firstTop);
    const columns = rowLength < 0 ? options.length : rowLength;
    const next = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current - columns,
      ArrowDown: current + columns,
      Home: 0,
      End: options.length - 1,
    }[event.key]!;
    if (next < 0 || next >= options.length || next === current) return;
    event.preventDefault();
    options[next]!.focus();
  };
}

/** Which option is the grid's tab stop: the selected one if it is shown, else the first. */
export function optionTabIndex(index: number, id: string, selectedId: string, ids: readonly string[]): 0 | -1 {
  if (ids.includes(selectedId)) return id === selectedId ? 0 : -1;
  return index === 0 ? 0 : -1;
}

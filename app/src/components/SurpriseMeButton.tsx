import type { Composition } from 'forma';
import { surpriseMe } from 'forma/content';

export interface SurpriseMeButtonProps {
  onApply(composition: Composition): void;
}

/** Picks a coherent random `Composition` (roadmap §5) and applies it in one action. */
export function SurpriseMeButton({ onApply }: SurpriseMeButtonProps) {
  return (
    <button type="button" className="btn" data-testid="surprise-me-btn" onClick={() => onApply(surpriseMe())}>
      Surprise me
    </button>
  );
}

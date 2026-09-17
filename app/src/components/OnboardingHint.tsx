import { useState } from 'react';

const STORAGE_KEY = 'forma:onboarding-dismissed';

/** Lightweight, dismissible one-liner shown on first load only — not a tour/modal
 * system (roadmap M3 item 6 explicitly caps scope here). */
export function OnboardingHint() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode / storage disabled — dismiss for this session only */
    }
    setDismissed(true);
  }

  return (
    <div className="onboarding-hint" data-testid="onboarding-hint">
      <span>Drag to orbit · scroll to zoom · try ✨ Surprise Me</span>
      <button type="button" className="onboarding-dismiss" onClick={dismiss} aria-label="Dismiss hint" data-testid="onboarding-dismiss">
        ×
      </button>
    </div>
  );
}

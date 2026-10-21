import type { Preferences } from '../api';
import { setTimeFormat } from './time';

/** Puts preferences into effect on this page: clock and motion. */
export function applyPreferences(prefs: Preferences) {
  setTimeFormat(prefs.timeFormat);
  const root = document.documentElement;
  if (prefs.motion === 'system') delete root.dataset.motion;
  else root.dataset.motion = prefs.motion;
}

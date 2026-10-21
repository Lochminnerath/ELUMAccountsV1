import type { ReactNode } from 'react';
import './AppRing.css';

/**
 * Your picture, ringed by the ELUM apps you have: one arc per app, in brand order from the top,
 * lit in the app's colour once it is in your account (got in ELUM Store, or signed in to), and a
 * faint outline until then.
 */

export const RING_APPS = [
  { id: 'write', name: 'Write', color: '#f59a52' },
  { id: 'type', name: 'Type', color: '#3fc4a0' },
  { id: 'make', name: 'Make', color: '#ec7fa9' },
  { id: 'browse', name: 'Browse', color: '#9b84ee' },
  { id: 'store', name: 'Store', color: '#e9b949' },
] as const;

/** The gap between arcs, in degrees. */
const GAP = 7;

export interface Arc {
  id: string;
  name: string;
  color: string;
  on: boolean;
  /** SVG path of the arc, centred on (0, 0). */
  d: string;
}

function point(r: number, deg: number): string {
  const rad = ((deg - 90) * Math.PI) / 180;
  return `${(r * Math.cos(rad)).toFixed(2)} ${(r * Math.sin(rad)).toFixed(2)}`;
}

/** The five arcs around a circle of radius `r`, each marked on when that app is in `has`. */
export function ringArcs(has: ReadonlySet<string>, r: number): Arc[] {
  const span = 360 / RING_APPS.length;
  return RING_APPS.map((app, i) => {
    const from = i * span + GAP / 2;
    const to = (i + 1) * span - GAP / 2;
    return { ...app, on: has.has(app.id), d: `M ${point(r, from)} A ${r} ${r} 0 0 1 ${point(r, to)}` };
  });
}

/** Words for screen readers: which apps are in the account and which are not yet. */
export function ringLabel(has: ReadonlySet<string>): string {
  const on = RING_APPS.filter((a) => has.has(a.id)).map((a) => a.name);
  const off = RING_APPS.filter((a) => !has.has(a.id)).map((a) => a.name);
  if (!on.length) return 'No ELUM apps added yet';
  if (!off.length) return 'Every ELUM app is in your account';
  return `In your account: ${on.join(', ')}. Not yet: ${off.join(', ')}.`;
}

/** Wraps a picture of `size` pixels in the ring. */
export function AppRing({ has, size, children }: { has: ReadonlySet<string>; size: number; children: ReactNode }) {
  const stroke = Math.max(4, Math.round(size / 14));
  const gap = Math.max(5, Math.round(size / 12));
  const r = size / 2 + gap + stroke / 2;
  const box = Math.ceil(2 * (r + stroke / 2));
  const arcs = ringArcs(has, r);
  return (
    <span className="app-ring" style={{ width: box, height: box }} role="img" aria-label={ringLabel(has)}>
      <svg className="app-ring__svg" width={box} height={box} viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`} aria-hidden="true">
        {arcs.map((arc, i) => (
          <path
            key={arc.id}
            d={arc.d}
            className={`app-ring__arc${arc.on ? ' is-on' : ''}`}
            style={{ stroke: arc.on ? arc.color : undefined, strokeWidth: stroke, animationDelay: `${i * 90}ms` }}
            pathLength={1}
          >
            <title>{arc.on ? `${arc.name}: in your account` : `${arc.name}: not added yet`}</title>
          </path>
        ))}
      </svg>
      <span className="app-ring__picture">{children}</span>
    </span>
  );
}

import { describe, expect, it } from 'vitest';
import { RING_APPS, ringArcs, ringLabel } from './AppRing';

describe('the app ring', () => {
  it('has one arc per ELUM app, in brand order, lit only for the apps in the account', () => {
    const arcs = ringArcs(new Set(['write', 'make', 'store']), 50);
    expect(arcs.map((a) => a.id)).toEqual(['write', 'type', 'make', 'browse', 'store']);
    expect(arcs.filter((a) => a.on).map((a) => a.id)).toEqual(['write', 'make', 'store']);
    expect(arcs.find((a) => a.id === 'make')?.color).toBe('#ec7fa9');
  });

  it('starts at the top and leaves a gap between arcs', () => {
    const [first] = ringArcs(new Set(), 50);
    // Just right of twelve o'clock, on the circle.
    const [x, y] = first.d.split(' ').slice(1, 3).map(Number);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeCloseTo(-50, 0);
    expect(Math.hypot(x, y)).toBeCloseTo(50, 1);
  });

  it('says which apps are in the account', () => {
    expect(ringLabel(new Set())).toBe('No ELUM apps added yet');
    expect(ringLabel(new Set(RING_APPS.map((a) => a.id)))).toBe('Every ELUM app is in your account');
    expect(ringLabel(new Set(['type', 'browse']))).toBe('In your account: Type, Browse. Not yet: Write, Make, Store.');
  });
});

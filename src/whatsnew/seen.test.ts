import { describe, expect, it } from 'vitest';
import type { Release } from './releases';
import { METADATA_KEY, whatsNewPlan } from './seen';

const r = (id: string): Release => ({ id, date: id, title: id, intro: 'i', features: [{ title: 't', text: 'x', art: 'spark' }] });
const list = [r('2026-10-31'), r('2026-10-20'), r('2026-10-19')];

describe("what's new, remembered on the account", () => {
  it('shows nothing to someone new, and remembers the latest', () => {
    expect(whatsNewPlan(list, null)).toEqual({ show: [], record: '2026-10-31' });
  });
  it('shows every release newer than the last one seen', () => {
    expect(whatsNewPlan(list, '2026-10-19').show.map((x) => x.id)).toEqual(['2026-10-31', '2026-10-20']);
    expect(whatsNewPlan(list, '2026-10-19').record).toBeNull();
  });
  it('shows nothing once the latest was seen', () => {
    expect(whatsNewPlan(list, '2026-10-31')).toEqual({ show: [], record: null });
  });
  it('leaves a release from a newer version alone', () => {
    expect(whatsNewPlan(list, '2026-11-02')).toEqual({ show: [], record: null });
  });
  it('quietly moves on from a release that no longer exists', () => {
    expect(whatsNewPlan(list, '2026-01-01')).toEqual({ show: [], record: '2026-10-31' });
  });
  it('has nothing to do without releases', () => {
    expect(whatsNewPlan([], 'x')).toEqual({ show: [], record: null });
  });
  it('keeps one flat key per app', () => {
    expect(METADATA_KEY).toBe('whatsnew_account');
  });
});

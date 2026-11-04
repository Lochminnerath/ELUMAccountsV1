import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnsureCheck } from './EnsureCheck';
import { previewEnsure } from './ensure';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));
const ring = () => host.querySelector<HTMLButtonElement>('.ensure__ring')!;
const status = () => host.querySelector('[role=status]')!.textContent ?? '';
const fire = (type: string, init: EventInit & { key?: string } = {}) =>
  act(() => {
    const e = type.startsWith('key') ? new KeyboardEvent(type, { bubbles: true, ...init }) : new MouseEvent(type, { bubbles: true, ...init });
    ring().dispatchEvent(e);
  });

async function ready(onPass: (p: string | null) => void, action: 'sign_up' | 'sign_in' = 'sign_up', ensure = previewEnsure()) {
  await act(async () => root.render(<EnsureCheck ensure={ensure} action={action} onPass={onPass} />));
  for (let i = 0; i < 40 && ring().disabled; i++) await wait(25);
  expect(ring().disabled).toBe(false);
}

describe('ELUM Ensure check', () => {
  it('passes once the ring is held long enough', async () => {
    const ensure = previewEnsure();
    const verify = vi.spyOn(ensure, 'verify');
    const onPass = vi.fn();
    await ready(onPass, 'sign_up', ensure);
    fire('pointerdown');
    fire('pointermove');
    fire('pointermove');
    await wait(1500);
    expect(onPass).toHaveBeenLastCalledWith('p'.repeat(64));
    expect(verify.mock.calls[0][2]).toMatchObject({ moves: 2, keys: false });
    expect(verify.mock.calls[0][2].hold).toBeGreaterThanOrEqual(1000);
    expect(status()).toMatch(/all set/);
  });

  it('starts again when let go too soon', async () => {
    const onPass = vi.fn();
    await ready(onPass);
    fire('pointerdown');
    await wait(200);
    fire('pointerup');
    await wait(1300);
    expect(onPass).not.toHaveBeenCalledWith(expect.any(String));
    expect(status()).toMatch(/press and hold/i);
  });

  it('works from the keyboard', async () => {
    const onPass = vi.fn();
    await ready(onPass, 'sign_in');
    fire('keydown', { key: ' ' });
    await wait(1500);
    expect(onPass).toHaveBeenLastCalledWith(expect.any(String));
  });
});

import { describe, expect, it } from 'vitest';
import { LocalAccountApi } from './LocalAccountApi';

const make = () => new LocalAccountApi({ storage: localStorage, passwordIterations: 1 });

describe('LocalAccountApi', () => {
  it('keeps privacy rules for pictures and search', async () => {
    const api = make();
    await api.signUp({ kind: 'external', name: 'Ada', email: 'ada@example.org', password: 'password1' });
    const [kit] = await api.findPeople('kit');
    expect(kit).toBeUndefined(); // Kit lets only people Kit knows find them.
    const [fen] = await api.findPeople('fen');
    expect(fen.name).toBe('Fen Field');
    await api.setCircle(fen.id, 'friends');
    expect((await api.account()).circles.friends).toBe(1);
    expect((await api.people('friends'))[0].circle).toBe('friends');
    await api.setCircle(fen.id, null);
    expect(await api.people()).toEqual([]);
  });

  it('adds addresses with a code', async () => {
    const api = make();
    await api.signUp({ kind: 'external', name: 'Ada', email: 'ada@example.org', password: 'password1' });
    await api.startAddress('ada@home.example');
    await expect(api.confirmAddress('ada@home.example', '000000x')).rejects.toMatchObject({ code: 'invalid' });
    await api.confirmAddress('ada@home.example', api.lastCode!.code);
    expect((await api.account()).addresses.map((a) => a.address)).toContain('ada@home.example');
    await api.signOut();
    await expect(api.signIn({ login: 'ada@home.example', password: 'password1' })).resolves.toBeTruthy();
  });

  it('only deletes with the right confirmation', async () => {
    const api = make();
    await api.signUp({ kind: 'type', handle: 'ada', name: 'Ada', password: 'password1' });
    await expect(api.deleteAccount('nope')).rejects.toMatchObject({ code: 'invalid' });
    await api.deleteAccount('ada@type.elum.services');
    expect(await api.restoreSession()).toBeNull();
  });
});

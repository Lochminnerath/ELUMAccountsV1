import type { AccountApi } from '../client';
import { ApiError } from '../errors';
import type { Account, AccountAddress, Activity, Audience, Circle, Device, NotificationSetting, Person, Preferences, Privacy, ProfileChange, SecuritySettings, Session, SignInInput, SignUpInput } from '../types';
import { checkPassword, cleanName, handleProblem, isEmail, loginToEmail } from '../validation';
import { DEFAULT_ITERATIONS, hashPassword, verifyPassword, type PasswordHash } from './passwords';

const DEFAULT_PREFERENCES: Preferences = { timeFormat: 'auto', weekStart: 'auto', startApp: 'account', motion: 'system' };

/**
 * ELUM Accounts inside this browser, for previews. It keeps the platform's rules (who may see a
 * picture, find you or message you; circles; one account per address) so the pages behave the
 * same once Supabase is connected. Codes for new addresses are shown on screen instead of emailed.
 */

const KEY = 'elum.accounts.preview';
const SESSION_KEY = 'elum.accounts.preview.session';
export const COLORS = ['#f59a52', '#3fc4a0', '#9b84ee', '#ec7fa9', '#e9b949', '#7093f8'];

interface UserRow {
  id: string;
  name: string;
  email: string;
  color: string;
  accountType: 'type' | 'external';
  handle: string | null;
  locale: string | null;
  timeZone: string | null;
  createdAt: string;
  password: PasswordHash;
  picture: string | null;
  privacy: Privacy;
  aliases: { address: string; verified: boolean }[];
  codes: { address: string; code: string; expires: number }[];
  notifications: Record<string, { inApp: boolean; outside: boolean }>;
  activity: Activity[];
  joined: string[];
}

interface Db {
  users: Record<string, UserRow>;
  circles: Record<string, Record<string, Circle>>;
}

const LOCKED = { salt: '00', hash: '', iterations: 1 };
const now = () => new Date().toISOString();
const OPEN: Privacy = { picture: 'everyone', findable: 'everyone', messages: 'everyone' };

const DEMO: Partial<UserRow>[] = [
  { id: 'demo-fen', name: 'Fen Field', handle: 'fen', color: '#9b84ee', accountType: 'type' },
  { id: 'demo-rae', name: 'Rae Reed', handle: 'rae', color: '#ec7fa9', accountType: 'type' },
  { id: 'demo-ola', name: 'Ola Owner', email: 'ola@example.org', color: '#f59a52', accountType: 'external' },
  { id: 'demo-kit', name: 'Kit Moreno', email: 'kit@example.org', color: '#e9b949', accountType: 'external', privacy: { picture: 'known', findable: 'known', messages: 'known' } },
];

export const NOTIFICATION_TYPES: Omit<NotificationSetting, 'inApp' | 'outside'>[] = [
  { type: 'write.document.shared', service: 'write', serviceName: 'Write', description: 'Someone shares a document with you.' },
  { type: 'write.comment.created', service: 'write', serviceName: 'Write', description: 'Someone comments on your document.' },
  { type: 'write.comment.replied', service: 'write', serviceName: 'Write', description: 'Someone replies to your comment.' },
  { type: 'type.message.received', service: 'type', serviceName: 'Type', description: 'A message arrives in your Type inbox.' },
];

export interface LocalAccountApiOptions {
  storage?: Storage;
  typeDomain?: string;
  passwordIterations?: number;
}

export class LocalAccountApi implements AccountApi {
  readonly mode = 'local' as const;
  readonly typeDomain: string;
  private readonly storage: Storage;
  private readonly iterations: number;
  private readonly unauthorizedHandlers = new Set<() => void>();
  /** The last code "sent", so the preview can show it. */
  lastCode: { address: string; code: string } | null = null;

  constructor(options: LocalAccountApiOptions = {}) {
    this.storage = options.storage ?? localStorage;
    this.typeDomain = options.typeDomain ?? 'type.elum.services';
    this.iterations = options.passwordIterations ?? DEFAULT_ITERATIONS;
  }

  private read(): Db {
    let db: Db = { users: {}, circles: {} };
    try {
      const raw = this.storage.getItem(KEY);
      if (raw) db = JSON.parse(raw) as Db;
    } catch {
      // Start again.
    }
    for (const d of DEMO) {
      if (db.users[d.id!]) continue;
      db.users[d.id!] = {
        id: d.id!,
        name: d.name!,
        email: d.email ?? `${d.handle}@${this.typeDomain}`,
        color: d.color!,
        accountType: d.accountType!,
        handle: d.handle ?? null,
        locale: null,
        timeZone: null,
        createdAt: '2026-09-01T09:00:00.000Z',
        password: LOCKED,
        picture: null,
        privacy: d.privacy ?? OPEN,
        aliases: [],
        codes: [],
        notifications: {},
        activity: [],
        joined: ['write'],
      };
    }
    return db;
  }

  private write(db: Db) {
    try {
      this.storage.setItem(KEY, JSON.stringify(db));
    } catch {
      throw new ApiError('storage_full', 'This browser is out of space for the preview. Try a smaller picture.');
    }
  }

  private change<T>(fn: (db: Db, me: UserRow) => T): T {
    const db = this.read();
    const me = this.me(db);
    const result = fn(db, me);
    this.write(db);
    return result;
  }

  private me(db: Db): UserRow {
    const id = this.storage.getItem(SESSION_KEY);
    const user = id ? db.users[id] : undefined;
    if (!user) {
      this.unauthorizedHandlers.forEach((h) => h());
      throw new ApiError('unauthorized', 'Your session has ended. Sign in again.');
    }
    return user;
  }

  private log(me: UserRow, action: string, detail: Record<string, unknown> = {}) {
    me.activity = [{ action, service: 'elum', detail, at: now() }, ...me.activity].slice(0, 50);
  }

  // ---------------------------------------------------------------- sessions

  async restoreSession(): Promise<Session | null> {
    const db = this.read();
    const id = this.storage.getItem(SESSION_KEY);
    return id && db.users[id] ? { account: this.toAccount(db, db.users[id]) } : null;
  }

  async signIn(input: SignInInput): Promise<Session> {
    const db = this.read();
    const email = loginToEmail(input.login, this.typeDomain);
    const user = Object.values(db.users).find((u) => u.email === email || u.aliases.some((a) => a.verified && a.address === email));
    if (!user || !(await verifyPassword(input.password, user.password))) {
      throw new ApiError('invalid_credentials', 'That address and password do not match.');
    }
    this.storage.setItem(SESSION_KEY, user.id);
    this.write(db);
    return { account: this.toAccount(db, user) };
  }

  async signUp(input: SignUpInput): Promise<Session> {
    const name = cleanName(input.name);
    checkPassword(input.password);
    let email: string;
    let handle: string | null = null;
    if (input.kind === 'type') {
      const problem = handleProblem(input.handle);
      if (problem) throw new ApiError('invalid', problem, { field: 'handle' });
      handle = input.handle.trim().toLowerCase();
      email = `${handle}@${this.typeDomain}`;
    } else {
      email = input.email.trim().toLowerCase();
      if (!isEmail(email)) throw new ApiError('invalid', 'Enter a valid email address.', { field: 'email' });
    }
    const password = await hashPassword(input.password, this.iterations);
    const db = this.read();
    if (Object.values(db.users).some((u) => u.email === email || (handle !== null && u.handle === handle))) {
      throw handle
        ? new ApiError('conflict', 'That name is taken.', { field: 'handle' })
        : new ApiError('email_taken', 'An account with this email already exists. Sign in instead.', { field: 'email' });
    }
    const user: UserRow = {
      id: crypto.randomUUID(),
      name,
      email,
      color: COLORS[Object.keys(db.users).length % COLORS.length],
      accountType: input.kind,
      handle,
      locale: null,
      timeZone: null,
      createdAt: now(),
      password,
      picture: null,
      privacy: OPEN,
      aliases: input.kind === 'type' && input.recoveryEmail ? [{ address: input.recoveryEmail.trim().toLowerCase(), verified: false }] : [],
      codes: [],
      notifications: {},
      activity: [{ action: 'account.created', service: 'elum', detail: {}, at: now() }],
      joined: [],
    };
    db.users[user.id] = user;
    this.write(db);
    this.storage.setItem(SESSION_KEY, user.id);
    return { account: this.toAccount(db, user) };
  }

  async signOut(): Promise<void> {
    this.storage.removeItem(SESSION_KEY);
    this.unauthorizedHandlers.forEach((h) => h());
  }

  async handleAvailable(handle: string): Promise<boolean> {
    if (handleProblem(handle)) return false;
    return !Object.values(this.read().users).some((u) => u.handle === handle.trim().toLowerCase());
  }

  onUnauthorized(handler: () => void): () => void {
    this.unauthorizedHandlers.add(handler);
    return () => this.unauthorizedHandlers.delete(handler);
  }

  // ----------------------------------------------------------------- account

  async account(): Promise<Account> {
    const db = this.read();
    return this.toAccount(db, this.me(db));
  }

  async updateProfile(change: ProfileChange): Promise<Account> {
    return this.change((db, me) => {
      if (change.name !== undefined) me.name = cleanName(change.name);
      if (change.color !== undefined) {
        if (!COLORS.includes(change.color.toLowerCase())) throw new ApiError('invalid', 'Choose one of the ELUM colours.');
        me.color = change.color.toLowerCase();
      }
      if (change.locale !== undefined) me.locale = change.locale;
      if (change.timeZone !== undefined) me.timeZone = change.timeZone;
      this.log(me, 'profile.updated');
      return this.toAccount(db, me);
    });
  }

  async setPicture(image: Blob): Promise<Account> {
    if (image.size > 2 * 1024 * 1024) throw new ApiError('too_large', 'Pictures can be up to 2 MB.');
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new ApiError('invalid', 'That picture could not be read.'));
      r.readAsDataURL(image);
    });
    return this.change((db, me) => {
      me.picture = url;
      this.log(me, 'profile.picture_changed');
      return this.toAccount(db, me);
    });
  }

  async removePicture(): Promise<Account> {
    return this.change((db, me) => {
      me.picture = null;
      return this.toAccount(db, me);
    });
  }

  // ------------------------------------------------------------------ people

  async setPrivacy(change: Partial<Privacy>): Promise<Privacy> {
    return this.change((_db, me) => {
      me.privacy = { ...me.privacy, ...change };
      this.log(me, 'privacy.changed', change as Record<string, unknown>);
      return me.privacy;
    });
  }

  async people(circle?: Circle): Promise<Person[]> {
    const db = this.read();
    const me = this.me(db);
    const mine = db.circles[me.id] ?? {};
    return Object.entries(mine)
      .filter(([, c]) => !circle || c === circle)
      .map(([id]) => db.users[id])
      .filter(Boolean)
      .map((u) => this.toPerson(db, u, me))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async findPeople(query: string): Promise<Person[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const db = this.read();
    const me = this.me(db);
    return Object.values(db.users)
      .filter((u) => u.id !== me.id)
      .filter((u) => u.name.toLowerCase().includes(q) || u.email.startsWith(q) || (u.handle ?? '').startsWith(q))
      .filter((u) => allows(db, u, me.id, 'findable') || !!db.circles[me.id]?.[u.id])
      .map((u) => this.toPerson(db, u, me));
  }

  async setCircle(personId: string, circle: Circle | null): Promise<void> {
    this.change((db, me) => {
      if (personId === me.id) throw new ApiError('invalid', 'You are always in your own circle.');
      if (!db.users[personId]) throw new ApiError('not_found', 'We could not find that person.');
      db.circles[me.id] ??= {};
      if (circle) db.circles[me.id][personId] = circle;
      else delete db.circles[me.id][personId];
    });
  }

  // --------------------------------------------------------------- addresses

  async startAddress(address: string): Promise<void> {
    const a = address.trim().toLowerCase();
    if (!isEmail(a)) throw new ApiError('invalid', 'Enter a valid email address.');
    this.change((db, me) => {
      if (me.email === a || me.aliases.some((x) => x.address === a && x.verified)) throw new ApiError('conflict', 'That address is already on your account.');
      if (Object.values(db.users).some((u) => u.id !== me.id && (u.email === a || u.aliases.some((x) => x.verified && x.address === a)))) {
        throw new ApiError('conflict', 'That address belongs to another account.');
      }
      const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
      me.codes = [...me.codes.filter((c) => c.address !== a), { address: a, code, expires: Date.now() + 30 * 60_000 }];
      this.lastCode = { address: a, code };
    });
  }

  async confirmAddress(address: string, code: string): Promise<void> {
    this.change((_db, me) => {
      const pending = me.codes.find((c) => c.address === address);
      if (!pending || pending.expires < Date.now()) throw new ApiError('not_found', 'That code has expired. Ask for a new one.');
      if (pending.code !== code.trim()) throw new ApiError('invalid', 'That code does not match. Check it and try again.');
      me.codes = me.codes.filter((c) => c.address !== address);
      me.aliases = [...me.aliases.filter((a) => a.address !== address), { address, verified: true }];
      this.log(me, 'address.added', { address });
    });
  }

  async removeAddress(address: string): Promise<void> {
    this.change((_db, me) => {
      if (!me.aliases.some((a) => a.address === address)) throw new ApiError('invalid', 'Only added addresses can be removed. Your sign-in and Type addresses stay.');
      me.aliases = me.aliases.filter((a) => a.address !== address);
      this.log(me, 'address.removed', { address });
    });
  }

  // ---------------------------------------------------------------- security

  async changePassword(password: string): Promise<void> {
    checkPassword(password);
    const hash = await hashPassword(password, this.iterations);
    this.change((_db, me) => {
      me.password = hash;
      this.log(me, 'password.changed');
    });
  }

  async devices(): Promise<Device[]> {
    const db = this.read();
    this.me(db);
    return [{ id: 'this-browser', userAgent: navigator.userAgent, ip: null, signedInAt: now(), lastActiveAt: now(), current: true }];
  }

  async signOutOtherDevices(): Promise<void> {
    this.change((_db, me) => this.log(me, 'sessions.revoked'));
  }

  async signOutDevice(): Promise<void> {
    throw new ApiError('not_found', 'That device is already signed out.');
  }

  async security(): Promise<SecuritySettings> {
    return { approveSignIns: this.extra().approveSignIns ?? false };
  }

  async setSignInApprovals(on: boolean): Promise<SecuritySettings> {
    this.saveExtra({ approveSignIns: on });
    return this.security();
  }

  async preferences(): Promise<Preferences> {
    return { ...DEFAULT_PREFERENCES, ...this.extra().preferences };
  }

  async setPreferences(change: Partial<Preferences>): Promise<Preferences> {
    const next = { ...(await this.preferences()), ...change };
    this.saveExtra({ preferences: next });
    return next;
  }

  /** Settings kept beside the account in this browser (browser-only mode). */
  private extra(): { approveSignIns?: boolean; preferences?: Partial<Preferences> } {
    try {
      return JSON.parse(localStorage.getItem('elum.account.local.settings') ?? '{}');
    } catch {
      return {};
    }
  }

  private saveExtra(change: { approveSignIns?: boolean; preferences?: Preferences }) {
    try {
      localStorage.setItem('elum.account.local.settings', JSON.stringify({ ...this.extra(), ...change }));
    } catch {
      // Without storage the setting lasts until the page closes.
    }
  }

  async activity(): Promise<Activity[]> {
    const db = this.read();
    return this.me(db).activity;
  }

  async notificationSettings(): Promise<NotificationSetting[]> {
    const db = this.read();
    const me = this.me(db);
    return NOTIFICATION_TYPES.map((t) => ({ ...t, inApp: me.notifications[t.type]?.inApp ?? true, outside: me.notifications[t.type]?.outside ?? true }));
  }

  async setNotification(type: string, inApp: boolean, outside: boolean): Promise<void> {
    this.change((_db, me) => {
      me.notifications[type] = { inApp, outside };
    });
  }

  async deleteAccount(confirm: string): Promise<void> {
    const db = this.read();
    const me = this.me(db);
    if (confirm.trim().toLowerCase() !== me.email) throw new ApiError('invalid', 'Type your sign-in address exactly to confirm.');
    delete db.users[me.id];
    delete db.circles[me.id];
    for (const c of Object.values(db.circles)) delete c[me.id];
    this.write(db);
    await this.signOut();
  }

  async handoff(): Promise<string> {
    throw new ApiError('not_found', 'Signing in to other ELUM apps works once ELUM is connected.');
  }

  async completeHandoff(): Promise<Session> {
    throw new ApiError('not_found', 'Signing in from other ELUM apps works once ELUM is connected.');
  }

  // ----------------------------------------------------------------- helpers

  private toPerson(db: Db, u: UserRow, viewer: UserRow): Person {
    const picture = u.picture && allows(db, u, viewer.id, 'picture') ? u.picture : null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      color: u.color,
      handle: u.handle,
      address: u.handle ? `${u.handle}@${this.typeDomain}` : u.email,
      picture,
      pictureUrl: picture,
      circle: db.circles[viewer.id]?.[u.id] ?? null,
    };
  }

  private toAccount(db: Db, u: UserRow): Account {
    const mine = Object.values(db.circles[u.id] ?? {});
    const addresses: AccountAddress[] = [
      { address: u.email, kind: u.handle ? 'type' : 'login', verified: true },
      ...u.aliases.filter((a) => a.verified).map((a) => ({ address: a.address, kind: 'alias' as const, verified: true })),
    ];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      color: u.color,
      accountType: u.accountType,
      handle: u.handle,
      status: 'active',
      locale: u.locale,
      timeZone: u.timeZone,
      createdAt: u.createdAt,
      addresses,
      services: [
        { id: 'write', name: 'Write', status: 'active', joined: u.joined.includes('write'), plan: 'free', lastSeenAt: null },
        { id: 'type', name: 'Type', status: 'beta', joined: u.joined.includes('type'), plan: 'free', lastSeenAt: null },
        { id: 'browse', name: 'Browse', status: 'planned', joined: false, plan: null, lastSeenAt: null },
        { id: 'make', name: 'Make', status: 'planned', joined: false, plan: null, lastSeenAt: null },
        { id: 'store', name: 'Store', status: 'planned', joined: false, plan: null, lastSeenAt: null },
      ],
      unread: 0,
      picture: u.picture,
      pictureUrl: u.picture,
      privacy: u.privacy,
      circles: {
        friends: mine.filter((c) => c === 'friends').length,
        family: mine.filter((c) => c === 'family').length,
        work: mine.filter((c) => c === 'work').length,
        blocked: mine.filter((c) => c === 'blocked').length,
      },
      pendingAddresses: [...u.codes.filter((c) => c.expires > Date.now()).map((c) => c.address), ...u.aliases.filter((a) => !a.verified).map((a) => a.address)],
    };
  }
}

/** The local twin of elum.allows. */
export function allows(db: Db, owner: UserRow, viewerId: string, what: keyof Privacy): boolean {
  if (owner.id === viewerId) return true;
  const circle = db.circles[owner.id]?.[viewerId] ?? null;
  if (circle === 'blocked') return false;
  const rule: Audience = owner.privacy[what];
  switch (rule) {
    case 'everyone':
      return true;
    case 'known':
      return circle === 'friends' || circle === 'family' || circle === 'work';
    case 'close':
      return circle === 'friends' || circle === 'family';
    case 'family':
      return circle === 'family';
    default:
      return false;
  }
}

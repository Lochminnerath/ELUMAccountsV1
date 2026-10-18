import { createClient, type Session as AuthSession, type SupabaseClient } from '@supabase/supabase-js';
import type { AccountApi } from '../client';
import { ApiError, toApiError, type RawError } from '../errors';
import type { Account, Activity, Circle, Device, NotificationSetting, Person, Privacy, ProfileChange, Session, SignInInput, SignUpInput } from '../types';
import { checkPassword, cleanName, handleProblem, isEmail, loginToEmail } from '../validation';
import { cookieStorage } from './cookieStorage';

/**
 * ELUM Accounts on the shared ELUM Supabase project. Reads and changes go through the platform's
 * public.elum_* functions; pictures live in the private `avatars` bucket; account-address,
 * account-delete and account-handoff do what needs the service role.
 */

const AVATARS = 'avatars';
const SIGNED_URL_SECONDS = 60 * 60;

export class SupabaseAccountApi implements AccountApi {
  readonly mode = 'remote' as const;
  readonly typeDomain: string;
  readonly sb: SupabaseClient;
  private readonly unauthorizedHandlers = new Set<() => void>();

  constructor(url: string, anonKey: string, options: { typeDomain?: string; client?: SupabaseClient } = {}) {
    this.typeDomain = options.typeDomain ?? 'type.elum.services';
    const cookieDomain = import.meta.env.VITE_ELUM_COOKIE_DOMAIN?.trim();
    this.sb =
      options.client ??
      createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          ...(cookieDomain ? { storageKey: 'elum-auth', storage: cookieStorage({ domain: cookieDomain, secure: location.protocol === 'https:' }) } : {}),
        },
      });
    this.sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') this.unauthorizedHandlers.forEach((h) => h());
    });
  }

  // ---------------------------------------------------------------- sessions

  async restoreSession(): Promise<Session | null> {
    const { data, error } = await this.sb.auth.getSession();
    if (error || !data.session) return null;
    try {
      return await this.sessionFor(data.session);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'unauthorized' || e.code === 'not_found')) return null;
      throw e;
    }
  }

  async signIn(input: SignInInput): Promise<Session> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: loginToEmail(input.login, this.typeDomain), password: input.password });
    if (error) {
      if (error.code === 'email_not_confirmed') throw new ApiError('confirm_email', 'Confirm your email first. We sent you a link when you signed up.');
      if (error.code === 'invalid_credentials' || error.status === 400) throw new ApiError('invalid_credentials', 'That address and password do not match.');
      throw toApiError(error);
    }
    return this.sessionFor(data.session);
  }

  async signUp(input: SignUpInput): Promise<Session> {
    const name = cleanName(input.name);
    checkPassword(input.password);
    if (input.kind === 'type') {
      const problem = handleProblem(input.handle);
      if (problem) throw new ApiError('invalid', problem, { field: 'handle' });
      // Type accounts are created by Type's sign-up function, on the same project.
      const { data, error } = await this.sb.functions.invoke<{ error?: RawError }>('type-signup', {
        body: { handle: input.handle.trim().toLowerCase(), name, password: input.password, recoveryEmail: input.recoveryEmail?.trim() || undefined },
      });
      if (error) throw await functionError(error);
      if (data?.error) throw toApiError(data.error);
      return this.signIn({ login: input.handle, password: input.password });
    }
    const email = input.email.trim().toLowerCase();
    if (!isEmail(email)) throw new ApiError('invalid', 'Enter a valid email address.', { field: 'email' });
    const { data, error } = await this.sb.auth.signUp({ email, password: input.password, options: { data: { name }, emailRedirectTo: `${location.origin}/` } });
    if (error) {
      if (error.code === 'user_already_exists' || error.code === 'email_exists') {
        throw new ApiError('email_taken', 'An account with this email already exists. Sign in instead.', { field: 'email' });
      }
      if (error.code === 'weak_password') throw new ApiError('invalid', error.message, { field: 'password' });
      throw toApiError(error);
    }
    if (!data.session) throw new ApiError('confirm_email', `We sent a link to ${email}. Open it to confirm your email, then sign in.`);
    return this.sessionFor(data.session);
  }

  async signOut(everywhere = false): Promise<void> {
    await this.sb.auth.signOut({ scope: everywhere ? 'global' : 'local' });
  }

  async handleAvailable(handle: string): Promise<boolean> {
    if (handleProblem(handle)) return false;
    const { data, error } = await this.sb.rpc('elum_handle_available', { p_handle: handle.trim().toLowerCase() });
    if (error) throw toApiError(error);
    return data === true;
  }

  onUnauthorized(handler: () => void): () => void {
    this.unauthorizedHandlers.add(handler);
    return () => this.unauthorizedHandlers.delete(handler);
  }

  // ----------------------------------------------------------------- account

  async account(): Promise<Account> {
    const raw = await this.rpc<RawAccount>('elum_account');
    return this.toAccount(raw);
  }

  async updateProfile(change: ProfileChange): Promise<Account> {
    const raw = await this.rpc<RawAccount>('elum_update_profile', {
      p_name: change.name !== undefined ? cleanName(change.name) : null,
      p_color: change.color ?? null,
      p_locale: change.locale ?? null,
      p_time_zone: change.timeZone ?? null,
    });
    return this.toAccount(raw);
  }

  async setPicture(image: Blob): Promise<Account> {
    const me = await this.me();
    if (image.size > 2 * 1024 * 1024) throw new ApiError('too_large', 'Pictures can be up to 2 MB.');
    const ext = image.type === 'image/png' ? 'png' : image.type === 'image/jpeg' ? 'jpg' : 'webp';
    // A new name each time, so every app's cached copy refreshes.
    const path = `${me}/${crypto.randomUUID().slice(0, 12)}.${ext}`;
    const up = await this.sb.storage.from(AVATARS).upload(path, image, { contentType: image.type, upsert: false });
    if (up.error) throw toApiError(up.error as RawError, 'That picture could not be uploaded.');
    const old = await this.rpc<string | null>('elum_set_picture', { p_path: path });
    if (old) await this.sb.storage.from(AVATARS).remove([old]);
    return this.account();
  }

  async removePicture(): Promise<Account> {
    const old = await this.rpc<string | null>('elum_remove_picture');
    if (old) await this.sb.storage.from(AVATARS).remove([old]);
    return this.account();
  }

  // ------------------------------------------------------------------ people

  async setPrivacy(change: Partial<Privacy>): Promise<Privacy> {
    return this.rpc<Privacy>('elum_set_privacy', { p_picture: change.picture ?? null, p_findable: change.findable ?? null, p_messages: change.messages ?? null });
  }

  async people(circle?: Circle): Promise<Person[]> {
    return this.withPictures(await this.rpc<Person[]>('elum_people', { p_circle: circle ?? null }));
  }

  async findPeople(query: string): Promise<Person[]> {
    if (query.trim().length < 2) return [];
    return this.withPictures(await this.rpc<Person[]>('elum_find_people', { p_query: query.trim(), p_limit: 20 }));
  }

  async setCircle(personId: string, circle: Circle | null): Promise<void> {
    await this.rpc('elum_set_circle', { p_person: personId, p_circle: circle });
  }

  // --------------------------------------------------------------- addresses

  async startAddress(address: string): Promise<void> {
    await this.invoke('account-address', { address: address.trim().toLowerCase() });
  }

  async confirmAddress(address: string, code: string): Promise<void> {
    await this.rpc('elum_confirm_address', { p_address: address, p_code: code.trim() });
  }

  async removeAddress(address: string): Promise<void> {
    await this.rpc('elum_remove_address', { p_address: address });
  }

  // ---------------------------------------------------------------- security

  async changePassword(password: string): Promise<void> {
    checkPassword(password);
    const { error } = await this.sb.auth.updateUser({ password });
    if (error) {
      if (error.code === 'weak_password' || error.code === 'same_password') throw new ApiError('invalid', error.message, { field: 'password' });
      if (error.code === 'reauthentication_needed') throw new ApiError('forbidden', 'For your safety, sign in again before changing your password.');
      throw toApiError(error);
    }
  }

  async devices(): Promise<Device[]> {
    return this.rpc<Device[]>('elum_devices');
  }

  async signOutOtherDevices(): Promise<void> {
    const { error } = await this.sb.auth.signOut({ scope: 'others' });
    if (error) throw toApiError(error);
  }

  async activity(): Promise<Activity[]> {
    return this.rpc<Activity[]>('elum_activity', { p_limit: 30 });
  }

  async notificationSettings(): Promise<NotificationSetting[]> {
    return this.rpc<NotificationSetting[]>('elum_notification_settings');
  }

  async setNotification(type: string, inApp: boolean, outside: boolean): Promise<void> {
    await this.rpc('elum_set_notification_setting', { p_type: type, p_in_app: inApp, p_outside: outside });
  }

  async deleteAccount(confirm: string): Promise<void> {
    await this.invoke('account-delete', { confirm });
    await this.sb.auth.signOut({ scope: 'local' });
  }

  async handoff(to: string, next: string): Promise<string> {
    const data = await this.invoke<{ url: string }>('account-handoff', { to, next });
    return data.url;
  }

  async completeHandoff(tokenHash: string): Promise<Session> {
    const { data, error } = await this.sb.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (error || !data.session) throw new ApiError('unauthorized', 'That sign-in link has expired or was already used. Sign in instead.');
    return this.sessionFor(data.session);
  }

  // ----------------------------------------------------------------- helpers

  private async me(): Promise<string> {
    const { data } = await this.sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) {
      this.unauthorizedHandlers.forEach((h) => h());
      throw new ApiError('unauthorized', 'Your session has ended. Sign in again.');
    }
    return id;
  }

  private async rpc<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T> {
    await this.me();
    const { data, error } = await this.sb.rpc(name, args);
    if (error) throw toApiError(error);
    return data as T;
  }

  private async invoke<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
    await this.me();
    const { data, error } = await this.sb.functions.invoke<{ data?: T; error?: RawError }>(name, { body });
    if (error) throw await functionError(error);
    if (data?.error) throw toApiError(data.error);
    return (data?.data ?? (data as unknown)) as T;
  }

  private async signedUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    const { data } = await this.sb.storage.from(AVATARS).createSignedUrl(path, SIGNED_URL_SECONDS);
    return data?.signedUrl ?? null;
  }

  private async withPictures(people: Person[]): Promise<Person[]> {
    return Promise.all((people ?? []).map(async (p) => ({ ...p, pictureUrl: await this.signedUrl(p.picture) })));
  }

  private async toAccount(raw: RawAccount): Promise<Account> {
    return {
      ...raw,
      locale: raw.locale ?? null,
      timeZone: raw.timeZone ?? null,
      picture: raw.picture ?? null,
      pictureUrl: await this.signedUrl(raw.picture ?? null),
      circles: { ...{ friends: 0, family: 0, work: 0, blocked: 0 }, ...((raw.circles as Partial<Account['circles']> | null) ?? {}) },
      pendingAddresses: raw.pendingAddresses ?? [],
    };
  }

  private async sessionFor(_session: AuthSession): Promise<Session> {
    return { account: await this.account() };
  }
}

type RawAccount = Omit<Account, 'pictureUrl'> & { pictureUrl?: undefined };

/** Edge functions answer { error: { code, message } } with an HTTP status (handoff 5.2). */
async function functionError(error: unknown): Promise<ApiError> {
  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: { code?: string; message?: string } };
      const code = body.error?.code;
      const message = body.error?.message ?? 'Something went wrong. Please try again.';
      if (code === 'conflict') return new ApiError('conflict', message);
      if (code === 'invalid') return new ApiError('invalid', message);
      if (code === 'rate_limited') return new ApiError('rate_limited', message);
      if (code === 'forbidden') return new ApiError('forbidden', message);
      if (code === 'unauthorized') return new ApiError('unauthorized', message);
      return new ApiError('server', message);
    } catch {
      // Fall through.
    }
  }
  return toApiError(error as RawError);
}

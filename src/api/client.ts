import type { Account, Activity, Circle, Device, NotificationSetting, Person, Privacy, ProfileChange, Session, SignInInput, SignUpInput } from './types';

/**
 * Everything ELUM Accounts asks of its backend. `SupabaseAccountApi` implements it on the ELUM
 * platform (public.elum_* functions, Auth, the avatars bucket and the account-* edge functions);
 * `LocalAccountApi` keeps the same rules in the browser for previews.
 */
export interface AccountApi {
  readonly mode: 'local' | 'remote';
  readonly typeDomain: string;

  restoreSession(): Promise<Session | null>;
  signIn(input: SignInInput): Promise<Session>;
  signUp(input: SignUpInput): Promise<Session>;
  /** Signs out here; `everywhere` ends every session on every device. */
  signOut(everywhere?: boolean): Promise<void>;
  handleAvailable(handle: string): Promise<boolean>;
  onUnauthorized(handler: () => void): () => void;

  account(): Promise<Account>;
  updateProfile(change: ProfileChange): Promise<Account>;
  /** Uploads a square picture (already cropped and resized by the app). */
  setPicture(image: Blob): Promise<Account>;
  removePicture(): Promise<Account>;

  setPrivacy(change: Partial<Privacy>): Promise<Privacy>;
  people(circle?: Circle): Promise<Person[]>;
  findPeople(query: string): Promise<Person[]>;
  setCircle(personId: string, circle: Circle | null): Promise<void>;

  /** Emails a code to an address to add. */
  startAddress(address: string): Promise<void>;
  confirmAddress(address: string, code: string): Promise<void>;
  removeAddress(address: string): Promise<void>;

  changePassword(password: string): Promise<void>;
  devices(): Promise<Device[]>;
  signOutOtherDevices(): Promise<void>;
  activity(): Promise<Activity[]>;

  notificationSettings(): Promise<NotificationSetting[]>;
  setNotification(type: string, inApp: boolean, outside: boolean): Promise<void>;

  /** Deletes the account. `confirm` must be the sign-in address. */
  deleteAccount(confirm: string): Promise<void>;

  /**
   * A one-time sign-in for another ELUM app: returns where to send the browser. `to` is the app's
   * /auth/handoff page; `next` is the path to open there, such as /d/<document id>.
   */
  handoff(to: string, next: string): Promise<string>;
  /** Trades a handoff token (from another ELUM app) for a session on this site. */
  completeHandoff(tokenHash: string): Promise<Session>;
}

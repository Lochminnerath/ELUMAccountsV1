/** Data shapes for ELUM Accounts. The preview API and the Supabase API both speak these. */

export type AccountType = 'type' | 'external';
export type Circle = 'friends' | 'family' | 'work' | 'blocked';
/** Who may: everyone (Unknown people too), people you know, friends and family, family, nobody. */
export type Audience = 'everyone' | 'known' | 'close' | 'family' | 'nobody';

export interface Privacy {
  picture: Audience;
  findable: Audience;
  messages: Audience;
}

export interface AccountAddress {
  address: string;
  kind: 'login' | 'type' | 'alias';
  verified: boolean;
}

export interface ServiceUse {
  id: string;
  name: string;
  status: 'planned' | 'beta' | 'active' | 'retired';
  joined: boolean;
  plan: string | null;
  lastSeenAt: string | null;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  color: string;
  accountType: AccountType;
  handle: string | null;
  status: string;
  locale: string | null;
  timeZone: string | null;
  createdAt: string;
  addresses: AccountAddress[];
  services: ServiceUse[];
  unread: number;
  /** Storage path of the profile picture, if any. */
  picture: string | null;
  /** A link the browser can load for the picture. */
  pictureUrl: string | null;
  privacy: Privacy;
  circles: Record<Circle, number>;
  pendingAddresses: string[];
}

export interface Person {
  id: string;
  name: string;
  email: string;
  color: string;
  handle: string | null;
  address: string;
  picture: string | null;
  pictureUrl?: string | null;
  circle: Circle | null;
}

export interface Device {
  id: string;
  userAgent: string | null;
  ip: string | null;
  signedInAt: string;
  lastActiveAt: string;
  current: boolean;
}

export interface Activity {
  action: string;
  service: string | null;
  detail: Record<string, unknown>;
  at: string;
}

export interface SecuritySettings {
  /** New password sign-ins wait until a signed-in device approves them. */
  approveSignIns: boolean;
}

export interface Preferences {
  timeFormat: 'auto' | '12h' | '24h';
  weekStart: 'auto' | 'monday' | 'sunday' | 'saturday';
  /** Where signing in here takes you when no app asked. */
  startApp: 'account' | 'write' | 'type' | 'make';
  motion: 'system' | 'reduce' | 'full';
}

export interface NotificationSetting {
  type: string;
  service: string;
  serviceName: string;
  description: string;
  inApp: boolean;
  outside: boolean;
}

export interface Session {
  account: Account;
}

export type SignUpInput =
  | { kind: 'type'; handle: string; name: string; password: string; recoveryEmail?: string }
  | { kind: 'external'; name: string; email: string; password: string };

export interface SignInInput {
  /** An email address, or just a Type handle. */
  login: string;
  password: string;
}

export interface ProfileChange {
  name?: string;
  color?: string;
  locale?: string;
  timeZone?: string;
}

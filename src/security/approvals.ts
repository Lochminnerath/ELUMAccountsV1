import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Approving new sign-ins (ELUM Account > Security > Approve new sign-ins). The database enforces
 * it: an unapproved session gets tokens with role elum_pending, which can read nothing. This file
 * is how an app notices and talks to the two sides:
 * - the new device, which shows a number and waits;
 * - a device already signed in, which is asked "Is this you?" and picks that number.
 */

export const PENDING_ROLE = 'elum_pending';

/** The role inside an access token (a JWT), without verifying it: the server does that. */
export function tokenRole(accessToken: string | null | undefined): string | null {
  try {
    const payload = accessToken?.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export type MySignInStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface MySignIn {
  status: MySignInStatus;
  code?: number;
  expiresAt?: string;
}

export interface SignInRequest {
  id: string;
  device: string;
  ip: string | null;
  at: string;
  expiresAt: string;
  numbers: number[];
  /** From the same network as this device (the same public address), so probably close by. */
  nearby?: boolean;
}

/** Which waiting sign-in to ask about: the one already open while it waits, else nearby ones first. */
export function pickRequest(list: SignInRequest[], currentId: string | null | undefined): SignInRequest | null {
  return list.find((r) => r.id === currentId) ?? list.find((r) => r.nearby) ?? list[0] ?? null;
}

/** For the waiting device: approved yet, and which number to show. */
export async function mySignIn(sb: SupabaseClient): Promise<MySignIn> {
  const { data, error } = await sb.rpc('elum_my_sign_in');
  if (error) throw error;
  return data as MySignIn;
}

/** For signed-in devices: sign-ins waiting for this account. Null when the database has no approvals yet. */
export async function signInRequests(sb: SupabaseClient): Promise<SignInRequest[] | null> {
  const { data, error } = await sb.rpc('elum_sign_in_requests');
  if (error) return null;
  return (data as SignInRequest[]) ?? [];
}

/** Picks a number (approve if it is the right one), or null for "No, it's not me". */
export async function answerSignIn(sb: SupabaseClient, id: string, number: number | null): Promise<'approved' | 'denied'> {
  const { data, error } = await sb.rpc('elum_answer_sign_in', { p_session: id, p_number: number });
  if (error) throw error;
  return data as 'approved' | 'denied';
}

export type LinkSignInStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'missing';

/** The sign-in an emailed link belongs to (the /approve page). Numbers only while it waits. */
export interface LinkSignIn {
  status: LinkSignInStatus;
  device?: string;
  ip?: string | null;
  at?: string;
  expiresAt?: string;
  numbers?: number[] | null;
}

/** For the /approve page: which sign-in the emailed link is for. No ELUM session needed. */
export async function linkSignIn(sb: SupabaseClient, token: string): Promise<LinkSignIn> {
  if (!token) return { status: 'missing' };
  const { data, error } = await sb.rpc('elum_link_sign_in', { p_token: token });
  if (error) throw error;
  return data as LinkSignIn;
}

/** Picks a number from the emailed link (approve if it is the right one), or null for "No, it is not me". */
export async function answerLinkSignIn(sb: SupabaseClient, token: string, number: number | null): Promise<'approved' | 'denied'> {
  const { data, error } = await sb.rpc('elum_answer_link_sign_in', { p_token: token, p_number: number });
  if (error) throw new Error(error.message);
  return data as 'approved' | 'denied';
}

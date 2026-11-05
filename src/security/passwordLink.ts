/**
 * Changing a password takes the link ELUM emails (Security > Change your password). The link signs
 * in with Supabase's "recovery" method, which the access token records in its amr claim with the
 * time. Only a session that came from such a link in the last 15 minutes may set a new password.
 */

export const PASSWORD_LINK_MINUTES = 15;

/** Whether this access token came from the emailed password link recently. Not verified: the server does that. */
export function cameFromPasswordLink(accessToken: string | null | undefined, now = Date.now()): boolean {
  try {
    const payload = accessToken?.split('.')[1];
    if (!payload) return false;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='));
    const amr = (JSON.parse(json) as { amr?: { method?: string; timestamp?: number }[] }).amr ?? [];
    return amr.some((m) => m.method === 'recovery' && typeof m.timestamp === 'number' && now / 1000 - m.timestamp < PASSWORD_LINK_MINUTES * 60);
  } catch {
    return false;
  }
}

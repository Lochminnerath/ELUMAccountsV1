import type { SupabaseClient } from '@supabase/supabase-js';
import { api } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { ApprovalWait } from './ApprovalWait';
import { SignInPrompt } from './SignInPrompt';

const sb = api.mode === 'remote' ? (api as unknown as { sb: SupabaseClient }).sb : null;
const SECURITY_URL = '/security';

/** Sign-in approvals: the waiting screen on a new device, and "Is this you?" on signed-in ones. */
export function SecurityLayer() {
  const { status } = useAuth();
  // The /approve page (from the sign-in email) stands alone: no waiting screen or prompt over it.
  if (!sb || window.location.pathname === '/approve') return null;
  if (status === 'approval') return <ApprovalWait sb={sb} />;
  if (status === 'signed-in') return <SignInPrompt sb={sb} securityUrl={SECURITY_URL} />;
  return null;
}

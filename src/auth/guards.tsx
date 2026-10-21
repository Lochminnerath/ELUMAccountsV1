import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { FullPageLoader } from '../components/Loader';
import { useAuth } from './AuthProvider';

/** Sends signed-out visitors to sign in, then brings them back. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader label="Opening your account" />;
  // Waiting for another device to approve: the approval screen covers everything.
  if (status === 'approval') return null;
  if (status === 'signed-out') {
    const next = location.pathname + location.search;
    return <Navigate to={next === '/' ? '/signin' : `/signin?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

/** A path on this site to return to, never another site. */
export function safeLocalPath(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

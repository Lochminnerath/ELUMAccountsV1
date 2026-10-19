import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, isApiError, type Account, type SignInInput, type SignUpInput } from '../api';

/** 'approval': signed in with a password, waiting for another device to approve (Security). */
type Status = 'loading' | 'signed-in' | 'signed-out' | 'approval';

interface AuthContextValue {
  status: Status;
  account: Account | null;
  signIn: (input: SignInInput) => Promise<Account>;
  signUp: (input: SignUpInput) => Promise<Account>;
  signOut: (everywhere?: boolean) => Promise<void>;
  /** Replaces the account after a change, or reloads it. */
  setAccount: (account: Account) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [account, setAccountState] = useState<Account | null>(null);

  const restore = useCallback(async () => {
    try {
      const session = await api.restoreSession();
      setAccountState(session?.account ?? null);
      setStatus(session ? 'signed-in' : 'signed-out');
    } catch (e) {
      setAccountState(null);
      setStatus(isApiError(e, 'approval_required') ? 'approval' : 'signed-out');
    }
  }, []);

  useEffect(() => {
    void restore();
    const off = api.onUnauthorized(() => {
      setAccountState(null);
      setStatus('signed-out');
    });
    return off;
  }, [restore]);

  const signIn = useCallback(async (input: SignInInput) => {
    const s = await api.signIn(input).catch((e: unknown) => {
      if (isApiError(e, 'approval_required')) setStatus('approval');
      throw e;
    });
    setAccountState(s.account);
    setStatus('signed-in');
    return s.account;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const s = await api.signUp(input);
    setAccountState(s.account);
    setStatus('signed-in');
    return s.account;
  }, []);

  const signOut = useCallback(async (everywhere = false) => {
    try {
      await api.signOut(everywhere);
    } finally {
      setAccountState(null);
      setStatus('signed-out');
    }
  }, []);

  const refresh = useCallback(async () => {
    setAccountState(await api.account());
  }, []);

  const value = useMemo(
    () => ({ status, account, signIn, signUp, signOut, setAccount: setAccountState, refresh }),
    [status, account, signIn, signUp, signOut, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useAccount(): Account {
  const { account } = useAuth();
  if (!account) throw new Error('useAccount called while signed out');
  return account;
}

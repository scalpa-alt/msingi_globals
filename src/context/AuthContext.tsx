import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Role = 'administrator' | 'teacher' | 'student' | 'parent';

/**
 * unverified - email not yet confirmed (cannot normally sign in)
 * pending    - registered, waiting for an administrator to approve
 * active     - approved: full access for the role
 * rejected   - an administrator declined the registration
 */
export type AccountStatus = 'unverified' | 'pending' | 'active' | 'rejected';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
}

interface Profile {
  id: string;
  full_name: string;
  role: Role;
  status: AccountStatus;
}

interface AuthContextValue {
  /** The signed-in user (any status). Check `user.status === 'active'` before showing app features. */
  user: AuthUser | null;
  /** True while the stored session or the profile is still being loaded. */
  loading: boolean;
  /** Message to show on the login page (e.g. account has no profile). */
  authError: string | null;
  /** Resolves to an error message, or null on success. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  /** Re-read the profile, e.g. to see whether an administrator has approved the account. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileChecked, setProfileChecked] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 1. Track the Supabase session (restored from storage, refreshed automatically).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      // Do not call Supabase from inside this callback; just record the session.
      setSession(next);
      if (!next) setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2. Load role + status from `profiles`. Neither is ever taken from the client.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, full_name, role, status')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setProfile(null);
          setAuthError('Your account has no profile yet. Please contact your school administrator.');
          void supabase.auth.signOut();
        } else {
          setProfile(data as Profile);
          setAuthError(null);
        }
        setProfileChecked(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const loading = initializing || (!!userId && profileChecked !== userId);

  const user = useMemo<AuthUser | null>(() => {
    if (!session || !profile || profile.id !== session.user.id) return null;
    return {
      id: profile.id,
      name: profile.full_name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email ?? '',
      role: profile.role,
      status: profile.status,
    };
  }, [session, profile]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileChecked(null);
  }, []);

  const refresh = useCallback(async () => {
    setProfileChecked(null); // shows the loading state until the new profile arrives
    setReloadKey((k) => k + 1);
  }, []);

  const value = useMemo(
    () => ({ user, loading, authError, login, logout, refresh }),
    [user, loading, authError, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

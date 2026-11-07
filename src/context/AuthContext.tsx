import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Role = 'administrator' | 'teacher' | 'student';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface Profile {
  id: string;
  full_name: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the stored session or the profile is still being loaded. */
  loading: boolean;
  /** Message to show on the login page (e.g. account has no profile). */
  authError: string | null;
  /** Resolves to an error message, or null on success. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileChecked, setProfileChecked] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // 2. Load the role/name from `profiles`. The role is never taken from the client.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setProfile(null);
          setAuthError('Your account has no profile yet. Ask the administrator to set it up.');
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
  }, [userId]);

  const loading = initializing || (!!userId && profileChecked !== userId);

  const user = useMemo<AuthUser | null>(() => {
    if (!session || !profile || profile.id !== session.user.id) return null;
    return {
      id: profile.id,
      name: profile.full_name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email ?? '',
      role: profile.role,
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

  const value = useMemo(
    () => ({ user, loading, authError, login, logout }),
    [user, loading, authError, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

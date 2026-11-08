import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SchoolOption {
  id: string;
  name: string;
}

export type SignupRole = 'administrator' | 'teacher' | 'parent';

export interface SignupInput {
  email: string;
  password: string;
  /** Stored on the auth user; the database turns it into a school/profile once the email is verified. */
  metadata: Record<string, unknown>;
}

export interface SignupResult {
  /** Set when the account could not be created. */
  error?: string;
  /** True when the project has email confirmation turned off and the user is already signed in. */
  signedIn?: boolean;
}

/**
 * Create the account. The role in `metadata.signup_role` is only a *request*: the database
 * decides what it means (a new school for a headteacher; "pending approval" for a teacher
 * or parent) and nobody gets access until it says so.
 */
export async function registerAccount({ email, password, metadata }: SignupInput): Promise<SignupResult> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      return { error: 'An account with this email already exists. Try signing in instead.' };
    }
    return { error: error.message };
  }
  // With email confirmation on, signing up an existing address returns a user with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { error: 'An account with this email already exists. Try signing in instead.' };
  }
  return { signedIn: !!data.session };
}

/** Schools a teacher or parent can register with (public list, names only). */
export function useSchools() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('list_schools').then(({ data, error: err }) => {
      if (cancelled) return;
      setSchools((data ?? []) as SchoolOption[]);
      setError(err ? 'Could not load the list of schools. Please try again.' : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { schools, loading, error };
}

export const SUBJECT_SUGGESTIONS = [
  'Math', 'English', 'Kiswahili', 'Science', 'Physics', 'Chemistry', 'Biology',
  'History', 'Geography', 'Computer Studies', 'Art', 'P.E.', 'Social Studies', 'CRE',
];

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Child {
  id: string;
  full_name: string;
  class_id: string | null;
  class: { label: string; grade_level: number } | null;
}

/**
 * The students the signed-in parent or student may see. Row-level security limits
 * `students` to the user's own children, so no extra filter is needed.
 */
export function useMyChildren() {
  const { user } = useAuth();
  const [state, setState] = useState<{ children: Child[]; loading: boolean; error: string | null }>({ children: [], loading: true, error: null });
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('students')
      .select('id, full_name, class_id, class:classes(label, grade_level)')
      .eq('status', 'active')
      .order('full_name')
      .then(({ data, error }) => {
        if (cancelled) return;
        setState({ children: (data ?? []) as unknown as Child[], loading: false, error: error?.message ?? null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}

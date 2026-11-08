import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const APPROVALS_CHANGED = 'approvals-changed';

/** Number of registrations waiting for the administrator (teachers + parents). */
export function useApprovalCount(enabled: boolean): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_school_overview');
    const o = data as { pendingTeachers?: number; pendingParents?: number } | null;
    setCount((o?.pendingTeachers ?? 0) + (o?.pendingParents ?? 0));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
    window.addEventListener(APPROVALS_CHANGED, load);
    return () => window.removeEventListener(APPROVALS_CHANGED, load);
  }, [enabled, load]);

  return count;
}

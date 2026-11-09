import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

/** The term the gradebook and dashboards work with by default. */
export const DEFAULT_TERM = '2026-T3';

export interface ClassRow {
  id: string;
  label: string;
  grade_level: number;
}

export interface SubjectRow {
  id: string;
  name: string;
}

/** A row of teacher_classes: one class (and optionally one subject) a teacher handles. */
export interface Assignment {
  class_id: string;
  subject_id: string | null;
  is_class_teacher: boolean;
}

interface ManagedClasses {
  classes: ClassRow[];
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
}

/**
 * The classes the signed-in user works with:
 *  - administrator: every class
 *  - teacher: only the classes assigned to them (teacher_classes)
 *  - student/parent: the classes of their own children (limited by row-level security)
 * The database enforces this too; this hook just builds the pickers.
 */
export function useManagedClasses(): ManagedClasses {
  const { user } = useAuth();
  const [state, setState] = useState<ManagedClasses>({ classes: [], assignments: [], loading: true, error: null });
  const userId = user?.id;
  const role = user?.role;

  useEffect(() => {
    if (!userId || !role) return;
    let cancelled = false;

    async function load() {
      if (role === 'administrator') {
        const { data, error } = await supabase.from('classes').select('id, label, grade_level').order('grade_level').order('label');
        if (!cancelled) setState({ classes: (data ?? []) as ClassRow[], assignments: [], loading: false, error: error?.message ?? null });
      } else if (role === 'teacher') {
        const { data, error } = await supabase
          .from('teacher_classes')
          .select('class_id, subject_id, is_class_teacher, class:classes(id, label, grade_level)')
          .eq('teacher_id', userId);
        const rows = (data ?? []) as any[];
        const byId = new Map<string, ClassRow>();
        rows.forEach((r) => r.class && byId.set(r.class.id, r.class as ClassRow));
        const classes = [...byId.values()].sort((a, b) => a.grade_level - b.grade_level || a.label.localeCompare(b.label));
        const assignments: Assignment[] = rows.map((r) => ({
          class_id: r.class_id,
          subject_id: r.subject_id,
          is_class_teacher: r.is_class_teacher,
        }));
        if (!cancelled) setState({ classes, assignments, loading: false, error: error?.message ?? null });
      } else {
        const { data, error } = await supabase.from('students').select('class:classes(id, label, grade_level)');
        const byId = new Map<string, ClassRow>();
        ((data ?? []) as any[]).forEach((r) => r.class && byId.set(r.class.id, r.class as ClassRow));
        const classes = [...byId.values()].sort((a, b) => a.grade_level - b.grade_level || a.label.localeCompare(b.label));
        if (!cancelled) setState({ classes, assignments: [], loading: false, error: error?.message ?? null });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, role]);

  return state;
}

/** Subjects, used by the timetable and gradebook pickers. */
export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  useEffect(() => {
    supabase
      .from('subjects')
      .select('id, name')
      .order('name')
      .then(({ data }) => setSubjects((data ?? []) as SubjectRow[]));
  }, []);
  return subjects;
}

export function letterGrade(avg: number): { label: string; variant: 'emerald' | 'teal' | 'amber' | 'rose' } {
  if (avg >= 90) return { label: 'A', variant: 'emerald' };
  if (avg >= 80) return { label: 'B', variant: 'teal' };
  if (avg >= 70) return { label: 'C', variant: 'amber' };
  return { label: 'D', variant: 'rose' };
}

/** Turn a Postgres / PostgREST error into a message a teacher can act on. */
export function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === '23505') return 'That time slot is already taken for this class.';
  if (error.code === '42501' || /row-level security/i.test(error.message)) return 'You do not have permission to change this.';
  return error.message;
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

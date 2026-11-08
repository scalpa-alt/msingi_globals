import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Search, Users } from 'lucide-react';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass } from '@/lib/school';
import type { ClassRow } from '@/lib/school';

interface RosterRow {
  student_id: string;
  full_name: string;
  admission_no: string;
  gender: string | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  relation: string | null;
}

interface Student {
  id: string;
  name: string;
  admissionNo: string;
  gender: string | null;
  parents: { name: string; email: string | null; phone: string | null; relation: string | null }[];
}

/** Full enrolled list for the teacher's own class, with parent contacts (class teachers only; enforced by the database). */
export default function MyClass({ classes }: { classes: ClassRow[] }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    setLoading(true);
    supabase.rpc('my_class_roster', { p_class: classId }).then(({ data, error: e }) => {
      if (cancelled) return;
      setError(e ? friendlyError(e) : null);
      setRows((data ?? []) as RosterRow[]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const students = useMemo<Student[]>(() => {
    const map = new Map<string, Student>();
    for (const r of rows) {
      let s = map.get(r.student_id);
      if (!s) {
        s = { id: r.student_id, name: r.full_name, admissionNo: r.admission_no, gender: r.gender, parents: [] };
        map.set(r.student_id, s);
      }
      if (r.parent_name) s.parents.push({ name: r.parent_name, email: r.parent_email, phone: r.parent_phone, relation: r.relation });
    }
    return [...map.values()];
  }, [rows]);

  const needle = q.trim().toLowerCase();
  const shown = students.filter(
    (s) => !needle || s.name.toLowerCase().includes(needle) || s.admissionNo.toLowerCase().includes(needle) || s.parents.some((p) => p.name.toLowerCase().includes(needle)),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        {classes.length > 1 && (
          <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class" className={`${inputClass} sm:w-48`}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, admission no. or parent" aria-label="Search class list" className={`${inputClass} pl-9`} />
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      <p className="text-sm text-slate-500" aria-live="polite">{loading ? 'Loading…' : `${shown.length} of ${students.length} students`}</p>

      {!loading && shown.length === 0 ? (
        <EmptyState icon={Users} title="No students found" description="Students appear here once they are enrolled in this class." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => (
            <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                {s.gender && <Badge variant="slate">{s.gender}</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">Adm. {s.admissionNo}</p>
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {s.parents.map((p, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{p.name}{p.relation && <span className="font-normal text-slate-400"> · {p.relation}</span>}</p>
                    {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-slate-500 hover:text-teal-600"><Phone className="h-3.5 w-3.5" /> {p.phone}</a>}
                    {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 truncate text-slate-500 hover:text-teal-600"><Mail className="h-3.5 w-3.5 shrink-0" /> {p.email}</a>}
                  </div>
                ))}
                {s.parents.length === 0 && <p className="text-sm text-slate-400">No verified parent linked yet.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

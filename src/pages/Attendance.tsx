import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { friendlyError, inputClass, useManagedClasses } from '@/lib/school';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

type Status = 'Present' | 'Absent' | 'Late';
const STATUSES: Status[] = ['Present', 'Late', 'Absent'];

const activeStyle: Record<Status, string> = {
  Present: 'bg-emerald-600 text-white',
  Late: 'bg-amber-500 text-white',
  Absent: 'bg-rose-600 text-white',
};

interface StudentRow {
  id: string;
  full_name: string;
  admission_no: string | null;
}

type Marks = Record<string, Status | undefined>;

const todayLocal = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the user's timezone

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
}

/* ------------------------------------------------------------------ */
/* Teachers (own classes) and administrators (all classes)             */
/* ------------------------------------------------------------------ */
export default function Attendance() {
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useManagedClasses();

  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marks, setMarks] = useState<Marks>({});
  const [saved, setSaved] = useState<Marks>({});
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Default to the first class once the list arrives.
  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setMessage(null);
    const { data: roster, error: rosterError } = await supabase
      .from('students')
      .select('id, full_name, admission_no')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('full_name');
    if (rosterError) {
      setMessage({ kind: 'error', text: rosterError.message });
      setLoading(false);
      return;
    }
    const list = (roster ?? []) as StudentRow[];
    const ids = list.map((s) => s.id);

    const [dayRes, historyRes] = ids.length
      ? await Promise.all([
          supabase.from('attendance').select('student_id, status').eq('date', date).in('student_id', ids),
          supabase.from('attendance').select('student_id, status').gte('date', daysAgo(30)).in('student_id', ids),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const existing: Marks = {};
    ((dayRes.data ?? []) as any[]).forEach((r) => (existing[r.student_id] = r.status as Status));

    const tally: Record<string, { present: number; total: number }> = {};
    ((historyRes.data ?? []) as any[]).forEach((r) => {
      const t = (tally[r.student_id] ??= { present: 0, total: 0 });
      t.total += 1;
      if (r.status === 'Present') t.present += 1;
    });
    const rateMap: Record<string, number> = {};
    Object.entries(tally).forEach(([id, t]) => (rateMap[id] = Math.round((100 * t.present) / t.total)));

    setStudents(list);
    setMarks(existing);
    setSaved(existing);
    setRates(rateMap);
    setLoading(false);
  }, [classId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { Present: 0, Late: 0, Absent: 0, unmarked: 0 };
    students.forEach((s) => {
      const m = marks[s.id];
      if (m) c[m] += 1;
      else c.unmarked += 1;
    });
    return c;
  }, [students, marks]);

  const dirty = students.some((s) => marks[s.id] !== saved[s.id]);

  const setMark = (id: string, status: Status) => {
    setMessage(null);
    setMarks((m) => ({ ...m, [id]: status }));
  };

  const markAllPresent = () => {
    setMessage(null);
    setMarks(students.reduce<Marks>((acc, s) => ({ ...acc, [s.id]: marks[s.id] ?? 'Present' }), {}));
  };

  async function save() {
    const rows = students
      .filter((s) => marks[s.id] && marks[s.id] !== saved[s.id])
      .map((s) => ({ student_id: s.id, class_id: classId, date, status: marks[s.id] as Status, marked_by: user!.id }));
    if (rows.length === 0) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' });
    setSaving(false);
    if (error) {
      setMessage({ kind: 'error', text: friendlyError(error) });
      return;
    }
    setSaved({ ...marks });
    setMessage({ kind: 'ok', text: `Saved attendance for ${rows.length} student${rows.length === 1 ? '' : 's'}.` });
    load();
  }

  const noClasses = !classesLoading && classes.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle={
          user!.role === 'teacher'
            ? 'Record attendance for the classes you teach.'
            : 'Record or correct attendance for any class.'
        }
        actions={
          <>
            <select aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} className={`${inputClass} !w-auto`}>
              {classes.map((c) => <option key={c.id} value={c.id}>Class {c.label}</option>)}
            </select>
            <input
              type="date"
              aria-label="Date"
              value={date}
              max={todayLocal()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className={`${inputClass} !w-auto`}
            />
          </>
        }
      />

      {noClasses ? (
        <EmptyState
          icon={CalendarCheck}
          title="No classes assigned yet"
          description="The administrator has not assigned any classes to your account. Ask them to add you to a class."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="emerald" dot>{counts.Present} present</Badge>
            <Badge variant="amber" dot>{counts.Late} late</Badge>
            <Badge variant="rose" dot>{counts.Absent} absent</Badge>
            <Badge variant="slate">{counts.unmarked} not marked</Badge>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
            {loading || classesLoading ? (
              <div className="space-y-3 p-6">
                {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : students.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Users} title="No students in this class" description="Students appear here once they are added to the class." />
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((s) => (
                  <li key={s.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{s.full_name}</p>
                      <p className="text-xs text-slate-400">
                        {s.admission_no ?? 'No admission no.'}
                        {rates[s.id] !== undefined && ` · ${rates[s.id]}% present (30 days)`}
                      </p>
                    </div>
                    <div role="group" aria-label={`Attendance for ${s.full_name}`} className="inline-flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      {STATUSES.map((st) => {
                        const active = marks[s.id] === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setMark(s.id, st)}
                            className={`px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
                              active ? activeStyle[st] : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div aria-live="polite" className="text-sm">
              {message && (
                <span className={message.kind === 'ok' ? 'inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {message.kind === 'ok' && <Check className="h-4 w-4" />}
                  {message.text}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={markAllPresent}
                disabled={students.length === 0}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Mark unmarked as present
              </button>
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save attendance'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

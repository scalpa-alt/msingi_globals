import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, GraduationCap, Lock, Users } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_TERM, friendlyError, inputClass, letterGrade, useManagedClasses, useSubjects } from '@/lib/school';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

const CORE_SUBJECTS = ['Math', 'English', 'Science', 'History'];

interface StudentRow {
  id: string;
  full_name: string;
}

const keyOf = (studentId: string, subjectId: string) => `${studentId}:${subjectId}`;

export default function Gradebook() {
  const { user } = useAuth();
  const isAdmin = user!.role === 'administrator';
  const { classes, assignments, loading: classesLoading } = useManagedClasses();
  const subjects = useSubjects();

  const [classId, setClassId] = useState('');
  const [term, setTerm] = useState(DEFAULT_TERM);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({}); // saved values
  const [draft, setDraft] = useState<Record<string, string>>({}); // values being typed
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    const { data: roster, error: rosterError } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('full_name');
    if (rosterError) {
      setError(rosterError.message);
      setLoading(false);
      return;
    }
    const list = (roster ?? []) as StudentRow[];
    const ids = list.map((s) => s.id);
    const map: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: gradeRows, error: gradeError } = await supabase
        .from('grades')
        .select('student_id, subject_id, score')
        .eq('term', term)
        .in('student_id', ids);
      if (gradeError) setError(gradeError.message);
      ((gradeRows ?? []) as any[]).forEach((g) => (map[keyOf(g.student_id, g.subject_id)] = Number(g.score)));
    }
    setStudents(list);
    setScores(map);
    setDraft({});
    setLoading(false);
  }, [classId, term]);

  useEffect(() => {
    load();
  }, [load]);

  // Which subjects may this user edit for the selected class?
  const editableIds = useMemo(() => {
    if (isAdmin) return new Set(subjects.map((s) => s.id));
    const mine = assignments.filter((a) => a.class_id === classId);
    if (mine.some((a) => a.is_class_teacher || a.subject_id === null)) return new Set(subjects.map((s) => s.id));
    return new Set(mine.map((a) => a.subject_id as string));
  }, [isAdmin, assignments, classId, subjects]);

  // Columns: the core subjects, anything with data, and anything the teacher is assigned to.
  const columns = useMemo(() => {
    const withData = new Set(Object.keys(scores).map((k) => k.split(':')[1]));
    const specific = isAdmin ? new Set<string>() : new Set(assignments.filter((a) => a.class_id === classId && a.subject_id).map((a) => a.subject_id as string));
    return subjects.filter((s) => CORE_SUBJECTS.includes(s.name) || withData.has(s.id) || specific.has(s.id));
  }, [subjects, scores, assignments, classId, isAdmin]);

  const rows = useMemo(
    () =>
      students.map((st) => {
        const vals = columns.map((c) => scores[keyOf(st.id, c.id)]).filter((v): v is number => v !== undefined);
        const average = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return { student: st, average };
      }),
    [students, columns, scores],
  );

  const classAvg = useMemo(
    () =>
      columns
        .map((c) => {
          const vals = students.map((st) => scores[keyOf(st.id, c.id)]).filter((v): v is number => v !== undefined);
          return { subject: c.name, avg: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null };
        })
        .filter((c): c is { subject: string; avg: number } => c.avg !== null),
    [columns, students, scores],
  );

  const graded = rows.filter((r) => r.average !== null) as { student: StudentRow; average: number }[];
  const overall = graded.length ? graded.reduce((a, r) => a + r.average, 0) / graded.length : null;
  const top = graded.length ? graded.reduce((best, r) => (r.average > best.average ? r : best)) : null;

  async function commit(student: StudentRow, subjectId: string) {
    const key = keyOf(student.id, subjectId);
    if (draft[key] === undefined) return;
    const raw = draft[key].trim();
    const previous = scores[key];
    const clearDraft = () =>
      setDraft((d) => {
        const { [key]: _removed, ...rest } = d;
        return rest;
      });

    if (raw === '') {
      clearDraft();
      if (previous === undefined) return;
      setSavingKey(key);
      const { data, error: err } = await supabase
        .from('grades')
        .delete()
        .match({ student_id: student.id, subject_id: subjectId, term })
        .select('id');
      setSavingKey(null);
      if (err || !data || data.length === 0) {
        setError(err ? friendlyError(err) : 'You do not have permission to change this grade.');
        return;
      }
      setScores((s) => {
        const { [key]: _gone, ...rest } = s;
        return rest;
      });
      return;
    }

    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      setError('Marks must be a number between 0 and 100.');
      clearDraft();
      return;
    }
    if (value === previous) {
      clearDraft();
      return;
    }
    setSavingKey(key);
    setError(null);
    const { error: err } = await supabase
      .from('grades')
      .upsert(
        { student_id: student.id, subject_id: subjectId, term, score: value, entered_by: user!.id },
        { onConflict: 'student_id,subject_id,term' },
      );
    setSavingKey(null);
    clearDraft();
    if (err) {
      setError(friendlyError(err));
      return;
    }
    setScores((s) => ({ ...s, [key]: value }));
  }

  function exportCsv() {
    const header = ['Student', ...columns.map((c) => c.name), 'Average', 'Grade'];
    const lines = rows.map(({ student, average }) => [
      `"${student.full_name.replace(/"/g, '""')}"`,
      ...columns.map((c) => scores[keyOf(student.id, c.id)] ?? ''),
      average === null ? '' : average.toFixed(1),
      average === null ? '' : letterGrade(average).label,
    ]);
    const csv = [header.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades-${classes.find((c) => c.id === classId)?.label ?? 'class'}-${term}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentClass = classes.find((c) => c.id === classId);
  const noClasses = !classesLoading && classes.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gradebook"
        subtitle={
          currentClass
            ? `Term ${term} grades for Class ${currentClass.label}. ${isAdmin ? 'You can edit every subject.' : 'Click a mark to edit it.'}`
            : 'Class grades by subject.'
        }
        actions={
          <>
            <select aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} className={`${inputClass} !w-auto`}>
              {classes.map((c) => <option key={c.id} value={c.id}>Class {c.label}</option>)}
            </select>
            <input
              aria-label="Term"
              value={term}
              onChange={(e) => setTerm(e.target.value.trim() || DEFAULT_TERM)}
              className={`${inputClass} !w-28`}
              placeholder="2026-T3"
            />
            <button
              onClick={exportCsv}
              disabled={students.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      />

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {noClasses ? (
        <EmptyState
          icon={GraduationCap}
          title="No classes assigned yet"
          description="The administrator has not assigned any classes to your account. Ask them to add you to a class."
        />
      ) : loading || classesLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students in this class" description="Students appear here once they are added to the class." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Class performance</h3>
              {classAvg.length >= 3 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={classAvg}>
                    <PolarGrid stroke="rgb(148 163 184 / 0.2)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
                    <Radar dataKey="avg" stroke="#0d9488" fill="#0d9488" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgb(226 232 240)', fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-500">Enter marks for at least three subjects to see the chart.</p>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-400 dark:border-slate-800">
                    <th className="px-4 py-3">Student</th>
                    {columns.map((c) => (
                      <th key={c.id} className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1">
                          {c.name}
                          {!editableIds.has(c.id) && <Lock className="h-3 w-3" aria-label="Read only" />}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center">Avg</th>
                    <th className="px-3 py-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map(({ student, average }) => {
                    const g = average === null ? null : letterGrade(average);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-900 dark:text-white">{student.full_name}</td>
                        {columns.map((c) => {
                          const key = keyOf(student.id, c.id);
                          const editable = editableIds.has(c.id);
                          const shown = draft[key] ?? (scores[key] !== undefined ? String(scores[key]) : '');
                          return (
                            <td key={c.id} className="px-2 py-1.5 text-center">
                              {editable ? (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  max={100}
                                  step="0.5"
                                  value={shown}
                                  aria-label={`${c.name} mark for ${student.full_name}`}
                                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                                  onBlur={() => commit(student, c.id)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                                  className={`w-16 rounded-lg border bg-transparent px-2 py-1 text-center text-slate-700 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:text-slate-200 ${
                                    savingKey === key ? 'border-teal-400 opacity-60' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                                  }`}
                                />
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400">{scores[key] ?? '–'}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-slate-900 dark:text-white">{average === null ? '–' : average.toFixed(1)}</td>
                        <td className="px-3 py-2 text-center">{g ? <Badge variant={g.variant}>{g.label}</Badge> : '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <GraduationCap className="h-5 w-5 text-teal-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {overall === null || top === null ? (
                'No marks entered yet for this class and term.'
              ) : (
                <>
                  Class average: <span className="font-semibold text-slate-900 dark:text-white">{overall.toFixed(1)}%</span> · Top performer:{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">{top.student.full_name} ({top.average.toFixed(1)}%)</span>
                </>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

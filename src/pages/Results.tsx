import { useEffect, useMemo, useState } from 'react';
import { Download, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TERM, inputClass, letterGrade } from '@/lib/school';
import { unwrap, useQuery } from '@/lib/useQuery';
import { useMyChildren } from '@/lib/useMyChildren';

interface GradeRow {
  term: string;
  score: number;
  subjects: { name: string } | null;
}

interface Standing {
  student_avg: number;
  class_avg: number;
  class_rank: number;
  class_size: number;
}

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';

export default function Results() {
  const kids = useMyChildren();
  const [childId, setChildId] = useState('');
  const [term, setTerm] = useState<string>(DEFAULT_TERM);
  const child = kids.children.find((c) => c.id === childId) ?? kids.children[0];

  useEffect(() => {
    if (!childId && kids.children[0]) setChildId(kids.children[0].id);
  }, [kids.children, childId]);

  const grades = useQuery(
    async () =>
      child
        ? unwrap<GradeRow[]>((await supabase.from('grades').select('term, score, subjects(name)').eq('student_id', child.id)) as never)
        : [],
    [child?.id],
  );

  const terms = useMemo(() => [...new Set((grades.data ?? []).map((g) => g.term))].sort().reverse(), [grades.data]);
  // Fall back to the newest term that has marks
  const activeTerm = terms.includes(term) ? term : terms[0] ?? term;
  const rows = useMemo(
    () =>
      (grades.data ?? [])
        .filter((g) => g.term === activeTerm)
        .map((g) => ({ subject: g.subjects?.name ?? 'Subject', score: Number(g.score), grade: letterGrade(Number(g.score)) }))
        .sort((a, b) => a.subject.localeCompare(b.subject)),
    [grades.data, activeTerm],
  );

  const standing = useQuery(
    async () => {
      if (!child || rows.length === 0) return null;
      const { data, error } = await supabase.rpc('class_standing', { p_student: child.id, p_term: activeTerm });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Standing[])[0] ?? null;
    },
    [child?.id, activeTerm, rows.length],
  );

  const overall = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 0;
  const best = rows.reduce<(typeof rows)[number] | null>((b, r) => (!b || r.score > b.score ? r : b), null);
  const diff = standing.data ? standing.data.student_avg - standing.data.class_avg : null;

  if (kids.loading) return <p className="text-sm text-slate-500">Loading…</p>;

  if (!child) {
    return (
      <div className="space-y-6">
        <PageHeader title="Results" subtitle="Term results for your children." />
        <EmptyState
          icon={Users}
          title="No children linked yet"
          description="Results appear once your child is matched to their school record. If you just registered, the school may not have enrolled them yet; it links automatically when they do."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        subtitle={`${child.full_name}${child.class ? ` — ${child.class.label}` : ''} · ${activeTerm}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {kids.children.length > 1 && (
              <select value={child.id} onChange={(e) => setChildId(e.target.value)} aria-label="Child" className={`${inputClass} w-auto`}>
                {kids.children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            )}
            {terms.length > 1 && (
              <select value={activeTerm} onChange={(e) => setTerm(e.target.value)} aria-label="Term" className={`${inputClass} w-auto`}>
                {terms.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <button
              onClick={() => window.print()}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Download report
            </button>
          </div>
        }
      />

      {grades.error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{grades.error}</p>}

      {!grades.loading && rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No results yet" description="Marks appear here as teachers enter them in the gradebook." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Overall average" value={`${overall.toFixed(1)}%`} icon={GraduationCap} accent="teal" />
            <StatCard label="Best subject" value={best?.subject ?? '—'} icon={TrendingUp} accent="emerald" hint={best ? `${best.score}%` : undefined} />
            <StatCard
              label="Class rank"
              value={standing.data ? `${standing.data.class_rank} / ${standing.data.class_size}` : '—'}
              icon={Users}
              accent="sky"
              hint={standing.data ? undefined : 'Shown once classmates have marks'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className={`${card} lg:col-span-3`}>
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Subject scores</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.15)" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgb(13 148 136 / 0.05)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgb(226 232 240)', fontSize: 12 }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {rows.map((r, i) => (
                      <Cell key={i} fill={r.score >= 90 ? '#0d9488' : r.score >= 80 ? '#0ea5e9' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`${card} lg:col-span-2`}>
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Subject breakdown</h3>
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.subject} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{r.subject}</p>
                      <p className="text-xs text-slate-400">{r.score} / 100</p>
                    </div>
                    <Badge variant={r.grade.variant}>{r.grade.label}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {standing.data && diff !== null && (
            <div className={`${card} flex items-center gap-3 !p-4`}>
              <GraduationCap className="h-5 w-5 text-teal-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Class average is {standing.data.class_avg}%.{' '}
                <span className={`font-semibold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                </span>{' '}
                {diff >= 0 ? 'above' : 'below'} the class average.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

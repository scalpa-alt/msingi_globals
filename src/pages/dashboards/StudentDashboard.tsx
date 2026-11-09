import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Award, Wallet, CalendarDays, Bell, ArrowRight, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TERM, inputClass, letterGrade } from '@/lib/school';
import { money, shortDate, timeAgo, todayISO } from '@/lib/format';
import { unwrap, useQuery } from '@/lib/useQuery';
import { useMyChildren } from '@/lib/useMyChildren';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';

interface Summary {
  attendance: number | null;
  average: number | null;
  term: string;
  balance: number;
  marks: { subject: string; score: number }[];
  exams: { id: string; name: string; exam_date: string; subject: string | null }[];
  notices: { id: string; title: string; detail: string; created_at: string }[];
}

export default function StudentDashboard() {
  const kids = useMyChildren();
  const [childId, setChildId] = useState('');
  const child = kids.children.find((c) => c.id === childId) ?? kids.children[0];

  useEffect(() => {
    if (!childId && kids.children[0]) setChildId(kids.children[0].id);
  }, [kids.children, childId]);

  const summary = useQuery<Summary | null>(async () => {
    if (!child) return null;
    const grade = child.class ? `Grade ${child.class.grade_level}` : '';
    const [att, grades, invoices, exams, notices] = await Promise.all([
      supabase.from('attendance').select('status').eq('student_id', child.id),
      supabase.from('grades').select('term, score, subjects(name)').eq('student_id', child.id),
      supabase.from('fee_invoices').select('amount, fee_payments(amount)').eq('student_id', child.id),
      supabase.from('exams').select('id, name, exam_date, subjects(name)').gte('exam_date', todayISO()).eq('grade_label', grade).order('exam_date').limit(4),
      supabase.from('notices').select('id, title, detail, created_at').in('audience', ['all', 'parents', 'students']).order('created_at', { ascending: false }).limit(5),
    ]);

    const attendance = unwrap<{ status: string }[]>(att as never);
    const gradeRows = unwrap<{ term: string; score: number; subjects: { name: string } | null }[]>(grades as never);
    const invoiceRows = unwrap<{ amount: number; fee_payments: { amount: number }[] }[]>(invoices as never);

    const term = gradeRows.map((g) => g.term).sort().reverse()[0] ?? DEFAULT_TERM;
    const marks = gradeRows.filter((g) => g.term === term).map((g) => ({ subject: g.subjects?.name ?? 'Subject', score: Number(g.score) }));
    const present = attendance.filter((a) => a.status !== 'Absent').length;

    return {
      attendance: attendance.length ? (present / attendance.length) * 100 : null,
      average: marks.length ? marks.reduce((s, m) => s + m.score, 0) / marks.length : null,
      term,
      balance: invoiceRows.reduce((s, i) => s + Number(i.amount) - i.fee_payments.reduce((p, x) => p + Number(x.amount), 0), 0),
      marks: marks.sort((a, b) => a.subject.localeCompare(b.subject)),
      exams: unwrap<{ id: string; name: string; exam_date: string; subjects: { name: string } | null }[]>(exams as never).map((e) => ({
        id: e.id, name: e.name, exam_date: e.exam_date, subject: e.subjects?.name ?? null,
      })),
      notices: unwrap<Summary['notices']>(notices as never),
    };
  }, [child?.id]);

  if (kids.loading || (child && summary.loading && !summary.data)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="space-y-6">
        <PageHeader title="Your dashboard" subtitle="Follow your children's progress." />
        <EmptyState
          icon={Users}
          title="No children linked yet"
          description="Your account is active. Each child is linked to their school record as soon as the name and class you entered match an enrolled student, and automatically when the school enrols them."
        />
      </div>
    );
  }

  const data = summary.data;
  const att = data?.attendance;
  const balance = data?.balance ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${child.full_name}'s dashboard`}
        subtitle={`${child.class?.label ?? 'No class yet'} · ${data?.term ?? DEFAULT_TERM}`}
        actions={
          kids.children.length > 1 ? (
            <div className="flex items-center gap-2">
              <label htmlFor="child-switcher" className="text-sm font-medium text-slate-500 dark:text-slate-400">Viewing</label>
              <select id="child-switcher" value={child.id} onChange={(e) => setChildId(e.target.value)} className={`${inputClass} w-auto`}>
                {kids.children.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.class ? ` (${c.class.label})` : ''}</option>)}
              </select>
            </div>
          ) : undefined
        }
      />

      {summary.error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{summary.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Attendance" value={att == null ? '—' : `${att.toFixed(1)}%`} icon={CalendarCheck} accent={att != null && att < 90 ? 'amber' : 'emerald'} hint={att == null ? 'No attendance recorded yet' : 'Present or late'} />
        <StatCard label="Average score" value={data?.average == null ? '—' : `${data.average.toFixed(1)}%`} icon={Award} accent="teal" hint={data?.average == null ? 'No marks yet' : 'Across all subjects'} />
        <StatCard
          label="Fee balance"
          value={balance <= 0 ? 'Cleared' : money(balance)}
          icon={Wallet}
          accent={balance <= 0 ? 'emerald' : 'rose'}
          hint={balance <= 0 ? 'No payments due' : 'Outstanding'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card} aria-label="Latest marks">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Latest marks</h2>
            <Link to="/results" className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              All results <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data && data.marks.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {data.marks.map((m) => (
                <li key={m.subject}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900 dark:text-white">{m.subject}</span>
                    <span className="text-slate-500 dark:text-slate-400">{m.score}% · Grade {letterGrade(m.score).label}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={m.score} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.subject} score`}>
                    <div className="h-full rounded-full bg-teal-500" style={{ width: `${m.score}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-slate-400">No marks have been entered yet.</p>
          )}
        </section>

        <section className={card} aria-label="Upcoming exams">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Upcoming exams</h2>
            <Link to="/timetable" className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              Timetable <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data && data.exams.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {data.exams.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{e.name}</p>
                    {e.subject && <p className="text-xs text-slate-500 dark:text-slate-400">{e.subject}</p>}
                  </div>
                  <Badge variant="amber">{shortDate(e.exam_date)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-slate-400">No exams scheduled for this grade.</p>
          )}
        </section>
      </div>

      <section className={card} aria-label="Notices">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Notices
        </h2>
        {data && data.notices.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {data.notices.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{n.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No notices right now.</p>
        )}
      </section>
    </div>
  );
}

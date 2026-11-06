import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Award, Wallet, CalendarDays, Bell, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import Skeleton from '@/components/Skeleton';
import { useLoadingDelay } from '@/hooks/useLoadingDelay';
import { children, studentSummary } from '@/data/mockData';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StudentDashboard() {
  const loading = useLoadingDelay(900);
  const [childId, setChildId] = useState<keyof typeof studentSummary>('c1');

  if (loading) {
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

  const child = children.find((c) => c.id === childId) ?? children[0];
  const data = studentSummary[childId];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${child.name}'s dashboard`}
        subtitle={`${child.grade} · term overview`}
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="child-switcher" className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Viewing
            </label>
            <select
              id="child-switcher"
              value={childId}
              onChange={(e) => setChildId(e.target.value as keyof typeof studentSummary)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
              ))}
            </select>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Attendance" value={`${data.attendance}%`} icon={CalendarCheck} accent={data.attendance >= 90 ? 'emerald' : 'amber'} hint="This term" />
        <StatCard label="Average score" value={`${data.gpa}%`} icon={Award} accent="teal" hint="Across all subjects" />
        <StatCard
          label="Fee balance"
          value={data.feeBalance === 0 ? 'Cleared' : `$${data.feeBalance.toLocaleString()}`}
          icon={Wallet}
          accent={data.feeBalance === 0 ? 'emerald' : 'rose'}
          hint={data.feeBalance === 0 ? 'No payments due' : 'Payment due soon'}
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
          <ul className="mt-4 space-y-4">
            {data.latestMarks.map((m) => (
              <li key={m.subject}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">{m.subject}</span>
                  <span className="text-slate-500 dark:text-slate-400">{m.score}% · Grade {m.grade}</span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  role="progressbar"
                  aria-valuenow={m.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${m.subject} score`}
                >
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${m.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={card} aria-label="Upcoming exams">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Upcoming exams</h2>
            <Link to="/timetable" className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              Timetable <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {data.upcomingExams.map((e) => (
              <li key={e.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{e.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{e.subject}</p>
                </div>
                <Badge variant="amber">{formatDate(e.date)}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={card} aria-label="Notices">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
          <Bell className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Notices
        </h2>
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {data.notices.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {n.title} {n.urgent && <Badge variant="rose">Action needed</Badge>}
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{n.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{n.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

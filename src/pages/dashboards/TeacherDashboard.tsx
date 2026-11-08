import { Link } from 'react-router-dom';
import { Clock, MapPin, Users, CalendarCheck, FileCheck2, Megaphone, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import Skeleton from '@/components/Skeleton';
import { useLoadingDelay } from '@/hooks/useLoadingDelay';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { useManagedClasses } from '@/lib/school';
import MyClass from '@/pages/teacher/MyClass';
import SubjectView from '@/pages/teacher/SubjectView';
import { teacherClasses, pendingMarking, announcements } from '@/data/mockData';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';

const statusStyle: Record<string, { label: string; variant: 'emerald' | 'teal' | 'slate' }> = {
  done: { label: 'Done', variant: 'emerald' },
  now: { label: 'In progress', variant: 'teal' },
  upcoming: { label: 'Upcoming', variant: 'slate' },
};

function TeacherOverview() {
  const loading = useLoadingDelay(900);
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const firstName = user?.name.split(' ')[0] ?? 'there';
  const totalUngraded = pendingMarking.reduce((s, p) => s + p.ungraded, 0);
  const nowClass = teacherClasses.find((c) => c.status === 'now');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good day, ${firstName}`}
        subtitle={`You have ${teacherClasses.length} classes today.`}
        actions={
          <Link
            to="/attendance"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <CalendarCheck className="h-4 w-4" />
            Take attendance
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Classes today" value={teacherClasses.length} icon={Clock} accent="teal" hint={nowClass ? `Now: ${nowClass.grade}` : undefined} />
        <StatCard label="Students taught today" value={teacherClasses.reduce((s, c) => s + c.students, 0)} icon={Users} accent="sky" />
        <StatCard label="Papers to mark" value={totalUngraded} icon={FileCheck2} accent="amber" hint={`${pendingMarking.length} assessments pending`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${card} lg:col-span-2`} aria-label="Today's classes">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Today's classes</h2>
            <Link to="/timetable" className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              Full timetable <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {teacherClasses.map((c) => {
              const st = statusStyle[c.status] ?? statusStyle.upcoming;
              const active = c.status === 'now';
              return (
                <li
                  key={c.id}
                  className={`flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    active
                      ? 'border-teal-300 bg-teal-50/60 dark:border-teal-500/40 dark:bg-teal-500/5'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {c.subject} <span className="text-slate-400">·</span> {c.grade}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.period}, {c.time}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.room}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students} students</span>
                    </p>
                  </div>
                  <Badge variant={st.variant} dot>{st.label}</Badge>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-4">
          <section className={card} aria-label="Pending marking">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Pending marking</h2>
            <ul className="mt-4 space-y-3">
              {pendingMarking.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{p.assessment}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.grade} · submitted {p.submitted}</p>
                  </div>
                  <Badge variant="amber">{p.ungraded} left</Badge>
                </li>
              ))}
            </ul>
            <Link to="/gradebook" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              Open gradebook <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className={card} aria-label="Announcements">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Megaphone className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Announcements
            </h2>
            <ul className="mt-4 space-y-4">
              {announcements.map((a) => (
                <li key={a.id}>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{a.detail}</p>
                  <p className="mt-1 text-xs text-slate-400">{a.by} · {a.time}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

type Tab = 'overview' | 'class' | 'subjects';

export default function TeacherDashboard() {
  const { classes, assignments, loading } = useManagedClasses();
  const [tab, setTab] = useState<Tab>('overview');
  const ownClasses = classes.filter((c) => assignments.some((a) => a.class_id === c.id && a.is_class_teacher));
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    ...(ownClasses.length ? [{ id: 'class' as const, label: 'My Class' }] : []),
    { id: 'subjects', label: 'Subjects' },
  ];
  const active = tabs.some((t) => t.id === tab) ? tab : 'overview';

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Teacher views" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              active === t.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active === 'overview' && <TeacherOverview />}
      {active === 'class' && !loading && <MyClass classes={ownClasses} />}
      {active === 'subjects' && !loading && <SubjectView classes={classes} assignments={assignments} />}
    </div>
  );
}

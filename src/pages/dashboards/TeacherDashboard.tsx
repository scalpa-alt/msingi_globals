import { Link } from 'react-router-dom';
import { Clock, MapPin, Users, CalendarCheck, FileCheck2, Megaphone, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import Skeleton from '@/components/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TERM, useManagedClasses } from '@/lib/school';
import { hhmm, timeAgo } from '@/lib/format';
import { unwrap, useQuery } from '@/lib/useQuery';
import MyClass from '@/pages/teacher/MyClass';
import SubjectView from '@/pages/teacher/SubjectView';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';

type SlotStatus = 'done' | 'now' | 'upcoming';
const statusStyle: Record<SlotStatus, { label: string; variant: 'emerald' | 'teal' | 'slate' }> = {
  done: { label: 'Done', variant: 'emerald' },
  now: { label: 'In progress', variant: 'teal' },
  upcoming: { label: 'Upcoming', variant: 'slate' },
};

interface SlotRow {
  class_id: string;
  room: string | null;
  classes: { label: string } | null;
  subjects: { name: string } | null;
  periods: { label: string; start_time: string; end_time: string } | null;
}

interface Overview {
  slots: { id: string; period: string; time: string; subject: string; className: string; room: string | null; students: number; status: SlotStatus }[];
  toMark: { id: string; subject: string; className: string; missing: number }[];
  notices: { id: string; title: string; detail: string; author_name: string | null; created_at: string }[];
}

function TeacherOverview() {
  const { user } = useAuth();
  const { assignments } = useManagedClasses();

  const overview = useQuery<Overview>(async () => {
    const now = new Date();
    const weekday = now.getDay(); // 1 = Monday ... 5 = Friday
    const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const [slotRes, noticeRes] = await Promise.all([
      weekday >= 1 && weekday <= 5
        ? supabase
            .from('timetable_slots')
            .select('class_id, room, period_id, classes(label), subjects(name), periods(label, start_time, end_time)')
            .eq('teacher_id', user!.id)
            .eq('weekday', weekday)
            .order('period_id')
        : Promise.resolve({ data: [], error: null }),
      supabase.from('notices').select('id, title, detail, author_name, created_at').in('audience', ['all', 'teachers']).order('created_at', { ascending: false }).limit(4),
    ]);
    const slotRows = unwrap<SlotRow[]>(slotRes as never);

    // Class sizes, and which students still have no mark for the subjects this teacher teaches
    const subjectAssignments = assignments.filter((a) => a.subject_id);
    const classIds = [...new Set([...slotRows.map((s) => s.class_id), ...subjectAssignments.map((a) => a.class_id)])];
    let students: { id: string; class_id: string }[] = [];
    let graded: { student_id: string; subject_id: string }[] = [];
    if (classIds.length) {
      students = unwrap<{ id: string; class_id: string }[]>((await supabase.from('students').select('id, class_id').in('class_id', classIds).eq('status', 'active')) as never);
      const subjectIds = [...new Set(subjectAssignments.map((a) => a.subject_id as string))];
      if (subjectIds.length && students.length) {
        graded = unwrap<{ student_id: string; subject_id: string }[]>(
          (await supabase.from('grades').select('student_id, subject_id').eq('term', DEFAULT_TERM).in('subject_id', subjectIds).in('student_id', students.map((x) => x.id))) as never,
        );
      }
    }
    const sizeOf = (classId: string) => students.filter((x) => x.class_id === classId).length;

    const names = unwrap<{ id: string; label: string }[]>((await supabase.from('classes').select('id, label').in('id', classIds.length ? classIds : ['00000000-0000-0000-0000-000000000000'])) as never);
    const subj = unwrap<{ id: string; name: string }[]>((await supabase.from('subjects').select('id, name')) as never);

    return {
      slots: slotRows.map((s, i) => {
        const start = s.periods ? hhmm(s.periods.start_time) : '';
        const end = s.periods ? hhmm(s.periods.end_time) : '';
        const status: SlotStatus = end && clock >= end ? 'done' : start && clock >= start ? 'now' : 'upcoming';
        return {
          id: `${s.class_id}-${i}`,
          period: s.periods?.label ?? `Period ${i + 1}`,
          time: start && end ? `${start} – ${end}` : '',
          subject: s.subjects?.name ?? 'Subject',
          className: s.classes?.label ?? '',
          room: s.room,
          students: sizeOf(s.class_id),
          status,
        };
      }),
      toMark: subjectAssignments
        .map((a) => {
          const inClass = students.filter((x) => x.class_id === a.class_id);
          const missing = inClass.filter((x) => !graded.some((g) => g.student_id === x.id && g.subject_id === a.subject_id)).length;
          return {
            id: `${a.class_id}-${a.subject_id}`,
            subject: subj.find((x) => x.id === a.subject_id)?.name ?? 'Subject',
            className: names.find((x) => x.id === a.class_id)?.label ?? '',
            missing,
          };
        })
        .filter((x) => x.missing > 0),
      notices: unwrap<Overview['notices']>(noticeRes as never),
    };
  }, [user?.id, assignments.length]);

  if (overview.loading && !overview.data) {
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

  const { slots = [], toMark = [], notices = [] } = overview.data ?? {};
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const totalMissing = toMark.reduce((sum, p) => sum + p.missing, 0);
  const nowClass = slots.find((c) => c.status === 'now');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good day, ${firstName}`}
        subtitle={slots.length ? `You have ${slots.length} ${slots.length === 1 ? 'class' : 'classes'} today.` : 'No classes on your timetable today.'}
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

      {overview.error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{overview.error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Classes today" value={slots.length} icon={Clock} accent="teal" hint={nowClass ? `Now: ${nowClass.className}` : undefined} />
        <StatCard label="Students taught today" value={slots.reduce((sum, c) => sum + c.students, 0)} icon={Users} accent="sky" />
        <StatCard label="Marks to enter" value={totalMissing} icon={FileCheck2} accent="amber" hint={`${toMark.length} ${toMark.length === 1 ? 'class' : 'classes'} · ${DEFAULT_TERM}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${card} lg:col-span-2`} aria-label="Today's classes">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Today's classes</h2>
            <Link to="/timetable" className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              Full timetable <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {slots.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">Nothing scheduled. Classes assigned to you on the timetable appear here.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {slots.map((c) => {
                const st = statusStyle[c.status];
                const active = c.status === 'now';
                return (
                  <li
                    key={c.id}
                    className={`flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      active ? 'border-teal-300 bg-teal-50/60 dark:border-teal-500/40 dark:bg-teal-500/5' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {c.subject} <span className="text-slate-400">·</span> {c.className}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.period}{c.time && `, ${c.time}`}</span>
                        {c.room && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.room}</span>}
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students} students</span>
                      </p>
                    </div>
                    <Badge variant={st.variant} dot>{st.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className={card} aria-label="Marks to enter">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Marks to enter</h2>
            {toMark.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Every student in your classes has a {DEFAULT_TERM} mark.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {toMark.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{p.subject}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.className}</p>
                    </div>
                    <Badge variant="amber">{p.missing} left</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/gradebook" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              Open gradebook <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>

          <section className={card} aria-label="Announcements">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Megaphone className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Announcements
            </h2>
            {notices.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No announcements right now.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {notices.map((a) => (
                  <li key={a.id}>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{a.detail}</p>
                    <p className="mt-1 text-xs text-slate-400">{a.author_name ? `${a.author_name} · ` : ''}{timeAgo(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
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

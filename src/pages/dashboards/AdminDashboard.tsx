import { Users, GraduationCap, CalendarCheck, Wallet, UserPlus, ClipboardList, BookOpen, AlertTriangle, Library } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Skeleton from '@/components/Skeleton';
import { useLoadingDelay } from '@/hooks/useLoadingDelay';
import { academicStats, enrollmentTrend, feesCollectedByMonth, activityFeed } from '@/data/mockData';

const activityIcon: Record<string, { icon: typeof Users; tone: string }> = {
  grade: { icon: ClipboardList, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
  fee: { icon: Wallet, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  attendance: { icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  exam: { icon: BookOpen, tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' },
  admission: { icon: UserPlus, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
  library: { icon: Library, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';

export default function AdminDashboard() {
  const loading = useLoadingDelay(900);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const latestFees = feesCollectedByMonth[feesCollectedByMonth.length - 1].amount;

  return (
    <div className="space-y-6">
      <PageHeader title="Administrator dashboard" subtitle="School-wide overview for today." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={academicStats.totalStudents.toLocaleString()} icon={Users} trend={{ value: '+0.8%', up: true }} accent="teal" hint="vs. last month" />
        <StatCard label="Teachers and staff" value={academicStats.totalStaff} icon={GraduationCap} accent="sky" hint={`${academicStats.activeClasses} active classes`} />
        <StatCard label="Attendance today" value={`${academicStats.attendanceToday}%`} icon={CalendarCheck} trend={{ value: '-1.2%', up: false }} accent="amber" hint="vs. yesterday" />
        <StatCard label="Fees collected (Nov)" value={`$${latestFees.toLocaleString()}`} icon={Wallet} trend={{ value: '+6.1%', up: true }} accent="emerald" hint={`${academicStats.feeCollection}% of term target`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card} aria-label="Enrolment trend">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Enrolment trend</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total students, last six months</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentTrend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={['dataMin - 20', 'dataMax + 20']} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="students" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={card} aria-label="Fees collected">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Fees collected</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monthly collections (USD)</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feesCollectedByMonth} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={(v: number) => `${v / 1000}k`} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Collected']} />
                <Bar dataKey="amount" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className={card} aria-label="Recent activity">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent activity</h2>
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {activityFeed.map((a) => {
            const meta = activityIcon[a.type] ?? activityIcon.library;
            const Icon = meta.icon;
            return (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-900 dark:text-white">{a.who}</span> {a.action}
                </p>
                <span className="shrink-0 text-xs text-slate-400">{a.time}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

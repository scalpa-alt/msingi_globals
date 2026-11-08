import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, Wallet, UserPlus, ClipboardList, BookOpen, AlertTriangle, Library, UserCheck, Baby } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import Skeleton from '@/components/Skeleton';
import { useLoadingDelay } from '@/hooks/useLoadingDelay';
import { supabase } from '@/lib/supabase';
import { enrollmentTrend, feesCollectedByMonth, activityFeed } from '@/data/mockData';

const activityIcon: Record<string, { icon: typeof Users; tone: string }> = {
  grade: { icon: ClipboardList, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
  fee: { icon: Wallet, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  attendance: { icon: AlertTriangle, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  exam: { icon: BookOpen, tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' },
  admission: { icon: UserPlus, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
  library: { icon: Library, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';

interface Overview {
  activeTeachers: number;
  registeredParents: number;
  totalStudents: number;
  pendingTeachers: number;
}

export default function AdminDashboard() {
  const loading = useLoadingDelay(900);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    supabase.rpc('get_school_overview').then(({ data }) => setOverview((data as Overview | null) ?? null));
  }, []);
  const pending = overview?.pendingTeachers ?? 0;
  const n = (v: number | undefined) => (overview ? (v ?? 0).toLocaleString() : '…');

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

  return (
    <div className="space-y-6">
      <PageHeader title="Administrator dashboard" subtitle="School-wide overview for today." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active teachers" value={n(overview?.activeTeachers)} icon={GraduationCap} accent="sky" hint="Approved and signed up" />
        <StatCard label="Registered parents" value={n(overview?.registeredParents)} icon={Baby} accent="emerald" hint="Verified accounts" />
        <StatCard label="Total students" value={n(overview?.totalStudents)} icon={Users} accent="teal" hint="Currently enrolled" />
        <Link to="/approvals" className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" aria-label="Open pending approvals">
          <StatCard label="Pending approvals" value={n(pending)} icon={UserCheck} accent={pending > 0 ? 'amber' : 'teal'}
            hint={overview ? 'Teachers awaiting approval' : undefined} />
        </Link>
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

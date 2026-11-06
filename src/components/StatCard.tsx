import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; up: boolean };
  accent?: 'teal' | 'amber' | 'rose' | 'sky' | 'emerald';
  hint?: string;
}

const accents: Record<NonNullable<StatCardProps['accent']>, string> = {
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
};

export default function StatCard({ label, value, icon: Icon, trend, accent = 'teal', hint }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-all hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              trend.up
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
            }`}
          >
            {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {hint && <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

import type { ReactNode } from 'react';

type BadgeVariant = 'teal' | 'amber' | 'rose' | 'sky' | 'slate' | 'emerald';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
};

const dotColors: Record<BadgeVariant, string> = {
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-400',
  emerald: 'bg-emerald-500',
};

export function variantForStatus(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (['approved', 'paid', 'completed', 'present', 'active'].includes(s)) return 'emerald';
  if (['pending', 'review', 'upcoming'].includes(s)) return 'amber';
  if (['overdue', 'absent', 'rejected'].includes(s)) return 'rose';
  return 'slate';
}

export default function Badge({ children, variant = 'slate', dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

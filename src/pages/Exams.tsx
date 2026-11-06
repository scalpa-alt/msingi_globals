import { ClipboardList, Plus, MapPin, Calendar } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge, { variantForStatus } from '@/components/Badge';
import { exams } from '@/lib/supabase';

export default function Exams() {
  const upcoming = exams.filter((e) => e.status === 'Upcoming');
  const completed = exams.filter((e) => e.status === 'Completed');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        subtitle="Schedule and manage upcoming examinations."
        actions={
          <button className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Schedule Exam
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <ClipboardList className="h-8 w-8 text-teal-500" />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{upcoming.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming exams</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <Calendar className="h-8 w-8 text-sky-500" />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{completed.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Completed this term</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <MapPin className="h-8 w-8 text-amber-500" />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">4</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Exam halls booked</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Upcoming</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((e) => (
            <div key={e.name} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <Badge variant={variantForStatus(e.status)} dot>{e.status}</Badge>
                <span className="text-xs text-slate-400">{e.date}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{e.name}</h3>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.room}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {e.grade}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Completed</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {completed.map((e) => (
            <div key={e.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card opacity-80 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <Badge variant={variantForStatus(e.status)} dot>{e.status}</Badge>
                <span className="text-xs text-slate-400">{e.date}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{e.name}</h3>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.room}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {e.grade}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

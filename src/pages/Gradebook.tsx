import { GraduationCap, Plus, Download } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import { gradebook } from '@/lib/supabase';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';

const subjects = ['math', 'english', 'science', 'history'] as const;
const subjectLabels: Record<string, string> = { math: 'Math', english: 'English', science: 'Science', history: 'History' };

function gradeLetter(avg: number) {
  if (avg >= 90) return { label: 'A', variant: 'emerald' as const };
  if (avg >= 80) return { label: 'B', variant: 'teal' as const };
  if (avg >= 70) return { label: 'C', variant: 'amber' as const };
  return { label: 'D', variant: 'rose' as const };
}

const classAvg = subjects.map((s) => ({
  subject: subjectLabels[s],
  avg: +(gradebook.reduce((sum, r) => sum + r[s], 0) / gradebook.length).toFixed(1),
}));

export default function Gradebook() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gradebook"
        subtitle="Midterm grades for Grade 10 — Section A."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              <Download className="h-4 w-4" /> Export
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700">
              <Plus className="h-4 w-4" /> Add Grade
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Class Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={classAvg}>
              <PolarGrid stroke="rgb(148 163 184 / 0.2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
              <Radar dataKey="avg" stroke="#0d9488" fill="#0d9488" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgb(226 232 240)', fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto scrollbar-thin rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-400 dark:border-slate-800">
                <th className="px-4 py-3">Student</th>
                {subjects.map((s) => (
                  <th key={s} className="px-4 py-3 text-center">{subjectLabels[s]}</th>
                ))}
                <th className="px-4 py-3 text-center">Avg</th>
                <th className="px-4 py-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {gradebook.map((r) => {
                const g = gradeLetter(r.average);
                return (
                  <tr key={r.student} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.student}</td>
                    {subjects.map((s) => (
                      <td key={s} className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{r[s]}</td>
                    ))}
                    <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-white">{r.average.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center"><Badge variant={g.variant}>{g.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <GraduationCap className="h-5 w-5 text-teal-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Class average: <span className="font-semibold text-slate-900 dark:text-white">{(gradebook.reduce((s, r) => s + r.average, 0) / gradebook.length).toFixed(1)}%</span> · Top performer: <span className="font-semibold text-slate-900 dark:text-white">Sofia Nguyen (90.5%)</span>
        </p>
      </div>
    </div>
  );
}

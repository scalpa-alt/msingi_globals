import { GraduationCap, Download, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import StatCard from '@/components/StatCard';
import { gradebook } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const studentResults = [
  { subject: 'Mathematics', score: 88, max: 100, grade: 'A' },
  { subject: 'English', score: 92, max: 100, grade: 'A' },
  { subject: 'Science', score: 85, max: 100, grade: 'A' },
  { subject: 'History', score: 79, max: 100, grade: 'B' },
];

function gradeColor(grade: string): 'emerald' | 'teal' | 'amber' | 'rose' {
  if (grade === 'A') return 'emerald';
  if (grade === 'B') return 'teal';
  if (grade === 'C') return 'amber';
  return 'rose';
}

export default function Results() {
  const overall = (studentResults.reduce((s, r) => s + r.score, 0) / studentResults.length).toFixed(1);
  const best = studentResults.reduce((b, r) => (r.score > b.score ? r : b), studentResults[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        subtitle="Midterm results for Aisha Rahman — Grade 9, Section A."
        actions={
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <Download className="h-4 w-4" /> Download Report
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Overall Average" value={`${overall}%`} icon={GraduationCap} accent="teal" />
        <StatCard label="Best Subject" value={best.subject} icon={TrendingUp} accent="emerald" hint={`${best.score}%`} />
        <StatCard label="Class Rank" value="3 / 32" icon={GraduationCap} accent="sky" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Subject Scores</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={studentResults} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.15)" vertical={false} />
              <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgb(13 148 136 / 0.05)' }} contentStyle={{ borderRadius: 12, border: '1px solid rgb(226 232 240)', fontSize: 12 }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {studentResults.map((r, i) => (
                  <Cell key={i} fill={r.score >= 90 ? '#0d9488' : r.score >= 80 ? '#0ea5e9' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Subject Breakdown</h3>
          <div className="space-y-3">
            {studentResults.map((r) => (
              <div key={r.subject} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{r.subject}</p>
                  <p className="text-xs text-slate-400">{r.score} / {r.max}</p>
                </div>
                <Badge variant={gradeColor(r.grade)}>{r.grade}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <GraduationCap className="h-5 w-5 text-teal-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Compared to class average: <span className="font-semibold text-emerald-600 dark:text-emerald-400">+4.3%</span> above the Grade 9 average.
        </p>
      </div>
    </div>
  );
}

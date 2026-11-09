import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Calendar, ClipboardList, MapPin, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass, useManagedClasses, useSubjects } from '@/lib/school';
import { shortDate, todayISO } from '@/lib/format';
import { unwrap, useQuery } from '@/lib/useQuery';

interface ExamRow {
  id: string;
  name: string;
  grade_label: string;
  exam_date: string;
  room: string | null;
  subjects: { name: string } | null;
}

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';

export default function Exams() {
  const subjects = useSubjects();
  const { classes } = useManagedClasses();
  const exams = useQuery(
    async () =>
      unwrap<ExamRow[]>(
        (await supabase.from('exams').select('id, name, grade_label, exam_date, room, subjects(name)').order('exam_date')) as never,
      ),
    [],
  );

  const today = todayISO();
  const upcoming = useMemo(() => (exams.data ?? []).filter((e) => e.exam_date >= today), [exams.data, today]);
  const completed = useMemo(() => (exams.data ?? []).filter((e) => e.exam_date < today).reverse(), [exams.data, today]);
  const halls = new Set(upcoming.map((e) => e.room).filter(Boolean)).size;

  // Grades the school actually has, e.g. "Grade 9", for the schedule form
  const gradeOptions = useMemo(
    () => [...new Set(classes.map((c) => c.grade_level))].sort((a, b) => a - b).map((n) => `Grade ${n}`),
    [classes],
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', grade: '', date: '', room: '', subjectId: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const valid = form.name.trim() && form.grade && form.date;

  async function schedule(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setFormError(null);
    const { error } = await supabase.from('exams').insert({
      name: form.name.trim(),
      grade_label: form.grade,
      exam_date: form.date,
      room: form.room.trim() || null,
      subject_id: form.subjectId || null,
    });
    setSaving(false);
    if (error) return setFormError(friendlyError(error));
    setOpen(false);
    setForm({ name: '', grade: '', date: '', room: '', subjectId: '' });
    exams.reload();
  }

  async function remove(id: string) {
    setActionError(null);
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) setActionError(friendlyError(error));
    else exams.reload();
  }

  const list = (rows: ExamRow[], done: boolean) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((e) => (
        <div key={e.id} className={`${card} transition hover:shadow-card-hover ${done ? 'opacity-80' : ''}`}>
          <div className="flex items-start justify-between">
            <Badge variant={done ? 'slate' : 'amber'} dot>{done ? 'Completed' : 'Upcoming'}</Badge>
            <span className="text-xs text-slate-400">{shortDate(e.exam_date)}</span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{e.name}</h3>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {e.room && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.room}</span>}
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {e.grade_label}</span>
              {e.subjects?.name && <span>{e.subjects.name}</span>}
            </span>
            <button onClick={() => remove(e.id)} aria-label={`Delete ${e.name}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        subtitle="Schedule and manage examinations."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40">
            <Plus className="h-4 w-4" /> Schedule exam
          </button>
        }
      />

      {(exams.error || actionError) && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{exams.error ?? actionError}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={card}>
          <ClipboardList className="h-8 w-8 text-teal-500" />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{exams.loading ? '…' : upcoming.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming exams</p>
        </div>
        <div className={card}>
          <Calendar className="h-8 w-8 text-sky-500" />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{exams.loading ? '…' : completed.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
        </div>
        <div className={card}>
          <MapPin className="h-8 w-8 text-amber-500" />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{exams.loading ? '…' : halls}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Rooms booked for upcoming exams</p>
        </div>
      </div>

      {!exams.loading && (exams.data ?? []).length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No exams scheduled"
          description="Schedule the first exam and it will show up here, and on parents' and students' dashboards."
          action={<button onClick={() => setOpen(true)} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Schedule exam</button>}
        />
      ) : (
        <>
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Upcoming</h2>
            {upcoming.length ? list(upcoming, false) : <p className="text-sm text-slate-500">Nothing upcoming.</p>}
          </div>
          {completed.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Completed</h2>
              {list(completed, true)}
            </div>
          )}
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Schedule exam"
        description="It appears on the dashboards of every parent and student in that grade."
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button type="submit" form="exam-form" disabled={!valid || saving} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Schedule'}
            </button>
          </>
        }
      >
        <form id="exam-form" onSubmit={schedule} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Midterm — Mathematics" maxLength={120} className={`${inputClass} mt-1`} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Grade
              <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className={`${inputClass} mt-1`}>
                <option value="">Select grade</option>
                {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Date
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Subject
              <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className={`${inputClass} mt-1`}>
                <option value="">Not specific</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Room
              <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Hall A" maxLength={40} className={`${inputClass} mt-1`} />
            </label>
          </div>
          {gradeOptions.length === 0 && <p className="text-xs text-amber-600">No classes exist yet. Add classes first so you can pick a grade.</p>}
          {formError && <p role="alert" className="text-xs text-rose-600">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
}

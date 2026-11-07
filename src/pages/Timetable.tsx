import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { friendlyError, inputClass, useManagedClasses, useSubjects } from '@/lib/school';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface Period {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
}

interface Slot {
  id: string;
  class_id: string;
  weekday: number;
  period_id: number;
  subject_id: string;
  teacher_id: string | null;
  room: string | null;
  class: { label: string } | null;
  subject: { name: string } | null;
  teacher: { full_name: string } | null;
}

interface Teacher {
  id: string;
  full_name: string;
}

interface EditorState {
  slot: Slot | null; // null = adding
  class_id: string;
  subject_id: string;
  teacher_id: string;
  room: string;
  weekday: number;
  period_id: number;
}

const SLOT_SELECT =
  'id, class_id, weekday, period_id, subject_id, teacher_id, room, class:classes(label), subject:subjects(name), teacher:profiles!timetable_slots_teacher_id_fkey(full_name)';

const hhmm = (t: string) => t.slice(0, 5);

export default function Timetable() {
  const { user } = useAuth();
  const role = user!.role;
  const canEdit = role === 'administrator' || role === 'teacher';

  const { classes, assignments, loading: classesLoading } = useManagedClasses();
  const subjects = useSubjects();

  const [periods, setPeriods] = useState<Period[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [classFilter, setClassFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let slotQuery = supabase.from('timetable_slots').select(SLOT_SELECT);
    // A teacher's timetable is "their" lessons only. (Row-level security allows reading more.)
    if (role === 'teacher') slotQuery = slotQuery.eq('teacher_id', user!.id);

    const [p, s] = await Promise.all([supabase.from('periods').select('*').order('id'), slotQuery]);
    if (p.error || s.error) setLoadError((p.error ?? s.error)!.message);
    else setLoadError(null);
    setPeriods((p.data ?? []) as Period[]);
    setSlots((s.data ?? []) as unknown as Slot[]);
    setLoading(false);
  }, [role, user]);

  useEffect(() => {
    load();
  }, [load]);

  // The administrator needs a teacher list to assign lessons.
  useEffect(() => {
    if (role !== 'administrator') return;
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'teacher')
      .order('full_name')
      .then(({ data }) => setTeachers((data ?? []) as Teacher[]));
  }, [role]);

  // Students/parents only see their own children's classes.
  const visibleSlots = useMemo(() => {
    let list = slots;
    if (role === 'student') {
      const ids = new Set(classes.map((c) => c.id));
      list = list.filter((s) => ids.has(s.class_id));
    }
    if (role !== 'teacher' && classFilter !== 'all') list = list.filter((s) => s.class_id === classFilter);
    if (role === 'administrator' && teacherFilter !== 'all') {
      list = list.filter((s) => (teacherFilter === 'none' ? s.teacher_id === null : s.teacher_id === teacherFilter));
    }
    return list;
  }, [slots, role, classes, classFilter, teacherFilter]);

  const cell = (weekday: number, periodId: number) =>
    visibleSlots.filter((s) => s.weekday === weekday && s.period_id === periodId);

  // Subjects a teacher may pick for a class: their assigned subject(s), or all if unrestricted.
  const subjectChoices = (classId: string) => {
    if (role !== 'teacher') return subjects;
    const mine = assignments.filter((a) => a.class_id === classId);
    if (mine.length === 0 || mine.some((a) => a.subject_id === null || a.is_class_teacher)) return subjects;
    const allowed = new Set(mine.map((a) => a.subject_id));
    return subjects.filter((s) => allowed.has(s.id));
  };

  const openAdd = (weekday: number, periodId: number) => {
    const classId = classes[0]?.id ?? '';
    setFormError(null);
    setEditor({
      slot: null,
      class_id: classId,
      subject_id: subjectChoices(classId)[0]?.id ?? '',
      teacher_id: role === 'teacher' ? user!.id : '',
      room: '',
      weekday,
      period_id: periodId,
    });
  };

  const openEdit = (slot: Slot) => {
    setFormError(null);
    setEditor({
      slot,
      class_id: slot.class_id,
      subject_id: slot.subject_id,
      teacher_id: slot.teacher_id ?? '',
      room: slot.room ?? '',
      weekday: slot.weekday,
      period_id: slot.period_id,
    });
  };

  const patch = (changes: Partial<EditorState>) => setEditor((e) => (e ? { ...e, ...changes } : e));

  async function save() {
    if (!editor) return;
    if (!editor.class_id || !editor.subject_id) {
      setFormError('Choose a class and a subject.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      class_id: editor.class_id,
      subject_id: editor.subject_id,
      weekday: editor.weekday,
      period_id: editor.period_id,
      teacher_id: role === 'teacher' ? user!.id : editor.teacher_id || null,
      room: editor.room.trim() || null,
    };
    const res = editor.slot
      ? await supabase.from('timetable_slots').update(payload).eq('id', editor.slot.id).select('id')
      : await supabase.from('timetable_slots').insert(payload).select('id');
    setSaving(false);
    if (res.error) {
      setFormError(friendlyError(res.error));
      return;
    }
    if (!res.data || res.data.length === 0) {
      setFormError('You do not have permission to change this lesson.');
      return;
    }
    setEditor(null);
    load();
  }

  async function remove() {
    if (!editor?.slot) return;
    setSaving(true);
    const { data, error } = await supabase.from('timetable_slots').delete().eq('id', editor.slot.id).select('id');
    setSaving(false);
    if (error || !data || data.length === 0) {
      setFormError(error ? friendlyError(error) : 'You do not have permission to remove this lesson.');
      return;
    }
    setEditor(null);
    load();
  }

  const subtitle =
    role === 'teacher'
      ? 'Your weekly lessons. Click a lesson to edit it, or + to add one.'
      : role === 'administrator'
        ? 'All classes and teachers. Click a lesson to edit it, or + to add one.'
        : 'Weekly timetable for your class.';

  const teacherHasNoClasses = role === 'teacher' && !classesLoading && classes.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === 'teacher' ? 'My Timetable' : 'Timetable & Schedule'}
        subtitle={subtitle}
        actions={
          role !== 'teacher' && (
            <>
              <select
                aria-label="Filter by class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={`${inputClass} !w-auto`}
              >
                <option value="all">{role === 'student' ? 'All my classes' : 'All classes'}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>Class {c.label}</option>
                ))}
              </select>
              {role === 'administrator' && (
                <select
                  aria-label="Filter by teacher"
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className={`${inputClass} !w-auto`}
                >
                  <option value="all">All teachers</option>
                  <option value="none">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name || 'Unnamed teacher'}</option>
                  ))}
                </select>
              )}
            </>
          )
        }
      />

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          Could not load the timetable: {loadError}
        </div>
      )}

      {teacherHasNoClasses && (
        <EmptyState
          icon={CalendarDays}
          title="No classes assigned yet"
          description="The administrator has not assigned any classes to your account. Ask them to add you to a class."
        />
      )}

      {!teacherHasNoClasses && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <table className="w-full min-w-[820px] table-fixed text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-400 dark:border-slate-800">
                  <th className="w-28 px-3 py-3">Period</th>
                  {DAYS.map((d) => <th key={d} className="px-3 py-3">{d}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {periods.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{p.label}</p>
                      <p className="text-xs text-slate-400">{hhmm(p.start_time)} – {hhmm(p.end_time)}</p>
                    </td>
                    {DAYS.map((_, i) => {
                      const weekday = i + 1;
                      const items = cell(weekday, p.id);
                      return (
                        <td key={weekday} className="px-2 py-2">
                          <div className="space-y-1.5">
                            {items.map((s) => {
                              const body = (
                                <>
                                  <span className="block truncate font-medium">{s.subject?.name ?? 'Lesson'}</span>
                                  <span className="block truncate text-xs opacity-80">
                                    Class {s.class?.label}
                                    {s.room ? ` · ${s.room}` : ''}
                                  </span>
                                  {role !== 'teacher' && s.teacher?.full_name && (
                                    <span className="block truncate text-xs opacity-70">{s.teacher.full_name}</span>
                                  )}
                                </>
                              );
                              const style = 'w-full rounded-lg bg-teal-50 px-2.5 py-1.5 text-left text-teal-800 dark:bg-teal-500/10 dark:text-teal-300';
                              return canEdit ? (
                                <button
                                  key={s.id}
                                  onClick={() => openEdit(s)}
                                  className={`${style} transition hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-teal-500/20`}
                                  aria-label={`Edit ${s.subject?.name ?? 'lesson'} for class ${s.class?.label}`}
                                >
                                  {body}
                                </button>
                              ) : (
                                <div key={s.id} className={style}>{body}</div>
                              );
                            })}
                            {canEdit && classes.length > 0 && (
                              <button
                                onClick={() => openAdd(weekday, p.id)}
                                className="flex w-full items-center justify-center rounded-lg border border-dashed border-slate-200 py-1 text-slate-300 transition hover:border-teal-400 hover:text-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700"
                                aria-label={`Add lesson on ${DAYS[i]}, ${p.label}`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.slot ? 'Edit lesson' : 'Add lesson'}
        description={editor ? `${DAYS[editor.weekday - 1]}, ${periods.find((p) => p.id === editor.period_id)?.label ?? ''}` : undefined}
        footer={
          <>
            {editor?.slot && (
              <button
                onClick={remove}
                disabled={saving}
                className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
            <button
              onClick={() => setEditor(null)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {editor && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Class
              <select
                className={`${inputClass} mt-1.5`}
                value={editor.class_id}
                onChange={(e) => {
                  const choices = subjectChoices(e.target.value);
                  patch({
                    class_id: e.target.value,
                    subject_id: choices.some((s) => s.id === editor.subject_id) ? editor.subject_id : choices[0]?.id ?? '',
                  });
                }}
              >
                {classes.map((c) => <option key={c.id} value={c.id}>Class {c.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Subject
              <select className={`${inputClass} mt-1.5`} value={editor.subject_id} onChange={(e) => patch({ subject_id: e.target.value })}>
                {subjectChoices(editor.class_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Day
              <select className={`${inputClass} mt-1.5`} value={editor.weekday} onChange={(e) => patch({ weekday: Number(e.target.value) })}>
                {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Period
              <select className={`${inputClass} mt-1.5`} value={editor.period_id} onChange={(e) => patch({ period_id: Number(e.target.value) })}>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.label} ({hhmm(p.start_time)})</option>)}
              </select>
            </label>
            {role === 'administrator' && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Teacher
                <select className={`${inputClass} mt-1.5`} value={editor.teacher_id} onChange={(e) => patch({ teacher_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || 'Unnamed teacher'}</option>)}
                </select>
              </label>
            )}
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Room
              <input
                className={`${inputClass} mt-1.5`}
                value={editor.room}
                onChange={(e) => patch({ room: e.target.value })}
                placeholder="e.g. Room 204"
              />
            </label>
            {formError && (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-400 sm:col-span-2">{formError}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

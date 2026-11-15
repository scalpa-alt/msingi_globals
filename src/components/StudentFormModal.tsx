import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass } from '@/lib/school';

export interface StudentValues {
  id: string;
  full_name: string;
  admission_no: string | null;
  class_id: string | null;
  gender: string | null;
  /** Leave undefined when the caller does not know the date, so editing never wipes it. */
  dob?: string | null;
  status?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  classes: { id: string; label: string }[];
  /** Set to edit an existing student; leave empty to add one. */
  student?: StudentValues | null;
  /** Class teachers can only use their own classes; administrators may also change the status. */
  isAdmin?: boolean;
  defaultClassId?: string;
}

const blank = { name: '', admission: '', classId: '', gender: '', dob: '', status: 'active' };

/** Add or edit a student. Shared by the class teacher's "My Class" tab and the administrator's Students page. */
export default function StudentFormModal({ open, onClose, onSaved, classes, student, isAdmin = false, defaultClassId }: Props) {
  const [v, setV] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const editing = !!student;

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setError(null);
    setV(
      student
        ? { name: student.full_name, admission: student.admission_no ?? '', classId: student.class_id ?? '', gender: student.gender ?? '', dob: student.dob ?? '', status: student.status ?? 'active' }
        : { ...blank, classId: defaultClassId ?? classes[0]?.id ?? '' },
    );
  }, [open, student, defaultClassId, classes]);

  const problems = {
    name: v.name.trim().length < 2 ? 'Enter the student’s full name.' : v.name.trim().length > 120 ? 'That name is too long.' : '',
    admission: !v.admission.trim() ? 'Enter an admission number.' : v.admission.trim().length > 30 ? 'That number is too long.' : '',
    classId: v.classId ? '' : 'Choose a class.',
    dob: v.dob && v.dob > new Date().toLocaleDateString('en-CA') ? 'Date of birth cannot be in the future.' : '',
  };
  const invalid = Object.values(problems).some(Boolean);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    setSaving(true);
    setError(null);
    const fields: Record<string, unknown> = {
      full_name: v.name.trim(),
      admission_no: v.admission.trim(),
      class_id: v.classId,
      gender: v.gender || null,
    };
    // only send the date when the caller knows it (or when adding)
    if (!editing || student?.dob !== undefined) fields.dob = v.dob || null;
    if (isAdmin && editing) fields.status = v.status;

    // No .select() after the insert: a row cannot be read back inside the statement that creates it.
    const { error: err } = editing
      ? await supabase.from('students').update(fields).eq('id', student!.id)
      : await supabase.from('students').insert(fields);
    setSaving(false);
    if (err) return setError(friendlyError(err, { duplicate: 'That admission number is already used by another student.' }));
    onSaved();
    onClose();
  }

  const fieldError = (k: keyof typeof problems) => (touched && problems[k] ? <p className="mt-1 text-xs text-rose-600">{problems[k]}</p> : null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit student' : 'Add student'}
      description={editing ? undefined : 'If a parent already registered this child, they are linked to the new record automatically.'}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
          <button type="submit" form="student-form" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add student'}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} noValidate className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Full name
          <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={120} autoComplete="off" className={`${inputClass} mt-1`} placeholder="Aisha Njeri" />
          {fieldError('name')}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Admission no.
            <input value={v.admission} onChange={(e) => setV({ ...v, admission: e.target.value })} maxLength={30} autoComplete="off" className={`${inputClass} mt-1`} placeholder="ADM-2417" />
            {fieldError('admission')}
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Class
            <select value={v.classId} onChange={(e) => setV({ ...v, classId: e.target.value })} className={`${inputClass} mt-1`}>
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {fieldError('classId')}
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Gender
            <select value={v.gender} onChange={(e) => setV({ ...v, gender: e.target.value })} className={`${inputClass} mt-1`}>
              <option value="">Not stated</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </label>
          {(!editing || student?.dob !== undefined) && (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Date of birth
              <input type="date" value={v.dob} onChange={(e) => setV({ ...v, dob: e.target.value })} className={`${inputClass} mt-1`} />
              {fieldError('dob')}
            </label>
          )}
        </div>
        {isAdmin && editing && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
            <select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })} className={`${inputClass} mt-1`}>
              <option value="active">Active</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="graduated">Graduated</option>
            </select>
          </label>
        )}
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      </form>
    </Modal>
  );
}

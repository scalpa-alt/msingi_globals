import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { GraduationCap, Plus, Search, UserPlus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass, useManagedClasses } from '@/lib/school';
import { shortDate } from '@/lib/format';
import { unwrap, useQuery } from '@/lib/useQuery';

interface Applicant {
  id: string; name: string; email: string | null; phone: string | null; grade: string; applied_on: string;
  status: 'Pending' | 'Accepted' | 'Rejected'; guardian_name: string | null; enrolled_student_id: string | null;
}

const cancelBtn = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300';
const primaryBtn = 'rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60';
const link = 'text-xs font-medium hover:underline';

export default function Admissions() {
  const { classes } = useManagedClasses();
  const list = useQuery(async () => unwrap<Applicant[]>((await supabase.from('applicants').select('id, name, email, phone, grade, applied_on, status, guardian_name, enrolled_student_id').order('applied_on', { ascending: false })) as never), []);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [enrolling, setEnrolling] = useState<Applicant | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (list.data ?? []).filter((a) => (!filter || a.status === filter) && (!n || a.name.toLowerCase().includes(n) || (a.email ?? '').toLowerCase().includes(n)));
  }, [list.data, q, filter]);

  async function setStatus(a: Applicant, status: Applicant['status']) {
    setError(null);
    const { error: e } = await supabase.from('applicants').update({ status }).eq('id', a.id);
    if (e) return setError(friendlyError(e));
    list.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        subtitle="Review applications and enrol accepted applicants as students in one step."
        actions={<button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> New application</button>}
      />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search applications" className={`${inputClass} pl-9`} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status" className={`${inputClass} sm:w-40`}>
          <option value="">All statuses</option><option>Pending</option><option>Accepted</option><option>Rejected</option>
        </select>
      </div>
      {(list.error || error) && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{list.error ?? error}</p>}

      {!list.loading && rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No applications" description="Add an application, or adjust the search and filter." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <th className="pb-3 font-semibold">Applicant</th><th className="pb-3 font-semibold">Grade</th><th className="pb-3 font-semibold">Applied</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 text-right font-semibold">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 dark:divide-slate-800 dark:text-slate-300">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3"><p className="font-medium text-slate-900 dark:text-white">{a.name}</p><p className="text-xs text-slate-400">{a.email ?? a.guardian_name ?? a.id}</p></td>
                  <td className="py-3">{a.grade}</td>
                  <td className="py-3">{shortDate(a.applied_on)}</td>
                  <td className="py-3"><Badge variant={a.enrolled_student_id ? 'sky' : a.status === 'Accepted' ? 'teal' : a.status === 'Rejected' ? 'rose' : 'amber'}>{a.enrolled_student_id ? 'Enrolled' : a.status}</Badge></td>
                  <td className="space-x-3 py-3 text-right">
                    {a.enrolled_student_id ? (
                      <span className="text-xs text-slate-400">Student record created</span>
                    ) : (
                      <>
                        {a.status !== 'Rejected' && <button onClick={() => setEnrolling(a)} className={`${link} inline-flex items-center gap-1 text-teal-600`}><UserPlus className="h-3.5 w-3.5" /> Enrol</button>}
                        {a.status === 'Pending' && <button onClick={() => setStatus(a, 'Accepted')} className={`${link} text-emerald-600`}>Accept</button>}
                        {a.status !== 'Pending' && <button onClick={() => setStatus(a, 'Pending')} className={`${link} text-slate-500`}>Reopen</button>}
                        {a.status !== 'Rejected' && <button onClick={() => setStatus(a, 'Rejected')} className={`${link} text-rose-600`}>Reject</button>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewApplication open={adding} onClose={() => setAdding(false)} onSaved={list.reload} />
      <EnrolForm applicant={enrolling} classes={classes} onClose={() => setEnrolling(null)} onDone={list.reload} />
    </div>
  );
}

function NewApplication({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const blank = { name: '', grade: '', email: '', phone: '', guardian: '', dob: '', gender: '' };
  const [v, setV] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setV(blank); setErr(null); } }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (v.name.trim().length < 2) return setErr('Enter the applicant’s full name.');
    if (!v.grade.trim()) return setErr('Enter the grade applied for, for example Grade 9.');
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) return setErr('That email address does not look right.');
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from('applicants').insert({
      name: v.name.trim(), grade: v.grade.trim(), email: v.email.trim() || null, phone: v.phone.trim() || null,
      guardian_name: v.guardian.trim() || null, dob: v.dob || null, gender: v.gender || null,
    });
    setSaving(false);
    if (error) return setErr(friendlyError(error));
    onSaved();
    onClose();
  }

  const field = 'block text-sm font-medium text-slate-700 dark:text-slate-300';
  return (
    <Modal open={open} onClose={onClose} title="New application" footer={<><button type="button" onClick={onClose} className={cancelBtn}>Cancel</button><button type="submit" form="app-form" disabled={saving} className={primaryBtn}>{saving ? 'Saving…' : 'Save application'}</button></>}>
      <form id="app-form" onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
        <label className={`${field} sm:col-span-2`}>Full name<input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <label className={field}>Grade applied<input value={v.grade} onChange={(e) => setV({ ...v, grade: e.target.value })} placeholder="Grade 9" className={`${inputClass} mt-1`} /></label>
        <label className={field}>Gender<select value={v.gender} onChange={(e) => setV({ ...v, gender: e.target.value })} className={`${inputClass} mt-1`}><option value="">—</option><option>Female</option><option>Male</option><option>Other</option></select></label>
        <label className={field}>Date of birth<input type="date" value={v.dob} onChange={(e) => setV({ ...v, dob: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <label className={field}>Guardian<input value={v.guardian} onChange={(e) => setV({ ...v, guardian: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <label className={field}>Email<input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <label className={field}>Phone<input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} className={`${inputClass} mt-1`} /></label>
        {err && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">{err}</p>}
      </form>
    </Modal>
  );
}

function EnrolForm({ applicant, classes, onClose, onDone }: { applicant: Applicant | null; classes: { id: string; label: string; grade_level: number }[]; onClose: () => void; onDone: () => void }) {
  const [classId, setClassId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState('');
  if ((applicant?.id ?? '') !== key) {
    setKey(applicant?.id ?? '');
    if (applicant) {
      const g = Number((applicant.grade.match(/\d+/) ?? [])[0]);
      setClassId(classes.find((c) => c.grade_level === g)?.id ?? '');
      setErr(null);
    }
  }

  async function enrol() {
    if (!applicant) return;
    if (!classId) return setErr('Choose a class.');
    setSaving(true);
    setErr(null);
    const { error } = await supabase.rpc('enroll_applicant', { p_applicant: applicant.id, p_class: classId });
    setSaving(false);
    if (error) return setErr(friendlyError(error, { duplicate: 'This applicant is already enrolled.' }));
    onDone();
    onClose();
  }

  return (
    <Modal open={!!applicant} onClose={onClose} title={`Enrol ${applicant?.name ?? ''}`} description="Creates the student record, marks the application accepted and links any parent who registered this child." footer={<><button onClick={onClose} className={cancelBtn}>Cancel</button><button onClick={enrol} disabled={saving} className={primaryBtn}>{saving ? 'Enrolling…' : 'Enrol student'}</button></>}>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Class
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${inputClass} mt-1`}>
          <option value="">Select class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      {err && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
    </Modal>
  );
}

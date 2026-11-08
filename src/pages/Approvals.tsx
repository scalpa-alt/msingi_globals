import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, Inbox, Mail, Phone, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { APPROVALS_CHANGED } from '@/lib/useApprovalCount';
import { friendlyError, inputClass } from '@/lib/school';

interface PendingTeacher {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  teachers: { subjects_taught: string[]; is_class_teacher: boolean; requested_class_label: string | null } | null;
}

interface ClassOption {
  id: string;
  label: string;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const changed = () => window.dispatchEvent(new Event(APPROVALS_CHANGED));

export default function Approvals() {
  const [teachers, setTeachers] = useState<PendingTeacher[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approving, setApproving] = useState<PendingTeacher | null>(null);
  const [extraClasses, setExtraClasses] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    const [t, c] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at, teachers!profile_id(subjects_taught, is_class_teacher, requested_class_label)')
        .eq('role', 'teacher')
        .eq('status', 'pending')
        .order('created_at'),
      supabase.from('classes').select('id, label').order('grade_level').order('label'),
    ]);
    const firstError = t.error ?? c.error;
    setError(firstError ? friendlyError(firstError) : null);
    setTeachers((t.data ?? []) as unknown as PendingTeacher[]);
    setClasses((c.data ?? []) as ClassOption[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const requestedClassId = (label: string | null | undefined) =>
    label ? classes.find((c) => norm(c.label) === norm(label))?.id : undefined;

  async function run(id: string, action: PromiseLike<{ error: { code?: string; message: string } | null }>) {
    setBusyId(id);
    setError(null);
    const { error: e } = await action;
    setBusyId(null);
    if (e) {
      setError(friendlyError(e));
      return false;
    }
    await load();
    changed();
    return true;
  }

  async function confirmApproveTeacher() {
    if (!approving) return;
    const ids = new Set(extraClasses);
    const requested = approving.teachers?.is_class_teacher ? requestedClassId(approving.teachers.requested_class_label) : undefined;
    if (requested) ids.delete(requested); // the database assigns the requested class itself
    const ok = await run(approving.id, supabase.rpc('approve_teacher', { p_teacher: approving.id, p_class_ids: [...ids] }));
    if (ok) setApproving(null);
  }

  async function confirmReject() {
    if (!rejecting) return;
    const ok = await run(rejecting.id, supabase.rpc('reject_teacher', { p_teacher: rejecting.id, p_reason: reason.trim() || null }));
    if (ok) {
      setRejecting(null);
      setReason('');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pending approvals" subtitle="Confirm new teachers before they can use the system. Parents register themselves and do not need approval." />

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) :
        teachers.length === 0 ? (
          <EmptyState icon={Inbox} title="No teachers waiting" description="New teacher registrations will appear here for your approval." />
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {teachers.map((t) => (
              <li key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{t.full_name}</p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" /> {t.email}</p>
                    {t.phone && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500"><Phone className="h-3.5 w-3.5 shrink-0" /> {t.phone}</p>}
                  </div>
                  <Badge variant="amber" dot>Pending</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(t.teachers?.subjects_taught ?? []).map((s) => <Badge key={s} variant="teal">{s}</Badge>)}
                  {(t.teachers?.subjects_taught ?? []).length === 0 && <span className="text-xs text-slate-400">No subjects listed</span>}
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {t.teachers?.is_class_teacher
                    ? <>Class teacher for <strong>{t.teachers.requested_class_label ?? 'an unspecified class'}</strong></>
                    : 'Subject teacher'}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><Clock className="h-3 w-3" /> Registered {fmtDate(t.created_at)}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    disabled={busyId === t.id}
                    onClick={() => { setApproving(t); setExtraClasses([]); }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    disabled={busyId === t.id}
                    onClick={() => setRejecting({ id: t.id, name: t.full_name })}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-60 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

      {/* Approve teacher */}
      <Modal
        open={!!approving}
        onClose={() => setApproving(null)}
        title={`Approve ${approving?.full_name ?? ''}`}
        description="The teacher gets access immediately. You can also give them classes now, or later from the timetable."
        footer={
          <>
            <button onClick={() => setApproving(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button onClick={confirmApproveTeacher} disabled={busyId === approving?.id} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {busyId === approving?.id ? 'Approving…' : 'Approve teacher'}
            </button>
          </>
        }
      >
        {approving?.teachers?.is_class_teacher && (
          <p className="mb-4 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
            {requestedClassId(approving.teachers.requested_class_label)
              ? <>Will be made class teacher of <strong>{approving.teachers.requested_class_label}</strong>.</>
              : <>Requested class “{approving.teachers.requested_class_label}” does not exist yet. It will be created.</>}
          </p>
        )}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Also assign classes (optional)</legend>
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {classes.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={extraClasses.includes(c.id)}
                  onChange={(e) => setExtraClasses((l) => (e.target.checked ? [...l, c.id] : l.filter((x) => x !== c.id)))}
                  className="h-4 w-4 accent-teal-600"
                />
                {c.label}
              </label>
            ))}
            {classes.length === 0 && <p className="col-span-full text-sm text-slate-400">No classes created yet.</p>}
          </div>
        </fieldset>
      </Modal>

      {/* Reject */}
      <Modal
        open={!!rejecting}
        onClose={() => { setRejecting(null); setReason(''); }}
        title={`Reject ${rejecting?.name ?? ''}?`}
        description="They will see that their registration was not approved."
        footer={
          <>
            <button onClick={() => { setRejecting(null); setReason(''); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button onClick={confirmReject} disabled={busyId === rejecting?.id} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
              {busyId === rejecting?.id ? 'Rejecting…' : 'Reject'}
            </button>
          </>
        }
      >
        {rejecting && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Reason (optional)
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} className={`${inputClass} mt-1`} />
          </label>
        )}
      </Modal>
    </div>
  );
}

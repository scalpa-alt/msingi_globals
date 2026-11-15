import { useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, School, Search, Trash2, UserMinus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import StudentFormModal from '@/components/StudentFormModal';
import type { StudentValues } from '@/components/StudentFormModal';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass, useManagedClasses } from '@/lib/school';
import { unwrap, useQuery } from '@/lib/useQuery';

interface Row extends StudentValues {
  classes: { label: string } | null;
}

const statusVariant = { active: 'emerald', withdrawn: 'slate', graduated: 'sky' } as const;
const iconBtn = 'rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-slate-800';

/** Administrator: every student in the school. Add, edit, move between classes, withdraw, restore or delete. */
export default function Students() {
  const { classes } = useManagedClasses();
  const list = useQuery(
    async () =>
      unwrap<Row[]>(
        (await supabase.from('students').select('id, full_name, admission_no, class_id, gender, dob, status, classes(label)').order('full_name').limit(2000)) as never,
      ),
    [],
  );

  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [form, setForm] = useState<{ open: boolean; student: Row | null }>({ open: false, student: null });
  const [removing, setRemoving] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (list.data ?? []).filter(
      (s) =>
        (!statusFilter || s.status === statusFilter) &&
        (!classFilter || s.class_id === classFilter) &&
        (!needle || s.full_name.toLowerCase().includes(needle) || (s.admission_no ?? '').toLowerCase().includes(needle)),
    );
  }, [list.data, q, classFilter, statusFilter]);

  async function setStatus(s: Row, status: 'active' | 'withdrawn') {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from('students').update({ status }).eq('id', s.id);
    setBusy(false);
    if (e) return setError(friendlyError(e));
    setRemoving(null);
    list.reload();
  }

  async function deleteForever(s: Row) {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from('students').delete().eq('id', s.id);
    setBusy(false);
    if (e) return setError(friendlyError(e));
    setDeleting(null);
    setConfirmText('');
    list.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="Every student in the school. Teachers manage their own class lists; you can manage all of them."
        actions={
          <button onClick={() => setForm({ open: true, student: null })} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40">
            <Plus className="h-4 w-4" /> Add student
          </button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or admission number" aria-label="Search students" className={`${inputClass} pl-9`} />
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Filter by class" className={`${inputClass} lg:w-44`}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className={`${inputClass} lg:w-40`}>
          <option value="active">Active</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="graduated">Graduated</option>
          <option value="">All</option>
        </select>
      </div>

      {(list.error || error) && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{list.error ?? error}</p>}
      <p className="text-sm text-slate-500" aria-live="polite">{list.loading ? 'Loading…' : `${rows.length} of ${(list.data ?? []).length} students`}</p>

      {!list.loading && rows.length === 0 ? (
        <EmptyState icon={School} title={(list.data ?? []).length === 0 ? 'No students yet' : 'No matches'} description={(list.data ?? []).length === 0 ? 'Add the first student, or accept an application in Admissions.' : 'Try a different search or filter.'} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="hidden px-4 py-3 sm:table-cell">Admission no.</th>
                <th className="px-4 py-3">Class</th>
                <th className="hidden px-4 py-3 md:table-cell">Status</th>
                <th className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.full_name}</td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{s.admission_no ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.classes?.label ?? '—'}</td>
                  <td className="hidden px-4 py-3 md:table-cell"><Badge variant={statusVariant[s.status as keyof typeof statusVariant] ?? 'slate'} dot>{s.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setForm({ open: true, student: s })} aria-label={`Edit ${s.full_name}`} className={iconBtn}><Pencil className="h-4 w-4" /></button>
                      {s.status === 'active' ? (
                        <button onClick={() => setRemoving(s)} aria-label={`Remove ${s.full_name} from the class list`} className={iconBtn}><UserMinus className="h-4 w-4" /></button>
                      ) : (
                        <button onClick={() => setStatus(s, 'active')} aria-label={`Restore ${s.full_name}`} className={iconBtn}><RotateCcw className="h-4 w-4" /></button>
                      )}
                      <button onClick={() => { setDeleting(s); setConfirmText(''); setError(null); }} aria-label={`Delete ${s.full_name} permanently`} className={`${iconBtn} hover:!bg-rose-50 hover:!text-rose-600`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentFormModal open={form.open} onClose={() => setForm({ open: false, student: null })} onSaved={list.reload} classes={classes} student={form.student} isAdmin />

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.full_name ?? ''} from the class list?`}
        description="They are marked withdrawn and disappear from class lists, attendance and the gradebook. Their past marks and records are kept, and you can restore them any time."
        footer={
          <>
            <button onClick={() => setRemoving(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button onClick={() => removing && setStatus(removing, 'withdrawn')} disabled={busy} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{busy ? 'Removing…' : 'Remove from class'}</button>
          </>
        }
      >
        <span />
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.full_name ?? ''} permanently?`}
        description="This erases the student and everything attached to them: grades, attendance, fee invoices and payments, library loans, and the link to their parents. It cannot be undone. Use “Remove from class” if you only want them off the list."
        footer={
          <>
            <button onClick={() => setDeleting(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button onClick={() => deleting && deleteForever(deleting)} disabled={busy || confirmText.trim().toLowerCase() !== 'delete'} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{busy ? 'Deleting…' : 'Delete forever'}</button>
          </>
        }
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Type <strong>delete</strong> to confirm
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" className={`${inputClass} mt-1`} />
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
      </Modal>
    </div>
  );
}

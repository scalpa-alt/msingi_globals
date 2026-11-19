import { useState } from 'react';
import type { FormEvent } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { friendlyError, inputClass } from '@/lib/school';
import { timeAgo } from '@/lib/format';
import { unwrap, useQuery } from '@/lib/useQuery';

interface Notice { id: string; title: string; detail: string; audience: string; author_name: string | null; created_by: string | null; created_at: string }

const audienceLabel: Record<string, string> = { all: 'Everyone', teachers: 'Teachers', students: 'Students', parents: 'Parents' };
const cancelBtn = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300';

/** Everyone reads the notices meant for them. Teachers and administrators post; you can delete your own, the administrator any. */
export default function Notices() {
  const { user } = useAuth();
  const isStaff = user?.role === 'administrator' || user?.role === 'teacher';
  const list = useQuery(async () => unwrap<Notice[]>((await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(200)) as never), []);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(n: Notice) {
    if (!window.confirm(`Delete the notice “${n.title}”?`)) return;
    setError(null);
    const { error: e } = await supabase.from('notices').delete().eq('id', n.id);
    if (e) return setError(friendlyError(e));
    list.reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices"
        subtitle={isStaff ? 'Post announcements for teachers, students, parents or everyone.' : 'Announcements from your school.'}
        actions={isStaff ? <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-teal-700"><Plus className="h-4 w-4" /> New notice</button> : undefined}
      />
      {(list.error || error) && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{list.error ?? error}</p>}
      {!list.loading && (list.data ?? []).length === 0 ? (
        <EmptyState icon={Megaphone} title="No notices yet" description={isStaff ? 'Post the first announcement.' : 'Announcements from the school will appear here.'} />
      ) : (
        <ul className="space-y-3">
          {(list.data ?? []).map((n) => (
            <li key={n.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 dark:text-white">{n.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{n.author_name ?? 'School'} · {timeAgo(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isStaff && <Badge variant="slate">{audienceLabel[n.audience] ?? n.audience}</Badge>}
                  {(user?.role === 'administrator' || n.created_by === user?.id) && isStaff && (
                    <button onClick={() => remove(n)} aria-label={`Delete notice ${n.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{n.detail}</p>
            </li>
          ))}
        </ul>
      )}
      <NoticeForm open={open} onClose={() => setOpen(false)} onSaved={list.reload} authorName={user?.name ?? null} />
    </div>
  );
}

function NoticeForm({ open, onClose, onSaved, authorName }: { open: boolean; onClose: () => void; onSaved: () => void; authorName: string | null }) {
  const [v, setV] = useState({ title: '', detail: '', audience: 'all' });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setV({ title: '', detail: '', audience: 'all' }); setErr(null); } }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (v.title.trim().length < 3) return setErr('Give the notice a title.');
    if (v.detail.trim().length < 3) return setErr('Write the message.');
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from('notices').insert({ title: v.title.trim(), detail: v.detail.trim(), audience: v.audience, author_name: authorName });
    setSaving(false);
    if (error) return setErr(friendlyError(error));
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New notice" footer={<><button type="button" onClick={onClose} className={cancelBtn}>Cancel</button><button type="submit" form="notice-form" disabled={saving} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Posting…' : 'Post notice'}</button></>}>
      <form id="notice-form" onSubmit={submit} noValidate className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title<input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={120} className={`${inputClass} mt-1`} /></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">For
          <select value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value })} className={`${inputClass} mt-1`}>
            {Object.entries(audienceLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message<textarea value={v.detail} onChange={(e) => setV({ ...v, detail: e.target.value })} rows={5} maxLength={2000} className={`${inputClass} mt-1`} /></label>
        {err && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      </form>
    </Modal>
  );
}

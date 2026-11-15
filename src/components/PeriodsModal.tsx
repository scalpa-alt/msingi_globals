import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass } from '@/lib/school';

export interface PeriodRow { id: number; label: string; start_time: string; end_time: string }

const hhmm = (t: string) => t.slice(0, 5);

/** Administrator: edit the school's bell schedule. A period still used by a lesson cannot be deleted. */
export default function PeriodsModal({ open, onClose, periods, onChanged }: { open: boolean; onClose: () => void; periods: PeriodRow[]; onChanged: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ label: '', start: '', end: '' });

  const nextId = Array.from({ length: 20 }, (_, i) => i + 1).find((n) => !periods.some((p) => p.id === n));

  async function run(op: PromiseLike<{ error: { code?: string; message: string } | null }>) {
    setBusy(true);
    setErr(null);
    const { error } = await op;
    setBusy(false);
    if (error) return setErr(friendlyError(error as never, { inUse: 'Lessons still use this period. Move or delete them in the timetable first.', duplicate: 'That period already exists.' }));
    onChanged();
  }

  async function save(p: PeriodRow, patch: Partial<PeriodRow>) {
    const next = { ...p, ...patch };
    if (!next.label.trim()) return setErr('A period needs a name.');
    if (hhmm(next.end_time) <= hhmm(next.start_time)) return setErr('A period must end after it starts.');
    await run(supabase.from('periods').update({ label: next.label.trim(), start_time: next.start_time, end_time: next.end_time }).eq('id', p.id));
  }

  async function add() {
    if (nextId === undefined) return setErr('A school can have at most 20 periods.');
    if (!draft.label.trim() || !draft.start || !draft.end) return setErr('Enter a name, start time and end time.');
    if (draft.end <= draft.start) return setErr('A period must end after it starts.');
    await run(supabase.from('periods').insert({ id: nextId, label: draft.label.trim(), start_time: draft.start, end_time: draft.end }));
    setDraft({ label: '', start: '', end: '' });
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Bell schedule" description="Edit the periods that make up the school day. Changes apply to every class." footer={<button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Done</button>}>
      <ul className="space-y-2">
        {periods.map((p) => (
          <li key={`${p.id}-${p.label}-${p.start_time}-${p.end_time}`} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
            <input defaultValue={p.label} onBlur={(e) => e.target.value !== p.label && save(p, { label: e.target.value })} aria-label={`Name of period ${p.id}`} className={inputClass} />
            <input type="time" defaultValue={hhmm(p.start_time)} onBlur={(e) => e.target.value && e.target.value !== hhmm(p.start_time) && save(p, { start_time: e.target.value })} aria-label={`${p.label} start`} className={`${inputClass} w-28`} />
            <input type="time" defaultValue={hhmm(p.end_time)} onBlur={(e) => e.target.value && e.target.value !== hhmm(p.end_time) && save(p, { end_time: e.target.value })} aria-label={`${p.label} end`} className={`${inputClass} w-28`} />
            <button disabled={busy} onClick={() => run(supabase.from('periods').delete().eq('id', p.id))} aria-label={`Delete ${p.label}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="New period name" aria-label="New period name" className={inputClass} />
        <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} aria-label="New period start" className={`${inputClass} w-28`} />
        <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} aria-label="New period end" className={`${inputClass} w-28`} />
        <button disabled={busy} onClick={add} aria-label="Add period" className="rounded-lg bg-teal-600 p-2 text-white hover:bg-teal-700 disabled:opacity-60"><Plus className="h-4 w-4" /></button>
      </div>
      {err && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
    </Modal>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { friendlyError, inputClass } from '@/lib/school';
import { money, shortDate, todayISO } from '@/lib/format';
import { unwrap, useQuery } from '@/lib/useQuery';

interface Invoice { id: string; student_id: string; student: string | null; grade: string | null; amount: number; paid: number; balance: number; due: string; status: string }
interface Payment { id: string; amount: number; method: string | null; paid_on: string }
interface Pupil { id: string; full_name: string; classes: { label: string } | null }

const iconBtn = 'rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-slate-800';
const cancelBtn = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300';
const primaryBtn = 'rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60';

/** Everyone entitled to see fees reads them; only the administrator creates, edits or deletes invoices and payments. */
export default function Fees() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'administrator';

  const fees = useQuery(async () => unwrap<Invoice[]>((await supabase.from('fee_invoices_view').select('*').order('due', { ascending: true })) as never), []);
  const pupils = useQuery(
    async () => (isAdmin ? unwrap<Pupil[]>((await supabase.from('students').select('id, full_name, classes(label)').eq('status', 'active').order('full_name').limit(2000)) as never) : []),
    [isAdmin],
  );

  const [invoiceForm, setInvoiceForm] = useState<{ open: boolean; invoice: Invoice | null }>({ open: false, invoice: null });
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteInvoice(i: Invoice) {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from('fee_invoices').delete().eq('id', i.id);
    setBusy(false);
    if (e) return setError(friendlyError(e));
    setDeleting(null);
    fees.reload();
  }

  const rows = fees.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Invoicing"
        subtitle={isAdmin ? 'Create invoices, record payments and correct any fee record.' : 'Track account balances, payment status and due dates.'}
        actions={isAdmin ? (
          <button onClick={() => setInvoiceForm({ open: true, invoice: null })} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700">
            <Plus className="h-4 w-4" /> New invoice
          </button>
        ) : undefined}
      />

      {fees.error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{fees.error}</p>}

      {!fees.loading && rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No fee records" description={isAdmin ? 'Create the first invoice for a student.' : 'No fee records to show.'} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <th className="pb-3 font-semibold">Student</th>
                <th className="pb-3 font-semibold">Class</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Paid</th>
                <th className="pb-3 font-semibold">Balance</th>
                <th className="pb-3 font-semibold">Due</th>
                <th className="pb-3 font-semibold">Status</th>
                {isAdmin && <th className="pb-3"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 dark:divide-slate-800 dark:text-slate-300">
              {rows.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 font-medium text-slate-900 dark:text-white">{f.student || 'Unknown'}</td>
                  <td className="py-3">{f.grade ?? '-'}</td>
                  <td className="py-3">{money(Number(f.amount))}</td>
                  <td className="py-3">{money(Number(f.paid))}</td>
                  <td className="py-3">{money(Number(f.balance))}</td>
                  <td className="py-3">{shortDate(f.due)}</td>
                  <td className="py-3"><Badge variant={f.status === 'Paid' ? 'teal' : f.status === 'Pending' ? 'amber' : 'rose'}>{f.status}</Badge></td>
                  {isAdmin && (
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setPaying(f)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Payments</button>
                        <button onClick={() => setInvoiceForm({ open: true, invoice: f })} aria-label={`Edit invoice for ${f.student}`} className={iconBtn}><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => { setError(null); setDeleting(f); }} aria-label={`Delete invoice for ${f.student}`} className={`${iconBtn} hover:!bg-rose-50 hover:!text-rose-600`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <>
          <InvoiceForm open={invoiceForm.open} invoice={invoiceForm.invoice} pupils={pupils.data ?? []} onClose={() => setInvoiceForm({ open: false, invoice: null })} onSaved={fees.reload} />
          <PaymentsModal invoice={paying} onClose={() => setPaying(null)} onChanged={fees.reload} />
          <Modal
            open={!!deleting}
            onClose={() => setDeleting(null)}
            title={`Delete the invoice for ${deleting?.student ?? ''}?`}
            description="The invoice and every payment recorded against it are erased. This cannot be undone."
            footer={<><button onClick={() => setDeleting(null)} className={cancelBtn}>Cancel</button><button onClick={() => deleting && deleteInvoice(deleting)} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busy ? 'Deleting…' : 'Delete invoice'}</button></>}
          >
            {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : <span />}
          </Modal>
        </>
      )}
    </div>
  );
}

function InvoiceForm({ open, invoice, pupils, onClose, onSaved }: { open: boolean; invoice: Invoice | null; pupils: Pupil[]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ studentId: '', amount: '', due: '' });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastKey, setLastKey] = useState('');
  const key = open ? (invoice?.id ?? 'new') : '';
  if (key !== lastKey) {
    setLastKey(key);
    if (open) { setV(invoice ? { studentId: invoice.student_id, amount: String(invoice.amount), due: invoice.due } : { studentId: '', amount: '', due: todayISO() }); setErr(null); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(v.amount);
    if (!invoice && !v.studentId) return setErr('Choose a student.');
    if (!(amount > 0) || amount > 1e9) return setErr('Enter an amount greater than zero.');
    if (!v.due) return setErr('Choose a due date.');
    if (invoice && amount < Number(invoice.paid)) return setErr(`${money(Number(invoice.paid))} has already been paid, so the amount cannot be lower than that.`);
    setSaving(true);
    setErr(null);
    const { error } = invoice
      ? await supabase.from('fee_invoices').update({ amount, due_date: v.due }).eq('id', invoice.id)
      : await supabase.from('fee_invoices').insert({ student_id: v.studentId, amount, due_date: v.due });
    setSaving(false);
    if (error) return setErr(friendlyError(error));
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={invoice ? `Edit invoice for ${invoice.student ?? ''}` : 'New invoice'} footer={<><button type="button" onClick={onClose} className={cancelBtn}>Cancel</button><button type="submit" form="invoice-form" disabled={saving} className={primaryBtn}>{saving ? 'Saving…' : invoice ? 'Save changes' : 'Create invoice'}</button></>}>
      <form id="invoice-form" onSubmit={submit} noValidate className="space-y-3">
        {!invoice && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Student
            <select value={v.studentId} onChange={(e) => setV({ ...v, studentId: e.target.value })} className={`${inputClass} mt-1`}>
              <option value="">Select student</option>
              {pupils.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.classes ? ` (${p.classes.label})` : ''}</option>)}
            </select>
          </label>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Amount ($)<input type="number" min={0} step="0.01" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} className={`${inputClass} mt-1`} /></label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date<input type="date" value={v.due} onChange={(e) => setV({ ...v, due: e.target.value })} className={`${inputClass} mt-1`} /></label>
        </div>
        {err && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      </form>
    </Modal>
  );
}

function PaymentsModal({ invoice, onClose, onChanged }: { invoice: Invoice | null; onClose: () => void; onChanged: () => void }) {
  const list = useQuery(
    async () => (invoice ? unwrap<Payment[]>((await supabase.from('fee_payments').select('id, amount, method, paid_on').eq('invoice_id', invoice.id).order('paid_on')) as never) : []),
    [invoice?.id],
  );
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(todayISO());
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    const n = Number(amount);
    if (!(n > 0)) return setErr('Enter an amount greater than zero.');
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from('fee_payments').insert({ invoice_id: invoice.id, amount: n, method, paid_on: date, recorded_by: (await supabase.auth.getUser()).data.user?.id });
    setSaving(false);
    if (error) return setErr(friendlyError(error));
    setAmount('');
    list.reload();
    onChanged();
  }

  async function remove(p: Payment) {
    setErr(null);
    const { error } = await supabase.from('fee_payments').delete().eq('id', p.id);
    if (error) return setErr(friendlyError(error));
    list.reload();
    onChanged();
  }

  return (
    <Modal open={!!invoice} onClose={onClose} size="lg" title={`Payments — ${invoice?.student ?? ''}`} description={invoice ? `Invoice ${invoice.id} · ${money(Number(invoice.amount))} · due ${shortDate(invoice.due)}` : undefined} footer={<button onClick={onClose} className={cancelBtn}>Close</button>}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {(list.data ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-700 dark:text-slate-200">{money(Number(p.amount))} · {p.method ?? 'Cash'} · {shortDate(p.paid_on)}</span>
            <button onClick={() => remove(p)} aria-label={`Delete payment of ${money(Number(p.amount))}`} className={`${iconBtn} hover:!bg-rose-50 hover:!text-rose-600`}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {!list.loading && (list.data ?? []).length === 0 && <li className="py-2 text-sm text-slate-400">No payments recorded yet.</li>}
      </ul>
      <form onSubmit={add} noValidate className="mt-4 grid gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-4">
        <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" aria-label="Payment amount" className={inputClass} />
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method" className={inputClass}>
          {['Cash', 'Bank transfer', 'Mobile money', 'Card', 'Cheque'].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} aria-label="Date paid" className={inputClass} />
        <button type="submit" disabled={saving} className={primaryBtn}>{saving ? 'Saving…' : 'Record payment'}</button>
      </form>
      {err && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
    </Modal>
  );
}

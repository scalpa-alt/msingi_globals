import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { inputClass } from '@/lib/school';
import { unwrap, useQuery } from '@/lib/useQuery';

interface Entry { id: string; actor_name: string; table_name: string; op: 'INSERT' | 'UPDATE' | 'DELETE'; row_id: string | null; details: Record<string, unknown>; created_at: string }

const tableLabel: Record<string, string> = {
  students: 'Students', fee_invoices: 'Fee invoices', fee_payments: 'Fee payments', books: 'Books', book_loans: 'Book loans',
  teacher_classes: 'Teacher assignments', periods: 'Bell schedule', applicants: 'Applications', notices: 'Notices', grades: 'Grades', attendance: 'Attendance',
};
const opVariant = { INSERT: 'teal', UPDATE: 'amber', DELETE: 'rose' } as const;
const opText = { INSERT: 'Added', UPDATE: 'Changed', DELETE: 'Deleted' } as const;

/** What a row looked like, in a few words, so an entry reads without opening it. */
function summary(e: Entry): string {
  const d = e.details as Record<string, any>;
  if (e.op === 'UPDATE') return Object.entries(d).filter(([k]) => k !== 'updated_at').map(([k, v]) => `${k}: ${fmt(v?.from)} → ${fmt(v?.to)}`).join(' · ');
  return String(d.full_name ?? d.name ?? d.title ?? d.label ?? (d.amount != null ? `amount ${d.amount}` : '') ?? e.row_id ?? '') || (e.row_id ?? '');
}
const fmt = (v: unknown) => (v == null || v === '' ? '—' : String(v));

export default function Audit() {
  const [table, setTable] = useState('');
  const [op, setOp] = useState('');
  const list = useQuery(async () => unwrap<Entry[]>((await supabase.from('audit_log').select('id, actor_name, table_name, op, row_id, details, created_at').order('created_at', { ascending: false }).limit(500)) as never), []);
  const rows = useMemo(() => (list.data ?? []).filter((e) => (!table || e.table_name === table) && (!op || e.op === op)), [list.data, table, op]);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit trail" subtitle="Who added, changed or deleted important records. Entries cannot be edited or removed." />
      <div className="flex flex-col gap-3 sm:flex-row">
        <select value={table} onChange={(e) => setTable(e.target.value)} aria-label="Filter by record type" className={`${inputClass} sm:w-56`}>
          <option value="">All record types</option>
          {Object.entries(tableLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={op} onChange={(e) => setOp(e.target.value)} aria-label="Filter by action" className={`${inputClass} sm:w-40`}>
          <option value="">All actions</option><option value="INSERT">Added</option><option value="UPDATE">Changed</option><option value="DELETE">Deleted</option>
        </select>
      </div>
      {list.error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{list.error}</p>}
      {!list.loading && rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nothing recorded" description="Changes to students, fees, library, assignments and more appear here from now on." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <th className="pb-3 font-semibold">When</th><th className="pb-3 font-semibold">Who</th><th className="pb-3 font-semibold">Action</th><th className="pb-3 font-semibold">Record</th><th className="pb-3 font-semibold">Detail</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 align-top text-slate-600 dark:divide-slate-800 dark:text-slate-300">
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap py-3">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="py-3">{e.actor_name}</td>
                  <td className="py-3"><Badge variant={opVariant[e.op]}>{opText[e.op]}</Badge></td>
                  <td className="py-3">{tableLabel[e.table_name] ?? e.table_name}</td>
                  <td className="max-w-md break-words py-3 text-xs">{summary(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

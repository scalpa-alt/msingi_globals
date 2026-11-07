import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';

export default function Fees() {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFees();
  }, []);

  async function fetchFees() {
    setLoading(true);
    const { data, error } = await supabase
      .from('fee_invoices_view')
      .select('*')
      .order('due', { ascending: true });
    if (!error && data) setFees(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fees & Invoicing" subtitle="Track student account balances, payment status, and due dates." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading fee records...</p>
        ) : fees.length === 0 ? (
          <p className="text-sm text-slate-500">No fee records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="pb-3 font-semibold">Student</th>
                  <th className="pb-3 font-semibold">Class</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Paid</th>
                  <th className="pb-3 font-semibold">Balance</th>
                  <th className="pb-3 font-semibold">Due Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{fee.student || 'Unknown'}</td>
                    <td className="py-3">{fee.grade ?? '-'}</td>
                    <td className="py-3">${Number(fee.amount).toLocaleString()}</td>
                    <td className="py-3">${Number(fee.paid).toLocaleString()}</td>
                    <td className="py-3">${Number(fee.balance).toLocaleString()}</td>
                    <td className="py-3">{fee.due}</td>
                    <td className="py-3">
                      <Badge variant={fee.status === 'Paid' ? 'teal' : fee.status === 'Pending' ? 'amber' : 'rose'}>
                        {fee.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
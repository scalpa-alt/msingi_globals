import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';

export default function Admissions() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplicants();
  }, []);

  async function fetchApplicants() {
    setLoading(true);
    const { data, error } = await supabase.from('applicants').select('*').order('submitted_at', { ascending: false });
    if (!error && data) setApplicants(data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('applicants').update({ status }).eq('id', id);
    if (!error) {
      setApplicants(applicants.map(app => app.id === id ? { ...app, status } : app));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admissions" subtitle="Manage incoming student applications and enrollment statuses." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 overflow-hidden p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading applicants...</p>
        ) : applicants.length === 0 ? (
          <p className="text-sm text-slate-500">No applications found in the database.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Grade Applied</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {applicants.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{app.first_name} {app.last_name}</td>
                    <td className="py-3">{app.email}</td>
                    <td className="py-3">{app.grade_applied}</td>
                    <td className="py-3">
                      <Badge variant={app.status === 'enrolled' || app.status === 'approved' ? 'teal' : app.status === 'rejected' ? 'rose' : 'amber'}>
                        {app.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button onClick={() => updateStatus(app.id, 'approved')} className="text-teal-600 hover:underline font-medium text-xs">Approve</button>
                      <button onClick={() => updateStatus(app.id, 'enrolled')} className="text-blue-600 hover:underline font-medium text-xs">Enroll</button>
                      <button onClick={() => updateStatus(app.id, 'rejected')} className="text-rose-600 hover:underline font-medium text-xs">Reject</button>
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
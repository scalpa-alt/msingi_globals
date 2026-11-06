import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';

export default function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  async function fetchAttendance() {
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance')
      .select('*, student:profiles!attendance_student_id_fkey(full_name)')
      .order('date', { ascending: false });
    if (!error && data) setAttendanceRecords(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Management" subtitle="Monitor and record daily student attendance records." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading attendance records...</p>
        ) : attendanceRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No attendance records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="pb-3 font-semibold">Student Name</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {attendanceRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{rec.student?.full_name || 'Unknown Student'}</td>
                    <td className="py-3">{rec.date}</td>
                    <td className="py-3">
                      <Badge variant={rec.status === 'present' ? 'teal' : rec.status === 'late' ? 'amber' : 'rose'}>
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="py-3">{rec.remarks || '-'}</td>
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
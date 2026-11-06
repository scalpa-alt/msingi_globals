import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';

export default function Timetable() {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetable();
  }, []);

  async function fetchTimetable() {
    setLoading(true);
    const { data, error } = await supabase
      .from('timetable')
      .select('*, class:classes(name), subject:subjects(name), teacher:profiles(full_name)');
    if (!error && data) setTimetable(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Timetable & Schedule" subtitle="View weekly academic timetables, teachers, and rooms." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading schedules...</p>
        ) : timetable.length === 0 ? (
          <p className="text-sm text-slate-500">No timetable entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <th className="pb-3 font-semibold">Day</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Class</th>
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Teacher</th>
                  <th className="pb-3 font-semibold">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                {timetable.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{item.day_of_week}</td>
                    <td className="py-3">{item.start_time} - {item.end_time}</td>
                    <td className="py-3">{item.class?.name}</td>
                    <td className="py-3">{item.subject?.name}</td>
                    <td className="py-3">{item.teacher?.full_name || 'Unassigned'}</td>
                    <td className="py-3">{item.room || 'TBD'}</td>
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
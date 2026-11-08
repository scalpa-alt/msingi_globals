import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, ExternalLink, Plus, Trash2 } from 'lucide-react';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass, useSubjects } from '@/lib/school';
import type { Assignment, ClassRow } from '@/lib/school';

interface Resource {
  id: string;
  title: string;
  url: string;
  subject_id: string;
  class_id: string | null;
}

interface Props {
  classes: ClassRow[];
  assignments: Assignment[];
}

/** Subject-teacher view: the classes and subjects assigned to the teacher, class lists and curriculum resources. */
export default function SubjectView({ classes, assignments }: Props) {
  const subjects = useSubjects();
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? 'Subject';
  const className = (id: string | null) => classes.find((c) => c.id === id)?.label ?? 'All classes';

  const taught = useMemo(() => {
    const seen = new Set<string>();
    return assignments.filter((a) => {
      if (!a.subject_id) return false;
      const k = `${a.class_id}|${a.subject_id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [assignments]);

  const [selected, setSelected] = useState(0);
  const current = taught[selected];

  const [students, setStudents] = useState<{ id: string; full_name: string; admission_no: string }[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!current?.subject_id) return;
    const [s, r] = await Promise.all([
      supabase.from('students').select('id, full_name, admission_no').eq('class_id', current.class_id).eq('status', 'active').order('full_name'),
      supabase.from('curriculum_resources').select('id, title, url, subject_id, class_id').eq('subject_id', current.subject_id).order('created_at', { ascending: false }),
    ]);
    const e = s.error ?? r.error;
    setError(e ? friendlyError(e) : null);
    setStudents((s.data ?? []) as typeof students);
    setResources(((r.data ?? []) as Resource[]).filter((x) => !x.class_id || x.class_id === current.class_id));
  }, [current]);

  useEffect(() => {
    load();
  }, [load]);

  const urlValid = /^https?:\/\/\S+\.\S+/i.test(url.trim());

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!current?.subject_id || !title.trim() || !urlValid) return;
    setSaving(true);
    const { error: err } = await supabase
      .from('curriculum_resources')
      .insert({ title: title.trim(), url: url.trim(), subject_id: current.subject_id, class_id: current.class_id });
    setSaving(false);
    if (err) return setError(friendlyError(err));
    setTitle('');
    setUrl('');
    load();
  }

  async function remove(id: string) {
    const { error: err } = await supabase.from('curriculum_resources').delete().eq('id', id);
    if (err) setError(friendlyError(err));
    else load();
  }

  if (taught.length === 0) {
    return <EmptyState icon={BookOpen} title="No subjects assigned yet" description="Once the headteacher assigns you classes, your subject lists and resources appear here." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Class and subject">
        {taught.map((a, i) => (
          <button
            key={`${a.class_id}-${a.subject_id}`}
            role="tab"
            aria-selected={selected === i}
            onClick={() => setSelected(i)}
            className={`rounded-xl border px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              selected === i ? 'border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
            }`}
          >
            {subjectName(a.subject_id!)} · {className(a.class_id)}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Class list">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">Class list</h2>
            <Badge variant="teal">{students.length} students</Badge>
          </div>
          <ul className="mt-3 max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-800 dark:text-slate-200">{s.full_name}</span>
                <span className="text-xs text-slate-400">{s.admission_no}</span>
              </li>
            ))}
            {students.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No students enrolled.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900" aria-label="Curriculum resources">
          <h2 className="font-semibold text-slate-900 dark:text-white">Curriculum resources</h2>
          <form onSubmit={add} className="mt-3 space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. Term 2 scheme of work" aria-label="Resource title" maxLength={120} className={inputClass} />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" aria-label="Resource link" inputMode="url" className={inputClass} aria-invalid={!!url && !urlValid} />
            {!!url && !urlValid && <p className="text-xs text-rose-600">Enter a full link starting with http:// or https://</p>}
            <button disabled={saving || !title.trim() || !urlValid} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              <Plus className="h-4 w-4" /> {saving ? 'Adding…' : 'Add resource'}
            </button>
          </form>
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {resources.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1.5 text-teal-700 hover:underline dark:text-teal-300">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{r.title}</span>
                </a>
                <button onClick={() => remove(r.id)} aria-label={`Delete ${r.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {resources.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No resources yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { GraduationCap, Plus, Star, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass } from '@/lib/school';
import { unwrap, useQuery } from '@/lib/useQuery';

interface Teacher { id: string; full_name: string; email: string | null }
interface ClassRow { id: string; label: string; grade_level: number; section: string }
interface Subject { id: string; name: string }
interface Assignment { id: string; teacher_id: string; class_id: string; subject_id: string | null; is_class_teacher: boolean }

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900';
const primaryBtn = 'inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60';

/** Administrator: who teaches what. Everything a teacher can see or change follows from these assignments. */
export default function Teachers() {
  const [tab, setTab] = useState<'assign' | 'setup'>('assign');
  const teachers = useQuery(async () => unwrap<Teacher[]>((await supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher').eq('status', 'active').order('full_name')) as never), []);
  const classes = useQuery(async () => unwrap<ClassRow[]>((await supabase.from('classes').select('id, label, grade_level, section').order('grade_level').order('label')) as never), []);
  const subjects = useQuery(async () => unwrap<Subject[]>((await supabase.from('subjects').select('id, name').order('name')) as never), []);
  const assignments = useQuery(async () => unwrap<Assignment[]>((await supabase.from('teacher_classes').select('id, teacher_id, class_id, subject_id, is_class_teacher')) as never), []);

  const err = teachers.error ?? classes.error ?? subjects.error ?? assignments.error;

  return (
    <div className="space-y-6">
      <PageHeader title="Teachers & classes" subtitle="Assign teachers to classes and subjects. A teacher only sees and edits the classes assigned to them." />
      <div role="tablist" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {([['assign', 'Assignments'], ['setup', 'Classes & subjects']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${tab === k ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{label}</button>
        ))}
      </div>
      {err && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</p>}

      {tab === 'assign' ? (
        <Assign teachers={teachers.data ?? []} classes={classes.data ?? []} subjects={subjects.data ?? []} assignments={assignments.data ?? []} loading={teachers.loading} reload={assignments.reload} />
      ) : (
        <Setup classes={classes.data ?? []} subjects={subjects.data ?? []} reloadClasses={classes.reload} reloadSubjects={subjects.reload} />
      )}
    </div>
  );
}

function Assign({ teachers, classes, subjects, assignments, loading, reload }: { teachers: Teacher[]; classes: ClassRow[]; subjects: Subject[]; assignments: Assignment[]; loading: boolean; reload: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const classLabel = useMemo(() => new Map(classes.map((c) => [c.id, c.label])), [classes]);
  const subjectName = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const classTeacher = useMemo(() => new Map(assignments.filter((a) => a.is_class_teacher).map((a) => [a.class_id, a.teacher_id])), [assignments]);

  async function run(op: PromiseLike<{ error: { code?: string; message: string } | null }>) {
    setError(null);
    const { error: e } = await op;
    if (e) return setError(friendlyError(e as never, { duplicate: 'That teacher is already assigned to this class and subject.' }));
    reload();
  }

  if (!loading && teachers.length === 0) {
    return <EmptyState icon={GraduationCap} title="No active teachers yet" description="Teachers appear here once they register and you approve them under Approvals." />;
  }
  if (classes.length === 0) return <EmptyState icon={GraduationCap} title="Create classes first" description="Open the “Classes & subjects” tab and add your classes." />;

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {teachers.map((t) => {
        const mine = assignments.filter((a) => a.teacher_id === t.id);
        return (
          <section key={t.id} className={card} aria-label={t.full_name}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">{t.full_name}</h2>
                <p className="text-xs text-slate-400">{t.email}</p>
              </div>
              <Badge variant="slate">{mine.length} assignment{mine.length === 1 ? '' : 's'}</Badge>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {mine.map((a) => (
                <li key={a.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 py-1 pl-3 pr-1 text-sm dark:border-slate-700">
                  <span>{classLabel.get(a.class_id) ?? '?'} · {a.subject_id ? subjectName.get(a.subject_id) ?? 'Subject' : 'All subjects'}</span>
                  <button onClick={() => run(supabase.from('teacher_classes').update({ is_class_teacher: !a.is_class_teacher }).eq('id', a.id))} aria-pressed={a.is_class_teacher} aria-label={`${a.is_class_teacher ? 'Remove' : 'Make'} class teacher for ${classLabel.get(a.class_id)}`} title={a.is_class_teacher ? 'Class teacher (click to remove)' : 'Make class teacher'} className={`rounded-full p-1 ${a.is_class_teacher ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}><Star className="h-4 w-4" fill={a.is_class_teacher ? 'currentColor' : 'none'} /></button>
                  <button onClick={() => run(supabase.from('teacher_classes').delete().eq('id', a.id))} aria-label={`Remove ${classLabel.get(a.class_id)} assignment`} className="rounded-full p-1 text-slate-300 hover:text-rose-600"><X className="h-4 w-4" /></button>
                </li>
              ))}
              {mine.length === 0 && <li className="text-sm text-slate-400">Not assigned to any class yet.</li>}
            </ul>
            <AddAssignment teacher={t} classes={classes} subjects={subjects} classTeacher={classTeacher} onAdd={(row) => run(supabase.from('teacher_classes').insert(row))} />
          </section>
        );
      })}
    </div>
  );
}

function AddAssignment({ teacher, classes, subjects, classTeacher, onAdd }: { teacher: Teacher; classes: ClassRow[]; subjects: Subject[]; classTeacher: Map<string, string>; onAdd: (row: { teacher_id: string; class_id: string; subject_id: string | null; is_class_teacher: boolean }) => void }) {
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const taken = classId && classTeacher.get(classId) && classTeacher.get(classId) !== teacher.id;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!classId) return;
    onAdd({ teacher_id: teacher.id, class_id: classId, subject_id: subjectId || null, is_class_teacher: isClassTeacher });
    setSubjectId('');
    setIsClassTeacher(false);
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center">
      <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={`Class for ${teacher.full_name}`} className={`${inputClass} sm:w-40`}>
        <option value="">Class…</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label={`Subject for ${teacher.full_name}`} className={`${inputClass} sm:w-48`}>
        <option value="">All subjects</option>
        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={isClassTeacher} onChange={(e) => setIsClassTeacher(e.target.checked)} /> Class teacher
      </label>
      <button type="submit" disabled={!classId} className={primaryBtn}><Plus className="h-4 w-4" /> Assign</button>
      {taken && isClassTeacher && <p className="text-xs text-amber-600">This class already has a class teacher; both will be able to manage its list.</p>}
    </form>
  );
}

function Setup({ classes, subjects, reloadClasses, reloadSubjects }: { classes: ClassRow[]; subjects: Subject[]; reloadClasses: () => void; reloadSubjects: () => void }) {
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [subject, setSubject] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function addClass(e: FormEvent) {
    e.preventDefault();
    const g = Number(grade);
    if (!Number.isInteger(g) || g < 1 || g > 13) return setError('Grade must be a whole number from 1 to 13.');
    if (!section.trim()) return setError('Enter a section, for example A.');
    setError(null);
    const { error: err } = await supabase.from('classes').insert({ label: `${g}-${section.trim()}`, grade_level: g, section: section.trim() });
    if (err) return setError(friendlyError(err, { duplicate: 'That class already exists.' }));
    setGrade(''); setSection('');
    reloadClasses();
  }
  async function addSubject(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return setError('Enter a subject name.');
    setError(null);
    const { error: err } = await supabase.from('subjects').insert({ name: subject.trim() });
    if (err) return setError(friendlyError(err, { duplicate: 'That subject already exists.' }));
    setSubject('');
    reloadSubjects();
  }
  async function remove(table: 'classes' | 'subjects', id: string) {
    setError(null);
    const { error: err } = await supabase.from(table).delete().eq('id', id);
    if (err) setError(friendlyError(err, { inUse: `This ${table === 'classes' ? 'class still has students' : 'subject still has marks or lessons'}. Move or remove them first.` }));
    else (table === 'classes' ? reloadClasses : reloadSubjects)();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:col-span-2">{error}</p>}
      <section className={card}>
        <h2 className="font-semibold text-slate-900 dark:text-white">Classes</h2>
        <form onSubmit={addClass} className="mt-3 flex gap-2">
          <input value={grade} onChange={(e) => setGrade(e.target.value)} inputMode="numeric" placeholder="Grade (1–13)" aria-label="Grade" className={inputClass} />
          <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="Section (A)" aria-label="Section" maxLength={10} className={inputClass} />
          <button type="submit" className={primaryBtn}><Plus className="h-4 w-4" /> Add</button>
        </form>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {classes.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm text-slate-700 dark:text-slate-200">{c.label}
              <button onClick={() => remove('classes', c.id)} aria-label={`Delete class ${c.label}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </section>
      <section className={card}>
        <h2 className="font-semibold text-slate-900 dark:text-white">Subjects</h2>
        <form onSubmit={addSubject} className="mt-3 flex gap-2">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="New subject" aria-label="Subject name" maxLength={60} className={inputClass} />
          <button type="submit" className={primaryBtn}><Plus className="h-4 w-4" /> Add</button>
        </form>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm text-slate-700 dark:text-slate-200">{s.name}
              <button onClick={() => remove('subjects', s.id)} aria-label={`Delete subject ${s.name}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

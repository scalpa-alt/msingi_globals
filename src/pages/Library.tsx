import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, BookPlus, Pencil, Search, Trash2, Undo2, UserPlus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { friendlyError, inputClass } from '@/lib/school';
import { shortDate, todayISO } from '@/lib/format';
import { unwrap, useQuery } from '@/lib/useQuery';

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  total_copies: number;
  available_copies: number;
}
interface Loan {
  id: string;
  book_id: string;
  borrowed_on: string;
  due_on: string;
  returned_on: string | null;
  books: { title: string } | null;
  students: { full_name: string } | null;
}
interface Pupil { id: string; full_name: string; classes: { label: string } | null }

const iconBtn = 'rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-slate-800';
const card = 'rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900';
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const cancelBtn = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300';
const primaryBtn = 'rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60';

/** Everyone can browse the catalogue. Teachers and administrators add, edit and remove books and manage loans. */
export default function Library() {
  const { user } = useAuth();
  const canManage = user?.role === 'administrator' || user?.role === 'teacher';

  const books = useQuery(async () => unwrap<Book[]>((await supabase.from('books').select('*').order('title')) as never), []);
  const loans = useQuery(
    async () =>
      canManage
        ? unwrap<Loan[]>((await supabase.from('book_loans').select('id, book_id, borrowed_on, due_on, returned_on, books(title), students(full_name)').is('returned_on', null).order('due_on')) as never)
        : [],
    [canManage],
  );
  const pupils = useQuery(
    async () =>
      canManage
        ? unwrap<Pupil[]>((await supabase.from('students').select('id, full_name, classes(label)').eq('status', 'active').order('full_name').limit(2000)) as never)
        : [],
    [canManage],
  );

  const [q, setQ] = useState('');
  const [bookForm, setBookForm] = useState<{ open: boolean; book: Book | null }>({ open: false, book: null });
  const [issuing, setIssuing] = useState<Book | null>(null);
  const [removing, setRemoving] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadAll = () => { books.reload(); loans.reload(); };

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (books.data ?? []).filter((b) => !n || b.title.toLowerCase().includes(n) || b.author.toLowerCase().includes(n) || b.category.toLowerCase().includes(n));
  }, [books.data, q]);

  async function loanAction(l: Loan, action: 'return' | 'remove') {
    setError(null);
    const { error: e } = action === 'return'
      ? await supabase.from('book_loans').update({ returned_on: todayISO() }).eq('id', l.id)
      : await supabase.from('book_loans').delete().eq('id', l.id);
    if (e) return setError(friendlyError(e));
    reloadAll();
  }

  async function removeBook(b: Book) {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from('books').delete().eq('id', b.id);
    setBusy(false);
    if (e) return setError(friendlyError(e));
    setRemoving(null);
    reloadAll();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        subtitle={canManage ? 'Add, edit and remove books, and lend them to students.' : 'Browse the school library and see what is available.'}
        actions={canManage ? (
          <button onClick={() => setBookForm({ open: true, book: null })} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700">
            <BookPlus className="h-4 w-4" /> Add book
          </button>
        ) : undefined}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, author or category" aria-label="Search books" className={`${inputClass} pl-9`} />
      </div>

      {(books.error || error) && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{books.error ?? error}</p>}

      {!books.loading && shown.length === 0 ? (
        <EmptyState icon={BookOpen} title={(books.data ?? []).length ? 'No matches' : 'No books yet'} description={(books.data ?? []).length ? 'Try a different search.' : canManage ? 'Add the first book to the catalogue.' : 'The library has no books listed yet.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((b) => (
            <div key={b.id} className={`${card} flex flex-col justify-between p-4`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{b.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">Author: {b.author}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Category: {b.category || 'General'}</p>
                </div>
                {canManage && (
                  <div className="flex shrink-0">
                    <button onClick={() => setBookForm({ open: true, book: b })} aria-label={`Edit ${b.title}`} className={iconBtn}><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => { setError(null); setRemoving(b); }} aria-label={`Remove ${b.title}`} className={`${iconBtn} hover:!bg-rose-50 hover:!text-rose-600`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="text-xs text-slate-500">Available: <b>{b.available_copies}</b> / {b.total_copies}</span>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <button onClick={() => setIssuing(b)} disabled={b.available_copies < 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
                      <UserPlus className="h-3.5 w-3.5" /> Lend
                    </button>
                  )}
                  <Badge variant={b.available_copies > 0 ? 'teal' : 'rose'}>{b.available_copies > 0 ? 'In stock' : 'All lent out'}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <section className={`${card} p-5`} aria-label="Books on loan">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">On loan now</h2>
          {(loans.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No books are out right now.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {(loans.data ?? []).map((l) => {
                const late = l.due_on < todayISO();
                return (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{l.books?.title ?? 'Book'}</p>
                      <p className="text-xs text-slate-500">{l.students?.full_name ?? 'Student'} · due {shortDate(l.due_on)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {late && <Badge variant="rose">Overdue</Badge>}
                      <button onClick={() => loanAction(l, 'return')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"><Undo2 className="h-3.5 w-3.5" /> Returned</button>
                      <button onClick={() => loanAction(l, 'remove')} aria-label={`Remove loan of ${l.books?.title ?? 'book'}`} className={`${iconBtn} hover:!bg-rose-50 hover:!text-rose-600`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <BookForm open={bookForm.open} book={bookForm.book} onClose={() => setBookForm({ open: false, book: null })} onSaved={reloadAll} />
      <LendForm book={issuing} pupils={pupils.data ?? []} onClose={() => setIssuing(null)} onSaved={reloadAll} />

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove “${removing?.title ?? ''}”?`}
        description="The book and its loan history are deleted. Books currently lent out are no longer tracked."
        footer={<><button onClick={() => setRemoving(null)} className={cancelBtn}>Cancel</button><button onClick={() => removing && removeBook(removing)} disabled={busy} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busy ? 'Removing…' : 'Remove book'}</button></>}
      >
        {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : <span />}
      </Modal>
    </div>
  );
}

function BookForm({ open, book, onClose, onSaved }: { open: boolean; book: Book | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ title: '', author: '', category: '', total: '1' });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastKey, setLastKey] = useState('');
  const key = open ? (book?.id ?? 'new') : '';
  if (key !== lastKey) {
    setLastKey(key);
    if (open) { setV(book ? { title: book.title, author: book.author, category: book.category, total: String(book.total_copies) } : { title: '', author: '', category: '', total: '1' }); setErr(null); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const total = Number(v.total);
    if (v.title.trim().length < 2) return setErr('Enter the book title.');
    if (!v.author.trim()) return setErr('Enter the author.');
    if (!Number.isInteger(total) || total < 0 || total > 9999) return setErr('Copies must be a whole number from 0 to 9999.');
    const lent = book ? book.total_copies - book.available_copies : 0;
    if (total < lent) return setErr(`${lent} cop${lent === 1 ? 'y is' : 'ies are'} lent out, so there must be at least ${lent} in total.`);
    setSaving(true);
    setErr(null);
    const fields = { title: v.title.trim(), author: v.author.trim(), category: v.category.trim() || 'General', total_copies: total, available_copies: total - lent };
    const { error } = book ? await supabase.from('books').update(fields).eq('id', book.id) : await supabase.from('books').insert(fields);
    setSaving(false);
    if (error) return setErr(friendlyError(error));
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={book ? 'Edit book' : 'Add book'} footer={<><button type="button" onClick={onClose} className={cancelBtn}>Cancel</button><button type="submit" form="book-form" disabled={saving} className={primaryBtn}>{saving ? 'Saving…' : book ? 'Save changes' : 'Add book'}</button></>}>
      <form id="book-form" onSubmit={submit} noValidate className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title<input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={200} className={`${inputClass} mt-1`} /></label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Author<input value={v.author} onChange={(e) => setV({ ...v, author: e.target.value })} maxLength={120} className={`${inputClass} mt-1`} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category<input value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} maxLength={60} placeholder="General" className={`${inputClass} mt-1`} /></label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Total copies<input type="number" min={0} max={9999} value={v.total} onChange={(e) => setV({ ...v, total: e.target.value })} className={`${inputClass} mt-1`} /></label>
        </div>
        {err && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      </form>
    </Modal>
  );
}

function LendForm({ book, pupils, onClose, onSaved }: { book: Book | null; pupils: Pupil[]; onClose: () => void; onSaved: () => void }) {
  const [studentId, setStudentId] = useState('');
  const [due, setDue] = useState(plusDays(14));
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastKey, setLastKey] = useState('');
  const key = book?.id ?? '';
  if (key !== lastKey) { setLastKey(key); if (book) { setStudentId(''); setDue(plusDays(14)); setErr(null); } }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!book) return;
    if (!studentId) return setErr('Choose a student.');
    if (due < todayISO()) return setErr('The due date cannot be in the past.');
    setSaving(true);
    setErr(null);
    const { error } = await supabase.from('book_loans').insert({ book_id: book.id, student_id: studentId, due_on: due });
    setSaving(false);
    if (error) return setErr(friendlyError(error));
    onSaved();
    onClose();
  }

  return (
    <Modal open={!!book} onClose={onClose} title={`Lend “${book?.title ?? ''}”`} description="Teachers can lend to students in their own classes." footer={<><button type="button" onClick={onClose} className={cancelBtn}>Cancel</button><button type="submit" form="lend-form" disabled={saving} className={primaryBtn}>{saving ? 'Lending…' : 'Lend book'}</button></>}>
      <form id="lend-form" onSubmit={submit} noValidate className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Student
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={`${inputClass} mt-1`}>
            <option value="">Select student</option>
            {pupils.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.classes ? ` (${p.classes.label})` : ''}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Due date<input type="date" value={due} min={todayISO()} onChange={(e) => setDue(e.target.value)} className={`${inputClass} mt-1`} /></label>
        {err && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      </form>
    </Modal>
  );
}

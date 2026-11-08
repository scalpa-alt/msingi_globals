import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Mail, Phone, Rows3, Search, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { friendlyError, inputClass } from '@/lib/school';

interface DirRow {
  parent_id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string | null;
  parent_status: string;
  child_row_id: string | null;
  child_name: string | null;
  class_label: string | null;
  student_id: string | null;
}

interface ParentGroup {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  children: { id: string; name: string; classLabel: string; linked: boolean }[];
}

/** A parent's children are either all matched to school records or some are still waiting for the student to be enrolled. */
const matchState = (g: { children: { linked: boolean }[] }) => {
  const open = g.children.filter((c) => !c.linked).length;
  return open === 0
    ? { variant: 'emerald' as const, label: g.children.length ? 'All children matched' : 'No children listed' }
    : { variant: 'amber' as const, label: `${open} not matched yet` };
};

export default function Directory() {
  const [rows, setRows] = useState<DirRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('parent_directory')
      .select('*')
      .order('parent_name')
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) setError(friendlyError(e));
        setRows((data ?? []) as DirRow[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo<ParentGroup[]>(() => {
    const map = new Map<string, ParentGroup>();
    for (const r of rows) {
      let g = map.get(r.parent_id);
      if (!g) {
        g = { id: r.parent_id, name: r.parent_name, email: r.parent_email, phone: r.parent_phone ?? '', status: r.parent_status, children: [] };
        map.set(r.parent_id, g);
      }
      if (r.child_row_id) g.children.push({ id: r.child_row_id, name: r.child_name ?? '', classLabel: r.class_label ?? '', linked: !!r.student_id });
    }
    return [...map.values()];
  }, [rows]);

  const classes = useMemo(
    () => [...new Set(groups.flatMap((g) => g.children.map((c) => c.classLabel)).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [groups],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return groups.filter((g) => {
      if (statusFilter === 'matched' && g.children.some((c) => !c.linked)) return false;
      if (statusFilter === 'unmatched' && !g.children.some((c) => !c.linked)) return false;
      if (classFilter && !g.children.some((c) => c.classLabel === classFilter)) return false;
      if (!needle) return true;
      return (
        g.name.toLowerCase().includes(needle) ||
        g.email.toLowerCase().includes(needle) ||
        g.phone.replace(/\s/g, '').includes(needle.replace(/\s/g, '')) ||
        g.children.some((c) => c.name.toLowerCase().includes(needle) || c.classLabel.toLowerCase().includes(needle))
      );
    });
  }, [groups, q, classFilter, statusFilter]);

  const childrenOf = (g: ParentGroup) => (classFilter ? g.children.filter((c) => c.classLabel === classFilter) : g.children);
  const filtersOn = !!(q || classFilter || statusFilter);

  const ChildChips = ({ g }: { g: ParentGroup }) => (
    <ul className="flex flex-wrap gap-1.5">
      {childrenOf(g).map((c) => (
        <li key={c.id}>
          <Badge variant={c.linked ? 'teal' : 'slate'}>{c.name}{c.classLabel ? ` · ${c.classLabel}` : ''}</Badge>
        </li>
      ))}
      {g.children.length === 0 && <li className="text-xs text-slate-400">No children listed</li>}
    </ul>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Parent & student directory" subtitle="Parents register themselves. Each child is matched to a school record by name and class." />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search parent, child, class, email or phone"
            aria-label="Search directory"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Filter by class" className={`${inputClass} lg:w-40`}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by child match" className={`${inputClass} lg:w-52`}>
          <option value="">All parents</option>
          <option value="matched">All children matched</option>
          <option value="unmatched">Has unmatched children</option>
        </select>
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Layout">
          {([['table', Rows3, 'Table'], ['cards', LayoutGrid, 'Cards']] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              aria-pressed={view === id}
              aria-label={`${label} view`}
              className={`rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${view === id ? 'bg-white text-teal-600 shadow-sm dark:bg-slate-900' : 'text-slate-400'}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <p className="text-sm text-slate-500" aria-live="polite">
        {loading ? 'Loading…' : `${filtered.length} of ${groups.length} parents`}
        {filtersOn && (
          <button onClick={() => { setQ(''); setClassFilter(''); setStatusFilter(''); }} className="ml-3 font-medium text-teal-600 hover:underline">Clear filters</button>
        )}
      </p>

      {!loading && filtered.length === 0 ? (
        <EmptyState icon={Users} title={filtersOn ? 'No matches' : 'No parents yet'} description={filtersOn ? 'Try a different search or clear the filters.' : 'Parents appear here as soon as they register.'} />
      ) : view === 'table' ? (
        <>
          {/* Table on larger screens */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Children</th>
                  <th className="px-4 py-3">Matching</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((g) => (
                  <tr key={g.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{g.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <a href={`mailto:${g.email}`} className="block hover:text-teal-600">{g.email}</a>
                      {g.phone && <a href={`tel:${g.phone}`} className="block hover:text-teal-600">{g.phone}</a>}
                    </td>
                    <td className="px-4 py-3"><ChildChips g={g} /></td>
                    <td className="px-4 py-3"><Badge variant={matchState(g).variant} dot>{matchState(g).label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards on phones */}
          <CardList items={filtered} ChildChips={ChildChips} className="md:hidden" />
        </>
      ) : (
        <CardList items={filtered} ChildChips={ChildChips} />
      )}
    </div>
  );
}

function CardList({ items, ChildChips, className = '' }: { items: ParentGroup[]; ChildChips: (p: { g: ParentGroup }) => JSX.Element; className?: string }) {
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {items.map((g) => (
        <li key={g.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-slate-900 dark:text-white">{g.name}</p>
            <Badge variant={matchState(g).variant} dot>{matchState(g).label}</Badge>
          </div>
          <a href={`mailto:${g.email}`} className="mt-2 flex items-center gap-1.5 truncate text-sm text-slate-500 hover:text-teal-600"><Mail className="h-3.5 w-3.5 shrink-0" /> {g.email}</a>
          {g.phone && <a href={`tel:${g.phone}`} className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600"><Phone className="h-3.5 w-3.5 shrink-0" /> {g.phone}</a>}
          <div className="mt-3"><ChildChips g={g} /></div>
        </li>
      ))}
    </ul>
  );
}

import { useMemo, useState, type ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  searchPlaceholder?: string;
  searchKeys?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  toolbar?: ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  pageSize = 8,
  searchPlaceholder = 'Search…',
  searchKeys,
  onRowClick,
  emptyMessage = 'No records found.',
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchKeys) return data;
    const q = query.toLowerCase();
    return data.filter((row) => searchKeys(row).toLowerCase().includes(q));
  }, [data, query, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir, columns, sortDir === 'asc' ? 'asc' : 'desc', sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageData = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        {searchKeys ? (
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        ) : <div />}
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-400 dark:border-slate-800">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const sortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 ${col.className ?? ''} ${sortable ? 'cursor-pointer select-none' : ''}`}
                    onClick={() => sortable && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      {sortable && (
                        isSorted ? (
                          sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-teal-500" /> : <ChevronDown className="h-3.5 w-3.5 text-teal-500" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageData.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                    {col.render ? col.render(row) : col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {pageData.length === 0 && (
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm text-slate-400">{emptyMessage}</p>
        </div>
      )}

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-xs text-slate-400">
            Showing <span className="font-medium text-slate-600 dark:text-slate-300">{currentPage * pageSize + 1}</span>–
            <span className="font-medium text-slate-600 dark:text-slate-300">{Math.min((currentPage + 1) * pageSize, sorted.length)}</span> of{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">{sorted.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-7 min-w-7 rounded-lg px-2 text-xs font-medium transition ${
                  currentPage === i
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {i + 1}
              </button>
            ))}
            {totalPages > 5 && <span className="px-1 text-xs text-slate-400">…</span>}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

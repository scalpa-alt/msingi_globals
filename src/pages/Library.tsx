import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';

export default function Library() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    setLoading(true);
    const { data, error } = await supabase.from('books').select('*');
    if (!error && data) setBooks(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Library Inventory" subtitle="Manage school books, copies, and live availability." />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading library catalog...</p>
        ) : books.length === 0 ? (
          <p className="text-sm text-slate-500">No books found in the library.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <div key={book.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{book.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">Author: {book.author}</p>
                  <p className="text-xs text-slate-400 mt-0.5">ISBN: {book.isbn || 'N/A'}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-xs text-slate-500">Available: <b>{book.available_copies}</b> / {book.total_copies}</span>
                  <Badge variant={book.available_copies > 0 ? 'teal' : 'rose'}>
                    {book.available_copies > 0 ? 'In Stock' : 'Checked Out'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
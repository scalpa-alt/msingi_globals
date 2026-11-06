import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, Inbox, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Badge from '@/components/Badge';
import { supabase } from '@/lib/supabase';

export default function Messages() {
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = messagesList.find((m) => m.id === selectedId) ?? null;
  const unread = messagesList.filter((m) => m.unread).length;

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map(m => ({
        id: m.id,
        from: m.sender?.full_name || 'System User',
        subject: m.subject || 'Notification',
        preview: m.content,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: !m.is_read && m.recipient_id === user.id
      }));
      setMessagesList(formatted);
      if (formatted.length > 0 && !selectedId) setSelectedId(formatted[0].id);
    }
  }

  useEffect(() => {
    if (!isComposeOpen) return;

    async function fetchEligibleRecipients() {
      setLoadingRecipients(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          const { data: allParents } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'parent');
          setRecipients(allParents || []);
        } else if (profile?.role === 'teacher') {
          const { data: teacherClasses } = await supabase
            .from('timetable')
            .select('class_id')
            .eq('teacher_id', user.id);

          const classIds = [...new Set(teacherClasses?.map(t => t.class_id) || [])];
          
          if (classIds.length > 0) {
            const { data: enrolledStudents } = await supabase
              .from('student_classes')
              .select('student_id')
              .in('class_id', classIds);

            const studentIds = enrolledStudents?.map(s => s.student_id) || [];

            if (studentIds.length > 0) {
              const { data: eligibleParents } = await supabase
                .from('parent_students')
                .select('parent_id, profiles:parent_id(*)')
                .in('student_id', studentIds);

              const uniqueParents = Array.from(
                new Map(eligibleParents?.map((p: any) => [p.parent_id, p.profiles])).values()
              );
              setRecipients(uniqueParents);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching recipients:', error);
      } finally {
        setLoadingRecipients(false);
      }
    }

    fetchEligibleRecipients();
  }, [isComposeOpen]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !content || !selectedRecipient) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: selectedRecipient,
      subject,
      content
    });

    if (!error) {
      setIsComposeOpen(false);
      setSubject('');
      setContent('');
      setSelectedRecipient('');
      fetchMessages();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        subtitle={`${unread} unread messages in your inbox.`}
        actions={
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Compose
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 lg:h-[560px]">
        {/* List */}
        <div className="flex flex-col border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <Inbox className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">Inbox</span>
            <Badge variant="teal">{messagesList.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {messagesList.length === 0 ? (
              <p className="p-4 text-xs text-slate-500">No messages found.</p>
            ) : (
              messagesList.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                    selectedId === m.id ? 'bg-teal-50/60 dark:bg-teal-500/5' : ''
                  }`}
                >
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${m.unread ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {m.from.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`truncate text-sm ${m.unread ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>{m.from}</p>
                      <span className="shrink-0 text-xs text-slate-400">{m.time}</span>
                    </div>
                    <p className={`truncate text-sm ${m.unread ? 'font-medium text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{m.subject}</p>
                    <p className="truncate text-xs text-slate-400">{m.preview}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="flex flex-col lg:col-span-2">
          {selected ? (
            <>
              <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{selected.subject}</h2>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-xs font-semibold text-white">
                    {selected.from.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{selected.from}</p>
                    <p className="text-xs text-slate-400">{selected.time}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{selected.preview}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState icon={MessageSquare} title="No message selected" description="Select a message from the list to read it here." />
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">New Message</h3>
              <button onClick={() => setIsComposeOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Recipient</label>
                <select 
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                >
                  <option value="">{loadingRecipients ? 'Loading eligible parents...' : 'Select parent recipient...'}</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name} ({r.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Subject</label>
                <input 
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Message</label>
                <textarea 
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your message here..."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
                >
                  <Send className="h-4 w-4" /> Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';
import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/services/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Pin, Archive, Trash2, FileText, Sparkles } from 'lucide-react';

const COLORS = ['#ffffff','#fef3c7','#dcfce7','#dbeafe','#fce7f3','#f3e8ff','#e0f2fe','#fef9c3'];

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#ffffff');

  const fetch = useCallback(async () => {
    try { const r = await notesApi.list({ search: search || undefined }); setNotes(r.data.data?.data || []); }
    catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const response = await notesApi.create({ title: newTitle, color: newColor });
      toast.success('Note created');
      setShowCreate(false);
      setNewTitle('');
      setNewColor('#ffffff');
      router.push(`/dashboard/notes/${response.data.data.id}`);
    }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Notes</h1>
          <p className="text-gray-400 text-sm mt-0.5">{notes.length} notes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm w-full sm:w-56 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shrink-0">
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Note</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input autoFocus type="text" placeholder="Note title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setNewColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition ${newColor === c ? 'border-indigo-600 scale-110' : 'border-gray-200'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      ) : notes.length === 0 ? (
        <div className="text-center py-24">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-500">No notes yet</h3>
          <p className="text-gray-400 text-sm mt-1 mb-6">Create your first note to get started</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition">
            <Plus size={16} className="inline mr-1" /> Create Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map((note: any) => (
            <Link key={note.id} href={`/dashboard/notes/${note.id}`}
              className="group block rounded-2xl border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all p-5 relative overflow-hidden"
              style={{ backgroundColor: note.color || '#ffffff' }}>
              {note.is_pinned && <Pin size={14} className="absolute top-3 right-3 text-amber-500 fill-amber-500" />}
              {note.ai_summary && <Sparkles size={12} className="absolute top-3 right-8 text-indigo-400" />}
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 text-[15px]">{note.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{note.plain_text || 'Empty note'}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">{new Date(note.updated_at).toLocaleDateString()}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={(e) => { e.preventDefault(); notesApi.togglePin(note.id).then(fetch); }} className="p-1.5 rounded-lg hover:bg-black/5"><Pin size={13} /></button>
                  <button onClick={(e) => { e.preventDefault(); notesApi.toggleArchive(note.id).then(() => { toast.success('Archived'); fetch(); }); }} className="p-1.5 rounded-lg hover:bg-black/5"><Archive size={13} /></button>
                  <button onClick={(e) => { e.preventDefault(); notesApi.delete(note.id).then(() => { toast.success('Trashed'); fetch(); }); }} className="p-1.5 rounded-lg hover:bg-black/5 text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

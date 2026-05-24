'use client';

import { useEffect, useState } from 'react';
import { notesApi } from '@/services/api';
import { Note } from '@/types';
import toast from 'react-hot-toast';
import { RotateCcw, Search, Trash2 } from 'lucide-react';

export default function TrashPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchTrash = async () => {
    try {
      const res = await notesApi.trashed();
      setNotes(res.data.data?.data || []);
    } catch {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrash(); }, []);

  const restoreNote = async (id: number) => {
    setBusyId(id);
    try {
      await notesApi.restore(id);
      toast.success('Note restored');
      fetchTrash();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Restore failed');
    } finally {
      setBusyId(null);
    }
  };

  const deleteForever = async (id: number) => {
    if (!confirm('Delete this note permanently? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await notesApi.permanentDelete(id);
      toast.success('Deleted permanently');
      fetchTrash();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = notes.filter((note) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return note.title.toLowerCase().includes(q) || (note.plain_text || '').toLowerCase().includes(q);
  });

  return (
    <div className="w-full pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
          <p className="text-sm text-slate-500 mt-1">Restore deleted notes or remove them permanently.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search trash..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-16 text-center">
          <Trash2 size={46} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-bold text-slate-800 mb-1">{search ? 'No trashed notes found' : 'Trash is empty'}</h3>
          <p className="text-sm text-slate-500">Deleted notes will appear here before permanent deletion.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((note) => (
            <div key={note.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-slate-900 truncate">{note.title || 'Untitled Note'}</h2>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{note.plain_text || 'No text content available...'}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3">
                    Deleted {note.trashed_at ? new Date(note.trashed_at).toLocaleString() : 'recently'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <button
                  onClick={() => restoreNote(note.id)}
                  disabled={busyId === note.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  <RotateCcw size={16} /> Restore
                </button>
                <button
                  onClick={() => deleteForever(note.id)}
                  disabled={busyId === note.id}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-50 transition"
                >
                  <Trash2 size={16} /> Delete Forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

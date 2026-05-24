'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Search, Trash2 } from 'lucide-react';

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try { const res = await adminApi.notes({ search: search || undefined }); setNotes(res.data.data.data || []); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(fetchNotes, 300); return () => clearTimeout(t); }, [fetchNotes]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this note permanently?')) return;
    try { await adminApi.deleteNote(id); toast.success('Deleted'); fetchNotes(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="pb-10 fade-in animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">System Notes</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Audit and manage all platform content</p>
        </div>
        <div className="relative group w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-500 transition-colors">
            <Search size={18} strokeWidth={2.5} />
          </div>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-11 pr-4 py-3 rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-sm text-sm w-full sm:w-72 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 focus:bg-white transition-all shadow-sm placeholder:text-slate-400 font-medium text-slate-700 hover:border-slate-300" 
            placeholder="Search notes..." />
        </div>
      </div>
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" /></div> : (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-500 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notes.map((n: any) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-800">{n.title || 'Untitled'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-700">{n.user?.name}</p>
                      <p className="text-xs font-medium text-slate-500">{n.user?.email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">
                      {new Date(n.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {n.is_trashed ? <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-red-50 text-red-600 border border-red-100"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />Trashed</span> :
                       n.is_archived ? <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" />Archived</span> :
                       <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDelete(n.id)} title="Delete permanently" 
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-300">
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Search, Trash2 } from 'lucide-react';

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try { const r = await adminApi.notes({ search: search || undefined }); setNotes(r.data.data.data || []); }
    catch {} finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Notes</h1>
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-56 outline-none" placeholder="Search..." /></div>
      </div>
      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div> : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
            </tr></thead>
            <tbody>{notes.map((n: any) => (
              <tr key={n.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{n.title}</td>
                <td className="px-4 py-3 text-gray-500">@{n.user?.username}</td>
                <td className="px-4 py-3 text-xs font-mono text-indigo-600">{n.share_code || '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(n.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {n.is_trashed ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Trashed</span>
                  : n.is_archived ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Archived</span>
                  : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>}
                </td>
                <td className="px-4 py-3"><button onClick={async () => { if (!confirm('Delete?')) return; await adminApi.deleteNote(n.id); toast.success('Deleted'); fetch(); }}
                  className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

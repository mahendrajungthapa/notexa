'use client';
import { useState, useEffect } from 'react';
import { notesApi } from '@/services/api';
import Link from 'next/link';
import { Share2, Eye, Edit3 } from 'lucide-react';

export default function SharedPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const r = await notesApi.sharedWithMe(); setNotes(r.data.data?.data || []); } catch {} finally { setLoading(false); } })(); }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Shared with Me</h1>
      <p className="text-gray-400 text-sm mb-6">Notes shared via friends or share codes</p>
      {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      : notes.length === 0 ? <div className="text-center py-20"><Share2 size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No shared notes yet</p></div>
      : <div className="space-y-3">{notes.map((n: any) => (
        <Link key={n.id} href={`/dashboard/notes/${n.id}`} className="block bg-white rounded-2xl border border-gray-200 hover:shadow-md transition p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[15px] mb-1">{n.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{n.plain_text || 'Empty'}</p>
              <div className="flex gap-3 mt-3 text-xs text-gray-400"><span>By @{n.user?.username}</span><span>{new Date(n.updated_at).toLocaleDateString()}</span></div>
            </div>
            <span className={`shrink-0 ml-4 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${n.pivot?.permission === 'edit' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {n.pivot?.permission === 'edit' ? <><Edit3 size={11} /> Edit</> : <><Eye size={11} /> View</>}
            </span>
          </div>
        </Link>
      ))}</div>}
    </div>
  );
}

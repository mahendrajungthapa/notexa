'use client';

import { useState, useEffect } from 'react';
import { notesApi } from '@/services/api';
import { Note } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Share2, Eye, Edit3, Users, FileText } from 'lucide-react';

export default function SharedPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await notesApi.sharedWithMe();
        setNotes(res.data.data?.data || []);
      } catch { toast.error('Failed to load'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="w-full pb-10 fade-in animate-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100/60">
            <Share2 size={22} className="text-indigo-500" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Shared with Me</h1>
        </div>
        <p className="text-slate-500 font-medium ml-1">Notes that friends and collaborators have shared with you</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
          <div className="p-5 bg-slate-100 rounded-3xl mb-5">
            <Users size={40} className="text-slate-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No shared notes yet</h3>
          <p className="text-slate-500 text-sm max-w-xs">When a friend shares a note with you, it&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notes.map((note) => (
            <Link key={note.id} href={`/dashboard/notes/${note.id}`}
              className="group relative block bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-slate-300/60 hover:-translate-y-0.5 transition-all duration-500 p-6 overflow-hidden">

              {/* Gradient halo — shifts colour by permission */}
              <div className={`absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none ${note.pivot?.permission === 'edit' ? 'bg-emerald-400' : 'bg-indigo-400'}`} />

              <div className="relative z-10 flex items-start justify-between gap-4">
                {/* Left: icon + content */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="shrink-0 p-2.5 bg-slate-100 rounded-2xl group-hover:bg-indigo-50 group-hover:scale-110 transition-all duration-500">
                    <FileText size={20} className="text-slate-500 group-hover:text-indigo-500 transition-colors" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base mb-1.5 group-hover:text-indigo-700 transition-colors truncate">{note.title || 'Untitled'}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {note.plain_text || <span className="italic text-slate-400">Empty note</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">
                          {note.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span>{note.user?.name}</span>
                      </div>
                      <span className="text-slate-300">·</span>
                      <span>{new Date(note.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Permission badge */}
                <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full border shadow-sm transition-all ${note.pivot?.permission === 'edit' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100'}`}>
                  {note.pivot?.permission === 'edit'
                    ? <><Edit3 size={12} strokeWidth={2.5} /> Edit</>
                    : <><Eye size={12} strokeWidth={2.5} /> View</>}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

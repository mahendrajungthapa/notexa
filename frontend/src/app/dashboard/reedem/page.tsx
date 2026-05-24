'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notesApi } from '@/services/api';
import toast from 'react-hot-toast';
import { KeyRound, Sparkles, HelpCircle } from 'lucide-react';

export default function RedeemPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    
    // Redeem codes are typically 8 characters based on documentation
    if (cleanCode.length !== 8) {
      toast.error('Code must be exactly 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await notesApi.redeemCode(cleanCode);
      const note = res.data?.data || res.data || {};
      
      toast.success(res.data?.message || 'Note successfully redeemed and added to your workspace!');
      setCode('');
      
      // Redirect to the newly shared note details
      if (note.id) {
        router.push(`/dashboard/notes/${note.id}`);
      } else {
        router.push('/dashboard/shared');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired share code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 sm:gap-8 pb-20 fade-in animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden shrink-0">
        {/* Glow effect background ornament */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3525cd]/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3" />
        
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
          <KeyRound size={26} strokeWidth={2.2} />
        </div>
        
        <div className="text-center sm:text-left min-w-0 flex-1">
          <h1 className="text-2xl font-headline font-black text-slate-900">
            Redeem Share Code
          </h1>
          <p className="text-slate-500 font-medium mt-1 leading-relaxed text-sm">
            Access shared notebooks instantly. When a colleague or peer shares a note, they can generate an 8-character code for you to enter below.
          </p>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-stretch w-full">
        
        {/* Left Column: Form Box */}
        <div className="bg-white rounded-[2rem] border border-slate-200/60 p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[300px]">
          <div className="absolute -top-24 -right-24 w-52 h-52 bg-indigo-50/40 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100/60 w-fit">
                Enter Code
              </span>
              <p className="text-xs font-semibold text-slate-400 leading-relaxed mt-2">
                Type the 8-character unique share code below to sync the notebook to your workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  required
                  disabled={loading}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full px-4 py-5 bg-slate-50/50 border border-slate-200/80 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none text-center font-mono text-2xl sm:text-3xl font-black tracking-[0.18em] sm:tracking-[0.25em] uppercase transition-all placeholder:text-slate-300 shadow-inner"
                  placeholder="ABCD1234"
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 8}
                className="w-full py-4 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] hover:from-[#2a1cbc] hover:to-[#4338ca] text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={14} strokeWidth={2.5} /> Redeem Share Code
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Guide Info */}
        <div className="bg-white rounded-[2rem] border border-slate-200/60 p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-emerald-50/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full space-y-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100/60 w-fit flex items-center gap-1">
                <HelpCircle size={12} strokeWidth={2.5} /> Instruction Guide
              </span>
              <h2 className="text-base font-bold text-slate-800 mt-2">How do Share Codes work?</h2>
            </div>

            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-700">Generate Code</h4>
                  <p className="text-[11.5px] leading-relaxed text-slate-500 font-medium">
                    <strong>User A</strong> clicks "Share Note" inside the editor and generates a unique share code.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-700">Send Code</h4>
                  <p className="text-[11.5px] leading-relaxed text-slate-500 font-medium">
                    They share the 8-character unique alphanumeric key with you.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-700">Redeem Notebook</h4>
                  <p className="text-[11.5px] leading-relaxed text-slate-500 font-medium">
                    Enter it on this page. Once redeemed, it instantly populates in your <strong>"Shared with Me"</strong> directory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

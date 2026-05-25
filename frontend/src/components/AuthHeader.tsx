'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

type AuthHeaderProps = {
  active?: 'login' | 'register';
};

export default function AuthHeader({ active }: AuthHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-white/85 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <FileText size={19} strokeWidth={2.5} />
          </span>
          <span className="text-xl font-black tracking-tight text-slate-900">NotExA</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className={`rounded-xl px-3 py-2 text-sm font-bold transition ${active === 'login' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className={`rounded-xl px-3 py-2 text-sm font-bold transition ${active === 'register' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

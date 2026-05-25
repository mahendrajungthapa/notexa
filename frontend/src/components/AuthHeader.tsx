'use client';

import Link from 'next/link';

type AuthHeaderProps = {
  active?: 'login' | 'register';
};

export default function AuthHeader({ active }: AuthHeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/50 bg-white/85 px-6 py-4 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-all duration-300 lg:px-20">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 group">
          <span className="text-[28px] font-black tracking-tighter bg-gradient-to-br from-[#3525cd] to-[#4f46e5] bg-clip-text text-transparent group-hover:opacity-90 transition-opacity font-headline">NotExA</span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          <Link href="/#features" className="text-[14px] font-bold text-slate-500 hover:text-indigo-600 transition-colors duration-200">Features</Link>
          <Link href="/#ai-tools" className="text-[14px] font-bold text-slate-500 hover:text-indigo-600 transition-colors duration-200">AI Tools</Link>
          <Link
            href="/auth/login"
            className={`text-[14px] font-bold transition-colors duration-200 ${active === 'login' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`}
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className={`rounded-xl px-6 py-2.5 text-sm font-bold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${active === 'register' ? 'bg-slate-900 text-white' : 'bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white'}`}
          >
            Get Started Free
          </Link>
        </nav>

        <div className="flex gap-2 md:hidden">
          <Link href="/auth/login" className={`px-4 py-2 text-sm font-bold ${active === 'login' ? 'text-indigo-600' : 'text-slate-600'}`}>Login</Link>
          <Link href="/auth/register" className="px-4 py-2 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white rounded-xl text-sm font-bold shadow">Sign Up</Link>
        </div>
      </div>
    </header>
  );
}

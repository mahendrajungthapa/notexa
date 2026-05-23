'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/contexts/authStore';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowRight, Sparkles, Users, Zap, HardDrive, Lock, CheckCircle2 } from 'lucide-react';

const features = [
  { icon: Sparkles, title: 'Rich Text Editor', desc: 'Bold, headings, lists, code blocks, images, tasks, highlights — a powerful editor that stays out of your way.', color: 'bg-indigo-50 text-indigo-600' },
  { icon: Users, title: 'Friends & Sharing', desc: 'Add friends by @username, share notes instantly. Control view or edit access for each collaborator.', color: 'bg-emerald-50 text-emerald-600' },
  { icon: Zap, title: 'Collaborative Editing', desc: 'Share notes with classmates or friends, choose view/edit access, and keep versions of important changes.', color: 'bg-amber-50 text-amber-600' },
  { icon: HardDrive, title: 'Cloud Storage & Files', desc: 'Upload PDFs, images, documents. Cloudflare R2 powered — fast, reliable, global.', color: 'bg-rose-50 text-rose-600' },
  { icon: Lock, title: 'Share Codes', desc: 'Generate a unique 8-character code for any note. Anyone with the code can join as a viewer or editor.', color: 'bg-violet-50 text-violet-600' },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/dashboard/notes');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen">
      <Header />

      {/* HERO */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 mb-6">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
              AI Summaries + Friend Sharing
            </div>
            <h1 className="text-5xl lg:text-[64px] font-extrabold leading-[1.05] tracking-[-2px] mb-6">
              Notes that<br />bring teams<br /><span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">together.</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-lg">
              Create beautiful notes, share with friends using @username or share codes, collaborate in real-time, and let AI summarize your thoughts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-base font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
                Start Free <ArrowRight size={18} />
              </Link>
              <Link href="/about" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-2xl text-base font-semibold hover:border-gray-300 hover:-translate-y-0.5 transition-all">
                Learn More
              </Link>
            </div>
          </div>

          {/* Note card mockup */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl shadow-gray-200/50 p-8 max-w-md ml-auto relative">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
                <div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-amber-400" /><div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-auto text-xs text-gray-400 font-mono">notes.md</span>
              </div>
              <div className="flex gap-1.5 mb-5">
                {['B','I','U','H₁','☰','☐','🔗','✨'].map((t,i) => (
                  <span key={i} className={`w-8 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i===0?'bg-indigo-600 text-white':i===7?'bg-amber-100 text-amber-600':'bg-gray-100 text-gray-500'}`}>{t}</span>
                ))}
              </div>
              <h3 className="text-xl font-bold mb-2">Sprint Planning Q4</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Key priorities include <span className="bg-yellow-100 px-1 rounded">launching the mobile app</span> and improving the onboarding flow.
              </p>
              <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="text-xs font-semibold text-indigo-600 mb-1 flex items-center gap-1"><Sparkles size={12} /> AI Summary</div>
                <p className="text-xs text-indigo-800/70">Focus on mobile launch and onboarding. Two key initiatives for Q4 growth.</p>
              </div>

              {/* Share code badge */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl px-4 py-2.5 shadow-xl border border-gray-200">
                <div className="text-[10px] text-gray-400 mb-0.5">Share Code</div>
                <div className="text-sm font-bold font-mono text-indigo-600 tracking-wider">XK7M • 2NPA</div>
              </div>

              {/* Collaborators */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-2.5 shadow-xl border border-gray-200 flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">R</div>
                  <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">S</div>
                </div>
                <span className="text-xs font-semibold text-gray-700">2 editing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">Everything you need.</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">From quick thoughts to team projects, Notexa adapts to how you work.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group bg-white border border-gray-200 rounded-2xl p-8 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-100/50 hover:border-gray-300 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color}`}>
                  <f.icon size={22} />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="py-24 px-4 bg-gray-950 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">Workflow</p>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">Capture, share, summarize.</h2>
            <p className="text-lg text-gray-400">A simple loop for class notes, project plans, and team ideas.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {['Write rich notes with files and formatting', 'Share with friends or a secure code', 'Generate a concise summary when you need it'].map((text, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <CheckCircle2 size={20} className="mb-4 text-emerald-300" />
                <p className="text-sm leading-relaxed text-gray-200">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">Ready to get started?</h2>
        <p className="text-lg text-gray-500 mb-10 max-w-md mx-auto">Free to use, no credit card needed. Start taking better notes today.</p>
        <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-base font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
          Create Your Account <ArrowRight size={18} />
        </Link>
      </section>

      <Footer />
    </div>
  );
}

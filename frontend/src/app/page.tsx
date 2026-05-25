'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/contexts/authStore';
import { useRouter } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  FileEdit, Users2, Zap, CloudUpload, ShieldCheck, Target,
  Bot, Layers, ScanLine, Languages, BookOpen, Award
} from 'lucide-react';

const features = [
  {
    icon: FileEdit,
    title: 'Rich Note Editor',
    desc: 'A full Tiptap-powered editor with headings, bold/italic, checklists, code blocks, highlight, images, and hyperlinks — everything you need in one clean canvas.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
  {
    icon: Bot,
    title: 'Admin-Managed AI Tools',
    desc: 'Summarize notes, ask questions, generate flashcards, create MCQ quizzes, translate text, or extract meaning through secure backend AI settings.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
  {
    icon: Zap,
    title: 'Real-time Collaboration',
    desc: 'Invite peers to edit your note simultaneously using Yjs WebRTC plus backend presence. See live text changes and joined/writing indicators as you co-author together.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },
  {
    icon: Layers,
    title: 'Split-Screen PDF Study',
    desc: 'Upload a PDF to your file vault, then open any note side-by-side with your PDF to study and annotate simultaneously without switching tabs.',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
  },
  {
    icon: ShieldCheck,
    title: 'Granular Sharing Controls',
    desc: 'Share notes with specific friends and assign view-only or full editor access. Complete ownership of your work — only you decide who gets in.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: CloudUpload,
    title: 'Cloud File Attachments',
    desc: 'Attach PDFs, slides, and reference files to any note instantly. Files are stored securely in the cloud and accessible across all your devices.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: Users2,
    title: 'Friends & Peer Network',
    desc: 'Find classmates by username, send friend requests, and build your study circle. Shared notes from friends show up in your dashboard automatically.',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
  },
  {
    icon: Target,
    title: 'ADHD Focus Sprints',
    desc: 'Start a timed Pomodoro-style focus sprint right inside the editor. Every 150 characters earns a dopamine boost — with affirmations and confetti on session complete.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },
  {
    icon: ScanLine,
    title: 'OCR Image Text Extraction',
    desc: 'Paste an image URL into the AI toolkit and extract all visible text instantly. Great for digitising screenshots, slides, and handwritten notes.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
  },
];

const aiTools = [
  { emoji: '✨', label: 'Summarise', desc: 'Condense long notes into key points' },
  { emoji: '💬', label: 'Ask AI', desc: 'Chat with your note content' },
  { emoji: '🃏', label: 'Flashcards', desc: 'Auto-generate study flashcard decks' },
  { emoji: '🧠', label: 'MCQ Quiz', desc: 'Test yourself with generated questions' },
  { emoji: '🌍', label: 'Translate', desc: 'Translate notes to any language' },
  { emoji: '📷', label: 'OCR Scan', desc: 'Extract text from images instantly' },
];

const stats = [
  { value: '12k+', label: 'Notes Created' },
  { value: '850+', label: 'Active Students' },
  { value: '99.98%', label: 'Uptime SLA' },
  { value: '6+', label: 'AI Models' },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [activeAiTool, setActiveAiTool] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard/notes');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const t = setInterval(() => setActiveAiTool(p => (p + 1) % aiTools.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900 selection:bg-indigo-500/15 selection:text-indigo-900 overflow-x-hidden font-sans">
      <AuthHeader />

      {/* ── HERO SECTION ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-32 pb-24 px-6 lg:px-20 overflow-hidden">
        {/* Glow meshes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)' }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 65%)' }} />
          <div className="absolute top-[35%] left-[25%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)' }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10 w-full">
          {/* Left Hero Content */}
          <div className="max-w-[620px]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/60 mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
              </span>
              AI-Powered Notes · Real-time Collab · ADHD Focus Tools
            </div>

            <h1 className="text-[clamp(44px,5.2vw,72px)] font-black leading-[1.03] tracking-[-3px] text-slate-900 mb-6">
              Your notes,<br />smarter than<br />
              <span className="bg-gradient-to-br from-[#3525cd] to-[#4f46e5] bg-clip-text text-transparent font-headline">ever before.</span>
            </h1>

            <p className="text-[18px] text-slate-500 leading-relaxed mb-10 max-w-[520px] font-medium">
              NotExA is a rich note-taking workspace with built-in AI tools, real-time peer collaboration, PDF split-screen study, and ADHD-optimised focus sprints — all in one place.
            </p>

            <div className="flex flex-wrap gap-4 mb-16">
              <Link href="/auth/register" className="group inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white rounded-2xl text-base font-extrabold shadow-[0_8px_32px_-4px_rgba(53,37,205,0.45)] hover:shadow-[0_16px_48px_-4px_rgba(53,37,205,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300">
                Start Writing Free
                <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M8 3l5 5-5 5" /></svg>
                </span>
              </Link>
              <a href="#features" className="inline-flex items-center gap-3 px-9 py-4 bg-white text-slate-800 border-2 border-slate-200 rounded-2xl text-base font-bold hover:border-[#3525cd]/40 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] active:translate-y-0 transition-all duration-300">
                See Features
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M6 3l6 5-6 5" /></svg>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6 pt-10 border-t border-slate-200/70">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-[25px] font-black text-slate-900 tracking-tight leading-none mb-1.5">{s.value}</div>
                  <div className="text-[12px] font-semibold text-slate-500 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Hero - Interactive Editor Mockup */}
          <div className="relative hidden lg:flex items-center justify-center">
            <style>{`
              @keyframes floatCard { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(0.4deg)} }
              @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
              @keyframes slideUpFade { from{opacity:0;transform:translateY(25px)} to{opacity:1;transform:translateY(0)} }
              @keyframes aiPulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.03)} }
            `}</style>

            <div className="animate-[floatCard_7s_ease-in-out_infinite] relative">
              {/* Main Editor Card */}
              <div className="bg-white rounded-[28px] border border-slate-200/80 shadow-[0_35px_85px_-10px_rgba(30,41,59,0.13)] p-7 w-[490px] relative">

                {/* Window dots + filename */}
                <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-auto text-[11px] font-mono text-slate-400 font-bold">quantum-mechanics.md</span>
                </div>

                {/* Editor Toolbar */}
                <div className="flex gap-1.5 mb-5 flex-wrap">
                  {['B', 'I', 'U', 'H₁', 'H₂', '≡', '☐', '✏', '🔗'].map((t, i) => (
                    <span
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-extrabold transition-all cursor-default ${i === 0 ? 'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white shadow-sm shadow-indigo-500/20' : 'bg-slate-50 text-slate-500 border border-slate-200/80'}`}
                    >
                      {t}
                    </span>
                  ))}
                  <span className="ml-auto text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    2 live
                  </span>
                </div>

                {/* Note Content */}
                <div className="text-[21px] font-black text-slate-900 mb-3 tracking-tight">Quantum Superposition</div>
                <div className="text-[14px] text-slate-500 leading-relaxed mb-5 font-medium">
                  A system exists in <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-semibold text-[13px]">multiple states simultaneously</span> until observed by a measurement.
                  <br/><br/>
                  Key exam topics:
                  <span className="inline-block w-0.5 h-[16px] bg-indigo-600 ml-1.5 align-text-bottom" style={{ animation: 'cursorBlink 1.1s step-end infinite' }} />
                </div>

                {/* Checklists */}
                <div className="space-y-2.5 mb-5">
                  {['Review Schrödinger wave equations', 'Plot probability distribution curves'].map((task, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-[13.5px]">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${i === 0 ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 bg-slate-50'}`}>
                        {i === 0 && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span className={i === 0 ? 'line-through text-slate-400 font-semibold' : 'text-slate-700 font-semibold'}>{task}</span>
                    </div>
                  ))}
                </div>

                {/* AI toolbar row */}
                <div className="flex gap-1.5 pt-4 border-t border-slate-100">
                  {['✨ Summarise', '🃏 Flashcards', '🧠 Quiz', '🌍 Translate'].map((tool, i) => (
                    <span key={i} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-default transition-all ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{tool}</span>
                  ))}
                </div>
              </div>

              {/* Floating badge: collaborators */}
              <div className="absolute -bottom-6 -left-10 bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_15px_40px_-5px_rgba(30,41,59,0.15)] border border-slate-200/80 animate-[slideUpFade_0.6s_ease_0.3s_both]">
                <div className="flex -space-x-2.5">
                  {['#6366f1', '#10b981', '#f43f5e'].map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-black shadow-sm" style={{ background: c }}>
                      {['P', 'E', 'N'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[12.5px] font-extrabold text-slate-800">3 editing live</div>
                  <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    WebRTC active
                  </div>
                </div>
              </div>

              {/* Floating badge: AI summary */}
              <div className="absolute -top-6 -right-8 bg-white rounded-2xl px-4 py-3 shadow-[0_15px_40px_-5px_rgba(30,41,59,0.15)] border border-slate-200/80 flex items-center gap-3 animate-[slideUpFade_0.6s_ease_0s_both]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-base shadow-md shadow-indigo-500/10">✨</div>
                <div>
                  <div className="text-[12px] font-black text-slate-800">AI Summary Ready</div>
                  <div className="text-[10.5px] text-slate-400 font-bold">Key points extracted</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI TOOLS SECTION ── */}
      <section id="ai-tools" className="py-24 lg:py-28 px-6 lg:px-20 bg-white border-t border-slate-100">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 text-[12px] font-black text-violet-600 uppercase tracking-[3px] mb-5">
                <div className="w-5 h-0.5 bg-violet-500 rounded" />
                AI-Powered Workspace
              </div>
              <h2 className="text-[clamp(32px,3.5vw,50px)] font-black tracking-[-2px] leading-[1.06] text-slate-900 mb-5">
                Six AI tools,<br />built right into<br />your notes.
              </h2>
              <p className="text-[17px] text-slate-500 leading-relaxed font-medium mb-8 max-w-[460px]">
                AI runs through secure admin panel keys, so users get the full study suite inside every note without adding personal API keys.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {aiTools.map((tool, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 cursor-default ${activeAiTool === i ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <span className="text-xl">{tool.emoji}</span>
                    <div>
                      <div className={`text-[13px] font-extrabold ${activeAiTool === i ? 'text-indigo-700' : 'text-slate-700'}`}>{tool.label}</div>
                      <div className="text-[11.5px] text-slate-400 font-medium">{tool.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Chat mockup */}
            <div className="relative">
              <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_20px_60px_-12px_rgba(30,41,59,0.1)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#3525cd]/5 to-violet-50">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-white text-sm font-black">✨</div>
                  <div>
                    <div className="text-[13px] font-black text-slate-800">AI Study Assistant</div>
                    <div className="text-[11px] text-violet-500 font-bold">gemini-1.5-flash · Connected</div>
                  </div>
                  <div className="ml-auto flex gap-1.5">
                    {['Backend AI', 'Admin Keys', 'Secure'].map((m, i) => (
                      <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${i === 1 ? 'bg-violet-50 text-violet-600 border-violet-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>{m}</span>
                    ))}
                  </div>
                </div>

                {/* Chat messages */}
                <div className="p-5 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 shrink-0">Y</div>
                    <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-[13px] text-slate-700 font-medium max-w-[75%]">
                      Summarise my Quantum Superposition notes into bullet points.
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-gradient-to-br from-[#3525cd] to-[#4f46e5] rounded-2xl rounded-tr-none px-4 py-2.5 text-[13px] text-white font-medium max-w-[80%]">
                      <span className="font-bold block mb-1.5">Key Takeaways:</span>
                      • Particles exist in superposition until observed<br/>
                      • Wave function collapses on measurement<br/>
                      • Schrödinger equation governs probability<br/>
                      • Applications: quantum computing, cryptography
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-xs font-black text-white shrink-0">AI</div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 shrink-0">Y</div>
                    <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-[13px] text-slate-700 font-medium">
                      Now generate 5 flashcards from this.
                    </div>
                  </div>
                  {/* Typing indicator */}
                  <div className="flex gap-3 justify-end">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tr-none px-4 py-3 flex items-center gap-1">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-xs font-black text-white shrink-0">AI</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ALL FEATURES GRID ── */}
      <section id="features" className="py-24 lg:py-32 px-6 lg:px-20 bg-[#f8f9ff]">
        <div className="max-w-[1400px] mx-auto">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-[12px] font-black text-indigo-600 uppercase tracking-[3px] mb-5">
              <div className="w-5 h-0.5 bg-indigo-500 rounded" />
              Everything You Need
              <div className="w-5 h-0.5 bg-indigo-500 rounded" />
            </div>
            <h2 className="text-[clamp(32px,3.8vw,52px)] font-black tracking-[-2px] leading-[1.06] text-slate-900 mb-5">
              Built for serious note-takers.
            </h2>
            <p className="text-[17px] text-slate-500 max-w-[520px] mx-auto leading-relaxed font-medium">
              Every feature is purpose-built for students and researchers who want more than a plain text editor.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const IconComponent = f.icon;
              return (
                <div
                  key={i}
                  className={`group bg-white border border-slate-100 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08)] hover:border-slate-200/80 flex flex-col items-start`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${f.bg} ${f.color} shadow-sm border ${f.border}`}>
                    <IconComponent size={20} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-[16px] font-bold tracking-tight text-slate-900 mb-2 transition-colors group-hover:text-indigo-600">{f.title}</h3>
                  <p className="text-[13.5px] text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ADHD / FOCUS SECTION ── */}
      <section className="py-24 lg:py-32 px-6 lg:px-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-15%] w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 65%)' }} />
        <div className="absolute bottom-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 65%)' }} />

        <div className="max-w-[1100px] mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[12px] font-black uppercase tracking-[3px] text-indigo-400 mb-5 inline-block">ADHD-Optimised Focus Mode</span>
              <h2 className="text-[clamp(30px,4vw,48px)] font-black tracking-[-2px] leading-tight mb-6">
                Your focus is a <span className="text-indigo-400">superpower.</span><br />We help you protect it.
              </h2>
              <p className="text-[17px] text-slate-400 leading-relaxed font-semibold mb-8 max-w-[480px]">
                NotExA has a dedicated ADHD Focus Hub built right into the editor — with Pomodoro sprints, micro-task checklists, positive affirmations, and confetti bursts every time you hit a milestone.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '⏱', title: 'Pomodoro Timer', desc: 'Custom focus sprint durations' },
                  { icon: '🎉', title: 'Confetti Rewards', desc: 'Every 150 chars earns celebration' },
                  { icon: '✅', title: 'Micro-Tasking', desc: 'Break work into tiny checklist wins' },
                  { icon: '💬', title: 'Affirmations', desc: 'Positive reinforcement as you type' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-[13px] font-bold text-white mb-1">{item.title}</div>
                    <div className="text-[12px] text-slate-400 font-medium">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sprint card mockup */}
            <div className="relative">
              <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-[24px] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[14px] font-black text-white">Focus Sprint</div>
                    <div className="text-[12px] text-slate-400 font-medium">Session 2 of 3</div>
                  </div>
                  <div className="text-[36px] font-black text-white tabular-nums">12:47</div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/10 rounded-full mb-5 overflow-hidden">
                  <div className="h-full w-[58%] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                </div>

                {/* Tasks */}
                <div className="space-y-2 mb-5">
                  {[
                    { text: 'Open study notebook', done: true },
                    { text: 'Note down 3 primary concepts', done: true },
                    { text: 'Run AI summarisation', done: false },
                    { text: 'Review with flashcards', done: false },
                  ].map((task, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                        {task.done && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span className={`text-[13px] font-medium ${task.done ? 'line-through text-slate-500' : 'text-white'}`}>{task.text}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-500/15 border border-indigo-400/20 rounded-xl p-3">
                  <div className="text-[12px] text-indigo-300 font-bold">✨ DopaCompanion says:</div>
                  <div className="text-[12.5px] text-white font-medium mt-1">"Outstanding focus! Your study note is growing beautifully! 🌟"</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PDF + COLLAB STRIP ── */}
      <section className="py-20 px-6 lg:px-20 bg-white border-t border-slate-100">
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-8">
          {/* PDF Split Screen */}
          <div className="rounded-2xl border border-slate-100 p-8 bg-gradient-to-br from-sky-50 to-white hover:shadow-[0_16px_40px_-12px_rgba(14,165,233,0.12)] transition-shadow duration-300">
            <div className="w-11 h-11 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600 mb-5">
              <BookOpen size={20} strokeWidth={2.2} />
            </div>
            <h3 className="text-[20px] font-black text-slate-900 mb-3">Study with your PDF, side-by-side</h3>
            <p className="text-[14.5px] text-slate-500 leading-relaxed font-medium">
              Upload lecture slides or textbook PDFs to your file vault. Open any note and instantly pull up the PDF in a split-screen panel — read and write simultaneously without leaving the editor.
            </p>
          </div>

          {/* Real-time Collab */}
          <div className="rounded-2xl border border-slate-100 p-8 bg-gradient-to-br from-indigo-50 to-white hover:shadow-[0_16px_40px_-12px_rgba(99,102,241,0.12)] transition-shadow duration-300">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-5">
              <Users2 size={20} strokeWidth={2.2} />
            </div>
            <h3 className="text-[20px] font-black text-slate-900 mb-3">Real-time peer collaboration</h3>
            <p className="text-[14.5px] text-slate-500 leading-relaxed font-medium">
              Share a collaboration link with your study partner. Signed-in collaborators can edit immediately through the link, while backend presence keeps joined and writing indicators visible.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-24 lg:py-32 px-6 lg:px-20 relative overflow-hidden bg-[#f8f9ff]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 65%)' }} />
        </div>

        <div className="max-w-[800px] mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 mb-8 shadow-sm">
            🎓 Free to get started — no credit card
          </div>

          <h2 className="text-[clamp(36px,4.5vw,58px)] font-black tracking-[-2.5px] text-slate-950 mb-6 leading-[1.06]">
            The smartest way to<br />take notes starts here.
          </h2>

          <p className="text-[17px] text-slate-500 leading-relaxed mb-10 max-w-[520px] mx-auto font-medium">
            Join students and researchers using NotExA to write richer notes, collaborate in real time, and study smarter with built-in AI tools.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/auth/register" className="group inline-flex items-center gap-3 px-9 py-4 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white rounded-2xl text-base font-black shadow-[0_8px_32px_-4px_rgba(53,37,205,0.4)] hover:-translate-y-1 hover:shadow-[0_16px_48px_-4px_rgba(53,37,205,0.45)] active:translate-y-0 transition-all duration-300">
              Create Free Account
              <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M8 3l5 5-5 5" /></svg>
              </span>
            </Link>
            <Link href="/auth/login" className="inline-flex items-center gap-3 px-9 py-4 bg-white text-slate-800 border-2 border-slate-200 rounded-2xl text-base font-bold hover:border-[#3525cd]/30 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] active:translate-y-0 transition-all duration-300">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

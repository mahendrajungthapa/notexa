import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/60 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-6 py-10 text-center md:flex-row md:text-left lg:px-20">
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <span className="text-[20px] font-black tracking-tighter bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">NotExA</span>
          <span className="hidden text-slate-300 sm:inline">·</span>
          <p className="text-[13px] font-bold text-slate-400">© 2026 College Minor Project</p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-7 gap-y-3">
          <Link href="/privacy-policy" className="text-[13px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">Privacy Policy</Link>
          <Link href="/terms-and-conditions" className="text-[13px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">Terms & Conditions</Link>
          <Link href="/#features" className="text-[13px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">Features</Link>
        </div>
      </div>
    </footer>
  );
}

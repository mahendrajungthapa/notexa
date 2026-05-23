'use client';
import Link from 'next/link';
import { useAuthStore } from '@/contexts/authStore';
import { useState, useEffect } from 'react';
import { Menu, X, FileText } from 'lucide-react';

export default function Header() {
  const { isAuthenticated } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Notexa</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Features</Link>
            <Link href="/about" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">About</Link>
            {isAuthenticated ? (
              <Link href="/dashboard/notes" className="ml-2 px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Login</Link>
                <Link href="/auth/register" className="ml-1 px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-semibold hover:bg-indigo-700 transition">
                  Get Started
                </Link>
              </>
            )}
          </nav>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 text-gray-600" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 shadow-lg">
          <Link href="/#features" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Features</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">About</Link>
          <div className="pt-2 border-t border-gray-100 flex gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard/notes" className="flex-1 text-center py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Dashboard</Link>
            ) : (
              <>
                <Link href="/auth/login" className="flex-1 text-center py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold">Login</Link>
                <Link href="/auth/register" className="flex-1 text-center py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

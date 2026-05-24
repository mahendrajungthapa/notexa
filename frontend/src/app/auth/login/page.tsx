'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(form);
      const user = res.data?.data?.user || res.data?.user;
      const token = res.data?.data?.token || res.data?.token;

      if (!user || !token) {
        throw new Error('Invalid login response');
      }

      setAuth(user, token);
      toast.success('Welcome back!');
      router.push(user.role === 'admin' ? '/admin/analytics' : '/dashboard/notes');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Section 1: Brand Message / Visual side (Left side on Desktop) */}
      <section className="relative overflow-hidden flex flex-col justify-center px-8 lg:px-24 py-16 lg:py-0 bg-surface-container-low textured-bg min-h-[50vh] lg:min-h-screen">
        {/* Brand Logo Floating */}
        <div className="absolute top-8 left-8 lg:top-12 lg:left-12 z-20">
          <span className="text-3xl font-black text-primary tracking-tighter font-headline">NotExA</span>
        </div>

        {/* Background Decorative Element */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-fixed-dim/30 rounded-full blur-[120px]"></div>

        <div className="relative z-10 max-w-xl">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label text-xs font-bold uppercase tracking-widest mb-8 relative -top-[3px]">
            Beta
          </span>
          <h1 className="text-5xl lg:text-7xl font-headline font-extrabold text-on-surface leading-[1.1] mb-8 tracking-tight">
            Your thoughts, <br />
            <span className="text-primary italic">perfectly structured.</span>
          </h1>
          <p className="text-lg lg:text-xl text-on-surface-variant font-body leading-relaxed mb-12 max-w-md">
            A minimal sanctuary for scholars, researchers, and creators. Elevate your note-taking with intentional design.
          </p>

          {/* Illustrative Bento-style Graphic */}
          <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
            <img
              alt="Students studying together"
              className="w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1500&auto=format&fit=crop"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/50 via-transparent to-transparent"></div>

            {/* Floating Contextual Chip UI Elements */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-3">
              <div className="glass-effect bg-white/20 px-4 py-2 rounded-full border border-white/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-sm">edit_note</span>
                <span className="text-white text-sm font-medium">Shared Research</span>
              </div>
              <div className="glass-effect bg-white/20 px-4 py-2 rounded-full border border-white/30 flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-sm">history_edu</span>
                <span className="text-white text-sm font-medium">Digital Scholar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Copyright for Left Panel */}
        <div className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12 opacity-40">
          <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">© 2026 NotExA Intelligence</p>
        </div>
      </section>

      {/* Section 2: Auth / Login Flow side (Right side on Desktop) */}
      <section className="flex flex-col justify-center items-center px-8 lg:px-20 py-20 lg:py-0 bg-surface-container-lowest min-h-screen">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-headline font-bold text-on-surface mb-3 tracking-tight">Welcome back</h2>
            <p className="text-on-surface-variant font-body">Log in to your NotExA Account</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface ml-1" htmlFor="email">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-xl pointer-events-none">alternate_email</span>
                <input
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant font-medium"
                  id="email"
                  name="email"
                  placeholder="name@email.com"
                  type="email"
                  required
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-sm font-bold text-on-surface" htmlFor="password">Password</label>
                <Link className="text-xs font-bold text-primary hover:opacity-80 transition-opacity" href="/auth/forgot-password">Forgot password?</Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-xl pointer-events-none">lock_open</span>
                <input
                  className="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant font-medium"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-3 py-1">
              <input className="w-5 h-5 rounded-lg border-outline-variant text-primary focus:ring-primary/20 bg-surface-container-low cursor-pointer" id="remember" type="checkbox" />
              <label className="text-sm text-on-surface-variant font-medium select-none cursor-pointer" htmlFor="remember">Keep me signed in</label>
            </div>

            {/* Primary Action */}
            <button
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white font-label font-bold uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In to NotExA'
              )}
            </button>

            {/* Social Login Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/30"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em]">
                <span className="bg-surface-container-lowest px-4 text-outline-variant">Or continue with</span>
              </div>
            </div>

            {/* Secondary Auth */}
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container-low transition-colors group" type="button" onClick={() => toast.success("Google login coming soon")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface">Google</span>
              </button>
              <button className="flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container-low transition-colors group" type="button" onClick={() => toast.success("LinkedIn login coming soon")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0A66C2" className="w-5 h-5">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface">LinkedIn</span>
              </button>
            </div>
          </form>

          <div className="mt-12 text-center">
            <p className="text-on-surface-variant font-medium">
              New to the NotExA?
              <Link className="text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1" href="/auth/register">Create an account</Link>
            </p>
          </div>

          {/* Footer Terms */}
          <div className="mt-16 text-center">
            <p className="text-[10px] text-outline-variant font-bold uppercase tracking-[0.2em] leading-loose max-w-xs mx-auto">
              By signing in, you agree to our <br />
              <Link className="hover:text-on-surface transition-colors" href="#">Terms of Service</Link> &amp;
              <Link className="hover:text-on-surface transition-colors ml-1" href="#">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

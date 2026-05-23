'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ login: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.login.trim() || !form.password.trim()) { setError('Please fill in all fields.'); return; }

    setLoading(true);
    try {
      const res = await authApi.login(form);
      if (res.data?.token && res.data?.user) {
        setAuth(res.data.user, res.data.token);
        toast.success('Welcome back!');
        router.push(res.data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard/notes');
      } else {
        setError('Unexpected server response. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = 'Login failed. Please try again.';
      if (err.code === 'ERR_NETWORK' || !err.response) {
        msg = 'Cannot connect to server. Check if backend is running.';
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.response?.status === 401) {
        msg = 'Invalid username/email or password.';
      } else if (err.response?.status === 403) {
        msg = 'Account deactivated. Contact admin.';
      } else if (err.response?.status === 422) {
        const errs = err.response.data?.errors;
        msg = errs ? Object.values(errs).flat().join(' ') : 'Please check your input.';
      } else if (err.response?.status >= 500) {
        msg = 'Server error. Please try again later.';
      }
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center pt-20 pb-10 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to your Notexa account</p>
          </div>
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username or Email</label>
                <input type="text" required value={form.login} autoComplete="username"
                  onChange={(e) => { setForm({ ...form, login: e.target.value }); setError(''); }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition"
                  placeholder="@username or email" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={form.password} autoComplete="current-password"
                    onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition pr-12"
                    placeholder="Your password" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition disabled:opacity-50">
                {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn size={16} /> Sign In</>}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              Don&apos;t have an account? <Link href="/auth/register" className="text-indigo-600 hover:underline font-semibold">Create one</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

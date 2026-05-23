'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { UserPlus, Eye, EyeOff, AtSign, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', password_confirmation: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password_confirmation) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.username.length < 3) { setError('Username must be at least 3 characters.'); return; }

    setLoading(true);
    try {
      const res = await authApi.register({ ...form, username: form.username.toLowerCase() });
      if (res.data?.email_verification_required) {
        toast.success(res.data.message || 'Check your email to verify your account.');
        router.push(`/auth/login?verify=1&email=${encodeURIComponent(res.data.email || form.email)}`);
      } else if (res.data?.token && res.data?.user) {
        setAuth(res.data.user, res.data.token);
        toast.success(res.data.message || 'Account created!');
        router.push('/dashboard/notes');
      } else {
        setError('Unexpected server response.');
      }
    } catch (err: any) {
      console.error('Register error:', err);
      let msg = 'Registration failed.';
      if (err.code === 'ERR_NETWORK' || !err.response) {
        msg = 'Cannot connect to server.';
      } else if (err.response?.data?.errors) {
        msg = Object.values(err.response.data.errors).flat().join(' ');
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const setField = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center pt-20 pb-10 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Create account</h1>
            <p className="text-gray-500">Join Notexa — it&apos;s free</p>
          </div>
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input type="text" required value={form.name} onChange={(e) => setField('name', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" required value={form.username} onChange={(e) => setField('username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="johndoe" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Friends add you as @{form.username || 'username'}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={(e) => setField('password', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm pr-12" placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <input type="password" required value={form.password_confirmation} onChange={(e) => setField('password_confirmation', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="Repeat password" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition disabled:opacity-50 mt-2">
                {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={16} /> Create Account</>}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account? <Link href="/auth/login" className="text-indigo-600 hover:underline font-semibold">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

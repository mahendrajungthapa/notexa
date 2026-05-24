'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }

    if (form.username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.register({
        ...form,
        username: form.username.toLowerCase()
      });

      if (res.data?.email_verification_required || res.data?.data?.email_verification_required) {
        setVerificationEmail(res.data?.email || res.data?.data?.email || form.email);
        setVerificationCode('');
        toast.success(res.data?.message || res.data?.data?.message || 'Verification code sent.');
        return;
      }

      const user = res.data?.data?.user || res.data?.user;
      const token = res.data?.data?.token || res.data?.token;

      if (!user || !token) {
        throw new Error('Invalid registration response');
      }

      setAuth(user, token);

      toast.success(
        res.data?.message ||
        res.data?.data?.message ||
        'Registration successful!'
      );

      router.push('/dashboard/notes');
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      const verificationRequired = err.response?.data?.email_verification_required;

      if (verificationRequired) {
        setVerificationEmail(err.response?.data?.email || form.email);
        setVerificationCode('');
        toast.error(err.response?.data?.message || 'Verification code could not be sent.');
        return;
      }

      if (errors) {
        Object.values(errors)
          .flat()
          .forEach((msg: any) => toast.error(msg));
      } else {
        toast.error(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationEmail || verificationCode.length !== 6) {
      toast.error('Enter the 6-digit code from your email');
      return;
    }

    setVerifying(true);
    try {
      const res = await authApi.verifyEmailCode({ email: verificationEmail, code: verificationCode });
      const user = res.data?.data?.user || res.data?.user;
      const token = res.data?.data?.token || res.data?.token;

      if (!user || !token) {
        throw new Error('Invalid verification response');
      }

      setAuth(user, token);
      toast.success(res.data?.message || 'Email verified successfully!');
      router.push('/dashboard/notes');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmail) return;

    setResending(true);
    try {
      const res = await authApi.resendVerification(verificationEmail);
      toast.success(res.data?.message || 'Verification code sent.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side */}
      <section className="relative overflow-hidden hidden lg:flex flex-col justify-center px-8 lg:px-24 py-16 lg:py-0 bg-slate-900 min-h-[50vh] lg:min-h-screen">
        <div className="absolute inset-0 z-0">
          <img
            alt="Modern minimalist library interior with warm wood accents, large windows, and students focused on digital devices in soft natural light"
            className="w-full h-full object-cover opacity-60"
            src="https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?q=80&w=2560&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#3525cd]/90 to-[#4f46e5]/80 mix-blend-multiply"></div>
        </div>

        <div className="relative z-10 max-w-xl text-white">
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            <span
              className="material-symbols-outlined text-secondary-container"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              auto_awesome
            </span>

            <span className="text-sm font-semibold tracking-wide uppercase">
              Academic Intelligence
            </span>
          </div>

          <h1 className="font-headline text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 drop-shadow-sm leading-tight">
            Join the Sanctuary
          </h1>

          <p className="text-xl lg:text-2xl font-light text-white/90 mb-12 leading-relaxed">
            Designed for the students, NotExA provides the focus you need to excel.
          </p>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white">
                  menu_book
                </span>
              </div>

              <div>
                <h3 className="font-headline text-xl font-bold mb-1">
                  Deep Research Focus
                </h3>

                <p className="text-white/70">
                  Distraction-free environment tailored for scholarly pursuits.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white">
                  insights
                </span>
              </div>

              <div>
                <h3 className="font-headline text-xl font-bold mb-1">
                  Intelligent Connections
                </h3>

                <p className="text-white/70">
                  Map your thoughts across multiple disciplines seamlessly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-white">
                  security
                </span>
              </div>

              <div>
                <h3 className="font-headline text-xl font-bold mb-1">
                  Academic Integrity First
                </h3>

                <p className="text-white/70">
                  Tools that support original thinking and rigorous citation.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-12 lg:left-24 z-10 flex items-center gap-3">
          <span className="text-3xl font-black text-white italic tracking-tighter">
            NotExA
          </span>

          <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>

          <span className="text-white/50 text-sm font-medium tracking-widest uppercase">
            <br />
          </span>
        </div>
      </section>

      {/* Right Side */}
      <section className="flex flex-col justify-center items-center px-5 sm:px-8 lg:px-20 py-10 sm:py-14 lg:py-0 bg-surface-container-lowest min-h-screen">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center pt-8 lg:pt-0">
            <div className="mb-5 lg:hidden">
              <span className="text-3xl font-black text-primary font-headline">NotExA</span>
            </div>
            <h2 className="text-3xl font-headline font-bold text-on-surface mb-2">
              Create an Account
            </h2>

            <p className="text-on-surface-variant text-sm font-body">
              Experience a new standard of academic note-taking.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="group">
              <label
                className="block text-sm font-semibold text-on-surface-variant mb-1 ml-1 group-focus-within:text-primary transition-colors"
                htmlFor="full_name"
              >
                Full Name
              </label>

              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant font-medium text-sm"
                id="full_name"
                placeholder="Nisha Saud"
                type="text"
              />
            </div>

            {/* Username */}
            <div className="group">
              <label
                className="block text-sm font-semibold text-on-surface-variant mb-1 ml-1 group-focus-within:text-primary transition-colors"
                htmlFor="username"
              >
                Username
              </label>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
                  alternate_email
                </span>

                <input
                  required
                  value={form.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, '')
                    })
                  }
                  className="w-full bg-surface-container-low border-0 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant font-medium text-sm"
                  id="username"
                  placeholder="nishasaud"
                  type="text"
                />
              </div>

              <p className="text-[11px] text-on-surface-variant mt-1 ml-1 opacity-70">
                Friends can add you as @{form.username || 'username'}
              </p>
            </div>

            {/* Email */}
            <div className="group">
              <label
                className="block text-sm font-semibold text-on-surface-variant mb-1 ml-1 group-focus-within:text-primary transition-colors"
                htmlFor="email"
              >
                Academic Email
              </label>

              <input
                required
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant font-medium text-sm"
                id="email"
                placeholder="nishasaud@gmail.com"
                type="email"
              />
            </div>

            {/* Password */}
            <div className="group relative">
              <label
                className="block text-sm font-semibold text-on-surface-variant mb-1 ml-1 group-focus-within:text-primary transition-colors"
                htmlFor="password"
              >
                Password
              </label>

              <div className="relative">
                <input
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant font-medium text-sm"
                  id="password"
                  placeholder="••••••••••••"
                  type={showPassword ? 'text' : 'password'}
                />

                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="group relative">
              <label
                className="block text-sm font-semibold text-on-surface-variant mb-1 ml-1 group-focus-within:text-primary transition-colors"
                htmlFor="password_confirmation"
              >
                Confirm Password
              </label>

              <div className="relative">
                <input
                  required
                  value={form.password_confirmation}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password_confirmation: e.target.value
                    })
                  }
                  className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant font-medium text-sm"
                  id="password_confirmation"
                  placeholder="••••••••••••"
                  type={showConfirmPassword ? 'text' : 'password'}
                />

                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors"
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirmPassword
                      ? 'visibility'
                      : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                disabled={loading}
                className="w-full bg-gradient-to-br flex gap-2 justify-center items-center from-primary to-primary-container text-white py-3 px-6 rounded-full font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                type="submit"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Create Account'
                )}
              </button>
            </div>

            <p className="text-[11px] text-center text-on-surface-variant leading-relaxed opacity-80 pt-1">
              By clicking "Create Account", you agree to our
              <Link
                className="text-primary font-semibold hover:underline px-1"
                href="#"
              >
                Terms of Service
              </Link>
              and
              <Link
                className="text-primary font-semibold hover:underline"
                href="#"
              >
                Privacy Policy
              </Link>.
            </p>
          </form>

          <div className="mt-8 text-center pb-8 lg:pb-0">
            <p className="text-on-surface text-sm font-medium">
              Already have an account?
              <Link
                className="text-primary font-bold hover:underline ml-1"
                href="/auth/login"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </section>

      {verificationEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="mb-5">
              <h3 className="text-2xl font-headline font-bold text-on-surface">Verify Your Email</h3>
              <p className="text-sm text-on-surface-variant mt-2">
                We sent a 6-digit code to <span className="font-bold text-primary">{verificationEmail}</span>.
              </p>
            </div>

            <form onSubmit={handleVerifyEmail} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">Verification Code</label>
                <input
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-2xl bg-surface-container-low px-5 py-4 text-center text-2xl sm:text-3xl font-black tracking-[0.25em] sm:tracking-[0.35em] text-on-surface outline-none focus:ring-4 focus:ring-primary/15"
                  placeholder="000000"
                />
              </div>

              <button
                disabled={verifying}
                type="submit"
                className="w-full rounded-2xl bg-primary py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {verifying ? 'Verifying...' : 'Verify Email'}
              </button>

              <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendCode}
                  className="font-bold text-primary hover:underline disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationEmail('')}
                  className="font-semibold text-outline hover:text-on-surface"
                >
                  Edit registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/services/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      toast.success(res.data?.message || 'Reset code sent.');
      setStep('reset');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: email.trim(),
        code,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success(res.data?.message || 'Password reset successfully.');
      router.push('/auth/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-container-lowest px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/auth/login" className="mb-8 inline-flex items-center text-sm font-bold text-primary hover:opacity-80">
          <span className="material-symbols-outlined mr-1 text-base">arrow_back</span>
          Back to login
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight">Reset password</h1>
          <p className="mt-3 text-on-surface-variant">
            {step === 'email'
              ? 'Enter your account email and NotExA will send a 6-digit reset code through SMTP.'
              : `Enter the 6-digit code sent to ${email}.`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={requestCode} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-on-surface">Email</span>
              <input
                className="w-full rounded-2xl bg-surface-container-low px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-primary/20"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@email.com"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-on-surface">6-digit code</span>
              <input
                className="w-full rounded-2xl bg-surface-container-low px-4 py-4 text-center text-2xl font-black tracking-[0.35em] outline-none focus:ring-2 focus:ring-primary/20"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-on-surface">New password</span>
              <input
                className="w-full rounded-2xl bg-surface-container-low px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-primary/20"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-on-surface">Confirm password</span>
              <input
                className="w-full rounded-2xl bg-surface-container-low px-4 py-4 font-medium outline-none focus:ring-2 focus:ring-primary/20"
                type="password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface-variant"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

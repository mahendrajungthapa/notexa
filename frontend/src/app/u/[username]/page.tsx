'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, ExternalLink, UserPlus } from 'lucide-react';
import { publicApi } from '@/services/api';

type PublicProfile = {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  institution: string | null;
  joined_at: string;
};

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = useMemo(() => decodeURIComponent(String(params.username || '')).replace(/^@/, ''), [params.username]);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileUrl, setProfileUrl] = useState('');

  useEffect(() => {
    setProfileUrl(window.location.href);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await publicApi.profile(username);
        if (!mounted) return;
        setProfile(response.data?.data || null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Profile not found.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (username) loadProfile();
    return () => {
      mounted = false;
    };
  }, [username]);

  const copyProfileLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied');
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-xl">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition">
          <ArrowLeft size={16} /> Notexa
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="space-y-5">
              <div className="h-24 w-24 rounded-[0.625rem] bg-slate-100 animate-pulse" />
              <div className="space-y-3">
                <div className="h-7 w-48 rounded bg-slate-100 animate-pulse" />
                <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                <div className="h-4 w-64 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          ) : error || !profile ? (
            <div className="text-center py-10">
              <h1 className="text-2xl font-black text-slate-900">Profile not found</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">{error || 'This profile link is no longer available.'}</p>
              <Link href="/auth/login" className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition">
                Sign in to Notexa
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                <div className="h-24 w-24 overflow-hidden rounded-[0.625rem] bg-indigo-100 text-indigo-700 shadow-sm flex items-center justify-center text-3xl font-black shrink-0">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-black text-slate-950 break-words">{profile.name}</h1>
                  <p className="mt-1 text-sm font-mono font-bold text-indigo-700">@{profile.username}</p>
                  {profile.institution && (
                    <p className="mt-3 text-sm font-semibold text-slate-500">{profile.institution}</p>
                  )}
                  <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Joined {new Date(profile.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">Profile link</span>
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block break-all text-xs font-semibold text-indigo-950 underline decoration-indigo-300 underline-offset-4 visited:text-purple-700"
                >
                  {profileUrl}
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={copyProfileLink}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Copy size={16} /> Copy
                </button>
                <Link
                  href={`/dashboard/friends?username=${encodeURIComponent(profile.username)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition"
                >
                  <UserPlus size={16} /> Add Friend
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <ExternalLink size={16} /> Open
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

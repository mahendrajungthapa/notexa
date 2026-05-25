'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CalendarDays, Copy, ExternalLink, GraduationCap, Share2, ShieldCheck, UserPlus } from 'lucide-react';
import { publicApi } from '@/services/api';
import AuthHeader from '@/components/AuthHeader';
import SiteFooter from '@/components/SiteFooter';

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
    <>
    <AuthHeader />
    <main className="min-h-screen bg-[#f8f9ff] px-4 py-24 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          {loading ? (
            <div className="p-6 sm:p-10">
              <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="-mt-10 flex flex-col gap-5 sm:flex-row sm:items-end">
                <div className="h-28 w-28 rounded-3xl bg-slate-200 ring-4 ring-white animate-pulse" />
                <div className="flex-1 space-y-3 pb-2">
                  <div className="h-8 w-52 rounded bg-slate-100 animate-pulse" />
                  <div className="h-4 w-36 rounded bg-slate-100 animate-pulse" />
                  <div className="h-4 w-72 max-w-full rounded bg-slate-100 animate-pulse" />
                </div>
              </div>
            </div>
          ) : error || !profile ? (
            <div className="px-6 py-20 text-center sm:px-10">
              <h1 className="text-2xl font-black text-slate-900">Profile not found</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">{error || 'This profile link is no longer available.'}</p>
              <Link href="/auth/login" className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition">
                Sign in to Notexa
              </Link>
            </div>
          ) : (
            <div>
              <div className="relative bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-12">
                <div className="max-w-3xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-100">
                    <ShieldCheck size={13} /> NotExA Public Profile
                  </span>
                  <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">{profile.name}</h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                    Connect, collaborate, and share study work with this NotExA member.
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 sm:px-10 sm:pb-10">
                <div className="-mt-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-indigo-100 text-4xl font-black text-indigo-700 ring-4 ring-white shadow-xl">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                      ) : (
                        profile.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="pt-1">
                      <p className="font-mono text-sm font-black text-indigo-700">@{profile.username}</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                          <CalendarDays size={14} className="text-indigo-500" />
                          Joined {new Date(profile.joined_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                        {profile.institution && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                            <GraduationCap size={14} className="text-indigo-500" />
                            {profile.institution}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:w-56">
                    <Link
                      href={`/dashboard/friends?username=${encodeURIComponent(profile.username)}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
                    >
                      <UserPlus size={16} /> Add Friend
                    </Link>
                    <button
                      type="button"
                      onClick={copyProfileLink}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Copy size={16} /> Copy Profile
                    </button>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                      <Share2 size={17} className="text-indigo-600" />
                      Public profile link
                    </div>
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block break-all rounded-2xl border border-indigo-100 bg-white p-4 text-sm font-bold text-indigo-900 underline decoration-indigo-200 underline-offset-4 transition visited:text-purple-700 hover:bg-indigo-50"
                    >
                      {profileUrl}
                    </a>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next step</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                      Sign in to send a friend request and start sharing notes or files.
                    </p>
                    <Link
                      href="/auth/login"
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <ExternalLink size={16} /> Open NotExA
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
    <SiteFooter />
    </>
  );
}

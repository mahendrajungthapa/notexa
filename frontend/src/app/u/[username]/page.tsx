'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CalendarDays, Copy, ExternalLink, GraduationCap, Share2, ShieldCheck, UserPlus, Users } from 'lucide-react';
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
        if (mounted) setProfile(response.data?.data || null);
      } catch (err: any) {
        if (mounted) setError(err.response?.data?.message || 'Profile not found.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (username) loadProfile();
    return () => { mounted = false; };
  }, [username]);

  const copyProfileLink = async () => {
    await navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied');
  };

  return (
    <>
      <AuthHeader />
      <main className="min-h-screen bg-[#f8f9ff] px-4 py-24 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">
          {loading ? (
            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mx-auto h-28 w-28 rounded-3xl bg-slate-100 animate-pulse" />
                <div className="mt-6 space-y-3">
                  <div className="mx-auto h-8 w-48 rounded bg-slate-100 animate-pulse" />
                  <div className="mx-auto h-4 w-32 rounded bg-slate-100 animate-pulse" />
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-10 w-64 rounded bg-slate-100 animate-pulse" />
                <div className="mt-6 h-28 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="mt-4 h-28 rounded-2xl bg-slate-100 animate-pulse" />
              </div>
            </div>
          ) : error || !profile ? (
            <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm sm:px-10">
              <h1 className="text-2xl font-black text-slate-900">Profile not found</h1>
              <p className="mt-2 text-sm font-medium text-slate-500">{error || 'This profile link is no longer available.'}</p>
              <Link href="/auth/login" className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition">
                Sign in to NotExA
              </Link>
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[360px_1fr] lg:items-start">
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <div className="bg-slate-950 px-6 py-8 text-white">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-100">
                    <ShieldCheck size={13} /> Public Profile
                  </span>
                </div>

                <div className="px-6 pb-6 text-center">
                  <div className="-mt-12 mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-indigo-100 text-4xl font-black text-indigo-700 ring-4 ring-white shadow-xl">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
                    ) : (
                      profile.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <h1 className="mt-5 break-words text-3xl font-black tracking-tight text-slate-950">{profile.name}</h1>
                  <p className="mt-1 font-mono text-sm font-black text-indigo-700">@{profile.username}</p>

                  <div className="mt-5 space-y-2 text-left">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                      <CalendarDays size={16} className="text-indigo-500" />
                      Joined {new Date(profile.joined_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </div>
                    {profile.institution && (
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                        <GraduationCap size={16} className="text-indigo-500" />
                        <span className="min-w-0 truncate">{profile.institution}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 grid gap-2">
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
                      <Copy size={16} /> Copy Profile Link
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-7 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">NotExA Network</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                      Collaborate with {profile.name.split(' ')[0] || profile.name}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                      Use this public profile to connect, send a friend request, and start sharing notes or files inside NotExA.
                    </p>
                  </div>
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Users size={22} />
                  </div>
                </div>

                <div className="mt-7 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5">
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

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ['1', 'Add as friend', 'Send a request from this profile.'],
                    ['2', 'Share safely', 'Exchange notes and files only after connecting.'],
                    ['3', 'Work together', 'Use realtime collaboration on shared notes.'],
                  ].map(([step, title, description]) => (
                    <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-black text-indigo-600 shadow-sm">{step}</span>
                      <h3 className="mt-3 text-sm font-black text-slate-900">{title}</h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/dashboard/friends?username=${encodeURIComponent(profile.username)}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
                  >
                    <UserPlus size={16} /> Add Friend
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ExternalLink size={16} /> Open NotExA
                  </Link>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

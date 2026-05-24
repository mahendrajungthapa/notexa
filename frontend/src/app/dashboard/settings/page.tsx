'use client';

import { useState, useRef, useEffect } from 'react';
import { authApi, notesApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';
import { User, Lock, Save, Share, Pencil, Mail, Building2, GraduationCap, FileText, CheckCircle2, Sparkles, KeyRound, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [institution, setInstitution] = useState('NotExA Academy');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [passwords, setPasswords] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [changingPw, setChangingPw] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const accountInfoRef = useRef<HTMLDivElement>(null);
  const displayNameInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Stats State
  const [stats, setStats] = useState<{ notesCreated: number | null; notesShared: number | null }>({
    notesCreated: null,
    notesShared: null
  });
  const [recentActivity, setRecentActivity] = useState<any[] | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);

  // 10-Minute Streak Tracker
  const [sessionTime, setSessionTime] = useState(0);
  const [streakEarned, setStreakEarned] = useState(false);
  const REQUIRED_MINUTES = 10;

  useEffect(() => {
    const updateUI = () => {
      const dateStr = new Date().toDateString();
      const storedDate = localStorage.getItem('notexa_streak_date');
      if (storedDate === dateStr) {
        setSessionTime(parseInt(localStorage.getItem('notexa_session_time') || '0', 10));
        setStreakEarned(localStorage.getItem('notexa_streak_earned') === 'true');
      }
    };

    updateUI();
    const timer = setInterval(updateUI, 1000);

    const handleEarned = () => {
      setStreakEarned(true);
    };

    window.addEventListener('notexa_streak_updated', handleEarned);
    return () => {
      clearInterval(timer);
      window.removeEventListener('notexa_streak_updated', handleEarned);
    };
  }, []);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (typeof window !== 'undefined') {
      const savedInst = localStorage.getItem('user_institution');
      if ((user as any)?.institution) {
        setInstitution((user as any).institution);
      } else if (savedInst) {
        setInstitution(savedInst);
      }

      // Load or generate username
      if (user) {
        if (user.username) {
          setUsername(user.username);
          localStorage.setItem('notexa_username_' + user.id, user.username);
        } else {
          let stored = localStorage.getItem('notexa_username_' + user.id);
          if (!stored) {
            const base = user.name
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .trim()
              .split(/\s+/)
              .join('_');
            const suffix = String(user.id).slice(-4).padStart(4, '0');
            stored = `${base}_${suffix}`;
            localStorage.setItem('notexa_username_' + user.id, stored);
          }
          setUsername(stored);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        // Fetch real data to populate stats and activity
        const [createdRes, sharedRes] = await Promise.all([
          notesApi.list(),
          notesApi.sharedWithMe()
        ]);

        // Notes list is paginated: res.data.data.data = items, res.data.data.total = count
        const createdNotes = createdRes.data?.data?.data || createdRes.data?.data || [];
        const createdTotal = createdRes.data?.data?.total ?? createdRes.data?.meta?.total ?? createdNotes.length;

        const sharedNotes = sharedRes.data?.data?.data || sharedRes.data?.data || [];
        const sharedTotal = sharedRes.data?.data?.total ?? sharedRes.data?.meta?.total ?? sharedNotes.length;

        setStats({
          notesCreated: createdTotal,
          notesShared: sharedTotal
        });

        // Build recent activity from both created + received shared notes
        const createdActivity = (Array.isArray(createdNotes) ? createdNotes : []).map((note: any) => ({
          id: `created_${note.id}`,
          title: `Created note "${note.title}"`,
          date: note.created_at,
          displayDate: new Date(note.created_at).toLocaleDateString(),
          isPrimary: true
        }));

        const sharedActivity = (Array.isArray(sharedNotes) ? sharedNotes : []).map((note: any) => ({
          id: `shared_${note.id}`,
          title: `Received shared note "${note.title}"`,
          date: note.created_at,
          displayDate: new Date(note.created_at).toLocaleDateString(),
          isPrimary: false
        }));

        const merged = [...createdActivity, ...sharedActivity]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 8);

        if (merged.length === 0) {
          setRecentActivity([{ id: 'acc_created', title: 'Account created', displayDate: new Date(user?.created_at || Date.now()).toLocaleDateString(), isPrimary: false }]);
        } else {
          setRecentActivity(merged);
        }

      } catch (error) {
        console.error("Failed to fetch dynamic stats", error);
        setStats({ notesCreated: 0, notesShared: 0 });
        setRecentActivity([]);
      }
    };

    if (user) {
      fetchDynamicData();
    }
  }, [user]);

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentCached = typeof window !== 'undefined' ? localStorage.getItem('user_institution') : null;
    if (name === user?.name && institution === ((user as any)?.institution || currentCached || 'NotExA Academy')) return;

    setSaving(true);
    try {
      const res = await authApi.updateProfile({ name, institution } as any);
      const updatedUser = res.data?.data?.user || res.data?.user || res.data?.data;
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_institution', institution);
      }
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.password !== passwords.password_confirmation) { toast.error('Passwords do not match'); return; }
    setChangingPw(true);
    try {
      await authApi.changePassword(passwords);
      toast.success('Password changed successfully!');
      setPasswords({ current_password: '', password: '', password_confirmation: '' });
      setShowPasswordForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setChangingPw(false); }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      toast.success("Profile photo upload temporarily simulated.");
    }
  };

  const handleShareProfile = async () => {
    if (typeof window === 'undefined') return;

    const profileName = user?.name || 'Notexa user';
    const profileUsername = username ? `@${username}` : '';
    const shareText = `${profileName}${profileUsername ? ` (${profileUsername})` : ''} on Notexa`;
    const shareUrl = window.location.origin;

    try {
      if (navigator.share) {
        await navigator.share({ title: profileName, text: shareText, url: shareUrl });
        return;
      }

      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('Profile share details copied');
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        toast.error('Unable to share profile');
      }
    }
  };

  const handleEditProfileClick = () => {
    accountInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      displayNameInputRef.current?.focus();
      displayNameInputRef.current?.select();
    }, 350);
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>

        {/* Avatar */}
        <div className="relative shrink-0 group">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-[0.625rem] overflow-hidden border-[4px] border-white shadow-lg bg-surface-container-low">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3525cd&color=fff&size=200`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={triggerImageUpload}
            className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100 text-primary hover:bg-surface transition-colors hover:scale-105 active:scale-95"
          >
            <Pencil size={18} />
          </button>
          <input type="file" ref={fileInputRef} onChange={onImageChange} className="hidden" accept="image/*" />
        </div>

        {/* User Info */}
        <div className="flex-1 space-y-2 text-center sm:text-left mt-2 sm:mt-0">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <h1 className="text-3xl font-headline font-extrabold text-on-surface">{user?.name || 'Scholar'}</h1>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                <ShieldCheck size={12} /> Verified
              </span>
              <span className={`px-3 py-1 ${streakEarned ? 'bg-orange-100 text-orange-600 border border-orange-200 shadow-sm' : 'bg-surface-container text-outline-variant opacity-70'} text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1 transition-all duration-500`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={streakEarned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
                {streakEarned ? ((user as any)?.streak || 0) + 1 : ((user as any)?.streak || 0)} Day Streak
                {!streakEarned && (
                  <span className="ml-1 opacity-75 font-mono tracking-tighter">
                    ({Math.floor(sessionTime / 60)}:{String(sessionTime % 60).padStart(2, '0')})
                  </span>
                )}
              </span>
            </div>
          </div>
          <p className="text-sm text-outline font-mono font-semibold tracking-wide">@{username || '...'}</p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 pt-1 text-xs text-outline font-body">
            <span className="flex items-center gap-1.5"><Building2 size={14} /> {institution}</span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="flex items-center gap-1.5"><Mail size={14} /> {user?.email}</span>
          </div>
        </div>

        {/* Aesthetic Stats Counter Widget */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-50 border border-slate-100/60 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-all duration-300 shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl translate-x-1/3 -translate-y-1/3"></div>
          
          <div className="flex items-center gap-3 border-r border-slate-200/80 pr-4 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-primary flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created</p>
              <h4 className="text-lg font-headline font-black text-slate-800 leading-none mt-1">
                {stats.notesCreated === null ? <div className="h-5 w-8 bg-slate-200 animate-pulse rounded"></div> : stats.notesCreated}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Share size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shared</p>
              <h4 className="text-lg font-headline font-black text-slate-800 leading-none mt-1">
                {stats.notesShared === null ? <div className="h-5 w-8 bg-slate-200 animate-pulse rounded"></div> : stats.notesShared}
              </h4>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            type="button"
            onClick={handleShareProfile}
            className="w-full px-5 py-2.5 rounded-xl border-2 border-outline-variant/30 font-bold text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
          >
            <Share size={16} /> Share Profile
          </button>
          <button
            type="button"
            onClick={handleEditProfileClick}
            className="w-full px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-[#291eb0] transition-colors flex items-center justify-center gap-2"
          >
            <Pencil size={16} /> Edit Profile
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0">

        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">

          {/* Account Information */}
          <div ref={accountInfoRef} id="account-info" className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm scroll-mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary-fixed rounded-xl text-primary"><User size={20} /></div>
              <h2 className="text-xl font-headline font-bold text-on-surface">Account Information</h2>
            </div>

            <form onSubmit={handleProfile}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest pl-1">Display Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      ref={displayNameInputRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-surface border border-gray-100 rounded-xl font-semibold text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest pl-1">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full pl-10 pr-4 py-3 bg-surface-container-low border-none rounded-xl font-semibold text-sm text-on-surface-variant cursor-not-allowed opacity-70"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest pl-1">Institution</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="University/College"
                      className="w-full pl-10 pr-4 py-3 bg-surface border border-gray-100 rounded-xl font-semibold text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {(name !== user?.name || institution !== ((user as any)?.institution || 'NotExA Academy')) && (
                <div className="mt-8 flex justify-end animate-in fade-in slide-in-from-bottom-2">
                  <button type="submit" disabled={saving} className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 flex items-center gap-2 hover:bg-[#291eb0] transition-all">
                    <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </form>

            <div className={`mt-10 ${showPasswordForm ? 'pb-0 border-b-0' : 'pb-0'} pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all`}>
              <div>
                <h3 className="text-base font-bold text-on-surface">Security</h3>
                <p className="text-xs font-medium text-on-surface-variant">Update your password to secure your account.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-primary text-sm font-bold hover:underline py-1 flex items-center gap-1.5"
              >
                <KeyRound size={14} />
                {showPasswordForm ? 'Hide Security Settings' : 'Update Security Settings'}
              </button>
            </div>

            {/* Password Form Slide-down */}
            {showPasswordForm && (
              <form onSubmit={handlePassword} className="mt-5 p-5 bg-surface-container-lowest border border-gray-100 rounded-[1.5rem] space-y-4 animate-in fade-in slide-in-from-top-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-outline tracking-wider pl-1">CURRENT PASSWORD</label>
                    <input type="password" required value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-surface border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-medium outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-outline tracking-wider pl-1">NEW PASSWORD</label>
                    <input type="password" required value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-surface border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-medium outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-outline tracking-wider pl-1">CONFIRM PASSWORD</label>
                    <input type="password" required value={passwords.password_confirmation} onChange={(e) => setPasswords({ ...passwords, password_confirmation: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-surface border-none rounded-xl focus:ring-2 focus:ring-primary/20 font-medium outline-none" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={changingPw} className="px-5 py-2.5 text-sm bg-on-surface text-surface rounded-xl font-bold hover:bg-on-surface-variant transition-colors flex items-center gap-2">
                    <Lock size={14} /> {changingPw ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-6 flex flex-col h-full">

          {/* Academic Portfolio Tracker Card */}
          <Link href="/dashboard/notes" className="block">
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20 group cursor-pointer hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all">
              <div className="absolute -top-4 -right-4 p-6 opacity-20 transform rotate-12 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-500"><Sparkles size={100} /></div>
              <div className="relative z-10 block">
                <div className="flex justify-between items-start mb-5">
                  <span className="inline-flex px-2.5 py-1 bg-white/20 rounded-full text-[9px] font-bold tracking-widest uppercase backdrop-blur-md border border-white/10">
                    Scholar Access
                  </span>
                  <GraduationCap className="text-white/80" size={20} />
                </div>
                <h2 className="text-3xl font-headline font-black mb-3 tracking-tight drop-shadow-sm">Academic Workspace</h2>
                <p className="text-white/85 font-medium mb-6 leading-relaxed text-xs">
                  Your academic account has full, unrestricted access to the NotExA study suite.
                </p>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="text-white" size={12} />
                    </div>
                    <span className="font-semibold text-white/95 text-xs">Unlimited Cloud Storage</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="text-white" size={12} />
                    </div>
                    <span className="font-semibold text-white/95 text-xs">ADHD DopaCompanion Boosters</span>
                  </li>
                </ul>

                <button className="w-full py-3 bg-white text-indigo-700 rounded-xl text-sm font-bold shadow-md hover:bg-slate-50 transition-colors">
                  Go to Notebooks
                </button>
              </div>
            </div>
          </Link>

          {/* Recent Activity Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex-1">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-base font-headline font-bold text-on-surface">Recent Activity</h3>
            </div>

            <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-0 before:left-2 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-outline-variant/40 before:to-transparent pl-7">
              {recentActivity === null ? (
                // Loading Skeletons
                <>
                  <div className="relative animate-pulse">
                    <div className="absolute -left-[31px] w-2.5 h-2.5 bg-outline-variant/50 rounded-full mt-1"></div>
                    <div className="h-4 bg-surface-container-high rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-surface-container-high rounded w-1/3"></div>
                  </div>
                  <div className="relative animate-pulse">
                    <div className="absolute -left-[31px] w-2.5 h-2.5 bg-outline-variant/50 rounded-full mt-1"></div>
                    <div className="h-4 bg-surface-container-high rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-surface-container-high rounded w-1/4"></div>
                  </div>
                </>
              ) : (
                (showAllActivity ? recentActivity : recentActivity.slice(0, 2)).map((activity, i) => (
                  <div key={activity.id + i} className={`relative ${!activity.isPrimary ? 'opacity-60' : ''}`}>
                    <div className={`absolute -left-[31px] w-2.5 h-2.5 rounded-full border-[2.5px] border-white shadow-sm mt-1 ${activity.isPrimary ? 'bg-primary' : 'bg-outline-variant'}`}></div>
                    <p className="font-bold text-on-surface text-xs leading-snug break-words">{activity.title}</p>
                    <p className="text-[10px] font-semibold text-outline mt-1">{activity.displayDate}</p>
                  </div>
                ))
              )}
            </div>
            {recentActivity && recentActivity.length > 3 && (
              <button
                onClick={() => setShowAllActivity(!showAllActivity)}
                className="mt-4 w-full text-center text-xs font-bold text-primary hover:underline py-1 transition-colors"
              >
                {showAllActivity ? 'View Less ↑' : `View More (${recentActivity.length - 2} more) ↓`}
              </button>
            )}
            <div className="hidden">
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

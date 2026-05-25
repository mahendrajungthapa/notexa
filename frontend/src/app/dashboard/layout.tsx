'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/contexts/authStore';
import { authApi, filesApi, friendsApi, notesApi, publicApi } from '@/services/api';
import { countUnseenIds, NAV_BADGES_REFRESH_EVENT } from '@/lib/nav-badge-state';
import {
  FileText, Users, Share2, FolderOpen, Settings,
  LogOut, LayoutDashboard, Menu, X, KeyRound, ChevronLeft, ChevronRight, Heart, Trash2, MailCheck
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const userNav = [
  { href: '/dashboard/notes', label: 'My Notes', icon: FileText },
  { href: '/dashboard/shared', label: 'Shared with Me', icon: Share2 },
  { href: '/dashboard/friends', label: 'Friends', icon: Users },
  { href: '/dashboard/files', label: 'My Files', icon: FolderOpen },
  { href: '/dashboard/trash', label: 'Trash', icon: Trash2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/reedem', label: 'Redeem Share Code', icon: KeyRound },
];

const settingEnabled = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout, setUser, setAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [navBadges, setNavBadges] = useState<Record<string, number>>({});
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationBusy, setVerificationBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notexa_sidebar_collapsed') === 'true';
      setIsCollapsed(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const syncSidebarMode = () => {
      if (desktopQuery.matches) setSidebarOpen(false);
    };

    syncSidebarMode();
    desktopQuery.addEventListener('change', syncSidebarMode);
    return () => desktopQuery.removeEventListener('change', syncSidebarMode);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('notexa_sidebar_collapsed', next.toString());
    }
  };

  const [isPookie, setIsPookie] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notexa_pookie_mode') === 'true';
      setIsPookie(saved);
    }
  }, []);

  const togglePookie = () => {
    const next = !isPookie;
    setIsPookie(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('notexa_pookie_mode', next.toString());
    }
    if (next) {
      toast.success("🌸 Pookie Mode Activated! Stay cute, study hard! ✨🧸", { icon: '🎀', duration: 4000 });
    } else {
      toast("Deactivated Pookie Mode", { icon: '🧸' });
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      setEmailVerificationEnabled(false);
      return;
    }

    let ignore = false;
    publicApi.settings()
      .then((res) => {
        if (!ignore) {
          const payload = res.data?.data || {};
          setEmailVerificationEnabled(settingEnabled(payload.email_verification_enabled));
        }
      })
      .catch(() => {
        if (!ignore) setEmailVerificationEnabled(false);
      });

    return () => { ignore = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const refreshBadges = async () => {
      try {
        const [requestsRes, sharedNotesRes, sharedFilesRes] = await Promise.all([
          friendsApi.pendingRequests(),
          notesApi.sharedWithMe({ per_page: 100 }),
          filesApi.sharedWithMe({ per_page: 100 }),
        ]);

        const receivedRequests = requestsRes.data?.data?.received || [];
        const sharedNotes = sharedNotesRes.data?.data?.data || [];
        const sharedFiles = sharedFilesRes.data?.data?.data || sharedFilesRes.data?.data || [];

        setNavBadges({
          '/dashboard/friends': countUnseenIds(user.id, 'friend_requests', receivedRequests.map((request: any) => request.id)),
          '/dashboard/shared': countUnseenIds(user.id, 'shared_notes', sharedNotes.map((note: any) => note.id)),
          '/dashboard/files': countUnseenIds(user.id, 'shared_files', sharedFiles.map((file: any) => file.id)),
        });
      } catch {
        // Badge counts are helpful, but should never block navigation.
      }
    };

    void refreshBadges();
    const timer = window.setInterval(refreshBadges, 30000);
    window.addEventListener(NAV_BADGES_REFRESH_EVENT, refreshBadges);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NAV_BADGES_REFRESH_EVENT, refreshBadges);
    };
  }, [isAuthenticated, user?.id]);

  // Global Streak Tracker
  useEffect(() => {
    if (!isAuthenticated) return;

    const REQUIRED_MINUTES = 10;
    const dateStr = new Date().toDateString();
    const storedDate = localStorage.getItem('notexa_streak_date');
    let sessionTime = parseInt(localStorage.getItem('notexa_session_time') || '0', 10);

    // Reset daily
    if (storedDate !== dateStr) {
      localStorage.setItem('notexa_streak_date', dateStr);
      localStorage.setItem('notexa_session_time', '0');
      localStorage.setItem('notexa_streak_earned', 'false');
      sessionTime = 0;
    }

    const syncStreak = async (showToast: boolean) => {
      try {
        const res = await authApi.completeStreak();
        const updatedUser = res.data?.data?.user || res.data?.user;
        if (updatedUser) setUser(updatedUser);
        if (showToast) {
          toast.success("Awesome! You've studied for 10 minutes today. Streak updated!", { duration: 5000, id: 'global-streak-toast' });
        }
        window.dispatchEvent(new CustomEvent('notexa_streak_updated', { detail: { user: updatedUser } }));
      } catch {
        if (showToast) {
          toast.error('Focus time completed, but the streak could not sync yet.', { id: 'global-streak-toast' });
        }
        window.dispatchEvent(new Event('notexa_streak_updated'));
      }
    };

    if (localStorage.getItem('notexa_streak_earned') === 'true') {
      void syncStreak(false);
    }

    const timer = setInterval(() => {
      sessionTime += 1;
      localStorage.setItem('notexa_session_time', sessionTime.toString());

      const earned = localStorage.getItem('notexa_streak_earned') === 'true';
      if (sessionTime >= REQUIRED_MINUTES * 60 && !earned) {
        localStorage.setItem('notexa_streak_earned', 'true');
        void syncStreak(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, setUser]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const mustVerifyEmail = emailVerificationEnabled && user?.role !== 'admin' && !user?.email_verified_at;

  const handleVerifyLoggedInEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.email) return;
    if (verificationCode.length !== 6) {
      toast.error('Enter the 6-digit verification code.');
      return;
    }

    setVerificationBusy(true);
    try {
      const res = await authApi.verifyEmailCode({ email: user.email, code: verificationCode });
      const updatedUser = res.data?.data?.user || res.data?.user;
      const token = res.data?.data?.token || res.data?.token;

      if (updatedUser && token) {
        setAuth(updatedUser, token);
      } else if (updatedUser) {
        setUser(updatedUser);
      } else {
        const me = await authApi.me();
        const refreshedUser = me.data?.data?.user || me.data?.user;
        if (refreshedUser) setUser(refreshedUser);
      }

      setVerificationCode('');
      toast.success(res.data?.message || 'Email verified successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not verify email code.');
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleResendLoggedInVerification = async () => {
    if (!user?.email) return;
    setVerificationBusy(true);
    try {
      const res = await authApi.resendVerification(user.email);
      setVerificationCode('');
      toast.success(res.data?.message || 'Verification code sent.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not send verification code.');
    } finally {
      setVerificationBusy(false);
    }
  };

  const sidebarCollapsed = isCollapsed && !sidebarOpen;

  return (
    <div className={`flex h-screen overflow-hidden bg-gray-50 ${isPookie ? 'pookie-mode' : ''}`}>
      {/* Mobile overlay / backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 bg-white border-r border-slate-100/60
        transform transition-[transform,width] duration-300 ease-out lg:transform-none shadow-[2px_0_24px_-12px_rgba(0,0,0,0.06)] shrink-0 h-full
        w-[min(18rem,calc(100vw-1.5rem))] ${sidebarCollapsed ? 'lg:w-[88px]' : 'lg:w-64'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Floating Collapse Toggle on Sidebar Border */}
        <button
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 hidden lg:flex items-center justify-center w-10 h-10 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full shadow-md cursor-pointer z-50 sidebar-collapse-btn transition-colors duration-200"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
        </button>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className={`flex items-center shrink-0 border-b border-slate-50 py-6 transition-all duration-300 ${sidebarCollapsed ? 'lg:justify-center lg:px-2 px-6 justify-between' : 'justify-between px-6'}`}>
            <Link href="/dashboard/notes" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-300 shrink-0">
                <FileText size={20} className="text-white" strokeWidth={2.5} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors animate-fade-in shrink-0">NotExA</span>
              )}
            </Link>

            {/* Mobile Close Button */}
            <button className="lg:hidden text-slate-400 hover:bg-slate-50 p-2 rounded-xl transition-colors shrink-0" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* User info */}
          <div className={`px-4 pb-4 mt-5 shrink-0 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center rounded-[1.25rem] bg-white border border-slate-100/80 shadow-sm hover:shadow-md hover:border-indigo-100/50 transition-all duration-300 cursor-pointer group overflow-hidden ${sidebarCollapsed ? 'p-2 justify-center' : 'p-4 gap-4'}`}>
              <div className="w-10 h-10 bg-indigo-100/80 text-indigo-700 rounded-[0.85rem] flex items-center justify-center font-bold text-base shadow-inner shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors flex items-center gap-1.5">
                    {user?.name || 'Scholar'}
                  </p>
                  <p className="text-xs font-bold text-slate-400 truncate lowercase mt-0.5">{user?.email || 'User'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-2.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {userNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const badgeCount = navBadges[item.href] || 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-2xl text-sm font-extrabold tracking-wide transition-all duration-300 group ${sidebarCollapsed ? 'justify-center p-3' : 'gap-4 px-5 py-3.5'} ${isActive
                    ? 'bg-indigo-50/80 text-indigo-700 shadow-[0_2px_10px_-4px_rgba(79,70,229,0.2)] border border-indigo-100/50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent hover:border-slate-100/50'
                    }`}
                >
                  <span className="relative shrink-0">
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                    {badgeCount > 0 && (
                      <span className="absolute -right-2.5 -top-2.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </span>
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}

            {/* Admin link */}
            {user?.role === 'admin' && (
              <>
                <div className="border-t border-slate-100/60 my-5 mx-2" />
                <Link
                  href="/admin/analytics"
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? "Admin Panel" : undefined}
                  className={`flex items-center rounded-2xl text-sm font-extrabold tracking-wide transition-all duration-300 group ${sidebarCollapsed ? 'justify-center p-3' : 'gap-4 px-5 py-3.5'} ${pathname.startsWith('/admin')
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                    }`}
                >
                  <LayoutDashboard size={20} strokeWidth={2} className="shrink-0 text-red-500" />
                  {!sidebarCollapsed && <span>Admin Panel</span>}
                </Link>
              </>
            )}

            {/* Logout moved explicitly below the nav links aesthetically */}
            <div className="border-t border-slate-100/60 my-5 mx-2" />
            <button
              onClick={handleLogout}
              title={sidebarCollapsed ? "Sign Out" : undefined}
              className={`flex items-center rounded-2xl text-sm font-extrabold tracking-wide text-slate-500 hover:bg-red-50 hover:text-red-700 hover:border-red-100 border border-transparent transition-all duration-300 group mb-6 ${sidebarCollapsed ? 'justify-center p-3 w-fit mx-auto' : 'gap-4 px-5 py-3.5 w-full'}`}
            >
              <LogOut size={20} strokeWidth={2} className="shrink-0 text-slate-400 group-hover:text-red-500 transition-colors duration-300" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
            {/* Sidebar Controls Footer */}
            <div className="mt-auto border-t border-slate-100/60 p-4 shrink-0 bg-white flex items-center justify-center transition-all duration-300">
              {/* Pookie Button */}
              <button
                onClick={togglePookie}
                className={`flex items-center justify-center transition-all duration-300 border
                  ${sidebarCollapsed ? 'w-11 h-11 rounded-full px-0' : 'px-3.5 py-2.5 rounded-xl gap-2 text-xs font-bold w-full'}
                  ${isPookie 
                    ? 'bg-pink-100 text-pink-600 border-pink-200 hover:bg-pink-200 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:text-pink-500 hover:bg-pink-50/50 hover:border-pink-200'
                }`}
                title={isPookie ? "Deactivate Pookie Mode 🧸" : "Activate Pookie Mode! ✨🎀"}
              >
                <Heart size={sidebarCollapsed ? 18 : 14} className={`${isPookie ? 'fill-pink-500 text-pink-600 animate-pulse' : ''}`} strokeWidth={2.5} />
                {!sidebarCollapsed && <span className="truncate">Pookie Mode</span>}
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar for mobile */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 focus:outline-none" aria-label="Open sidebar" aria-expanded={sidebarOpen}>
            <Menu size={24} />
          </button>
          <span className="font-bold text-gray-900">NotExA</span>
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/50">
          <div className="mx-auto max-w-[1400px] w-full p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {isPookie && <PookieStickers />}

      {mustVerifyEmail && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleVerifyLoggedInEmail}
            className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <MailCheck size={28} strokeWidth={2.5} />
            </div>
            <div className="mt-5 text-center">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Verify your email</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Email verification is enabled for users. Enter the 6-digit code sent to {user?.email}, or send a new code.
              </p>
            </div>

            <input
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[0.45em] text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              placeholder="000000"
            />

            <button
              type="submit"
              disabled={verificationBusy || verificationCode.length !== 6}
              className="mt-5 flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verificationBusy ? 'Checking...' : 'Verify Email'}
            </button>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleResendLoggedInVerification}
                disabled={verificationBusy}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Send Code
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Quicksand:wght@300..700&family=Pacifico&display=swap');

        /* Persistent Pookie Accents Override */
        .pookie-mode {
          --indigo-600: #ff69b4 !important; /* Hot Pink */
          --indigo-700: #db2777 !important; /* Deep Pink */
          --indigo-500: #f472b6 !important; /* Pink */
          --indigo-100: #ffd1dc !important; /* Pastel Pink */
          --indigo-50: #fff0f5 !important; /* Lavender Blush */
          font-family: 'Fredoka', 'Quicksand', sans-serif !important;
        }

        /* Ultimate Girly Aesthetics Overrides */
        .pookie-mode, 
        .pookie-mode main, 
        .pookie-mode .bg-gray-50, 
        .pookie-mode .bg-gray-50\/50, 
        .pookie-mode .bg-slate-50, 
        .pookie-mode .bg-slate-50\/50 {
          background: linear-gradient(135deg, #fff5f8 0%, #ffd6e8 100%) !important;
        }

        /* Pink tone for both vertical sidebar and horizontal mobile header in Pookie Mode */
        .pookie-mode aside,
        .pookie-mode header,
        .pookie-mode header.lg\:hidden,
        .pookie-mode aside .bg-white,
        .pookie-mode aside .bg-slate-50\/20,
        .pookie-mode aside .bg-slate-50\/50 {
          background-color: #fff0f5 !important; /* Soft pink tone */
          border-color: #ffd1dc !important;
        }

        .pookie-mode aside {
          border-right: 4px solid #ffd1dc !important;
          box-shadow: 4px 0 24px rgba(255, 105, 180, 0.12) !important;
        }

        /* Soft Bubbly Cards & Containers - No Oval Distortions! */
        .pookie-mode aside,
        .pookie-mode .bg-white, 
        .pookie-mode .bg-white\/80,
        .pookie-mode .rounded-xl,
        .pookie-mode .rounded-2xl,
        .pookie-mode .rounded-3xl,
        .pookie-mode .rounded-[1.25rem],
        .pookie-mode [class*="rounded-["] {
          border-radius: 32px !important;
          border-color: #ffd1dc !important;
        }

        .pookie-mode .bg-white, 
        .pookie-mode .bg-white\/80 {
          background-color: rgba(255, 255, 255, 0.96) !important;
          border: 3px dashed #ffd1dc !important;
          box-shadow: 0 12px 30px rgba(255, 105, 180, 0.15) !important;
          transition: transform 0.3s ease, box-shadow 0.3s ease !important;
        }

        /* Cursive titles and headers */
        .pookie-mode h1, 
        .pookie-mode h2, 
        .pookie-mode h3 {
          font-family: 'Fredoka', 'Quicksand', sans-serif !important;
          color: #db2777 !important;
          font-weight: 700 !important;
        }

        .pookie-mode h1::before, 
        .pookie-mode h2::before {
          content: "🎀 " !important;
        }

        .pookie-mode h1::after, 
        .pookie-mode h2::after {
          content: " ✨" !important;
        }

        /* Soft rose gold and berry typography */
        .pookie-mode p,
        .pookie-mode .text-slate-800, 
        .pookie-mode .text-slate-900, 
        .pookie-mode .text-gray-900 {
          color: #9d174d !important;
        }

        .pookie-mode .text-slate-500, 
        .pookie-mode .text-slate-600, 
        .pookie-mode .text-gray-600,
        .pookie-mode .text-slate-700 {
          color: #be185d !important;
        }

        .pookie-mode .text-slate-400, 
        .pookie-mode .text-gray-400 {
          color: #f472b6 !important;
        }

        /* Sweet Bubbly Forms and Inputs - Perfect Pill Shapes */
        .pookie-mode input:not(.note-title-input), 
        .pookie-mode select {
          background-color: #fffafc !important;
          border: 2px solid #ffd1dc !important;
          border-radius: 9999px !important;
          color: #9d174d !important;
          transition: all 0.3s ease !important;
        }

        .pookie-mode textarea {
          background-color: #fffafc !important;
          border: 2px solid #ffd1dc !important;
          border-radius: 24px !important;
          color: #9d174d !important;
          padding: 1rem !important;
          transition: all 0.3s ease !important;
        }

        .pookie-mode input:not(.note-title-input):focus, 
        .pookie-mode textarea:focus, 
        .pookie-mode select:focus {
          border-color: #ff69b4 !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(255, 105, 180, 0.2) !important;
          outline: none !important;
        }

        /* Sweet playful micro-animations for Buttons and Nav Links */
        .pookie-mode button, 
        .pookie-mode nav a,
        .pookie-mode .rounded-full {
          border-radius: 9999px !important;
        }

        .pookie-mode button,
        .pookie-mode a,
        .pookie-mode .cursor-pointer {
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }

        .pookie-mode button:hover, 
        .pookie-mode a:hover,
        .pookie-mode .cursor-pointer:hover {
          transform: scale(1.04) rotate(0.8deg) !important;
          box-shadow: 0 8px 20px rgba(255, 105, 180, 0.2) !important;
        }

        .pookie-mode button:active, 
        .pookie-mode a:active {
          transform: scale(0.96) rotate(-0.5deg) !important;
        }

        /* Keep the collapse button completely static on hover/click with absolutely zero rotation or scaling to prevent jitter */
        .pookie-mode .sidebar-collapse-btn,
        .pookie-mode .sidebar-collapse-btn:hover,
        .pookie-mode .sidebar-collapse-btn:active {
          transform: translate(50%, -50%) scale(1) rotate(0deg) !important;
          transition: background-color 0.2s ease, border-color 0.2s ease !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
        }


        /* Floating sticker keyframe animation */
        @keyframes pookieFloat {
          0% {
            transform: translateY(0) rotate(0deg) scale(0.8);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          90% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-115vh) rotate(360deg) scale(1.2);
            opacity: 0;
          }
        }
        .animate-pookie-float {
          animation-name: pookieFloat;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
}

// Floating Pookie Stickers Animation Engine
function PookieStickers() {
  const emojis = ['🐹', '🎀', '🌸', '🧸', '🦄', '🍡', '🍭', '💖', '🧁', '👑', '✨', '🐾', '🐱', '🐰', '🍌', '💛'];
  const [sprites, setSprites] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSprites((prev) => [
        ...prev.slice(-25), // keep max 25 sprites on screen
        {
          id: Math.random(),
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          left: Math.random() * 100, // random X position (%)
          size: Math.random() * 24 + 18, // random font size (18px to 42px)
          duration: Math.random() * 8 + 6, // duration (6s to 14s)
          delay: Math.random() * 2, // animation delay
        }
      ]);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {sprites.map((s) => (
        <span
          key={s.id}
          className="absolute bottom-[-60px] animate-pookie-float select-none filter drop-shadow-sm"
          style={{
            left: `${s.left}%`,
            fontSize: `${s.size}px`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}

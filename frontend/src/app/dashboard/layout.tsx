'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/contexts/authStore';
import { notesApi } from '@/services/api';
import toast from 'react-hot-toast';
import { FileText, Users, Share2, FolderOpen, Crown, Settings, LogOut, LayoutDashboard, Menu, X, KeyRound } from 'lucide-react';

const nav = [
  { href: '/dashboard/notes', label: 'My Notes', icon: FileText },
  { href: '/dashboard/shared', label: 'Shared with Me', icon: Share2 },
  { href: '/dashboard/friends', label: 'Friends', icon: Users },
  { href: '/dashboard/files', label: 'My Files', icon: FolderOpen },
  { href: '/dashboard/subscription', label: 'Subscription', icon: Crown },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [sideOpen, setSideOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');

  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/auth/login'); }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;

  const handleLogout = async () => { await logout(); router.replace('/auth/login'); };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (redeemCode.length !== 8) { toast.error('Code must be 8 characters'); return; }
    try {
      const res = await notesApi.redeemCode(redeemCode);
      toast.success(res.data.message);
      setRedeemCode(''); setRedeemOpen(false);
      if (res.data.data?.id) router.push(`/dashboard/notes/${res.data.data.id}`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Invalid code'); }
  };

  return (
    <div className="min-h-screen flex bg-[#f5f6fa]">
      {sideOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSideOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-200 transform transition-transform lg:transform-none ${sideOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Link href="/dashboard/notes" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><FileText size={16} className="text-white" /></div>
            <span className="text-lg font-bold">Notexa</span>
          </Link>
          <button className="lg:hidden text-gray-400" onClick={() => setSideOpen(false)}><X size={20} /></button>
        </div>

        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate flex items-center gap-1">
                {user?.name} {user?.is_premium && <Crown size={12} className="text-amber-500" />}
              </p>
              <p className="text-xs text-gray-400 truncate">@{user?.username}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <item.icon size={18} />{item.label}
              </Link>
            );
          })}

          {/* Redeem code */}
          <button onClick={() => setRedeemOpen(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 w-full transition">
            <KeyRound size={18} /> Redeem Share Code
          </button>

          {user?.role === 'admin' && (
            <>
              <div className="border-t border-gray-100 my-2" />
              <Link href="/admin/dashboard" onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${pathname.startsWith('/admin') ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <LayoutDashboard size={18} /> Admin Panel
              </Link>
            </>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSideOpen(true)} className="text-gray-600"><Menu size={22} /></button>
          <span className="font-bold">Notexa</span>
          <div className="w-6" />
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>

      {/* Redeem Modal */}
      {redeemOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setRedeemOpen(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Redeem Share Code</h2>
            <p className="text-sm text-gray-500 mb-5">Enter an 8-character code to access a shared note.</p>
            <form onSubmit={handleRedeem} className="space-y-4">
              <input type="text" maxLength={8} required value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono text-xl tracking-[0.3em] uppercase"
                placeholder="ABCD1234" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setRedeemOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">Redeem</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

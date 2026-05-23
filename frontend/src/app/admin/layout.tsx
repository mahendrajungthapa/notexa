'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/contexts/authStore';
import { LayoutDashboard, Users, FileText, Settings, ArrowLeft, Shield } from 'lucide-react';

const nav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/notes', label: 'Notes', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => { if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) router.replace('/dashboard/notes'); }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== 'admin')
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="hidden lg:flex w-60 bg-gray-950 text-white flex-col">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2"><Shield size={18} className="text-red-400" /><span className="text-lg font-bold">Admin</span></div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(i => {
            const a = pathname === i.href;
            return <Link key={i.href} href={i.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${a ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}><i.icon size={17} />{i.label}</Link>;
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800">
          <Link href="/dashboard/notes" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5"><ArrowLeft size={17} /> Back to App</Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-950 text-white">
          <Shield size={16} className="text-red-400" /><span className="font-bold text-sm">Admin</span>
          <div className="ml-auto flex gap-2">
            {nav.map(i => <Link key={i.href} href={i.href} className={`p-2 rounded-lg ${pathname===i.href?'bg-white/10':'hover:bg-white/5'}`}><i.icon size={16} /></Link>)}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

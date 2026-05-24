'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/contexts/authStore';
import {
  BarChart3, Users, FileText, Settings, ArrowLeft, Shield
} from 'lucide-react';

const adminNav = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/notes', label: 'Notes', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.replace('/dashboard/notes');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== 'admin') {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      <aside className="w-full lg:w-64 bg-gray-900 text-white flex flex-col">
        <div className="px-4 sm:px-6 py-4 lg:py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-red-400" />
            <span className="text-lg font-bold">Admin Panel</span>
          </div>
        </div>
        <nav className="flex lg:flex-1 gap-2 lg:gap-0 overflow-x-auto lg:overflow-visible px-3 py-3 lg:py-4 lg:space-y-1 lg:flex-col">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex shrink-0 items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
                <item.icon size={18} />{item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-3 lg:py-4 border-t border-gray-800">
          <Link href="/dashboard/notes" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition">
            <ArrowLeft size={18} /> Back to App
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { DashboardStats } from '@/types';
import toast from 'react-hot-toast';
import { Users, FileText, Share2, HardDrive, UserPlus } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminApi.dashboard();
        setStats(res.data.data);
      } catch { toast.error('Failed to load'); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" /></div>;
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'bg-blue-50 text-blue-600', gradient: 'from-blue-500/20' },
    { label: 'Active Users', value: stats.active_users, icon: Users, color: 'bg-green-50 text-green-600', gradient: 'from-green-500/20' },
    { label: 'Total Notes', value: stats.total_notes, icon: FileText, color: 'bg-purple-50 text-purple-600', gradient: 'from-purple-500/20' },
    { label: 'Shared Notes', value: stats.total_shared_notes, icon: Share2, color: 'bg-pink-50 text-pink-600', gradient: 'from-pink-500/20' },
    { label: 'Friendships', value: stats.total_friendships, icon: Users, color: 'bg-indigo-50 text-indigo-600', gradient: 'from-indigo-500/20' },
    { label: 'Total Files', value: stats.total_files, icon: HardDrive, color: 'bg-teal-50 text-teal-600', gradient: 'from-teal-500/20' },
    { label: 'Storage Used', value: stats.total_storage_used, icon: HardDrive, color: 'bg-orange-50 text-orange-600', gradient: 'from-orange-500/20' },
    { label: 'New Users (30d)', value: stats.recent_signups, icon: UserPlus, color: 'bg-cyan-50 text-cyan-600', gradient: 'from-cyan-500/20' },
  ];

  return (
    <div className="pb-10 fade-in animate-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">System Analytics</h1>
        <p className="text-slate-500 mt-1 font-medium">Real-time overview of platform statistics and metrics</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="group relative bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm hover:shadow-xl hover:border-slate-300/80 hover:-translate-y-1 transition-all duration-500 overflow-hidden cursor-default flex flex-col justify-between min-h-[140px]">
            {/* Decorative Blur blob */}
            <div className={`absolute -right-8 -top-8 w-40 h-40 bg-gradient-to-br ${card.gradient} to-transparent rounded-full blur-3xl opacity-30 group-hover:opacity-80 transition-opacity duration-500 pointer-events-none`} />
            
            <div className="relative z-10 flex flex-row items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">{card.label}</span>
              <div className={`p-2.5 rounded-2xl ${card.color} shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                <card.icon size={20} strokeWidth={2.5} />
              </div>
            </div>
            
            <div className="relative z-10">
               <p className="text-3xl sm:text-4xl font-black text-slate-800 group-hover:text-slate-900 transition-colors break-words">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

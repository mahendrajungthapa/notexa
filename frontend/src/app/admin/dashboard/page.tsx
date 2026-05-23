'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Users, FileText, Share2, HardDrive, UserPlus, BarChart3, CalendarDays, Activity } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { try { const r = await adminApi.dashboard(); setStats(r.data.data); } catch { toast.error('Failed'); } finally { setLoading(false); } })(); }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" /></div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Users', value: stats.active_users, icon: Users, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'New Today', value: stats.new_users_today, icon: UserPlus, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Total Notes', value: stats.total_notes, icon: FileText, color: 'bg-violet-50 text-violet-600' },
    { label: 'Notes Today', value: stats.notes_today, icon: CalendarDays, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Shared Notes', value: stats.total_shared_notes, icon: Share2, color: 'bg-pink-50 text-pink-600' },
    { label: 'Friendships', value: stats.total_friendships, icon: Users, color: 'bg-rose-50 text-rose-600' },
    { label: 'Total Files', value: stats.total_files, icon: HardDrive, color: 'bg-teal-50 text-teal-600' },
    { label: 'Storage Used', value: `${stats.total_storage_gb} GB`, icon: HardDrive, color: 'bg-orange-50 text-orange-600' },
    { label: 'New Users (30d)', value: stats.new_users_month, icon: Activity, color: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-10">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium">{c.label}</span>
              <div className={`p-2 rounded-xl ${c.color}`}><c.icon size={16} /></div>
            </div>
            <p className="text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts - simple bar representation */}
      {stats.users_chart && stats.users_chart.length > 0 && (
        <div className="grid gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 size={16} /> User Signups (30 days)</h3>
            <div className="flex items-end gap-1 h-32">
              {stats.users_chart.map((d: any, i: number) => {
                const max = Math.max(...stats.users_chart.map((x: any) => x.count), 1);
                return <div key={i} className="flex-1 bg-indigo-200 hover:bg-indigo-400 rounded-t transition-colors" style={{ height: `${(d.count / max) * 100}%`, minHeight: '4px' }} title={`${d.date}: ${d.count}`} />;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

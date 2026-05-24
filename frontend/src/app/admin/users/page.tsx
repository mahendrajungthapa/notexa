'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { User } from '@/types';
import toast from 'react-hot-toast';
import { Search, Ban, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminApi.users({ search: search || undefined, page });
      setUsers(res.data.data.data || []);
      setLastPage(res.data.data.last_page || 1);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { const t = setTimeout(fetchUsers, 300); return () => clearTimeout(t); }, [fetchUsers]);

  const handleToggleActive = async (user: any) => {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Deactivated' : 'Activated');
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user and all their data?')) return;
    try { await adminApi.deleteUser(id); toast.success('Deleted'); fetchUsers(); } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="pb-10 fade-in animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">User Management</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Monitor accounts, roles, and platform activity</p>
        </div>
        <div className="relative group w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            <Search size={18} strokeWidth={2.5} />
          </div>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-11 pr-4 py-3 rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-sm text-sm w-full sm:w-72 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 focus:bg-white transition-all shadow-sm placeholder:text-slate-400 font-medium text-slate-700 hover:border-slate-300"
            placeholder="Search by name or email..." />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div> : (
        <>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-500 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 border-b border-slate-200/60 text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4">Files</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm border border-indigo-100/50 group-hover:scale-105 transition-transform">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">{u.name}</p>
                            <p className="text-xs font-medium text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${u.role === 'admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-600">{u.notes_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-600">{u.files_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${u.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleToggleActive(u)} title="Toggle active"
                            className={`p-2 rounded-xl transition-all duration-300 ${!u.is_active ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'}`}>
                            <Ban size={16} strokeWidth={2.5} />
                          </button>
                          {u.role !== 'admin' && (
                            <button onClick={() => handleDelete(u.id)} title="Delete user"
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-300">
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: lastPage }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`min-w-[36px] h-[36px] flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${page === i + 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

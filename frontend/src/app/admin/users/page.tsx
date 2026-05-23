'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Search, Ban, Trash2, Eye, X, FileText, Users, HardDrive } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetch = useCallback(async () => {
    try { const r = await adminApi.users({ search: search || undefined, page }); setUsers(r.data.data.data || []); setLastPage(r.data.data.last_page || 1); }
    catch {} finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { const t = setTimeout(fetch, 300); return () => clearTimeout(t); }, [fetch]);

  const openDetail = async (id: number) => {
    setDetailLoading(true); setDetail(null);
    try { const r = await adminApi.userDetail(id); setDetail(r.data.data); }
    catch { toast.error('Failed'); } finally { setDetailLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-56 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search..." /></div>
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div> : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Files</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-gray-400">@{u.username} · {u.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-gray-600">{u.notes_count}</td>
                    <td className="px-4 py-3 text-gray-600">{u.files_count}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openDetail(u.id)} title="View detail" className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"><Eye size={14} /></button>
                        <button onClick={async () => { await adminApi.updateUser(u.id, { is_active: !u.is_active }); toast.success('Updated'); fetch(); }} title="Toggle active"
                          className={`p-1.5 rounded-lg ${!u.is_active ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:bg-gray-100'}`}><Ban size={14} /></button>
                        {u.role !== 'admin' && <button onClick={async () => { if (!confirm('Delete user and all data?')) return; await adminApi.deleteUser(u.id); toast.success('Deleted'); fetch(); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lastPage > 1 && <div className="flex justify-center gap-2 mt-4">{Array.from({ length: lastPage }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1.5 rounded-lg text-sm ${page === i + 1 ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{i + 1}</button>
          ))}</div>}
        </>
      )}

      {/* USER DETAIL MODAL */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            {detailLoading ? <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div> : detail && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">{detail.user.name.charAt(0)}</div>
                    <div>
                      <h2 className="text-lg font-bold">{detail.user.name}</h2>
                      <p className="text-sm text-gray-400">@{detail.user.username} · {detail.user.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setDetail(null)}><X size={20} className="text-gray-400" /></button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-gray-50 rounded-xl p-3 text-center"><FileText size={16} className="mx-auto mb-1 text-indigo-500" /><p className="text-lg font-bold">{detail.user.notes?.length || 0}</p><p className="text-xs text-gray-400">Notes</p></div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center"><Users size={16} className="mx-auto mb-1 text-emerald-500" /><p className="text-lg font-bold">{detail.friends_count}</p><p className="text-xs text-gray-400">Friends</p></div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center"><HardDrive size={16} className="mx-auto mb-1 text-amber-500" /><p className="text-lg font-bold">{detail.storage_used_mb} MB</p><p className="text-xs text-gray-400">Storage</p></div>
                </div>

                {/* Notes */}
                <div className="mb-5">
                  <h3 className="text-sm font-semibold mb-2">Notes ({detail.user.notes?.length || 0})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {(detail.user.notes || []).map((n: any) => (
                      <div key={n.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="truncate">{n.title}</span>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Friends */}
                <div className="mb-5">
                  <h3 className="text-sm font-semibold mb-2">Friends ({detail.friends_count})</h3>
                  <div className="flex flex-wrap gap-2">
                    {(detail.friends || []).map((f: any) => (
                      <span key={f.id} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">@{f.username}</span>
                    ))}
                    {detail.friends_count === 0 && <span className="text-xs text-gray-400">No friends</span>}
                  </div>
                </div>

                {/* Shared notes */}
                <div className="mb-5">
                  <h3 className="text-sm font-semibold mb-2">Shared by User ({(detail.shared_by_user || []).length})</h3>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {(detail.shared_by_user || []).map((s: any) => (
                      <div key={s.id} className="text-xs bg-gray-50 rounded-lg px-3 py-2 flex justify-between">
                        <span>{s.note?.title} → @{s.recipient?.username}</span><span className="text-gray-400">{s.permission}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

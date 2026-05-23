'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import { CreditCard } from 'lucide-react';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { try { const r = await adminApi.payments({ status: filter || undefined }); setPayments(r.data.data.data || []); } catch {} finally { setLoading(false); } })(); }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <select value={filter} onChange={e => { setFilter(e.target.value); setLoading(true); }} className="px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none">
          <option value="">All</option><option value="success">Success</option><option value="pending">Pending</option><option value="failed">Failed</option>
        </select>
      </div>
      {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      : payments.length === 0 ? <div className="text-center py-16"><CreditCard size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">No payments</p></div>
      : <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
          </tr></thead>
          <tbody>{payments.map((p: any) => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3"><p className="font-medium text-sm">{p.user?.name}</p><p className="text-xs text-gray-400">@{p.user?.username}</p></td>
              <td className="px-4 py-3">{p.plan?.name || '—'}</td>
              <td className="px-4 py-3 font-semibold">Rs. {p.amount}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'success' ? 'bg-emerald-100 text-emerald-700' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span></td>
              <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-xs text-gray-400 font-mono">{p.identifier}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  );
}

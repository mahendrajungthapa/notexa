'use client';
import { useState, useEffect } from 'react';
import { subscriptionApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';
import { Crown, Check, CreditCard, Clock, Zap, HardDrive, Share2, Sparkles } from 'lucide-react';

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<number|null>(null);

  useEffect(()=>{(async()=>{try{
    const [pR,sR,hR]=await Promise.all([subscriptionApi.plans(),subscriptionApi.mySubscription(),subscriptionApi.paymentHistory()]);
    setPlans(pR.data.data||[]); setSub(sR.data.data); setPayments(hR.data.data?.data||[]);
  }catch{}finally{setLoading(false);}})();},[]);

  const handleSub = async(id:number)=>{
    setSubscribing(id);
    try{ const r=await subscriptionApi.subscribe(id); if(r.data.redirect_url)window.location.href=r.data.redirect_url; else toast.error('Failed'); }
    catch(e:any){ toast.error(e.response?.data?.message||'Failed'); }
    finally{ setSubscribing(null); }
  };

  if(loading)return<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"/></div>;

  return(
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Subscription</h1>
      <p className="text-gray-400 text-sm mb-8">Upgrade for more storage and premium features</p>

      <div className={`rounded-2xl border p-6 mb-8 ${user?.is_premium?'bg-amber-50 border-amber-200':'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-2"><Crown size={22} className={user?.is_premium?'text-amber-500':'text-gray-400'}/><h2 className="text-lg font-bold">{user?.is_premium?'Premium Active':'Free Plan'}</h2></div>
        {user?.is_premium&&sub?.subscription&&<p className="text-sm text-gray-600">Expires: {new Date(sub.subscription.expires_at).toLocaleDateString()} · {sub.subscription.plan?.name}</p>}
        <p className="text-sm text-gray-500 mt-1">Storage: {sub?.storage_used||0} MB / {sub?.storage_limit||50} MB</p>
      </div>

      {!user?.is_premium&&(
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {plans.map((p:any)=>(
            <div key={p.id} className="bg-white rounded-2xl border-2 border-indigo-200 p-7 hover:border-indigo-400 transition relative">
              {p.duration_days>=365&&<span className="absolute -top-3 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">Best Value</span>}
              <h3 className="text-xl font-bold mb-1">{p.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{p.description}</p>
              <div className="mb-6"><span className="text-3xl font-extrabold text-indigo-700">Rs. {p.price}</span><span className="text-gray-400 text-sm"> / {p.duration_days===30?'month':'year'}</span></div>
              <ul className="space-y-2.5 mb-6">
                <li className="flex items-center gap-2 text-sm"><Check size={15} className="text-emerald-500"/><Crown size={13} className="text-amber-500"/> Premium badge</li>
                <li className="flex items-center gap-2 text-sm"><Check size={15} className="text-emerald-500"/><HardDrive size={13}/> 5GB storage</li>
                <li className="flex items-center gap-2 text-sm"><Check size={15} className="text-emerald-500"/><Share2 size={13}/> File sharing</li>
                <li className="flex items-center gap-2 text-sm"><Check size={15} className="text-emerald-500"/><Sparkles size={13}/> AI summaries</li>
                <li className="flex items-center gap-2 text-sm"><Check size={15} className="text-emerald-500"/><Zap size={13}/> Priority support</li>
              </ul>
              <button onClick={()=>handleSub(p.id)} disabled={subscribing===p.id}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {subscribing===p.id?<div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><CreditCard size={15}/> Subscribe</>}
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock size={18}/> Payment History</h2>
        {payments.length===0?<p className="text-gray-400 text-sm">No payments yet</p>
        :<div className="space-y-2">{payments.map((p:any)=>(
          <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
            <div><p className="font-medium text-sm">{p.plan?.name||'Payment'}</p><p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p></div>
            <div className="text-right"><p className="font-semibold text-sm">Rs. {p.amount}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.status==='success'?'bg-emerald-100 text-emerald-700':p.status==='pending'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>{p.status}</span>
            </div>
          </div>
        ))}</div>}
      </div>
    </div>
  );
}

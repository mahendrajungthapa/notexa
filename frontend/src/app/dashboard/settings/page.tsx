'use client';
import { useState } from 'react';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';
import { User, Lock, Save, AtSign } from 'lucide-react';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name||'');
  const [username, setUsername] = useState(user?.username||'');
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({current_password:'',password:'',password_confirmation:''});
  const [changingPw, setChangingPw] = useState(false);

  const handleProfile = async(e:React.FormEvent)=>{
    e.preventDefault(); setSaving(true);
    try{ const r=await authApi.updateProfile({name,username}); setUser(r.data.user); toast.success('Updated!'); }
    catch(e:any){ toast.error(e.response?.data?.message||'Failed'); }
    finally{ setSaving(false); }
  };

  const handlePw = async(e:React.FormEvent)=>{
    e.preventDefault(); if(pw.password!==pw.password_confirmation){toast.error('Passwords mismatch');return;}
    setChangingPw(true);
    try{ await authApi.changePassword(pw); toast.success('Password changed!'); setPw({current_password:'',password:'',password_confirmation:''}); }
    catch(e:any){ toast.error(e.response?.data?.message||'Failed'); }
    finally{ setChangingPw(false); }
  };

  return(
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-bold mb-4 flex items-center gap-2"><User size={18}/> Profile</h2>
        <form onSubmit={handleProfile} className="space-y-4">
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
            <div className="relative"><AtSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,''))} required className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/></div></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" value={user?.email||''} disabled className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-sm"/></div>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
            <Save size={15}/> {saving?'Saving...':'Save Changes'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-bold mb-4 flex items-center gap-2"><Lock size={18}/> Change Password</h2>
        <form onSubmit={handlePw} className="space-y-4">
          <input type="password" placeholder="Current password" required value={pw.current_password} onChange={e=>setPw({...pw,current_password:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
          <input type="password" placeholder="New password (min 8)" required value={pw.password} onChange={e=>setPw({...pw,password:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
          <input type="password" placeholder="Confirm new password" required value={pw.password_confirmation} onChange={e=>setPw({...pw,password_confirmation:e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
          <button type="submit" disabled={changingPw} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition">
            <Lock size={15}/> {changingPw?'Changing...':'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

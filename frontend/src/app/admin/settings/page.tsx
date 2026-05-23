'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Save, Mail, Globe, Shield, CreditCard, Send, HardDrive, Sparkles, ToggleLeft } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [tab, setTab] = useState('general');

  useEffect(() => { (async () => { try { const r = await adminApi.getSettings(); setSettings(r.data.data || []); } catch { toast.error('Failed to load'); } finally { setLoading(false); } })(); }, []);

  const gv = (k: string) => settings.find(s => s.key === k)?.value ?? '';
  const sv = (k: string, v: string) => {
    setSettings(prev => {
      const exists = prev.find(s => s.key === k);
      if (exists) return prev.map(s => s.key === k ? { ...s, value: v } : s);
      return [...prev, { key: k, value: v, type: 'string', group: tab }];
    });
  };

  const save = async (group: string) => {
    setSaving(true);
    try {
      const gs = settings.filter(s => s.group === group).map(s => ({ key: s.key, value: s.value ?? '', type: s.type || 'string', group: s.group || group }));
      if (!gs.length) { toast.error('Nothing to save'); setSaving(false); return; }
      await adminApi.updateSettings(gs);
      toast.success('Saved!');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const Toggle = ({ k }: { k: string }) => {
    const on = gv(k) === 'true' || gv(k) === '1';
    return <button onClick={() => sv(k, on ? 'false' : 'true')} className={`w-11 h-6 rounded-full transition relative ${on ? 'bg-indigo-600' : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${on ? 'left-5' : 'left-0.5'}`} /></button>;
  };
  const Input = ({ k, label, type = 'text', placeholder = '' }: any) => (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={gv(k)} onChange={e => sv(k, e.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
  );
  const TA = ({ k, label }: any) => (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={gv(k)} onChange={e => sv(k, e.target.value)} rows={8} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono" /></div>
  );
  const SaveBtn = ({ group }: { group: string }) => (
    <button onClick={() => save(group)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
      <Save size={15} /> {saving ? 'Saving...' : 'Save'}
    </button>
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;

  const tabs = [
    { key: 'general', label: 'General', icon: Globe },
    { key: 'smtp', label: 'SMTP', icon: Mail },
    { key: 'email', label: 'Email', icon: ToggleLeft },
    { key: 'legal', label: 'Legal', icon: Shield },
    { key: 'payment', label: 'Payment', icon: CreditCard },
    { key: 'storage', label: 'Storage (R2)', icon: HardDrive },
    { key: 'ai', label: 'AI (DeepSeek)', icon: Sparkles },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 flex-wrap">
        {tabs.map(t => (<button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition ${tab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><t.icon size={14} /> {t.label}</button>))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {tab === 'general' && <div className="space-y-4"><Input k="site_name" label="Site Name" /><Input k="site_logo" label="Logo URL" placeholder="https://..." /><Input k="site_description" label="Description" /><TA k="about_us" label="About Us (HTML)" /><SaveBtn group="general" /></div>}
        {tab === 'smtp' && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4"><Input k="smtp_host" label="Host" placeholder="smtp.gmail.com" /><Input k="smtp_port" label="Port" placeholder="587" /></div>
          <div className="grid grid-cols-2 gap-4"><Input k="smtp_username" label="Username" /><Input k="smtp_password" label="Password" type="password" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label><select value={gv('smtp_encryption')} onChange={e => sv('smtp_encryption', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"><option value="tls">TLS</option><option value="ssl">SSL</option><option value="">None</option></select></div>
            <Input k="smtp_from_address" label="From Address" />
          </div>
          <div className="flex gap-3 items-end flex-wrap"><SaveBtn group="smtp" />
            <div className="flex gap-2 ml-auto"><input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none w-44" placeholder="test@email.com" />
              <button onClick={async () => { if (!testEmail) return; try { await adminApi.testSmtp(testEmail); toast.success('Sent!'); } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); } }} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold"><Send size={13} /> Test</button></div>
          </div>
        </div>}
        {tab === 'email' && <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4"><div><p className="font-semibold text-sm">Email Verification</p><p className="text-xs text-gray-500">Require after registration</p></div><Toggle k="email_verification_enabled" /></div>
          <SaveBtn group="email" />
        </div>}
        {tab === 'legal' && <div className="space-y-4"><TA k="privacy_policy" label="Privacy Policy (HTML)" /><TA k="terms_conditions" label="Terms & Conditions (HTML)" /><SaveBtn group="legal" /></div>}
        {tab === 'payment' && <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800"><strong>API Nepal</strong> — Get keys from <a href="https://apinepal.com" target="_blank" className="underline">apinepal.com</a> merchant panel.</div>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4"><div><p className="font-semibold text-sm">Payment Gateway</p><p className="text-xs text-gray-500">Enable/disable</p></div><Toggle k="payment_gateway_enabled" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Mode</label><select value={gv('apinepal_mode')} onChange={e => sv('apinepal_mode', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"><option value="test">Test (Sandbox)</option><option value="live">Live (Production)</option></select></div>
          <Input k="apinepal_public_key" label="Public Key" placeholder="Your public key" />
          <Input k="apinepal_secret_key" label="Secret Key" type="password" placeholder="Your secret key" />
          <SaveBtn group="payment" />
        </div>}
        {tab === 'storage' && <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800"><strong>Cloudflare R2</strong> — Get from Cloudflare Dashboard → R2 → Manage API Tokens.</div>
          <Input k="r2_access_key" label="Access Key ID" /><Input k="r2_secret_key" label="Secret Access Key" type="password" />
          <Input k="r2_bucket" label="Bucket Name" placeholder="notexa-files" />
          <Input k="r2_endpoint" label="Endpoint URL" placeholder="https://account-id.r2.cloudflarestorage.com" />
          <Input k="r2_public_url" label="Public URL" placeholder="https://pub-xxx.r2.dev" />
          <SaveBtn group="storage" />
        </div>}
        {tab === 'ai' && <div className="space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800"><strong>DeepSeek AI</strong> — Get key from <a href="https://platform.deepseek.com" target="_blank" className="underline">platform.deepseek.com</a>.</div>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4"><div><p className="font-semibold text-sm">AI Features</p><p className="text-xs text-gray-500">Enable/disable summaries</p></div><Toggle k="ai_enabled" /></div>
          <Input k="deepseek_api_key" label="DeepSeek API Key" type="password" placeholder="sk-..." />
          <SaveBtn group="ai" />
        </div>}
      </div>
    </div>
  );
}

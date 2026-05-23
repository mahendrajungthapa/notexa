'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import toast from 'react-hot-toast';
import { Save, Mail, Globe, Shield, Send, HardDrive, Sparkles, ToggleLeft } from 'lucide-react';

type Setting = {
  key: string;
  value: string;
  type: string;
  group: string;
};

const definitions: Record<string, Omit<Setting, 'key'>> = {
  site_name: { value: 'Notexa', type: 'string', group: 'general' },
  site_logo: { value: '', type: 'string', group: 'general' },
  site_description: { value: 'Collaborative Note Taking Platform', type: 'string', group: 'general' },
  about_us: { value: '', type: 'text', group: 'general' },
  smtp_host: { value: '', type: 'string', group: 'smtp' },
  smtp_port: { value: '587', type: 'integer', group: 'smtp' },
  smtp_username: { value: '', type: 'string', group: 'smtp' },
  smtp_password: { value: '', type: 'string', group: 'smtp' },
  smtp_encryption: { value: 'tls', type: 'string', group: 'smtp' },
  smtp_from_address: { value: 'noreply@notexa.com', type: 'string', group: 'smtp' },
  smtp_from_name: { value: 'Notexa', type: 'string', group: 'smtp' },
  email_verification_enabled: { value: 'false', type: 'boolean', group: 'email' },
  privacy_policy: { value: '', type: 'text', group: 'legal' },
  terms_conditions: { value: '', type: 'text', group: 'legal' },
  r2_access_key: { value: '', type: 'string', group: 'storage' },
  r2_secret_key: { value: '', type: 'string', group: 'storage' },
  r2_bucket: { value: 'notexa-files', type: 'string', group: 'storage' },
  r2_endpoint: { value: '', type: 'string', group: 'storage' },
  r2_public_url: { value: '', type: 'string', group: 'storage' },
  ai_enabled: { value: 'true', type: 'boolean', group: 'ai' },
  deepseek_api_key: { value: '', type: 'string', group: 'ai' },
};

const tabs = [
  { key: 'general', label: 'General', icon: Globe },
  { key: 'smtp', label: 'SMTP', icon: Mail },
  { key: 'email', label: 'Email', icon: ToggleLeft },
  { key: 'legal', label: 'Legal', icon: Shield },
  { key: 'storage', label: 'Storage (R2)', icon: HardDrive },
  { key: 'ai', label: 'AI (DeepSeek)', icon: Sparkles },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [tab, setTab] = useState('general');

  useEffect(() => {
    (async () => {
      try {
        const response = await adminApi.getSettings();
        setSettings(mergeDefaults(response.data.data || []));
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const mergeDefaults = (incoming: Setting[]) => {
    const map = new Map<string, Setting>();
    Object.entries(definitions).forEach(([key, value]) => map.set(key, { key, ...value }));
    incoming.forEach((item) => {
      const fallback = definitions[item.key] || { value: '', type: 'string', group: item.group || 'general' };
      map.set(item.key, {
        key: item.key,
        value: item.value ?? fallback.value,
        type: item.type || fallback.type,
        group: item.group || fallback.group,
      });
    });
    return Array.from(map.values());
  };

  const meta = (key: string) => definitions[key] || { value: '', type: 'string', group: tab };
  const gv = (key: string) => settings.find((setting) => setting.key === key)?.value ?? meta(key).value;

  const sv = (key: string, value: string) => {
    const definition = meta(key);
    setSettings((previous) => {
      const exists = previous.some((setting) => setting.key === key);
      if (exists) {
        return previous.map((setting) => setting.key === key ? { ...setting, value, type: setting.type || definition.type, group: setting.group || definition.group } : setting);
      }
      return [...previous, { key, value, type: definition.type, group: definition.group }];
    });
  };

  const groupSettings = (group: string) => {
    const keys = Object.keys(definitions).filter((key) => definitions[key].group === group);
    return keys.map((key) => {
      const definition = definitions[key];
      const existing = settings.find((setting) => setting.key === key);
      return {
        key,
        value: existing?.value ?? definition.value,
        type: existing?.type || definition.type,
        group,
      };
    });
  };

  const save = async (group: string, quiet = false) => {
    setSaving(true);
    try {
      const response = await adminApi.updateSettings(groupSettings(group));
      setSettings(mergeDefaults(response.data.data || settings));
      if (!quiet) toast.success('Settings saved');
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const testSmtp = async () => {
    if (!testEmail.trim()) {
      toast.error('Enter a test email address');
      return;
    }
    const saved = await save('smtp', true);
    if (!saved) return;

    setTesting(true);
    try {
      await adminApi.testSmtp(testEmail.trim());
      toast.success('Test email sent');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'SMTP test failed');
    } finally {
      setTesting(false);
    }
  };

  const Toggle = ({ k }: { k: string }) => {
    const on = ['true', '1', 'yes'].includes(String(gv(k)).toLowerCase());
    return <button type="button" onClick={() => sv(k, on ? 'false' : 'true')} className={`w-11 h-6 rounded-full transition relative ${on ? 'bg-indigo-600' : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${on ? 'left-5' : 'left-0.5'}`} /></button>;
  };

  const Input = ({ k, label, type = 'text', placeholder = '' }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={gv(k)} onChange={(event) => sv(k, event.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
    </div>
  );

  const TextArea = ({ k, label }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={gv(k)} onChange={(event) => sv(k, event.target.value)} rows={8} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono" />
    </div>
  );

  const SaveBtn = ({ group }: { group: string }) => (
    <button onClick={() => save(group)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
      <Save size={15} /> {saving ? 'Saving...' : 'Save'}
    </button>
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-6 flex-wrap">
        {tabs.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition ${tab === item.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            <item.icon size={14} /> {item.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {tab === 'general' && <div className="space-y-4">
          <Input k="site_name" label="Site Name" />
          <Input k="site_logo" label="Logo URL" placeholder="https://..." />
          <Input k="site_description" label="Description" />
          <TextArea k="about_us" label="About Us (HTML)" />
          <SaveBtn group="general" />
        </div>}

        {tab === 'smtp' && <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input k="smtp_host" label="Host" placeholder="smtp.gmail.com" /><Input k="smtp_port" label="Port" placeholder="587" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input k="smtp_username" label="Username" /><Input k="smtp_password" label="Password" type="password" /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label><select value={gv('smtp_encryption')} onChange={(event) => sv('smtp_encryption', event.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"><option value="tls">TLS</option><option value="ssl">SSL</option><option value="">None</option></select></div>
            <Input k="smtp_from_address" label="From Address" />
            <Input k="smtp_from_name" label="From Name" />
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <SaveBtn group="smtp" />
            <div className="flex gap-2 ml-auto">
              <input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none w-44" placeholder="test@email.com" />
              <button onClick={testSmtp} disabled={testing || saving} className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold disabled:opacity-50"><Send size={13} /> {testing ? 'Sending...' : 'Test'}</button>
            </div>
          </div>
        </div>}

        {tab === 'email' && <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4"><div><p className="font-semibold text-sm">Email Verification</p><p className="text-xs text-gray-500">Require users to verify email before login</p></div><Toggle k="email_verification_enabled" /></div>
          <p className="text-xs text-gray-500">Configure and test SMTP before enabling verification.</p>
          <SaveBtn group="email" />
        </div>}

        {tab === 'legal' && <div className="space-y-4">
          <TextArea k="privacy_policy" label="Privacy Policy (HTML)" />
          <TextArea k="terms_conditions" label="Terms & Conditions (HTML)" />
          <SaveBtn group="legal" />
        </div>}

        {tab === 'storage' && <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800"><strong>Cloudflare R2</strong> - Get credentials from Cloudflare Dashboard, R2, Manage API Tokens.</div>
          <Input k="r2_access_key" label="Access Key ID" />
          <Input k="r2_secret_key" label="Secret Access Key" type="password" />
          <Input k="r2_bucket" label="Bucket Name" placeholder="notexa-files" />
          <Input k="r2_endpoint" label="Endpoint URL" placeholder="https://account-id.r2.cloudflarestorage.com" />
          <Input k="r2_public_url" label="Public URL" placeholder="https://pub-xxx.r2.dev" />
          <SaveBtn group="storage" />
        </div>}

        {tab === 'ai' && <div className="space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800"><strong>DeepSeek AI</strong> - Add a key for model summaries. If no key is set, Notexa uses a local fallback summary.</div>
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4"><div><p className="font-semibold text-sm">AI Features</p><p className="text-xs text-gray-500">Enable or disable note summaries</p></div><Toggle k="ai_enabled" /></div>
          <Input k="deepseek_api_key" label="DeepSeek API Key" type="password" placeholder="sk-..." />
          <SaveBtn group="ai" />
        </div>}
      </div>
    </div>
  );
}

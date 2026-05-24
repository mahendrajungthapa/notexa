'use client';

import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/services/api';
import { SiteSetting } from '@/types';
import toast from 'react-hot-toast';
import { Save, Mail, Globe, Shield, Send, Sparkles, Upload, Image as ImageIcon } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [tab, setTab] = useState<'general' | 'smtp' | 'email' | 'legal' | 'ai'>('general');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await adminApi.getSettings(); setSettings(res.data.data || []); }
      catch { toast.error('Failed'); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const getValue = (key: string) => settings.find((s) => s.key === key)?.value || '';
  const setValue = (key: string, value: string, group: string = 'general') => {
    setSettings((prev) => {
      const exists = prev.some((s) => s.key === key);
      if (exists) {
        return prev.map((s) => s.key === key ? { ...s, value } : s);
      } else {
        return [...prev, { id: 0, key, value, type: 'text', group }];
      }
    });
  };

  const handleSave = async (group: string) => {
    setSaving(true);
    try {
      const aiKeys = [
        'ai_enabled', 'ai_provider',
        'openai_api_key', 'openai_base_url', 'openai_model',
        'gemini_api_key', 'gemini_base_url', 'gemini_model',
        'deepseek_api_key', 'deepseek_base_url', 'deepseek_model'
      ];
      const groupSettings = settings
        .filter((s) => s.group === group || (group === 'ai' && aiKeys.includes(s.key)))
        .map((s) => ({
          key: s.key,
          value: s.value || '',
          type: s.type,
          group: group === 'ai' && aiKeys.includes(s.key) ? 'ai' : s.group
        }));
      await adminApi.updateSettings(groupSettings);
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) return;
    try { await adminApi.testSmtp(testEmail); toast.success('Test email sent!'); }
    catch (err: any) { toast.error(err.response?.data?.message || 'SMTP test failed'); }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const response = await adminApi.uploadLogo(file);
      const logoUrl = response.data?.data?.site_logo || '';
      if (response.data?.data?.settings) {
        setSettings(response.data.data.settings);
      } else if (logoUrl) {
        setValue('site_logo', logoUrl, 'general');
      }
      toast.success('Site logo uploaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Logo upload failed');
    } finally {
      setLogoUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>;

  const tabs = [
    { key: 'general' as const, label: 'General', icon: Globe },
    { key: 'smtp' as const, label: 'SMTP', icon: Mail },
    { key: 'email' as const, label: 'Email', icon: Mail },
    { key: 'legal' as const, label: 'Legal Pages', icon: Shield },
    { key: 'ai' as const, label: 'AI Settings', icon: Sparkles },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Site Settings</h1>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {tab === 'general' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
              <input type="text" value={getValue('site_name')} onChange={(e) => setValue('site_name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Logo URL</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={getValue('site_logo')} onChange={(e) => setValue('site_logo', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="https://example.com/logo.png" />
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 shrink-0">
                  {logoUploading ? <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-brand-600 animate-spin" /> : <Upload size={16} />}
                  Upload
                </button>
              </div>
              {getValue('site_logo') && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="h-12 w-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                    <img src={getValue('site_logo')} alt="Site logo preview" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><ImageIcon size={13} /> Current logo</p>
                    <p className="text-[11px] text-gray-500 truncate">{getValue('site_logo')}</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Description</label>
              <input type="text" value={getValue('site_description')} onChange={(e) => setValue('site_description', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button onClick={() => handleSave('general')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              <Save size={16} /> Save General Settings
            </button>
          </div>
        )}

        {tab === 'smtp' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                <input type="text" value={getValue('smtp_host')} onChange={(e) => setValue('smtp_host', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" placeholder="smtp.gmail.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                <input type="text" value={getValue('smtp_port')} onChange={(e) => setValue('smtp_port', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" placeholder="587" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" value={getValue('smtp_username')} onChange={(e) => setValue('smtp_username', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={getValue('smtp_password')} onChange={(e) => setValue('smtp_password', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
                <select value={getValue('smtp_encryption')} onChange={(e) => setValue('smtp_encryption', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none">
                  <option value="tls">TLS</option><option value="ssl">SSL</option><option value="">None</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">From Address</label>
                <input type="email" value={getValue('smtp_from_address')} onChange={(e) => setValue('smtp_from_address', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleSave('smtp')} disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                <Save size={16} /> Save SMTP
              </button>
              <div className="flex gap-2 ml-auto">
                <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none w-48" placeholder="test@email.com" />
                <button onClick={handleTestSmtp}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">
                  <Send size={14} /> Test
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'email' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
              <div>
                <p className="font-medium text-gray-900">Email Verification</p>
                <p className="text-sm text-gray-500">Require users to verify email after registration</p>
              </div>
              <button onClick={() => {
                const current = getValue('email_verification_enabled');
                setValue('email_verification_enabled', current === 'true' ? 'false' : 'true');
              }}
                className={`w-12 h-6 rounded-full transition relative ${getValue('email_verification_enabled') === 'true' ? 'bg-brand-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${getValue('email_verification_enabled') === 'true' ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
            <button onClick={() => handleSave('email')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              <Save size={16} /> Save
            </button>
          </div>
        )}

        {tab === 'legal' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy (HTML)</label>
              <textarea value={getValue('privacy_policy')} onChange={(e) => setValue('privacy_policy', e.target.value)}
                rows={8} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions (HTML)</label>
              <textarea value={getValue('terms_conditions')} onChange={(e) => setValue('terms_conditions', e.target.value)}
                rows={8} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-mono text-sm" />
            </div>
            <button onClick={() => handleSave('legal')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              <Save size={16} /> Save Legal Pages
            </button>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Global Smart AI Workspace</h3>
              <p className="text-xs text-gray-500">Configure keys to power AI tools like summarizers, card builders, quizzes and more across the platform.</p>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
              <div>
                <p className="font-medium text-gray-900">Enable Smart AI Assistant</p>
                <p className="text-sm text-gray-500">Allow users to access AI features on their notes dashboard</p>
              </div>
              <button onClick={() => {
                const current = getValue('ai_enabled');
                setValue('ai_enabled', current === 'true' ? 'false' : 'true', 'ai');
              }}
                className={`w-12 h-6 rounded-full transition relative ${getValue('ai_enabled') === 'true' ? 'bg-brand-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${getValue('ai_enabled') === 'true' ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Default AI Provider</label>
              <select value={getValue('ai_provider') || 'deepseek'} onChange={(e) => setValue('ai_provider', e.target.value, 'ai')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-sm transition bg-white cursor-pointer">
                <option value="deepseek">DeepSeek (V4 Flash / V4 Pro)</option>
                <option value="openai">OpenAI (GPT-4o-mini)</option>
                <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
              </select>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 space-y-4">
              <h4 className="text-sm font-bold text-gray-900">OpenAI Workspace (or Custom Endpoint)</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">OpenAI API Key</label>
                <input type="password" value={getValue('openai_api_key')} onChange={(e) => setValue('openai_api_key', e.target.value, 'ai')}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm bg-white" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">API Base URL</label>
                  <input type="text" value={getValue('openai_base_url')} onChange={(e) => setValue('openai_base_url', e.target.value, 'ai')}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Model Name</label>
                  <input type="text" value={getValue('openai_model')} onChange={(e) => setValue('openai_model', e.target.value, 'ai')}
                    placeholder="gpt-4o-mini"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white font-medium" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">DeepSeek Workspace</h4>
                  <p className="text-xs text-gray-500 mt-1">Uses the OpenAI-compatible endpoint at https://api.deepseek.com.</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full w-fit">V4 Ready</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">DeepSeek API Key</label>
                <input type="password" value={getValue('deepseek_api_key')} onChange={(e) => setValue('deepseek_api_key', e.target.value, 'ai')}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm bg-white" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">API Base URL</label>
                  <input type="text" value={getValue('deepseek_base_url') || 'https://api.deepseek.com'} onChange={(e) => setValue('deepseek_base_url', e.target.value, 'ai')}
                    placeholder="https://api.deepseek.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Model Name</label>
                  <input list="deepseek-models" type="text" value={getValue('deepseek_model') || 'deepseek-v4-flash'} onChange={(e) => setValue('deepseek_model', e.target.value, 'ai')}
                    placeholder="deepseek-v4-flash"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white font-medium" />
                  <datalist id="deepseek-models">
                    <option value="deepseek-v4-flash" />
                    <option value="deepseek-v4-pro" />
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-xl border border-emerald-100 bg-white p-3">
                  <p className="font-black text-gray-800 mb-1">deepseek-v4-flash</p>
                  <p className="text-gray-500">Cache hit $0.0028, cache miss $0.14, output $0.28 per 1M tokens. Concurrency 2500.</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-white p-3">
                  <p className="font-black text-gray-800 mb-1">deepseek-v4-pro</p>
                  <p className="text-gray-500">Promo pricing: cache hit $0.003625, cache miss $0.435, output $0.87 per 1M tokens. Concurrency 500.</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">Legacy deepseek-chat and deepseek-reasoner names are compatibility aliases for V4 Flash and should be replaced with the V4 model IDs.</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/60 space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Google Gemini Workspace</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Google Gemini API Key</label>
                <input type="password" value={getValue('gemini_api_key')} onChange={(e) => setValue('gemini_api_key', e.target.value, 'ai')}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm bg-white" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">API Base URL</label>
                  <input type="text" value={getValue('gemini_base_url')} onChange={(e) => setValue('gemini_base_url', e.target.value, 'ai')}
                    placeholder="https://generativelanguage.googleapis.com/v1beta"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Model Name</label>
                  <input type="text" value={getValue('gemini_model')} onChange={(e) => setValue('gemini_model', e.target.value, 'ai')}
                    placeholder="gemini-1.5-flash"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white font-medium" />
                </div>
              </div>
            </div>

            <button onClick={() => handleSave('ai')} disabled={saving}
              className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-600/10 hover:shadow-brand-600/20 hover:-translate-y-0.5 active:translate-y-0 transition duration-200 disabled:opacity-50">
              <Save size={16} /> Save AI Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

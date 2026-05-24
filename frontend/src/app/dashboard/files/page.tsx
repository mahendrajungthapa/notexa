'use client';

import { useEffect, useRef, useState } from 'react';
import { filesApi, friendsApi, resolveApiAssetUrl } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import { FileItem, FileShare, Friend } from '@/types';
import toast from 'react-hot-toast';
import { Download, Eye, File, FileCode2, FileText, FolderOpen, Image, Share2, Trash2, Upload, Users, X } from 'lucide-react';

type ViewerState =
  | { type: 'pdf' | 'image'; name: string; url: string }
  | { type: 'text'; name: string; text: string }
  | null;

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

function extensionOf(name = '') {
  return name.toLowerCase().split('.').pop() || '';
}

function previewKind(file: FileItem): 'pdf' | 'image' | 'text' | null {
  const mime = (file.mime_type || '').toLowerCase();
  const ext = extensionOf(file.original_name);
  const textExts = new Set([
    'txt', 'md', 'markdown', 'csv', 'tsv', 'log', 'json', 'xml', 'yaml', 'yml',
    'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'jsx', 'ts', 'tsx',
    'php', 'py', 'rb', 'java', 'kt', 'kts', 'swift', 'dart', 'go', 'rs',
    'c', 'h', 'cpp', 'hpp', 'cs', 'sql', 'sh', 'bash', 'zsh', 'ps1',
    'bat', 'cmd', 'env', 'ini', 'conf', 'config', 'toml', 'lock',
  ]);

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'].includes(mime) || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (mime.startsWith('text/') || textExts.has(ext)) return 'text';
  return null;
}

function getFileIcon(file: FileItem) {
  const kind = previewKind(file);
  if (kind === 'image') return <Image size={20} className="text-pink-500" />;
  if (kind === 'pdf') return <FileText size={20} className="text-red-500" />;
  if (kind === 'text') return <FileCode2 size={20} className="text-emerald-500" />;
  return <File size={20} className="text-gray-400" />;
}

function extractItems<T>(payload: any): T[] {
  const data = payload?.data?.data ?? payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function FilesPage() {
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileItem[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [shares, setShares] = useState<FileShare[]>([]);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);

    try {
      const ownedRes = await filesApi.list();
      setFiles(extractItems<FileItem>(ownedRes.data));
    } catch (err: any) {
      toast.error('Failed to load files');
      setFiles([]);
    }

    try {
      const sharedRes = await filesApi.sharedWithMe();
      setSharedFiles(extractItems<FileItem>(sharedRes.data));
    } catch {
      setSharedFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await filesApi.upload(file);
      toast.success('File uploaded');
      fetchFiles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleViewFile = async (file: FileItem) => {
    const localKind = previewKind(file);
    if (!localKind) {
      toast.error('Preview is available only for PDF, text/code, and safe image files');
      return;
    }

    try {
      const res = await filesApi.preview(file.id);
      const kind = (res.data.preview_type || localKind) as 'pdf' | 'image' | 'text';
      const url = resolveApiAssetUrl(res.data.preview_url);

      if (kind === 'text') {
        const textRes = await fetch(url, { credentials: 'omit' });
        if (!textRes.ok) throw new Error('Could not load text preview');
        setViewer({ type: 'text', name: file.original_name, text: await textRes.text() });
      } else {
        setViewer({ type: kind, name: file.original_name, url });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Preview failed');
    }
  };

  const handleDownload = async (fileId: number) => {
    try {
      const res = await filesApi.download(fileId);
      window.open(resolveApiAssetUrl(res.data.download_url), '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('Delete this file?')) return;
    try {
      await filesApi.delete(fileId);
      toast.success('Deleted');
      fetchFiles();
    } catch {
      toast.error('Failed');
    }
  };

  const openShareModal = async (file: FileItem) => {
    setShareFile(file);
    setSelectedFriend('');
    setSharing(true);
    try {
      const [friendsRes, sharesRes] = await Promise.all([
        friendsApi.list(),
        filesApi.shares(file.id),
      ]);
      setFriends(extractItems<Friend>(friendsRes.data));
      setShares(extractItems<FileShare>(sharesRes.data));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not load sharing data');
    } finally {
      setSharing(false);
    }
  };

  const shareWithFriend = async () => {
    if (!shareFile || !selectedFriend) return;
    setSharing(true);
    try {
      await filesApi.share(shareFile.id, { user_id: Number(selectedFriend) });
      toast.success('File shared');
      const sharesRes = await filesApi.shares(shareFile.id);
      setShares(extractItems<FileShare>(sharesRes.data));
      setSelectedFriend('');
      fetchFiles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Share failed');
    } finally {
      setSharing(false);
    }
  };

  const unshareFile = async (userId: number) => {
    if (!shareFile) return;
    setSharing(true);
    try {
      await filesApi.unshare(shareFile.id, userId);
      toast.success('Access removed');
      const sharesRes = await filesApi.shares(shareFile.id);
      setShares(extractItems<FileShare>(sharesRes.data));
      fetchFiles();
    } catch {
      toast.error('Could not remove access');
    } finally {
      setSharing(false);
    }
  };

  const usedMB = user ? (user.storage_used / 1048576).toFixed(1) : '0';
  const limitMB = user ? (user.storage_limit / 1048576).toFixed(0) : '50';
  const usagePercent = user ? Math.min((user.storage_used / user.storage_limit) * 100, 100) : 0;
  const visibleFiles = activeTab === 'mine' ? files : sharedFiles;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Files</h1>
          <p className="text-sm text-gray-500 mt-1">{usedMB} MB / {limitMB} MB used</p>
        </div>
        <div>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50">
            {uploading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
            Upload File
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Storage</span>
          <span className="text-gray-900 font-medium">{usagePercent.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${usagePercent}%` }} />
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 mb-6 w-full sm:max-w-sm">
        <button onClick={() => setActiveTab('mine')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition ${activeTab === 'mine' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          My Files ({files.length})
        </button>
        <button onClick={() => setActiveTab('shared')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition ${activeTab === 'shared' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          Shared ({sharedFiles.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
      ) : visibleFiles.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{activeTab === 'mine' ? 'No files uploaded yet' : 'No files shared with you yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleFiles.map((file) => (
            <div key={file.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                {getFileIcon(file)}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{file.original_name}</p>
                  <p className="text-xs text-gray-400">
                    {formatSize(file.size)} &middot; {new Date(file.created_at).toLocaleDateString()}
                    {activeTab === 'shared' && file.user?.username ? ` · Shared by @${file.user.username}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 justify-end w-full sm:w-auto">
                {previewKind(file) && (
                  <button onClick={() => handleViewFile(file)} title="Preview safely" className="p-2 text-gray-400 hover:text-emerald-600 transition">
                    <Eye size={16} />
                  </button>
                )}
                <button onClick={() => handleDownload(file.id)} title="Download" className="p-2 text-gray-400 hover:text-brand-600 transition"><Download size={16} /></button>
                {activeTab === 'mine' && (
                  <>
                    <button onClick={() => openShareModal(file)} title="Share file" className="p-2 text-gray-400 hover:text-indigo-600 transition"><Share2 size={16} /></button>
                    <button onClick={() => handleDelete(file.id)} title="Delete" className="p-2 text-gray-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-between z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl mx-auto flex flex-col h-[92vh] sm:h-[90vh] overflow-hidden border border-gray-150">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2 truncate">
                <FileText size={18} className="text-indigo-500" /> {viewer.name}
              </h2>
              <button onClick={() => setViewer(null)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-gray-50 flex items-center justify-center p-2">
              {viewer.type === 'image' ? (
                <img src={viewer.url} alt={viewer.name} className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-gray-200" />
              ) : viewer.type === 'text' ? (
                <pre className="w-full h-full overflow-auto rounded-lg bg-slate-950 text-slate-100 p-5 text-xs leading-relaxed whitespace-pre-wrap">{viewer.text}</pre>
              ) : (
                <iframe sandbox="allow-downloads allow-same-origin" referrerPolicy="no-referrer" src={viewer.url} className="w-full h-full border-none rounded-lg bg-white" title="Sandboxed PDF preview" />
              )}
            </div>
          </div>
        </div>
      )}

      {shareFile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-md p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Share2 size={20} className="text-indigo-600" /> Share File
              </h3>
              <button onClick={() => setShareFile(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-800 truncate mb-4">{shareFile.original_name}</p>

            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)} className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10">
                <option value="">Choose friend</option>
                {friends
                  .filter((friend) => !shares.some((share) => share.shared_with === friend.id))
                  .map((friend) => <option key={friend.id} value={friend.id}>{friend.name} @{friend.username}</option>)}
              </select>
              <button onClick={shareWithFriend} disabled={!selectedFriend || sharing} className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition">
                Share
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                <Users size={14} /> Shared With
              </div>
              {shares.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No friends have direct access yet.</p>
              ) : shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{share.recipient?.name || 'Friend'}</p>
                    <p className="text-xs text-slate-400">@{share.recipient?.username || 'user'}</p>
                  </div>
                  <button onClick={() => unshareFile(share.shared_with)} disabled={sharing} className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

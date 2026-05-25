'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { filesApi, friendsApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import { FileItem, FileShare, Friend } from '@/types';
import { createPreviewObjectUrl } from '@/lib/file-preview';
import { countUnseenIds, markIdsSeen, refreshNavBadges } from '@/lib/nav-badge-state';
import toast from 'react-hot-toast';
import { Upload, Download, Trash2, FolderOpen, File, Image, FileText, Eye, X, Share2, UserPlus, ExternalLink } from 'lucide-react';

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image size={20} className="text-pink-500" />;
  if (mime.includes('pdf')) return <FileText size={20} className="text-red-500" />;
  return <File size={20} className="text-gray-400" />;
}

function isPreviewable(file: FileItem) {
  const name = String(file.original_name || '').toLowerCase();
  const mime = String(file.mime_type || '').toLowerCase();
  return mime.startsWith('image/')
    || mime.includes('pdf')
    || mime.startsWith('text/')
    || /\.(pdf|txt|md|csv|json|xml|html|css|js|jsx|ts|tsx|php|py|java|dart|go|rs|sql|log|yml|yaml)$/i.test(name);
}

function extractFiles(payload: any): FileItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.files)) return payload.files;
  return [];
}

export default function FilesPage() {
  const user = useAuthStore((s) => s.user);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [shareRecipients, setShareRecipients] = useState<FileShare[]>([]);
  const [selectedShareUserId, setSelectedShareUserId] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);

  // Lightbox Document Viewer states
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerExternalUrl, setViewerExternalUrl] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [viewerIsImage, setViewerIsImage] = useState(false);

  const openPreviewInNewTab = (url: string | null = viewerUrl || viewerExternalUrl) => {
    if (!url || typeof document === 'undefined') return false;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  };

  const closeViewer = () => {
    setViewerUrl(null);
    setViewerExternalUrl('');
    setViewerName('');
    setViewerIsImage(false);
  };

  const handleViewFile = async (file: FileItem) => {
    try {
      const res = await filesApi.preview(file.id);
      const rawUrl: string = res.data.preview_url;
      const previewType = res.data.preview_type;
      const fallbackMimeType = file.mime_type || (previewType === 'pdf' ? 'application/pdf' : 'text/plain');
      let previewUrl = rawUrl;

      try {
        previewUrl = await createPreviewObjectUrl(rawUrl, fallbackMimeType);
      } catch {
        previewUrl = rawUrl;
      }

      setViewerName(file.original_name);
      setViewerExternalUrl(rawUrl);
      setViewerIsImage(previewType === 'image');
      setViewerUrl(previewUrl);

      const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
      if (isMobile && previewType !== 'image') {
        openPreviewInNewTab(previewUrl);
        toast.success(`Opening preview: ${file.original_name}`);
      } else {
        toast.success(`Opening preview: ${file.original_name}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to open file preview');
    }
  };

  const fetchFiles = async () => {
    try {
      const [ownedRes, sharedRes] = await Promise.all([
        filesApi.list(),
        filesApi.sharedWithMe()
      ]);
      setFiles(extractFiles(ownedRes.data));
      setSharedFiles(extractFiles(sharedRes.data));
    } catch {
      toast.error('Failed to load files');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFiles(); }, []);

  useEffect(() => {
    if (!user?.id || loading || sharedFiles.length === 0) return;

    const unseenSharedFiles = countUnseenIds(user.id, 'shared_files', sharedFiles.map((file) => file.id));
    if (unseenSharedFiles > 0 && activeTab === 'owned') {
      setActiveTab('shared');
      return;
    }

    if (activeTab === 'shared') {
      markIdsSeen(user.id, 'shared_files', sharedFiles.map((file) => file.id));
      refreshNavBadges();
    }
  }, [activeTab, loading, sharedFiles, user?.id]);

  useEffect(() => {
    return () => {
      if (viewerUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(viewerUrl);
      }
    };
  }, [viewerUrl]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await filesApi.upload(file);
      const uploaded = res.data?.data;
      if (uploaded?.id) {
        setFiles((items) => [uploaded, ...items.filter((item) => item.id !== uploaded.id)]);
        setActiveTab('owned');
      }
      toast.success('File uploaded!');
      await fetchFiles();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const res = await filesApi.download(file.id);
      const url: string = res.data.download_url || `/api/files/${file.id}/download`;
      // Programmatic anchor click always triggers a download regardless of server headers
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloading ${file.original_name}`, { icon: '⬇️' });
    } catch { toast.error('Download failed'); }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('Delete this file?')) return;
    try {
      await filesApi.delete(fileId);
      toast.success('Deleted');
      fetchFiles();
    } catch { toast.error('Failed'); }
  };

  const updateFileShares = (fileId: number, shares: FileShare[]) => {
    setFiles((items) => items.map((item) => item.id === fileId ? { ...item, shares } : item));
  };

  const openShareModal = async (file: FileItem) => {
    setShareFile(file);
    setShareRecipients(file.shares || []);
    setSelectedShareUserId('');
    setShareLoading(true);

    try {
      const [friendsRes, sharesRes] = await Promise.all([
        friendsApi.list(),
        filesApi.shares(file.id)
      ]);
      setFriends(friendsRes.data?.data || []);
      const recipients = sharesRes.data?.data || [];
      setShareRecipients(recipients);
      updateFileShares(file.id, recipients);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load file sharing');
    } finally {
      setShareLoading(false);
    }
  };

  const handleShareFile = async () => {
    if (!shareFile || !selectedShareUserId) return;
    const userId = Number(selectedShareUserId);
    setShareSaving(true);

    try {
      const res = await filesApi.share(shareFile.id, { user_id: userId });
      const nextShare = res.data?.data;
      const nextRecipients = [
        nextShare,
        ...shareRecipients.filter((item) => item.shared_with !== userId)
      ].filter(Boolean);
      setShareRecipients(nextRecipients);
      updateFileShares(shareFile.id, nextRecipients);
      setSelectedShareUserId('');
      toast.success(res.data?.message || 'File shared');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to share file');
    } finally {
      setShareSaving(false);
    }
  };

  const handleUnshareFile = async (userId: number) => {
    if (!shareFile) return;
    setShareSaving(true);

    try {
      await filesApi.unshare(shareFile.id, userId);
      const nextRecipients = shareRecipients.filter((item) => item.shared_with !== userId);
      setShareRecipients(nextRecipients);
      updateFileShares(shareFile.id, nextRecipients);
      toast.success('File access removed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove access');
    } finally {
      setShareSaving(false);
    }
  };

  const usedLabel = user ? formatSize(user.storage_used) : '0 B';
  const limitLabel = user ? formatSize(user.storage_limit) : '1.00 GB';
  const usagePercent = user ? Math.min((user.storage_used / user.storage_limit) * 100, 100) : 0;
  const displayFiles = activeTab === 'owned' ? files : sharedFiles;
  const sharedUserIds = new Set(shareRecipients.map((item) => item.shared_with));
  const availableFriends = friends.filter((friend) => !sharedUserIds.has(friend.id));

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Files</h1>
          <p className="text-sm text-gray-500 mt-1">{usedLabel} / {limitLabel} used</p>
        </div>
        <div>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50">
            {uploading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
            Upload File
          </button>
        </div>
      </div>

      {/* Storage bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Storage</span>
          <span className="text-gray-900 font-medium">{usagePercent.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${usagePercent}%` }} />
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {[
          { key: 'owned' as const, label: 'My uploads', count: files.length },
          { key: 'shared' as const, label: 'Shared with me', count: sharedFiles.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
            <span className="ml-2 rounded-full bg-white/80 px-1.5 py-0.5 text-xs text-gray-500">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Files list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
      ) : displayFiles.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{activeTab === 'owned' ? 'No files uploaded yet' : 'No files shared with you yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayFiles.map((file) => (
            <div key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(file.mime_type)}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{file.original_name}</p>
                  <p className="text-xs text-gray-400">
                    {formatSize(file.size)} &middot; {new Date(file.created_at).toLocaleDateString()}
                    {activeTab === 'shared' && file.user?.name ? ` · Shared by ${file.user.name}` : ''}
                  </p>
                  {activeTab === 'owned' && (file.shares?.length || 0) > 0 && (
                    <p className="mt-1 text-[11px] font-semibold text-indigo-600">Shared with {file.shares?.length} friend{file.shares?.length === 1 ? '' : 's'}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                {isPreviewable(file) && (
                  <button 
                    onClick={() => handleViewFile(file)} 
                    title="View File Preview"
                    className="p-2 text-gray-400 hover:text-emerald-600 transition"
                  >
                    <Eye size={16} />
                  </button>
                )}
                {activeTab === 'owned' && (
                  <button
                    onClick={() => openShareModal(file)}
                    title="Share with a friend"
                    className="p-2 text-gray-400 hover:text-indigo-600 transition"
                  >
                    <Share2 size={16} />
                  </button>
                )}
                <button onClick={() => handleDownload(file)} title="Download" className="p-2 text-gray-400 hover:text-brand-600 transition"><Download size={16} /></button>
                {activeTab === 'owned' && (
                  <button onClick={() => handleDelete(file.id)} title="Delete" className="p-2 text-gray-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {shareFile && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <Share2 size={18} className="text-indigo-600" /> Share file
                </h2>
                <p className="mt-1 text-xs font-semibold text-gray-500 truncate">{shareFile.original_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShareFile(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {shareLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Share with friend</label>
                    {friends.length === 0 ? (
                      <div className="mt-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
                        <p className="text-sm font-semibold text-gray-600">Add a friend before sharing files.</p>
                        <Link href="/dashboard/friends" className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition">
                          <UserPlus size={14} /> Add friend
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedShareUserId}
                          onChange={(event) => setSelectedShareUserId(event.target.value)}
                          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">Choose friend</option>
                          {availableFriends.map((friend) => (
                            <option key={friend.id} value={friend.id}>
                              {friend.name}{friend.username ? ` (@${friend.username})` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleShareFile}
                          disabled={shareSaving || !selectedShareUserId}
                          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                          {shareSaving ? 'Sharing...' : 'Share'}
                        </button>
                      </div>
                    )}
                    {friends.length > 0 && availableFriends.length === 0 && (
                      <p className="mt-2 text-xs font-semibold text-gray-400">This file is already shared with every friend in your list.</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Current access</h3>
                    {shareRecipients.length === 0 ? (
                      <p className="mt-3 rounded-2xl bg-gray-50 p-4 text-center text-sm font-semibold text-gray-500">No friends have access yet.</p>
                    ) : (
                      <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
                        {shareRecipients.map((share) => (
                          <div key={share.id || share.shared_with} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-800">{share.recipient?.name || 'Friend'}</p>
                              <p className="truncate text-xs font-semibold text-gray-400">@{share.recipient?.username || share.shared_with}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUnshareFile(share.shared_with)}
                              disabled={shareSaving}
                              className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox PDF / Image Reader Modal */}
      {viewerUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-between z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl mx-auto flex flex-col h-[90vh] overflow-hidden border border-gray-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <h2 className="min-w-0 text-base font-extrabold text-gray-800 flex items-center gap-2 truncate">
                  <FileText size={18} className="text-red-500" /> {viewerName}
                </h2>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPreviewInNewTab()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
                >
                  <ExternalLink size={14} /> Open
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Viewer Pane */}
            <div className="flex-1 min-h-0 bg-gray-50 flex items-center justify-center p-2">
              {viewerIsImage ? (
                <img 
                  src={viewerUrl} 
                  alt={viewerName} 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-gray-200" 
                />
              ) : (
                <iframe 
                  src={viewerUrl} 
                  className="w-full h-full border-none rounded-lg bg-white" 
                  title="Document Lightbox Viewer" 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

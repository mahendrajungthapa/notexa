'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { filesApi, friendsApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import toast from 'react-hot-toast';
import {
  Download,
  Eye,
  File as FileIcon,
  FileText,
  FolderOpen,
  Image,
  Share2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

function fmtSize(bytes: number) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function fileIcon(mime = '') {
  if (mime.startsWith('image/')) return <Image size={18} className="text-pink-500" />;
  if (mime.includes('pdf')) return <FileText size={18} className="text-red-500" />;
  return <FileIcon size={18} className="text-gray-400" />;
}

const apiMessage = (error: any, fallback: string) => error?.response?.data?.message || fallback;

export default function FilesPage() {
  const user = useAuthStore((state) => state.user);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'mine' | 'shared'>('mine');
  const [files, setFiles] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [preview, setPreview] = useState<{ file: any; url: string } | null>(null);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const loadFiles = async () => {
    try {
      const [ownedResponse, sharedResponse] = await Promise.all([
        filesApi.list(),
        filesApi.sharedWithMe(),
      ]);
      setFiles(ownedResponse.data.data?.data || []);
      setSharedFiles(sharedResponse.data.data?.data || []);
    } catch (error: any) {
      toast.error(apiMessage(error, 'Could not load files.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await filesApi.upload(file);
      toast.success('Uploaded.');
      await loadFiles();
    } catch (error: any) {
      toast.error(apiMessage(error, 'Upload failed.'));
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  const openPreview = async (file: any) => {
    const mime = String(file.mime_type || '');
    if (!mime.startsWith('image/') && !mime.includes('pdf')) {
      toast.error('Preview is available for images and PDFs.');
      return;
    }

    try {
      const response = await filesApi.preview(file.id);
      setPreview({ file, url: response.data.preview_url });
    } catch (error: any) {
      toast.error(apiMessage(error, 'Preview failed.'));
    }
  };

  const downloadFile = async (file: any) => {
    try {
      const response = await filesApi.download(file.id);
      window.open(response.data.download_url, '_blank');
    } catch (error: any) {
      toast.error(apiMessage(error, 'Download failed.'));
    }
  };

  const openShare = async (file: any) => {
    setSelectedFile(file);
    setSelectedFriend('');
    setShares(file.shares || []);

    try {
      const [friendsResponse, sharesResponse] = await Promise.all([
        friendsApi.list(),
        filesApi.shares(file.id),
      ]);
      setFriends(friendsResponse.data.data || []);
      setShares(sharesResponse.data.data || []);
    } catch (error: any) {
      toast.error(apiMessage(error, 'Could not load sharing options.'));
    }
  };

  const shareFile = async () => {
    if (!selectedFile || !selectedFriend) return;

    setSharing(true);
    try {
      await filesApi.share(selectedFile.id, Number(selectedFriend));
      const response = await filesApi.shares(selectedFile.id);
      setShares(response.data.data || []);
      setSelectedFriend('');
      toast.success('File shared.');
      await loadFiles();
    } catch (error: any) {
      toast.error(apiMessage(error, 'Could not share file.'));
    } finally {
      setSharing(false);
    }
  };

  const unshareFile = async (userId: number) => {
    if (!selectedFile) return;

    try {
      await filesApi.unshare(selectedFile.id, userId);
      setShares((items) => items.filter((item) => item.shared_with !== userId));
      toast.success('Access removed.');
      await loadFiles();
    } catch (error: any) {
      toast.error(apiMessage(error, 'Could not remove access.'));
    }
  };

  const deleteFile = async (file: any) => {
    if (!confirm('Delete this file?')) return;

    try {
      await filesApi.delete(file.id);
      toast.success('Deleted.');
      await loadFiles();
    } catch (error: any) {
      toast.error(apiMessage(error, 'Delete failed.'));
    }
  };

  const pct = user ? Math.min((user.storage_used / user.storage_limit) * 100, 100) : 0;
  const activeFiles = tab === 'mine' ? files : sharedFiles;
  const availableFriends = useMemo(() => {
    const sharedIds = new Set(shares.map((share) => share.shared_with));
    return friends.filter((friend) => !sharedIds.has(friend.id));
  }, [friends, shares]);

  const renderFileRow = (file: any, isShared = false) => (
    <div key={`${isShared ? 'shared' : 'owned'}-${file.id}`} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 min-w-0">
        {fileIcon(file.mime_type)}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{file.original_name}</p>
          <p className="text-xs text-gray-400">
            {fmtSize(file.size)} · {new Date(file.created_at).toLocaleDateString()}
            {isShared && file.user ? ` · shared by @${file.user.username}` : ''}
          </p>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => openPreview(file)} className="p-2 text-gray-400 hover:text-indigo-600" title="Preview">
          <Eye size={16} />
        </button>
        <button onClick={() => downloadFile(file)} className="p-2 text-gray-400 hover:text-indigo-600" title="Download">
          <Download size={16} />
        </button>
        {!isShared && (
          <>
            <button onClick={() => openShare(file)} className="p-2 text-gray-400 hover:text-indigo-600" title="Share">
              <Share2 size={16} />
            </button>
            <button onClick={() => deleteFile(file)} className="p-2 text-gray-400 hover:text-red-500" title="Delete">
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Files</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {(user?.storage_used / 1048576 || 0).toFixed(1)} MB / {(user?.storage_limit / 1048576 || 50).toFixed(0)} MB
          </p>
        </div>
        <div>
          <input ref={uploadRef} type="file" className="hidden" onChange={handleUpload} />
          <button onClick={() => uploadRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {uploading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
            Upload
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Storage</span>
          <span className="font-medium">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">Delete unused files or ask an admin to increase your storage limit.</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button onClick={() => setTab('mine')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${tab === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          Owned ({files.length})
        </button>
        <button onClick={() => setTab('shared')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${tab === 'shared' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          Shared with Me ({sharedFiles.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      ) : activeFiles.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{tab === 'mine' ? 'No files yet' : 'No shared files yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeFiles.map((file) => renderFileRow(file, tab === 'shared'))}
        </div>
      )}

      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="font-bold text-lg">Share File</h2>
                <p className="text-sm text-gray-500 truncate">{selectedFile.original_name}</p>
              </div>
              <button onClick={() => setSelectedFile(null)} className="p-2 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>

            <div className="flex gap-2 mb-5">
              <select value={selectedFriend} onChange={(event) => setSelectedFriend(event.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Choose a friend</option>
                {availableFriends.map((friend) => (
                  <option key={friend.id} value={friend.id}>{friend.name} (@{friend.username})</option>
                ))}
              </select>
              <button onClick={shareFile} disabled={!selectedFriend || sharing} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                Share
              </button>
            </div>

            <div className="space-y-2">
              {shares.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">This file is not shared yet.</p>
              ) : shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-semibold">{share.recipient?.name || 'User'}</p>
                    <p className="text-xs text-gray-400">@{share.recipient?.username}</p>
                  </div>
                  <button onClick={() => unshareFile(share.shared_with)} className="text-sm font-semibold text-red-600 hover:text-red-700">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
              <p className="font-semibold text-sm truncate">{preview.file.original_name}</p>
              <button onClick={() => setPreview(null)} className="p-2 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            <div className="flex-1 bg-gray-50 overflow-auto">
              {String(preview.file.mime_type || '').startsWith('image/') ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img src={preview.url} alt={preview.file.original_name} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <iframe src={preview.url} title={preview.file.original_name} className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

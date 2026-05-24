'use client';

import { useState, useEffect, useRef } from 'react';
import { filesApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';
import { FileItem } from '@/types';
import { createPreviewObjectUrl } from '@/lib/file-preview';
import toast from 'react-hot-toast';
import { Upload, Download, Trash2, FolderOpen, File, Image, FileText, Eye, X } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lightbox Document Viewer states
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState('');
  const [viewerIsImage, setViewerIsImage] = useState(false);

  const handleViewFile = async (file: FileItem) => {
    try {
      const res = await filesApi.preview(file.id);
      const rawUrl: string = res.data.preview_url;
      const previewType = res.data.preview_type;
      const objectUrl = await createPreviewObjectUrl(rawUrl, file.mime_type || (previewType === 'pdf' ? 'application/pdf' : 'text/plain'));

      setViewerName(file.original_name);
      setViewerIsImage(previewType === 'image');
      setViewerUrl(objectUrl);

      toast.success(`Opening preview: ${file.original_name}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to open file preview');
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await filesApi.list();
      setFiles(extractFiles(res.data));
    } catch {
      toast.error('Failed to load files');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFiles(); }, []);

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

  const usedMB = user ? (user.storage_used / 1048576).toFixed(1) : '0';
  const limitMB = user ? (user.storage_limit / 1048576).toFixed(0) : '50';
  const usagePercent = user ? Math.min((user.storage_used / user.storage_limit) * 100, 100) : 0;

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

      {/* Files list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
      ) : files.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No files uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(file.mime_type)}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{file.original_name}</p>
                  <p className="text-xs text-gray-400">{formatSize(file.size)} &middot; {new Date(file.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {isPreviewable(file) && (
                  <button 
                    onClick={() => handleViewFile(file)} 
                    title="View File Preview"
                    className="p-2 text-gray-400 hover:text-emerald-600 transition"
                  >
                    <Eye size={16} />
                  </button>
                )}
                <button onClick={() => handleDownload(file)} title="Download" className="p-2 text-gray-400 hover:text-brand-600 transition"><Download size={16} /></button>
                <button onClick={() => handleDelete(file.id)} className="p-2 text-gray-400 hover:text-red-500 transition"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox PDF / Image Reader Modal */}
      {viewerUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-between z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl mx-auto flex flex-col h-[90vh] overflow-hidden border border-gray-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-extrabold text-gray-800 flex items-center gap-2 truncate">
                <FileText size={18} className="text-red-500" /> {viewerName}
              </h2>
              <button 
                onClick={() => setViewerUrl(null)} 
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <X size={18} />
              </button>
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

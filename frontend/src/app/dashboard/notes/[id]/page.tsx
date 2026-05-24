'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notesApi, friendsApi, filesApi } from '@/services/api';
import { Note, Friend, NoteShare, FileItem, NoteVersion } from '@/types';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Save,
  Share2,
  Eye,
  Edit3,
  X,
  Trash2,
  Copy,
  RefreshCw,
  Sparkles,
  Loader2,
  KeyRound,
  Users,
  Paperclip,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock3,
  FileText,
  Clock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import NoteEditor from '@/components/editor/NoteEditor';

type SaveState = 'saved' | 'dirty' | 'saving' | 'offline';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = Number(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState<Note | null>(null);
  const [permission, setPermission] = useState<string>('owner');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState({ title: '', content: '' });
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sharing state
  const [showShare, setShowShare] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [collaborators, setCollaborators] = useState<NoteShare[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);
  const [sharePerm, setSharePerm] = useState<'view' | 'edit'>('view');
  const [shareCode, setShareCode] = useState('');

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewingVersionId, setPreviewingVersionId] = useState<number | null>(null);
  const [editorContentVersion, setEditorContentVersion] = useState(0);

  // AI & Attachments
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ title: string; url: string } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = permission === 'owner';
  const canEdit = permission === 'owner' || permission === 'edit';
  const draftKey = `notexa_draft_${noteId}`;

  const fetchNote = useCallback(async () => {
    try {
      const response = await notesApi.get(noteId);
      const data = response.data.data;
      const cloudTitle = data.title || '';
      const cloudContent = data.content || '';
      let nextTitle = cloudTitle;
      let nextContent = cloudContent;
      let hasLocalDraft = false;

      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (new Date(parsed.updated_at).getTime() > new Date(data.updated_at).getTime()) {
            nextTitle = parsed.title || cloudTitle;
            nextContent = parsed.content || cloudContent;
            hasLocalDraft = true;
          }
        } catch {
          localStorage.removeItem(draftKey);
        }
      }

      setNote(data);
      setPermission(response.data.permission);
      setTitle(nextTitle);
      setContent(nextContent);
      setLastSaved({ title: cloudTitle, content: cloudContent });
      setDirty(hasLocalDraft);
      setSaveState(hasLocalDraft ? 'dirty' : 'saved');
      setAiSummary(data.ai_summary || '');
      setFiles(data.files || []);
      setCollaborators(data.shares || []);
    } catch (error: any) {
      const isCollabLink = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('collab') === 'true';
      const status = error.response?.status;
      if (status === 403) {
        toast.error(isCollabLink
          ? 'Ask the owner to share this note with you as an editor before using the realtime link.'
          : 'You do not have access to this note.');
      } else {
        toast.error('Note not found');
      }
      router.push('/dashboard/notes');
    } finally {
      setLoading(false);
    }
  }, [draftKey, noteId, router]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const handleSave = useCallback(
    async (silent = false) => {
      if (!canEdit || saving) return;
      setSaving(true);
      setSaveState('saving');

      const cleanTitle = title.trim() || 'Untitled Note';
      try {
        const response = await notesApi.update(noteId, { title: cleanTitle, content });
        const saved = response.data.data;
        const savedTitle = saved.title || cleanTitle;
        const savedContent = saved.content || content;
        setNote(saved);
        setTitle(savedTitle);
        setContent(savedContent);
        setLastSaved({ title: savedTitle, content: savedContent });
        setDirty(false);
        setSaveState('saved');
        localStorage.removeItem(draftKey);
        if (!silent) toast.success('Note saved successfully');
      } catch (error: any) {
        localStorage.setItem(draftKey, JSON.stringify({ title, content, updated_at: new Date().toISOString() }));
        setDirty(true);
        setSaveState('offline');
        if (!silent) toast.error(error.response?.data?.message || 'Saved locally. Retrying when online.');
      } finally {
        setSaving(false);
      }
    },
    [canEdit, content, draftKey, noteId, saving, title]
  );

  // Debounced auto-save (1.4 seconds)
  useEffect(() => {
    if (!note || !canEdit || loading) return;
    const changed = title !== lastSaved.title || content !== lastSaved.content;
    setDirty(changed);
    if (!changed) {
      setSaveState('saved');
      return;
    }
    setSaveState('dirty');
    const timer = setTimeout(() => handleSave(true), 1400);
    return () => clearTimeout(timer);
  }, [canEdit, content, handleSave, lastSaved.content, lastSaved.title, loading, note, title]);

  const openShareModal = async () => {
    if (!isOwner) return;
    setShowShare(true);
    try {
      const [friendsResponse, collaboratorsResponse, codeResponse] = await Promise.all([
        friendsApi.list(),
        notesApi.collaborators(noteId),
        notesApi.getShareCode(noteId),
      ]);
      setFriends(friendsResponse.data.data || []);
      setCollaborators(collaboratorsResponse.data.data || []);
      const currentCode = codeResponse.data.share_code || '';
      setShareCode(currentCode);
      setNote((current) => current && currentCode ? { ...current, share_code: currentCode } : current);
    } catch {
      toast.error('Unable to load sharing options');
    }
  };

  const handleShareFriend = async () => {
    if (!selectedFriend) return;
    try {
      await notesApi.share(noteId, { user_id: selectedFriend, permission: sharePerm });
      toast.success('Note shared with your friend');
      setSelectedFriend(null);
      const collaboratorsResponse = await notesApi.collaborators(noteId);
      setCollaborators(collaboratorsResponse.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to share note');
    }
  };

  const handlePermissionChange = async (userId: number, permissionValue: 'view' | 'edit') => {
    try {
      await notesApi.updatePermission(noteId, userId, { permission: permissionValue });
      setCollaborators((items) => items.map((item) => (item.shared_with === userId ? { ...item, permission: permissionValue } : item)));
      toast.success('Collaborator permission updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update permission');
    }
  };

  const handleUnshare = async (uid: number) => {
    try {
      await notesApi.unshare(noteId, uid);
      setCollaborators((items) => items.filter((item) => item.shared_with !== uid));
      toast.success('Collaborator access removed');
    } catch {
      toast.error('Failed to unshare');
    }
  };

  const handleCopyCode = () => {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode);
    toast.success('Share code copied to clipboard!');
  };

  const handleRegenCode = async () => {
    try {
      const response = await notesApi.regenerateCode(noteId);
      const nextCode = response.data.share_code;
      setShareCode(nextCode);
      setNote((current) => current ? { ...current, share_code: nextCode } : current);
      toast.success('New share code generated!');
    } catch {
      toast.error('Failed to generate new code');
    }
  };

  // Restore version handler
  const handleRevertVersion = async (version: NoteVersion) => {
    if (!confirm(`Restore Version #${version.version_number}? This will replace your current note editor content.`)) return;
    try {
      toast.loading(`Restoring Version #${version.version_number}...`, { id: 'revert-loading' });
      
      const response = await notesApi.update(noteId, { title, content: version.content });
      const saved = response.data?.data;
      const savedTitle = saved?.title || title;
      const savedContent = saved?.content || version.content;
      
      setNote(saved || note);
      setTitle(savedTitle);
      setContent(savedContent);
      setLastSaved({ title: savedTitle, content: savedContent });
      setEditorContentVersion((value) => value + 1);
      setDirty(false);
      setSaveState('saved');
      localStorage.removeItem(draftKey);
      
      toast.success(`Restored Version #${version.version_number}`, { id: 'revert-loading' });
      setShowHistory(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore version', { id: 'revert-loading' });
    }
  };

  const getVersionAuthorName = (v: NoteVersion) => {
    const val = v as any;
    // 1. Check direct user relationship
    if (val.user?.name) return val.user.name;
    if (val.user?.username) return `@${val.user.username}`;
    
    // 2. Check direct custom fields
    if (val.user_name) return val.user_name;
    if (val.author?.name) return val.author.name;
    if (val.creator?.name) return val.creator.name;

    // 3. Match against current logged-in user
    const currentUserId = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('notexa_user') || '{}')?.id : null;
    if (currentUserId && val.user_id === currentUserId) return 'You';

    // 4. Match against note owner
    if (note && val.user_id === note.user_id) {
      return note.user?.name ? `${note.user.name} (Owner)` : 'Owner';
    }

    // 5. Match against collaborators list
    const collab = collaborators.find((c) => c.shared_with === val.user_id);
    if (collab && collab.recipient?.name) {
      return `${collab.recipient.name} (Collaborator)`;
    }

    // 6. Generic Fallback
    return `User #${val.user_id}`;
  };

  const getVersionSnippet = (html: string) => {
    if (typeof window !== 'undefined') {
      const element = document.createElement('div');
      element.innerHTML = html || '';
      return (element.textContent || element.innerText || '').replace(/\s+/g, ' ').trim();
    }
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const openHistoryModal = async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    setPreviewingVersionId(null);
    try {
      const response = await notesApi.versions(noteId);
      const payload = response.data?.data ?? response.data;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : Array.isArray(response.data?.versions)
            ? response.data.versions
            : Array.isArray(response.data?.history)
              ? response.data.history
              : [];
      setVersions([...list].sort((a, b) => (b.version_number || 0) - (a.version_number || 0)));
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to load version history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAiSummary = async () => {
    if (dirty) await handleSave(true);
    setAiLoading(true);
    try {
      const response = await notesApi.aiSummary(noteId);
      setAiSummary(response.data.summary);
      toast.success('AI summary successfully refreshed!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'AI Summary service unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limit document size to 10MB (10 * 1024 * 1024 bytes)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File is too large! Maximum attachment size is 10MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (dirty) await handleSave(true);

    setUploading(true);
    try {
      await filesApi.upload(file, noteId);
      toast.success('File attached successfully');
      await fetchNote();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (fileId: number) => {
    try {
      const response = await filesApi.download(fileId);
      window.open(response.data.download_url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to download attachment');
    }
  };

  const isPdf = (file: FileItem) => {
    const name = String(file.original_name || '').toLowerCase();
    const mime = String(file.mime_type || '').toLowerCase();
    return mime.includes('pdf') || name.endsWith('.pdf');
  };

  // Fetch raw document using backend-supplied direct signed URL as Blob to bypass download disposition headers
  const handlePreviewPdf = async (file: FileItem) => {
    try {
      toast.loading('Loading document preview...', { id: 'pdf-preview' });
      
      // 1. Fetch the direct pre-signed storage URL from backend
      const res = await filesApi.download(file.id);
      const downloadUrl = res.data.download_url;
      
      if (!downloadUrl) throw new Error('Download URL not found');
      
      // 2. Fetch the direct URL as a blob to bypass attachment headers
      const blobResponse = await fetch(downloadUrl);
      if (!blobResponse.ok) throw new Error('Failed to fetch raw document data');
      
      const blob = await blobResponse.blob();
      // Force correct MIME type
      const pdfBlob = new Blob([blob], { type: file.mime_type || 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      setPdfPreview({ title: file.original_name || 'PDF Preview', url: blobUrl });
      toast.success('Preview loaded!', { id: 'pdf-preview' });
    } catch (err: any) {
      console.error('PDF Preview failed:', err);
      toast.error('Direct preview blocked by security. Opening in new tab...', { id: 'pdf-preview' });
      // Fallback: open pre-signed download url directly in new tab
      try {
        const res = await filesApi.download(file.id);
        if (res.data?.download_url) {
          window.open(res.data.download_url, '_blank', 'noopener,noreferrer');
        }
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr);
      }
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('Are you sure you want to permanently remove this attachment?')) return;
    try {
      toast.loading('Removing file...', { id: 'delete-file' });
      await filesApi.delete(fileId);
      toast.success('Attachment successfully removed!', { id: 'delete-file' });
      await fetchNote();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove file', { id: 'delete-file' });
    }
  };

  const handleDeleteNote = async () => {
    setShowDeleteConfirm(true);
  };

  const executeDeleteNote = async () => {
    try {
      toast.loading('Deleting notebook...', { id: 'delete-note' });
      await notesApi.delete(noteId);
      toast.success('Notebook successfully moved to trash!', { id: 'delete-note' });
      setShowDeleteConfirm(false);
      router.push('/dashboard/notes');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete notebook', { id: 'delete-note' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const saveStatus = saving || saveState === 'saving'
    ? { icon: Loader2, label: 'Saving', className: 'text-indigo-600 bg-indigo-50 border-indigo-100', spin: true }
    : saveState === 'offline'
      ? { icon: AlertCircle, label: 'Local Backup', className: 'text-amber-600 bg-amber-50 border-amber-100', spin: false }
      : dirty
        ? { icon: Clock3, label: 'Unsaved Changes', className: 'text-slate-500 bg-slate-50 border-slate-100', spin: false }
        : { icon: CheckCircle2, label: 'Changes Saved', className: 'text-emerald-600 bg-emerald-50 border-emerald-100', spin: false };

  const SaveIcon = saveStatus.icon;

  return (
    <div className={`w-full flex flex-col fade-in animate-in slide-in-from-bottom-4 duration-500 min-h-[calc(100dvh-96px)] lg:min-h-0 lg:overflow-hidden lg:h-[calc(100vh-100px)] ${isZoomed ? 'note-zoomed' : ''}`}>
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 sm:gap-4 shrink-0">
        <button onClick={() => router.push('/dashboard/notes')}
          className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200/60 transition-all duration-300 w-full sm:w-fit">
          <ArrowLeft size={18} strokeWidth={2.5} /> Back
        </button>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest border shadow-sm transition-all duration-300 ${saveStatus.className}`}>
            <SaveIcon size={13} className={saveStatus.spin ? 'animate-spin' : ''} strokeWidth={2.5} /> {saveStatus.label}
          </span>
          {!canEdit && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-sm">
              <Eye size={14} strokeWidth={2.5} /> View Only
            </span>
          )}
          {canEdit && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 px-3.5 py-1.5 rounded-full shadow-sm">
              <Edit3 size={14} strokeWidth={2.5} /> {isOwner ? 'Owner' : 'Editor'}
            </span>
          )}
          <button onClick={handleAiSummary} disabled={aiLoading}
            className="flex flex-1 min-[420px]:flex-none items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-700 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow">
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={2.5} />} AI Summary
          </button>
          {isOwner && (
            <button onClick={handleDeleteNote}
              className="flex flex-1 min-[420px]:flex-none items-center justify-center gap-2 px-3 sm:px-5 py-2.5 bg-white border border-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 hover:border-red-200 transition-all duration-300 shadow-sm hover:shadow">
              <Trash2 size={16} strokeWidth={2.5} /> Delete Note
            </button>
          )}
          {isOwner && (
            <button onClick={openShareModal}
              className="flex flex-1 min-[420px]:flex-none items-center justify-center gap-2 px-3 sm:px-5 py-2.5 bg-white border border-slate-200 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-300 shadow-sm hover:shadow">
              <Share2 size={16} strokeWidth={2.5} /> Share
            </button>
          )}
          {canEdit && (
            <button 
              onClick={() => setIsZoomed(!isZoomed)}
              className="flex items-center justify-center p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition shadow-sm hover:shadow"
              title={isZoomed ? "Zoom Out (Default Text)" : "Zoom In (Enlarge Text)"}
            >
              {isZoomed ? <ZoomOut size={16} strokeWidth={2.5} /> : <ZoomIn size={16} strokeWidth={2.5} />}
            </button>
          )}
          {canEdit && (
            <button onClick={() => handleSave(false)} disabled={saving || !dirty}
              className="flex flex-1 min-[420px]:flex-none items-center justify-center gap-2 px-3 sm:px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all duration-300 shadow-[0_4px_15px_-3px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
              <Save size={16} strokeWidth={2.5} /> Save Note
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout split into Editor & Panels */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_300px] flex-1 min-h-0 lg:overflow-hidden mb-4">
        {/* Left Column: Title, Editor */}
        <section className="flex flex-col min-w-0 h-[calc(100dvh-230px)] min-h-[540px] lg:h-full lg:min-h-0 overflow-hidden">

          {/* Title Area */}
          <div className="relative group flex items-center gap-3 mb-3 border-b border-transparent focus-within:border-slate-200 transition-colors pb-1 shrink-0">
            {canEdit && (
              <div className="hidden sm:flex items-center justify-center text-slate-300 group-focus-within:text-indigo-500 transition-colors shrink-0">
                <Edit3 size={24} strokeWidth={2.5} />
              </div>
            )}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!canEdit}
              className="flex-1 w-full text-2xl lg:text-3xl font-extrabold text-slate-900 border-none outline-none bg-transparent placeholder:text-slate-300 tracking-tight focus:ring-0 px-0"
              placeholder="Untitled Notebook..."
            />
          </div>

          {/* Dynamic Editor Container */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-500 overflow-hidden flex-1 flex flex-col min-h-0">
            <NoteEditor
              content={content}
              onChange={setContent}
              editable={canEdit}
              noteId={noteId}
              collaborationToken={note?.share_code}
              forceContentVersion={editorContentVersion}
            />
          </div>
        </section>

        {/* Right Column: Files & Collaboration Sidebars */}
        <aside className="space-y-4 sm:space-y-6 lg:overflow-y-auto lg:max-h-full lg:pr-1 shrink-0 w-full lg:w-[300px] custom-scrollbar">
          {/* Files Panel */}
          <div className="bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Paperclip size={16} className="text-indigo-500" strokeWidth={2.5} /> Files
              </h2>
              {canEdit && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-50 shadow-sm">
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} strokeWidth={2.5} />} Add
                  </button>
                </>
              )}
            </div>

            {files.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200/80 p-6 text-center bg-slate-50/30">
                <Paperclip size={24} className="mx-auto mb-2 text-slate-400" strokeWidth={2} />
                <p className="text-xs text-slate-400 font-semibold">No attachments attached</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-300 group">
                    <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={18} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-700">{file.original_name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{Math.max((file.size || 0) / 1024, 1).toFixed(0)} KB</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isPdf(file) && (
                        <button onClick={() => handlePreviewPdf(file)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 hover:border-indigo-100 rounded-lg shadow-sm transition">
                          <Eye size={13} strokeWidth={2.5} />
                        </button>
                      )}
                      <button onClick={() => handleDownload(file.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 hover:border-indigo-100 rounded-lg shadow-sm transition">
                        <Download size={13} strokeWidth={2.5} />
                      </button>
                      {canEdit && (
                        <button onClick={() => handleDeleteFile(file.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white border border-slate-100 hover:border-red-100 rounded-lg shadow-sm transition">
                          <Trash2 size={13} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collaboration Info Panel */}
          <div className="bg-white/85 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users size={16} className="text-indigo-500" strokeWidth={2.5} /> Collaboration
            </h2>
            <div className="space-y-3 text-xs font-semibold">
              <div className="flex items-center justify-between text-slate-500 bg-slate-50/50 border border-slate-100 px-3.5 py-2.5 rounded-2xl">
                <span>Your Access</span>
                <span className="font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {isOwner ? 'Owner' : permission}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 bg-slate-50/50 border border-slate-100 px-3.5 py-2.5 rounded-2xl">
                <span>Collaborators</span>
                <span className="font-extrabold text-slate-700">{collaborators.length}</span>
              </div>
              
              {/* History Button Added elegantly above Manage Sharing */}
              {isOwner && (
                <button onClick={openHistoryModal} className="w-full mt-2.5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-sm hover:shadow hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-1.5">
                  <Clock size={13} className="text-indigo-500 animate-pulse" strokeWidth={2.5} /> Version History
                </button>
              )}

              {isOwner && (
                <button onClick={openShareModal} className="w-full py-3 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] hover:from-[#2a1cbc] hover:to-[#4338ca] text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-98 transition-all duration-300">
                  Manage Sharing
                </button>
              )}
            </div>
          </div>

          {/* AI Takeaways Panel */}
          {aiSummary && (
            <div className="bg-amber-50/60 border border-amber-100/80 rounded-3xl p-5 shadow-sm relative overflow-hidden shrink-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full blur-2xl pointer-events-none" />
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700 select-none">
                  <Sparkles size={14} className="animate-pulse" /> AI Key Takeaways
                </div>
                {/* Sleek Summary Regeneration Button */}
                <button 
                  onClick={handleAiSummary} 
                  disabled={aiLoading}
                  className="p-1.5 bg-amber-100/50 hover:bg-amber-100 rounded-lg text-amber-700 hover:text-amber-800 disabled:opacity-50 transition shadow-sm border border-amber-200/30"
                  title="Regenerate AI Summary"
                >
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={2.5} />}
                </button>
              </div>
              <p className="ai-summary-text text-amber-900/80 font-medium whitespace-pre-line leading-relaxed">{aiSummary}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-4 sm:p-6 border border-slate-100 relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="text-lg font-headline font-black text-slate-900 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Share2 size={16} strokeWidth={2.5} />
                </div>
                Share Notebook
              </h2>
              <button onClick={() => setShowShare(false)} className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Share Code Block */}
            <div className="mb-6 rounded-2xl bg-slate-50 p-4 border border-slate-100/80 relative shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <KeyRound size={13} strokeWidth={2.5} /> Share Code
                </div>
                <button onClick={handleRegenCode} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition">
                  <RefreshCw size={12} strokeWidth={2.5} /> New Code
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-lg sm:text-xl font-black tracking-[0.18em] sm:tracking-[0.25em] text-indigo-700 shadow-inner overflow-hidden">
                  {shareCode || '--------'}
                </div>
                <button onClick={handleCopyCode} className="p-3 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all duration-200 shrink-0">
                  <Copy size={16} strokeWidth={2.2} />
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-400 font-semibold leading-relaxed">
                Codes add view-only access. Use friend sharing for edit permissions.
              </p>
            </div>

            {/* Add collaborator */}
            <div className="mb-6 space-y-2.5 shrink-0">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Share with Friend
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedFriend || ''}
                  onChange={(e) => setSelectedFriend(Number(e.target.value) || null)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-slate-50/50 outline-none focus:border-indigo-500 focus:bg-white transition"
                >
                  <option value="">Select friend...</option>
                  {friends.filter((f) => !collaborators.find((c) => c.shared_with === f.id)).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.username ? `@${f.username}` : f.name} ({f.name})
                    </option>
                  ))}
                </select>
                <select value={sharePerm}
                  onChange={(e) => setSharePerm(e.target.value as 'view' | 'edit')}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-slate-50/50 outline-none focus:border-indigo-500 focus:bg-white transition">
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
                <button onClick={handleShareFriend} disabled={!selectedFriend}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 transition-all duration-200">
                  Share
                </button>
              </div>
            </div>

            {/* Current collaborators */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Collaborators ({collaborators.length})
              </div>
              {collaborators.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                  <Users size={20} className="mx-auto mb-2 text-slate-300" strokeWidth={2.2} />
                  <p className="text-xs text-slate-400 font-semibold">No collaborators yet. Add a friend above.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {collaborators.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2.5 px-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-slate-200 transition-all duration-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {c.recipient?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.recipient?.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">
                            {c.recipient?.username ? `@${c.recipient.username}` : c.recipient?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={c.permission} 
                          onChange={(e) => handlePermissionChange(c.shared_with, e.target.value as 'view' | 'edit')}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 outline-none"
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                        </select>
                        <button onClick={() => handleUnshare(c.shared_with)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-5 shrink-0 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-headline font-black text-slate-900 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <Clock size={16} strokeWidth={2.5} />
                </div>
                Version History
              </h2>
              <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar min-h-0">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Loading previous drafts...</p>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                  <Clock size={24} className="mx-auto mb-2 text-slate-300" strokeWidth={2.2} />
                  <p className="text-xs text-slate-400 font-semibold">No version history recorded yet.</p>
                </div>
              ) : (
                versions.map((v, index) => {
                  const isPreviewing = previewingVersionId === v.id;
                  const snippet = getVersionSnippet(v.content);
                  return (
                    <div key={v.id} className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-300">
                      <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-md text-[10px] font-black tracking-wide">
                              Version #{v.version_number}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
                                Latest edit
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-700">
                              by {getVersionAuthorName(v)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-semibold">
                            {new Date(v.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                          <p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-[260px]">
                            {snippet || 'Empty note content'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end min-[420px]:self-auto">
                          <button
                            onClick={() => setPreviewingVersionId(isPreviewing ? null : v.id)}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            {isPreviewing ? 'Hide Preview' : 'Preview'}
                          </button>
                          <button
                            onClick={() => handleRevertVersion(v)}
                            className="px-3 py-1.5 bg-gradient-to-br from-[#3525cd] to-[#4f46e5] text-white rounded-xl text-xs font-bold hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200"
                          >
                            Restore
                          </button>
                        </div>
                      </div>

                      {/* Expandable Preview Area */}
                      {isPreviewing && (
                        <div className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-xl max-h-[160px] overflow-y-auto text-xs font-medium leading-relaxed prose prose-invert custom-scrollbar animate-in slide-in-from-top duration-300">
                          <div dangerouslySetInnerHTML={{ __html: v.content }} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in" onClick={() => setPdfPreview(null)}>
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-indigo-500 shrink-0" strokeWidth={2.5} />
                <span className="truncate">{pdfPreview.title}</span>
              </h2>
              <button onClick={() => setPdfPreview(null)} className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 w-full bg-slate-50 relative">
              <iframe title={pdfPreview.title} src={pdfPreview.url} className="w-full h-full border-none" />
            </div>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-200 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto shadow-sm animate-bounce">
              <Trash2 size={24} strokeWidth={2.2} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-headline font-black text-slate-900">Delete Notebook?</h3>
              <p className="text-xs font-semibold text-slate-400 leading-relaxed max-w-sm mx-auto">
                Are you sure you want to delete <strong className="text-slate-700">"{title || 'Untitled Note'}"</strong>? This notebook will be moved to the trash folder and can be restored later.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider transition"
              >
                No, Keep Note
              </button>
              <button 
                onClick={executeDeleteNote}
                className="flex-1 py-3 bg-gradient-to-br from-rose-500 to-red-600 text-white hover:shadow-lg hover:shadow-rose-500/25 rounded-xl text-xs font-black uppercase tracking-wider transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global stylesheet for Global Zoom controls */}
      <style jsx global>{`
        /* Native and Global AI Summary font size styling */
        .ai-summary-text {
          font-size: 12.5px !important;
          line-height: 1.7 !important;
        }
        
        /* Zoom Mode Overrides */
        .note-zoomed .prose {
          font-size: 1.25rem !important;
          line-height: 1.8 !important;
        }
        .note-zoomed input[type="text"] {
          font-size: 2.25rem !important;
        }
        .note-zoomed .ai-summary-text {
          font-size: 14px !important;
          line-height: 1.8 !important;
        }
        .note-zoomed .text-xs {
          font-size: 13.5px !important;
        }
        .note-zoomed h2 {
          font-size: 16px !important;
        }
        .note-zoomed .w-9.h-9 {
          width: 2.5rem !important;
          height: 2.5rem !important;
        }
      `}</style>
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notesApi, friendsApi, filesApi } from '@/services/api';
import toast from 'react-hot-toast';
import NoteEditor from '@/components/editor/NoteEditor';
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
} from 'lucide-react';

type SaveState = 'saved' | 'dirty' | 'saving' | 'offline';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = Number(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState<any>(null);
  const [permission, setPermission] = useState('owner');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState({ title: '', content: '' });
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [showShare, setShowShare] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);
  const [sharePerm, setSharePerm] = useState<'view' | 'edit'>('view');
  const [shareCode, setShareCode] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ title: string; url: string } | null>(null);

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
    } catch {
      toast.error('Note not found');
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
        if (!silent) toast.success('Saved');
      } catch (error: any) {
        localStorage.setItem(draftKey, JSON.stringify({ title, content, updated_at: new Date().toISOString() }));
        setDirty(true);
        setSaveState('offline');
        if (!silent) toast.error(error.response?.data?.message || 'Saved locally. Retry when online.');
      } finally {
        setSaving(false);
      }
    },
    [canEdit, content, draftKey, noteId, saving, title]
  );

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

  const openShare = async () => {
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
      setShareCode(codeResponse.data.share_code || '');
    } catch {
      toast.error('Unable to load sharing options');
    }
  };

  const handleShareFriend = async () => {
    if (!selectedFriend) return;
    try {
      await notesApi.share(noteId, { user_id: selectedFriend, permission: sharePerm });
      toast.success('Shared');
      setSelectedFriend(null);
      const collaboratorsResponse = await notesApi.collaborators(noteId);
      setCollaborators(collaboratorsResponse.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to share');
    }
  };

  const handlePermissionChange = async (userId: number, permissionValue: 'view' | 'edit') => {
    try {
      await notesApi.updatePermission(noteId, userId, { permission: permissionValue });
      setCollaborators((items) => items.map((item) => (item.shared_with === userId ? { ...item, permission: permissionValue } : item)));
      toast.success('Permission updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update permission');
    }
  };

  const handleUnshare = async (uid: number) => {
    try {
      await notesApi.unshare(noteId, uid);
      setCollaborators((items) => items.filter((item) => item.shared_with !== uid));
      toast.success('Removed');
    } catch {
      toast.error('Failed');
    }
  };

  const handleCopyCode = () => {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode);
    toast.success('Code copied');
  };

  const handleRegenCode = async () => {
    try {
      const response = await notesApi.regenerateCode(noteId);
      setShareCode(response.data.share_code);
      toast.success('New code generated');
    } catch {
      toast.error('Failed');
    }
  };

  const handleAiSummary = async () => {
    if (dirty) await handleSave(true);
    setAiLoading(true);
    try {
      const response = await notesApi.aiSummary(noteId);
      setAiSummary(response.data.summary);
      toast.success('Summary generated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'AI unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (dirty) await handleSave(true);

    setUploading(true);
    try {
      await filesApi.upload(file, noteId);
      toast.success('File attached');
      await fetchNote();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
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
      toast.error('Download failed');
    }
  };

  const isPdf = (file: any) => {
    const name = String(file.original_name || '').toLowerCase();
    const mime = String(file.mime_type || '').toLowerCase();
    return mime.includes('pdf') || name.endsWith('.pdf');
  };

  const handlePreviewPdf = async (file: any) => {
    try {
      const response = await filesApi.download(file.id);
      setPdfPreview({ title: file.original_name || 'PDF', url: response.data.download_url });
    } catch {
      toast.error('Preview failed');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" /></div>;
  }

  const saveStatus = saving || saveState === 'saving'
    ? { icon: Loader2, label: 'Saving', className: 'text-indigo-600', spin: true }
    : saveState === 'offline'
      ? { icon: AlertCircle, label: 'Local backup', className: 'text-amber-600', spin: false }
      : dirty
        ? { icon: Clock3, label: 'Unsaved', className: 'text-gray-500', spin: false }
        : { icon: CheckCircle2, label: 'Saved', className: 'text-emerald-600', spin: false };

  const SaveIcon = saveStatus.icon;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.push('/dashboard/notes')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold border border-gray-200 ${saveStatus.className}`}>
            <SaveIcon size={13} className={saveStatus.spin ? 'animate-spin' : ''} /> {saveStatus.label}
          </span>
          {!canEdit && <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600"><Eye size={12} /> View only</span>}
          {canEdit && <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><Edit3 size={12} /> {isOwner ? 'Owner' : 'Editor'}</span>}
          <button onClick={handleAiSummary} disabled={aiLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Summary
          </button>
          {isOwner && (
            <button onClick={openShare} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
              <Share2 size={12} /> Share
            </button>
          )}
          {canEdit && (
            <button onClick={() => handleSave(false)} disabled={saving || !dirty} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              <Save size={12} /> Save
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <section className="min-w-0">
          {aiSummary && (
            <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
              <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700"><Sparkles size={12} /> AI Summary</div>
              <p className="text-sm leading-relaxed text-amber-900/80">{aiSummary}</p>
            </div>
          )}

          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            readOnly={!canEdit}
            className="mb-3 w-full bg-transparent text-3xl font-extrabold text-gray-950 outline-none placeholder:text-gray-300"
            placeholder="Note title"
          />

          <div className="min-h-[520px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <NoteEditor content={content} onChange={setContent} editable={canEdit} />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Files</h2>
              {canEdit && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Add
                  </button>
                </>
              )}
            </div>
            {files.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center">
                <Paperclip size={20} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-400">No attachments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file: any) => (
                  <div key={file.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                    <FileText size={16} className="shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-700">{file.original_name}</p>
                      <p className="text-[11px] text-gray-400">{Math.max((file.size || 0) / 1024, 1).toFixed(0)} KB</p>
                    </div>
                    {isPdf(file) && (
                      <button onClick={() => handlePreviewPdf(file)} className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-indigo-600"><Eye size={14} /></button>
                    )}
                    <button onClick={() => handleDownload(file.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-indigo-600"><Download size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-bold text-gray-900">Collaboration</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-500"><span>Permission</span><span className="font-semibold text-gray-800">{isOwner ? 'Owner' : permission}</span></div>
              <div className="flex items-center justify-between text-gray-500"><span>Collaborators</span><span className="font-semibold text-gray-800">{collaborators.length}</span></div>
              {isOwner && <button onClick={openShare} className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Manage sharing</button>}
            </div>
          </div>
        </aside>
      </div>

      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowShare(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Share2 size={18} /> Share Note</h2>
              <button onClick={() => setShowShare(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="mb-5 rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-semibold"><KeyRound size={14} /> Share Code</div>
                <button onClick={handleRegenCode} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"><RefreshCw size={12} /> New Code</button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-center font-mono text-lg font-bold tracking-[0.25em] text-indigo-700">
                  {shareCode || '--------'}
                </div>
                <button onClick={handleCopyCode} className="rounded-lg bg-indigo-600 px-3 py-2.5 text-white hover:bg-indigo-700"><Copy size={16} /></button>
              </div>
              <p className="mt-2 text-xs text-gray-400">Codes add view-only access. Use friend sharing for edit access.</p>
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Users size={14} /> Share with Friend</div>
              <div className="flex gap-2">
                <select value={selectedFriend || ''} onChange={(event) => setSelectedFriend(Number(event.target.value) || null)} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none">
                  <option value="">Select friend</option>
                  {friends.filter((friend) => !collaborators.find((item) => item.shared_with === friend.id)).map((friend) => (
                    <option key={friend.id} value={friend.id}>@{friend.username} ({friend.name})</option>
                  ))}
                </select>
                <select value={sharePerm} onChange={(event) => setSharePerm(event.target.value as 'view' | 'edit')} className="w-24 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none">
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
                <button onClick={handleShareFriend} disabled={!selectedFriend} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">Share</button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Collaborators ({collaborators.length})</div>
              {collaborators.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">No collaborators yet.</p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collaborator: any) => (
                    <div key={collaborator.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {collaborator.recipient?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{collaborator.recipient?.name}</p>
                          <p className="truncate text-xs text-gray-400">@{collaborator.recipient?.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={collaborator.permission} onChange={(event) => handlePermissionChange(collaborator.shared_with, event.target.value as 'view' | 'edit')} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs">
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                        </select>
                        <button onClick={() => handleUnshare(collaborator.shared_with)} className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPdfPreview(null)}>
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="truncate text-sm font-bold">{pdfPreview.title}</h2>
              <button onClick={() => setPdfPreview(null)} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
            </div>
            <iframe title={pdfPreview.title} src={pdfPreview.url} className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

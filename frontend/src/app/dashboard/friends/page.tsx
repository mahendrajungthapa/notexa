'use client';

import { useState, useEffect } from 'react';
import { friendsApi, notesApi, filesApi } from '@/services/api';
import { Friend, Friendship, Note, FileItem } from '@/types';
import toast from 'react-hot-toast';
import { UserPlus, Users, Search, Check, X, Trash2, Mail, MoreHorizontal, Share, MessageSquareText, FileText } from 'lucide-react';

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<Friendship[]>([]);
  const [sent, setSent] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'friends' | 'requests' | 'add'>('friends');

  // Share note/file modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [notesList, setNotesList] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [filesList, setFilesList] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'note' | 'file'>('note');
  const [sharing, setSharing] = useState(false);

  const fetchData = async () => {
    try {
      const [fRes, rRes] = await Promise.all([friendsApi.list(), friendsApi.pendingRequests()]);
      setFriends(fRes.data.data || []);
      setReceived(rRes.data.data?.received || []);
      setSent(rRes.data.data?.sent || []);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const profileUsername = new URLSearchParams(window.location.search).get('username');
    if (profileUsername) {
      setUsername(profileUsername.replace(/^@/, ''));
      setTab('add');
    }
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await friendsApi.sendRequest(username);
      toast.success('Friend request sent!');
      setUsername('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    }
  };

  const handleAccept = async (id: number) => {
    try { await friendsApi.acceptRequest(id); toast.success('Accepted!'); fetchData(); } catch { toast.error('Failed'); }
  };

  const handleReject = async (id: number) => {
    try { await friendsApi.rejectRequest(id); toast.success('Rejected'); fetchData(); } catch { toast.error('Failed'); }
  };

  const handleCancelRequest = async (id: number) => {
    try { await friendsApi.rejectRequest(id); toast.success('Request cancelled'); fetchData(); } catch { toast.error('Failed to cancel'); }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm('Remove this friend?')) return;
    try { await friendsApi.removeFriend(userId); toast.success('Friend removed'); fetchData(); } catch { toast.error('Failed'); }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    try {
      const res = await friendsApi.searchUsers(searchQuery);
      setSearchResults(res.data.data || []);
    } catch { toast.error('Search failed'); }
  };

  const handleOpenShare = async (friend: Friend) => {
    setSelectedFriend(friend);
    setShareModalOpen(true);
    setModalTab('note');
    setSelectedNoteId(null);
    setSelectedFileId(null);
    try {
      const [notesRes, filesRes] = await Promise.all([
        notesApi.list(),
        filesApi.list()
      ]);
      const notesData = Array.isArray(notesRes.data?.data) ? notesRes.data.data : notesRes.data?.data?.data || [];
      const filesData = filesRes.data?.data?.data || filesRes.data?.data || [];
      setNotesList(notesData);
      setFilesList(filesData);
    } catch {
      toast.error('Failed to load sharing assets');
    }
  };

  const handleShareSubmit = async () => {
    if (!selectedFriend) return;
    
    setSharing(true);
    try {
      if (modalTab === 'note') {
        if (!selectedNoteId) return;
        await notesApi.share(selectedNoteId, { user_id: selectedFriend.id, permission: 'view' });
        toast.success('Note shared successfully!');
      } else {
        if (!selectedFileId) return;
        await filesApi.share(selectedFileId, { user_id: selectedFriend.id });
        toast.success('File shared successfully!');
      }
      
      setShareModalOpen(false);
      setSelectedNoteId(null);
      setSelectedFileId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to share ${modalTab}`);
    } finally {
      setSharing(false);
    }
  };

  const getUsername = (name?: string, id?: number, username?: string) => {
    if (username && username.trim() !== '') {
      return `@${username.trim()}`;
    }
    if (!name || !id) return '';
    const base = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).join('_');
    const suffix = String(id).slice(-4).padStart(4, '0');
    return `@${base}_${suffix}`;
  };

  const pendingCount = received.length;

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Friends</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {[
          { key: 'friends' as const, label: 'My Friends', count: friends.length },
          { key: 'requests' as const, label: 'Requests', count: pendingCount },
          { key: 'add' as const, label: 'Add Friend', count: 0 },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label} {t.count > 0 && <span className="ml-1 bg-brand-100 text-brand-700 text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>
      ) : (
        <>
          {/* Friends list */}
          {tab === 'friends' && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">Active Connections</h2>
                <button className="text-brand-700 font-semibold text-sm hover:underline">View All</button>
              </div>

              {friends.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No friends yet. Add someone to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {friends.map((f, i) => {
                    const isOnline = f.is_active || false;
                    return (
                      <div key={f.id} className="bg-white rounded-[1.5rem] border border-gray-100 p-5 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-[1.2rem] bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0">
                                {f.avatar ? (
                                  <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                                ) : (
                                  f.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-white ${isOnline ? 'bg-green-600' : 'bg-[#D1D5DB]'}`}></div>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg leading-tight">{f.name}</h3>
                              <p className="text-sm font-medium mt-0.5 text-gray-500">
                                {getUsername(f.name, f.id, f.username)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="relative group">
                            <button className="text-gray-400 hover:text-gray-600 p-1">
                              <MoreHorizontal size={20} />
                            </button>
                            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-gray-100 shadow-lg rounded-xl py-1 z-10 w-36">
                              <button onClick={() => handleRemove(f.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition">
                                <Trash2 size={16} /> Remove Friend
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex mt-5">
                          <button 
                            onClick={() => handleOpenShare(f)}
                            className="w-full flex items-center justify-center gap-2 bg-[#F4F6FB] hover:bg-[#ebf0fa] text-[#4b5563] py-2.5 rounded-xl font-semibold text-sm transition">
                            <Share className="w-4 h-4 text-[#6b7280]" />
                            Share
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Requests */}
          {tab === 'requests' && (
            <div className="space-y-4">
              {received.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Received Requests</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {received.map((r) => (
                      <div key={r.id} className="bg-white rounded-[1.5rem] border border-gray-100 p-5 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[1.2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden">
                              {r.sender?.avatar ? (
                                <img src={r.sender.avatar} alt={r.sender.name} className="w-full h-full object-cover" />
                              ) : (
                                r.sender?.name?.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg leading-tight">{r.sender?.name}</h3>
                              <p className="text-sm font-medium mt-0.5 text-gray-500">{getUsername(r.sender?.name, r.sender?.id, r.sender?.username)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleAccept(r.id)} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition" title="Accept"><Check size={20} /></button>
                            <button onClick={() => handleReject(r.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition" title="Reject"><X size={20} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sent.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Sent Requests (Pending)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sent.map((s) => (
                      <div key={s.id} className="bg-white rounded-[1.5rem] border border-gray-100 p-5 shadow-sm hover:shadow-md transition opacity-90">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-[1.2rem] bg-gray-50 text-gray-500 flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden">
                              {s.receiver?.avatar ? (
                                <img src={s.receiver.avatar} alt={s.receiver.name} className="w-full h-full object-cover grayscale opacity-70" />
                              ) : (
                                s.receiver?.name?.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg leading-tight">{s.receiver?.name}</h3>
                              <p className="text-sm font-medium mt-0.5 text-gray-500">{getUsername(s.receiver?.name, s.receiver?.id, s.receiver?.username)} • Pending</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleCancelRequest(s.id)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition" title="Cancel Request"><X size={20} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {received.length === 0 && sent.length === 0 && (
                <p className="text-center text-gray-400 py-16">No pending requests</p>
              )}
            </div>
          )}

          {/* Add friend */}
          {tab === 'add' && (
            <div className="bg-[#3b2dd4] rounded-[1.5rem] border border-[#3b2dd4] p-8 shadow-sm text-white">
              <div className="mb-6 border-b border-white/10 pb-5">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white"><UserPlus size={22} className="text-white" /> Add a Connection</h2>
                <p className="text-sm text-indigo-100/90 mt-2">Connect with peers by entering their NotExA username.</p>
              </div>
              
              <form onSubmit={handleSendRequest} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    type="text" required value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white/10 rounded-xl border border-white/20 focus:ring-2 focus:ring-white/50 focus:bg-white/15 outline-none font-medium text-white transition-all placeholder:text-indigo-200/80"
                    placeholder="Enter username"
                  />
                </div>
                <button type="submit" className="px-8 py-3.5 bg-white text-[#3b2dd4] rounded-xl font-bold hover:bg-gray-50 hover:shadow-lg active:scale-[0.98] transition-all whitespace-nowrap">
                  Send Request
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Share Note/File Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Share size={20} className="text-indigo-600" /> Share with {selectedFriend?.name}
                </h3>
                <button onClick={() => setShareModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Sub-tabs */}
              <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
                <button
                  onClick={() => setModalTab('note')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${modalTab === 'note' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Share Note
                </button>
                <button
                  onClick={() => setModalTab('file')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${modalTab === 'file' ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Share File
                </button>
              </div>

              {/* Items List */}
              <div className="max-h-64 overflow-y-auto space-y-2 mb-4 p-1 custom-scrollbar">
                {modalTab === 'note' ? (
                  notesList.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-8 font-semibold">No notes available to share.</p>
                  ) : (
                    notesList.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedNoteId === note.id ? 'border-indigo-500 bg-indigo-50/40 text-indigo-900 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'}`}
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-800">{note.title || 'Untitled Notebook'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{new Date(note.created_at).toLocaleDateString()}</p>
                        </div>
                        {note.files && note.files.length > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            {note.files.length} attachment(s)
                          </span>
                        )}
                      </div>
                    ))
                  )
                ) : (
                  filesList.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-8 font-semibold">No files uploaded yet.</p>
                  ) : (
                    filesList.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFileId(file.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedFileId === file.id ? 'border-indigo-500 bg-indigo-50/40 text-indigo-900 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'}`}
                      >
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-800 truncate">{file.original_name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {(file.size / 1024).toFixed(1)} KB &middot; {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 justify-end mt-4 border-t border-slate-100 pt-4 shrink-0">
              <button
                onClick={() => { setShareModalOpen(false); setSelectedNoteId(null); setSelectedFileId(null); }}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleShareSubmit}
                disabled={sharing || (modalTab === 'note' ? !selectedNoteId : !selectedFileId)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition"
              >
                {sharing ? 'Sharing...' : (modalTab === 'note' ? 'Share Note' : 'Share File')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

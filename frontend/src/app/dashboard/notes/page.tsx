'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notesApi } from '@/services/api';
import { Note } from '@/types';
import toast from 'react-hot-toast';
import { Archive, Pin, Trash2, Zap, Star, MoreHorizontal, Info, X, Search, Filter, ArrowDownUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Hash } from 'lucide-react';

const COLORS = ['#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3', '#f3e8ff', '#e0f2fe'];

const DEFAULT_TAGS = [
  { label: 'SEMINAR', bg: 'bg-blue-50', text: 'text-blue-600', icon: MoreHorizontal },
  { label: 'THESIS', bg: 'bg-green-50', text: 'text-green-600', icon: Pin },
  { label: 'LITERATURE', bg: 'bg-slate-100', text: 'text-slate-600', icon: Star },
  { label: 'SYNTHESIS', bg: 'bg-indigo-50', text: 'text-indigo-600', icon: Zap },
];

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function extractNotes(payload: any): Note[] {
  const data = payload?.data?.data ?? payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// Activity log panel component
function ActivityLogPanel({ note, onClose }: { note: Note; onClose: () => void }) {
  const versions = note.shares || [];

  const activities = [
    {
      id: 'owner',
      user: note.user?.name || 'Owner',
      avatar: note.user?.avatar || null,
      action: 'created this note',
      time: note.created_at,
    },
    {
      id: 'updated',
      user: note.user?.name || 'Owner',
      avatar: note.user?.avatar || null,
      action: 'last modified this note',
      time: note.updated_at,
    },
    ...(note.shares || []).map((s, i) => ({
      id: `share_${i}`,
      user: s.recipient?.name || 'Collaborator',
      avatar: s.recipient?.avatar || null,
      action: `was granted ${s.permission} access`,
      time: s.created_at,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="absolute top-0 right-0 w-72 bg-white rounded-[1.25rem] shadow-2xl border border-slate-100 z-50 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h4 className="text-sm font-bold text-slate-800">Activity Log</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {activities.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <img
                  src={a.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.user)}&background=6366f1&color=fff&size=64`}
                  alt={a.user}
                  className="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover"
                />
                <div className="min-w-0">
                  <p className="text-xs text-slate-700 leading-snug">
                    <span className="font-bold">{a.user}</span> {a.action}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(a.time)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SortableNoteCard({ note, tag, onPin, onArchive, onTrash, viewMode, activeSortMode }: { note: Note, tag: any, onPin: any, onArchive: any, onTrash: any, viewMode: 'grid'|'list', activeSortMode?: string }) {
  const router = useRouter();
  const [showActivity, setShowActivity] = useState(false);
  
  // Only enable drag if we're in custom sort mode, otherwise dragging breaks auto-sorting flow
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id, disabled: activeSortMode !== 'custom' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : showActivity ? 30 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  const Icon = tag.icon || Hash;

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'JUST NOW';
    if (diffInHours < 24) return `${diffInHours} HRS AGO`;
    if (diffInHours < 48) return 'YESTERDAY';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  };

  const collaborators = [
    ...(note.shares || []).map(s => ({ name: s.recipient?.name || 'User', avatar: s.recipient?.avatar || null })),
  ];
  const ownerAvatar = { name: note.user?.name || 'Owner', avatar: note.user?.avatar || null };
  const allCollaborators = [ownerAvatar, ...collaborators].slice(0, 3);

  const CollaboratorAvatars = () => (
    <div className="flex -space-x-1.5">
      {allCollaborators.map((c, i) => (
        <img
          key={i}
          src={c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=${['6366f1', '3b82f6', '8b5cf6'][i % 3]}&color=fff&size=64`}
          alt={c.name}
          title={c.name}
          className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm"
        />
      ))}
    </div>
  );

  const relativeTime = getRelativeTime(note.updated_at);
  const isRecent = relativeTime === 'JUST NOW' || relativeTime.includes('HRS AGO');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!showActivity) router.push(`/dashboard/notes/${note.id}`); }}
      className={`bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] border ${note.is_pinned ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-100/60'} flex hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 relative group ${activeSortMode === 'custom' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDragging ? 'shadow-2xl cursor-grabbing scale-[1.04]' : ''} ${viewMode === 'grid' ? 'flex-col h-[320px]' : 'flex-row items-center gap-4 sm:gap-6 h-auto sm:h-28'}`}
    >
      {note.is_pinned && (
        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-md border-2 border-white z-20">
          <Pin size={14} className="fill-indigo-600" />
        </div>
      )}

      {viewMode === 'grid' ? (
        <>
          <div className="flex justify-between items-center mb-5">
            <span className={`text-[10px] font-bold tracking-wider px-3 py-1 rounded-full border border-current/10 ${tag.bg} ${tag.text}`}>
              {tag.label}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={e => { e.stopPropagation(); setShowActivity(v => !v); }}
                className="text-slate-300 hover:text-indigo-500 transition-colors bg-white hover:bg-slate-50 p-1.5 rounded-md"
                title="Activity log"
              >
                <Info size={16} />
              </button>
              <button 
                onClick={e => { e.stopPropagation(); onPin(note); }}
                className={`p-1.5 rounded-md transition-colors ${note.is_pinned ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-500 hover:bg-slate-50'}`}
                title={note.is_pinned ? "Unpin" : "Pin note"}
              >
                 <Pin size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onArchive(note); }}
                className="text-slate-300 hover:text-amber-600 transition-colors bg-white hover:bg-amber-50 p-1.5 rounded-md"
                title="Archive note"
              >
                <Archive size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onTrash(note); }}
                className="text-slate-300 hover:text-red-600 transition-colors bg-white hover:bg-red-50 p-1.5 rounded-md"
                title="Move to trash"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <h3 className="text-xl leading-snug font-bold text-slate-800 group-hover:text-indigo-600 transition-colors mb-2.5 line-clamp-2">
              {note.title}
            </h3>
            <p className="text-[13px] text-slate-500 line-clamp-4 leading-relaxed font-medium">
              {note.plain_text || 'No text content available...'}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isRecent ? 'text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md' : 'text-slate-400 group-hover:text-slate-500 transition-colors'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {relativeTime}
            </span>
            <CollaboratorAvatars />
          </div>

          {showActivity && (
            <ActivityLogPanel note={note} onClose={() => setShowActivity(false)} />
          )}
        </>
      ) : (
        <>
          <div className={`hidden sm:flex flex-col items-center justify-center h-14 w-14 rounded-2xl shrink-0 ${tag.bg}`}>
            <Icon size={24} className={tag.text} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <span className={`text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full border border-current/10 ${tag.bg} ${tag.text}`}>
                {tag.label}
              </span>
              <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                {note.title}
              </h3>
            </div>
            <p className="text-sm text-slate-500 font-medium truncate">
              {note.plain_text || 'No text content available...'}
            </p>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0 pl-4 border-l border-slate-100">
            <div className="hidden md:block">
              <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isRecent ? 'text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md' : 'text-slate-400 group-hover:text-slate-500 transition-colors'}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {relativeTime}
              </span>
            </div>
            <CollaboratorAvatars />
            <div className="flex gap-2">
              <button
                onClick={e => { e.stopPropagation(); setShowActivity(v => !v); }}
                className="text-slate-300 hover:text-indigo-500 bg-white hover:bg-slate-50 p-2 rounded-lg transition-colors"
                title="Activity log"
              >
                <Info size={16} />
              </button>
              <button 
                onClick={e => { e.stopPropagation(); onPin(note); }}
                className={`p-2 rounded-lg transition-colors ${note.is_pinned ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-500 hover:bg-slate-50'}`}
                title={note.is_pinned ? "Unpin" : "Pin note"}
              >
                 <Pin size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onArchive(note); }}
                className="text-slate-300 hover:text-amber-600 bg-white hover:bg-amber-50 p-2 rounded-lg transition-colors"
                title="Archive note"
              >
                <Archive size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onTrash(note); }}
                className="text-slate-300 hover:text-red-600 bg-white hover:bg-red-50 p-2 rounded-lg transition-colors"
                title="Move to trash"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {showActivity && (
            <ActivityLogPanel note={note} onClose={() => setShowActivity(false)} />
          )}
        </>
      )}
    </div>
  );
}

export default function NotesPage() {
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid');
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#ffffff');
  
  // Tag States
  const [availableTags, setAvailableTags] = useState<any[]>(DEFAULT_TAGS);
  const [selectedTag, setSelectedTag] = useState<any>(DEFAULT_TAGS[0]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [noteTagMap, setNoteTagMap] = useState<Record<number, string>>({});

  // Filter and Sort states
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'custom'|'recent'|'oldest'|'alphabetical'>('recent');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTags = localStorage.getItem('notexa_custom_tags');
      const parsedTags = safeJson<any[]>(storedTags, []);
      setAvailableTags([...DEFAULT_TAGS, ...parsedTags.filter(Boolean)]);

      const storedMap = localStorage.getItem('notexa_note_tags');
      setNoteTagMap(safeJson<Record<number, string>>(storedMap, {}));
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchNotes = useCallback(async () => {
    try {
      const res = await notesApi.list();
      setNotes(extractNotes(res.data));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []); // backend search removed since we want real-time local filtering for better UX

  useEffect(() => {
    const timer = setTimeout(fetchNotes, 300);
    return () => clearTimeout(timer);
  }, [fetchNotes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await notesApi.create({ title: newTitle, color: newColor, category: selectedTag?.label } as any);
      
      const newNote = res.data?.data || res.data;
      if (newNote?.id && selectedTag) {
        const storedMap = JSON.parse(localStorage.getItem('notexa_note_tags') || '{}');
        storedMap[newNote.id] = selectedTag.label;
        localStorage.setItem('notexa_note_tags', JSON.stringify(storedMap));
        setNoteTagMap(storedMap);
      }

      toast.success('Note created!');
      setShowCreate(false);
      setNewTitle('');
      setNewColor('#ffffff');
      fetchNotes();
    } catch (err: any) {
      toast.error('Failed to create note');
    }
  };

  const handleAddCustomTag = () => {
    if (!newTagInput.trim()) {
      setIsAddingTag(false);
      return;
    }
    const label = newTagInput.trim().toUpperCase();
    if (availableTags.find(t => t.label === label)) {
       toast.error('Tag already exists!');
       return;
    }
    const colorSets = [
      { bg: 'bg-orange-50', text: 'text-orange-600' },
      { bg: 'bg-pink-50', text: 'text-pink-600' },
      { bg: 'bg-teal-50', text: 'text-teal-600' },
      { bg: 'bg-cyan-50', text: 'text-cyan-600' },
    ];
    const color = colorSets[Math.floor(Math.random() * colorSets.length)];
    const newTag = { label, ...color, icon: Hash };
    
    const updatedTags = [...availableTags, newTag];
    setAvailableTags(updatedTags);
    
    const customOnly = updatedTags.filter(t => !DEFAULT_TAGS.find(d => d.label === t.label));
    localStorage.setItem('notexa_custom_tags', JSON.stringify(customOnly));
    
    setSelectedTag(newTag);
    setIsAddingTag(false);
    setNewTagInput('');
  };

  const handleRemoveCustomTag = (label: string) => {
    const updatedTags = availableTags.filter(t => t.label !== label);
    setAvailableTags(updatedTags);
    
    const customOnly = updatedTags.filter(t => !DEFAULT_TAGS.find(d => d.label === t.label));
    localStorage.setItem('notexa_custom_tags', JSON.stringify(customOnly));
    
    if (selectedTag?.label === label) {
      setSelectedTag(DEFAULT_TAGS[0]);
    }
  };

  const handlePin = async (note: Note) => {
    try {
      await notesApi.togglePin(note.id);
      fetchNotes();
    } catch { toast.error('Failed'); }
  };

  const handleArchive = async (note: Note) => {
    try {
      await notesApi.toggleArchive(note.id);
      toast.success('Note archived');
      fetchNotes();
    } catch { toast.error('Failed'); }
  };

  const handleTrash = async (note: Note) => {
    try {
      await notesApi.delete(note.id);
      toast.success('Moved to trash');
      fetchNotes();
    } catch { toast.error('Failed'); }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (sortBy !== 'custom') {
      // Switch to custom sort if user initiates a drag manually while in auto-sort
      setSortBy('custom');
    }
    const { active, over } = event;
    if (active.id !== over?.id) {
      setNotes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n' && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        setShowCreate(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute filtered and sorted list
  const filteredNotes = notes.filter((n) => {
    const title = (n.title || '').toLowerCase();
    const body = (n.plain_text || '').toLowerCase();
    if (search && !title.includes(search.toLowerCase()) && !body.includes(search.toLowerCase())) return false;
    if (filterCategory !== 'all') {
      const tagLabel = noteTagMap[n.id] || DEFAULT_TAGS[n.id % DEFAULT_TAGS.length].label;
      if (tagLabel.toLowerCase() !== filterCategory.toLowerCase()) return false;
    }
    return true;
  }).sort((a, b) => {
    switch(sortBy) {
      case 'recent': return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case 'oldest': return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      case 'alphabetical': return (a.title || '').localeCompare(b.title || '');
      default: return 0; // 'custom' keeps array order
    }
  });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);

  return (
    <div className="w-full pb-20 fade-in animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Dynamic Header & Filters Area */}
      <div className="mb-10 lg:mb-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">My Workspace</h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              Your active synthesis space. {notes.length} entries across {availableTags.length} categories.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Search */}
            <div className="relative group flex-1 sm:flex-none">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="relative">
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="all">All Category</option>
                  {availableTags.map(t => <option key={t.label} value={t.label.toLowerCase()}>{t.label}</option>)}
                </select>
                <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              {/* Sort */}
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="custom">Custom Order</option>
                  <option value="recent">Recently Updated</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
                <ArrowDownUp size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0 hidden sm:flex">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors duration-300 ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors duration-300 ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:-translate-y-1 hover:scale-105 transition-all z-40 focus:ring-4 focus:ring-indigo-500/30"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </button>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Create New Notebook</h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-500 mb-2 uppercase">Title</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="E.g., Phenomenology of Digital Spaces..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-800 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-500 mb-2 uppercase">Color Coding</label>
                <div className="flex gap-3">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setNewColor(c)}
                      className={`w-10 h-10 rounded-full border-2 transition-all shadow-sm ${newColor === c ? 'border-indigo-600 scale-110 shadow-md ring-4 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-500 mb-2 uppercase">Category / Tag</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((t) => {
                    const isCustom = !DEFAULT_TAGS.find(d => d.label === t.label);
                    return (
                      <div key={t.label} className="relative flex items-center group">
                        <button
                          type="button"
                          onClick={() => setSelectedTag(t)}
                          className={`px-3 py-1.5 rounded-full text-[10px] tracking-wider font-bold transition-all border-2 ${selectedTag?.label === t.label ? 'border-indigo-600 shadow-md ' + t.bg + ' ' + t.text : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'} ${isCustom ? 'pr-7' : ''}`}
                        >
                          {t.label}
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            title="Remove Tag"
                            onClick={(e) => { e.stopPropagation(); handleRemoveCustomTag(t.label); }}
                            className={`absolute right-1 w-5 h-5 flex items-center justify-center rounded-full transition-colors ${selectedTag?.label === t.label ? 'text-indigo-600 hover:bg-indigo-100' : 'text-slate-400 hover:bg-red-50 hover:text-red-500'}`}
                          >
                            <X size={12} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {isAddingTag ? (
                    <div className="flex items-center">
                       <input 
                          autoFocus 
                          type="text" 
                          value={newTagInput} 
                          onChange={e=>setNewTagInput(e.target.value)} 
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTag(); } else if (e.key === 'Escape') { setIsAddingTag(false); } }} 
                          onBlur={handleAddCustomTag} 
                          className="px-3 py-1.5 text-[10px] tracking-wider font-bold border-2 border-indigo-600 rounded-full w-24 outline-none uppercase" 
                          placeholder="TAG NAME" 
                       />
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsAddingTag(true)} className="px-3 py-1.5 rounded-full text-[10px] tracking-wider font-bold transition-all border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:bg-slate-100 uppercase">
                      + Add New
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-3 rounded-xl text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_4px_15px_-3px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 transition-all font-bold">
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Pin size={16} /> Pinned
              </h2>
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-4"}>
                <SortableContext items={pinnedNotes.map(n => n.id)} strategy={rectSortingStrategy}>
                  {pinnedNotes.map((note) => {
                    const mappedTagLabel = noteTagMap[note.id];
                    const tagObj = mappedTagLabel ? availableTags.find(t=>t.label===mappedTagLabel) || availableTags[0] : DEFAULT_TAGS[note.id % DEFAULT_TAGS.length];
                    return (
                      <SortableNoteCard
                        key={note.id}
                        note={note}
                        tag={tagObj}
                        onPin={handlePin}
                        onArchive={handleArchive}
                        onTrash={handleTrash}
                        viewMode={viewMode}
                        activeSortMode={sortBy}
                      />
                    );
                  })}
                </SortableContext>
              </div>
            </div>
          )}

          {/* All/Remaining Section */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
             {pinnedNotes.length > 0 && (
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">All Notes</h2>
             )}
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-4"}>
              
              {/* Only show 'Create New' card if not filtering heavily by search */}
              {!search && (
                 <button
                 onClick={() => setShowCreate(true)}
                 className={`group rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 hover:bg-indigo-50/50 hover:border-indigo-300 flex items-center justify-center transition-all duration-300 cursor-pointer ${viewMode === 'grid' ? "flex-col h-[320px]" : "flex-row h-24 sm:h-28 gap-4 px-6 justify-start"}`}
               >
                 <div className={`rounded-full bg-white text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm ${viewMode === 'grid' ? "w-14 h-14 mb-4 group-hover:scale-110" : "w-12 h-12"}`}>
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                 </div>
                 <div className={viewMode === 'grid' ? "text-center" : "text-left"}>
                   <h3 className="font-bold text-slate-700 mb-1 group-hover:text-indigo-900 transition-colors">Create New Notebook</h3>
                   <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Press N to start</p>
                 </div>
               </button>
              )}

              <SortableContext
                items={unpinnedNotes.map(n => n.id)}
                strategy={rectSortingStrategy}
              >
                {unpinnedNotes.map((note) => {
                  const mappedTagLabel = noteTagMap[note.id];
                  const tagObj = mappedTagLabel ? availableTags.find(t=>t.label===mappedTagLabel) || availableTags[0] : DEFAULT_TAGS[note.id % DEFAULT_TAGS.length];
                  return (
                    <SortableNoteCard
                      key={note.id}
                      note={note}
                      tag={tagObj}
                      onPin={handlePin}
                      onArchive={handleArchive}
                      onTrash={handleTrash}
                      viewMode={viewMode}
                      activeSortMode={sortBy}
                    />
                  );
                })}
              </SortableContext>
            </div>
            
            {!loading && filteredNotes.length === 0 && search && (
               <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Search size={24} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">No notes found</h3>
                  <p className="text-slate-500">We couldn't find anything matching "{search}"</p>
               </div>
            )}
          </div>

        </DndContext>
      )}
    </div>
  );
}

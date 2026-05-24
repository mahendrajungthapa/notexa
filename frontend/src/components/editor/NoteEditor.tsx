'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import ImageExt from '@tiptap/extension-image';
import LinkExt from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, CheckSquare,
  Quote, Code, Image, Link, AlignLeft, AlignCenter, AlignRight,
  Highlighter, Undo, Redo, Wand2, Layers, HelpCircle, ScanLine, Bot, Check, Languages,
  X, ChevronLeft, ChevronRight, Copy, RotateCw, Award, BookOpen, ArrowRight, Eye, Sparkles,
  Heart, Play, Square, Plus, Trash2, Users, FileText, Share2
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { filesApi, notesApi } from '@/services/api';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  noteId?: number;
  collabToken?: string;
}

const normalizeImageWidth = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return `${Math.max(96, Math.round(value))}px`;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return `${Math.max(96, Number(trimmed))}px`;
  if (/^\d+(\.\d+)?px$/.test(trimmed)) return trimmed;
  if (/^\d+(\.\d+)?%$/.test(trimmed)) return trimmed;

  return null;
};

const ResizableImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => normalizeImageWidth(element.getAttribute('data-width') || element.getAttribute('width') || element.style.width),
        renderHTML: (attributes: { width?: string | null }) => {
          const width = normalizeImageWidth(attributes.width);
          if (!width) return {};

          return {
            'data-width': width,
            width,
            style: `width: ${width}; max-width: 100%; height: auto;`,
          };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node;
      let startX = 0;
      let startWidth = 0;
      let cleanupResize: (() => void) | null = null;

      const wrapper = document.createElement('span');
      wrapper.className = 'notexa-resizable-image';
      wrapper.contentEditable = 'false';

      const image = document.createElement('img');
      const handle = document.createElement('span');
      handle.className = 'notexa-image-resize-handle';
      handle.setAttribute('aria-hidden', 'true');

      const render = (nextNode: typeof node) => {
        currentNode = nextNode;
        image.src = nextNode.attrs.src;
        image.alt = nextNode.attrs.alt || '';
        image.title = nextNode.attrs.title || '';

        const width = normalizeImageWidth(nextNode.attrs.width);
        wrapper.style.width = width || '';
        image.style.width = width ? '100%' : '';
      };

      const commitWidth = () => {
        const width = normalizeImageWidth(wrapper.style.width);
        const position = getPos();
        if (!width || typeof position !== 'number') return;

        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(position, undefined, {
            ...currentNode.attrs,
            width,
          })
        );
      };

      const stopResize = () => {
        wrapper.classList.remove('is-resizing');
        commitWidth();
        cleanupResize?.();
        cleanupResize = null;
      };

      const startResize = (event: PointerEvent) => {
        if (!editor.isEditable) return;

        event.preventDefault();
        event.stopPropagation();
        startX = event.clientX;
        startWidth = wrapper.getBoundingClientRect().width || image.getBoundingClientRect().width || 320;
        wrapper.classList.add('is-resizing');
        handle.setPointerCapture?.(event.pointerId);

        const resize = (moveEvent: PointerEvent) => {
          const editorWidth = editor.view.dom.getBoundingClientRect().width || startWidth;
          const nextWidth = Math.min(Math.max(96, startWidth + moveEvent.clientX - startX), editorWidth);
          wrapper.style.width = `${Math.round(nextWidth)}px`;
          image.style.width = '100%';
        };

        const endResize = () => stopResize();

        window.addEventListener('pointermove', resize);
        window.addEventListener('pointerup', endResize, { once: true });
        cleanupResize = () => {
          window.removeEventListener('pointermove', resize);
          window.removeEventListener('pointerup', endResize);
        };
      };

      handle.addEventListener('pointerdown', startResize);
      wrapper.append(image, handle);
      render(node);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== currentNode.type.name) return false;
          render(updatedNode);
          return true;
        },
        selectNode: () => wrapper.classList.add('ProseMirror-selectednode'),
        deselectNode: () => wrapper.classList.remove('ProseMirror-selectednode'),
        destroy: () => {
          handle.removeEventListener('pointerdown', startResize);
          cleanupResize?.();
        },
      };
    };
  },
});

export default function NoteEditor({ content, onChange, editable = true, noteId, collabToken = '' }: NoteEditorProps) {
  // Real-time collaboration state
  const [collabActive, setCollabActive] = useState(false);
  const [collabStatus, setCollabStatus] = useState<'connecting' | 'connected' | 'offline'>('offline');
  const [collabPeers, setCollabPeers] = useState<any[]>([]);
  const [serverPeers, setServerPeers] = useState<any[]>([]);
  const [collabSharedLink, setCollabSharedLink] = useState('');
  const ydocRef = useRef<any>(null);
  const providerRef = useRef<any>(null);
  const sharedContentRef = useRef<any>(null);
  const applyingRemoteRef = useRef(false);
  const collabActiveRef = useRef(false);
  const localClientIdRef = useRef(`notexa-${Math.random().toString(36).slice(2)}`);
  const localColorRef = useRef('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
  const lastTypingPresenceAtRef = useRef(0);
  const sendPresenceRef = useRef<(isTyping?: boolean) => void>(() => {});
  const typingClearTimerRef = useRef<number | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your note...' }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      ResizableImage,
      LinkExt.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      const nextHtml = editor.getHTML();
      onChange(nextHtml);

      if (collabActiveRef.current && sharedContentRef.current && !applyingRemoteRef.current) {
        sharedContentRef.current.set('html', nextHtml);
        sharedContentRef.current.set('updatedBy', localClientIdRef.current);
        sharedContentRef.current.set('updatedAt', Date.now());
      }

      if (collabActiveRef.current) {
        sendPresenceRef.current(true);
        providerRef.current?.awareness?.setLocalStateField('editing', { at: Date.now() });
        if (typingClearTimerRef.current) window.clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = window.setTimeout(() => {
          providerRef.current?.awareness?.setLocalStateField('editing', null);
          sendPresenceRef.current(false);
          typingClearTimerRef.current = null;
        }, 1600);
      }

      // ADHD Passive Cheerleader: Praise every 150 characters
      const text = editor.getText();
      if (text.length > 0 && text.length % 150 === 0) {
        const praises = [
          "Outstanding focus! Your study note is growing beautifully! 🌟",
          "Excellent progress! Keep writing, you are doing a highly impressive job! 🚀",
          "Look at you go! Every single sentence counts—keep up the phenomenal work! 🧠",
          "DopaCompanion: Fantastic study flow! You're unlocking major insights! 💎",
          "Amazing momentum! ADHD Focus Mode is in full effect! 🔥"
        ];
        const randomPraise = praises[Math.floor(Math.random() * praises.length)];
        toast(randomPraise, { icon: '✨', duration: 4000 });
        
        // Trigger visual confetti
        const trigger = (window as any).triggerConfetti;
        if (trigger) trigger();
      }
    },
  });

  useEffect(() => {
    if (!editor || applyingRemoteRef.current) return;
    const nextContent = content || '';
    if (editor.getHTML() !== nextContent) {
      editor.commands.setContent(nextContent, false);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  // Curated ADHD Positive Reinforcement Phrases
  const ADHD_AFFIRMATIONS = [
    "Fantastic job opening your study notebook! Getting started is the hardest part, and you already did it! 🌟",
    "Look at you go! You are actively making progress and building knowledge. Take a deep breath—you are capable of great things! 🧠",
    "Outstanding focus! Every single concept you write down locks in the learning. Keep up the phenomenal work! 💎",
    "Consistency isn't about being perfect; it's about trying. You are doing an absolutely incredible job today! 🚀",
    "Your brain is powerful, creative, and unique. Micro-goals lead to macro-achievements. You've got this! 🔥",
    "Take a moment to appreciate your effort! Studying takes dedication, and you are crushed it! 🏆",
    "Celebrate this focus moment! No step is too small. You are taking control of your future! ✨",
    "Brilliant study flow! Let's take a small victory lap for showing up for yourself today! 🦄"
  ];

  // ADHD Focus States
  const [showAdhdHub, setShowAdhdHub] = useState(false);
  const [adhdTimer, setAdhdTimer] = useState(900); // 15 minutes default
  const [adhdTimerActive, setAdhdTimerActive] = useState(false);
  const [adhdTimerDuration, setAdhdTimerDuration] = useState(900);
  const [adhdTasks, setAdhdTasks] = useState([
    { id: 1, text: 'Open study notebook', completed: true },
    { id: 2, text: 'Note down 3 primary concepts', completed: false },
    { id: 3, text: 'Run a smart AI summarization', completed: false }
  ]);
  const [adhdNewTask, setAdhdNewTask] = useState('');
  const [adhdAffirmation, setAdhdAffirmation] = useState("Outstanding job showing up today! That is the hardest step—you are ready to learn!");

  // ADHD Pomodoro Timer countdown
  useEffect(() => {
    let interval: any = null;
    if (adhdTimerActive && adhdTimer > 0) {
      interval = setInterval(() => {
        setAdhdTimer((prev) => prev - 1);
      }, 1000);
    } else if (adhdTimer === 0 && adhdTimerActive) {
      setAdhdTimerActive(false);
      const trigger = (window as any).triggerConfetti;
      if (trigger) trigger();
      
      // Re-open the drawer to show the final praise
      setShowAdhdHub(true);

      // Cycle through celebratory affirmations specifically for completing a sprint
      const endPraises = [
        "🏆 Phenomenal focus sprint! You powered through with extraordinary determination. Take a well-deserved break!",
        "🌟 SPRINT COMPLETE! You showed up, stayed focused, and proved that you are absolutely capable of deep study. You are incredible!",
        "✨ Focus session complete! Your dedication in that sprint is a testament to your strength. Celebrate this moment!",
        "🎉 Outstanding! You finished your entire focus sprint without giving up. That is the kind of discipline that creates scholars!",
        "💎 You did it! A full focus session completed! Your brain worked hard — reward it with a short break. You earned it!"
      ];
      setAdhdAffirmation(endPraises[Math.floor(Math.random() * endPraises.length)]);
      
      toast.success("🎉 Focus Sprint Complete! Amazing work — you crushed it! Take a 3-minute break, you absolutely earned it!", { duration: 7000 });
      setAdhdTimer(adhdTimerDuration);
    }
    return () => clearInterval(interval);
  }, [adhdTimerActive, adhdTimer]);

  // Split-Screen PDF States
  const [showPdfSidebar, setShowPdfSidebar] = useState(false);
  const [pdfFilesList, setPdfFilesList] = useState<any[]>([]);
  const [pdfFilesLoading, setPdfFilesLoading] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [activePdfName, setActivePdfName] = useState<string>('');

  const fetchPdfFiles = async () => {
    setPdfFilesLoading(true);
    try {
      const res = await filesApi.list();
      const files = res.data?.data?.data || res.data?.data || [];
      const pdfs = files.filter((f: any) => f.mime_type?.includes('pdf') || f.original_name?.toLowerCase().endsWith('.pdf'));
      setPdfFilesList(pdfs);
    } catch (e) {
      console.warn("Failed loading files list", e);
    } finally {
      setPdfFilesLoading(false);
    }
  };

  // Confetti Animation Engine
  useEffect(() => {
    (window as any).triggerConfetti = () => {
      const canvas = document.getElementById('notexa-confetti-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const colors = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
      const particles: any[] = [];

      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + Math.random() * 40,
          vx: (Math.random() - 0.5) * 14,
          vy: -Math.random() * 16 - 12,
          radius: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
          opacity: 1
        });
      }

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;

        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // gravity
          p.rotation += p.rotationSpeed;
          
          if (p.vy > 0) {
            p.opacity -= 0.015;
          }

          if (p.opacity > 0 && p.x >= 0 && p.x <= canvas.width) {
            active = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 1.3);
            ctx.restore();
          }
        });

        if (active) {
          requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      animate();
    };
  }, []);

  // AI Feature States
  const [aiFeature, setAiFeature] = useState<'ask' | 'summarize' | 'flashcards' | 'quiz' | 'ocr' | 'translate' | 'meaning' | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiResultApplied, setAiResultApplied] = useState(false);

  useEffect(() => {
    collabActiveRef.current = collabActive;
    if (!collabActive) setCollabStatus('offline');
  }, [collabActive]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (editable && noteId) {
      setCollabActive(true);
      return;
    }
    if (params.get('collab') === 'true' || params.has('collab_token') || params.has('token')) {
      setCollabActive(true);
    }
  }, [editable, noteId]);

  const buildCollabLink = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('collab', 'true');
    if (collabToken) {
      url.searchParams.set('collab_token', collabToken);
    }
    return url.toString();
  };

  useEffect(() => {
    if (collabActive) {
      setCollabSharedLink(buildCollabLink());
    }
  }, [collabActive, collabToken]);

  // Real-time P2P collaboration: sync the editor document through a Yjs WebRTC room.
  useEffect(() => {
    if (!collabActive || !editor || typeof window === 'undefined') return;

    const Y = require('yjs');
    const { WebrtcProvider } = require('y-webrtc');
    setCollabStatus('connecting');
    const doc = new Y.Doc();
    const sharedContent = doc.getMap('note');
    const noteIdMatch = window.location.pathname.match(/\/notes\/(\d+)/);
    const roomId = noteId ? `notexa-collab-room-${noteId}` : noteIdMatch ? `notexa-collab-room-${noteIdMatch[1]}` : 'notexa-collab-room-fallback';
    const configuredSignaling = (process.env.NEXT_PUBLIC_YJS_SIGNALING_URLS || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    const provider = new WebrtcProvider(roomId, doc, {
      signaling: configuredSignaling.length ? configuredSignaling : ['wss://signaling.yjs.dev'],
    });

    ydocRef.current = doc;
    providerRef.current = provider;
    sharedContentRef.current = sharedContent;

    let userName = 'Collaborator';
    try {
      const cachedUser = JSON.parse(localStorage.getItem('notexa_user') || '{}');
      userName = cachedUser?.name || cachedUser?.username || userName;
    } catch {}

    provider.awareness.setLocalStateField('user', {
      id: localClientIdRef.current,
      name: userName,
      color: localColorRef.current,
    });
    const readyTimer = window.setTimeout(() => setCollabStatus('connected'), 800);

    const seedTimer = window.setTimeout(() => {
      if (!sharedContent.get('html')) {
        const currentHtml = editor.getHTML();
        sharedContent.set('html', currentHtml);
        sharedContent.set('updatedBy', localClientIdRef.current);
        sharedContent.set('updatedAt', Date.now());
      }
    }, 450);

    const applyRemoteContent = () => {
      const remoteHtml = sharedContent.get('html');
      const updatedBy = sharedContent.get('updatedBy');
      if (typeof remoteHtml !== 'string' || updatedBy === localClientIdRef.current || editor.getHTML() === remoteHtml) return;

      applyingRemoteRef.current = true;
      editor.commands.setContent(remoteHtml, false);
      onChange(remoteHtml);
      window.setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 0);
    };

    const updatePeers = () => {
      const now = Date.now();
      const states = Array.from(provider.awareness.getStates().values());
      const active = states
        .map((s: any) => ({
          ...(s.user || {}),
          isEditing: !!s.editing?.at && now - Number(s.editing.at) < 2500,
        }))
        .filter((u: any) => u && u.id !== localClientIdRef.current);
      setCollabPeers(active);
    };
    const updateStatus = (event: any) => {
      if (event?.status === 'connected') {
        setCollabStatus('connected');
      } else {
        setCollabStatus((current) => current === 'connected' ? current : 'connecting');
      }
    };

    sharedContent.observe(applyRemoteContent);
    provider.awareness.on('change', updatePeers);
    provider.on?.('status', updateStatus);
    const peerTimer = window.setInterval(updatePeers, 1000);
    applyRemoteContent();
    updatePeers();
    setCollabSharedLink(buildCollabLink());
    const params = new URLSearchParams(window.location.search);
    if (params.get('collab') === 'true' || params.has('collab_token') || params.has('token')) {
      toast.success('Real-time collaboration is active.');
    }

    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(seedTimer);
      window.clearInterval(peerTimer);
      if (typingClearTimerRef.current) {
        window.clearTimeout(typingClearTimerRef.current);
        typingClearTimerRef.current = null;
      }
      provider.awareness.setLocalStateField('editing', null);
      sharedContent.unobserve(applyRemoteContent);
      provider.awareness.off('change', updatePeers);
      provider.off?.('status', updateStatus);
      provider.destroy();
      doc.destroy();
      sharedContentRef.current = null;
      ydocRef.current = null;
      providerRef.current = null;
      setCollabPeers([]);
      setCollabStatus('offline');
    };
  }, [collabActive, editor, noteId, onChange]);

  useEffect(() => {
    if (!collabActive || !noteId || typeof window === 'undefined') {
      setServerPeers([]);
      sendPresenceRef.current = () => {};
      return;
    }

    let stopped = false;
    const params = new URLSearchParams(window.location.search);
    const urlToken = collabToken || params.get('collab_token') || params.get('token') || '';

    const normalizePresence = (items: any[]) => {
      const mapped = (items || [])
        .filter((p: any) => p.client_id !== localClientIdRef.current)
        .map((p: any) => ({
          id: p.client_id || `user-${p.user_id}`,
          userId: p.user_id,
          name: p.name || p.username || 'Collaborator',
          color: p.color || '#6366f1',
          isEditing: !!p.is_typing,
          source: 'server',
        }));
      setServerPeers(mapped);
    };

    const heartbeat = async (isTyping = false) => {
      try {
        const response = await notesApi.heartbeat(noteId, {
          client_id: localClientIdRef.current,
          collab_token: urlToken || undefined,
          color: localColorRef.current,
          is_typing: isTyping,
        });

        if (!stopped) {
          normalizePresence(response.data?.data || []);
          setCollabStatus('connected');
        }
      } catch (error) {
        console.warn('Collaboration presence heartbeat failed', error);
      }
    };

    sendPresenceRef.current = (isTyping = false) => {
      const now = Date.now();
      if (isTyping && now - lastTypingPresenceAtRef.current < 850) return;
      if (isTyping) lastTypingPresenceAtRef.current = now;
      void heartbeat(isTyping);
    };

    const pollPresence = async () => {
      try {
        const response = await notesApi.presence(noteId, urlToken ? { collab_token: urlToken } : undefined);
        if (!stopped) normalizePresence(response.data?.data || []);
      } catch (error) {
        console.warn('Collaboration presence poll failed', error);
      }
    };

    void heartbeat(false);
    const heartbeatTimer = window.setInterval(() => void heartbeat(false), 4500);
    const pollTimer = window.setInterval(pollPresence, 2000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void heartbeat(false);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      window.clearInterval(heartbeatTimer);
      window.clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisible);
      sendPresenceRef.current = () => {};
      setServerPeers([]);
    };
  }, [collabActive, noteId, collabToken]);

  // Overlay Sub-states
  const [activeFlashcard, setActiveFlashcard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [ocrImageUrl, setOcrImageUrl] = useState('');

  const runAICall = async (systemPrompt: string, userPrompt: string) => {
    if (!noteId) {
      throw new Error('AI tools run through the backend. Please open a saved note first.');
    }

    try {
      const apiRes = await notesApi.aiQuery(noteId, { systemPrompt, userPrompt });
      const data = apiRes.data?.data || apiRes.data || {};
      const resultText = typeof data === 'string' ? data : (data.result || data.text || data.summary || '');
      if (!resultText) {
        throw new Error('The backend AI endpoint returned an empty response.');
      }
      return resultText;
    } catch (apiErr: any) {
      throw new Error(apiErr.response?.data?.message || apiErr.message || 'Backend AI request failed. Check the admin AI settings.');
    }
  };

  const extractJSON = (text: string) => {
    try {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const raw = match ? match[1] : text;
      return JSON.parse(raw.trim());
    } catch (e) {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        return JSON.parse(text.substring(start, end + 1));
      }
      const startObj = text.indexOf('{');
      const endObj = text.lastIndexOf('}');
      if (startObj !== -1 && endObj !== -1) {
        return JSON.parse(text.substring(startObj, endObj + 1));
      }
      throw new Error("AI returned invalid format. Please try again!");
    }
  };

  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const aiTextToEditorHtml = (value: string) => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/<(p|h[1-6]|ul|ol|li|blockquote|pre|table|hr|br|strong|em)\b/i.test(text)) {
      return text;
    }

    return text
      .split(/\n{2,}/)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
      .join('');
  };

  const writeAiResultToNote = (value: string, closeAfter = false) => {
    if (!editor || !value?.trim()) return;
    editor.chain().focus().insertContent(aiTextToEditorHtml(value)).run();
    setAiResultApplied(true);
    if (closeAfter) setAiFeature(null);
  };

  // AI Feature Handlers
  const handleAskAI = async () => {
    if (!editor) return;
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult('');
    setAiResultApplied(false);
    const originalText = editor.getText();
    try {
      const sysPrompt = "You are a stellar academic academic writing assistant. Answer the user prompt/question directly and concisely, structuring your content beautifully using readable paragraphs or markdown lists. Ignore the optional reference context unless the user request is specifically referencing it. CRITICAL: Output ONLY the direct answer/text. Absolutely NO introductory conversational remarks, preamble, greetings, or outro comments (such as 'Certainly, here is...', 'Here is the response', 'I hope this helps'). Start directly with the first word of the response.";
      
      let userPromptBody = `PRIMARY TASK: Answer the following user request directly: "${aiPrompt}"`;
      if (originalText.trim().length > 0) {
        userPromptBody += `\n\nOPTIONAL STUDY CONTEXT:\nThe user is currently writing a study note. Here is their note content for REFERENCE only. ONLY incorporate, refer to, or summarize this note context if the user's primary request above explicitly asks about it or references the note. If the request is a general question (e.g. explaining a new concept, coding, or facts), IGNORE this study context completely and answer the user's primary request directly:\n\"\"\"\n${originalText}\n\"\"\"`;
      }
      
      const res = await runAICall(sysPrompt, userPromptBody);
      setAiResult(res);
      writeAiResultToNote(res);
      toast.success(editor.state.selection.empty ? 'AI response written to the note.' : 'AI response replaced the selected text.');
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AI response.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleQuickPrompt = async (action: string) => {
    if (!editor) return;
    setAiLoading(true);
    setAiResult('');
    setAiResultApplied(false);
    const selectedText = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ') || editor.getText();
    try {
      const sysPrompt = "You are a precise study and academic editor. Edit the following text as instructed and output ONLY the updated text. CRITICAL: Absolutely NO introductory conversational remarks, preamble, greetings, or outro comments (such as 'Certainly, here is...', 'Sure, I can simplify that for you', 'Here is the elaborated text'). Start directly with the first word of the edited text itself.";
      const promptMap: Record<string, string> = {
        simplify: `Simplify this content for an introductory learner:\n\n${selectedText}`,
        elaborate: `Elaborate on this concept, adding thorough details and scientific depth:\n\n${selectedText}`,
        professional: `Change the tone of this text to highly professional and academic:\n\n${selectedText}`,
        actions: `Extract key actionable bullet items and todo checkmarks from this text:\n\n${selectedText}`
      };
      const res = await runAICall(sysPrompt, promptMap[action]);
      setAiResult(res);
      writeAiResultToNote(res);
      toast.success(editor.state.selection.empty ? 'AI edit inserted into the note.' : 'Selected text updated by AI.');
    } catch (err: any) {
      toast.error(err.message || "Failed to complete smart prompt.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!editor) return;
    setAiFeature('summarize');
    setAiLoading(true);
    setAiResult(null);
    setAiResultApplied(false);

    // 1. Try to call the backend AI Summary endpoint first if noteId is present (no frontend API keys needed)
    if (noteId) {
      try {
        const apiRes = await notesApi.aiSummary(noteId);
        const data = apiRes.data?.data || apiRes.data || {};
        const summaryText = typeof data === 'string' ? data : (data.summary || data.content || data.html || '');
        if (summaryText) {
          setAiResult(summaryText);
          setAiLoading(false);
          return;
        }
      } catch (apiErr: any) {
        console.warn("Backend AI summary failed, falling back to client-side direct AI call...", apiErr);
      }
    }

    // 2. Fallback to client-side direct AI call using personal API keys
    const contentText = editor.getText() || 'Start typing notes to enable smart summarization.';
    try {
      const sysPrompt = "Create a structured, executive study summary of the text provided. Highlight the core theme, list 3 key highlights in a bulleted list, and finish with a summary outline. Respond with clean, beautiful HTML format using <h3>, <p>, and <ul> tags. CRITICAL: Output ONLY the direct HTML content. Absolutely NO introductory conversational remarks, preamble, greetings, or outro comments. Start directly with the first HTML tag.";
      const res = await runAICall(sysPrompt, contentText);
      setAiResult(res);
    } catch (err: any) {
      toast.error(err.message || "Could not generate summary.");
      setAiFeature(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFlashcards = async () => {
    if (!editor) return;
    setAiFeature('flashcards');
    setAiLoading(true);
    setAiResult(null);
    setAiResultApplied(false);
    setActiveFlashcard(0);
    setShowAnswer(false);
    const contentText = editor.getText();
    try {
      const sysPrompt = "Analyze the text and output a JSON array containing exactly 5 critical study flashcards. Output ONLY a valid JSON array of objects, where each object has exact properties: 'question' and 'answer'. Do not output any backticks or markdown preamble, just raw JSON. CRITICAL: Absolutely NO introductory conversational remarks, preamble, greetings, or outro comments.";
      const res = await runAICall(sysPrompt, contentText);
      const parsed = extractJSON(res);
      setAiResult(parsed);
    } catch (err: any) {
      toast.error(err.message || "Could not generate flashcards.");
      setAiFeature(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleQuiz = async () => {
    if (!editor) return;
    setAiFeature('quiz');
    setAiLoading(true);
    setAiResult(null);
    setAiResultApplied(false);
    setActiveQuizQuestion(0);
    setQuizScore(0);
    setQuizSelectedOption(null);
    setShowQuizResults(false);
    const contentText = editor.getText();
    try {
      const sysPrompt = "Generate 5 multiple-choice questions based on the text. Output ONLY a valid JSON array of objects, where each object has: 'question': string, 'options': 4 strings, 'correctAnswer': index (0-3), and 'explanation': string. No preamble, no backticks, just raw JSON. CRITICAL: Absolutely NO introductory conversational remarks, preamble, greetings, or outro comments.";
      const res = await runAICall(sysPrompt, contentText);
      const parsed = extractJSON(res);
      setAiResult(parsed);
    } catch (err: any) {
      toast.error(err.message || "Could not generate quiz.");
      setAiFeature(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleOCR = async () => {
    if (!ocrImageUrl.trim()) return;
    setAiLoading(true);
    setAiResult('');
    setAiResultApplied(false);
    try {
      const sysPrompt = "You are a perfect OCR text extraction machine. Extract all legible text from the image url provided. Return ONLY the plain transcribed text. CRITICAL: Absolutely NO labels, markdown formatting, introductory conversational remarks, preamble, greetings, or outro comments.";
      const res = await runAICall(sysPrompt, ocrImageUrl);
      setAiResult(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to extract text from image.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!editor) return;
    setAiLoading(true);
    setAiResult('');
    setAiResultApplied(false);
    const selectedText = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ') || editor.getText();
    try {
      const sysPrompt = `You are a fluent scholarly translator. Translate the provided text into ${targetLanguage}. Maintain technical terminology and structural flow. CRITICAL: Output ONLY the translated result. Absolutely NO introductory conversational remarks, preamble, greetings, commentary, or outro comments.`;
      const res = await runAICall(sysPrompt, selectedText);
      setAiResult(res);
    } catch (err: any) {
      toast.error(err.message || "Translation failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleWordMeaning = async () => {
    if (!editor) return;
    const selectedText = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ').trim();
    if (!selectedText) {
      toast.error("Please highlight/select a word first to find its meaning!");
      return;
    }
    setAiFeature('meaning');
    setAiLoading(true);
    setAiResult(null);
    setAiResultApplied(false);
    try {
      const sysPrompt = "You are a professional dictionary and linguistics expert. For the given word, provide: 1. A phonetic pronunciation guide (using both IPA and intuitive phonetics like 'law-kee'). 2. Part of speech. 3. Concise academic meaning/definition. 4. A brief usage example. Output the response in beautiful, clean HTML using <h3>, <p>, and <ul> tags. CRITICAL: Output ONLY the direct HTML content. Absolutely NO introductory conversational remarks, preamble, greetings, or outro comments. Start directly with the first HTML tag.";
      const res = await runAICall(sysPrompt, `Word: "${selectedText}"`);
      setAiResult(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to find word meaning.");
      setAiFeature(null);
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;

    const imageFile = event.target.files?.[0];
    if (!imageFile) return;

    if (!imageFile.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      event.target.value = '';
      return;
    }

    const maxImageBytes = 10 * 1024 * 1024;
    if (imageFile.size > maxImageBytes) {
      toast.error('Image is too large. Maximum size is 10MB.');
      event.target.value = '';
      return;
    }

    setImageUploading(true);
    try {
      const response = await filesApi.upload(imageFile, noteId);
      const uploaded = response.data?.data || {};
      const imageUrl = uploaded.preview_url || uploaded.download_url || uploaded.r2_url;

      if (!imageUrl) {
        throw new Error('Image uploaded, but no preview URL was returned.');
      }

      editor.chain().focus().setImage({ src: imageUrl, alt: imageFile.name }).run();
      toast.success('Image uploaded and inserted.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to upload image.');
    } finally {
      setImageUploading(false);
      event.target.value = '';
    }
  };

  const ToolButton = ({ onClick, active, children, title, className = '' }: any) => (
    <div className="relative group flex justify-center">
      <button
        type="button"
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        className={`p-1.5 rounded-lg transition-all duration-100 ${active ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 hover:scale-105'} ${className}`}
      >
        {children}
      </button>
      {title && (
        <span className="absolute top-full mt-2 z-50 px-2 py-0.5 bg-slate-800/90 backdrop-blur-sm text-white text-[10px] font-black rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-all duration-75 transform scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100 invisible group-hover:visible origin-top select-none">
          {title}
        </span>
      )}
    </div>
  );

  if (!editor) return null;

  const activeCollabPeers = [...collabPeers, ...serverPeers].reduce((items: any[], peer: any) => {
    const key = peer.id || peer.client_id || `user-${peer.userId || peer.user_id || peer.name}`;
    const existing = items.find((item) => item._key === key);
    if (existing) {
      existing.isEditing = existing.isEditing || peer.isEditing;
      existing.name = existing.name || peer.name;
      existing.color = existing.color || peer.color;
      return items;
    }

    items.push({ ...peer, _key: key });
    return items;
  }, []);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 tiptap-editor relative">
      {/* Toolbar */}
      {editable && (
        <div className="shrink-0 flex flex-wrap items-center gap-0.5 px-4 py-3 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm z-10 sticky top-0">
          {/* Text Style */}
          <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold" className="hover:bg-blue-50 group">
            <Bold size={16} className={`transition-colors ${editor.isActive('bold') ? 'text-indigo-700' : 'text-blue-500 group-hover:text-blue-700'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic" className="hover:bg-blue-50 group">
            <Italic size={16} className={`transition-colors ${editor.isActive('italic') ? 'text-indigo-700' : 'text-blue-500 group-hover:text-blue-700'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline" className="hover:bg-blue-50 group">
            <UnderlineIcon size={16} className={`transition-colors ${editor.isActive('underline') ? 'text-indigo-700' : 'text-blue-500 group-hover:text-blue-700'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough" className="hover:bg-blue-50 group">
            <Strikethrough size={16} className={`transition-colors ${editor.isActive('strike') ? 'text-indigo-700' : 'text-blue-500 group-hover:text-blue-700'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight" className="hover:bg-yellow-100 group">
            <Highlighter size={16} className={`transition-colors ${editor.isActive('highlight') ? 'text-indigo-700' : 'text-yellow-600 group-hover:text-yellow-700'}`} />
          </ToolButton>

          <div className="w-px h-5 bg-slate-200/60 mx-1.5" />

          {/* Headings */}
          <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1" className="hover:bg-violet-50 group">
            <Heading1 size={16} className={`transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-indigo-700' : 'text-violet-500 group-hover:text-violet-700'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2" className="hover:bg-violet-50 group">
            <Heading2 size={16} className={`transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-indigo-700' : 'text-violet-500 group-hover:text-violet-700'}`} />
          </ToolButton>

          <div className="w-px h-5 bg-slate-200/60 mx-1.5" />

          {/* Lists */}
          <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List" className="hover:bg-emerald-50 group">
            <List size={16} className={`transition-colors ${editor.isActive('bulletList') ? 'text-indigo-700' : 'text-emerald-500 group-hover:text-emerald-700'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List" className="hover:bg-emerald-50 group">
            <ListOrdered size={16} className={`transition-colors ${editor.isActive('orderedList') ? 'text-indigo-700' : 'text-emerald-500 group-hover:text-emerald-700'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task List" className="hover:bg-emerald-50 group">
            <CheckSquare size={16} className={`transition-colors ${editor.isActive('taskList') ? 'text-indigo-700' : 'text-emerald-500 group-hover:text-emerald-700'}`} />
          </ToolButton>

          <div className="w-px h-5 bg-slate-200/60 mx-1.5" />

          {/* Blocks */}
          <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote" className="hover:bg-amber-50 group">
            <Quote size={16} className={`transition-colors ${editor.isActive('blockquote') ? 'text-indigo-700' : 'text-amber-500 group-hover:text-amber-700'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block" className="hover:bg-amber-50 group">
            <Code size={16} className={`transition-colors ${editor.isActive('codeBlock') ? 'text-indigo-700' : 'text-amber-500 group-hover:text-amber-700'}`} />
          </ToolButton>

          <div className="w-px h-5 bg-slate-200/60 mx-1.5" />

          {/* Alignment */}
          <ToolButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left" className="hover:bg-rose-50 group">
            <AlignLeft size={16} className={`transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'text-indigo-700' : 'text-rose-400 group-hover:text-rose-600'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center" className="hover:bg-rose-50 group">
            <AlignCenter size={16} className={`transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'text-indigo-700' : 'text-rose-400 group-hover:text-rose-600'}`} />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right" className="hover:bg-rose-50 group">
            <AlignRight size={16} className={`transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'text-indigo-700' : 'text-rose-400 group-hover:text-rose-600'}`} />
          </ToolButton>

          <div className="w-px h-5 bg-slate-200/60 mx-1.5" />

          {/* Media */}
          <input
            ref={imageUploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <ToolButton
            onClick={() => imageUploadInputRef.current?.click()}
            title={imageUploading ? 'Uploading Image' : 'Upload Image'}
            className="hover:bg-cyan-50 group"
          >
            {imageUploading ? (
              <RotateCw size={16} className="text-cyan-500 animate-spin" />
            ) : (
              <Image size={16} className="text-cyan-500 group-hover:text-cyan-600 transition-colors" />
            )}
          </ToolButton>
          <ToolButton onClick={() => {
            const url = window.prompt('Enter link URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }} active={editor.isActive('link')} title="Insert Link" className="hover:bg-cyan-50 group">
            <Link size={16} className={`transition-colors ${editor.isActive('link') ? 'text-indigo-700' : 'text-cyan-500 group-hover:text-cyan-600'}`} />
          </ToolButton>

          <div className="flex-1 min-w-[10px]" />

          {/* AI Features Group */}
          <div className="flex items-center gap-0.5 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-1 rounded-xl border border-indigo-100/30">
            <ToolButton onClick={() => { setAiFeature('ask'); setAiResult(''); setAiPrompt(''); }} title="Ask AI" className="hover:bg-indigo-100 hover:text-indigo-600 group">
              <Bot size={16} className="text-indigo-500 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
            </ToolButton>
            <div className="w-px h-4 bg-indigo-200/50 mx-0.5" />
            <ToolButton onClick={handleSummarize} title="Summarize Note" className="hover:bg-purple-100 hover:text-purple-600 group">
              <Wand2 size={16} className="text-purple-500 group-hover:text-purple-600 group-hover:scale-110 transition-transform" />
            </ToolButton>
            <ToolButton onClick={handleFlashcards} title="Generate Flashcards" className="hover:bg-pink-100 hover:text-pink-600 group">
              <Layers size={16} className="text-pink-500 group-hover:text-pink-600 group-hover:scale-110 transition-transform" />
            </ToolButton>
            <ToolButton onClick={handleQuiz} title="Create Quiz" className="hover:bg-emerald-100 hover:text-emerald-600 group">
              <HelpCircle size={16} className="text-emerald-500 group-hover:text-emerald-600 group-hover:scale-110 transition-transform" />
            </ToolButton>
            <ToolButton onClick={() => { setAiFeature('ocr'); setAiResult(''); setOcrImageUrl(''); }} title="Extract Text (OCR)" className="hover:bg-orange-100 hover:text-orange-600 group">
              <ScanLine size={16} className="text-orange-500 group-hover:text-orange-600 group-hover:scale-110 transition-transform" />
            </ToolButton>
            <ToolButton onClick={() => { setAiFeature('translate'); setAiResult(''); }} title="Check Grammar / Translate" className="hover:bg-cyan-100 hover:text-cyan-600 group">
              <Languages size={16} className="text-cyan-500 group-hover:text-cyan-600 group-hover:scale-110 transition-transform" />
            </ToolButton>
            <ToolButton onClick={handleWordMeaning} title="AI Dictionary (Highlight word first)" className="hover:bg-amber-100 hover:text-amber-600 group">
              <BookOpen size={16} className="text-amber-500 group-hover:text-amber-600 group-hover:scale-110 transition-transform" />
            </ToolButton>
          </div>

          {/* ADHD, PDF, & Real-Time Collaboration Boosters Group */}
          <div className="flex items-center gap-0.5 bg-gradient-to-r from-rose-50/50 to-pink-50/50 p-1 rounded-xl border border-rose-100/30 ml-1.5 shadow-sm">
            {/* ADHD DopaCompanion Button */}
            <div className="relative group flex items-center justify-center">
              <button
                type="button"
                onClick={() => { setShowAdhdHub(!showAdhdHub); setShowPdfSidebar(false); }}
                className={`p-1.5 px-2 rounded-lg transition-all duration-100 flex items-center gap-1.5 hover:bg-rose-100 hover:scale-105 ${showAdhdHub ? 'bg-rose-200 text-rose-700 font-bold scale-105 shadow-sm' : 'text-rose-500 animate-pulse'}`}
              >
                <Heart size={16} className={`fill-rose-400 ${adhdTimerActive ? 'animate-bounce' : ''}`} />
                {adhdTimerActive && (
                  <span className="text-[10px] font-mono font-black text-rose-700 bg-white/85 px-1.5 py-0.5 rounded-md border border-rose-100/40 shrink-0 select-none">
                    {Math.floor(adhdTimer / 60)}:{(adhdTimer % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </button>
              <span className="absolute top-full mt-2 z-50 px-2 py-0.5 bg-slate-800/90 backdrop-blur-sm text-white text-[10px] font-black rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-all duration-75 transform scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100 invisible group-hover:visible origin-top select-none">
                {adhdTimerActive ? `Focus Active (${Math.floor(adhdTimer / 60)}m left)` : 'DopaCompanion Focus Hub'}
              </span>
            </div>
            <div className="w-px h-4 bg-rose-200/50 mx-0.5" />
            {/* Split Screen PDF Study Button */}
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={() => { setShowPdfSidebar(!showPdfSidebar); setShowAdhdHub(false); fetchPdfFiles(); }}
                className={`p-1.5 rounded-lg transition-all duration-100 flex items-center justify-center hover:bg-pink-100 hover:scale-110 ${showPdfSidebar ? 'bg-pink-200 text-pink-700 font-bold scale-105 shadow-sm' : 'text-pink-500'}`}
              >
                <FileText size={16} />
              </button>
              <span className="absolute top-full mt-2 z-50 px-2 py-0.5 bg-slate-800/90 backdrop-blur-sm text-white text-[10px] font-black rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-all duration-75 transform scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100 invisible group-hover:visible origin-top select-none">
                Open Study PDF (Split Screen)
              </span>
            </div>
            <div className="w-px h-4 bg-pink-200/50 mx-0.5" />
            {/* P2P Collaboration Button */}
            <div className="relative group flex justify-center">
              <button
                type="button"
                onClick={() => { setCollabActive(!collabActive); }}
                className={`p-1.5 rounded-lg transition-all duration-100 flex items-center justify-center hover:bg-indigo-100 hover:scale-110 relative ${collabActive ? 'bg-indigo-200 text-indigo-700 font-bold scale-105 shadow-sm' : 'text-indigo-500'}`}
              >
                <Users size={16} />
                {collabActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white shrink-0 animate-pulse" />
                )}
              </button>
              <span className="absolute top-full mt-2 z-50 px-2 py-0.5 bg-slate-800/90 backdrop-blur-sm text-white text-[10px] font-black rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-all duration-75 transform scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100 invisible group-hover:visible origin-top select-none">
                Real-Time Collaboration (P2P)
              </span>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-200/40 mx-2" />

          <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo" className="hover:bg-slate-100 group">
            <Undo size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </ToolButton>
          <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo" className="hover:bg-slate-100 group">
            <Redo size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </ToolButton>
        </div>
      )}

      {/* Collaboration Status bar */}
      {collabActive && (
        <div className="shrink-0 bg-indigo-50/70 border-b border-indigo-100/60 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in slide-in-from-top duration-300 z-10 select-none">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${collabStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : collabStatus === 'connecting' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              <Users size={10} /> {collabStatus === 'connected' ? 'Realtime Ready' : collabStatus === 'connecting' ? 'Starting Realtime' : 'Realtime Fallback'}
            </span>
            {activeCollabPeers.length === 0 ? (
              <span className="text-[10px] font-bold text-slate-500">Share the link to co-edit. Live edits appear instantly when collaborators join.</span>
            ) : (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-bold text-slate-500 mr-1">Co-authors online:</span>
                {activeCollabPeers.map((p, i) => (
                  <span
                    key={p._key || i}
                    className="px-2 py-0.5 rounded-full text-[9px] font-black text-white shrink-0 shadow-sm flex items-center gap-1"
                    style={{ backgroundColor: p.color || '#6366f1' }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${p.isEditing ? 'bg-white animate-pulse' : 'bg-white/60'}`} />
                    {p.name}{p.isEditing ? ' writing' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                const link = collabSharedLink || buildCollabLink();
                navigator.clipboard.writeText(link);
                toast.success(collabToken ? 'Realtime edit link copied.' : 'Realtime room link copied.');
              }}
              className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-extrabold hover:bg-indigo-50 transition flex items-center gap-1 shrink-0"
            >
              <Share2 size={11} /> Copy Realtime Link
            </button>
          </div>
        </div>
      )}

      {/* Editor CSS Fixes for Task Lists */}
      <style jsx global>{`
        .tiptap-editor ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        .tiptap-editor ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }
        .tiptap-editor ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-right: 0.75rem;
          margin-top: 0.35rem;
          user-select: none;
        }
        .tiptap-editor ul[data-type="taskList"] li > div {
          flex: 1 1 auto;
        }
        .tiptap-editor ul[data-type="taskList"] li > div > p {
          margin: 0;
        }
        .flip-card {
          perspective: 1000px;
        }
        .flip-card-inner {
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card-flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          backface-visibility: hidden;
          position: absolute;
          inset: 0;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>
      
      {/* Split-Screen Workspace (PDF + Editor) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
        {/* Left Side: PDF Study Reader */}
        {activePdfUrl && (
          <div className="w-full h-[350px] lg:h-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-slate-100 flex flex-col overflow-hidden relative animate-in slide-in-from-left duration-300 z-10">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200/80 shadow-sm">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                <FileText size={15} className="text-red-500 animate-pulse" /> {activePdfName}
              </span>
              <button 
                onClick={() => { setActivePdfUrl(null); }} 
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                title="Close Split Screen"
              >
                <X size={14} />
              </button>
            </div>
            <iframe 
              src={activePdfUrl} 
              className="w-full flex-1 border-none bg-white" 
              title="Study PDF Reader" 
            />
          </div>
        )}

        {/* Right Side: Tiptap Editor */}
        <EditorContent 
          editor={editor} 
          className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-10 custom-scrollbar relative prose prose-slate lg:prose-lg max-w-none [&>.ProseMirror]:min-h-full [&>.ProseMirror]:outline-none" 
        />
      </div>

      {/* ═══════════════════════════════════════════
           AI OVERLAY POPUPS (HIGH-FIDELITY WIDGETS)
         ═══════════════════════════════════════════ */}

      {/* Overlay 1: Ask AI */}
      {aiFeature === 'ask' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 border border-indigo-100 rounded-3xl shadow-2xl w-full max-w-lg p-5 md:p-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 pb-3 mb-4 shrink-0">
              <h2 className="text-lg font-extrabold flex items-center gap-2 text-indigo-900">
                <Bot size={22} className="text-indigo-600" /> Smart AI Writer
              </h2>
              <button onClick={() => setAiFeature(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 py-1 custom-scrollbar">
              {/* Context Selection Badge */}
              {(() => {
                const sel = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ').trim();
                if (sel) {
                  return (
                    <div className="px-3.5 py-2.5 bg-indigo-50/50 border border-indigo-100/40 rounded-2xl flex flex-col gap-1 text-left animate-in slide-in-from-top-2 duration-300">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles size={10} className="animate-pulse" /> Active Highlighted Text (Target Selection)
                      </span>
                      <p className="text-xs font-semibold text-slate-600 truncate italic">"{sel}"</p>
                    </div>
                  );
                }
                return null;
              })()}

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskAI();
                  }
                }}
                autoFocus={true}
                placeholder="Ask anything! E.g. 'explain photosynthesis', 'draft a comparison table', 'translate to French'..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm transition-all bg-slate-50 resize-none font-semibold text-slate-700 placeholder:text-slate-400"
              />

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-1 select-none">
                <span>Press Enter to Submit</span>
                <span>Shift+Enter for new line</span>
              </div>

              {/* Prebuilt Action Chips */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">QUICK EDITS (USES SELECTED TEXT)</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleQuickPrompt('simplify')} className="px-3.5 py-2 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all duration-300 active:scale-95 shadow-sm shadow-indigo-100/50">
                    <Sparkles size={12} className="text-indigo-500" /> Simplify Text
                  </button>
                  <button onClick={() => handleQuickPrompt('elaborate')} className="px-3.5 py-2 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all duration-300 active:scale-95 shadow-sm shadow-indigo-100/50">
                    <Wand2 size={12} className="text-purple-500" /> Elaborate Concept
                  </button>
                  <button onClick={() => handleQuickPrompt('professional')} className="px-3.5 py-2 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all duration-300 active:scale-95 shadow-sm shadow-indigo-100/50">
                    <Award size={12} className="text-amber-500" /> Make Academic
                  </button>
                  <button onClick={() => handleQuickPrompt('actions')} className="px-3.5 py-2 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all duration-300 active:scale-95 shadow-sm shadow-indigo-100/50">
                    <Check size={12} className="text-emerald-500" /> Action Items
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="flex gap-1.5 items-center">
                    <div className="h-2.5 w-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-2.5 w-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-2.5 w-2.5 bg-indigo-400 rounded-full animate-bounce" />
                  </div>
                  <p className="text-xs text-indigo-700 font-bold animate-pulse">Drafting AI output...</p>
                </div>
              )}

              {/* Result Area */}
              {aiResult && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GENERATED CONTENT</p>
                    <button onClick={() => { navigator.clipboard.writeText(aiResult); toast.success('Copied!'); }} className="text-slate-400 hover:text-slate-700 transition flex items-center gap-1 text-xs font-bold">
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                    {aiResult}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            {aiResult && (
              <div className="flex gap-3 border-t border-slate-100 pt-4 mt-4 shrink-0">
                <button
                  onClick={() => {
                    if (!aiResultApplied) writeAiResultToNote(String(aiResult), true);
                    else setAiFeature(null);
                    toast.success(aiResultApplied ? 'AI writer closed.' : 'Inserted!');
                  }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition ${aiResultApplied ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'}`}
                >
                  {aiResultApplied ? 'Written to Note' : (editor.state.selection.empty ? 'Insert at Cursor' : 'Replace Selection')} <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => { editor.chain().focus().setContent(aiResult).run(); setAiFeature(null); toast.success('Replaced Note!'); }}
                  className="px-4 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition"
                >
                  Replace Note
                </button>
              </div>
            )}

            {!aiResult && !aiLoading && (
              <button
                onClick={handleAskAI}
                disabled={!aiPrompt.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 mt-4 transition"
              >
                Compose Prompt
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overlay 2: Summarize Drawer */}
      {aiFeature === 'summarize' && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1 custom-scrollbar">
            <div className="sticky top-0 z-10 flex items-center justify-between pb-3 border-b border-slate-100 bg-white/95 shrink-0">
              <h2 className="text-base font-extrabold flex items-center gap-1.5 text-purple-900">
                <Wand2 size={18} className="text-purple-600" /> AI Smart Summary
              </h2>
              <button onClick={() => setAiFeature(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={16} />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-8 w-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-xs text-purple-700 font-bold animate-pulse">Formulating summary outline...</p>
              </div>
            ) : (
              aiResult && (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: aiResult }} />
                  <button onClick={() => { navigator.clipboard.writeText(aiResult.replace(/<[^>]*>/g, '')); toast.success('Summary copied!'); }} className="w-full py-2 bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
                    <Copy size={12} /> Copy Plain Text
                  </button>
                </div>
              )
            )}
          </div>

          {aiResult && !aiLoading && (
            <button
              onClick={() => {
                editor.chain().focus().insertContent(`<br/><hr/><h3>AI Summary Notes</h3>${aiResult}`).run();
                setAiFeature(null);
                toast.success('Summary appended!');
              }}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-600/10 mt-4 shrink-0 transition"
            >
              Append Summary to Note
            </button>
          )}
        </div>
      )}

      {/* Overlay 3: Flashcard Flipping Arena */}
      {aiFeature === 'flashcards' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-pink-100 rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] flex flex-col justify-between overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 mb-4 shrink-0">
              <h2 className="text-lg font-extrabold flex items-center gap-2 text-pink-900">
                <Layers size={22} className="text-pink-600" /> Flashcard Arena
              </h2>
              <button onClick={() => setAiFeature(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-10 w-10 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
                <p className="text-xs text-pink-700 font-bold animate-pulse">Extracting concepts into study cards...</p>
              </div>
            ) : (
              aiResult && aiResult.length > 0 && (
                <div className="space-y-6 flex-1 flex flex-col justify-center items-center">
                  {/* Card Indicator */}
                  <span className="px-3 py-1 bg-pink-50 border border-pink-100 text-pink-700 text-[10px] font-bold uppercase tracking-widest rounded-full">
                    Card {activeFlashcard + 1} of {aiResult.length}
                  </span>

                  {/* 3D Flip Card Container */}
                  <div
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="w-full aspect-[4/3] flip-card cursor-pointer group shrink-0"
                  >
                    <div className={`w-full h-full relative rounded-3xl shadow-lg border border-pink-100/60 duration-500 flip-card-inner ${showAnswer ? 'flip-card-flipped' : ''}`}>
                      {/* Front: Question */}
                      <div className="flip-card-front bg-gradient-to-br from-pink-50/20 to-white flex flex-col justify-center items-center p-6 text-center rounded-3xl">
                        <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-3">QUESTION</span>
                        <p className="text-lg font-extrabold text-slate-800 leading-snug">{aiResult[activeFlashcard].question}</p>
                        <span className="text-xs text-slate-400 mt-6 flex items-center gap-1 font-bold group-hover:text-pink-600 transition"><Eye size={12} /> Click Card to Reveal Answer</span>
                      </div>

                      {/* Back: Answer */}
                      <div className="flip-card-back bg-slate-900 flex flex-col justify-center items-center p-6 text-center rounded-3xl">
                        <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-3">ANSWER</span>
                        <p className="text-base font-bold text-white leading-relaxed">{aiResult[activeFlashcard].answer}</p>
                        <span className="text-xs text-pink-400/80 mt-6 flex items-center gap-1 font-bold"><RotateCw size={12} /> Click Card to Flip Back</span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex justify-between items-center gap-4 w-full pt-4">
                    <button
                      disabled={activeFlashcard === 0}
                      onClick={() => { setActiveFlashcard(activeFlashcard - 1); setShowAnswer(false); }}
                      className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button
                      disabled={activeFlashcard === aiResult.length - 1}
                      onClick={() => { setActiveFlashcard(activeFlashcard + 1); setShowAnswer(false); }}
                      className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-40 rounded-xl text-sm font-bold shadow-md shadow-pink-600/10 transition flex items-center justify-center gap-2"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Overlay 4: Quiz Scorecard Arena */}
      {aiFeature === 'quiz' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-emerald-100 rounded-3xl shadow-2xl w-full max-w-md p-5 md:p-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 mb-4 shrink-0">
              <h2 className="text-lg font-extrabold flex items-center gap-2 text-emerald-900">
                <HelpCircle size={22} className="text-emerald-600" /> Interactive Smart Quiz
              </h2>
              <button onClick={() => setAiFeature(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                <p className="text-xs text-emerald-700 font-bold animate-pulse">Formulating scholarly questionnaire...</p>
              </div>
            ) : (
              aiResult && aiResult.length > 0 && (
                <div className="flex-1 overflow-y-auto min-h-0 py-2 custom-scrollbar">
                  {!showQuizResults ? (
                    <div className="space-y-4">
                      {/* Score & Progress */}
                      <div className="flex justify-between items-center bg-slate-50 border border-slate-100/50 rounded-xl p-3">
                        <span className="text-[10px] font-bold text-slate-500">QUESTION {activeQuizQuestion + 1} OF {aiResult.length}</span>
                        <span className="text-[10px] font-bold text-emerald-700">SCORE: {quizScore}/{aiResult.length}</span>
                      </div>

                      {/* Question */}
                      <p className="text-base font-extrabold text-slate-800 leading-snug">{aiResult[activeQuizQuestion].question}</p>

                      {/* Options */}
                      <div className="space-y-2.5 pt-2">
                        {aiResult[activeQuizQuestion].options.map((opt: string, i: number) => {
                          const isCorrect = i === aiResult[activeQuizQuestion].correctAnswer;
                          const isSelected = i === quizSelectedOption;
                          let optStyle = "border-slate-200 hover:bg-slate-50 text-slate-700";
                          
                          if (quizSelectedOption !== null) {
                            if (isCorrect) optStyle = "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm shadow-emerald-500/10";
                            else if (isSelected) optStyle = "bg-rose-50 border-rose-400 text-rose-800 font-bold shadow-sm shadow-rose-400/10";
                            else optStyle = "opacity-45 border-slate-200 cursor-not-allowed";
                          }

                          return (
                            <button
                              key={i}
                              disabled={quizSelectedOption !== null}
                              onClick={() => {
                                setQuizSelectedOption(i);
                                if (i === aiResult[activeQuizQuestion].correctAnswer) {
                                  setQuizScore(quizScore + 1);
                                  toast.success('Correct answer!');
                                } else {
                                  toast.error('Incorrect option!');
                                }
                              }}
                              className={`w-full text-left p-3.5 border-2 rounded-xl text-xs font-semibold leading-relaxed transition-all flex items-center justify-between ${optStyle}`}
                            >
                              <span>{opt}</span>
                              {quizSelectedOption !== null && isCorrect && <Check size={16} className="text-emerald-600 shrink-0 ml-2" />}
                              {quizSelectedOption !== null && isSelected && !isCorrect && <X size={16} className="text-rose-600 shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Callout */}
                      {quizSelectedOption !== null && (
                        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">EXPLANATION</p>
                          <p className="text-[11px] font-semibold text-slate-600 leading-normal">{aiResult[activeQuizQuestion].explanation}</p>
                        </div>
                      )}

                      {/* Next Question Control */}
                      {quizSelectedOption !== null && (
                        <button
                          onClick={() => {
                            if (activeQuizQuestion === aiResult.length - 1) {
                              setShowQuizResults(true);
                            } else {
                              setActiveQuizQuestion(activeQuizQuestion + 1);
                              setQuizSelectedOption(null);
                            }
                          }}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition mt-4"
                        >
                          {activeQuizQuestion === aiResult.length - 1 ? 'Show Scorecard' : 'Next Question'}
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Scorecard View */
                    <div className="flex flex-col items-center text-center space-y-6 py-6 animate-in zoom-in-95 duration-300">
                      <div className="p-4 bg-emerald-50 rounded-full border-4 border-emerald-100 text-emerald-600">
                        <Award size={48} />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-xl font-extrabold text-slate-800">Quiz Completed!</h3>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Here is your performance scorecard</p>
                      </div>

                      {/* Score Tracker Ring */}
                      <div className="flex flex-col items-center justify-center w-36 h-36 border-[12px] border-emerald-500 rounded-full shrink-0 shadow-inner">
                        <span className="text-4xl font-headline font-black text-slate-800">{Math.round((quizScore / aiResult.length) * 100)}%</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase mt-0.5">{quizScore} / {aiResult.length} Correct</span>
                      </div>

                      {/* Rating comment */}
                      <p className="text-sm font-bold text-slate-700 italic max-w-xs leading-normal">
                        {quizScore === aiResult.length ? "Master Scholar! You understood every concept flawlessly." : quizScore >= 3 ? "Excellent Work! You have a solid grasp of this study notebook." : "Keep Reviewing! Go through the notes again and try the quiz once more."}
                      </p>

                      <div className="flex gap-3 w-full pt-4">
                        <button
                          onClick={() => {
                            setActiveQuizQuestion(0);
                            setQuizScore(0);
                            setQuizSelectedOption(null);
                            setShowQuizResults(false);
                          }}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={() => setAiFeature(null)}
                          className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-bold transition"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Overlay 5: OCR Image Reader */}
      {aiFeature === 'ocr' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-orange-100 rounded-3xl shadow-2xl w-full max-w-md p-5 md:p-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 mb-4 shrink-0">
              <h2 className="text-lg font-extrabold flex items-center gap-2 text-orange-900">
                <ScanLine size={22} className="text-orange-600" /> OCR Engine
              </h2>
              <button onClick={() => setAiFeature(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 py-1 custom-scrollbar">
              <input
                type="text"
                value={ocrImageUrl}
                onChange={(e) => setOcrImageUrl(e.target.value)}
                placeholder="Paste link to handwritten notes or textbook image..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm transition bg-slate-50 font-semibold"
              />

              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="h-10 w-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                  <p className="text-xs text-orange-700 font-bold animate-pulse">Running OCR Vision analysis...</p>
                </div>
              )}

              {aiResult && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TRANSCRIBED TEXT</p>
                    <button onClick={() => { navigator.clipboard.writeText(aiResult); toast.success('Copied!'); }} className="text-slate-400 hover:text-slate-700 transition flex items-center gap-1 text-xs font-bold">
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                    {aiResult}
                  </div>
                </div>
              )}
            </div>

            {aiResult && !aiLoading && (
              <button
                onClick={() => { editor.chain().focus().insertContent(aiResult).run(); setAiFeature(null); toast.success('OCR text inserted!'); }}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-600/10 mt-4 shrink-0 transition"
              >
                Insert Transcribed Text
              </button>
            )}

            {!aiResult && !aiLoading && (
              <button
                onClick={handleOCR}
                disabled={!ocrImageUrl.trim()}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 mt-4 transition"
              >
                Transcribe Image Text
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overlay 6: Translation & Proofreading */}
      {aiFeature === 'translate' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-cyan-100 rounded-3xl shadow-2xl w-full max-w-lg p-5 md:p-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-3 mb-4 shrink-0">
              <h2 className="text-lg font-extrabold flex items-center gap-2 text-cyan-900">
                <Languages size={22} className="text-cyan-600" /> Grammar & translation Hub
              </h2>
              <button onClick={() => setAiFeature(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 py-1 custom-scrollbar">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">TARGET LANGUAGE</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none cursor-pointer"
                >
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="French">French (Français)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="Nepali">Nepali (नेपाली)</option>
                  <option value="Chinese">Chinese (中文)</option>
                  <option value="Grammar Check">Proofread Grammar Only (English)</option>
                </select>
              </div>

              {aiLoading && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="h-10 w-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                  <p className="text-xs text-cyan-700 font-bold animate-pulse">Running linguistic translation models...</p>
                </div>
              )}

              {aiResult && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TRANSLATION RESULT</p>
                    <button onClick={() => { navigator.clipboard.writeText(aiResult); toast.success('Copied!'); }} className="text-slate-400 hover:text-slate-700 transition flex items-center gap-1 text-xs font-bold">
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                    {aiResult}
                  </div>
                </div>
              )}
            </div>

            {aiResult && !aiLoading && (
              <div className="flex gap-3 border-t border-slate-100 pt-4 mt-4 shrink-0">
                <button
                  onClick={() => { editor.chain().focus().insertContent(aiResult).run(); setAiFeature(null); toast.success(editor.state.selection.empty ? 'Translation inserted!' : 'Selection Replaced!'); }}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold shadow-md shadow-cyan-600/10 flex items-center justify-center gap-2 transition"
                >
                  {editor.state.selection.empty ? 'Insert at Cursor' : 'Replace Selection'} <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => { editor.chain().focus().setContent(aiResult).run(); setAiFeature(null); toast.success('Text replaced!'); }}
                  className="px-4 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold transition"
                >
                  Replace Note
                </button>
              </div>
            )}

            {!aiResult && !aiLoading && (
              <button
                onClick={handleTranslate}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold shadow-md transition mt-4"
              >
                Translate Note
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overlay 7: AI Dictionary / Word Meaning Drawer */}
      {aiFeature === 'meaning' && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1 custom-scrollbar">
            <div className="sticky top-0 z-10 flex items-center justify-between pb-3 border-b border-slate-100 bg-white/95 shrink-0">
              <h2 className="text-base font-extrabold flex items-center gap-1.5 text-amber-900 animate-pulse">
                <BookOpen size={18} className="text-amber-600" /> AI Dictionary
              </h2>
              <button onClick={() => setAiFeature(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={16} />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-8 w-8 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                <p className="text-xs text-amber-700 font-bold animate-pulse">Consulting scholarly lexicons...</p>
              </div>
            ) : (
              aiResult && (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none text-slate-700 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: aiResult }} />
                  <button onClick={() => { navigator.clipboard.writeText(aiResult.replace(/<[^>]*>/g, '')); toast.success('Copied to clipboard!'); }} className="w-full py-2 bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 animate-in fade-in">
                    <Copy size={12} /> Copy Meaning
                  </button>
                </div>
              )
            )}
          </div>

          {aiResult && !aiLoading && (
            <button
              onClick={() => {
                editor.chain().focus().insertContent(`<br/><hr/><h3>AI Dictionary Entry</h3>${aiResult}`).run();
                setAiFeature(null);
                toast.success('Entry appended to note!');
              }}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-600/10 mt-4 shrink-0 transition"
            >
              Append Entry to Note
            </button>
          )}
        </div>
      )}

      {/* Overlay 8: ADHD Focus & Dopamine Praise Hub Drawer */}
      {showAdhdHub && (
        <>
          {/* Backdrop: click outside to close drawer (timer keeps running) */}
          <div
            className="absolute inset-0 z-10 cursor-default"
            onClick={() => setShowAdhdHub(false)}
            aria-label="Close DopaCompanion"
          />
          {/* Drawer Panel */}
          <div
            className="absolute top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 p-5 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between pb-3 border-b border-slate-100 bg-white/95 shrink-0 mb-4">
              <h2 className="text-base font-extrabold flex items-center gap-1.5 text-rose-950">
                <Heart size={18} className="text-rose-500 fill-rose-300 animate-pulse" /> ADHD DopaCompanion
              </h2>
              <button onClick={() => setShowAdhdHub(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 py-1 custom-scrollbar">
              {/* Encouragement Speech Card */}
              <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100/50 rounded-2xl relative shadow-sm">
                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block mb-1">DopaCompanion Cheerleader 🦄</span>
                <p className="text-xs font-bold text-rose-950 leading-relaxed italic">
                  "{adhdAffirmation}"
                </p>
                <button 
                  onClick={() => {
                    const newAff = ADHD_AFFIRMATIONS[Math.floor(Math.random() * ADHD_AFFIRMATIONS.length)];
                    setAdhdAffirmation(newAff);
                  }}
                  className="mt-3 text-[10px] font-extrabold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition"
                >
                  <Sparkles size={11} /> Roll New Cheer
                </button>
              </div>

              {/* Pomodoro Timer */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">ADHD FOCUS SPRINT</span>
                
                {/* Clock */}
                <div className="text-3xl font-mono font-black text-slate-800">
                  {Math.floor(adhdTimer / 60)}:{(adhdTimer % 60).toString().padStart(2, '0')}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000" 
                    style={{ width: `${(adhdTimer / adhdTimerDuration) * 100}%` }} 
                  />
                </div>

                {/* presets */}
                <div className="flex justify-center gap-1.5">
                  {[600, 900, 1500].map((sec) => (
                    <button
                      key={sec}
                      disabled={adhdTimerActive}
                      onClick={() => { setAdhdTimer(sec); setAdhdTimerDuration(sec); }}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${adhdTimerDuration === sec ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {sec / 60} Min
                    </button>
                  ))}
                </div>

                {/* controls */}
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    onClick={() => setAdhdTimerActive(!adhdTimerActive)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 text-white shadow-sm ${adhdTimerActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {adhdTimerActive ? 'Pause' : 'Start Focus'}
                  </button>
                  <button
                    onClick={() => { setAdhdTimerActive(false); setAdhdTimer(adhdTimerDuration); }}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition flex items-center justify-center"
                    title="Reset Timer"
                  >
                    <RotateCw size={12} />
                  </button>
                </div>
              </div>

              {/* Micro-Goal Checklist */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">ADHD MICRO-GOALS (TINY STEPS)</span>
                
                {/* list */}
                <div className="space-y-1.5">
                  {adhdTasks.map((t) => (
                    <div 
                      key={t.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-[11px] font-bold transition-all ${t.completed ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800 line-through opacity-70' : 'bg-white border-slate-100 text-slate-700'}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => {
                            const updated = adhdTasks.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x);
                            setAdhdTasks(updated);
                            if (!t.completed) {
                              const trigger = (window as any).triggerConfetti;
                              if (trigger) trigger();
                              toast.success("Awesome job checking that off! Instant dopamine reward! 🌟", { duration: 3000 });
                              setAdhdAffirmation("Look at you! One full micro-goal finished. You are making phenomenal headway! 🦄");
                            }
                          }}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${t.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400 bg-white'}`}
                        >
                          {t.completed && <Check size={10} strokeWidth={4} />}
                        </button>
                        <span className="truncate">{t.text}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setAdhdTasks(adhdTasks.filter(x => x.id !== t.id));
                        }}
                        className="text-slate-300 hover:text-red-500 transition shrink-0 pl-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new */}
                <div className="flex gap-1.5 pt-1.5">
                  <input
                    type="text"
                    value={adhdNewTask}
                    onChange={(e) => setAdhdNewTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && adhdNewTask.trim()) {
                        setAdhdTasks([...adhdTasks, { id: Date.now(), text: adhdNewTask.trim(), completed: false }]);
                        setAdhdNewTask('');
                      }
                    }}
                    placeholder="Type tiny task..."
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 font-semibold"
                  />
                  <button
                    onClick={() => {
                      if (!adhdNewTask.trim()) return;
                      setAdhdTasks([...adhdTasks, { id: Date.now(), text: adhdNewTask.trim(), completed: false }]);
                      setAdhdNewTask('');
                    }}
                    className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dopa Companion Dopamine Boost trigger */}
          <button
            onClick={() => {
              const trigger = (window as any).triggerConfetti;
              if (trigger) trigger();
              const praises = [
                "CONFIRMATION: You are an absolutely stellar learner! 🦄",
                "BOOST: Your dedication is absolutely off the charts! 🏆",
                "Affirmation: Keep going, you are creating massive learning today! 🚀",
                "Praise: Your capability is outstanding. Keep locking in this knowledge! 💎",
                "CHEER: Look at you, making progress like a true master! ✨"
              ];
              setAdhdAffirmation(praises[Math.floor(Math.random() * praises.length)]);
              toast.success("Dopamine Boost Activated! Confetti shower fired! ☄️", { duration: 3000 });
            }}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 text-white rounded-xl text-sm font-black shadow-md hover:scale-105 active:scale-95 transition-all mt-4 shrink-0 flex items-center justify-center gap-1.5"
          >
            <Sparkles size={16} /> DOPAMINE BOOST! <Heart size={14} className="fill-white" />
          </button>
        </div>
        </>
      )}

      {/* Overlay 9: Study PDF Selection Drawer */}
      {showPdfSidebar && (
        <div className="absolute top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 p-5 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between pb-3 border-b border-slate-100 bg-white/95 shrink-0 mb-4">
              <h2 className="text-base font-extrabold flex items-center gap-1.5 text-pink-900">
                <FileText size={18} className="text-pink-600 animate-pulse" /> Study PDFs List
              </h2>
              <button onClick={() => setShowPdfSidebar(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable File List */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 py-1 custom-scrollbar space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">SELECT A PDF TO STUDY SIDE-BY-SIDE</span>

              {pdfFilesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <div className="h-6 w-6 border-2 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
                  <p className="text-[10px] text-pink-700 font-bold animate-pulse">Loading study PDFs...</p>
                </div>
              ) : pdfFilesList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <FileText size={32} className="mx-auto text-slate-200" />
                  <p className="text-xs font-bold">No study PDFs found</p>
                  <p className="text-[10px] leading-relaxed">Upload textbook PDFs in the 'My Files' tab first to study them here side-by-side!</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pdfFilesList.map((file) => {
                    const isSelected = activePdfUrl?.includes(`/files/${file.id}/download`);
                    return (
                      <button
                        key={file.id}
                        onClick={async () => {
                          try {
                            toast.loading(`Opening PDF study reader: ${file.original_name}...`, { id: 'pdf-split-loading' });
                            
                            // 1. Fetch pre-signed direct S3/R2 download URL from backend
                            const res = await filesApi.download(file.id);
                            const downloadUrl = res.data?.download_url;
                            
                            if (!downloadUrl) throw new Error('Download URL not found');
                            
                            // 2. Fetch the direct URL as a blob to bypass attachment headers
                            const blobResponse = await fetch(downloadUrl);
                            if (!blobResponse.ok) throw new Error('Failed to fetch raw document data');
                            
                            const blob = await blobResponse.blob();
                            // Force correct MIME type
                            const pdfBlob = new Blob([blob], { type: file.mime_type || 'application/pdf' });
                            const blobUrl = URL.createObjectURL(pdfBlob);
                            
                            setActivePdfUrl(blobUrl);
                            setActivePdfName(file.original_name);
                            setShowPdfSidebar(false);
                            
                            const trigger = (window as any).triggerConfetti;
                            if (trigger) trigger();
                            toast.success(`Opened split-screen PDF: ${file.original_name}`, { id: 'pdf-split-loading', icon: '📚' });
                          } catch (e) {
                            console.error('PDF Split loading failed:', e);
                            toast.error('Direct preview blocked by security. Trying direct load...', { id: 'pdf-split-loading' });
                            // Fallback direct URL inside iframe
                            try {
                              const res = await filesApi.download(file.id);
                              if (res.data?.download_url) {
                                setActivePdfUrl(res.data.download_url);
                                setActivePdfName(file.original_name);
                                setShowPdfSidebar(false);
                              }
                            } catch (fallbackErr) {
                              console.error('Fallback failed:', fallbackErr);
                            }
                          }
                        }}
                        className={`w-full text-left p-3 border rounded-xl flex items-start gap-2.5 transition duration-200 hover:bg-pink-50/50 hover:border-pink-200 ${isSelected ? 'bg-pink-50 border-pink-300 shadow-sm shadow-pink-100' : 'bg-white border-slate-100'}`}
                      >
                        <FileText size={16} className={`shrink-0 mt-0.5 ${isSelected ? 'text-pink-600 animate-bounce' : 'text-slate-400'}`} />
                        <div className="min-w-0">
                          <p className={`text-[11px] font-bold truncate leading-snug ${isSelected ? 'text-pink-800' : 'text-slate-700'}`}>{file.original_name}</p>
                          <p className="text-[9px] font-semibold text-slate-400 mt-0.5">Size: {(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-3 mt-4 shrink-0">
            Tip: You can change PDFs at any time or close split screen using the close button in the header.
          </div>
        </div>
      )}

      {/* Floating Micro Focus Timer (Only visible when DopaCompanion drawer is closed but timer is running) */}
      {!showAdhdHub && adhdTimerActive && (
        <div 
          onClick={() => setShowAdhdHub(true)}
          className="fixed bottom-6 right-6 z-40 bg-white/90 backdrop-blur-md border border-rose-200/50 p-2.5 rounded-2xl shadow-xl flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all animate-in slide-in-from-bottom duration-300 group"
          title="Click to expand DopaCompanion Focus Hub"
        >
          <div className="p-1.5 bg-rose-50 rounded-xl text-rose-500 animate-pulse group-hover:scale-110 transition-transform">
            <Heart size={14} className="fill-rose-400 animate-bounce" />
          </div>
          <div className="text-left pr-1">
            <p className="text-[7.5px] font-black text-rose-500 uppercase tracking-wider leading-none">FOCUS ACTIVE</p>
            <p className="text-xs font-mono font-black text-slate-800 mt-0.5 leading-none">
              {Math.floor(adhdTimer / 60)}:{(adhdTimer % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      )}

      {/* Confetti Overlay Canvas */}
      <canvas id="notexa-confetti-canvas" className="fixed inset-0 pointer-events-none z-[9999]" />
    </div>
  );
}

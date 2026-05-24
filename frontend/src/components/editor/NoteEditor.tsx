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
import Collaboration from '@tiptap/extension-collaboration';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, CheckSquare,
  Quote, Code, Image, Link, AlignLeft, AlignCenter, AlignRight,
  Highlighter, Undo, Redo, Wand2, Layers, HelpCircle, ScanLine, Bot, Check, Languages,
  X, ChevronLeft, ChevronRight, Copy, RotateCw, Award, BookOpen, ArrowRight, Eye, Sparkles,
  Heart, Play, Square, Plus, Trash2, Users, FileText, Share2
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { publicApi, filesApi, notesApi } from '@/services/api';
import { useAuthStore } from '@/contexts/authStore';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  noteId?: number;
  collaborationToken?: string | null;
}

function roomSafe(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'room';
}

export default function NoteEditor({ content, onChange, editable = true, noteId, collaborationToken }: NoteEditorProps) {
  const currentUser = useAuthStore((s) => s.user);

  // Genuine real-time collaboration state (Yjs + WebRTC + Tiptap Collaboration).
  const [collabActive, setCollabActive] = useState(false);
  const [collabDoc, setCollabDoc] = useState<any>(null);
  const [collabStatus, setCollabStatus] = useState<'idle' | 'connecting' | 'connected' | 'offline'>('idle');
  const [collabPeers, setCollabPeers] = useState<any[]>([]);
  const [collabSharedLink, setCollabSharedLink] = useState('');
  const [collabGuestActive, setCollabGuestActive] = useState(false);
  const [collabGuestText, setCollabGuestText] = useState('');
  const ydocRef = useRef<any>(null);
  const providerRef = useRef<any>(null);
  const collabSeededRoomRef = useRef('');
  const collabColorRef = useRef('#6366f1');

  const collabRoomId = useMemo(() => {
    const token = collaborationToken || `note-${noteId || 'draft'}`;
    return `notexa-note-${roomSafe(String(noteId || 'draft'))}-${roomSafe(String(token))}`;
  }, [collaborationToken, noteId]);

  const editor = useEditor({
    extensions: [
      collabDoc ? StarterKit.configure({ history: false }) : StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your note...' }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageExt,
      LinkExt.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ...(collabDoc ? [Collaboration.configure({ document: collabDoc, field: 'content' })] : []),
    ],
    content: collabDoc ? undefined : content || '',
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());

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
  }, [collabDoc, editable]);

  useEffect(() => {
    if (collabActive) return;
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [collabActive, content, editor]);

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
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('collab') === 'true') {
      setCollabActive(true);
    }
  }, []);

  // Real-time multi-collaborator editing. The WebRTC provider connects peers,
  // while Tiptap's Collaboration extension binds editor transactions to Yjs.
  useEffect(() => {
    if (!collabActive || !noteId) {
      setCollabDoc(null);
      setCollabPeers([]);
      setCollabStatus('idle');
      return;
    }

    let cancelled = false;
    let provider: any = null;
    let doc: any = null;
    let removeStatusListener: (() => void) | null = null;
    let removeAwarenessListener: (() => void) | null = null;

    setCollabStatus('connecting');
    setCollabSharedLink(`${window.location.origin}${window.location.pathname}?collab=true`);

    (async () => {
      try {
        const Y = await import('yjs');
        const { WebrtcProvider } = await import('y-webrtc');

        if (cancelled) return;

        doc = new Y.Doc();
        provider = new WebrtcProvider(collabRoomId, doc, {
          signaling: ['wss://signaling.yjs.dev'],
        });

        ydocRef.current = doc;
        providerRef.current = provider;
        setCollabDoc(doc);

        if (collabColorRef.current === '#6366f1') {
          collabColorRef.current = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        }

        provider.awareness.setLocalStateField('user', {
          id: currentUser?.id || 'guest',
          name: currentUser?.name || currentUser?.username || 'Collaborator',
          username: currentUser?.username || '',
          color: collabColorRef.current,
        });

        const updatePeers = () => {
          const states = Array.from(provider.awareness.getStates().values());
          const active = states.map((s: any) => s.user).filter(Boolean);
          setCollabPeers(active);
        };

        const updateStatus = ({ status }: { status: string }) => {
          setCollabStatus(status === 'connected' ? 'connected' : 'offline');
        };

        provider.awareness.on('change', updatePeers);
        provider.on('status', updateStatus);
        removeAwarenessListener = () => provider.awareness.off('change', updatePeers);
        removeStatusListener = () => provider.off('status', updateStatus);
        updatePeers();

        toast.success('Realtime collaboration is active for this note.');
      } catch (error) {
        console.error('Collaboration setup failed', error);
        setCollabStatus('offline');
        setCollabDoc(null);
        toast.error('Realtime collaboration could not connect. Your note still saves normally.');
      }
    })();

    return () => {
      cancelled = true;
      removeAwarenessListener?.();
      removeStatusListener?.();
      provider?.destroy();
      doc?.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      setCollabDoc(null);
      setCollabPeers([]);
      setCollabStatus('idle');
    };
  }, [collabActive, collabRoomId, currentUser?.id, currentUser?.name, currentUser?.username, noteId]);

  useEffect(() => {
    if (!editor || !collabActive || !collabDoc || !content || collabSeededRoomRef.current === collabRoomId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const fragment = collabDoc.getXmlFragment('content');
      if (fragment.length === 0 && editor.getHTML() !== content) {
        editor.commands.setContent(content, false);
        onChange(editor.getHTML());
      }
      collabSeededRoomRef.current = collabRoomId;
    }, 800);

    return () => window.clearTimeout(timer);
  }, [collabActive, collabDoc, collabRoomId, content, editor, onChange]);

  // Guest Typist Bot Simulation Handler
  const runGuestSimulation = () => {
    if (!editor) return;
    if (collabGuestActive) {
      toast.error("Guest simulation is already running!");
      return;
    }
    setCollabGuestActive(true);
    
    toast("Professor Clara (Study Partner) has joined the notebook room via WebRTC!", { icon: '🦄', duration: 4000 });
    setCollabPeers(prev => [...prev, { name: "Professor Clara (Guest Bot 🦄)", color: "#ec4899" }]);

    let step = 0;
    const typingSteps = [
      "\n\n",
      "📚 *Professor Clara's Study Insight:* ",
      "Here is a crucial tip for studying this topic:\n",
      "- Focus on understanding the primary mechanisms first.\n",
      "- Write short, atomic micro-summaries to improve retention.\n",
      "- Test your active recall using flashcards and MCQ quizzes!\n",
      "Keep writing! You are doing a highly impressive job!"
    ];

    const typeNextStep = () => {
      if (step < typingSteps.length) {
        editor.chain().focus().insertContent(typingSteps[step]).run();
        step++;
        setTimeout(typeNextStep, 1500);
      } else {
        setCollabGuestActive(false);
        setCollabPeers(prev => prev.filter(p => p.name !== "Professor Clara (Guest Bot 🦄)"));
        
        const trigger = (window as any).triggerConfetti;
        if (trigger) trigger();
        toast.success("Guest simulation complete! Clara says: 'You are doing amazing, keep it up!' 🌟", { duration: 5000 });
      }
    };

    setTimeout(typeNextStep, 2000);
  };

  // Overlay Sub-states
  const [activeFlashcard, setActiveFlashcard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [ocrImageUrl, setOcrImageUrl] = useState('');

  // Model Selection states
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini' | 'deepseek'>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [hasOpenAI, setHasOpenAI] = useState(false);
  const [hasGemini, setHasGemini] = useState(false);
  const [hasDeepSeek, setHasDeepSeek] = useState(false);

  // Resolve API Keys, Base URLs, and Models
  const getAIConfig = async () => {
    let openaiKey = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_openai_key') || '' : '';
    let geminiKey = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_gemini_key') || '' : '';
    let deepseekKey = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_deepseek_key') || '' : '';
    
    let openaiBase = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_openai_base') || '' : '';
    let openaiModel = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_openai_model') || '' : '';
    let geminiBase = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_gemini_base') || '' : '';
    let geminiModel = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_gemini_model') || '' : '';
    let deepseekBase = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_deepseek_base') || '' : '';
    let deepseekModel = typeof window !== 'undefined' ? localStorage.getItem('notexa_personal_deepseek_model') || '' : '';

    let provider = 'openai';

    if (!openaiKey && process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    }
    if (!geminiKey && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    }
    if (!deepseekKey && process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY) {
      deepseekKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
    }

    try {
      const res = await publicApi.settings();
      const data = res.data?.data || res.data || {};
      
      let opKeySetting = '';
      let gemKeySetting = '';
      let dsKeySetting = '';
      let provSetting = '';
      let enabledSetting: string | boolean | number = '';
      
      let opBaseSetting = '';
      let opModelSetting = '';
      let gemBaseSetting = '';
      let gemModelSetting = '';
      let dsBaseSetting = '';
      let dsModelSetting = '';

      if (Array.isArray(data)) {
        opKeySetting = data.find((s: any) => s.key === 'openai_api_key')?.value || '';
        gemKeySetting = data.find((s: any) => s.key === 'gemini_api_key')?.value || '';
        dsKeySetting = data.find((s: any) => s.key === 'deepseek_api_key')?.value || '';
        provSetting = data.find((s: any) => s.key === 'ai_provider')?.value || '';
        enabledSetting = data.find((s: any) => s.key === 'ai_enabled')?.value || '';
        
        opBaseSetting = data.find((s: any) => s.key === 'openai_base_url')?.value || '';
        opModelSetting = data.find((s: any) => s.key === 'openai_model')?.value || '';
        gemBaseSetting = data.find((s: any) => s.key === 'gemini_base_url')?.value || '';
        gemModelSetting = data.find((s: any) => s.key === 'gemini_model')?.value || '';
        dsBaseSetting = data.find((s: any) => s.key === 'deepseek_base_url')?.value || '';
        dsModelSetting = data.find((s: any) => s.key === 'deepseek_model')?.value || '';
      } else if (typeof data === 'object' && data !== null) {
        opKeySetting = (data as any).openai_api_key || '';
        gemKeySetting = (data as any).gemini_api_key || '';
        dsKeySetting = (data as any).deepseek_api_key || '';
        provSetting = (data as any).ai_provider || '';
        enabledSetting = (data as any).ai_enabled || '';
        
        opBaseSetting = (data as any).openai_base_url || '';
        opModelSetting = (data as any).openai_model || '';
        gemBaseSetting = (data as any).gemini_base_url || '';
        gemModelSetting = (data as any).gemini_model || '';
        dsBaseSetting = (data as any).deepseek_base_url || '';
        dsModelSetting = (data as any).deepseek_model || '';
      }

      if (enabledSetting === 'true' || enabledSetting === true || enabledSetting === '1' || enabledSetting === 1) {
        if (opKeySetting) openaiKey = opKeySetting;
        if (gemKeySetting) geminiKey = gemKeySetting;
        if (dsKeySetting) deepseekKey = dsKeySetting;
        if (provSetting) provider = provSetting;
        if (opBaseSetting) openaiBase = opBaseSetting;
        if (opModelSetting) openaiModel = opModelSetting;
        if (gemBaseSetting) geminiBase = gemBaseSetting;
        if (gemModelSetting) geminiModel = gemModelSetting;
        if (dsBaseSetting) deepseekBase = dsBaseSetting;
        if (dsModelSetting) deepseekModel = dsModelSetting;
      }
    } catch (e) {
      console.warn("Using personal local keys:", e);
    }

    return { 
      openaiKey, 
      geminiKey, 
      deepseekKey,
      provider,
      openaiBase: openaiBase || 'https://api.openai.com/v1',
      openaiModel: openaiModel || 'gpt-4o-mini',
      geminiBase: geminiBase || 'https://generativelanguage.googleapis.com/v1beta',
      geminiModel: geminiModel || 'gemini-1.5-flash',
      deepseekBase: deepseekBase || 'https://api.deepseek.com',
      deepseekModel: deepseekModel || 'deepseek-chat'
    };
  };

  const callOpenAI = async (key: string, base: string, model: string, systemPrompt: string, userPrompt: string) => {
    const cleanBase = base.replace(/\/+$/, '');
    const url = `${cleanBase}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  };

  const callGemini = async (key: string, base: string, model: string, systemPrompt: string, userPrompt: string) => {
    const cleanBase = base.replace(/\/+$/, '');
    const url = `${cleanBase}/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: `${systemPrompt}\n\nUser request:\n${userPrompt}` }] }
        ],
        generationConfig: { temperature: 0.7 }
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  };

  const runAICall = async (systemPrompt: string, userPrompt: string) => {
    const config = await getAIConfig();
    const provider = selectedProvider;
    const model = selectedModel;

    // 1. Try to delegate to the backend secure AI endpoint first if there is no personal key and noteId is present
    const activeKey = provider === 'openai' ? config.openaiKey : (provider === 'deepseek' ? config.deepseekKey : config.geminiKey);
    if (!activeKey && noteId) {
      try {
        const apiRes = await notesApi.aiQuery(noteId, { systemPrompt, userPrompt });
        const data = apiRes.data?.data || apiRes.data || {};
        const resultText = typeof data === 'string' ? data : (data.result || data.text || data.summary || '');
        if (resultText) {
          return resultText;
        }
      } catch (apiErr: any) {
        console.warn("Backend secure AI query failed, falling back to client-side direct LLM call...", apiErr);
      }
    }

    // 2. Client-side fallback using personal settings keys
    if (provider === 'openai') {
      if (!config.openaiKey) {
        throw new Error("OpenAI API key is missing. Please add it in Settings under 'Personal AI Workspace' or in the Admin Panel.");
      }
      return await callOpenAI(config.openaiKey, config.openaiBase, model || config.openaiModel, systemPrompt, userPrompt);
    } else if (provider === 'deepseek') {
      if (!config.deepseekKey) {
        throw new Error("DeepSeek API key is missing. Please add it in Settings under 'Personal AI Workspace' or in the Admin Panel.");
      }
      return await callOpenAI(config.deepseekKey, config.deepseekBase, model || config.deepseekModel, systemPrompt, userPrompt);
    } else {
      if (!config.geminiKey) {
        throw new Error("Gemini API key is missing. Please add it in Settings under 'Personal AI Workspace' or in the Admin Panel.");
      }
      return await callGemini(config.geminiKey, config.geminiBase, model || config.geminiModel, systemPrompt, userPrompt);
    }
  };

  useEffect(() => {
    const checkKeys = async () => {
      const config = await getAIConfig();
      const hasOp = !!config.openaiKey;
      const hasGem = !!config.geminiKey;
      const hasDs = !!config.deepseekKey;
      setHasOpenAI(hasOp);
      setHasGemini(hasGem);
      setHasDeepSeek(hasDs);
      
      if (hasDs) {
        setSelectedProvider('deepseek');
        setSelectedModel(config.deepseekModel || 'deepseek-chat');
      } else if (hasOp) {
        setSelectedProvider('openai');
        setSelectedModel(config.openaiModel || 'gpt-4o-mini');
      } else if (hasGem) {
        setSelectedProvider('gemini');
        setSelectedModel(config.geminiModel || 'gemini-1.5-flash');
      }
    };
    checkKeys();
  }, []);

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

  // AI Feature Handlers
  const handleAskAI = async () => {
    if (!editor) return;
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult('');
    const originalText = editor.getText();
    try {
      const sysPrompt = "You are a stellar academic academic writing assistant. Answer the user prompt/question directly and concisely, structuring your content beautifully using readable paragraphs or markdown lists. Ignore the optional reference context unless the user request is specifically referencing it. CRITICAL: Output ONLY the direct answer/text. Absolutely NO introductory conversational remarks, preamble, greetings, or outro comments (such as 'Certainly, here is...', 'Here is the response', 'I hope this helps'). Start directly with the first word of the response.";
      
      let userPromptBody = `PRIMARY TASK: Answer the following user request directly: "${aiPrompt}"`;
      if (originalText.trim().length > 0) {
        userPromptBody += `\n\nOPTIONAL STUDY CONTEXT:\nThe user is currently writing a study note. Here is their note content for REFERENCE only. ONLY incorporate, refer to, or summarize this note context if the user's primary request above explicitly asks about it or references the note. If the request is a general question (e.g. explaining a new concept, coding, or facts), IGNORE this study context completely and answer the user's primary request directly:\n\"\"\"\n${originalText}\n\"\"\"`;
      }
      
      const res = await runAICall(sysPrompt, userPromptBody);
      setAiResult(res);
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

  const ToolButton = ({ onClick, active, children, title, className = '' }: any) => (
    <div className="relative group flex justify-center shrink-0">
      <button
        type="button"
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        className={`p-2 sm:p-1.5 rounded-lg transition-all duration-100 ${active ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 hover:scale-105'} ${className}`}
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

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 tiptap-editor relative">
      {/* Toolbar */}
      {editable && (
        <div className="shrink-0 flex flex-nowrap sm:flex-wrap items-center gap-0.5 px-2 sm:px-4 py-2 sm:py-3 border-b border-slate-200/60 bg-white/50 backdrop-blur-sm z-10 sticky top-0 overflow-x-auto">
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
          <ToolButton onClick={() => {
            const url = window.prompt('Enter image URL:');
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }} title="Insert Image" className="hover:bg-cyan-50 group">
            <Image size={16} className="text-cyan-500 group-hover:text-cyan-600 transition-colors" />
          </ToolButton>
          <ToolButton onClick={() => {
            const url = window.prompt('Enter link URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }} active={editor.isActive('link')} title="Insert Link" className="hover:bg-cyan-50 group">
            <Link size={16} className={`transition-colors ${editor.isActive('link') ? 'text-indigo-700' : 'text-cyan-500 group-hover:text-cyan-600'}`} />
          </ToolButton>

          <div className="hidden sm:block flex-1 min-w-[10px]" />

          {/* AI Model Selector */}
          {(hasOpenAI || hasGemini || hasDeepSeek) && (
            <div className="flex items-center gap-0.5 bg-indigo-50/70 border border-indigo-100/40 p-1 rounded-xl shrink-0 shadow-sm mr-1">
              <Sparkles size={13} className="text-indigo-500 pl-1 shrink-0 animate-pulse" />
              <select
                value={`${selectedProvider}:${selectedModel}`}
                onChange={(e) => {
                  const [prov, mod] = e.target.value.split(':');
                  setSelectedProvider(prov as 'openai' | 'gemini' | 'deepseek');
                  setSelectedModel(mod);
                }}
                className="bg-transparent border-none outline-none text-[10px] font-bold text-indigo-700 py-0.5 pl-1 pr-6 cursor-pointer focus:ring-0 select-none max-w-[150px]"
              >
                {hasDeepSeek && (
                  <optgroup label="DeepSeek Models">
                    <option value="deepseek:deepseek-chat">DeepSeek Chat</option>
                    <option value="deepseek:deepseek-coder">DeepSeek Coder</option>
                  </optgroup>
                )}
                {hasOpenAI && (
                  <optgroup label="OpenAI Models">
                    <option value="openai:gpt-4o-mini">GPT 4o Mini</option>
                    <option value="openai:gpt-4o">GPT 4o</option>
                    <option value="openai:gpt-3.5-turbo">GPT 3.5 Turbo</option>
                  </optgroup>
                )}
                {hasGemini && (
                  <optgroup label="Gemini Models">
                    <option value="gemini:gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini:gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {/* Premium AI Features Group */}
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
                  <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shrink-0 animate-pulse ${collabStatus === 'connected' ? 'bg-emerald-500' : collabStatus === 'connecting' ? 'bg-amber-500' : 'bg-red-500'}`} />
                )}
              </button>
              <span className="absolute top-full mt-2 z-50 px-2 py-0.5 bg-slate-800/90 backdrop-blur-sm text-white text-[10px] font-black rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-all duration-75 transform scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100 invisible group-hover:visible origin-top select-none">
                {collabActive ? 'Stop realtime collaboration' : 'Start realtime collaboration'}
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
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${collabStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : collabStatus === 'connecting' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-red-100 text-red-700'}`}>
              <Users size={10} /> {collabStatus === 'connected' ? 'Realtime synced' : collabStatus === 'connecting' ? 'Connecting room' : 'Realtime offline'}
            </span>
            {collabPeers.length <= 1 ? (
              <span className="text-[10px] font-bold text-slate-500">Waiting for another collaborator to join this note...</span>
            ) : (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-bold text-slate-500 mr-1">Collaborators online:</span>
                {collabPeers.map((p, i) => (
                  <span 
                    key={i} 
                    className="px-2 py-0.5 rounded-full text-[9px] font-black text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: p.color || '#6366f1' }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                const link = collabSharedLink || `${window.location.origin}${window.location.pathname}?collab=true`;
                navigator.clipboard.writeText(link);
                toast.success('Realtime collaboration link copied!');
              }}
              className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-extrabold hover:bg-indigo-50 transition flex items-center gap-1 shrink-0"
            >
              <Share2 size={11} /> Copy Realtime Link
            </button>
            <button
              onClick={runGuestSimulation}
              disabled={collabGuestActive}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 shrink-0 shadow-sm shadow-indigo-600/10"
            >
              <Bot size={11} className="animate-bounce" /> Simulate Guest co-author
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
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative overflow-hidden">
        {/* Left Side: PDF Study Reader */}
        {activePdfUrl && (
          <div className="w-full h-1/2 md:w-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-200/80 bg-slate-100 flex flex-col overflow-hidden relative animate-in slide-in-from-left duration-300 z-10">
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
          className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-8 md:px-10 md:py-10 custom-scrollbar relative prose prose-slate lg:prose-lg max-w-none [&>.ProseMirror]:min-h-full [&>.ProseMirror]:outline-none" 
        />
      </div>

      {/* ═══════════════════════════════════════════
           AI OVERLAY POPUPS (HIGH-FIDELITY WIDGETS)
         ═══════════════════════════════════════════ */}

      {/* Overlay 1: Ask AI */}
      {aiFeature === 'ask' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 border border-indigo-100 rounded-3xl shadow-2xl w-full max-w-lg p-5 md:p-6 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
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
                  <p className="text-xs text-indigo-700 font-bold animate-pulse">Drafting AI model output...</p>
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
                  onClick={() => { editor.chain().focus().insertContent(aiResult).run(); setAiFeature(null); toast.success(editor.state.selection.empty ? 'Inserted!' : 'Selection Replaced!'); }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 transition"
                >
                  {editor.state.selection.empty ? 'Insert at Cursor' : 'Replace Selection'} <ArrowRight size={14} />
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
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1 custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
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
          <div className="bg-white border border-pink-100 rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
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
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
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
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
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
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
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
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-300">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1 custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
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
            className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 p-5 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 mb-4">
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
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 p-5 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0 mb-4">
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

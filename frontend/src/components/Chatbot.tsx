import { useState, useEffect, useRef } from 'react';
import {
  Send, Paperclip, Mic, Bot, User, Plus, Trash2, X,
  Scale, MessageSquare, Clock, ChevronRight, Sparkles,
  AlertCircle, Wifi, WifiOff, Loader2,
} from 'lucide-react';
import { checkHealth } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

/* ─── Types ───────────────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
  type?: 'text' | 'summary' | 'keywords' | 'answer' | 'legal_sections';
  legalSections?: LegalSection[];
}
interface LegalSection {
  section: string; title: string; description: string;
  punishment: string; act: string; bailable: string; cognizable: string;
}
interface StoredConversation {
  id: string; title: string; timestamp: number;
  updatedAt: number; messageCount: number; preview: string;
}

/* ─── Storage keys ────────────────────────────────────────────────────── */
const CHAT_KEY   = 'legal_ai_chat_history';
const STATE_KEY  = 'legal_ai_chat_state';
const CONVS_KEY  = 'legal_ai_conversations';
const CUR_ID_KEY = 'legal_ai_current_conversation_id';

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const loadConversations = (): StoredConversation[] => {
  try {
    const s = localStorage.getItem(CONVS_KEY);
    if (s) return JSON.parse(s)
      .sort((a: StoredConversation, b: StoredConversation) =>
        (b.updatedAt || b.timestamp) - (a.updatedAt || a.timestamp))
      .slice(0, 20);
  } catch {}
  return [];
};

const timeAgo = (ts: number) => {
  const d = Date.now() - ts, s = d / 1000, m = s / 60, h = m / 60, day = h / 24;
  if (day >= 1) return `${Math.floor(day)}d ago`;
  if (h   >= 1) return `${Math.floor(h)}h ago`;
  if (m   >= 1) return `${Math.floor(m)}m ago`;
  return 'Just now';
};

/* ─── Suggested prompts ───────────────────────────────────────────────── */
const SUGGESTIONS = [
  'What are my rights as a tenant?',
  'How to file a consumer complaint?',
  'Explain Section 498A IPC',
  'Legal process for property registration?',
  'What are workplace harassment laws?',
  'How to file an FIR?',
  'Contract review procedure?',
  'Documents for a property dispute?',
];

/* ════════════════════════════════════════════════════════════════════════
   Component
════════════════════════════════════════════════════════════════════════ */
const Chatbot = () => {
  const { t, i18n: i18nHook } = useTranslation('common');

  /* ── Load helpers ─────────────────────────────────────────────────── */
  const loadConvMsgs = (id: string): Message[] | null => {
    try {
      const s = localStorage.getItem(`conv_messages_${id}`);
      if (s) {
        const msgs = JSON.parse(s).filter((m: Message) => m.content || m.type === 'legal_sections');
        if (msgs.length) return msgs;
      }
    } catch {}
    return null;
  };

  const loadCurId = (): string | null => {
    // Always start with no active conversation
    return null;
  };

  const welcomeMsg = (): Message => ({
    id: '1', role: 'bot', type: 'text',
    content: t('chatbot.welcome'),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const loadMsgs = (): Message[] => {
    // Always start fresh — chatbot resets on every section visit
    return [welcomeMsg()];
  };

  const loadFirstInput = (): boolean => {
    try {
      const s = sessionStorage.getItem(STATE_KEY);
      if (s) return JSON.parse(s).isFirstInput ?? true;
    } catch {}
    return true;
  };

  /* ── State ────────────────────────────────────────────────────────── */
  const [messages,           setMessages]           = useState<Message[]>(loadMsgs);
  const [input,              setInput]              = useState('');
  const [isTyping,           setIsTyping]           = useState(false);
  const [isConnected,        setIsConnected]        = useState<boolean | null>(null);
  const [currentDocumentId,  setCurrentDocumentId]  = useState<string | null>(null);
  const [conversations,      setConversations]      = useState<StoredConversation[]>(loadConversations);
  const [currentConvId,      setCurrentConvId]      = useState<string | null>(loadCurId);
  const [isFirstInput,       setIsFirstInput]       = useState(loadFirstInput);
  const [sidebarOpen,        setSidebarOpen]        = useState(true);
  const [isRecording,        setIsRecording]        = useState(false);

  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const abortRef          = useRef<AbortController | null>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);

  /* ── Effects ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const p = sessionStorage.getItem('chatbot_prefill');
    if (p) { sessionStorage.removeItem('chatbot_prefill'); setInput(p); }
  }, []);

  useEffect(() => {
    if (messages.length === 1 && messages[0].id === '1')
      setMessages([welcomeMsg()]);
  }, [i18nHook.language]);

  useEffect(() => {
    if (currentConvId) sessionStorage.setItem(CUR_ID_KEY, currentConvId);
    else               sessionStorage.removeItem(CUR_ID_KEY);
  }, [currentConvId]);

  useEffect(() => {
    try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages)); } catch {}
    const userMsgs = messages.filter(m => m.role === 'user' && m.type === 'text');
    if (!userMsgs.length) return;
    const title = userMsgs[0].content.length > 50
      ? userMsgs[0].content.slice(0, 50) + '…'
      : userMsgs[0].content;
    let cid = currentConvId ?? `conv_${Date.now()}`;
    if (!currentConvId) setCurrentConvId(cid);
    try { localStorage.setItem(`conv_messages_${cid}`, JSON.stringify(messages)); } catch {}
    let existing: StoredConversation | undefined;
    try {
      const s = localStorage.getItem(CONVS_KEY);
      if (s) existing = JSON.parse(s).find((c: StoredConversation) => c.id === cid);
    } catch {}
    const preview = [...messages].reverse().find(m => m.role === 'bot')?.content?.slice(0, 100) || '';
    const conv: StoredConversation = {
      id: cid, title,
      timestamp: existing?.timestamp ?? Date.now(),
      updatedAt: Date.now(),
      messageCount: messages.length, preview,
    };
    setConversations(prev => {
      const updated = [conv, ...prev.filter(c => c.id !== cid)]
        .sort((a, b) => (b.updatedAt || b.timestamp) - (a.updatedAt || a.timestamp))
        .slice(0, 20);
      try { localStorage.setItem(CONVS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [messages, currentConvId]);

  useEffect(() => {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify({ isFirstInput })); } catch {}
  }, [isFirstInput]);

  useEffect(() => { return () => { abortRef.current?.abort(); }; }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const check = async () => {
      try { setIsConnected(await checkHealth()); } catch { setIsConnected(false); }
    };
    check();
    const iv = setInterval(() => { if (!isConnected) check(); }, 15000);
    return () => clearInterval(iv);
  }, [isConnected]);

  /* auto-grow textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  /* ── Conversation actions ─────────────────────────────────────────── */
  const startNew = () => {
    setMessages([welcomeMsg()]);
    setCurrentConvId(null);
    setIsFirstInput(true);
    setCurrentDocumentId(null);
    setInput('');
    sessionStorage.removeItem(CUR_ID_KEY);
    sessionStorage.removeItem(CHAT_KEY);
  };

  const loadConv = (conv: StoredConversation) => {
    const msgs = loadConvMsgs(conv.id);
    if (msgs?.length) {
      setMessages(msgs);
      setCurrentConvId(conv.id);
      setIsFirstInput(!msgs.some(m => m.role === 'user' && m.type === 'text'));
    } else {
      setMessages([welcomeMsg()]);
      setCurrentConvId(conv.id);
      setIsFirstInput(true);
    }
    setCurrentDocumentId(null);
    setInput('');
  };

  const deleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('chatbot.confirmDelete'))) return;
    try { localStorage.removeItem(`conv_messages_${id}`); } catch {}
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      try { localStorage.setItem(CONVS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (currentConvId === id) startNew();
  };

  /* ── Send ─────────────────────────────────────────────────────────── */
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    if (isConnected === false) {
      setMessages(p => [...p, {
        id: `${Date.now()}-err`, role: 'bot', type: 'text',
        content: '⚠️ Cannot reach the backend. Check the server is running.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      return;
    }
    abortRef.current?.abort();
    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', type: 'text',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(p => [...p, userMsg]);
    const cur = input;
    setInput('');
    setIsTyping(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const history = messages
        .filter(m => m.type === 'text' || m.type === 'answer').slice(-10)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'bot', content: m.content || '' }));
      const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:3000');
      const res = await fetch(`${base}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cur, language: i18n.language || 'en',
          is_first_input: isFirstInput, conversation_history: history,
          document_id: currentDocumentId }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const dec = new TextDecoder();
      let answerId = '';
      let buf = '';
      while (true) {
        if (ctrl.signal.aborted) { reader.cancel(); break; }
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'summary') {
              setMessages(p => [...p, {
                id: `${Date.now()}-sum`, role: 'bot', type: 'summary',
                content: d.content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }]);
            } else if (d.type === 'legal_sections') {
              setMessages(p => [...p, {
                id: `${Date.now()}-ls`, role: 'bot', type: 'legal_sections',
                content: '', legalSections: d.sections,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }]);
            } else if (d.type === 'start') {
              answerId = `${Date.now()}-ans`;
              setMessages(p => [...p, {
                id: answerId, role: 'bot', type: 'answer', content: '',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }]);
              setIsTyping(false);
            } else if (d.type === 'chunk') {
              setMessages(p => p.map(m => m.id === answerId ? { ...m, content: m.content + d.content } : m));
            } else if (d.type === 'complete') {
              if (isFirstInput) setIsFirstInput(false);
              setIsConnected(true);
            } else if (d.type === 'error') throw new Error(d.content || 'Streaming error');
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(p => [...p, {
        id: `${Date.now()}-err`, role: 'bot', type: 'text',
        content: err instanceof Error ? `⚠️ ${err.message}` : 'An error occurred.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setIsConnected(false);
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  };

  /* ── Mic / voice recording ───────────────────────────────────────── */
  const handleMicClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        setIsTyping(true);
        try {
          const fd = new FormData();
          const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('wav') ? 'wav' : 'audio';
          fd.append('audio', blob, `recording.${ext}`);
          fd.append('language', i18n.language || 'en');
          const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:3000');
          const res  = await fetch(`${base}/api/transcribe`, { method: 'POST', body: fd });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data.success && data.text) {
            setInput(prev => (prev ? prev + ' ' : '') + data.text);
          } else if (!data.success) {
            throw new Error(data.error || 'Transcription failed');
          }
        } catch (err: any) {
          setMessages(p => [...p, {
            id: `${Date.now()}-err`, role: 'bot', type: 'text',
            content: `⚠️ ${err?.message || 'Transcription error. Make sure whisper_server.py is running.'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }]);
        } finally {
          setIsTyping(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setMessages(p => [...p, {
        id: `${Date.now()}-err`, role: 'bot', type: 'text',
        content: `⚠️ Microphone error: ${err?.message || err}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  /* ── File upload ──────────────────────────────────────────────────── */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!['.pdf', '.docx', '.doc', '.txt'].includes(ext)) {
      alert('Please upload a PDF, DOCX, DOC, or TXT file');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('language', i18n.language || 'en');
    setIsTyping(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:3000');
      const res  = await fetch(`${base}/api/upload/document`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        if (data.documentId) setCurrentDocumentId(data.documentId);
        setMessages(p => [...p,
          { id: `${Date.now()}-f`, role: 'user', type: 'text',
            content: `📄 ${t('chatbot.documentUploaded')}: ${data.filename}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          ...(data.summary ? [{
            id: `${Date.now()}-s`, role: 'bot' as const, type: 'summary' as const,
            content: `${t('chatbot.summary')}: ${data.summary}\n\n💡 ${t('chatbot.askAboutDocument')}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }] : []),
        ]);
        setIsFirstInput(false);
      } else throw new Error(data.error || 'Upload failed');
    } catch (err) {
      setMessages(p => [...p, {
        id: `${Date.now()}-err`, role: 'bot', type: 'text',
        content: err instanceof Error ? `⚠️ ${err.message}` : 'Upload error.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally { setIsTyping(false); e.target.value = ''; }
  };

  /* ── Render message ───────────────────────────────────────────────── */
  const renderContent = (msg: Message) => {
    if (msg.type === 'legal_sections' && msg.legalSections) {
      return (
        <div className="space-y-3">
          {msg.legalSections.map((s, i) => (
            <div key={i} className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="font-semibold text-primary text-sm">{s.section} – {s.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.act}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary/15 text-secondary px-2 py-0.5">Punishment: {s.punishment}</span>
                <span className={`rounded-full px-2 py-0.5 ${s.bailable === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Bailable: {s.bailable}</span>
                <span className={`rounded-full px-2 py-0.5 ${s.cognizable === 'Yes' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>Cognizable: {s.cognizable}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const cleaned = (msg.content || '')
      .replace(/^#{1,6}\s+/gm, '')        // ### headings
      .replace(/\*\*(.+?)\*\*/g, '$1')    // **bold**
      .replace(/\*(.+?)\*/g, '$1')        // *italic*
      .replace(/`(.+?)`/g, '$1')          // `code`
      .replace(/^[-*]\s+/gm, '• ');       // bullet dashes → •
    const paras = cleaned.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-1.5 text-[0.95rem] leading-relaxed text-foreground">
        {paras.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    );
  };

  /* ── Connection badge ─────────────────────────────────────────────── */
  const ConnBadge = () => {
    if (isConnected === true)  return <span className="flex items-center gap-1 text-xs text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Online</span>;
    if (isConnected === false) return <span className="flex items-center gap-1 text-xs text-red-500"><WifiOff className="w-3 h-3" />Offline</span>;
    return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Connecting…</span>;
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`
          flex-shrink-0 flex flex-col
          border-r border-border bg-card
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-r-0'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground tracking-tight">Conversations</span>
          </div>
          <button
            onClick={startNew}
            title="New conversation"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Scale className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start asking a legal question.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConv(conv)}
                className={`
                  group relative rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200
                  ${currentConvId === conv.id
                    ? 'bg-primary/10 border border-primary/25'
                    : 'hover:bg-muted/60 border border-transparent'}
                `}
              >
                <p className={`text-sm font-medium line-clamp-1 pr-6 transition-colors ${currentConvId === conv.id ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                  {conv.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground/60" />
                  <span className="text-xs text-muted-foreground">{timeAgo(conv.updatedAt || conv.timestamp)}</span>
                </div>
                {conv.preview && (
                  <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5 italic">{conv.preview}</p>
                )}
                <button
                  onClick={e => deleteConv(conv.id, e)}
                  title="Delete"
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main chat panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Chat header */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm flex-shrink-0">
              <Scale className="w-4.5 h-4.5 text-white" style={{ width: '1.1rem', height: '1.1rem' }} />
            </div>

            <div>
              <h1 className="font-semibold text-sm text-foreground leading-none">{t('chatbot.title')}</h1>
              <div className="mt-0.5"><ConnBadge /></div>
            </div>
          </div>

          {/* Clear button */}
          {messages.length > 1 && (
            <button
              onClick={() => {
                if (!confirm(t('chatbot.confirmDelete'))) return;
                sessionStorage.removeItem(CHAT_KEY);
                sessionStorage.removeItem(STATE_KEY);
                sessionStorage.removeItem(CUR_ID_KEY);
                setMessages([welcomeMsg()]);
                setIsFirstInput(true);
                setCurrentDocumentId(null);
                setCurrentConvId(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors border border-transparent hover:border-destructive/20"
              title="Clear chat"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 py-6 space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ animation: 'fadeSlideIn 0.25s ease-out both', animationDelay: `${Math.min(idx * 0.04, 0.3)}s` }}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                {msg.role === 'bot' ? (
                  <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col max-w-[75%] lg:max-w-[65%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'user' ? (
                  <div className="rounded-2xl rounded-tr-sm px-4 py-3 bg-primary text-white text-sm leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className={`rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm border
                    ${msg.type === 'summary'
                      ? 'bg-amber-50 border-amber-200/70'
                      : 'bg-card border-border/70'
                    }`}
                  >
                    {renderContent(msg)}
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground/60 mt-1 px-1">{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3" style={{ animation: 'fadeSlideIn 0.2s ease-out' }}>
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 bg-card border border-border/70 shadow-sm">
                <div className="flex items-center gap-1.5">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-primary/60"
                      style={{ animation: `bounce 1.2s ease-in-out infinite`, animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {messages.length === 1 && (
          <div className="px-4 md:px-8 lg:px-16 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs font-medium text-muted-foreground">Suggested questions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-muted-foreground transition-all duration-200 shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 md:px-8 lg:px-16 pb-5 pt-3 flex-shrink-0 border-t border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="flex items-end gap-2.5 bg-card rounded-2xl border border-border shadow-md px-3 py-2.5 focus-within:border-primary/40 focus-within:shadow-lg transition-all duration-200">
            {/* Attach */}
            <label className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/8 cursor-pointer transition-colors mb-0.5">
              <Paperclip className="w-4 h-4" />
              <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFile} className="hidden" />
            </label>

            {/* Mic */}
            <button
              onClick={handleMicClick}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
              className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors mb-0.5
                ${isRecording
                  ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/8'
                }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t('chatbot.placeholder')}
              className="flex-1 resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none leading-relaxed py-1.5 max-h-40 overflow-y-auto"
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center gradient-primary text-white shadow-sm hover:shadow-glow hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 mb-0.5"
            >
              {isTyping
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" style={{ transform: 'translateX(1px)' }} />
              }
            </button>
          </div>

        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
};

export default Chatbot;

import { useState, useRef, useEffect } from 'react';
import {
  BookOpen, Search, Filter, ChevronRight, ArrowLeft,
  FileText, Bot, Send, Upload, X, Loader2, Sparkles,
  GraduationCap, Clock, ChevronDown,
  Zap, Library, Brain, Globe,
  Download, Eye, ExternalLink,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
type Level = 'Foundation' | 'Intermediate' | 'Advanced';

interface CourseDoc {
  title: string;
  pages: number;
  topics: string[];
  summary: string;
  pdfFile?: string;
}

interface Course {
  id: number;
  title: string;
  level: Level;
  hours: number;
  modules: number;
  description: string;
  color: string;
  icon: string;
  docs: CourseDoc[];
}

const COURSES: Course[] = [
  {
    id: 1, title: 'Constitutional Law', level: 'Foundation', hours: 12, modules: 8,
    description: 'Fundamental principles of constitutional governance, rights, and judicial review.',
    color: 'bg-violet-500', icon: '⚖️',
    docs: [
      {
        title: 'Constitutional Law of India — J.N. Pandey (10th Edition)',
        pdfFile: 'Constitutional_Law.pdf', pages: 520,
        topics: ['Constitutional history of India', 'Fundamental Rights & Duties', 'Directive Principles', 'Constitutional amendments & judicial review'],
        summary: 'The definitive Indian constitutional law text by J.N. Pandey. Covers the Preamble, union and its territories, citizenship, fundamental rights, directive principles, constitutional amendments, emergency provisions, and the relationship between the three organs of the state with landmark Supreme Court judgments.',
      },
      {
        title: 'Jurisprudence & Legal Theory — Legal Theory (F Series)',
        pdfFile: 'Jurisprudence.pdf', pages: 380,
        topics: ['Nature and definition of law', 'Schools of jurisprudence', 'Sources of law', 'Rights, duties and legal personality'],
        summary: 'A comprehensive guide to jurisprudence and legal theory covering natural law, positivism, realism, sociological and historical schools. Examines concepts of legal rights, duties, liability, property, ownership and possession, and the relationship between law and morality.',
      },
    ],
  },
  {
    id: 2, title: 'Contract Law', level: 'Intermediate', hours: 10, modules: 7,
    description: 'Formation, performance, breach, and remedies in contractual agreements.',
    color: 'bg-blue-500', icon: '📝',
    docs: [
      {
        title: 'Law of Contract & Specific Relief — Avtar Singh (12th Edition)',
        pdfFile: 'Avtar_Contract_Law.pdf', pages: 612,
        topics: ['Formation of contract', 'Consideration & capacity', 'Performance & breach', 'Specific relief & remedies'],
        summary: 'The most authoritative Indian contract law textbook by Avtar Singh. Covers the Indian Contract Act 1872 in full: offer and acceptance, consideration, capacity, free consent, void agreements, performance, discharge, and remedies. Also covers the Specific Relief Act, indemnity, guarantee, bailment, and agency.',
      },
      {
        title: 'Law of Contracts — Dr. R.K. Bangia',
        pdfFile: 'Bangia_Contract_Law.pdf', pages: 540,
        topics: ['Offer, acceptance & communication', 'Void & voidable contracts', 'Contingent contracts', 'Quasi-contracts'],
        summary: "Dr. R.K. Bangia's comprehensive analysis of Indian contract law with extensive case law. Covers the essentials of a valid contract, void agreements under the Indian Contract Act 1872, contingent and quasi-contracts, breach of contract and liquidated damages, and special contracts including indemnity, guarantee, and agency.",
      },
    ],
  },
  {
    id: 3, title: 'Criminal Law', level: 'Intermediate', hours: 14, modules: 10,
    description: 'Principles of criminal liability, offences, defences, and sentencing.',
    color: 'bg-rose-500', icon: '🔍',
    docs: [
      {
        title: "PSA Pillai's Criminal Law (11th Edition)",
        pdfFile: 'Criminal_Law.pdf', pages: 1050,
        topics: ['General principles of criminal liability', 'Offences against persons & property', 'Defences in criminal law', 'IPC offences & punishment'],
        summary: 'The definitive criminal law textbook for Indian law students. Covers the Indian Penal Code 1860 comprehensively: general exceptions, offences against the state, public order, human body, property, and documents. Discusses mens rea, actus reus, joint liability, and abetment with extensive Supreme Court and High Court case law.',
      },
    ],
  },
  {
    id: 4, title: 'Tort Law', level: 'Intermediate', hours: 9, modules: 6,
    description: 'Civil wrongs, negligence, liability, and compensation under tort principles.',
    color: 'bg-amber-500', icon: '🏛️',
    docs: [
      {
        title: 'Law of Torts incl. Consumer Protection Laws — Dr. R.K. Bangia (21st Edition)',
        pdfFile: 'Bangia_Torts_Law.pdf', pages: 680,
        topics: ['General principles of tort', 'Negligence & duty of care', 'Nuisance, defamation & trespass', 'Consumer Protection Act 2019'],
        summary: "Dr. R.K. Bangia's leading Indian tort law treatise. Covers the nature of tortious liability, general defences, vicarious liability, strict and absolute liability (Rylands v Fletcher, MC Mehta), negligence, nuisance, defamation, malicious prosecution, and an extensive section on the Consumer Protection Act 2019 with NCDRC/State Commission case law.",
      },
    ],
  },
  {
    id: 5, title: 'Company & Commercial Law', level: 'Advanced', hours: 16, modules: 12,
    description: "Corporate formation, governance, directors' duties, and commercial transactions.",
    color: 'bg-emerald-500', icon: '🏢',
    docs: [
      {
        title: 'Company Law — (Standard Text)',
        pdfFile: 'Company_Law.pdf', pages: 720,
        topics: ['Incorporation & types of companies', 'Memorandum & Articles of Association', "Directors' duties & liabilities", 'Winding up & insolvency'],
        summary: 'A comprehensive company law text covering the Companies Act 2013. Topics include incorporation, types of companies, MOA and AOA, share capital, meetings and resolutions, directors\u2019 powers and duties, auditors, accounts, mergers and acquisitions, and winding up proceedings under the Insolvency and Bankruptcy Code 2016.',
      },
    ],
  },
  {
    id: 6, title: 'Intellectual Property Law', level: 'Advanced', hours: 11, modules: 8,
    description: 'Patents, trademarks, copyright, trade secrets, and IP enforcement.',
    color: 'bg-pink-500', icon: '💡',
    docs: [
      {
        title: 'Intellectual Property Rights — Mokal (IPR)',
        pdfFile: 'IPR_Law.pdf', pages: 460,
        topics: ['Copyright & related rights', 'Patent law & registration', 'Trademarks & geographical indications', 'Trade secrets & enforcement'],
        summary: 'A complete guide to Indian intellectual property law. Covers the Copyright Act 1957, Patents Act 1970, Trade Marks Act 1999, Designs Act 2000, Geographical Indications Act 1999, and the Protection of Plant Varieties and Farmers\u2019 Rights Act 2001. Includes TRIPS Agreement obligations and landmark IP judgments from Indian courts.',
      },
    ],
  },
  {
    id: 7, title: 'Industrial, Labour & General Laws', level: 'Foundation', hours: 8, modules: 6,
    description: 'Employment contracts, labour rights, industrial disputes, and workplace regulations.',
    color: 'bg-teal-500', icon: '🏭',
    docs: [
      {
        title: 'Industrial, Labour and General Laws — (Standard Text)',
        pdfFile: 'Industrial_Labour_Law.pdf', pages: 890,
        topics: ['Industrial Disputes Act 1947', 'Factories Act 1948', 'Payment of Wages & Bonus Acts', 'Labour Codes 2020'],
        summary: 'A comprehensive guide covering all major Indian labour and industrial laws. Covers the Industrial Disputes Act 1947, Factories Act 1948, Contract Labour Act 1970, Minimum Wages Act 1948, Payment of Wages Act 1936, Employees\u2019 Provident Funds Act, ESI Act 1948, Trade Unions Act 1926, and the four new Labour Codes enacted in 2019\u20132020.',
      },
    ],
  },
  {
    id: 8, title: 'Family Law', level: 'Foundation', hours: 8, modules: 6,
    description: 'Marriage, divorce, succession, adoption and personal laws in India.',
    color: 'bg-orange-500', icon: '👨‍👩‍👧',
    docs: [
      {
        title: 'Family Law — YAL (Standard Text)',
        pdfFile: 'Family_Law.pdf', pages: 560,
        topics: ['Hindu personal law', 'Muslim personal law', 'Christian & Parsi marriage law', 'Succession & adoption'],
        summary: 'A thorough treatment of Indian family law across all personal law systems. Covers the Hindu Marriage Act 1955, Hindu Succession Act 1956, Hindu Minority and Guardianship Act, Muslim marriage and divorce (talaq, khula, muta), the Muslim Personal Law (Shariat) Application Act 1937, Indian Christian Marriage Act, and the Special Marriage Act 1954.',
      },
    ],
  },
  {
    id: 9, title: 'Direct Tax Law', level: 'Advanced', hours: 10, modules: 7,
    description: 'Income tax, assessment, appeals, and direct tax planning in India.',
    color: 'bg-indigo-500', icon: '💰',
    docs: [
      {
        title: 'Direct Tax Law — (Standard Text, Dec 2020)',
        pdfFile: 'Direct_Tax_Law.pdf', pages: 740,
        topics: ['Heads of income & computation', 'Assessment procedure & appeals', 'TDS & advance tax', 'Tax planning & avoidance'],
        summary: 'A detailed guide to Indian direct taxation. Covers the Income Tax Act 1961 comprehensively: residential status, heads of income (salary, house property, business, capital gains, other sources), deductions under Chapter VI-A, assessment and reassessment procedures, TDS provisions, appeals to CIT(A) and ITAT, and tax planning strategies.',
      },
    ],
  },
  {
    id: 10, title: 'Environmental Law', level: 'Advanced', hours: 10, modules: 7,
    description: 'Environmental protection, pollution control, and sustainable development law.',
    color: 'bg-green-600', icon: '🌿',
    docs: [
      {
        title: 'Indian Environmental Law: Key Concepts and Principles',
        pdfFile: 'Environmental_Law.pdf', pages: 420,
        topics: ['Constitutional basis of environmental law', 'Pollution control legislation', 'Environmental impact assessment', 'International environmental obligations'],
        summary: "A key concepts guide to Indian environmental law. Covers Article 48-A and 51-A(g) of the Constitution, the Environment (Protection) Act 1986, Water (Prevention & Control of Pollution) Act 1974, Air Act 1981, Forest Conservation Act 1980, Wildlife Protection Act 1972, the National Green Tribunal Act 2010, and India's obligations under international conventions including the Paris Agreement.",
      },
    ],
  },
  {
    id: 11, title: 'Public International Law', level: 'Intermediate', hours: 9, modules: 7,
    description: 'Sources of international law, treaties, state responsibility, and dispute resolution.',
    color: 'bg-cyan-500', icon: '🌍',
    docs: [
      {
        title: 'Public International Law (2nd Edition)',
        pdfFile: 'International_Law.pdf', pages: 580,
        topics: ['Sources of international law', 'State sovereignty & recognition', 'Treaty law & pacta sunt servanda', 'International dispute resolution'],
        summary: 'A comprehensive Indian public international law textbook. Covers sources of international law (Article 38 ICJ Statute), states as subjects, recognition, territory, nationality, treatment of aliens, law of the sea, diplomatic & consular relations, treaties (Vienna Convention 1969), state responsibility, peaceful settlement of disputes, and the United Nations system.',
      },
    ],
  },
  {
    id: 12, title: 'Interpretation of Statutes', level: 'Foundation', hours: 6, modules: 5,
    description: 'Rules of statutory interpretation, aids to construction, and drafting principles.',
    color: 'bg-slate-500', icon: '📖',
    docs: [
      {
        title: 'Interpretation of Statutes — LB-6031 (VIth Term, 2023)',
        pdfFile: 'Interpretation_Statutes.pdf', pages: 310,
        topics: ['Literal, golden & mischief rules', 'Internal & external aids to construction', 'Presumptions in statutory interpretation', 'Delegated legislation & its control'],
        summary: 'A law school course material covering the principles of statutory interpretation used by Indian courts. Topics include the primary rules of interpretation (literal, golden, mischief/purposive), internal aids (preamble, headings, marginal notes, schedules) and external aids (parliamentary debates, reports, dictionaries), legal maxims, and the interpretation of penal and taxation statutes.',
      },
    ],
  },
];

const LEVEL_BADGE: Record<Level, string> = {
  Foundation:   'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Intermediate: 'bg-amber-100  text-amber-700  border border-amber-200',
  Advanced:     'bg-rose-100   text-rose-700   border border-rose-200',
};

/* ═══════════════════════════════════════════════════════════════
   SHARED CONSTANTS
═══════════════════════════════════════════════════════════════ */
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:3000');

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ═══════════════════════════════════════════════════════════════
   PDF MODAL  (matches ConstitutionReference pattern)
═══════════════════════════════════════════════════════════════ */
interface PdfModalProps {
  pdfUrl: string;
  downloadUrl: string;
  title: string;
  fileName: string;
  onClose: () => void;
}

function PdfModal({ pdfUrl, downloadUrl, title, fileName, onClose }: PdfModalProps) {
  const [blobUrl,   setBlobUrl]   = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const blobRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    const revoke = () => {
      if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = ''; }
    };
    setFetching(true); setLoadError(false); setBlobUrl(null); revoke();
    const run = async () => {
      try {
        const r = await fetch(pdfUrl.split('#')[0], { credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = await r.arrayBuffer();
        const u8  = new Uint8Array(buf);
        const isPdf = u8.length >= 4 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46;
        if (!isPdf) throw new Error('Not a valid PDF');
        if (cancelled) return;
        const blob = new Blob([buf], { type: 'application/pdf' });
        revoke();
        const ou = URL.createObjectURL(blob);
        blobRef.current = ou;
        setBlobUrl(ou);
      } catch { if (!cancelled) setLoadError(true); }
    };
    run().finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; revoke(); };
  }, [pdfUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-violet-500/10 to-violet-500/5 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <FileText className="text-red-500 w-5 h-5 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-sm line-clamp-1">{title}</h3>
              <p className="text-xs text-muted-foreground truncate">{fileName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-semibold hover:shadow-md transition-all">
              <ExternalLink className="w-3.5 h-3.5" /><span className="hidden sm:inline">Open Tab</span>
            </a>
            <a href={downloadUrl} download={fileName}
              className="flex items-center space-x-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all">
              <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Download</span>
            </a>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
          {fetching && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading PDF…</p>
            </div>
          )}
          {!fetching && loadError && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center">
              <FileText className="w-16 h-16 text-red-400" />
              <h4 className="font-bold text-foreground mb-2">Could not load PDF preview</h4>
              <p className="text-sm text-muted-foreground mb-4">Make sure the backend server is running.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-5 py-2.5 bg-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  <ExternalLink className="w-4 h-4" /><span>Open in New Tab</span>
                </a>
                <a href={downloadUrl} download={fileName}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  <Download className="w-4 h-4" /><span>Download PDF</span>
                </a>
              </div>
            </div>
          )}
          {!fetching && !loadError && blobUrl && (
            <iframe key={blobUrl} src={blobUrl} title={title} className="w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RAG TUTOR — matches Chatbot.tsx animations & style exactly
═══════════════════════════════════════════════════════════════ */
interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  'Summarise this document',
  'What are the key cases?',
  'Give me a quiz question',
  'Explain the main principles',
];

function RagTutor({ course, doc, onBack }: { course: Course; doc: CourseDoc; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [pdfText, setPdfText]   = useState('');
  const [ragMode, setRagMode]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  /* auto-grow textarea — identical to Chatbot */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const systemPrompt = ragMode && pdfText
    ? `You are an expert law tutor for the module "${doc.title}" within the "${course.title}" course. The student has uploaded a PDF. Use the following text as your primary reference:\n\n---\n${pdfText.slice(0, 8000)}\n---\n\nAnswer accurately from this document; draw on broader knowledge when needed and say so.`
    : `You are an expert law tutor for "${doc.title}" in "${course.title}". Topics: ${doc.topics.join(', ')}. Background: ${doc.summary} Give clear, structured answers for a law student. Cite relevant cases and statutes where applicable.`;

  async function extractPdfText(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = e.target?.result as string ?? '';
        const cleaned = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim();
        resolve(cleaned.slice(0, 12000));
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  async function handleFile(file: File) {
    if (!file || file.type !== 'application/pdf') { alert('Please upload a PDF file.'); return; }
    const text = await extractPdfText(file);
    setPdfText(text);
    setRagMode(true);
    setMessages(prev => [...prev, {
      id: `${Date.now()}-rag`, role: 'assistant',
      content: `📄 "${file.name}" uploaded! I'm now in RAG mode — I'll answer using this document as my primary reference. What would you like to know?`,
      timestamp: nowTime(),
    }]);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: ChatMsg = { id: `${Date.now()}-u`, role: 'user', content: text, timestamp: nowTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_BASE}/api/lms/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, messages: history }),
      });
      let reply = '';
      if (res.ok) {
        const data = await res.json();
        reply = data.reply ?? data.content ?? '';
      } else {
        reply = `I'm your AI tutor for ${doc.title}. Topics: ${doc.topics.join(', ')}.\n\n(Backend unavailable — start the server for full AI responses.)`;
      }
      setMessages(prev => [...prev, { id: `${Date.now()}-a`, role: 'assistant', content: reply, timestamp: nowTime() }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-err`, role: 'assistant',
        content: `I'm your tutor for ${doc.title}. Topics: ${doc.topics.join(', ')}.\n\n(Backend unavailable — start the server to enable full AI chat.)`,
        timestamp: nowTime(),
      }]);
    } finally { setLoading(false); }
  }

  /* Identical render logic to Chatbot.renderContent */
  function renderContent(content: string) {
    const cleaned = content.replace(/\*\*/g, '');
    const paras   = cleaned.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-1.5 text-[0.95rem] leading-relaxed text-foreground">
        {paras.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <button onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className={`w-9 h-9 rounded-xl ${course.color} flex items-center justify-center text-white shrink-0 text-base shadow-sm`}>
          {course.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground leading-none truncate">{doc.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{course.title}</p>
        </div>
        {ragMode && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
            <Zap className="w-3 h-3" /> RAG Active
          </span>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors shrink-0"
        >
          <Upload className="w-3.5 h-3.5" /> Upload PDF
        </button>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </header>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 py-6 space-y-6 relative"
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; f && handleFile(f); }}
      >
        {dragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl">
            <p className="text-primary font-semibold text-lg">Drop PDF to enable RAG mode</p>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className={`w-16 h-16 rounded-2xl ${course.color} flex items-center justify-center text-2xl shadow-lg`}>
              {course.icon}
            </div>
            <div className="text-center max-w-sm">
              <h3 className="font-bold text-foreground text-lg mb-2">AI Tutor — {doc.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Ask anything about this module. Upload a PDF for RAG mode.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-muted-foreground transition-all duration-200 shadow-sm">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bubbles — identical structure & classes to Chatbot */}
        {messages.map((msg, idx) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            style={{
              animation: 'lmsFadeSlideIn 0.25s ease-out both',
              animationDelay: `${Math.min(idx * 0.04, 0.3)}s`,
            }}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 mt-0.5">
              {msg.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-4 h-4 text-white" />
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
                <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 bg-card border border-border/70 shadow-sm">
                  {renderContent(msg.content)}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground/60 mt-1 px-1">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {/* Typing indicator — bouncing dots, identical to Chatbot */}
        {loading && (
          <div className="flex gap-3" style={{ animation: 'lmsFadeSlideIn 0.2s ease-out' }}>
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 bg-card border border-border/70 shadow-sm">
              <div className="flex items-center gap-1.5">
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-primary/60"
                    style={{ animation: 'lmsBounce 1.2s ease-in-out infinite', animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick questions strip (while chatting) */}
      {messages.length > 0 && (
        <div className="px-4 md:px-8 lg:px-16 pb-2 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs font-medium text-muted-foreground">Quick questions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:text-primary text-muted-foreground transition-all duration-200 shadow-sm">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar — identical to Chatbot ── */}
      <div className="px-4 md:px-8 lg:px-16 pb-5 pt-3 shrink-0 border-t border-border/60 bg-card/50 backdrop-blur-sm">
        <div className="flex items-end gap-2.5 bg-card rounded-2xl border border-border shadow-md px-3 py-2.5 focus-within:border-primary/40 focus-within:shadow-lg transition-all duration-200">

          {/* Attach (PDF) */}
          <label className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/8 cursor-pointer transition-colors mb-0.5"
            title="Upload PDF for RAG mode">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".pdf" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>

          {/* Auto-grow textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={ragMode ? 'Ask about your uploaded PDF…' : `Ask about ${doc.title}…`}
            className="flex-1 resize-none bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none leading-relaxed py-1.5 max-h-40 overflow-y-auto"
          />

          {/* Send */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center gradient-primary text-white shadow-sm hover:shadow-glow hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 mb-0.5"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" style={{ transform: 'translateX(1px)' }} />
            }
          </button>
        </div>
      </div>

      {/* Scoped keyframes — prefixed to avoid collision with Chatbot's globals */}
      <style>{`
        @keyframes lmsFadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lmsBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOCUMENT READER VIEW
═══════════════════════════════════════════════════════════════ */
function DocReader({ course, doc, onBack, onOpenTutor }: {
  course: Course; doc: CourseDoc; onBack: () => void; onOpenTutor: () => void;
}) {
  const [showPdf, setShowPdf] = useState(false);
  const pdfPreviewUrl  = doc.pdfFile ? `${API_BASE}/api/lms/books/${encodeURIComponent(doc.pdfFile)}` : null;
  const pdfDownloadUrl = doc.pdfFile ? `${API_BASE}/api/lms/books/${encodeURIComponent(doc.pdfFile)}?download=1` : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to course
      </button>

      {/* Doc header */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6 shadow-sm">
        <div className={`${course.color} px-6 py-5 flex items-center gap-4`}>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl">{course.icon}</div>
          <div>
            <h1 className="text-xl font-bold text-white">{doc.title}</h1>
            <p className="text-white/80 text-sm mt-0.5">{course.title} · {doc.pages} pages</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <h2 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide text-muted-foreground">Topics Covered</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {doc.topics.map(t => (
              <div key={t} className="flex items-start gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Document Summary
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{doc.summary}</p>
      </div>

      {/* PDF card */}
      {doc.pdfFile && pdfPreviewUrl && pdfDownloadUrl && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm">Law Book PDF</h4>
              <p className="text-xs text-muted-foreground truncate">{doc.pdfFile}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowPdf(true)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg text-sm font-semibold hover:shadow-md hover:scale-105 transition-all">
              <Eye className="w-4 h-4" /> Preview PDF
            </button>
            <a href={pdfDownloadUrl} download={doc.pdfFile}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:shadow-md hover:scale-105 transition-all">
              <Download className="w-4 h-4" /> Download PDF
            </a>
          </div>
        </div>
      )}

      {/* AI Tutor CTA */}
      <button onClick={onOpenTutor}
        className="w-full gradient-primary text-white py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:shadow-glow transition-shadow">
        <Bot className="w-5 h-5" /> Open AI Tutor for this Module
      </button>

      {showPdf && pdfPreviewUrl && pdfDownloadUrl && (
        <PdfModal
          pdfUrl={pdfPreviewUrl}
          downloadUrl={pdfDownloadUrl}
          title={doc.title}
          fileName={doc.pdfFile!}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COURSE DETAIL VIEW
═══════════════════════════════════════════════════════════════ */
function CourseDetail({ course, onBack, onOpenDoc }: {
  course: Course; onBack: () => void;
  onOpenDoc: (doc: CourseDoc, openTutor?: boolean) => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All courses
      </button>

      <div className={`rounded-2xl ${course.color} px-6 py-8 mb-6 shadow-md`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">{course.icon}</div>
          <div>
            <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">{course.level}</span>
            <h1 className="text-2xl font-bold text-white mt-1">{course.title}</h1>
            <p className="text-white/80 text-sm mt-2 leading-relaxed">{course.description}</p>
          </div>
        </div>
        <div className="flex gap-6 mt-6 text-white/90 text-sm font-medium flex-wrap">
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{course.hours} hrs</span>
          <span className="flex items-center gap-1.5"><Library className="w-4 h-4" />{course.modules} modules</span>
          <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{course.docs.length} documents</span>
        </div>
      </div>

      <h2 className="font-bold text-foreground mb-4 text-lg">Course Documents</h2>
      <div className="space-y-3">
        {course.docs.map((doc, i) => (
          <div key={i} className="rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-4 p-4">
              <div className={`w-10 h-10 rounded-xl ${course.color} flex items-center justify-center text-white shrink-0 text-sm font-bold`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{doc.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{doc.pages} pages · {doc.topics.length} topics</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onOpenDoc(doc, false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Read
                </button>
                <button onClick={() => onOpenDoc(doc, true)}
                  className="text-xs px-3 py-1.5 rounded-lg gradient-primary text-white flex items-center gap-1.5 hover:shadow-glow transition-shadow">
                  <Bot className="w-3.5 h-3.5" /> Study
                </button>
              </div>
            </div>
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {doc.topics.map(t => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COURSE LIBRARY
═══════════════════════════════════════════════════════════════ */
function CourseLibrary({ onSelectCourse }: { onSelectCourse: (c: Course) => void }) {
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<Level | 'All'>('All');
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = COURSES.filter(c => {
    const matchLevel  = filter === 'All' || c.level === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || c.title.toLowerCase().includes(q)
      || c.description.toLowerCase().includes(q)
      || c.docs.some(d =>
          d.title.toLowerCase().includes(q)
          || d.topics.some(t => t.toLowerCase().includes(q))
          || d.summary.toLowerCase().includes(q));
    return matchLevel && matchSearch;
  });

  const stats = {
    total: COURSES.length,
    docs:  COURSES.reduce((s, c) => s + c.docs.length, 0),
    hours: COURSES.reduce((s, c) => s + c.hours, 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Courses',       value: stats.total, icon: <GraduationCap className="w-5 h-5" /> },
          { label: 'Documents',     value: stats.docs,  icon: <FileText className="w-5 h-5" /> },
          { label: 'Study Hours',   value: stats.hours, icon: <Clock className="w-5 h-5" /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search courses, topics…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>
        <div className="relative">
          <button onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Filter className="w-4 h-4" />{filter}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
              {(['All', 'Foundation', 'Intermediate', 'Advanced'] as const).map(l => (
                <button key={l} onClick={() => { setFilter(l); setFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${filter === l ? 'text-primary font-semibold' : 'text-foreground'}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No courses match your search.</p>
          <button onClick={() => { setSearch(''); setFilter('All'); }} className="mt-3 text-sm text-primary hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(course => (
            <button key={course.id} onClick={() => onSelectCourse(course)}
              className="text-left rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden">
              <div className={`${course.color} h-1.5 w-full`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl ${course.color} flex items-center justify-center text-lg shrink-0`}>{course.icon}</div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_BADGE[course.level]}`}>{course.level}</span>
                </div>
                <h3 className="font-bold text-foreground text-base mb-1.5 leading-snug">{course.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.hours}h</span>
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{course.docs.length} docs</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════ */
type View =
  | { type: 'library' }
  | { type: 'course'; course: Course }
  | { type: 'reader'; course: Course; doc: CourseDoc }
  | { type: 'tutor';  course: Course; doc: CourseDoc };

export default function LegalLMS() {
  const [view, setView] = useState<View>({ type: 'library' });
  const [tab,  setTab]  = useState<'courses' | 'tutor'>('courses');

  const goLibrary = () => setView({ type: 'library' });
  const goCourse  = (course: Course) => setView({ type: 'course', course });
  const goReader  = (course: Course, doc: CourseDoc) => setView({ type: 'reader', course, doc });
  const goTutor   = (course: Course, doc: CourseDoc) => setView({ type: 'tutor',  course, doc });

  if (view.type === 'reader') return (
    <DocReader course={view.course} doc={view.doc}
      onBack={() => goCourse(view.course)}
      onOpenTutor={() => goTutor(view.course, view.doc)} />
  );
  if (view.type === 'tutor') return (
    <RagTutor course={view.course} doc={view.doc} onBack={() => goCourse(view.course)} />
  );
  if (view.type === 'course') return (
    <CourseDetail course={view.course} onBack={goLibrary}
      onOpenDoc={(doc, openTutor) => openTutor ? goTutor(view.course, doc) : goReader(view.course, doc)} />
  );

  return (
    <div>
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 h-12">
            {[
              { id: 'courses', label: 'Course Library', icon: <Library className="w-4 h-4" /> },
              { id: 'tutor',   label: 'AI Tutor',       icon: <Brain  className="w-4 h-4" /> },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as 'courses' | 'tutor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'courses' && <CourseLibrary onSelectCourse={goCourse} />}

      {tab === 'tutor' && (
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">AI RAG Tutor</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Select a document from any course to open the AI Tutor. Upload your own PDF to enable RAG mode for document-grounded answers.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: <Sparkles className="w-4 h-4" />, label: 'Knowledge Mode',    desc: "Chat using Claude's legal expertise" },
              { icon: <Zap      className="w-4 h-4" />, label: 'RAG Mode',          desc: 'Upload a PDF for document-grounded answers' },
              { icon: <Bot      className="w-4 h-4" />, label: 'Chatbot-Style UI',  desc: 'Animated bubbles, timestamps & typing dots' },
              { icon: <Globe    className="w-4 h-4" />, label: 'Law Book PDFs',     desc: 'Preview & download law books directly' },
            ].map(f => (
              <div key={f.label} className="rounded-xl border border-border bg-card p-4 text-left">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white mb-2">{f.icon}</div>
                <p className="font-semibold text-sm text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setTab('courses')}
            className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold hover:shadow-glow transition-shadow">
            Browse Courses to Get Started
          </button>
        </div>
      )}
    </div>
  );
}

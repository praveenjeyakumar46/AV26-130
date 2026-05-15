# AI-Powered Legal Learning & Virtual Tutor Platform

> An intelligent, always-available platform that helps students learn Indian law, get instant answers to legal queries, and receive guided explanations — just like a human tutor, but accessible 24/7.

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18-green.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-green.svg)](https://supabase.com/)
[![Ollama](https://img.shields.io/badge/LLM-Ollama%20%2B%20Qwen2.5-purple.svg)](https://ollama.com/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution](#3-solution)
4. [Key Features](#4-key-features)
5. [System Architecture](#5-system-architecture)
6. [AI Pipeline & Algorithms](#6-ai-pipeline--algorithms)
7. [Tech Stack](#7-tech-stack)
8. [Project Structure](#8-project-structure)
9. [Database Schema](#9-database-schema)
10. [API Reference](#10-api-reference)
11. [Getting Started](#11-getting-started)
12. [Environment Variables](#12-environment-variables)
13. [Deployment](#13-deployment)
14. [Roadmap](#14-roadmap)

---

## 1. Project Overview

This is a full-stack, AI-powered virtual tutor and legal assistant built specifically for Indian law students and citizens. It combines a conversational AI chatbot, a structured legal learning management system (LMS), and a live Constitution reference browser into one cohesive platform.

The platform addresses a clear gap: legal education and legal information are expensive, inaccessible, and language-restricted in India. This platform makes quality legal guidance free, instant, bilingual (English and Tamil), and available around the clock — functioning as a knowledgeable tutor that can explain concepts in multiple ways, quiz students, walk through case law, and answer complex questions as a human expert would.

---

## 2. Problem Statement

- Legal consultation in India costs ₹5,000–₹50,000+ per session, putting it out of reach for most students and citizens.
- 35,000+ laws govern India, yet the majority of the population cannot interpret or access them without expert help.
- Legal education relies heavily on in-person instruction; there is no always-available interactive resource for students to practice, ask follow-up questions, or get concepts re-explained.
- Language barriers cut off a large portion of students and citizens who are more comfortable in regional languages like Tamil.
- Court judgement databases are fragmented and difficult for non-experts to search and interpret.

---

## 3. Solution

The platform addresses each of these problems through four integrated modules:

**Virtual AI Tutor (LMS)** — Students pick a law course (Constitutional Law, Contract Law, Criminal Law, etc.), read curated law book PDFs, and then open an AI tutor scoped to that module. The tutor knows the document's topics, can answer follow-up questions, generate quiz questions, summarise chapters, and explain concepts multiple ways. Students can also upload their own PDF notes and activate RAG (Retrieval-Augmented Generation) mode, where the AI answers directly from their uploaded document.

**Legal Chatbot** — A real-time streaming chat interface where anyone can ask legal questions in plain English or Tamil. The AI detects intent, extracts legal terms, retrieves relevant Constitution articles and court judgements, and generates a clear, cited answer. Conversation history is preserved locally across sessions.

**Constitution Browser** — A searchable, paginated reference of all 470+ articles of the Constitution of India, sourced from both structured JSON data and a cleaned CSV dataset.

**Court Judgement Search** — A full-text searchable database of real court judgements that the AI also uses as a retrieval source when answering legal questions.

---

## 4. Key Features

### AI Virtual Tutor (LMS)
- 12 law courses covering Constitutional Law, Contract Law, Criminal Law, Tort Law, Company Law, IP Law, Labour Law, Family Law, Tax Law, Environmental Law, International Law, and Statutory Interpretation.
- Each course links to real Indian law textbook PDFs (J.N. Pandey, Avtar Singh, PSA Pillai, R.K. Bangia, and others).
- An AI tutor is scoped per module — it understands the document's topics, cases, and principles.
- RAG mode: students drag and drop any PDF onto the chat and the AI answers from that document as the primary source.
- Quick-question chips for instant prompts: "Summarise this document", "Give me a quiz question", "What are the key cases?", "Explain the main principles."
- Typing indicator, auto-growing textarea, and animated message bubbles identical to the main chatbot for a consistent UX.

### Legal Chatbot
- Real-time streaming responses via Server-Sent Events (SSE).
- Bilingual: English and Tamil (தமிழ்), with the system prompt and user prompt both adapting to the selected language.
- Intent detection: automatically classifies each query as a factual question or a request for practical guidance, and adjusts the AI's tone and temperature accordingly.
- Legal term extraction: identifies IPC sections, CrPC provisions, Constitution articles, and legal concepts from the query before generating a response.
- Constitution context injection: relevant articles are retrieved from Supabase and added to the system prompt so the AI can reference them accurately.
- Court judgement RAG: the top 3 matching court cases are retrieved using PostgreSQL full-text search and injected as context.
- Document chat: users can upload a PDF, DOCX, or TXT legal document; the backend extracts its text and the AI can then answer questions about it.
- Voice input: click the microphone button to record audio, which is transcribed by the faster-whisper Python sidecar (English and Tamil supported).
- Conversation history: up to 20 conversations stored in `localStorage`, with timestamps, previews, and the ability to load, continue, or delete any session.
- Response cleaning: a post-processing step removes AI-generated disclaimer sentences ("This is not legal advice", "Please consult a lawyer") so answers stay focused and clean.

### Constitution Browser
- All 470+ articles, merging two data sources (structured JSON from COI.json and a cleaned CSV), deduplicated and sorted numerically.
- Articles with omitted status are shown only if they contain meaningful text.
- Full-text search across article ID, name, and description.
- Paginated display with clause-level and sub-clause-level detail for structured articles.

### Court Judgement Search
- PostgreSQL full-text search using `tsvector` + `websearch` configuration.
- Filter by court, year, and act.
- Sort by most recent or oldest.
- Similarity ranking: given one judgement, finds related cases by counting shared legal topics.
- Stats endpoint: total count, breakdown by court, breakdown by year, and recent additions.

### Platform
- Secure authentication via Supabase JWT.
- Strict-origin CORS validation (production-grade, no wildcards).
- Helmet security headers with Content Security Policy.
- Rate limiting (100 requests per 15 minutes general; stricter limits on auth and search endpoints).
- Winston structured logging with file rotation.
- Graceful shutdown with 30-second timeout.
- Health check endpoints (liveness, readiness, detailed) for Docker/Kubernetes probes.

---

## 5. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Browser (User / Student)                      │
│                                                                  │
│   ┌────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│   │  Chatbot   │  │  LMS Tutor   │  │  Constitution Browser  │  │
│   │  (SSE)     │  │  (RAG chat)  │  │  + Judgement Search    │  │
│   └─────┬──────┘  └──────┬───────┘  └──────────┬─────────────┘  │
│         └────────────────┼──────────────────────┘                │
│              React 18 + TypeScript + Vite + Tailwind             │
└──────────────────────────┬───────────────────────────────────────┘
                           │  HTTP / SSE (port 80 in prod)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│               Express.js Backend  (Node.js / TypeScript)         │
│                                                                  │
│  Middleware: Helmet · CORS · Compression · Morgan · Rate Limit   │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ /api/chat   │  │ /api/lms     │  │ /api/law-reference     │  │
│  │ /stream     │  │ /chat        │  │ /api/judgements        │  │
│  │ /nlu-legal  │  │ /books/:file │  │ /api/upload            │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬─────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Service Layer                           │   │
│  │  chatService · ollamaService · constitutionService       │   │
│  │  judgementService · documentService · transcribeService  │   │
│  └────────┬──────────────────────────┬───────────┬──────────┘   │
└───────────┼──────────────────────────┼───────────┼──────────────┘
            │                          │           │
            ▼                          ▼           ▼
┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐
│  Ollama (local)   │  │  Supabase / PG    │  │  Whisper sidecar │
│  Qwen2.5:7b       │  │  constitution_    │  │  (Python / HTTP) │
│  Qwen2.5:3b       │  │  articles         │  │  faster-whisper  │
│  (ChatML format)  │  │  legal_documents  │  │  EN + TA STT     │
└───────────────────┘  │  judgement_meta   │  └──────────────────┘
                       └───────────────────┘
```

### Request flow for a chat message

```
User types query
      │
      ▼
detectUserIntent(query)          ← Qwen2.5:3b  (question | guidance)
      │
      ▼
extractLegalTerms(query)         ← Qwen2.5:3b  (IPC sections, articles, etc.)
      │
      ├──► searchConstitutionArticles(terms)   ← Supabase ILIKE search
      │
      ├──► searchJudgementsForRAG(query)        ← Supabase tsvector FTS
      │
      ├──► getDocumentContext(documentId)       ← in-memory Map (if file uploaded)
      │
      ▼
buildSystemPrompt(intent, lang, constitutionCtx, judgementCtx, documentCtx)
      │
      ▼
generateStreamResponse(prompt, systemPrompt)   ← Qwen2.5:7b  (ChatML)
      │  (async generator, streamed chunk by chunk)
      ▼
cleanAnswer(response)            ← strip trailing disclaimers
      │
      ▼
SSE chunks → browser → append to message bubble in real time
```

---

## 6. AI Pipeline & Algorithms

### Dual-model architecture

The platform uses two Qwen2.5 Instruct models via Ollama, each assigned a role based on the task:

| Model | Role | Temperature |
|---|---|---|
| Qwen2.5:3b | Intent detection, keyword extraction (fast, structured output) | 0.6–0.7 |
| Qwen2.5:7b | Answer generation (full legal explanations) | 0.6–0.7 |

Both models use the ChatML instruction format (`<|im_start|>system ... <|im_end|><|im_start|>user...<|im_end|><|im_start|>assistant`), which is the correct format for Qwen2.5 Instruct variants.

### Intent detection

Before generating a response the system classifies the query into one of two intents:

- **Question** — the user is seeking factual information, a definition, or a legal explanation.
- **Guidance** — the user wants step-by-step advice, a procedure, or practical help.

The intent changes the system prompt wording, the temperature, and how the answer is structured.

### Legal term extraction

The smaller model is prompted to return only a comma-separated list of legal terms from the query. The output is parsed, deduplicated, and used to drive Constitution article retrieval. If the model returns an empty result, a regex fallback fires:

- Pattern 1: `Section 498A`, `Article 21`, `Art. 32`
- Pattern 2: `IPC 302`, `CrPC 125`, `Indian Penal Code`
- Pattern 3: standalone section numbers followed by act names
- Pattern 4: a hardcoded list of common legal keywords (`bail`, `FIR`, `cognizable`, `arrest`, etc.)

### Retrieval-Augmented Generation (RAG)

The platform uses RAG in three places:

**Constitution RAG** — extracted legal terms are used to ILIKE-search two Supabase tables (`constitution_articles` and `constitution_structured`). Results are merged, deduplicated by article number (structured JSON data takes priority over CSV), and a brief context block (150 chars per article) is injected into the system prompt. The LLM is instructed to reference these articles without quoting their full text.

**Judgement RAG** — the raw user query is sent to PostgreSQL full-text search using `tsvector` with `websearch` mode (which handles AND/OR/phrase logic automatically). The top 3 matching judgements (case title, citation, court, date, summary) are injected into the system prompt.

**LMS Document RAG** — in the tutor interface, students can upload any PDF. The frontend sends it to `/api/lms/chat` with a system prompt that includes up to 8,000 characters of extracted text from the PDF. The AI then answers from that document as its primary reference.

### Similarity ranking for judgements

`getSimilarJudgements` fetches the source judgement's `legal_topics` array, then queries other judgements from the same court, scores each by counting shared topics (equivalent to Jaccard intersection), and returns the top N sorted by score.

### Response cleaning

A `cleanAnswer()` function runs on every LLM response before it is sent to the client. It strips:

- Trailing `Note:`, `Disclaimer:`, `Please note:`, `Important:` paragraphs using regex.
- Common suffix phrases like "This is not legal advice." and "Please consult a lawyer." using case-insensitive suffix matching.
- Final sentences that contain disclaimer keywords (`note`, `disclaimer`, `consult`, `legal advice`, `professional`).

This keeps the AI's output focused and useful without repetitive caveats.

### LMS AI tutor

The LMS tutor endpoint (`POST /api/lms/chat`) accepts a full system prompt and message history. It tries two backends in order:

1. **Anthropic API** (`claude-sonnet-4-6`) — if `ANTHROPIC_API_KEY` is set in the environment.
2. **Ollama fallback** — uses the project's local Qwen model if Anthropic is unavailable.

The system prompt is assembled per-document from the course metadata, topic list, and document summary, so the AI behaves as a specialist tutor for exactly that module.

### Speech-to-text

The Whisper sidecar (`whisper_server.py`) is a FastAPI application that:

1. Receives audio as a multipart upload (WebM or WAV from the browser's MediaRecorder API).
2. Converts it to 16 kHz mono WAV using FFmpeg.
3. Transcribes it using `faster-whisper` with VAD filtering and temperature 0 (deterministic).
4. Returns the transcript as JSON.

Supports English and Tamil. Falls back from CUDA to CPU automatically if the GPU runtime is not available.

---

## 7. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite + SWC | 5.4.19 | Build tool and dev server |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| shadcn/ui | latest | Accessible component library |
| Radix UI | various | Headless UI primitives |
| i18next | 25.6.0 | Internationalisation (EN / TA) |
| React Router | 6.30.1 | Client-side navigation |
| React Hook Form | 7.61.1 | Form state management |
| Zod | 3.25.76 | Schema validation (shared) |
| Lucide React | 0.462.0 | Icon library |
| Recharts | 2.15.4 | Data visualisation |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express.js | 4.18.2 | Web framework |
| TypeScript | 5.3.3 | Type safety |
| Supabase JS | 2.38.4 | Database client and auth |
| Axios | 1.13.2 | HTTP client for Ollama API |
| Zod | 3.22.4 | Request schema validation |
| Winston | 3.11.0 | Structured logging with file rotation |
| Helmet | 7.1.0 | Security headers |
| CORS | 2.8.5 | Cross-origin resource sharing |
| express-rate-limit | 7.1.5 | Rate limiting |
| Multer | 2.0.2 | File upload handling |
| pdf-parse | 1.1.1 | PDF text extraction |
| Mammoth | 1.8.0 | DOCX text extraction |
| Morgan | 1.10.0 | HTTP request logging |
| compression | 1.7.4 | Response compression |

### AI / ML

| Technology | Purpose |
|---|---|
| Ollama | Local LLM server |
| Qwen2.5:7b (Instruct) | Legal answer generation |
| Qwen2.5:3b (Instruct) | Intent detection, keyword extraction |
| faster-whisper | Speech-to-text transcription (EN + TA) |
| FastAPI + uvicorn | Whisper HTTP sidecar |
| Anthropic Claude API | LMS tutor (optional, premium backend) |
| FFmpeg | Audio conversion for Whisper |

### Database

| Table | Description |
|---|---|
| `constitution_articles` | 470+ Constitution articles loaded from CSV |
| `constitution_structured` | Structured Constitution data from COI.json with clauses and sub-clauses |
| `legal_documents` | Court judgements with `tsvector` full-text search index |
| `judgement_metadata` | Per-judgement tags: legal topics, acts, statutes, keywords, outcome |
| `tasks` | User task/case management |

---

## 8. Project Structure

```
Project/
│
├── frontend/                        # React TypeScript SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chatbot.tsx          # Main legal chatbot (SSE streaming, voice, file upload)
│   │   │   ├── LegalLMS.tsx         # Course library, document reader, AI tutor
│   │   │   ├── ConstitutionReference.tsx   # Constitution article browser
│   │   │   ├── LawReference.tsx     # Law reference panel
│   │   │   ├── Hero.tsx             # Landing page with feature cards
│   │   │   ├── Navigation.tsx       # Top navigation bar
│   │   │   ├── Profile.tsx          # User profile and auth UI
│   │   │   ├── BackendStatus.tsx    # Health check indicator
│   │   │   └── ui/                  # shadcn/ui primitive components
│   │   ├── pages/
│   │   │   └── Index.tsx            # Root page — renders active section
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/
│   │   │   └── api.ts               # API client helpers (checkHealth, etc.)
│   │   ├── config/                  # App-level config
│   │   ├── i18n.ts                  # i18next setup
│   │   ├── i18n-enhanced.ts         # Enhanced translation helpers
│   │   └── main.tsx                 # React entry point
│   ├── public/                      # Static assets
│   ├── index.html
│   ├── vite.config.ts               # Vite config with dev proxy for /api and /auth
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                         # Express TypeScript API
│   ├── src/
│   │   ├── app.ts                   # Express app factory (middleware, routes, CSP)
│   │   ├── server.ts                # Server entry point (startup, graceful shutdown)
│   │   ├── config/
│   │   │   ├── env.ts               # Validated env var config (Zod)
│   │   │   └── logger.ts            # Winston logger
│   │   ├── controllers/
│   │   │   ├── chatController.ts    # POST /api/chat, /api/chat/stream, /api/chat/nlu-legal
│   │   │   ├── authController.ts    # Auth (me, verify)
│   │   │   ├── constitutionController.ts   # Constitution CRUD
│   │   │   ├── judgementController.ts      # Judgement search and stats
│   │   │   ├── uploadController.ts         # Document upload and processing
│   │   │   ├── transcribeController.ts     # Audio → Whisper → text
│   │   │   ├── taskController.ts           # Case/task CRUD
│   │   │   └── healthController.ts         # Liveness / readiness probes
│   │   ├── services/
│   │   │   ├── chatService.ts       # Chat orchestrator (intent, RAG, LLM, clean)
│   │   │   ├── ollamaService.ts     # Ollama HTTP client (stream + non-stream, ChatML)
│   │   │   ├── constitutionService.ts     # Supabase queries, context builder
│   │   │   ├── judgementService.ts  # Full-text search, similarity ranking, RAG
│   │   │   ├── documentService.ts   # PDF/DOCX/TXT extraction, LLM analysis, in-memory store
│   │   │   ├── constitutionPdfService.ts  # PDF-based constitution lookup
│   │   │   ├── googleSpeechService.ts     # Google STT (optional fallback)
│   │   │   ├── ocrService.ts        # (stub — removed in merge)
│   │   │   ├── taskService.ts       # Task database operations
│   │   │   └── transcribeService.ts # (stub — removed in merge)
│   │   ├── routes/
│   │   │   ├── index.ts             # Route aggregator
│   │   │   ├── chatRoutes.ts        # /api/chat/*
│   │   │   ├── constitutionRoutes.ts       # /api/law-reference/* and /api/constitution/*
│   │   │   ├── judgementRoutes.ts   # /api/judgements/*
│   │   │   ├── lmsRoutes.ts         # /api/lms/chat and /api/lms/books/*
│   │   │   ├── uploadRoutes.ts      # /api/upload/document
│   │   │   ├── transcribeRoutes.ts  # /api/transcribe
│   │   │   ├── authRoutes.ts        # /auth/*
│   │   │   ├── taskRoutes.ts        # /api/v1/tasks/*
│   │   │   └── healthRoutes.ts      # /api/health/*
│   │   ├── middleware/
│   │   │   ├── cors.ts              # Strict-origin CORS with production security
│   │   │   ├── auth.ts              # JWT verification middleware
│   │   │   ├── errorHandler.ts      # Centralised error handling
│   │   │   ├── rateLimiter.ts       # Endpoint-specific rate limits
│   │   │   ├── requestLogger.ts     # Production request logging
│   │   │   └── validateRequest.ts   # Zod request validation helper
│   │   ├── models/
│   │   │   ├── Constitution.ts      # TypeScript types for constitution tables
│   │   │   └── Task.ts              # TypeScript types for tasks
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript types
│   │   ├── utils/
│   │   │   ├── supabase.ts          # Supabase client singleton
│   │   │   ├── asyncHandler.ts      # Express async error wrapper
│   │   │   ├── AppError.ts          # Custom error class
│   │   │   └── response.ts          # Standardised JSON response helpers
│   │   └── validations/
│   │       └── taskValidation.ts    # Zod schemas for task endpoints
│   │
│   ├── database/
│   │   ├── migrations/              # SQL migration files (001–007)
│   │   ├── scripts/                 # Node.js data loading scripts
│   │   └── data/                    # COI.json, Final_IC.csv (constitution source data)
│   │
│   ├── model_training/              # (Legacy) LoRA fine-tuning scripts for Mistral/Llama
│   ├── whisper_server.py            # FastAPI + faster-whisper STT sidecar
│   ├── ocr_tamil_pdf.py             # Tamil OCR utility
│   ├── requirements.txt             # Python dependencies
│   ├── .env.example                 # Environment variable template
│   ├── tsconfig.json
│   └── package.json
│
├── law books/                       # Law book PDFs served by /api/lms/books/:filename
│   ├── Constitutional_Law.pdf
│   ├── Avtar_Contract_Law.pdf
│   ├── Criminal_Law.pdf
│   └── ...                          # 12 textbooks total
│
└── README.md                        # This file
```

---

## 9. Database Schema

### `constitution_articles`
Loaded from `Final_IC.csv`. Simple flat structure.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| article_id | text | e.g. "Article 21 of Indian Constitution" |
| article_desc | text | Full article text |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `constitution_structured`
Loaded from `COI.json`. Rich hierarchical structure.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| art_no | text | e.g. "21", "21A" |
| name | text | Article title |
| art_desc | text | Main description text |
| sub_heading | text | Optional sub-heading |
| part_no | text | Constitution part number |
| part_name | text | Part name |
| status | text | "Active" or "Omitted" |
| clauses | jsonb | Array of `{ClauseNo, ClauseDesc, SubClauses[]}` |
| explanations | jsonb | Array of `{ExplanationNo, Explanation}` |

### `legal_documents` (Judgements)

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| case_title | text | Case name |
| citation | text | Legal citation |
| court | text | e.g. "Supreme Court of India" |
| judges | text[] | Panel of judges |
| date | date | Judgement date |
| year | integer | Year for fast filtering |
| full_text | text | Complete judgement text |
| summary | text | AI-generated summary |
| pdf_url | text | Link to original PDF |
| source | text | Data source |
| status | text | "active" or "inactive" |
| fts | tsvector | Full-text search index (auto-updated) |

### `judgement_metadata`

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| judgement_id | uuid | FK → legal_documents |
| legal_topics | text[] | e.g. ["fundamental rights", "article 21"] |
| statutes | text[] | e.g. ["IPC 1860", "CrPC 1973"] |
| keywords | text[] | Search keywords |
| acts | text[] | Acts cited |
| outcome | text | "upheld", "dismissed", etc. |

---

## 10. API Reference

All API routes are prefixed with `/api`. Authentication is via `Authorization: Bearer <jwt>` for protected routes.

### Chat

| Method | Route | Description |
|---|---|---|
| POST | `/api/chat` | Non-streaming chat. Body: `{ text, is_first_input, conversation_history, document_id, language }` |
| POST | `/api/chat/stream` | SSE streaming chat. Same body. Emits `start`, `chunk`, `legal_sections`, `complete`, `error` events. |
| POST | `/api/chat/nlu-legal` | Legacy NLU endpoint. Returns `reply`, `keywords`, `sections`. |

### LMS (AI Tutor)

| Method | Route | Description |
|---|---|---|
| POST | `/api/lms/chat` | AI tutor chat. Body: `{ system, messages: [{role, content}] }`. Tries Anthropic then Ollama. |
| GET | `/api/lms/books` | List available law book PDF filenames. |
| GET | `/api/lms/books/:filename` | Stream a law book PDF to the browser. |

### Constitution / Law Reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/law-reference/articles` | Get all articles with pagination. Query: `page`, `limit`, `search`. |
| GET | `/api/law-reference/articles/:id` | Get article by ID. |
| GET | `/api/law-reference/search` | Search articles. Query: `q`. |
| GET | `/api/constitution/*` | Alias for the above routes. |

### Judgements

| Method | Route | Description |
|---|---|---|
| GET | `/api/judgements` | Search judgements. Query: `query`, `court`, `year`, `act`, `topic`, `page`, `limit`, `sort`. |
| GET | `/api/judgements/:id` | Get judgement by ID. |
| GET | `/api/judgements/:id/similar` | Get similar judgements. |
| GET | `/api/judgements/stats` | Aggregate stats (total, by court, by year). |

### Upload

| Method | Route | Description |
|---|---|---|
| POST | `/api/upload/document` | Upload PDF/DOCX/TXT. Returns `documentId`, `summary`, `analysis`, `keyPoints`. |

### Transcription

| Method | Route | Description |
|---|---|---|
| POST | `/api/transcribe` | Upload audio file. Returns `{ success, text }`. |

### Auth

| Method | Route | Description |
|---|---|---|
| POST | `/auth/login` | Login with email and password. |
| POST | `/auth/signup` | Register new user. |
| GET | `/api/v1/auth/me` | Get current user (protected). |
| GET | `/api/v1/auth/verify` | Verify JWT (protected). |

### Health

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` | Liveness probe. |
| GET | `/api/health/ready` | Readiness probe (checks Supabase). |
| GET | `/api/health/detailed` | Full system info. |

---

## 11. Getting Started

### Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **FFmpeg** (required for Whisper audio conversion)
- **Ollama** installed and running
- **Supabase** project (free tier is fine)

### Step 1 — Clone the repository

```bash
git clone <repository-url>
cd Project
```

### Step 2 — Backend setup

```bash
cd backend

# Install Node.js dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env — minimum required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Load Constitution data into Supabase
npm run db:load-csv      # Load from Final_IC.csv
npm run db:load-json     # Load from COI.json

# Start the backend (development, with hot reload)
npm run dev
# Server starts on http://localhost:3000
```

### Step 3 — Pull AI models with Ollama

```bash
# Install Ollama if not already installed
curl -fsSL https://ollama.com/install.sh | sh

# Pull the two models used by the platform
ollama pull qwen2.5:7b
ollama pull qwen2.5:3b

# Ollama will be automatically available at http://localhost:11434
```

### Step 4 — Start the Whisper speech-to-text sidecar (optional)

```bash
cd backend

# Install Python dependencies
pip install faster-whisper fastapi uvicorn[standard] python-multipart

# Start the Whisper server (runs on port 9000)
python whisper_server.py
```

If the Whisper sidecar is not running, voice input in the chatbot will show an error but all other features continue to work.

### Step 5 — Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (port 8080, with proxy to backend on 3000)
npm run dev
# App opens at http://localhost:8080
```

### Step 6 — Verify everything is running

Open `http://localhost:8080`. The navigation bar should show a green "Online" badge in the chatbot header. If it shows red, check that the backend is running and `SUPABASE_URL` is correctly set.

---

## 12. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | HTTP port (default: 3000) |
| `API_VERSION` | No | API version prefix (default: v1) |
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for data loading) |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | No | JWT expiry (default: 7d) |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins |
| `CORS_CREDENTIALS` | No | Whether to allow credentials (default: true) |
| `OLLAMA_BASE_URL` | No | Ollama server URL (default: http://localhost:11434) |
| `OLLAMA_MODEL` | No | Main answer model (default: qwen2.5:7b) |
| `OLLAMA_MISTRAL_MODEL` | No | NLU model (default: qwen2.5:3b) |
| `WHISPER_URL` | No | Whisper sidecar URL (default: http://127.0.0.1:9000) |
| `ANTHROPIC_API_KEY` | No | If set, LMS tutor uses Claude instead of Ollama |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 900000) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |
| `LOG_LEVEL` | No | Winston log level (default: info) |
| `LOG_FILE_PATH` | No | Log file directory (default: ./logs) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | Backend URL override. Leave blank in dev (Vite proxy handles routing). In production, set this to your backend's public URL if not behind the same Nginx proxy. |

---

## 13. Deployment

The project ships with a complete Docker setup. See the `docker/` folder for:

- `docker-compose.yml` — orchestrates frontend (Nginx), backend (Node.js), Whisper sidecar (Python), and Ollama (LLM server).
- `backend/Dockerfile` — two-stage TypeScript build.
- `frontend/Dockerfile` — Vite build served by Nginx.
- `frontend/nginx.conf` — proxies `/api/*` and `/auth/*` to the backend with SSE buffering disabled.
- `whisper/Dockerfile` — Python + FFmpeg sidecar.

### Quick production deploy

```bash
# 1. Fill in real values
cp docker/backend/.env.production.example backend/.env.production
nano backend/.env.production

# 2. Build and start all services
docker compose up -d --build

# 3. Wait for Ollama to pull models (~5 GB, first run only)
docker compose logs -f ollama-init

# 4. Open port 80
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
```

For HTTPS, put Caddy in front of port 80 and it will provision a Let's Encrypt certificate automatically.

See `docker/DEPLOYMENT.md` for the full guide including GPU setup, model tuning for low-memory VPS, update procedures, and the public access checklist.

---

## 14. Roadmap

### Completed

- Streaming AI legal chatbot with SSE
- Bilingual support (English and Tamil)
- Intent detection and legal term extraction
- Constitution database (470+ articles, dual-source merged)
- Court judgement search with PostgreSQL FTS
- RAG pipeline (constitution + judgements)
- Document upload and AI analysis (PDF, DOCX, TXT)
- Voice input with faster-whisper STT
- LMS with 12 law courses and curated textbook PDFs
- Per-module AI tutor with RAG mode
- Conversation history with localStorage persistence
- Docker deployment configuration

### Planned

- Hindi and additional regional language support (Telugu, Kannada, Malayalam)
- IPC, CrPC, and BNS (Bharatiya Nyaya Sanhita) section-level database
- Case outcome prediction using historical judgement patterns
- Student progress tracking and quiz generation in the LMS
- Mobile app (React Native)
- Offline mode for the chatbot and LMS tutor
- Audio output (text-to-speech) for accessibility
- Multi-user collaborative session support

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Follow existing TypeScript conventions and add JSDoc where appropriate.
4. Test your changes locally with `npm run lint` and `npm run type-check`.
5. Open a pull request with a clear description of what changed and why.

---

## License

ISC License. See [LICENSE](LICENSE) for details.

---

*Built with the goal of making legal knowledge as accessible as a conversation.*

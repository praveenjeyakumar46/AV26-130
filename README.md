# ⚖️ NEETHI MAN: Legal Literacy with AI 💡


AI-powered legal assistant prototype focused on accessibility and bilingual support (English and Tamil). This repository contains the front‑end built with React, TypeScript, Vite, Tailwind CSS, and a backend built with FastAPI and Python. It showcases a marketing landing page, a chat interface, and a case files module. The chat is now connected to the backend API for real-time legal analysis.

## Features

- Landing page highlighting product value and key features
- Chat interface
  - Message input with Enter-to-send and auto-scroll
  - Suggested queries
  - Bilingual toggle (EN/தமிழ்)
  - File upload UI stub
- Case files module
  - Table view with search, filters, and status chips
  - Grid card view (toggleable in code)
  - "New Case" modal UI stub
- Responsive navigation with mobile menus
- Modern styling with Tailwind CSS and Lucide icons
- Vite dev server for instant HMR and fast builds

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- lucide-react (icon set)
- ESLint (TypeScript + React rules)
- i18next + react-i18next (English/Tamil)

### Backend
- FastAPI (Python)
- Ollama (for LLM integration)
- PyTorch & Transformers (for fine-tuned models)
- Uvicorn (ASGI server)

## Getting Started

### Prerequisites
- Node.js >= 18
- npm >= 9
- Python >= 3.8
- Ollama installed and running (with Mistral model)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Ensure Ollama is running and Mistral model is available:
```bash
ollama pull mistral
ollama serve
```

5. Start the backend server:
```bash
python main.py
```

The backend will start on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# add i18n deps (if not already installed)
npm install i18next react-i18next
```

3. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:8080`

### Language (English/Tamil)

- Use the language switcher in the top navigation to toggle between English and தமிழ்.
- The selection is saved in localStorage and persists across reloads.


### Running Both Servers

You need to run both servers simultaneously:

**Terminal 1 (Backend):**
```bash
cd backend
python main.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

The frontend is configured to proxy API requests to the backend automatically. The Vite dev server will forward requests from `/api/*` to `http://localhost:8000`.

Type-check the codebase
```
npm run typecheck
```

Lint the project
```
npm run lint
```

Create a production build
```
npm run build
```

Preview the production build locally
```
npm run preview
```

## Project Structure

```
.
├─ backend/
│  ├─ main.py                    # FastAPI application with endpoints
│  ├─ requirements.txt           # Python dependencies
│  ├─ use_finetuned_model.py    # Fine-tuned model integration
│  ├─ nlu_model.py              # NLU model integration
│  └─ mistral_finetune_legal.py # Model fine-tuning script
├─ frontend/
│  ├─ index.html
│  ├─ package.json
│  ├─ vite.config.ts            # Vite config with API proxy
│  ├─ src/
│  │  ├─ App.tsx                # Main app component with routing
│  │  ├─ main.tsx               # React root
│  │  ├─ lib/
│  │  │  └─ api.ts              # API utility for backend communication
│  │  ├─ components/
│  │  │  ├─ Chatbot.tsx         # Chat interface (now connected to backend)
│  │  │  ├─ Hero.tsx
│  │  │  ├─ Judgements.tsx
│  │  │  └─ LawReference.tsx
│  │  └─ pages/
│  │     ├─ Index.tsx
│  │     └─ NotFound.tsx
│  └─ ...
└─ README.md
```

## How Navigation Works

The app uses simple internal state to switch screens rather than a router. `App.tsx` maintains `currentPage` and passes an `onNavigate(page)` callback to pages. This keeps the prototype light and easy to understand.

To introduce URL-based navigation, add React Router and replace the state-based switches with route components.


## API Endpoints

The backend provides several endpoints:

- `GET /` - API information
- `GET /health` - Health check endpoint
- `POST /api/chat` - Basic chat endpoint with comprehensive extraction
- `POST /api/chat/legal` - Fine-tuned model endpoint
- `POST /api/chat/nlu-legal` - Ultimate endpoint combining all models
- `POST /api/nlu` - NLU analysis only
- `POST /extract-keywords` - Standard keyword extraction

The frontend automatically uses the `/api/chat/nlu-legal` endpoint with fallback to `/api/chat` if needed.

## Environment Variables (optional)

For the frontend, you can optionally set:
- `VITE_API_BASE_URL` - Override the API base URL (defaults to using proxy)

Create a `.env.local` file in the `frontend/` directory:
```
VITE_API_BASE_URL=http://localhost:8000
```

For production builds, you may need to set this to point to your deployed backend URL.

## API Connection

The frontend and backend are now connected:

- **Proxy Configuration**: Vite dev server proxies `/api/*` requests to `http://localhost:8000`
- **API Utility**: `frontend/src/lib/api.ts` handles all backend communication
- **Chatbot Integration**: The Chatbot component uses real API calls instead of mocked responses
- **Health Check**: The frontend checks backend connectivity on load
- **Error Handling**: Graceful error handling with fallback endpoints

## Extending the App

- ✅ Chat connected to backend API
- Stream responses for better UX
- Persist case files (Supabase/Postgres or other DB)
- Add authentication/authorization
- Add file upload handling and document parsing
- Add i18n strings for full bilingual copy

## Deployment

This is a static front‑end build.
- Build: `npm run build` (outputs to `dist/`)
- Serve the `dist/` folder on any static host (e.g., Netlify, Vercel, GitHub Pages, Nginx)

## Scripts

- `dev` – start Vite dev server
- `build` – create production bundle
- `preview` – preview production bundle locally
- `lint` – run ESLint
- `typecheck` – run TypeScript type checking without emitting



 # Legal AI Backend

Production-ready Express.js backend with TypeScript, featuring comprehensive error handling, validation, rate limiting, logging, authentication, and task management.

> 📖 **New to this project?** Start with [QUICK_START.md](./QUICK_START.md) for a simple guide on how to run and understand the project.

---

## 📁 Directory Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── env.ts           # Environment variables
│   │   └── logger.ts        # Winston logger
│   ├── controllers/         # Route controllers
│   │   ├── authController.ts
│   │   ├── taskController.ts
│   │   └── healthController.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # Authentication middleware
│   │   ├── cors.ts          # CORS configuration
│   │   ├── errorHandler.ts  # Error handling
│   │   ├── rateLimiter.ts   # Granular rate limiting
│   │   ├── requestLogger.ts # Enhanced request logging
│   │   ├── validateRequest.ts # Request validation
│   │   └── AUTH_README.md   # Authentication documentation
│   ├── models/              # Data models
│   │   ├── Task.ts          # Task model types
│   │   └── Constitution.ts  # Constitution model types
│   ├── routes/              # API routes
│   │   ├── authRoutes.ts    # Authentication routes
│   │   ├── taskRoutes.ts    # Task CRUD routes
│   │   ├── healthRoutes.ts  # Health check
│   │   ├── index.ts         # Route aggregator
│   │   └── TASKS_API.md     # Tasks API documentation
│   ├── services/            # Business logic services
│   │   └── taskService.ts   # Task database operations
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Shared types
│   ├── utils/               # Utility functions
│   │   ├── AppError.ts      # Custom error class
│   │   ├── asyncHandler.ts  # Async error handler
│   │   ├── response.ts      # Response helpers
│   │   └── supabase.ts      # Supabase client
│   ├── validations/         # Validation schemas
│   │   └── taskValidation.ts # Task validation schemas
│   ├── app.ts               # Express app configuration
│   └── server.ts            # Server entry point
├── database/                # Database schema & migrations
│   ├── migrations/          # SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_seed_data.sql
│   │   └── 003_load_constitution_data.sql
│   ├── scripts/             # Data loading scripts
│   │   ├── load_constitution_csv.js
│   │   └── load_constitution_json.js
│   └── README.md            # Database documentation
├── data/                    # Legal data files (for database loading)
│   ├── COI.json             # Constitution structured data
│   ├── Final_IC.csv         # Constitution articles
│   └── README.md            # Dataset documentation
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
├── QUICK_START.md           # Quick start guide
└── README.md                # This file
```

---

## ✨ Features

- ✅ **TypeScript** - Full type safety
- ✅ **Authentication** - Supabase JWT token verification
- ✅ **Error Handling** - Centralized error handling middleware
- ✅ **Input Validation** - Zod schema validation
- ✅ **Rate Limiting** - Granular rate limiting per endpoint type
- ✅ **CORS** - Configurable CORS middleware
- ✅ **Environment Variables** - Type-safe configuration
- ✅ **Logging** - Winston logger with file rotation and keyword extraction logging
- ✅ **Security** - Helmet, compression, security headers
- ✅ **Database** - PostgreSQL schema with RLS (Supabase)
- ✅ **Tasks API** - Complete RESTful API with pagination, filtering, sorting
- ✅ **Role-Based Access Control** - Optional role-based authorization
- ✅ **Production Optimizations** - Enhanced security, connection pooling, graceful shutdown
- ✅ **Health Checks** - Liveness, readiness, and detailed health endpoints
- ✅ **Request Logging** - Enhanced production-grade logging with user context
- ✅ **API Versioning** - Flexible versioning system
- ✅ **Intent Detection** - Automatically detects if user is asking a question or seeking guidance
- ✅ **Legal AI Chat** - Intelligent legal assistant with Ollama LLM integration
- ✅ **Keyword Extraction** - Advanced keyword extraction with detailed logging
- ✅ **Optimized LLM Prompts** - Model-specific optimizations for Mistral and Llama 3.2
- ✅ **Constitution Data** - Full Constitution of India dataset integration

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database and authentication)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

3. **Configure `.env` with your Supabase credentials:**
```env
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### Database Setup

1. **Create Supabase Project:**
   - Go to https://supabase.com
   - Create a new project
   - Get your URL and API keys

2. **Run Database Migrations:**
   - Open Supabase SQL Editor
   - Copy and paste contents of `database/migrations/001_initial_schema.sql`
   - Run it
   - Copy and paste contents of `database/migrations/002_seed_data.sql`
   - Run it

3. **Load Constitution Data (Optional):**
```bash
npm run db:load-all
```

### Development

Run the development server with hot reload:
```bash
npm run dev
```

**Server runs at:** `http://localhost:3000`

### Production

1. **Build the TypeScript code:**
```bash
npm run build
```

2. **Start the production server:**
```bash
npm start
```

Or use the production script:
```bash
npm run start:prod
```

---

## 📡 API Endpoints

### Health & Status
- `GET /api/health` - Basic health check (liveness probe)
- `GET /api/health/ready` - Readiness check (checks dependencies)
- `GET /api/health/detailed` - Detailed health with system info

### Authentication
- `GET /api/v1/auth/me` - Get current authenticated user (Protected)
- `GET /api/v1/auth/verify` - Verify JWT token (Protected)

### Tasks API (Protected - Requires Authentication)
- `GET /api/v1/tasks` - Get all tasks with pagination, filtering, sorting
  - Query params: `page`, `perPage`, `status`, `priority`, `search`, `sortBy`, `sortOrder`
- `GET /api/v1/tasks/:id` - Get task by ID
- `POST /api/v1/tasks` - Create new task
- `PATCH /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task

See `src/routes/TASKS_API.md` for complete Tasks API documentation.

---

## 🗄️ Database Schema

### Core Tables
- **tasks** - User tasks with status, priority, due dates
- **tags** - Categorization tags
- **task_tags** - Many-to-many relationship

### Legal Data Tables
- **constitution_articles** - Constitution articles from CSV
- **constitution_structured** - Structured Constitution data from JSON
- **constitution_parts** - Constitution parts

See `database/README.md` for detailed schema documentation.

---

## 🔐 Authentication

The backend uses Supabase JWT authentication. All protected routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

See `src/middleware/AUTH_README.md` for detailed authentication documentation.

### Quick Example

```typescript
import { authenticate } from './middleware/auth';
import { AuthenticatedRequest } from './types';

router.get('/protected', authenticate, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.id;
  // Your protected route logic
});
```

---

## 🛠️ Scripts

```bash
npm run dev          # Development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start            # Production server
npm run start:prod   # Production server with NODE_ENV=production
npm run lint         # Run ESLint
npm run type-check   # Type check without building
npm run db:load-csv  # Load Constitution CSV data
npm run db:load-json # Load Constitution JSON data
npm run db:load-all  # Load all Constitution data
```

---

## 🔒 Security Features

- **Helmet** - Enhanced security headers (CSP, HSTS, XSS protection)
- **Rate Limiting** - Granular rate limiting per endpoint type
  - General API: 100 requests/15 min
  - Authentication: 5 requests/15 min
  - Task creation: 10 requests/min
  - Search: 30 requests/min
- **Row Level Security (RLS)** - Database-level security policies
- **Input Validation** - Zod schema validation
- **Environment Variable Validation** - Type-safe configuration
- **JWT Authentication** - Supabase JWT token verification
- **Role-Based Access Control** - Optional role-based authorization
- **Request/Response Validation** - Comprehensive validation
- **Connection Pooling** - Optimized database connections
- **Graceful Shutdown** - Clean shutdown with connection cleanup
- **Enhanced Logging** - Production-grade request logging with user context

---

## 📝 Documentation

- **QUICK_START.md** - ⭐ **Start here!** Simple guide to run and understand the project
- **database/README.md** - Database schema documentation
- **src/routes/TASKS_API.md** - Complete Tasks API documentation
- **src/middleware/AUTH_README.md** - Authentication middleware documentation
- **PRODUCTION_OPTIMIZATIONS.md** - Production optimizations guide (if exists)

---

## 🚀 Deployment

### Development
```bash
npm run dev  # Runs on port 3000 with hot reload
```

### Production
```bash
npm run build
npm run start:prod
```

### Docker/Kubernetes Health Checks
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Production Optimizations

The backend includes comprehensive production optimizations:

- ✅ **Enhanced Security Headers** - Helmet with CSP, HSTS, and more
- ✅ **Granular Rate Limiting** - Different limits per endpoint type
- ✅ **Connection Pooling** - Optimized Supabase client connections
- ✅ **Graceful Shutdown** - Clean shutdown with 30-second timeout
- ✅ **Health Check Endpoints** - Liveness, readiness, and detailed checks
- ✅ **Enhanced Request Logging** - Production-grade logging with metrics
- ✅ **API Versioning** - Flexible versioning system

---

## 🐛 Troubleshooting

### Cannot connect to Supabase
- Check `.env` file
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Ensure Supabase project is active

### Database errors
- Run migrations in Supabase SQL Editor
- Check `database/README.md` for instructions
- Verify RLS policies are set up correctly

### Port already in use
- Change `PORT` in `.env` file
- Or kill the process using the port: `lsof -ti:3000 | xargs kill`

### Authentication not working
- Verify JWT token is valid
- Check Supabase Auth is enabled
- Ensure token is sent in `Authorization: Bearer <token>` header

---

## 📦 Dependencies

See `package.json` for full list. Key dependencies:
- `express` - Web framework
- `@supabase/supabase-js` - Supabase client
- `zod` - Schema validation
- `winston` - Logging
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting

---

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Update documentation
5. Test your changes

---

## 📄 License

ISC

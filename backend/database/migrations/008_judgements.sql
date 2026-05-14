-- =====================================================
-- Migration 008: Judgements System
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Main judgements table
CREATE TABLE IF NOT EXISTS judgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_title TEXT NOT NULL,
  citation TEXT UNIQUE,
  court TEXT NOT NULL,                -- e.g. 'Supreme Court', 'Delhi High Court'
  judges TEXT[],                      -- array of judge names
  date DATE,
  year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INT) STORED,
  full_text TEXT,
  summary TEXT,
  pdf_url TEXT,
  pdf_path TEXT,
  source TEXT DEFAULT 'indian_kanoon', -- scraper source
  source_id TEXT,                     -- original ID from source
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Metadata / tags table
CREATE TABLE IF NOT EXISTS judgement_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judgement_id UUID REFERENCES judgements(id) ON DELETE CASCADE,
  legal_topics TEXT[],                -- ['Criminal Law', 'Constitutional Law']
  statutes TEXT[],                    -- ['IPC Section 302', 'Article 21']
  keywords TEXT[],
  acts TEXT[],                        -- ['IPC', 'CrPC', 'Constitution']
  outcome TEXT,                       -- 'Upheld', 'Dismissed', 'Remanded'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Embeddings chunks table (for RAG)
CREATE TABLE IF NOT EXISTS judgement_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judgement_id UUID REFERENCES judgements(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(384),             -- for pgvector (optional, can use ChromaDB externally)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Scraper run log
CREATE TABLE IF NOT EXISTS scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  judgements_scraped INT DEFAULT 0,
  status TEXT DEFAULT 'running',     -- 'running', 'completed', 'failed'
  error TEXT
);

-- ── Indexes ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_judgements_court ON judgements(court);
CREATE INDEX IF NOT EXISTS idx_judgements_year ON judgements(year);
CREATE INDEX IF NOT EXISTS idx_judgements_date ON judgements(date DESC);
CREATE INDEX IF NOT EXISTS idx_judgements_source_id ON judgements(source, source_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_judgements_fts ON judgements
  USING gin(to_tsvector('english', coalesce(case_title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(full_text,'')));

CREATE INDEX IF NOT EXISTS idx_judgement_meta_judgement_id ON judgement_metadata(judgement_id);

-- ── Updated_at trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_judgements_updated_at ON judgements;
CREATE TRIGGER update_judgements_updated_at
  BEFORE UPDATE ON judgements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

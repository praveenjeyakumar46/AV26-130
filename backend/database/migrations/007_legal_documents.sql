-- ============================================================================
-- Migration 007: Create legal_documents table for Central Acts PDFs
-- ============================================================================

CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    full_title VARCHAR(500),
    category VARCHAR(255),
    content TEXT NOT NULL,
    source VARCHAR(100) DEFAULT 'Central Acts PDF',
    language VARCHAR(10) DEFAULT 'en',
    file_name VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_legal_documents_title ON legal_documents(title);
CREATE INDEX IF NOT EXISTS idx_legal_documents_category ON legal_documents(category);
CREATE INDEX IF NOT EXISTS idx_legal_documents_content_search ON legal_documents USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_legal_documents_title_search ON legal_documents USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_legal_documents_file_name ON legal_documents(file_name);

-- Trigger for updated_at
CREATE TRIGGER update_legal_documents_updated_at BEFORE UPDATE ON legal_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view legal documents"
    ON legal_documents FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Service role can manage legal documents"
    ON legal_documents FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE legal_documents IS 'Central Acts PDFs loaded from database/data/Central Acts/';

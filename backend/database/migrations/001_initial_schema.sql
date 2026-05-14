-- ============================================================================
-- PostgreSQL Database Schema for Legal AI Application
-- Supabase-compatible with Row Level Security
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7), -- Hex color code
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TASK_TAGS JUNCTION TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_tags (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (task_id, tag_id)
);

-- ============================================================================
-- CONSTITUTION ARTICLES TABLE (from Final_IC.csv)
-- ============================================================================
CREATE TABLE IF NOT EXISTS constitution_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id VARCHAR(50) NOT NULL UNIQUE, -- e.g., "Article 1 of Indian Constitution"
    article_desc TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONSTITUTION STRUCTURED DATA TABLE (from COI.json)
-- ============================================================================
CREATE TABLE IF NOT EXISTS constitution_structured (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    art_no VARCHAR(20) NOT NULL, -- Article number
    name VARCHAR(500) NOT NULL,
    art_desc TEXT,
    status VARCHAR(50), -- e.g., "Omitted"
    sub_heading VARCHAR(500),
    part_no VARCHAR(10),
    part_name VARCHAR(500),
    clauses JSONB, -- Store nested clauses as JSONB
    explanations JSONB, -- Store explanations as JSONB
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONSTITUTION PARTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS constitution_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_no VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    article_numbers TEXT[], -- Array of article numbers in this part
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_title_search ON tasks USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_tasks_description_search ON tasks USING gin(to_tsvector('english', description));

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm ON tags USING gin(name gin_trgm_ops); -- For fuzzy search

-- Task tags indexes
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- Constitution articles indexes
CREATE INDEX IF NOT EXISTS idx_constitution_articles_article_id ON constitution_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_constitution_articles_search ON constitution_articles USING gin(to_tsvector('english', article_desc));
CREATE INDEX IF NOT EXISTS idx_constitution_articles_article_id_trgm ON constitution_articles USING gin(article_id gin_trgm_ops);

-- Constitution structured indexes
CREATE INDEX IF NOT EXISTS idx_constitution_structured_art_no ON constitution_structured(art_no);
CREATE INDEX IF NOT EXISTS idx_constitution_structured_part_no ON constitution_structured(part_no);
CREATE INDEX IF NOT EXISTS idx_constitution_structured_name_search ON constitution_structured USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_constitution_structured_art_desc_search ON constitution_structured USING gin(to_tsvector('english', art_desc));
CREATE INDEX IF NOT EXISTS idx_constitution_structured_clauses ON constitution_structured USING gin(clauses);
CREATE INDEX IF NOT EXISTS idx_constitution_structured_explanations ON constitution_structured USING gin(explanations);

-- Constitution parts indexes
CREATE INDEX IF NOT EXISTS idx_constitution_parts_part_no ON constitution_parts(part_no);
CREATE INDEX IF NOT EXISTS idx_constitution_parts_name_search ON constitution_parts USING gin(to_tsvector('english', name));

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constitution_articles_updated_at BEFORE UPDATE ON constitution_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constitution_structured_updated_at BEFORE UPDATE ON constitution_structured
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constitution_parts_updated_at BEFORE UPDATE ON constitution_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution_structured ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitution_parts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TASKS RLS POLICIES
-- ============================================================================

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own tasks
CREATE POLICY "Users can insert own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- TAGS RLS POLICIES
-- ============================================================================

-- Tags are readable by all authenticated users
CREATE POLICY "Authenticated users can view tags"
    ON tags FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can create tags
CREATE POLICY "Authenticated users can create tags"
    ON tags FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Authenticated users can update tags
CREATE POLICY "Authenticated users can update tags"
    ON tags FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Authenticated users can delete tags
CREATE POLICY "Authenticated users can delete tags"
    ON tags FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- TASK_TAGS RLS POLICIES
-- ============================================================================

-- Users can view task_tags for their own tasks
CREATE POLICY "Users can view own task tags"
    ON task_tags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_tags.task_id
            AND tasks.user_id = auth.uid()
        )
    );

-- Users can insert task_tags for their own tasks
CREATE POLICY "Users can insert own task tags"
    ON task_tags FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_tags.task_id
            AND tasks.user_id = auth.uid()
        )
    );

-- Users can delete task_tags for their own tasks
CREATE POLICY "Users can delete own task tags"
    ON task_tags FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = task_tags.task_id
            AND tasks.user_id = auth.uid()
        )
    );

-- ============================================================================
-- CONSTITUTION ARTICLES RLS POLICIES
-- ============================================================================

-- Constitution articles are readable by all (public data)
CREATE POLICY "Public can view constitution articles"
    ON constitution_articles FOR SELECT
    TO public
    USING (true);

-- Only service role can modify constitution articles
CREATE POLICY "Service role can manage constitution articles"
    ON constitution_articles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- CONSTITUTION STRUCTURED RLS POLICIES
-- ============================================================================

-- Constitution structured data is readable by all
CREATE POLICY "Public can view constitution structured"
    ON constitution_structured FOR SELECT
    TO public
    USING (true);

-- Only service role can modify
CREATE POLICY "Service role can manage constitution structured"
    ON constitution_structured FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- CONSTITUTION PARTS RLS POLICIES
-- ============================================================================

-- Constitution parts are readable by all
CREATE POLICY "Public can view constitution parts"
    ON constitution_parts FOR SELECT
    TO public
    USING (true);

-- Only service role can modify
CREATE POLICY "Service role can manage constitution parts"
    ON constitution_parts FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE tasks IS 'User tasks with status, priority, and due dates';
COMMENT ON TABLE tags IS 'Tags for categorizing tasks';
COMMENT ON TABLE task_tags IS 'Many-to-many relationship between tasks and tags';
COMMENT ON TABLE constitution_articles IS 'Indian Constitution articles from Final_IC.csv';
COMMENT ON TABLE constitution_structured IS 'Structured Constitution data from COI.json with nested clauses';
COMMENT ON TABLE constitution_parts IS 'Constitution parts and their associated articles';

COMMENT ON COLUMN tasks.user_id IS 'References auth.users(id) from Supabase Auth';
COMMENT ON COLUMN tasks.status IS 'Task status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN tasks.priority IS 'Task priority: low, medium, high, urgent';
COMMENT ON COLUMN tags.color IS 'Hex color code for tag display (e.g., #FF5733)';
COMMENT ON COLUMN constitution_structured.clauses IS 'JSONB array of clause objects with nested sub-clauses';
COMMENT ON COLUMN constitution_structured.explanations IS 'JSONB array of explanation objects';


-- ============================================================================
-- Fix Constitution Schema Issues
-- ============================================================================

-- Fix 1: Increase article_id column size (some article IDs are longer than 50 chars)
ALTER TABLE constitution_articles 
ALTER COLUMN article_id TYPE VARCHAR(255);

-- Fix 2: Add UNIQUE constraint on art_no for constitution_structured
-- First, check if there are duplicates and handle them
DO $$
BEGIN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'constitution_structured_art_no_key'
    ) THEN
        -- Remove any duplicates first (keep the first one)
        DELETE FROM constitution_structured a
        USING constitution_structured b
        WHERE a.id > b.id AND a.art_no = b.art_no;
        
        -- Add unique constraint
        ALTER TABLE constitution_structured 
        ADD CONSTRAINT constitution_structured_art_no_key UNIQUE (art_no);
    END IF;
END $$;

-- Fix 3: Ensure indexes are updated
CREATE INDEX IF NOT EXISTS idx_constitution_articles_article_id ON constitution_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_constitution_structured_art_no ON constitution_structured(art_no);


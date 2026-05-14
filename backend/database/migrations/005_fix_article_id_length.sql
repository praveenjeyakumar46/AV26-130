-- ============================================================================
-- Fix article_id column length in constitution_articles table
-- The article_id column is too short (50 chars) for some article IDs
-- ============================================================================

-- Increase article_id length from VARCHAR(50) to VARCHAR(255)
ALTER TABLE constitution_articles 
ALTER COLUMN article_id TYPE VARCHAR(255);

-- Recreate the trigram index for the longer column
DROP INDEX IF EXISTS idx_constitution_articles_article_id_trgm;
CREATE INDEX idx_constitution_articles_article_id_trgm 
ON constitution_articles USING gin(article_id gin_trgm_ops);

-- Add comment
COMMENT ON COLUMN constitution_articles.article_id IS 'Article identifier - increased to 255 chars to accommodate long article IDs';

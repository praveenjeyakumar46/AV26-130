-- ============================================================================
-- Ensure Unique Constraints Exist
-- This migration ensures all required unique constraints are in place
-- Run this if you're getting "no unique or exclusion constraint" errors
-- ============================================================================

-- Ensure article_id has unique constraint in constitution_articles
DO $$
BEGIN
    -- Check if unique constraint exists on article_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'constitution_articles_article_id_key'
        AND conrelid = 'constitution_articles'::regclass
    ) THEN
        -- Remove duplicates first (keep the first one)
        DELETE FROM constitution_articles a
        USING constitution_articles b
        WHERE a.id > b.id AND a.article_id = b.article_id;
        
        -- Add unique constraint
        ALTER TABLE constitution_articles 
        ADD CONSTRAINT constitution_articles_article_id_key UNIQUE (article_id);
        
        RAISE NOTICE 'Added unique constraint on constitution_articles.article_id';
    ELSE
        RAISE NOTICE 'Unique constraint on constitution_articles.article_id already exists';
    END IF;
END $$;

-- Ensure art_no has unique constraint in constitution_structured
DO $$
BEGIN
    -- Check if unique constraint exists on art_no
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'constitution_structured_art_no_key'
        AND conrelid = 'constitution_structured'::regclass
    ) THEN
        -- Remove duplicates first (keep the first one)
        DELETE FROM constitution_structured a
        USING constitution_structured b
        WHERE a.id > b.id AND a.art_no = b.art_no;
        
        -- Add unique constraint
        ALTER TABLE constitution_structured 
        ADD CONSTRAINT constitution_structured_art_no_key UNIQUE (art_no);
        
        RAISE NOTICE 'Added unique constraint on constitution_structured.art_no';
    ELSE
        RAISE NOTICE 'Unique constraint on constitution_structured.art_no already exists';
    END IF;
END $$;

-- Ensure part_no has unique constraint in constitution_parts
DO $$
BEGIN
    -- Check if unique constraint exists on part_no
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'constitution_parts_part_no_key'
        AND conrelid = 'constitution_parts'::regclass
    ) THEN
        -- Remove duplicates first (keep the first one)
        DELETE FROM constitution_parts a
        USING constitution_parts b
        WHERE a.id > b.id AND a.part_no = b.part_no;
        
        -- Add unique constraint
        ALTER TABLE constitution_parts 
        ADD CONSTRAINT constitution_parts_part_no_key UNIQUE (part_no);
        
        RAISE NOTICE 'Added unique constraint on constitution_parts.part_no';
    ELSE
        RAISE NOTICE 'Unique constraint on constitution_parts.part_no already exists';
    END IF;
END $$;

-- Verify all constraints are in place
SELECT 
    'constitution_articles.article_id' as table_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'constitution_articles_article_id_key'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'constitution_structured.art_no' as table_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'constitution_structured_art_no_key'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'constitution_parts.part_no' as table_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'constitution_parts_part_no_key'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;


-- ============================================================================
-- Quick SQL Queries to Check Constitution Data in Supabase
-- Run these in Supabase SQL Editor to verify data
-- ============================================================================

-- 1. Count rows in each table
SELECT 
    'constitution_articles' as table_name,
    COUNT(*) as row_count
FROM constitution_articles
UNION ALL
SELECT 
    'constitution_structured' as table_name,
    COUNT(*) as row_count
FROM constitution_structured
UNION ALL
SELECT 
    'constitution_parts' as table_name,
    COUNT(*) as row_count
FROM constitution_parts;

-- 2. View sample articles from constitution_structured
SELECT 
    art_no,
    name,
    LEFT(art_desc, 100) as description_preview,
    part_no,
    part_name
FROM constitution_structured
ORDER BY 
    CASE 
        WHEN art_no ~ '^[0-9]+$' THEN art_no::INTEGER
        ELSE 999999
    END,
    art_no
LIMIT 10;

-- 3. View sample articles from constitution_articles
SELECT 
    article_id,
    LEFT(article_desc, 100) as description_preview
FROM constitution_articles
ORDER BY article_id
LIMIT 10;

-- 4. Check for duplicates in constitution_structured
SELECT 
    art_no,
    COUNT(*) as duplicate_count
FROM constitution_structured
GROUP BY art_no
HAVING COUNT(*) > 1;

-- 5. Check for duplicates in constitution_articles
SELECT 
    article_id,
    COUNT(*) as duplicate_count
FROM constitution_articles
GROUP BY article_id
HAVING COUNT(*) > 1;

-- 6. Check unique constraints exist
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    a.attname as column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE conrelid IN (
    'constitution_articles'::regclass,
    'constitution_structured'::regclass,
    'constitution_parts'::regclass
)
AND contype = 'u'
ORDER BY conrelid::regclass, conname;

-- 7. View all parts with article counts
SELECT 
    part_no,
    name,
    array_length(article_numbers, 1) as article_count,
    article_numbers
FROM constitution_parts
ORDER BY part_no;

-- 8. Search for specific article (example: Article 1)
SELECT 
    'structured' as source,
    art_no,
    name,
    art_desc
FROM constitution_structured
WHERE art_no = '1'
UNION ALL
SELECT 
    'csv' as source,
    NULL as art_no,
    NULL as name,
    article_desc
FROM constitution_articles
WHERE article_id LIKE '%Article 1%';


-- ============================================================================
-- Constitution Data Loading
-- Note: This file contains example data. Use the Node.js scripts to load
-- the full dataset from CSV and JSON files.
-- ============================================================================

-- Example: Insert a few sample constitution articles
-- Full data should be loaded using the Node.js scripts:
-- - node database/scripts/load_constitution_csv.js
-- - node database/scripts/load_constitution_json.js

INSERT INTO constitution_articles (article_id, article_desc) VALUES
    (
        'Article 1 of Indian Constitution',
        'Name and territory of the Union
(1) India, that is Bharat, shall be a Union of States
(2) The States and the territories thereof shall be as specified in the First Schedule
(3) The territory of India shall comprise
The territories of the States; the Union territories specified in the First Schedule; and such other territories as may be acquired'
    ),
    (
        'Article 2 of Indian Constitution',
        'Admission or establishment of new States: Parliament may by law admit into the Union, or establish, new States on such terms and conditions, as it thinks fit'
    )
ON CONFLICT (article_id) DO NOTHING;

-- Example: Insert a sample structured article
INSERT INTO constitution_structured (art_no, name, art_desc, part_no, part_name) VALUES
    (
        '1',
        'Name and territory of the Union.',
        'India, that is Bharat, shall be a Union of States.',
        'I',
        'THE UNION AND ITS TERRITORY'
    )
ON CONFLICT DO NOTHING;

-- Example: Insert a sample part
INSERT INTO constitution_parts (part_no, name, article_numbers) VALUES
    (
        'I',
        'THE UNION AND ITS TERRITORY',
        ARRAY['1', '2', '2A', '3', '4']
    )
ON CONFLICT (part_no) DO NOTHING;


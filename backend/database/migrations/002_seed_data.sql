-- ============================================================================
-- Seed Data for Tags
-- ============================================================================

-- Insert default tags
INSERT INTO tags (name, color, description) VALUES
    ('work', '#3B82F6', 'Work-related tasks'),
    ('personal', '#10B981', 'Personal tasks'),
    ('urgent', '#EF4444', 'Urgent tasks requiring immediate attention'),
    ('legal', '#8B5CF6', 'Legal-related tasks'),
    ('research', '#F59E0B', 'Research tasks'),
    ('meeting', '#EC4899', 'Meeting-related tasks'),
    ('documentation', '#06B6D4', 'Documentation tasks'),
    ('review', '#84CC16', 'Tasks requiring review')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Note: Constitution data will be loaded via migration scripts
-- See 003_load_constitution_data.sql
-- ============================================================================


/**
 * Script to load Constitution data from Final_IC.csv into PostgreSQL
 * Run with: node database/scripts/load_constitution_csv.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Try multiple paths for .env file
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    console.log(`📝 Loaded .env from: ${envPath}`);
    break;
  }
}

if (!envLoaded) {
  // Try default dotenv config as fallback
  require('dotenv').config();
}

// Improved CSV parser that handles multi-line quoted fields
function parseCSV(csvContent) {
  const data = [];
  let currentLine = '';
  let inQuotes = false;
  let lines = [];

  // First, properly handle multi-line quoted fields
  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentLine += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === '\n' && !inQuotes) {
      // End of line (only if not in quotes)
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  
  // Add last line if exists
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line with proper quote handling
    const values = [];
    let current = '';
    let inFieldQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inFieldQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          inFieldQuotes = !inFieldQuotes;
        }
      } else if (char === ',' && !inFieldQuotes) {
        // Field separator
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    // Add last field
    values.push(current.trim());

    // Remove surrounding quotes from values
    const cleanValues = values.map(v => {
      if (v.startsWith('"') && v.endsWith('"')) {
        return v.slice(1, -1).replace(/""/g, '"');
      }
      return v;
    });

    if (cleanValues.length >= 2 && cleanValues[0]) {
      data.push({
        article_id: cleanValues[0],
        article_desc: cleanValues.slice(1).join(',').trim(),
      });
    } else if (cleanValues.length === 1 && cleanValues[0]) {
      // Handle case where article_desc might be empty
      data.push({
        article_id: cleanValues[0],
        article_desc: '',
      });
    }
  }

  return data;
}

async function loadConstitutionData() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
      console.error('   Please ensure your .env file is in the backend directory with:');
      console.error('   SUPABASE_URL=https://your-project.supabase.co');
      console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
      process.exit(1);
    }

    console.log('🔗 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test connection
    const { error: testError } = await supabase.from('constitution_articles').select('id').limit(1);
    if (testError && testError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is OK
      console.error('❌ Cannot connect to Supabase:', testError.message);
      console.error('   Please check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    console.log('🔍 Verifying database schema...');
    console.log('   Note: If you see constraint errors, please run database migrations:');
    console.log('   1. Open Supabase SQL Editor');
    console.log('   2. Run migrations from backend/database/migrations/');
    console.log('   3. Start with 001_initial_schema.sql, then 004_fix_constitution_schema.sql');

    const csvPath = path.join(__dirname, '../data/Final_IC.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found: ${csvPath}`);
      console.error('   Expected path:', csvPath);
      process.exit(1);
    }

    console.log('📖 Reading CSV file...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const articles = parseCSV(csvContent);

    if (articles.length === 0) {
      console.error('❌ No articles found in CSV file');
      process.exit(1);
    }

    console.log(`📊 Found ${articles.length} articles to insert`);

    // Validate data before insertion
    const validArticles = articles.filter(article => {
      if (!article.article_id || article.article_id.trim() === '') {
        console.warn('⚠️  Skipping article with empty article_id');
        return false;
      }
      if (article.article_id.length > 255) {
        console.warn(`⚠️  Article ID too long (${article.article_id.length} chars): ${article.article_id.substring(0, 50)}...`);
        return false;
      }
      return true;
    });

    console.log(`📝 Validated ${validArticles.length} articles (${articles.length - validArticles.length} skipped)`);

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;
    const errorDetails = [];

    for (let i = 0; i < validArticles.length; i += batchSize) {
      const batch = validArticles.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(validArticles.length / batchSize);
      
      try {
        // Try upsert first, fallback to insert if unique constraint doesn't exist
        let { data, error } = await supabase
          .from('constitution_articles')
          .upsert(
            batch.map(article => ({
              article_id: article.article_id.trim(),
              article_desc: article.article_desc || '',
            })),
            { onConflict: 'article_id' }
          );

        // If upsert fails due to missing constraint, try regular insert
        if (error && error.message && error.message.includes('no unique or exclusion constraint')) {
          console.warn(`⚠️  Unique constraint on 'article_id' not found. Using regular insert (may create duplicates).`);
          console.warn(`   Please run migration 001_initial_schema.sql to add the constraint.`);
          
          // Try regular insert instead
          const { error: insertError } = await supabase
            .from('constitution_articles')
            .insert(
              batch.map(article => ({
                article_id: article.article_id.trim(),
                article_desc: article.article_desc || '',
              }))
            );

          if (insertError) {
            console.error(`❌ Error inserting batch ${batchNum}/${totalBatches}:`, insertError.message);
            if (insertError.details) {
              console.error('   Details:', insertError.details);
            }
            errors += batch.length;
            errorDetails.push({ batch: batchNum, error: insertError.message });
          } else {
            inserted += batch.length;
            console.log(`✅ Inserted batch ${batchNum}/${totalBatches} (${inserted}/${validArticles.length})`);
          }
        } else if (error) {
          console.error(`❌ Error inserting batch ${batchNum}/${totalBatches}:`, error.message);
          if (error.details) {
            console.error('   Details:', error.details);
          }
          if (error.hint) {
            console.error('   Hint:', error.hint);
          }
          errors += batch.length;
          errorDetails.push({ batch: batchNum, error: error.message });
        } else {
          inserted += batch.length;
          console.log(`✅ Inserted batch ${batchNum}/${totalBatches} (${inserted}/${validArticles.length})`);
        }
      } catch (err) {
        console.error(`❌ Exception inserting batch ${batchNum}:`, err.message);
        errors += batch.length;
        errorDetails.push({ batch: batchNum, error: err.message });
      }
    }

    console.log(`\n✨ Done! Inserted: ${inserted}, Errors: ${errors}`);
    if (errorDetails.length > 0) {
      console.log('\n⚠️  Error details:');
      errorDetails.forEach(({ batch, error }) => {
        console.log(`   Batch ${batch}: ${error}`);
      });
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

loadConstitutionData().catch(console.error);


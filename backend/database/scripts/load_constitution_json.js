/**
 * Script to load Constitution structured data from COI.json into PostgreSQL
 * Run with: node database/scripts/load_constitution_json.js
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

async function loadConstitutionStructured() {
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
    const { error: testError } = await supabase.from('constitution_structured').select('id').limit(1);
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

    const jsonPath = path.join(__dirname, '../data/COI.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ JSON file not found: ${jsonPath}`);
      console.error('   Expected path:', jsonPath);
      process.exit(1);
    }

    console.log('📖 Reading JSON file...');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    let data;
    try {
      data = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON file:', parseError.message);
      process.exit(1);
    }

    // COI.json structure: [articles[], parts[]]
    const articles = data[0] || [];
    const parts = data[1] || [];

    if (!Array.isArray(articles) || !Array.isArray(parts)) {
      console.error('❌ Invalid JSON structure. Expected: [articles[], parts[]]');
      process.exit(1);
    }

    console.log(`📊 Found ${articles.length} structured articles and ${parts.length} parts`);

    // Insert articles
    let insertedArticles = 0;
    let insertedParts = 0;
    let errors = 0;
    const errorDetails = [];

    // Validate and filter articles
    const validArticles = articles.filter((article, index) => {
      if (!article.ArtNo || article.ArtNo.toString().trim() === '') {
        console.warn(`⚠️  Skipping article at index ${index} with empty ArtNo`);
        return false;
      }
      if (article.ArtNo.toString().length > 20) {
        console.warn(`⚠️  ArtNo too long (${article.ArtNo.length} chars): ${article.ArtNo}`);
        return false;
      }
      if (article.Name && article.Name.length > 500) {
        console.warn(`⚠️  Name too long for article ${article.ArtNo}, truncating...`);
        article.Name = article.Name.substring(0, 500);
      }
      return true;
    });

    console.log(`📝 Validated ${validArticles.length} articles (${articles.length - validArticles.length} skipped)`);

    // Process articles
    const batchSize = 50;
    for (let i = 0; i < validArticles.length; i += batchSize) {
      const batch = validArticles.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(validArticles.length / batchSize);
      
      try {
        const articlesToInsert = batch.map(article => ({
          art_no: article.ArtNo ? article.ArtNo.toString().trim() : '',
          name: article.Name ? article.Name.trim().substring(0, 500) : '',
          art_desc: article.ArtDesc || null,
          status: article.Status ? article.Status.substring(0, 50) : null,
          sub_heading: article.SubHeading ? article.SubHeading.trim().substring(0, 500) : null,
          part_no: article.PartNo ? article.PartNo.toString().trim().substring(0, 10) : null,
          part_name: article.PartName ? article.PartName.trim().substring(0, 500) : null,
          clauses: article.Clauses || null, // Supabase will handle JSONB conversion
          explanations: article.Explanations || null, // Supabase will handle JSONB conversion
        }));

        // Try upsert first, fallback to insert if unique constraint doesn't exist
        let { error } = await supabase
          .from('constitution_structured')
          .upsert(articlesToInsert, { onConflict: 'art_no' });

        // If upsert fails due to missing constraint, try regular insert
        if (error && error.message && error.message.includes('no unique or exclusion constraint')) {
          console.warn(`⚠️  Unique constraint on 'art_no' not found. Using regular insert (may create duplicates).`);
          console.warn(`   Please run migration 004_fix_constitution_schema.sql to add the constraint.`);
          
          // Try regular insert instead
          const { error: insertError } = await supabase
            .from('constitution_structured')
            .insert(articlesToInsert);

          if (insertError) {
            console.error(`❌ Error inserting articles batch ${batchNum}/${totalBatches}:`, insertError.message);
            if (insertError.details) {
              console.error('   Details:', insertError.details);
            }
            errors += batch.length;
            errorDetails.push({ batch: batchNum, error: insertError.message });
          } else {
            insertedArticles += batch.length;
            console.log(`✅ Inserted articles batch ${batchNum}/${totalBatches} (${insertedArticles}/${validArticles.length})`);
          }
        } else if (error) {
          console.error(`❌ Error inserting articles batch ${batchNum}/${totalBatches}:`, error.message);
          if (error.details) {
            console.error('   Details:', error.details);
          }
          if (error.hint) {
            console.error('   Hint:', error.hint);
          }
          errors += batch.length;
          errorDetails.push({ batch: batchNum, error: error.message });
        } else {
          insertedArticles += batch.length;
          console.log(`✅ Inserted articles batch ${batchNum}/${totalBatches} (${insertedArticles}/${validArticles.length})`);
        }
      } catch (err) {
        console.error(`❌ Exception inserting articles batch ${batchNum}:`, err.message);
        errors += batch.length;
        errorDetails.push({ batch: batchNum, error: err.message });
      }
    }

    // Process parts
    if (parts.length > 0) {
      const validParts = parts.filter((part, index) => {
        if (!part.PartNo || part.PartNo.toString().trim() === '') {
          console.warn(`⚠️  Skipping part at index ${index} with empty PartNo`);
          return false;
        }
        return true;
      });

      console.log(`📝 Validated ${validParts.length} parts (${parts.length - validParts.length} skipped)`);

      if (validParts.length > 0) {
        const partsToInsert = validParts.map(part => ({
          part_no: part.PartNo ? part.PartNo.toString().trim().substring(0, 10) : '',
          name: part.Name ? part.Name.trim().substring(0, 500) : '',
          article_numbers: Array.isArray(part.Articles) ? part.Articles.map(a => a.toString()) : [],
        }));

        try {
          const { error: partsError } = await supabase
            .from('constitution_parts')
            .upsert(partsToInsert, { onConflict: 'part_no' });

          if (partsError) {
            console.error('❌ Error inserting parts:', partsError.message);
            if (partsError.details) {
              console.error('   Details:', partsError.details);
            }
          } else {
            insertedParts = validParts.length;
            console.log(`✅ Inserted ${insertedParts} parts`);
          }
        } catch (err) {
          console.error('❌ Exception inserting parts:', err.message);
        }
      }
    }

    console.log(`\n✨ Done! Articles: ${insertedArticles}, Parts: ${insertedParts}, Errors: ${errors}`);
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

loadConstitutionStructured().catch(console.error);


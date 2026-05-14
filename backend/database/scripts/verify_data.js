/**
 * Verify Constitution Data Loading
 * Checks if data is properly loaded in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Try multiple paths for .env file
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (require('fs').existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  require('dotenv').config();
}

async function verifyData() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Verifying Constitution Data...\n');

  // Check constitution_articles (CSV data)
  const { data: articles, error: articlesError, count: articlesCount } = await supabase
    .from('constitution_articles')
    .select('*', { count: 'exact', head: true });

  if (articlesError) {
    console.error('❌ Error checking constitution_articles:', articlesError);
  } else {
    console.log(`✅ constitution_articles: ${articlesCount || 0} rows`);
  }

  // Check constitution_structured (JSON data)
  const { data: structured, error: structuredError, count: structuredCount } = await supabase
    .from('constitution_structured')
    .select('*', { count: 'exact', head: true });

  if (structuredError) {
    console.error('❌ Error checking constitution_structured:', structuredError);
  } else {
    console.log(`✅ constitution_structured: ${structuredCount || 0} rows`);
  }

  // Check constitution_parts
  const { data: parts, error: partsError, count: partsCount } = await supabase
    .from('constitution_parts')
    .select('*', { count: 'exact', head: true });

  if (partsError) {
    console.error('❌ Error checking constitution_parts:', partsError);
  } else {
    console.log(`✅ constitution_parts: ${partsCount || 0} rows`);
  }

  console.log('\n📊 Summary:');
  const totalArticles = (articlesCount || 0) + (structuredCount || 0);
  console.log(`Total unique articles expected: ~395 per table`);
  console.log(`Total rows in database: ${totalArticles}`);
  console.log(`   - CSV articles: ${articlesCount || 0}`);
  console.log(`   - Structured articles: ${structuredCount || 0}`);
  console.log(`   - Parts: ${partsCount || 0}`);

  if (totalArticles === 0) {
    console.log('\n⚠️  WARNING: No data found! Run the loading scripts:');
    console.log('   npm run db:load-all');
    console.log('   or: LOAD_DATA_NOW.bat');
  } else if (articlesCount < 300 || structuredCount < 300) {
    console.log('\n⚠️  WARNING: Incomplete data! Expected ~395 articles per table.');
    console.log('   Try running: npm run db:load-all');
  } else {
    console.log('\n✅ Data verification successful!');
  }

  // Sample some articles from both tables
  console.log('\n📄 Sample Articles from constitution_structured:');
  const { data: sampleStructured } = await supabase
    .from('constitution_structured')
    .select('art_no, name')
    .order('art_no', { ascending: true })
    .limit(5);

  if (sampleStructured && sampleStructured.length > 0) {
    sampleStructured.forEach(article => {
      console.log(`   Article ${article.art_no}: ${article.name}`);
    });
  } else {
    console.log('   (No structured articles found)');
  }

  console.log('\n📄 Sample Articles from constitution_articles:');
  const { data: sampleCSV } = await supabase
    .from('constitution_articles')
    .select('article_id')
    .limit(5);

  if (sampleCSV && sampleCSV.length > 0) {
    sampleCSV.forEach(article => {
      console.log(`   ${article.article_id}`);
    });
  } else {
    console.log('   (No CSV articles found)');
  }

  // Check for duplicates
  console.log('\n🔍 Checking for potential issues...');
  
  // Check for duplicate art_no in structured
  const { data: duplicateCheck } = await supabase
    .from('constitution_structured')
    .select('art_no')
    .not('art_no', 'is', null);
  
  if (duplicateCheck) {
    const artNos = duplicateCheck.map(a => a.art_no);
    const uniqueArtNos = new Set(artNos);
    if (artNos.length !== uniqueArtNos.size) {
      console.log('   ⚠️  WARNING: Duplicate art_no found in constitution_structured');
    } else {
      console.log('   ✅ No duplicate art_no in constitution_structured');
    }
  }

  // Check constraints
  console.log('\n🔒 Checking database constraints...');
  console.log('   (Run migration 006_ensure_unique_constraints.sql if constraints are missing)');
  
  console.log('\n💡 To view data in Supabase:');
  console.log('   1. Go to your Supabase Dashboard');
  console.log('   2. Navigate to Table Editor');
  console.log('   3. Check tables: constitution_articles, constitution_structured, constitution_parts');
  console.log('\n💡 To test via API:');
  console.log('   curl http://localhost:3000/api/constitution/articles?page=1&limit=10');
}

verifyData().catch(console.error);

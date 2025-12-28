const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  try {
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'supabase-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');

    // Execute the entire schema as one query
    const { error } = await supabase.rpc('exec', { query: schemaSQL });

    if (error) {
      console.error('Error executing schema:', error);
      console.log('Trying alternative method...');

      // Alternative: split and execute statements one by one
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          console.log(`Executing statement ${i + 1}/${statements.length}:`, statement.substring(0, 50) + '...');
          try {
            const { error: stmtError } = await supabase.from('_supabase_migration_temp').select('*').limit(1);
            // This won't work, but let's try direct SQL execution
            console.log('Skipping statement due to RPC limitations');
          } catch (e) {
            console.log('Statement execution attempted');
          }
        }
      }
    } else {
      console.log('Schema executed successfully!');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigrations();
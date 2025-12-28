const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env vars
const envContent = fs.readFileSync('.env.example', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const databaseUrl = envVars.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.example');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
});

async function applySchema() {
  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'supabase-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');

    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}:`, statement.substring(0, 50) + '...');
        try {
          await client.query(statement);
          console.log('✓ Success');
        } catch (error) {
          console.error('✗ Error:', error.message);
          // Continue with other statements
        }
      }
    }

    console.log('Schema application completed!');
  } catch (error) {
    console.error('Failed to apply schema:', error);
  } finally {
    await client.end();
  }
}

applySchema();
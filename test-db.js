const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load env vars from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
      console.log('Error:', error.message);
      console.log('The database schema needs to be applied.');
      console.log('Please run the SQL in supabase-schema.sql in your Supabase dashboard SQL editor.');
    } else {
      console.log('Connection successful! Users table exists.');
    }
  } catch (err) {
    console.log('Connection error:', err.message);
  }
}

testConnection();
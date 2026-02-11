const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file.');
  console.error('\x1b[33m%s\x1b[0m', 'Please add these values to your .env file to start the server.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Supabase Connection:', {
  url: supabaseUrl,
  anonKeyPresent: !!supabaseAnonKey,
  anonKeyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) : 'none'
});

module.exports = supabase;

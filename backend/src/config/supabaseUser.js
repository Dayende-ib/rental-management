const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file.');
  process.exit(1);
}

const createUserClient = (token) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });

module.exports = createUserClient;

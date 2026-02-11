const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Admin tasks may fail.');
}

// Create a client with the Service Role Key to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'placeholder', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = supabaseAdmin;

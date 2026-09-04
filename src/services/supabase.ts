import { createClient } from '@supabase/supabase-js';

// Load from environment variables (e.g. .env.local) with shared project fallback
const DEFAULT_SUPABASE_URL = 'https://wmhqqpcppsirmzstzvem.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_VbokG_IEVn_ydRo9Wwvx9Q_OzLKJpoi';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[Supabase] VITE_SUPABASE_URL not set in build environment. Using shared project default.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});


// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey);

// Light guard so you see a warning in dev if env vars are missing
if (!SUPABASE_CONFIGURED) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ' +
      'Set them in your Vite environment variables.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // No auth/session handling needed for this public waitlist form
    persistSession: false,
  },
});

/// <reference types="vite/client" />

// Keep this list minimal and explicit so TypeScript flags typos.
interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_CALENDLY_URL?: string;

  // Marketing / landing-page copy
  readonly VITE_TRIAL_DAYS?: string;
  readonly VITE_TRIAL_STARTER_CLIENTS?: string;
  readonly VITE_SUPPORT_EMAIL?: string;

  // Cloudflare Turnstile / Edge Function
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_COACH_WAITLIST_SIGNUP_FN?: string;

  // Supabase (public anon key; never expose service role keys in the client)
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

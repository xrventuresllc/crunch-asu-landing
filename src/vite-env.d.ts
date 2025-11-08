/// <reference types="vite/client" />

/**
 * Type your Vite env vars so typos are caught at build time.
 * Marked optional because the app provides safe fallbacks.
 */
interface ImportMetaEnv {
  readonly VITE_FORMSPREE_ENDPOINT?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_TABLE?: string;
  readonly VITE_SUPABASE_EVENTS_TABLE?: string;
  readonly VITE_FREE_DAYS?: string;
  readonly VITE_REP_CAP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

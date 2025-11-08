/// <reference types="vite/client" />

/**
 * Strongly typed Vite env vars used by the app.
 * They are optional at type level because runtime fallbacks exist.
 * (Restart your dev server after editing this file.)
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

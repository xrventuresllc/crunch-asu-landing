/// <reference types="vite/client" />

/**
 * Extend Vite's env typing so TS gives autocompletion and catches typos.
 * These are optional because your app has runtime fallbacks.
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

/** Keep Vite built‑ins on env as well. */
interface ImportMeta {
  readonly env: ImportMetaEnv & {
    readonly BASE_URL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
  };
}

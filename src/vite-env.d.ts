/// <reference types="vite/client" />

// Keep this list minimal and explicit so TypeScript flags typos.
interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_CALENDLY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

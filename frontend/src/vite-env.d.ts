/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_AMAP_WEB_KEY?: string;
    readonly VITE_IFLYTEK_APP_ID?: string;
    readonly VITE_IFLYTEK_API_KEY?: string;
    readonly VITE_IFLYTEK_API_SECRET?: string;
    readonly VITE_LLM_API_BASE?: string;
    readonly VITE_LLM_API_KEY?: string;
  }
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_AMAP_WEB_KEY?: string;
  readonly VITE_IFLYTEK_APP_ID?: string;
  readonly VITE_IFLYTEK_API_KEY?: string;
  readonly VITE_IFLYTEK_API_SECRET?: string;
  readonly VITE_LLM_API_BASE?: string;
  readonly VITE_LLM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

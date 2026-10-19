/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL: the same project as Write and Type. Unset means preview mode. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (publishable) key. Safe in the browser; row level security protects the data. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Parent domain shared by every ELUM site, if they ever share one. Not usable with *.netlify.app. */
  readonly VITE_ELUM_COOKIE_DOMAIN?: string;
  /** The domain Type addresses live on (elum.config type_domain). */
  readonly VITE_ELUM_TYPE_DOMAIN?: string;
  readonly VITE_ELUM_WRITE_URL?: string;
  readonly VITE_ELUM_TYPE_URL?: string;
  readonly VITE_ELUM_MAKE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Django BFF, e.g. http://127.0.0.1:8000/api */
  readonly VITE_API_BASE_URL: string;
  /** Phase-1 acting user (sent as X-User-Email while Entra SSO is not configured) */
  readonly VITE_USER_EMAIL: string;
  /** Entra ID SSO (all three required to activate it; see src/auth/entra.ts) */
  readonly VITE_ENTRA_CLIENT_ID?: string;
  readonly VITE_ENTRA_TENANT_ID?: string;
  readonly VITE_ENTRA_API_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" {
  const src: string;
  export default src;
}

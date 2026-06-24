/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Django BFF, e.g. http://127.0.0.1:8000/api */
  readonly VITE_API_BASE_URL: string;
  /** Phase-1 acting user (sent as X-User-Email until Entra SSO lands) */
  readonly VITE_USER_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" {
  const src: string;
  export default src;
}

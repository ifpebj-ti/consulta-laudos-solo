/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_FEATURE_LISTAGEM_SERVIDOR?: string;
  readonly VITE_FEATURE_HOMOLOGACAO_SERVIDOR?: string;
  readonly VITE_FEATURE_SITUACAO_CLIENTE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
